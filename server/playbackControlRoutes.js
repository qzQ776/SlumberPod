const express = require('express');
const router = express.Router();

// 播放控制服务
const AudioPlaybackService = require('./services/AudioPlaybackService');

/**
 * 开始播放组合音频
 */
router.post('/play/combination', async (req, res) => {
  try {
    const openid = req.openid; // 从中间件获取
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }
    
    const { 
      audio_ids, // 音频ID数组
      volume_config, // 音量配置
      speed_config, // 速度配置
      timer_minutes = 0 // 定时时长（分钟）
    } = req.body;
    
    // 验证参数
    if (!audio_ids || !Array.isArray(audio_ids) || audio_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '音频ID数组不能为空'
      });
    }
    
    // 验证音频数量
    if (audio_ids.length > 3) {
      return res.status(400).json({
        success: false,
        message: '组合音频数量不能超过3个'
      });
    }
    
    // 验证定时参数
    const timerValidation = AudioPlaybackService.validateTimerSettings(timer_minutes);
    if (!timerValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: timerValidation.error
      });
    }
    
    // 创建播放会话
    const playbackConfig = {
      volume_config,
      speed_config,
      timer_minutes: timerValidation.timerMinutes
    };
    
    const sessionData = await AudioPlaybackService.createPlaySession(openid, audio_ids, playbackConfig);
    
    // 获取音频播放URL
    const playbackUrls = AudioPlaybackService.getAudioPlaybackUrls(audio_ids, {
      volume_config: sessionData.volume_config,
      speed_config: sessionData.speed_config
    });
    
    res.json({
      success: true,
      data: {
        session_id: Date.now().toString(), // 临时会话ID
        audio_items: playbackUrls,
        estimated_duration: sessionData.estimated_duration,
        timer_minutes: sessionData.timer_minutes,
        volume_config: sessionData.volume_config,
        speed_config: sessionData.speed_config
      },
      message: '播放会话创建成功'
    });
  } catch (error) {
    console.error('开始播放组合音频失败:', error);
    res.status(500).json({
      success: false,
      message: '开始播放组合音频失败',
      error: error.message
    });
  }
});

/**
 * 获取推荐的音量平衡配置
 */
router.post('/recommendations/volume-balance', async (req, res) => {
  try {
    const { audio_ids, audio_types = [] } = req.body;
    
    if (!audio_ids || !Array.isArray(audio_ids) || audio_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '音频ID数组不能为空'
      });
    }
    
    const volumeConfig = AudioPlaybackService.getRecommendedVolumeBalance(audio_ids, audio_types);
    
    res.json({
      success: true,
      data: {
        volume_config: volumeConfig,
        recommendation_type: 'volume_balance'
      }
    });
  } catch (error) {
    console.error('获取音量平衡推荐失败:', error);
    res.status(500).json({
      success: false,
      message: '获取音量平衡推荐失败',
      error: error.message
    });
  }
});

/**
 * 获取推荐的播放速度配置
 */
router.post('/recommendations/speed-settings', async (req, res) => {
  try {
    const { audio_ids, sleep_mode = 'normal' } = req.body;
    
    if (!audio_ids || !Array.isArray(audio_ids) || audio_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '音频ID数组不能为空'
      });
    }
    
    const speedConfig = AudioPlaybackService.getRecommendedSpeedSettings(audio_ids, sleep_mode);
    
    res.json({
      success: true,
      data: {
        speed_config: speedConfig,
        sleep_mode: sleep_mode,
        recommendation_type: 'speed_settings'
      }
    });
  } catch (error) {
    console.error('获取播放速度推荐失败:', error);
    res.status(500).json({
      success: false,
      message: '获取播放速度推荐失败',
      error: error.message
    });
  }
});

/**
 * 保存用户播放偏好
 */
router.post('/preferences', async (req, res) => {
  try {
    const openid = req.openid; // 从中间件获取
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }
    
    const preferences = req.body;
    
    const result = await AudioPlaybackService.saveUserPlaybackPreferences(openid, preferences);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('保存用户播放偏好失败:', error);
    res.status(500).json({
      success: false,
      message: '保存用户播放偏好失败',
      error: error.message
    });
  }
});

