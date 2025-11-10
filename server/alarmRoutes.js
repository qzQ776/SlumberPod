const express = require('express');
const router = express.Router();

// 获取用户的所有闹钟
router.get('/', async (req, res) => {
  try {
    const openid = req.openid;
    
    const Alarm = require('./database/models/Alarm');
    const result = await Alarm.getUserAlarms(openid);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '获取闹钟失败',
        error: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
    
  } catch (error) {
    console.error('获取闹钟失败:', error);
    res.status(500).json({
      success: false,
      message: '获取闹钟失败',
      error: error.message
    });
  }
});

// 创建闹钟
router.post('/', async (req, res) => {
  try {
    const openid = req.openid;
    const { label, alarm_time, repeat_days, snooze_duration, vibration, volume } = req.body;
    
    if (!label || !alarm_time) {
      return res.status(400).json({
        success: false,
        message: '闹钟标签和时间不能为空'
      });
    }
    
    // 验证时间格式
    const AlarmService = require('./services/alarmService');
    if (!AlarmService.validateAlarmTime(alarm_time)) {
      return res.status(400).json({
        success: false,
        message: '闹钟时间格式无效'
      });
    }
    
    // 处理音量范围校验
    let validatedVolume = 80;
    if (volume !== undefined) {
      const vol = parseInt(volume);
      if (isNaN(vol) || vol < 0 || vol > 100) {
        return res.status(400).json({
          success: false,
          message: '音量必须在0-100之间'
        });
      }
      validatedVolume = vol;
    }
    
    const alarmData = {
      label,
      alarm_time,
      repeat_days: repeat_days || '',
      snooze_duration: snooze_duration || 0,
      vibration: vibration || false,
      volume: validatedVolume
    };
    
    const result = await AlarmService.createAlarm(openid, alarmData);
    
    if (!result.success) {
      const statusCode = result.message.includes('无效') ? 400 : 500;
      return res.status(statusCode).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
    
  } catch (error) {
    console.error('创建闹钟失败:', error);
    res.status(500).json({
      success: false,
      message: '创建闹钟失败',
      error: error.message
    });
  }
});

// 更新闹钟
router.put('/:alarmId', async (req, res) => {
  try {
    const { alarmId } = req.params;
    const { label, alarm_time, repeat_days, is_enabled, snooze_duration, vibration, volume } = req.body;
    
    if (!alarmId || isNaN(parseInt(alarmId))) {
      return res.status(400).json({
        success: false,
        message: '闹钟ID格式无效'
      });
    }
    
    const alarmData = {};
    if (label) alarmData.label = label;
    
    // 验证时间格式
    if (alarm_time) {
      const AlarmService = require('./services/alarmService');
      if (!AlarmService.validateAlarmTime(alarm_time)) {
        return res.status(400).json({
          success: false,
          message: '闹钟时间格式无效'
        });
      }
      alarmData.alarm_time = alarm_time;
    }
    
    if (repeat_days !== undefined) alarmData.repeat_days = repeat_days;
    if (is_enabled !== undefined) alarmData.is_enabled = is_enabled;
    if (snooze_duration !== undefined) alarmData.snooze_duration = snooze_duration;
    if (vibration !== undefined) alarmData.vibration = vibration;
    
    // 处理音量范围校验
    if (volume !== undefined) {
      const vol = parseInt(volume);
      if (isNaN(vol) || vol < 0 || vol > 100) {
        return res.status(400).json({
          success: false,
          message: '音量必须在0-100之间'
        });
      }
      alarmData.volume = vol;
    }
    
    const AlarmService = require('./services/alarmService');
    const result = await AlarmService.updateAlarm(parseInt(alarmId), alarmData);
    
    if (!result.success) {
      const statusCode = result.message.includes('无效') || result.message.includes('不存在') ? 400 : 500;
      return res.status(statusCode).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
    
  } catch (error) {
    console.error('更新闹钟失败:', error);
    res.status(500).json({
      success: false,
      message: '更新闹钟失败',
      error: error.message
    });
  }
});

// 删除闹钟
router.delete('/:alarmId', async (req, res) => {
  try {
    const { alarmId } = req.params;
    
    if (!alarmId || isNaN(parseInt(alarmId))) {
      return res.status(400).json({
        success: false,
        message: '闹钟ID格式无效'
      });
    }
    
    const Alarm = require('./database/models/Alarm');
    const result = await Alarm.deleteAlarm(parseInt(alarmId));
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '删除闹钟失败',
        error: result.error
      });
    }
    
    res.json({
      success: true,
      message: '闹钟删除成功'
    });
    
  } catch (error) {
    console.error('删除闹钟失败:', error);
    res.status(500).json({
      success: false,
      message: '删除闹钟失败',
      error: error.message
    });
  }
});

// 获取闹钟详情
router.get('/:alarmId', async (req, res) => {
  try {
    const { alarmId } = req.params;
    
    if (!alarmId || isNaN(parseInt(alarmId))) {
      return res.status(400).json({
        success: false,
        message: '闹钟ID格式无效'
      });
    }
    
    const Alarm = require('./database/models/Alarm');
    const result = await Alarm.getAlarmById(parseInt(alarmId));
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '获取闹钟详情失败',
        error: result.error
      });
    }
    
    if (!result.data) {
      return res.status(404).json({
        success: false,
        message: '闹钟不存在'
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
    
  } catch (error) {
    console.error('获取闹钟详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取闹钟详情失败',
      error: error.message
    });
  }
});

// 启用/禁用闹钟
router.patch('/:alarmId/toggle', async (req, res) => {
  try {
    const { alarmId } = req.params;
    const { enabled } = req.body;
    
    if (!alarmId || isNaN(parseInt(alarmId))) {
      return res.status(400).json({
        success: false,
        message: '闹钟ID格式无效'
      });
    }
    
    if (enabled === undefined) {
      return res.status(400).json({
        success: false,
        message: '启用状态不能为空'
      });
    }
    
    const Alarm = require('./database/models/Alarm');
    const result = await Alarm.toggleAlarm(parseInt(alarmId), enabled);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '切换闹钟状态失败',
        error: result.error
      });
    }
    
    res.json({
      success: true,
      message: enabled ? '闹钟已启用' : '闹钟已禁用'
    });
    
  } catch (error) {
    console.error('切换闹钟状态失败:', error);
    res.status(500).json({
      success: false,
      message: '切换闹钟状态失败',
      error: error.message
    });
  }
});

module.exports = router;