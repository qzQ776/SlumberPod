const express = require('express');
const multer = require('multer');
const router = express.Router();

// 导入认证中间件
const { authenticateToken } = require('./middleware/auth');

// 配置multer用于文件上传（内存存储）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB限制
  },
  fileFilter: (req, file, cb) => {
    // 检查文件类型
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的图片格式，支持：JPEG, PNG, GIF, WebP, BMP'), false);
    }
  }
});

// 导入图片上传服务
const imageUploadService = require('./services/imageUploadService');

// 获取当前用户信息（需要认证）
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const openid = req.openid;

    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
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

    // 隐藏敏感信息，返回完整的用户资料
    const userInfo = {
      openid: user.openid,
      nickname: user.nickname,
      avatar_url: user.avatar_url,
      gender: user.gender,
      city: user.city,
      province: user.province,
      country: user.country,
      bio: user.bio,
      birthday: user.birthday,
      created_at: user.created_at,
      last_login_at: user.last_login_at
    };

    res.json({
      success: true,
      data: userInfo,
      message: '获取用户资料成功'
    });

  } catch (error) {
    console.error('获取用户资料失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户资料失败',
      error: error.message
    });
  }
});

// 更新用户信息（需要认证）
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const openid = req.openid;
    
    // 调试：查看前端实际发送的数据
    console.log('用户资料更新请求 - 原始数据:', JSON.stringify(req.body, null, 2));
    console.log('用户资料更新请求 - openid:', openid);

    // 严格清理undefined值，转换为null
    const cleanUpdates = {};
    const fields = ['nickname', 'avatar_url', 'gender', 'city', 'province', 'country', 'bio', 'birthday'];
    
    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        // 处理性别字段：将中文转换为数字
        if (field === 'gender') {
          const genderValue = req.body[field];
          if (genderValue === '男' || genderValue === 1) {
            cleanUpdates[field] = 1;
          } else if (genderValue === '女' || genderValue === 2) {
            cleanUpdates[field] = 2;
          } else {
            cleanUpdates[field] = 0; // 未知或无效值
          }
          console.log(`性别转换: ${genderValue} -> ${cleanUpdates[field]}`);
        } else {
          // 其他字段直接使用值
          cleanUpdates[field] = req.body[field];
        }
      }
    });

    // 检查是否有有效的更新字段
    if (Object.keys(cleanUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有有效的更新字段'
      });
    }

    // 双重检查：确保没有任何undefined值
    Object.keys(cleanUpdates).forEach(key => {
      if (cleanUpdates[key] === undefined) {
        cleanUpdates[key] = null;
      }
    });

    console.log('用户资料更新请求 - 清理后数据:', JSON.stringify(cleanUpdates, null, 2));

    const UserModel = require('./database/models/User');
    const result = await UserModel.update(openid, cleanUpdates);

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
router.get('/:openid/stats', authenticateToken, async (req, res) => {
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
router.get('/:openid/activities', authenticateToken, async (req, res) => {
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
router.get('/:openid/settings', authenticateToken, async (req, res) => {
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
router.put('/:openid/settings', authenticateToken, async (req, res) => {
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

// 上传用户头像（需要认证）
router.post('/avatar/upload', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    const openid = req.openid;
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的头像文件'
      });
    }

    // 确保存储桶存在
    const bucketResult = await imageUploadService.ensureImageBucketExists();
    if (!bucketResult.success) {
      return res.status(500).json({
        success: false,
        message: '存储服务初始化失败',
        error: bucketResult.error
      });
    }

    // 上传头像到Supabase
    const uploadResult = await imageUploadService.handleImageUpload({
      type: 'avatar',
      openid: openid,
      fileBuffer: req.file.buffer,
      fileName: req.file.originalname
    });

    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: '头像上传失败',
        error: uploadResult.error
      });
    }

    // 更新用户头像URL到数据库
    const UserModel = require('./database/models/User');
    await UserModel.update(openid, {
      avatar_url: uploadResult.url
    });

    res.json({
      success: true,
      message: '头像上传成功',
      data: {
        avatar_url: uploadResult.url,
        file_path: uploadResult.filePath
      }
    });

  } catch (error) {
    console.error('上传用户头像失败:', error);
    res.status(500).json({
      success: false,
      message: '上传用户头像失败',
      error: error.message
    });
  }
});

// Base64格式上传用户头像（支持小程序端）
router.post('/avatar/upload-base64', authenticateToken, async (req, res) => {
  try {
    const openid = req.openid;
    const { base64, fileName } = req.body;
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }

    if (!base64 || !fileName) {
      return res.status(400).json({
        success: false,
        message: '缺少Base64数据或文件名'
      });
    }

    // 确保存储桶存在
    const bucketResult = await imageUploadService.ensureImageBucketExists();
    if (!bucketResult.success) {
      return res.status(500).json({
        success: false,
        message: '存储服务初始化失败',
        error: bucketResult.error
      });
    }

    // 上传头像到Supabase
    const uploadResult = await imageUploadService.handleImageUpload({
      type: 'avatar',
      openid: openid,
      base64: base64,
      fileName: fileName
    });

    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: '头像上传失败',
        error: uploadResult.error
      });
    }

    // 更新用户头像URL到数据库
    const UserModel = require('./database/models/User');
    await UserModel.update(openid, {
      avatar_url: uploadResult.url
    });

    res.json({
      success: true,
      message: '头像上传成功',
      data: {
        avatar_url: uploadResult.url,
        file_path: uploadResult.filePath
      }
    });

  } catch (error) {
    console.error('上传用户头像失败:', error);
    res.status(500).json({
      success: false,
      message: '上传用户头像失败',
      error: error.message
    });
  }
});

module.exports = router;