/**
 * 获取用户播放偏好
 */
router.get('/preferences', async (req, res) => {
  try {
    const openid = req.openid; // 从中间件获取
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }
    
    const result = await AudioPlaybackService.getUserPlaybackPreferences(openid);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('获取用户播放偏好失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户播放偏好失败',
      error: error.message
    });
  }
});

/**
 * 验证播放配置
 */
router.post('/validate-config', async (req, res) => {
  try {
    const { audio_ids, volume_config, speed_config } = req.body;
    
    if (!audio_ids || !Array.isArray(audio_ids) || audio_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '音频ID数组不能为空'
      });
    }
    
    // 验证音量配置
    const isVolumeValid = AudioPlaybackService.validateVolumeConfig(volume_config);
    const isSpeedValid = AudioPlaybackService.validateSpeedConfig(speed_config);
    
    const validationResult = {
      volume_config: {
        valid: isVolumeValid,
        message: isVolumeValid ? '音量配置有效' : '音量配置无效'
      },
      speed_config: {
        valid: isSpeedValid,
        message: isSpeedValid ? '速度配置有效' : '速度配置无效'
      },
      audio_count: {
        valid: audio_ids.length <= 3,
        message: audio_ids.length <= 3 ? '音频数量符合要求' : '音频数量超过限制（最多3个）'
      }
    };
    
    const allValid = isVolumeValid && isSpeedValid && audio_ids.length <= 3;
    
    res.json({
      success: true,
      data: {
        valid: allValid,
        validation_details: validationResult
      }
    });
  } catch (error) {
    console.error('验证播放配置失败:', error);
    res.status(500).json({
      success: false,
      message: '验证播放配置失败',
      error: error.message
    });
  }
});

/**
 * 计算组合音频时长
 */
router.post('/calculate-duration', async (req, res) => {
  try {
    const { audio_ids, speed_config = {} } = req.body;
    
    if (!audio_ids || !Array.isArray(audio_ids) || audio_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '音频ID数组不能为空'
      });
    }
    
    const duration = await AudioPlaybackService.calculateCombinationDuration(audio_ids, speed_config);
    
    res.json({
      success: true,
      data: {
        estimated_duration_seconds: duration,
        estimated_duration_minutes: Math.round(duration / 60),
        audio_count: audio_ids.length
      }
    });
  } catch (error) {
    console.error('计算组合音频时长失败:', error);
    res.status(500).json({
      success: false,
      message: '计算组合音频时长失败',
      error: error.message
    });
  }
});

/**
 * 获取定时播放建议
 */
router.get('/timer-suggestions', async (req, res) => {
  try {
    const { sleep_mode = 'normal' } = req.query;
    
    const suggestions = AudioPlaybackService.getSmartTimerSuggestions([], sleep_mode);
    
    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('获取定时播放建议失败:', error);
    res.status(500).json({
      success: false,
      message: '获取定时播放建议失败',
      error: error.message
    });
  }
});

/**
 * 创建定时播放任务
 */
router.post('/timer/start', async (req, res) => {
  try {
    const openid = req.openid;
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }
    
    const { 
      audio_ids, 
      timer_minutes = 0,
      volume_config,
      speed_config 
    } = req.body;
    
    // 验证参数
    const validation = AudioPlaybackService.validateTimerPlaybackParams(audio_ids, timer_minutes);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors.join(', ')
      });
    }
    
    const playbackConfig = {
      volume_config,
      speed_config,
      timer_minutes
    };
    
    const result = await AudioPlaybackService.createTimerPlaybackTask(openid, audio_ids, timer_minutes, playbackConfig);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data,
      message: '定时播放任务创建成功'
    });
  } catch (error) {
    console.error('创建定时播放任务失败:', error);
    res.status(500).json({
      success: false,
      message: '创建定时播放任务失败',
      error: error.message
    });
  }
});

/**
 * 取消定时播放任务
 */
router.post('/timer/cancel/:taskId', async (req, res) => {
  try {
    const openid = req.openid;
    const { taskId } = req.params;
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }
    
    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: '任务ID不能为空'
      });
    }
    
    const result = await AudioPlaybackService.cancelTimerPlayback(taskId);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('取消定时播放任务失败:', error);
    res.status(500).json({
      success: false,
      message: '取消定时播放任务失败',
      error: error.message
    });
  }
});

