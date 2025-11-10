const express = require('express');
const router = express.Router();

// 获取用户睡眠记录
router.get('/records', async (req, res) => {
  try {
    const openid = req.openid;
    const { limit = 30, offset = 0 } = req.query;

    const SleepRecordModel = require('./database/models/SleepRecord');
    const result = await SleepRecordModel.getUserSleepRecords(openid, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    res.json({
      success: true,
      data: result.data || [],
      total: result.total || 0
    });

  } catch (error) {
    console.error('获取睡眠记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取睡眠记录失败',
      error: error.message
    });
  }
});

// 添加睡眠记录
router.post('/records', async (req, res) => {
  try {
    const openid = req.openid;
    const { sleep_date, sleep_time, wake_time, sleep_duration, sleep_quality, notes } = req.body;

    if (!sleep_date || !sleep_time || !wake_time) {
      return res.status(400).json({
        success: false,
        message: '睡眠日期、入睡时间和起床时间不能为空'
      });
    }

    const SleepRecordModel = require('./database/models/SleepRecord');
    const result = await SleepRecordModel.addSleepRecord(openid, {
      sleep_date,
      sleep_time,
      wake_time,
      sleep_duration: sleep_duration || 0,
      sleep_quality: sleep_quality || 3,
      notes: notes || ''
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    res.json({
      success: true,
      message: '睡眠记录添加成功'
    });

  } catch (error) {
    console.error('添加睡眠记录失败:', error);
    res.status(500).json({
      success: false,
      message: '添加睡眠记录失败',
      error: error.message
    });
  }
});

// 获取睡眠统计
router.get('/stats', async (req, res) => {
  try {
    const openid = req.openid;
    const { start_date, end_date } = req.query;

    const SleepRecordModel = require('./database/models/SleepRecord');
    const result = await SleepRecordModel.getUserSleepStats(openid, start_date, end_date);

    if (!result.success) {
      throw new Error(result.error);
    }

    res.json({
      success: true,
      data: result.data || null
    });

  } catch (error) {
    console.error('获取睡眠统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取睡眠统计失败',
      error: error.message
    });
  }
});

// 删除睡眠记录
router.delete('/records/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: '记录ID格式无效'
      });
    }

    const SleepRecordModel = require('./database/models/SleepRecord');
    const result = await SleepRecordModel.deleteSleepRecord(parseInt(id));

    if (!result.success) {
      throw new Error(result.error);
    }

    res.json({
      success: true,
      message: '睡眠记录删除成功'
    });

  } catch (error) {
    console.error('删除睡眠记录失败:', error);
    res.status(500).json({
      success: false,
      message: '删除睡眠记录失败',
      error: error.message
    });
  }
});

// 获取最近一周的睡眠记录
router.get('/records/recent-week', async (req, res) => {
  try {
    const openid = req.openid;

    const SleepRecordModel = require('./database/models/SleepRecord');
    const result = await SleepRecordModel.getRecentWeekSleepRecords(openid);

    if (!result.success) {
      throw new Error(result.error);
    }

    res.json({
      success: true,
      data: result.data || []
    });

  } catch (error) {
    console.error('获取最近一周睡眠记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取最近一周睡眠记录失败',
      error: error.message
    });
  }
});

module.exports = router;