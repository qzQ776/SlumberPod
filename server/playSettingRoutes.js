const express = require('express');
const router = express.Router();

// 获取用户播放设置
router.get('/', async (req, res) => {
  try {
    const openid = req.openid;
    
    const PlaySetting = require('./database/models/PlaySetting');
    const result = await PlaySetting.getPlaySettings(openid);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '获取播放设置失败',
        error: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
    
  } catch (error) {
    console.error('获取播放设置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取播放设置失败',
      error: error.message
    });
  }
});

// 更新用户播放设置
router.put('/', async (req, res) => {
  try {
    const openid = req.openid;
    const { play_mode, timer_minutes } = req.body;
    
    if (!play_mode && timer_minutes === undefined) {
      return res.status(400).json({
        success: false,
        message: '至少需要更新一个设置项'
      });
    }
    
    const settings = {};
    if (play_mode) settings.play_mode = play_mode;
    if (timer_minutes !== undefined) settings.timer_minutes = timer_minutes;
    
    const PlaySetting = require('./database/models/PlaySetting');
    const result = await PlaySetting.updatePlaySettings(openid, settings);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '更新播放设置失败',
        error: result.error
      });
    }
    
    res.json({
      success: true,
      message: result.message
    });
    
  } catch (error) {
    console.error('更新播放设置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新播放设置失败',
      error: error.message
    });
  }
});

module.exports = router;