/**
 * 获取用户活跃的定时播放任务
 */
router.get('/timer/active-tasks', async (req, res) => {
  try {
    const openid = req.openid;
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }
    
    const result = await AudioPlaybackService.getUserActiveTimerTasks(openid);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('获取用户定时任务失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户定时任务失败',
      error: error.message
    });
  }
});

/**
 * 检查定时播放状态
 */
router.post('/timer/status', async (req, res) => {
  try {
    const { session_data } = req.body;
    
    if (!session_data) {
      return res.status(400).json({
        success: false,
        message: '会话数据不能为空'
      });
    }
    
    const timerStatus = AudioPlaybackService.checkTimerStatus(session_data);
    
    res.json({
      success: true,
      data: timerStatus
    });
  } catch (error) {
    console.error('检查定时播放状态失败:', error);
    res.status(500).json({
      success: false,
      message: '检查定时播放状态失败',
      error: error.message
    });
  }
});

/**
 * 获取定时播放统计
 */
router.get('/timer/statistics', async (req, res) => {
  try {
    const openid = req.openid;
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }
    
    // 这里可以获取用户的定时播放统计信息
    // 实际实现需要根据存储方式来处理
    
    const statistics = {
      total_timer_sessions: 0,
      average_timer_minutes: 0,
      favorite_timer_preset: '快速小憩',
      most_used_audio_ids: [],
      timer_usage_by_time_of_day: {
        morning: 0,
        afternoon: 0,
        evening: 0,
        night: 0
      }
    };
    
    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('获取定时播放统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取定时播放统计失败',
      error: error.message
    });
  }
});

/**
 * 记录播放会话统计
 */
router.post('/stats/record-session', async (req, res) => {
  try {
    const openid = req.openid;
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }
    
    const {
      audio_ids,
      estimated_duration,
      timer_minutes = 0,
      volume_config = {},
      speed_config = {},
      start_time,
      end_time = null
    } = req.body;
    
    if (!audio_ids || !Array.isArray(audio_ids) || audio_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '音频ID数组不能为空'
      });
    }
    
    const sessionData = {
      audio_ids,
      estimated_duration,
      timer_minutes,
      volume_config,
      speed_config,
      start_time,
      end_time
    };
    
    const result = await AudioPlaybackService.recordPlaySessionStats(openid, sessionData);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      data: {
        session_id: result.session_id
      },
      message: '播放会话统计记录成功'
    });
  } catch (error) {
    console.error('记录播放会话统计失败:', error);
    res.status(500).json({
      success: false,
      message: '记录播放会话统计失败',
      error: error.message
    });
  }
});

/**
 * 获取用户播放统计概览
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const openid = req.openid;
    const { days = 30 } = req.query;
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }
    
    const result = await AudioPlaybackService.getUserPlayStats(openid, parseInt(days));
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('获取用户播放统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户播放统计失败',
      error: error.message
    });
  }
});

/**
 * 获取播放趋势分析
 */
router.get('/stats/trends', async (req, res) => {
  try {
    const openid = req.openid;
    const { period = 'week' } = req.query;
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }
    
    const result = await AudioPlaybackService.getPlayTrends(openid, period);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data
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

/**
 * 分析用户播放偏好
 */
router.get('/stats/preferences', async (req, res) => {
  try {
    const openid = req.openid;
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }
    
    const result = await AudioPlaybackService.analyzeUserPreferences(openid);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('分析用户播放偏好失败:', error);
    res.status(500).json({
      success: false,
      message: '分析用户播放偏好失败',
      error: error.message
    });
  }
});

/**
 * 记录播放质量监控数据
 */
router.post('/quality/monitor', async (req, res) => {
  try {
    const openid = req.openid;
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }
    
    const {
      session_id,
      audio_quality = 'good',
      buffer_time = 0,
      interruptions = 0,
      avg_bitrate = 0
    } = req.body;
    
    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: '会话ID不能为空'
      });
    }
    
    const sessionData = {
      session_id
    };
    
    const qualityMetrics = {
      audio_quality,
      buffer_time,
      interruptions,
      avg_bitrate
    };
    
    const result = await AudioPlaybackService.monitorPlaybackQuality(openid, sessionData, qualityMetrics);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      data: {
        metric_id: result.metric_id
      },
      message: '播放质量监控数据记录成功'
    });
  } catch (error) {
    console.error('记录播放质量监控数据失败:', error);
    res.status(500).json({
      success: false,
      message: '记录播放质量监控数据失败',
      error: error.message
    });
  }
});

