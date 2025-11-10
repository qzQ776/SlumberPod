const express = require('express');
const router = express.Router();

// 获取用户的小憩任务
router.get('/', async (req, res) => {
  try {
    const openid = req.openid;
    const { status = 'active' } = req.query;
    
    const SleepTimer = require('./database/models/SleepTimer');
    const result = await SleepTimer.getUserTimers(openid, status);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '获取小憩任务失败',
        error: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
    
  } catch (error) {
    console.error('获取小憩任务失败:', error);
    res.status(500).json({
      success: false,
      message: '获取小憩任务失败',
      error: error.message
    });
  }
});

// 创建小憩任务
router.post('/', async (req, res) => {
  try {
    const openid = req.openid;
    const { type, duration_minutes, start_time } = req.body;
    
    if (!type || !duration_minutes || !start_time) {
      return res.status(400).json({
        success: false,
        message: '类型、时长和开始时间不能为空'
      });
    }
    
    const timerData = {
      type,
      duration_minutes: parseInt(duration_minutes),
      start_time: new Date(start_time)
    };
    
    const SleepTimer = require('./database/models/SleepTimer');
    const result = await SleepTimer.createTimer(openid, timerData);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '创建小憩任务失败',
        error: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
    
  } catch (error) {
    console.error('创建小憩任务失败:', error);
    res.status(500).json({
      success: false,
      message: '创建小憩任务失败',
      error: error.message
    });
  }
});

// 结束小憩任务
router.post('/:timerId/complete', async (req, res) => {
  try {
    const { timerId } = req.params;
    
    if (!timerId || isNaN(parseInt(timerId))) {
      return res.status(400).json({
        success: false,
        message: '小憩任务ID格式无效'
      });
    }
    
    const SleepTimer = require('./database/models/SleepTimer');
    const result = await SleepTimer.completeTimer(parseInt(timerId));
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '结束小憩任务失败',
        error: result.error
      });
    }
    
    res.json({
      success: true,
      message: '小憩任务已结束'
    });
    
  } catch (error) {
    console.error('结束小憩任务失败:', error);
    res.status(500).json({
      success: false,
      message: '结束小憩任务失败',
      error: error.message
    });
  }
});

// 获取小憩任务详情
router.get('/:timerId', async (req, res) => {
  try {
    const { timerId } = req.params;
    
    if (!timerId || isNaN(parseInt(timerId))) {
      return res.status(400).json({
        success: false,
        message: '小憩任务ID格式无效'
      });
    }
    
    const SleepTimer = require('./database/models/SleepTimer');
    const result = await SleepTimer.getTimerById(parseInt(timerId));
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '获取小憩任务详情失败',
        error: result.error
      });
    }
    
    if (!result.data) {
      return res.status(404).json({
        success: false,
        message: '小憩任务不存在'
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
    
  } catch (error) {
    console.error('获取小憩任务详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取小憩任务详情失败',
      error: error.message
    });
  }
});

module.exports = router;