const { query } = require('../database/config');

/**
 * 音频播放控制服务
 * 负责处理音量、速度配置和播放控制逻辑，包含统计和监控功能
 */
class AudioPlaybackService {
  
  /**
   * 验证音量配置
   */
  static validateVolumeConfig(volumeConfig) {
    if (!volumeConfig || typeof volumeConfig !== 'object') {
      return false;
    }
    
    for (const [audioId, volume] of Object.entries(volumeConfig)) {
      if (typeof volume !== 'number' || volume < 0 || volume > 1) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 验证速度配置
   */
  static validateSpeedConfig(speedConfig) {
    if (!speedConfig || typeof speedConfig !== 'object') {
      return false;
    }
    
    for (const [audioId, speed] of Object.entries(speedConfig)) {
      if (typeof speed !== 'number' || speed < 0.5 || speed > 2.0) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 生成默认音量配置
   */
  static generateDefaultVolumeConfig(audioIds) {
    const config = {};
    audioIds.forEach(audioId => {
      config[audioId] = 1.0; // 默认音量100%
    });
    return config;
  }

  /**
   * 生成默认速度配置
   */
  static generateDefaultSpeedConfig(audioIds) {
    const config = {};
    audioIds.forEach(audioId => {
      config[audioId] = 1.0; // 默认速度1.0x
    });
    return config;
  }

  /**
   * 处理组合音频播放配置
   */
  static async processCombinationPlaybackConfig(audioIds, userConfig = {}) {
    try {
      // 验证音频ID数组
      if (!audioIds || !Array.isArray(audioIds) || audioIds.length === 0) {
        throw new Error('音频ID数组不能为空');
      }
      
      // 验证音频数量限制
      if (audioIds.length > 3) {
        throw new Error('组合音频数量不能超过3个');
      }
      
      // 验证音频是否存在
      const audioCheckSql = `SELECT audio_id FROM audios WHERE audio_id IN (?) AND is_public = 1`;
      const audioCheckResult = await query(audioCheckSql, [audioIds]);
      
      if (!audioCheckResult.success || audioCheckResult.data.length !== audioIds.length) {
        throw new Error('部分音频不存在或无权限访问');
      }
      
      // 处理音量配置
      let volumeConfig = userConfig.volume_config;
      if (!this.validateVolumeConfig(volumeConfig)) {
        volumeConfig = this.generateDefaultVolumeConfig(audioIds);
      }
      
      // 处理速度配置
      let speedConfig = userConfig.speed_config;
      if (!this.validateSpeedConfig(speedConfig)) {
        speedConfig = this.generateDefaultSpeedConfig(audioIds);
      }
      
      // 确保配置包含所有音频ID
      audioIds.forEach(audioId => {
        if (!volumeConfig[audioId]) {
          volumeConfig[audioId] = 1.0;
        }
        if (!speedConfig[audioId]) {
          speedConfig[audioId] = 1.0;
        }
      });
      
      return {
        volume_config: volumeConfig,
        speed_config: speedConfig
      };
    } catch (error) {
      console.error('处理组合音频播放配置失败:', error);
      throw error;
    }
  }

  /**
   * 计算组合音频的总时长（考虑速度配置）
   */
  static async calculateCombinationDuration(audioIds, speedConfig = {}) {
    try {
      if (!audioIds || audioIds.length === 0) return 0;
      
      // 获取音频时长信息
      const sql = `SELECT audio_id, duration_seconds FROM audios WHERE audio_id IN (?)`;
      const result = await query(sql, [audioIds]);
      
      if (!result.success) {
        throw new Error('获取音频时长失败');
      }
      
      const audioDurations = {};
      result.data.forEach(audio => {
        audioDurations[audio.audio_id] = audio.duration_seconds || 0;
      });
      
      // 计算最长音频的实际时长（考虑速度）
      let maxDuration = 0;
      audioIds.forEach(audioId => {
        const duration = audioDurations[audioId] || 0;
        const speed = speedConfig[audioId] || 1.0;
        const actualDuration = duration / speed;
        maxDuration = Math.max(maxDuration, actualDuration);
      });
      
      return Math.round(maxDuration);
    } catch (error) {
      console.error('计算组合音频时长失败:', error);
      return 0;
    }
  }

  /**
   * 创建播放会话
   */
  static async createPlaySession(openid, audioIds, playbackConfig = {}) {
    try {
      // 处理播放配置
      const config = await this.processCombinationPlaybackConfig(audioIds, playbackConfig);
      
      // 计算预估时长
      const estimatedDuration = await this.calculateCombinationDuration(audioIds, config.speed_config);
      
      // 处理定时设置
      const timerValidation = this.validateTimerSettings(playbackConfig.timer_minutes);
      if (!timerValidation.isValid) {
        throw new Error(timerValidation.error);
      }
      
      const timerMinutes = timerValidation.timerMinutes;
      const startTime = new Date();
      const endTime = this.calculateTimerEndTime(startTime, timerMinutes);
      
      // 创建播放会话记录
      const sessionData = {
        openid,
        audio_ids: audioIds,
        volume_config: config.volume_config,
        speed_config: config.speed_config,
        estimated_duration: estimatedDuration,
        timer_minutes: timerMinutes,
        start_time: startTime,
        end_time: endTime,
        created_at: new Date()
      };
      
      return sessionData;
    } catch (error) {
      console.error('创建播放会话失败:', error);
      throw error;
    }
  }

  /**
   * 获取音频播放URL（考虑客户端处理）
   */
  static getAudioPlaybackUrls(audioIds, config = {}) {
    const { volume_config = {}, speed_config = {} } = config;
    
    return audioIds.map(audioId => ({
      audio_id: audioId,
      audio_url: `/api/audios/${audioId}/stream`, // 实际音频流地址
      volume: volume_config[audioId] || 1.0,
      speed: speed_config[audioId] || 1.0,
      metadata: {
        volume: volume_config[audioId] || 1.0,
        speed: speed_config[audioId] || 1.0
      }
    }));
  }

  /**
   * 验证定时播放参数
   */
  static validateTimerSettings(timerMinutes) {
    if (timerMinutes === undefined || timerMinutes === null) {
      return { isValid: true, timerMinutes: 0 };
    }
    
    const minutes = parseInt(timerMinutes);
    if (isNaN(minutes) || minutes < 0 || minutes > 480) { // 最大8小时
      return { isValid: false, error: '定时时长必须在0-480分钟之间' };
    }
    
    return { isValid: true, timerMinutes: minutes };
  }

  /**
   * 计算定时播放结束时间
   */
  static calculateTimerEndTime(startTime, timerMinutes) {
    if (!timerMinutes || timerMinutes <= 0) {
      return null;
    }
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + timerMinutes);
    return endTime;
  }

  /**
   * 获取推荐的音量平衡配置
   */
  static getRecommendedVolumeBalance(audioIds, audioTypes = []) {
    const config = {};
    
    audioIds.forEach((audioId, index) => {
      const audioType = audioTypes[index] || 'nature';
      
      // 根据音频类型设置推荐音量
      switch (audioType.toLowerCase()) {
        case 'rain':
        case 'rainfall':
          config[audioId] = 0.8; // 雨声类适合较低音量
          break;
        case 'thunder':
        case 'storm':
          config[audioId] = 0.6; // 雷声类音量较低
          break;
        case 'water':
        case 'river':
        case 'stream':
          config[audioId] = 0.7; // 水流声适中
          break;
        case 'forest':
        case 'birds':
          config[audioId] = 0.9; // 森林鸟鸣声较高
          break;
        case 'white_noise':
          config[audioId] = 0.4; // 白噪音音量较低
          break;
        default:
          config[audioId] = 0.8; // 默认音量
      }
    });
    
    return config;
  }

  /**
   * 获取推荐的播放速度配置
   */
  static getRecommendedSpeedSettings(audioIds, sleepMode = 'normal') {
    const config = {};
    
    audioIds.forEach(audioId => {
      // 根据睡眠模式设置推荐速度
      switch (sleepMode) {
        case 'deep_sleep':
          config[audioId] = 0.8; // 深度睡眠模式，较慢速度
          break;
        case 'light_sleep':
          config[audioId] = 1.0; // 浅睡眠模式，正常速度
          break;
        case 'meditation':
          config[audioId] = 1.2; // 冥想模式，稍快速度
          break;
        case 'relaxation':
          config[audioId] = 0.9; // 放松模式，稍慢速度
          break;
        default:
          config[audioId] = 1.0; // 默认速度
      }
    });
    
    return config;
  }

  /**
   * 保存用户播放偏好
   */
  static async saveUserPlaybackPreferences(openid, preferences) {
    try {
      const { 
        default_volume = 1.0, 
        default_speed = 1.0, 
        preferred_volume_balance = 'balanced',
        auto_timer_enabled = false,
        sleep_mode = 'normal'
      } = preferences;
      
      // 获取用户当前设置
      const getSql = `SELECT settings FROM users WHERE openid = ?`;
      const getResult = await query(getSql, [openid]);
      
      if (!getResult.success || getResult.data.length === 0) {
        throw new Error('用户不存在');
      }
      
      let userSettings = {};
      try {
        userSettings = JSON.parse(getResult.data[0].settings || '{}');
      } catch (e) {
        userSettings = {};
      }
      
      // 更新播放偏好设置
      userSettings.playback = {
        default_volume: Math.max(0, Math.min(1.0, default_volume)),
        default_speed: Math.max(0.5, Math.min(2.0, default_speed)),
        preferred_volume_balance,
        auto_timer_enabled,
        sleep_mode
      };
      
      // 保存到数据库
      const updateSql = `UPDATE users SET settings = ? WHERE openid = ?`;
      const updateResult = await query(updateSql, [JSON.stringify(userSettings), openid]);
      
      if (!updateResult.success) {
        throw new Error('保存用户偏好失败');
      }
      
      return { success: true, message: '偏好设置保存成功' };
    } catch (error) {
      console.error('保存用户播放偏好失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取用户播放偏好
   */
  static async getUserPlaybackPreferences(openid) {
    try {
      const sql = `SELECT settings FROM users WHERE openid = ?`;
      const result = await query(sql, [openid]);
      
      if (!result.success || result.data.length === 0) {
        return { success: false, error: '用户不存在' };
      }
      
      let userSettings = {};
      try {
        userSettings = JSON.parse(result.data[0].settings || '{}');
      } catch (e) {
        userSettings = {};
      }
      
      const defaultPreferences = {
        default_volume: 1.0,
        default_speed: 1.0,
        preferred_volume_balance: 'balanced',
        auto_timer_enabled: false,
        sleep_mode: 'normal'
      };
      
      const playbackPrefs = userSettings.playback || {};
      
      return {
        success: true,
        data: { ...defaultPreferences, ...playbackPrefs }
      };
    } catch (error) {
      console.error('获取用户播放偏好失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 检查定时播放状态
   */
  static checkTimerStatus(sessionData) {
    if (!sessionData.end_time) {
      return {
        is_timer_active: false,
        status: 'no_timer'
      };
    }
    
    const now = new Date();
    const endTime = new Date(sessionData.end_time);
    
    if (now > endTime) {
      return {
        is_timer_active: false,
        status: 'timer_expired',
        time_remaining: 0
      };
    }
    
    const timeRemaining = Math.max(0, Math.floor((endTime - now) / 1000)); // 秒
    
    return {
      is_timer_active: true,
      status: 'timer_active',
      time_remaining: timeRemaining,
      minutes_remaining: Math.ceil(timeRemaining / 60)
    };
  }

  /**
   * 获取智能定时建议
   */
  static getSmartTimerSuggestions(audioIds, sleepMode = 'normal') {
    const suggestions = [
      {
        name: '快速小憩',
        minutes: 20,
        description: '适合午间快速休息',
        icon: '⏰',
        recommended_for: ['light_sleep', 'quick_rest']
      },
      {
        name: '高效午休',
        minutes: 45,
        description: '消除疲劳，恢复精力',
        icon: '💪',
        recommended_for: ['power_nap', 'energy_recovery']
      },
      {
        name: '完整睡眠周期',
        minutes: 90,
        description: '完成一个完整的睡眠周期',
        icon: '😴',
        recommended_for: ['deep_sleep', 'full_cycle']
      },
      {
        name: '深度放松',
        minutes: 180,
        description: '长时间深度放松',
        icon: '🧘',
        recommended_for: ['meditation', 'deep_relaxation']
      }
    ];

    // 根据睡眠模式推荐
    const modeRecommendations = {
      deep_sleep: 90,
      light_sleep: 45,
      meditation: 180,
      relaxation: 60
    };

    const recommendedTime = modeRecommendations[sleepMode] || 60;
    
    // 为当前模式添加推荐标记
    suggestions.forEach(suggestion => {
      suggestion.is_recommended = suggestion.minutes === recommendedTime;
    });

    return suggestions;
  }

  /**
   * 创建定时播放任务
   */
  static async createTimerPlaybackTask(openid, audioIds, timerMinutes, playbackConfig = {}) {
    try {
      // 创建播放会话
      const sessionData = await this.createPlaySession(openid, audioIds, {
        ...playbackConfig,
        timer_minutes: timerMinutes
      });

      // 保存定时任务到数据库（可选）
      const taskData = {
        openid,
        audio_ids: audioIds,
        timer_minutes: timerMinutes,
        start_time: sessionData.start_time,
        end_time: sessionData.end_time,
        status: 'active',
        created_at: new Date()
      };

      // 这里可以保存到定时任务表（如果需要持久化）
      // const saveResult = await this.saveTimerTask(taskData);

      return {
        success: true,
        data: {
          task_id: Date.now().toString(),
          session_data: sessionData,
          timer_status: this.checkTimerStatus(sessionData)
        }
      };
    } catch (error) {
      console.error('创建定时播放任务失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 取消定时播放
   */
  static async cancelTimerPlayback(taskId) {
    try {
      // 这里可以更新定时任务状态为取消
      // 实际实现需要根据存储方式来处理
      
      return {
        success: true,
        message: '定时播放已取消'
      };
    } catch (error) {
      console.error('取消定时播放失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取用户当前的定时播放任务
   */
  static async getUserActiveTimerTasks(openid) {
    try {
      // 这里可以查询用户当前的活跃定时任务
      // 实际实现需要根据存储方式来处理
      
      return {
        success: true,
        data: {
          active_tasks: [],
          total_count: 0
        }
      };
    } catch (error) {
      console.error('获取用户定时任务失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 验证定时播放参数
   */
  static validateTimerPlaybackParams(audioIds, timerMinutes) {
    const errors = [];

    // 验证音频ID
    if (!audioIds || !Array.isArray(audioIds) || audioIds.length === 0) {
      errors.push('音频ID数组不能为空');
    } else if (audioIds.length > 3) {
      errors.push('组合音频数量不能超过3个');
    }

    // 验证定时时长
    const timerValidation = this.validateTimerSettings(timerMinutes);
    if (!timerValidation.isValid) {
      errors.push(timerValidation.error);
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * 记录播放会话统计
   */
  static async recordPlaySessionStats(openid, sessionData) {
    try {
      const stats = {
        openid,
        audio_ids: JSON.stringify(sessionData.audio_ids),
        audio_count: sessionData.audio_ids.length,
        duration_seconds: sessionData.estimated_duration,
        timer_minutes: sessionData.timer_minutes || 0,
        volume_config: JSON.stringify(sessionData.volume_config || {}),
        speed_config: JSON.stringify(sessionData.speed_config || {}),
        start_time: sessionData.start_time,
        end_time: sessionData.end_time,
        created_at: new Date()
      };

      const sql = `
        INSERT INTO play_session_stats 
        (openid, audio_ids, audio_count, duration_seconds, timer_minutes, 
         volume_config, speed_config, start_time, end_time, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const result = await query(sql, [
        stats.openid, stats.audio_ids, stats.audio_count, stats.duration_seconds,
        stats.timer_minutes, stats.volume_config, stats.speed_config,
        stats.start_time, stats.end_time, stats.created_at
      ]);

      return { success: true, session_id: result.insertId };
    } catch (error) {
      console.error('记录播放会话统计失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取用户播放统计概览
   */
  static async getUserPlayStats(openid, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const sql = `
        SELECT 
          COUNT(*) as total_sessions,
          SUM(duration_seconds) as total_duration_seconds,
          AVG(audio_count) as avg_audio_count,
          AVG(timer_minutes) as avg_timer_minutes,
          COUNT(DISTINCT DATE(created_at)) as active_days
        FROM play_session_stats 
        WHERE openid = ? AND created_at >= ?
      `;

      const result = await query(sql, [openid, startDate]);
      
      if (!result.success || result.data.length === 0) {
        return { success: true, data: this.getDefaultStats() };
      }

      const stats = result.data[0];
      const totalHours = Math.round(stats.total_duration_seconds / 3600 * 100) / 100;

      return {
        success: true,
        data: {
          total_sessions: stats.total_sessions || 0,
          total_duration_hours: totalHours,
          avg_audio_count: Math.round(stats.avg_audio_count * 100) / 100 || 0,
          avg_timer_minutes: Math.round(stats.avg_timer_minutes * 100) / 100 || 0,
          active_days: stats.active_days || 0,
          period_days: days
        }
      };
    } catch (error) {
      console.error('获取用户播放统计失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取播放趋势分析
   */
  static async getPlayTrends(openid, period = 'week') {
    try {
      let groupBy, dateFormat, interval;
      
      switch (period) {
        case 'day':
          groupBy = 'DATE(created_at)';
          dateFormat = '%Y-%m-%d';
          interval = 7; // 最近7天
          break;
        case 'week':
          groupBy = 'YEARWEEK(created_at)';
          dateFormat = '%Y-%u';
          interval = 8; // 最近8周
          break;
        case 'month':
          groupBy = 'DATE_FORMAT(created_at, \'%Y-%m\')';
          dateFormat = '%Y-%m';
          interval = 6; // 最近6个月
          break;
        default:
          groupBy = 'YEARWEEK(created_at)';
          dateFormat = '%Y-%u';
          interval = 8;
      }

      const startDate = new Date();
      if (period === 'day') {
        startDate.setDate(startDate.getDate() - interval);
      } else if (period === 'week') {
        startDate.setDate(startDate.getDate() - interval * 7);
      } else {
        startDate.setMonth(startDate.getMonth() - interval);
      }

      const sql = `
        SELECT 
          ${groupBy} as period,
          COUNT(*) as session_count,
          SUM(duration_seconds) as total_duration,
          AVG(audio_count) as avg_audio_count
        FROM play_session_stats 
        WHERE openid = ? AND created_at >= ?
        GROUP BY ${groupBy}
        ORDER BY period DESC
        LIMIT ${interval}
      `;

      const result = await query(sql, [openid, startDate]);
      
      if (!result.success) {
        return { success: false, error: '查询失败' };
      }

      return {
        success: true,
        data: {
          period: period,
          trends: result.data.reverse(), // 按时间顺序排列
          total_periods: result.data.length
        }
      };
    } catch (error) {
      console.error('获取播放趋势失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 分析用户播放偏好
   */
  static async analyzeUserPreferences(openid) {
    try {
      // 获取最常使用的音频
      const popularAudioSql = `
        SELECT 
          audio_ids,
          COUNT(*) as usage_count
        FROM play_session_stats 
        WHERE openid = ?
        GROUP BY audio_ids
        ORDER BY usage_count DESC
        LIMIT 10
      `;

      const popularResult = await query(popularAudioSql, [openid]);
      
      // 获取播放时间分布
      const timeDistributionSql = `
        SELECT 
          HOUR(created_at) as hour,
          COUNT(*) as session_count
        FROM play_session_stats 
        WHERE openid = ?
        GROUP BY HOUR(created_at)
        ORDER BY hour
      `;

      const timeResult = await query(timeDistributionSql, [openid]);

      // 获取定时播放偏好
      const timerPrefsSql = `
        SELECT 
          CASE 
            WHEN timer_minutes = 0 THEN 'no_timer'
            WHEN timer_minutes <= 30 THEN 'short_timer'
            WHEN timer_minutes <= 60 THEN 'medium_timer'
            ELSE 'long_timer'
          END as timer_type,
          COUNT(*) as count
        FROM play_session_stats 
        WHERE openid = ?
        GROUP BY timer_type
      `;

      const timerResult = await query(timerPrefsSql, [openid]);

      return {
        success: true,
        data: {
          popular_audio_combinations: popularResult.success ? popularResult.data : [],
          time_distribution: timeResult.success ? timeResult.data : [],
          timer_preferences: timerResult.success ? timerResult.data : []
        }
      };
    } catch (error) {
      console.error('分析用户播放偏好失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取默认统计数据
   */
  static getDefaultStats() {
    return {
      total_sessions: 0,
      total_duration_hours: 0,
      avg_audio_count: 0,
      avg_timer_minutes: 0,
      active_days: 0,
      period_days: 30
    };
  }

  /**
   * 监控播放质量
   */
  static async monitorPlaybackQuality(openid, sessionData, qualityMetrics = {}) {
    try {
      const metrics = {
        openid,
        session_id: sessionData.session_id,
        audio_quality: qualityMetrics.audio_quality || 'good',
        buffer_time: qualityMetrics.buffer_time || 0,
        interruptions: qualityMetrics.interruptions || 0,
        avg_bitrate: qualityMetrics.avg_bitrate || 0,
        created_at: new Date()
      };

      const sql = `
        INSERT INTO playback_quality_metrics 
        (openid, session_id, audio_quality, buffer_time, interruptions, avg_bitrate, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      const result = await query(sql, [
        metrics.openid, metrics.session_id, metrics.audio_quality,
        metrics.buffer_time, metrics.interruptions, metrics.avg_bitrate,
        metrics.created_at
      ]);

      return { success: true, metric_id: result.insertId };
    } catch (error) {
      console.error('记录播放质量监控失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取播放质量报告
   */
  static async getPlaybackQualityReport(openid, days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const sql = `
        SELECT 
          audio_quality,
          COUNT(*) as count,
          AVG(buffer_time) as avg_buffer_time,
          AVG(interruptions) as avg_interruptions,
          AVG(avg_bitrate) as avg_bitrate
        FROM playback_quality_metrics 
        WHERE openid = ? AND created_at >= ?
        GROUP BY audio_quality
      `;

      const result = await query(sql, [openid, startDate]);
      
      if (!result.success) {
        return { success: false, error: '查询失败' };
      }

      return {
        success: true,
        data: {
          period_days: days,
          quality_metrics: result.data,
          total_sessions: result.data.reduce((sum, item) => sum + item.count, 0)
        }
      };
    } catch (error) {
      console.error('获取播放质量报告失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 保存播放会话状态
   */
  static async savePlaybackSessionState(openid, sessionData) {
    try {
      const state = {
        openid,
        session_id: sessionData.session_id || Date.now().toString(),
        audio_ids: JSON.stringify(sessionData.audio_ids),
        current_position: sessionData.current_position || 0,
        current_audio_index: sessionData.current_audio_index || 0,
        volume_config: JSON.stringify(sessionData.volume_config || {}),
        speed_config: JSON.stringify(sessionData.speed_config || {}),
        timer_minutes: sessionData.timer_minutes || 0,
        estimated_duration: sessionData.estimated_duration || 0,
        playback_state: sessionData.playback_state || 'paused',
        created_at: new Date(),
        updated_at: new Date()
      };

      const sql = `
        INSERT INTO playback_session_states 
        (openid, session_id, audio_ids, current_position, current_audio_index, 
         volume_config, speed_config, timer_minutes, estimated_duration, 
         playback_state, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          current_position = VALUES(current_position),
          current_audio_index = VALUES(current_audio_index),
          playback_state = VALUES(playback_state),
          updated_at = VALUES(updated_at)
      `;
      
      const result = await query(sql, [
        state.openid, state.session_id, state.audio_ids, state.current_position,
        state.current_audio_index, state.volume_config, state.speed_config,
        state.timer_minutes, state.estimated_duration, state.playback_state,
        state.created_at, state.updated_at
      ]);

      return { success: true, session_id: state.session_id };
    } catch (error) {
      console.error('保存播放会话状态失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 恢复播放会话状态
   */
  static async restorePlaybackSessionState(openid, sessionId) {
    try {
      const sql = `
        SELECT * FROM playback_session_states 
        WHERE openid = ? AND session_id = ?
      `;

      const result = await query(sql, [openid, sessionId]);
      
      if (!result.success || result.data.length === 0) {
        return { success: false, error: '未找到播放会话状态' };
      }

      const state = result.data[0];
      
      const restoredSession = {
        session_id: state.session_id,
        audio_ids: JSON.parse(state.audio_ids),
        current_position: state.current_position,
        current_audio_index: state.current_audio_index,
        volume_config: JSON.parse(state.volume_config || '{}'),
        speed_config: JSON.parse(state.speed_config || '{}'),
        timer_minutes: state.timer_minutes,
        estimated_duration: state.estimated_duration,
        playback_state: state.playback_state,
        created_at: state.created_at,
        updated_at: state.updated_at
      };

      return { success: true, data: restoredSession };
    } catch (error) {
      console.error('恢复播放会话状态失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取用户最近播放会话
   */
  static async getUserRecentPlaybackSessions(openid, limit = 5) {
    try {
      const sql = `
        SELECT * FROM playback_session_states 
        WHERE openid = ? 
        ORDER BY updated_at DESC 
        LIMIT ?
      `;

      const result = await query(sql, [openid, limit]);
      
      if (!result.success) {
        return { success: false, error: '查询失败' };
      }

      const sessions = result.data.map(state => ({
        session_id: state.session_id,
        audio_ids: JSON.parse(state.audio_ids),
        audio_count: JSON.parse(state.audio_ids).length,
        current_position: state.current_position,
        current_audio_index: state.current_audio_index,
        timer_minutes: state.timer_minutes,
        estimated_duration: state.estimated_duration,
        playback_state: state.playback_state,
        created_at: state.created_at,
        updated_at: state.updated_at,
        time_since_last_play: Math.round((Date.now() - new Date(state.updated_at).getTime()) / 1000)
      }));

      return {
        success: true,
        data: {
          sessions,
          total_count: sessions.length
        }
      };
    } catch (error) {
      console.error('获取用户最近播放会话失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 清理过期的播放会话状态
   */
  static async cleanupExpiredPlaybackSessions(days = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const sql = `
        DELETE FROM playback_session_states 
        WHERE updated_at < ?
      `;

      const result = await query(sql, [cutoffDate]);
      
      if (!result.success) {
        return { success: false, error: '清理失败' };
      }

      return {
        success: true,
        data: {
          deleted_count: result.affectedRows,
          cutoff_date: cutoffDate
        }
      };
    } catch (error) {
      console.error('清理过期播放会话失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 处理播放中断恢复
   */
  static async handlePlaybackInterruption(openid, interruptionData) {
    try {
      const {
        session_id,
        audio_ids,
        current_position,
        current_audio_index,
        interruption_type = 'network', // network, app_crash, system
        interruption_duration = 0,
        timestamp = new Date()
      } = interruptionData;

      // 保存中断记录
      const interruptionSql = `
        INSERT INTO playback_interruptions 
        (openid, session_id, audio_ids, current_position, current_audio_index,
         interruption_type, interruption_duration, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await query(interruptionSql, [
        openid, session_id, JSON.stringify(audio_ids), current_position,
        current_audio_index, interruption_type, interruption_duration, timestamp
      ]);

      // 获取恢复位置建议
      const recoveryPosition = this.calculateRecoveryPosition(current_position, interruption_duration);
      
      return {
        success: true,
        data: {
          session_id,
          suggested_recovery_position: recoveryPosition,
          interruption_type,
          recovery_suggestion: this.getRecoverySuggestion(interruption_type, interruption_duration)
        }
      };
    } catch (error) {
      console.error('处理播放中断失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 计算恢复位置
   */
  static calculateRecoveryPosition(currentPosition, interruptionDuration) {
    // 如果是网络中断，可以稍微回退一点
    if (interruptionDuration > 30) { // 超过30秒的中断
      return Math.max(0, currentPosition - 5); // 回退5秒
    }
    return currentPosition;
  }

  /**
   * 获取恢复建议
   */
  static getRecoverySuggestion(interruptionType, duration) {
    const suggestions = {
      network: duration > 30 ? '网络连接不稳定，建议检查网络设置' : '网络连接已恢复',
      app_crash: '应用异常退出，已尝试恢复播放位置',
      system: '系统资源不足，建议关闭其他应用'
    };
    return suggestions[interruptionType] || '播放已恢复';
  }
}

module.exports = AudioPlaybackService;