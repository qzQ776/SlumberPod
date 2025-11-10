const express = require('express');
const router = express.Router();

// 获取用户播放历史
router.get('/', async (req, res) => {
  try {
    const openid = req.openid;
    const { limit = 20, offset = 0 } = req.query;

    const PlayHistoryModel = require('./database/models/PlayHistory');
    const result = await PlayHistoryModel.getUserPlayHistory(openid, {
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
    console.error('获取播放历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取播放历史失败',
      error: error.message
    });
  }
});

// 添加播放记录
router.post('/', async (req, res) => {
  try {
    const openid = req.openid;
    const { audio_id, play_duration = 0 } = req.body;

    if (!audio_id || isNaN(parseInt(audio_id))) {
      return res.status(400).json({
        success: false,
        message: '音频ID格式无效'
      });
    }

    const PlayHistoryModel = require('./database/models/PlayHistory');
    const result = await PlayHistoryModel.addPlayRecord(openid, parseInt(audio_id), parseFloat(play_duration));

    if (!result.success) {
      throw new Error(result.error);
    }

    res.json({
      success: true,
      message: '播放记录添加成功'
    });

  } catch (error) {
    console.error('添加播放记录失败:', error);
    res.status(500).json({
      success: false,
      message: '添加播放记录失败',
      error: error.message
    });
  }
});

// 清空播放历史
router.delete('/', async (req, res) => {
  try {
    const openid = req.openid;

    const PlayHistoryModel = require('./database/models/PlayHistory');
    const result = await PlayHistoryModel.clearPlayHistory(openid);

    if (!result.success) {
      throw new Error(result.error);
    }

    res.json({
      success: true,
      message: '播放历史已清空'
    });

  } catch (error) {
    console.error('清空播放历史失败:', error);
    res.status(500).json({
      success: false,
      message: '清空播放历史失败',
      error: error.message
    });
  }
});

// 获取最近播放
router.get('/recent', async (req, res) => {
  try {
    const openid = req.openid;
    const { limit = 10 } = req.query;

    const PlayHistoryModel = require('./database/models/PlayHistory');
    const result = await PlayHistoryModel.getRecentPlayed(openid, parseInt(limit));

    if (!result.success) {
      throw new Error(result.error);
    }

    res.json({
      success: true,
      data: result.data || []
    });

  } catch (error) {
    console.error('获取最近播放失败:', error);
    res.status(500).json({
      success: false,
      message: '获取最近播放失败',
      error: error.message
    });
  }
});

// 获取播放统计
router.get('/stats', async (req, res) => {
  try {
    const openid = req.openid;

    const PlayHistoryModel = require('./database/models/PlayHistory');
    const result = await PlayHistoryModel.getUserPlayStats(openid);

    if (!result.success) {
      throw new Error(result.error);
    }

    res.json({
      success: true,
      data: result.data || null
    });

  } catch (error) {
    console.error('获取播放统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取播放统计失败',
      error: error.message
    });
  }
});

module.exports = router;