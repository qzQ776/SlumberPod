const express = require('express');
const router = express.Router();

// 获取用户信息
router.get('/:openid', async (req, res) => {
  try {
    const { openid } = req.params;

    if (!openid) {
      return res.status(400).json({
        success: false,
        message: '用户openid不能为空'
      });
    }

    const UserModel = require('./database/models/User');
    const user = await UserModel.findByOpenid(openid);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 隐藏敏感信息
    const userInfo = {
      openid: user.openid,
      nickname: user.nickname,
      avatar_url: user.avatar_url,
      gender: user.gender,
      city: user.city,
      province: user.province,
      country: user.country,
      created_at: user.created_at,
      last_login_at: user.last_login_at
    };

    res.json({
      success: true,
      data: userInfo
    });

  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败',
      error: error.message
    });
  }
});

// 更新用户信息（需要认证）
router.put('/profile', async (req, res) => {
  try {
    const openid = req.openid;
    const { nickname, avatar_url, gender, city, province, country, bio, birthday } = req.body;

    const UserModel = require('./database/models/User');
    const result = await UserModel.update(openid, {
      nickname,
      avatar_url,
      gender,
      city,
      province,
      country,
      bio,
      birthday
    });

    res.json({
      success: true,
      message: '用户信息更新成功',
      data: result
    });

  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '更新用户信息失败',
      error: error.message
    });
  }
});

// 获取用户统计信息（需要认证）
router.get('/:openid/stats', async (req, res) => {
  try {
    const { openid } = req.params;
    const currentOpenid = req.openid;

    // 只能查看自己的统计信息
    if (openid !== currentOpenid) {
      return res.status(403).json({
        success: false,
        message: '无权查看其他用户的统计信息'
      });
    }

    const UserModel = require('./database/models/User');
    const stats = await UserModel.getUserStatistics(openid);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('获取用户统计信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户统计信息失败',
      error: error.message
    });
  }
});

// 获取用户最近活动（需要认证）
router.get('/:openid/activities', async (req, res) => {
  try {
    const { openid } = req.params;
    const currentOpenid = req.openid;
    const { limit = 10 } = req.query;

    // 只能查看自己的活动
    if (openid !== currentOpenid) {
      return res.status(403).json({
        success: false,
        message: '无权查看其他用户的活动'
      });
    }

    const UserModel = require('./database/models/User');
    const activities = await UserModel.getRecentActivity(openid, parseInt(limit));

    res.json({
      success: true,
      data: activities
    });

  } catch (error) {
    console.error('获取用户活动失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户活动失败',
      error: error.message
    });
  }
});

// 获取用户设置（需要认证）
router.get('/:openid/settings', async (req, res) => {
  try {
    const { openid } = req.params;
    const currentOpenid = req.openid;

    // 只能查看自己的设置
    if (openid !== currentOpenid) {
      return res.status(403).json({
        success: false,
        message: '无权查看其他用户的设置'
      });
    }

    const UserModel = require('./database/models/User');
    const settings = await UserModel.getSettings(openid);

    res.json({
      success: true,
      data: settings
    });

  } catch (error) {
    console.error('获取用户设置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户设置失败',
      error: error.message
    });
  }
});

// 更新用户设置（需要认证）
router.put('/:openid/settings', async (req, res) => {
  try {
    const { openid } = req.params;
    const currentOpenid = req.openid;
    const settings = req.body;

    // 只能更新自己的设置
    if (openid !== currentOpenid) {
      return res.status(403).json({
        success: false,
        message: '无权更新其他用户的设置'
      });
    }

    const UserModel = require('./database/models/User');
    await UserModel.updateSettings(openid, settings);

    res.json({
      success: true,
      message: '用户设置更新成功'
    });

  } catch (error) {
    console.error('更新用户设置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新用户设置失败',
      error: error.message
    });
  }
});

module.exports = router;