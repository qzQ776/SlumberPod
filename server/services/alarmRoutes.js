const express = require('express');
const router = express.Router();
const AlarmService = require('./alarmService');

/**
 * 获取用户所有闹钟
 * GET /api/alarms
 */
router.get('/', async (req, res) => {
  try {
    const openid = req.openid;
    
    const result = await AlarmService.getUserAlarms(openid);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '获取闹钟失败',
        error: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data,
      count: result.count
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

/**
 * 获取用户启用的闹钟列表
 * GET /api/alarms/enabled
 */
router.get('/enabled', async (req, res) => {
  try {
    const openid = req.openid;
    
    const result = await AlarmService.getEnabledAlarms(openid);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '获取启用闹钟失败',
        error: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data,
      count: result.count
    });
    
  } catch (error) {
    console.error('获取启用闹钟失败:', error);
    res.status(500).json({
      success: false,
      message: '获取启用闹钟失败',
      error: error.message
    });
  }
});

/**
 * 创建闹钟
 * POST /api/alarms
 */
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
    
    const alarmData = {
      label,
      alarm_time: new Date(alarm_time),
      repeat_days: repeat_days || '',
      snooze_duration: snooze_duration || 0,
      vibration: vibration || false,
      volume: volume || 80
    };
    
    const result = await AlarmService.createAlarm(openid, alarmData);
    
    if (!result.success) {
      const statusCode = result.message ? 400 : 500;
      return res.status(statusCode).json({
        success: false,
        message: result.message || '创建闹钟失败',
        error: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data,
      message: '闹钟创建成功'
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

/**
 * 获取闹钟详情
 * GET /api/alarms/:alarmId
 */
router.get('/:alarmId', async (req, res) => {
  try {
    const { alarmId } = req.params;
    
    if (!alarmId || isNaN(parseInt(alarmId))) {
      return res.status(400).json({
        success: false,
        message: '闹钟ID格式无效'
      });
    }
    
    const result = await AlarmService.getAlarmDetail(parseInt(alarmId));
    
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

/**
 * 更新闹钟
 * PUT /api/alarms/:alarmId
 */
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
    if (alarm_time) alarmData.alarm_time = new Date(alarm_time);
    if (repeat_days !== undefined) alarmData.repeat_days = repeat_days;
    if (is_enabled !== undefined) alarmData.is_enabled = is_enabled;
    if (snooze_duration !== undefined) alarmData.snooze_duration = snooze_duration;
    if (vibration !== undefined) alarmData.vibration = vibration;
    if (volume !== undefined) alarmData.volume = volume;
    
    const result = await AlarmService.updateAlarm(parseInt(alarmId), alarmData);
    
    if (!result.success) {
      const statusCode = result.message ? 400 : 500;
      return res.status(statusCode).json({
        success: false,
        message: result.message || '更新闹钟失败',
        error: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data,
      message: '闹钟更新成功'
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

/**
 * 删除闹钟
 * DELETE /api/alarms/:alarmId
 */
router.delete('/:alarmId', async (req, res) => {
  try {
    const { alarmId } = req.params;
    
    if (!alarmId || isNaN(parseInt(alarmId))) {
      return res.status(400).json({
        success: false,
        message: '闹钟ID格式无效'
      });
    }
    
    const result = await AlarmService.deleteAlarm(parseInt(alarmId));
    
    if (!result.success) {
      const statusCode = result.message ? 400 : 500;
      return res.status(statusCode).json({
        success: false,
        message: result.message || '删除闹钟失败',
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

/**
 * 启用/禁用闹钟
 * PATCH /api/alarms/:alarmId/toggle
 */
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
    
    const result = await AlarmService.toggleAlarm(parseInt(alarmId), enabled);
    
    if (!result.success) {
      const statusCode = result.message ? 400 : 500;
      return res.status(statusCode).json({
        success: false,
        message: result.message || '切换闹钟状态失败',
        error: result.error
      });
    }
    
    res.json({
      success: true,
      message: result.message,
      data: result.data
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

/**
 * 批量操作闹钟
 * POST /api/alarms/batch
 */
router.post('/batch', async (req, res) => {
  try {
    const openid = req.openid;
    const { operations } = req.body;
    
    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      return res.status(400).json({
        success: false,
        message: '操作列表不能为空'
      });
    }
    
    // 验证操作格式
    for (const operation of operations) {
      if (!operation.action || !operation.alarm_id) {
        return res.status(400).json({
          success: false,
          message: '操作格式无效'
        });
      }
    }
    
    const result = await AlarmService.batchUpdateAlarms(openid, operations);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '批量操作失败',
        error: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data,
      total: result.total,
      successCount: result.successCount,
      message: `批量操作完成，成功 ${result.successCount} 项，共 ${result.total} 项`
    });
    
  } catch (error) {
    console.error('批量操作闹钟失败:', error);
    res.status(500).json({
      success: false,
      message: '批量操作失败',
      error: error.message
    });
  }
});

/**
 * 检查闹钟状态（用于闹钟提醒服务）
 * GET /api/alarms/check/status
 */
router.get('/check/status', async (req, res) => {
  try {
    const openid = req.openid;
    
    const result = await AlarmService.getEnabledAlarms(openid);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '检查闹钟状态失败',
        error: result.error
      });
    }
    
    const currentTime = new Date();
    const activeAlarms = result.data.filter(alarm => 
      AlarmService.shouldTriggerAlarm(alarm, currentTime)
    );
    
    res.json({
      success: true,
      data: {
        enabledAlarms: result.data,
        activeAlarms: activeAlarms,
        currentTime: currentTime.toISOString(),
        totalEnabled: result.data.length,
        activeCount: activeAlarms.length
      }
    });
    
  } catch (error) {
    console.error('检查闹钟状态失败:', error);
    res.status(500).json({
      success: false,
      message: '检查闹钟状态失败',
      error: error.message
    });
  }
});

module.exports = router;