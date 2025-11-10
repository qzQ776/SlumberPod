const express = require('express');
const router = express.Router();
const AlarmReminderService = require('./alarmReminderService');

/**
 * 检查并触发闹钟提醒
 * GET /api/alarms/reminder/check
 */
router.get('/reminder/check', async (req, res) => {
  try {
    const openid = req.openid;
    
    const result = await AlarmReminderService.checkAndTriggerAlarms(openid);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '检查闹钟提醒失败',
        error: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data,
      message: result.data.activeAlarms.length > 0 ? 
        `发现 ${result.data.activeAlarms.length} 个闹钟需要触发` : 
        '当前没有需要触发的闹钟'
    });
    
  } catch (error) {
    console.error('检查闹钟提醒失败:', error);
    res.status(500).json({
      success: false,
      message: '检查闹钟提醒失败',
      error: error.message
    });
  }
});

/**
 * 获取今日闹钟安排
 * GET /api/alarms/reminder/today
 */
router.get('/reminder/today', async (req, res) => {
  try {
    const openid = req.openid;
    
    const result = await AlarmReminderService.getTodayAlarms(openid);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '获取今日闹钟安排失败',
        error: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data,
      count: result.count,
      today: result.today
    });
    
  } catch (error) {
    console.error('获取今日闹钟安排失败:', error);
    res.status(500).json({
      success: false,
      message: '获取今日闹钟安排失败',
      error: error.message
    });
  }
});

/**
 * 获取闹钟统计信息
 * GET /api/alarms/reminder/stats
 */
router.get('/reminder/stats', async (req, res) => {
  try {
    const openid = req.openid;
    
    const result = await AlarmReminderService.getAlarmStats(openid);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '获取闹钟统计失败',
        error: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
    
  } catch (error) {
    console.error('获取闹钟统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取闹钟统计失败',
      error: error.message
    });
  }
});

/**
 * 备份闹钟设置
 * POST /api/alarms/reminder/backup
 */
router.post('/reminder/backup', async (req, res) => {
  try {
    const openid = req.openid;
    
    const result = await AlarmReminderService.backupAlarms(openid);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '备份闹钟设置失败',
        error: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data,
      message: result.message
    });
    
  } catch (error) {
    console.error('备份闹钟设置失败:', error);
    res.status(500).json({
      success: false,
      message: '备份闹钟设置失败',
      error: error.message
    });
  }
});

/**
 * 恢复闹钟设置
 * POST /api/alarms/reminder/restore
 */
router.post('/reminder/restore', async (req, res) => {
  try {
    const openid = req.openid;
    const { backup_data } = req.body;
    
    if (!backup_data) {
      return res.status(400).json({
        success: false,
        message: '备份数据不能为空'
      });
    }
    
    const result = await AlarmReminderService.restoreAlarms(openid, backup_data);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message || '恢复闹钟设置失败',
        error: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data,
      message: result.message
    });
    
  } catch (error) {
    console.error('恢复闹钟设置失败:', error);
    res.status(500).json({
      success: false,
      message: '恢复闹钟设置失败',
      error: error.message
    });
  }
});

module.exports = router;