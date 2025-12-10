const express = require('express');
const router = express.Router();

// 获取用户播放历史（支持组合音频）
router.get('/', async (req, res) => {
  try {
    const openid = req.openid;
    
    // 如果没有openid（匿名用户），返回空结果而不是错误
    if (!openid) {
      return res.json({
        success: true,
        data: [],
        total: 0
      });
    }
    
    const { limit = 20, offset = 0, play_type = null } = req.query;

    const PlayHistoryModel = require('./database/models/PlayHistory');
    const result = await PlayHistoryModel.getUserPlayHistory(openid, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      play_type: play_type
    });

    if (!result.success) {
      throw new Error(result.message || result.error);
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

// 添加播放记录（组合形式）
router.post('/', async (req, res) => {
  try {
    const openid = req.openid;
    const {
      combination_id = null, // 摇骰子组合ID（如果是从摇骰子生成）
      audio_ids, // 组合中的所有音频ID（3个或更多）
      selected_audio_ids, // 用户选择的音频ID（1-3个）
      play_type = 'combination', // 播放类型：single/combination
      play_mode = 'parallel', // 播放模式：parallel/sequential
      timer_minutes = 0, // 定时时长
      volume_config = null, // 音量配置
      device_info = 'unknown', // 设备信息
      play_duration = 0, // 播放时长
      is_completed = true, // 是否完成
      combination_source = 'white_noise' // 组合来源：white_noise/user_selection
    } = req.body;

    // 验证参数
    if (!Array.isArray(audio_ids) || audio_ids.length < 3) {
      return res.status(400).json({
        success: false,
        message: '音频组合必须包含至少3个音频'
      });
    }

    if (!Array.isArray(selected_audio_ids) || selected_audio_ids.length === 0 || selected_audio_ids.length > 3) {
      return res.status(400).json({
        success: false,
        message: '已选音频数量必须在1-3个之间'
      });
    }

    // 验证音频ID格式
    if (audio_ids.some(id => isNaN(parseInt(id))) || selected_audio_ids.some(id => isNaN(parseInt(id)))) {
      return res.status(400).json({
        success: false,
        message: '音频ID格式无效'
      });
    }

    const PlayHistoryModel = require('./database/models/PlayHistory');
    const result = await PlayHistoryModel.addCombinationPlayRecord(openid, {
      combination_id,
      audio_ids: audio_ids.map(id => parseInt(id)),
      selected_audio_ids: selected_audio_ids.map(id => parseInt(id)),
      play_type: 'combination',
      play_mode,
      timer_minutes: parseInt(timer_minutes),
      volume_config: volume_config || {},
      device_info,
      play_duration: parseInt(play_duration),
      is_completed: is_completed === 'true' || is_completed === true,
      combination_source
    });

    if (!result.success) {
      throw new Error(result.message || result.error);
    }

    res.json({
      success: true,
      data: result.data || null,
      message: result.message || '组合播放记录添加成功'
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
      throw new Error(result.message || result.error);
    }

    res.json({
      success: true,
      message: result.message || '播放历史已清空'
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
      throw new Error(result.message || result.error);
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
    const { 
      period = 'all', // all, day, week, month, year
      start_date = null,
      end_date = null
    } = req.query;

    const PlayHistoryModel = require('./database/models/PlayHistory');
    const result = await PlayHistoryModel.getUserPlayStats(openid, {
      period,
      start_date,
      end_date
    });

    if (!result.success) {
      throw new Error(result.message || result.error);
    }

    res.json({
      success: true,
      data: result.data || {}
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

// 获取播放趋势分析
router.get('/trends', async (req, res) => {
  try {
    const openid = req.openid;
    const { 
      group_by = 'day', // day, week, month
      period = 'month'  // week, month, year
    } = req.query;

    const PlayHistoryModel = require('./database/models/PlayHistory');
    const result = await PlayHistoryModel.getPlayTrends(openid, {
      group_by,
      period
    });

    if (!result.success) {
      throw new Error(result.message || result.error);
    }

    res.json({
      success: true,
      data: result.data || {}
    });

  } catch (error) {
    console.error('获取播放趋势失败:', error);
    res.status(500).json({
      success: false,
      message: '获取播放趋势失败',
      error: error.message
    });
  }
});

// 获取用户偏好分析
router.get('/preferences', async (req, res) => {
  try {
    const openid = req.openid;

    const PlayHistoryModel = require('./database/models/PlayHistory');
    const result = await PlayHistoryModel.getUserPreferences(openid);

    if (!result.success) {
      throw new Error(result.message || result.error);
    }

    res.json({
      success: true,
      data: result.data || {}
    });

  } catch (error) {
    console.error('获取用户偏好失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户偏好失败',
      error: error.message
    });
  }
});

// 获取组合播放统计
router.get('/stats/combination', async (req, res) => {
  try {
    const openid = req.openid;

    const PlayHistoryModel = require('./database/models/PlayHistory');
    const result = await PlayHistoryModel.getUserCombinationStats(openid);

    if (!result.success) {
      throw new Error(result.message || result.error);
    }

    res.json({
      success: true,
      data: result.data || []
    });

  } catch (error) {
    console.error('获取组合播放统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取组合播放统计失败',
      error: error.message
    });
  }
});

module.exports = router;