/**
 * 获取播放质量报告
 */
router.get('/quality/report', async (req, res) => {
  try {
    const openid = req.openid;
    const { days = 7 } = req.query;
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }
    
    const result = await AudioPlaybackService.getPlaybackQualityReport(openid, parseInt(days));
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('获取播放质量报告失败:', error);
    res.status(500).json({
      success: false,
      message: '获取播放质量报告失败',
      error: error.message
    });
  }
});

/**
 * 保存播放会话状态
 */
router.post('/session/save-state', async (req, res) => {
  try {
    const openid = req.openid;
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }
    
    const {
      session_id,
      audio_ids,
      current_position = 0,
      current_audio_index = 0,
      volume_config = {},
      speed_config = {},
      timer_minutes = 0,
      estimated_duration = 0,
      playback_state = 'paused'
    } = req.body;
    
    if (!audio_ids || !Array.isArray(audio_ids) || audio_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '音频ID数组不能为空'
      });
    }
    
    const sessionData = {
      session_id,
      audio_ids,
      current_position,
      current_audio_index,
      volume_config,
      speed_config,
      timer_minutes,
      estimated_duration,
      playback_state
    };
    
    const result = await AudioPlaybackService.savePlaybackSessionState(openid, sessionData);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      data: {
        session_id: result.session_id
      },
      message: '播放会话状态保存成功'
    });
  } catch (error) {
    console.error('保存播放会话状态失败:', error);
    res.status(500).json({
      success: false,
      message: '保存播放会话状态失败',
      error: error.message
    });
  }
});

/**
 * 恢复播放会话状态
 */
router.get('/session/restore/:sessionId', async (req, res) => {
  try {
    const openid = req.openid;
    const { sessionId } = req.params;
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: '会话ID不能为空'
      });
    }
    
    const result = await AudioPlaybackService.restorePlaybackSessionState(openid, sessionId);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('恢复播放会话状态失败:', error);
    res.status(500).json({
      success: false,
      message: '恢复播放会话状态失败',
      error: error.message
    });
  }
});

/**
 * 获取用户最近播放会话
 */
router.get('/session/recent', async (req, res) => {
  try {
    const openid = req.openid;
    const { limit = 5 } = req.query;
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }
    
    const result = await AudioPlaybackService.getUserRecentPlaybackSessions(openid, parseInt(limit));
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('获取用户最近播放会话失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户最近播放会话失败',
      error: error.message
    });
  }
});

/**
 * 处理播放中断
 */
router.post('/interruption/handle', async (req, res) => {
  try {
    const openid = req.openid;
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }
    
    const {
      session_id,
      audio_ids,
      current_position = 0,
      current_audio_index = 0,
      interruption_type = 'network',
      interruption_duration = 0
    } = req.body;
    
    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: '会话ID不能为空'
      });
    }
    
    const interruptionData = {
      session_id,
      audio_ids,
      current_position,
      current_audio_index,
      interruption_type,
      interruption_duration
    };
    
    const result = await AudioPlaybackService.handlePlaybackInterruption(openid, interruptionData);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('处理播放中断失败:', error);
    res.status(500).json({
      success: false,
      message: '处理播放中断失败',
      error: error.message
    });
  }
});

/**
 * 清理过期播放会话（管理员接口）
 */
router.post('/session/cleanup', async (req, res) => {
  try {
    const { days = 7 } = req.body;
    
    // 这里可以添加管理员权限验证
    
    const result = await AudioPlaybackService.cleanupExpiredPlaybackSessions(parseInt(days));
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data,
      message: '过期播放会话清理完成'
    });
  } catch (error) {
    console.error('清理过期播放会话失败:', error);
    res.status(500).json({
      success: false,
      message: '清理过期播放会话失败',
      error: error.message
    });
  }
});

module.exports = router;