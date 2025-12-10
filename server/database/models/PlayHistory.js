const { query } = require('../config');

class PlayHistory {
  /**
   * 获取用户的播放历史（支持组合音频）
   */
  static async getUserPlayHistory(openid, options = {}) {
    try {
      const { limit = 20, offset = 0, play_type = null } = options;

      let whereClause = 'WHERE ph.openid = ?';
      let params = [openid];

      if (play_type) {
        whereClause += ' AND ph.play_type = ?';
        params.push(play_type);
      }

      const sql = `
        SELECT 
          ph.history_id, ph.openid, ph.audio_ids, ph.played_at, ph.play_type,
          ph.timer_minutes, ph.volume_config, ph.speed_config, ph.device_info,
          ph.play_duration, ph.is_completed, ph.combination_source
        FROM play_history ph
        ${whereClause}
        ORDER BY ph.played_at DESC
        LIMIT ? OFFSET ?
      `;
      
      const result = await query(sql, [...params, parseInt(limit), parseInt(offset)]);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      // 解析JSON字段并获取音频详情
      const histories = await Promise.all(
        result.data.map(async (history) => {
          const audioIds = JSON.parse(history.audio_ids);
          
          // 获取音频详细信息
          const audiosResult = await query(`
            SELECT a.audio_id, a.title, a.audio_url, a.duration_seconds, a.cover_url,
                   GROUP_CONCAT(DISTINCT acm.category_id) as category_ids
            FROM audios a
            LEFT JOIN audio_category_mapping acm ON a.audio_id = acm.audio_id
            WHERE a.audio_id IN (${audioIds.map(() => '?').join(',')})
            GROUP BY a.audio_id
            ORDER BY FIND_IN_SET(a.audio_id, '${audioIds.join(',')}')
          `, audioIds);

          const audios = audiosResult.data.map(audio => ({
            audio_id: audio.audio_id,
            title: audio.title,
            audio_url: audio.audio_url,
            duration_seconds: audio.duration_seconds,
            cover_url: audio.cover_url,
            category_ids: audio.category_ids ? audio.category_ids.split(',').map(id => parseInt(id)) : []
          }));

          return {
            ...history,
            audio_ids: audioIds,
            audios: audios,
            volume_config: history.volume_config ? JSON.parse(history.volume_config) : null,
            speed_config: history.speed_config ? JSON.parse(history.speed_config) : null
          };
        })
      );

      return {
        success: true,
        data: histories,
        total: result.data.length
      };
    } catch (error) {
      console.error('获取播放历史失败:', error);
      return {
        success: false,
        message: '获取播放历史失败',
        error: error.message
      };
    }
  }

  /**
   * 添加播放记录（支持组合音频）
   */
  static async addPlayRecord(openid, playData) {
    try {
      const {
        audio_ids, // 音频ID数组（单个或多个）
        play_type = 'single', // 播放类型：single/combination
        timer_minutes = 0, // 定时时长
        volume_config = null, // 音量配置
        speed_config = null, // 倍速配置
        device_info = 'unknown', // 设备信息
        play_duration = 0, // 播放时长
        is_completed = true, // 是否完成
        combination_source = null // 组合来源
      } = playData;

      // 验证音频ID
      if (!Array.isArray(audio_ids) || audio_ids.length === 0) {
        throw new Error('音频ID列表不能为空');
      }

      // 验证音频是否存在
      const audioCheckResult = await query(`
        SELECT COUNT(*) as count
        FROM audios
        WHERE audio_id IN (${audio_ids.map(() => '?').join(',')})
      `, audio_ids);

      if (audioCheckResult.data[0].count !== audio_ids.length) {
        throw new Error('部分音频不存在');
      }

      const insertSql = `
        INSERT INTO play_history (
          openid, audio_ids, played_at, play_type, timer_minutes,
          volume_config, speed_config, device_info, play_duration,
          is_completed, combination_source
        ) VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const result = await query(insertSql, [
        openid,
        JSON.stringify(audio_ids),
        play_type,
        timer_minutes,
        volume_config ? JSON.stringify(volume_config) : null,
        speed_config ? JSON.stringify(speed_config) : null,
        device_info,
        play_duration,
        is_completed ? 1 : 0,
        combination_source
      ]);

      if (!result.success) {
        throw new Error(result.error);
      }

      return {
        success: true,
        data: {
          history_id: result.insertId,
          audio_ids: audio_ids,
          play_type: play_type
        },
        message: '播放记录添加成功'
      };

    } catch (error) {
      console.error('添加播放记录失败:', error);
      return {
        success: false,
        message: '添加播放记录失败',
        error: error.message
      };
    }
  }

  /**
   * 清空用户的播放历史
   */
  static async clearPlayHistory(openid) {
    try {
      const sql = `
        DELETE FROM play_history 
        WHERE openid = ?
      `;
      
      const result = await query(sql, [openid]);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      return {
        success: true,
        message: '播放历史已清空'
      };
    } catch (error) {
      console.error('清空播放历史失败:', error);
      return {
        success: false,
        message: '清空播放历史失败',
        error: error.message
      };
    }
  }

  /**
   * 获取用户最近播放的音频
   */
  static async getRecentPlayed(openid, limit = 10) {
    try {
      const result = await this.getUserPlayHistory(openid, { limit, offset: 0 });
      
      if (!result.success) {
        throw new Error(result.message || result.error);
      }

      // 提取最近播放的音频列表
      const recentAudios = [];
      const seenAudioIds = new Set();

      result.data.forEach(history => {
        history.audios.forEach(audio => {
          if (!seenAudioIds.has(audio.audio_id)) {
            seenAudioIds.add(audio.audio_id);
            recentAudios.push({
              ...audio,
              last_played: history.played_at,
              play_type: history.play_type
            });
          }
        });
      });

      return {
        success: true,
        data: recentAudios.slice(0, limit)
      };
    } catch (error) {
      console.error('获取最近播放失败:', error);
      return {
        success: false,
        message: '获取最近播放失败',
        error: error.message
      };
    }
  }

  /**
   * 获取用户播放统计
   */
  static async getUserPlayStats(openid, options = {}) {
    try {
      const { 
        period = 'all', // all, day, week, month, year
        start_date = null,
        end_date = null
      } = options;

      // 构建时间筛选条件
      let dateCondition = '';
      let dateParams = [];

      if (start_date && end_date) {
        dateCondition = 'AND ph.played_at BETWEEN ? AND ?';
        dateParams = [start_date, end_date];
      } else if (period !== 'all') {
        const dateRanges = {
          day: 'INTERVAL 1 DAY',
          week: 'INTERVAL 7 DAY',
          month: 'INTERVAL 1 MONTH',
          year: 'INTERVAL 1 YEAR'
        };
        
        if (dateRanges[period]) {
          dateCondition = 'AND ph.played_at >= DATE_SUB(NOW(), ?)';
          dateParams = [dateRanges[period]];
        }
      }

      // 1. 总播放统计
      const totalStatsSql = `
        SELECT 
          COUNT(*) as total_plays,
          COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(ph.audio_ids, '$[0]'))) as unique_audio_count,
          SUM(ph.play_duration) as total_play_duration,
          AVG(ph.play_duration) as avg_play_duration,
          COUNT(DISTINCT DATE(ph.played_at)) as active_days
        FROM play_history ph
        WHERE ph.openid = ? AND ph.is_completed = 1
        ${dateCondition}
      `;

      const totalStatsResult = await query(totalStatsSql, [openid, ...dateParams]);

      if (!totalStatsResult.success) {
        throw new Error(totalStatsResult.error);
      }

      // 2. 播放类型统计
      const typeStatsSql = `
        SELECT 
          ph.play_type,
          COUNT(*) as play_count,
          SUM(ph.play_duration) as total_duration
        FROM play_history ph
        WHERE ph.openid = ? AND ph.is_completed = 1
        ${dateCondition}
        GROUP BY ph.play_type
      `;

      const typeStatsResult = await query(typeStatsSql, [openid, ...dateParams]);

      // 3. 最常播放的音频
      const topAudiosSql = `
        SELECT 
          audio_id,
          COUNT(*) as play_count,
          SUM(play_duration) as total_duration
        FROM (
          SELECT 
            ph.openid,
            JSON_UNQUOTE(JSON_EXTRACT(ph.audio_ids, '$[0]')) as audio_id,
            ph.play_duration
          FROM play_history ph
          WHERE ph.openid = ? AND ph.is_completed = 1 AND ph.play_type = 'single'
          ${dateCondition}
          
          UNION ALL
          
          SELECT 
            ph.openid,
            JSON_UNQUOTE(JSON_EXTRACT(ph.audio_ids, CONCAT('$[', idx.value, ']'))) as audio_id,
            ph.play_duration
          FROM play_history ph
          JOIN JSON_TABLE(
            JSON_KEYS(ph.volume_config),
            '$[*]' COLUMNS(value INT PATH '$')
          ) idx
          WHERE ph.openid = ? AND ph.is_completed = 1 AND ph.play_type = 'combination'
          ${dateCondition}
        ) as audio_plays
        GROUP BY audio_id
        ORDER BY play_count DESC, total_duration DESC
        LIMIT 10
      `;

      const topAudiosResult = await query(topAudiosSql, [openid, ...dateParams, openid, ...dateParams]);

      // 4. 时间段分布统计
      const timeDistributionSql = `
        SELECT 
          HOUR(ph.played_at) as hour_of_day,
          COUNT(*) as play_count
        FROM play_history ph
        WHERE ph.openid = ? AND ph.is_completed = 1
        ${dateCondition}
        GROUP BY HOUR(ph.played_at)
        ORDER BY hour_of_day
      `;

      const timeDistributionResult = await query(timeDistributionSql, [openid, ...dateParams]);

      // 5. 设备使用统计
      const deviceStatsSql = `
        SELECT 
          ph.device_info,
          COUNT(*) as play_count,
          SUM(ph.play_duration) as total_duration
        FROM play_history ph
        WHERE ph.openid = ? AND ph.is_completed = 1
        ${dateCondition}
        GROUP BY ph.device_info
        ORDER BY play_count DESC
      `;

      const deviceStatsResult = await query(deviceStatsSql, [openid, ...dateParams]);

      const stats = {
        total_plays: parseInt(totalStatsResult.data[0]?.total_plays || 0),
        unique_audio_count: parseInt(totalStatsResult.data[0]?.unique_audio_count || 0),
        total_play_duration: parseInt(totalStatsResult.data[0]?.total_play_duration || 0),
        avg_play_duration: parseInt(totalStatsResult.data[0]?.avg_play_duration || 0),
        active_days: parseInt(totalStatsResult.data[0]?.active_days || 0),
        play_type_stats: typeStatsResult.data || [],
        top_audios: topAudiosResult.data || [],
        time_distribution: timeDistributionResult.data || [],
        device_stats: deviceStatsResult.data || [],
        period: period,
        start_date: start_date,
        end_date: end_date
      };

      return {
        success: true,
        data: stats
      };

    } catch (error) {
      console.error('获取播放统计失败:', error);
      return {
        success: false,
        message: '获取播放统计失败',
        error: error.message
      };
    }
  }

  /**
   * 获取音频播放趋势分析
   */
  static async getPlayTrends(openid, options = {}) {
    try {
      const { 
        group_by = 'day', // day, week, month
        period = 'month'  // week, month, year
      } = options;

      const dateRanges = {
        week: 'INTERVAL 7 DAY',
        month: 'INTERVAL 1 MONTH',
        year: 'INTERVAL 1 YEAR'
      };

      const dateCondition = 'AND ph.played_at >= DATE_SUB(NOW(), ?)';
      const dateParam = dateRanges[period] || dateRanges.month;

      let dateFormat = '';
      let groupByClause = '';

      switch (group_by) {
        case 'day':
          dateFormat = '%Y-%m-%d';
          groupByClause = 'DATE(ph.played_at)';
          break;
        case 'week':
          dateFormat = '%Y-%u';
          groupByClause = 'YEARWEEK(ph.played_at)';
          break;
        case 'month':
          dateFormat = '%Y-%m';
          groupByClause = 'DATE_FORMAT(ph.played_at, "%Y-%m")';
          break;
        default:
          dateFormat = '%Y-%m-%d';
          groupByClause = 'DATE(ph.played_at)';
      }

      const trendsSql = `
        SELECT 
          DATE_FORMAT(ph.played_at, ?) as date_group,
          ${groupByClause} as group_key,
          COUNT(*) as play_count,
          SUM(ph.play_duration) as total_duration,
          COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(ph.audio_ids, '$[0]'))) as unique_audio_count
        FROM play_history ph
        WHERE ph.openid = ? AND ph.is_completed = 1
        ${dateCondition}
        GROUP BY group_key
        ORDER BY group_key
      `;

      const trendsResult = await query(trendsSql, [dateFormat, openid, dateParam]);

      if (!trendsResult.success) {
        throw new Error(trendsResult.error);
      }

      return {
        success: true,
        data: {
          trends: trendsResult.data,
          group_by: group_by,
          period: period
        }
      };

    } catch (error) {
      console.error('获取播放趋势失败:', error);
      return {
        success: false,
        message: '获取播放趋势失败',
        error: error.message
      };
    }
  }

  /**
   * 获取用户偏好分析
   */
  static async getUserPreferences(openid) {
    try {
      // 1. 最喜欢的音频类型
      const typePreferencesSql = `
        SELECT 
          a.type,
          COUNT(*) as play_count,
          SUM(ph.play_duration) as total_duration
        FROM play_history ph
        JOIN audios a ON JSON_UNQUOTE(JSON_EXTRACT(ph.audio_ids, '$[0]')) = a.audio_id
        WHERE ph.openid = ? AND ph.is_completed = 1
        GROUP BY a.type
        ORDER BY play_count DESC
        LIMIT 5
      `;

      const typePreferencesResult = await query(typePreferencesSql, [openid]);

      // 2. 最喜欢的播放时间段
      const timePreferencesSql = `
        SELECT 
          CASE 
            WHEN HOUR(ph.played_at) BETWEEN 6 AND 12 THEN 'morning'
            WHEN HOUR(ph.played_at) BETWEEN 13 AND 18 THEN 'afternoon'
            WHEN HOUR(ph.played_at) BETWEEN 19 AND 23 THEN 'evening'
            ELSE 'night'
          END as time_period,
          COUNT(*) as play_count
        FROM play_history ph
        WHERE ph.openid = ? AND ph.is_completed = 1
        GROUP BY time_period
        ORDER BY play_count DESC
      `;

      const timePreferencesResult = await query(timePreferencesSql, [openid]);

      // 3. 播放习惯分析
      const habitAnalysisSql = `
        SELECT 
          AVG(ph.play_duration) as avg_session_length,
          MAX(ph.play_duration) as max_session_length,
          MIN(ph.play_duration) as min_session_length,
          COUNT(DISTINCT DATE(ph.played_at)) / NULLIF(DATEDIFF(MAX(ph.played_at), MIN(ph.played_at)) + 1, 0) as avg_plays_per_day
        FROM play_history ph
        WHERE ph.openid = ? AND ph.is_completed = 1
      `;

      const habitAnalysisResult = await query(habitAnalysisSql, [openid]);

      const preferences = {
        favorite_types: typePreferencesResult.data || [],
        preferred_times: timePreferencesResult.data || [],
        play_habits: habitAnalysisResult.data[0] || {},
        last_updated: new Date().toISOString()
      };

      return {
        success: true,
        data: preferences
      };

    } catch (error) {
      console.error('获取用户偏好失败:', error);
      return {
        success: false,
        message: '获取用户偏好失败',
        error: error.message
      };
    }
  }

  /**
   * 添加组合播放记录（统一的组合播放接口）
   */
  static async addCombinationPlayRecord(openid, playData) {
    try {
      const {
        combination_id = null, // 摇骰子组合ID
        audio_ids,           // 组合中的所有音频ID（3个或更多）
        selected_audio_ids,  // 用户选择的音频ID（1-3个）
        play_mode = 'parallel', // 播放模式
        timer_minutes = 0,   // 定时分钟数
        volume_config = null, // 音量配置
        device_info = 'unknown', // 设备信息
        play_duration = 0,   // 播放时长
        is_completed = true, // 是否完成
        combination_source = 'white_noise' // 组合来源
      } = playData;

      // 验证参数
      if (!Array.isArray(audio_ids) || audio_ids.length < 3) {
        throw new Error('音频组合必须包含至少3个音频');
      }

      if (!Array.isArray(selected_audio_ids) || selected_audio_ids.length === 0 || selected_audio_ids.length > 3) {
        throw new Error('已选音频数量必须在1-3个之间');
      }

      // 构建音量配置（基于选中的音频）
      let finalVolumeConfig = volume_config || {};
      selected_audio_ids.forEach(audioId => {
        if (!finalVolumeConfig[audioId]) {
          finalVolumeConfig[audioId] = 0.7; // 默认音量
        }
      });

      // 插入播放历史记录
      // 对于组合播放，audio_id字段使用选中的第一个音频ID
      const firstSelectedId = Array.isArray(selected_audio_ids) && selected_audio_ids.length > 0 
        ? selected_audio_ids[0] 
        : (Array.isArray(audio_ids) && audio_ids.length > 0 ? audio_ids[0] : null);
      
      const insertSql = `
        INSERT INTO play_history (
          openid, audio_id, combination_id, audio_ids, selected_audio_ids, played_at, 
          play_type, play_mode, timer_minutes, volume_config, device_info, 
          play_duration, is_completed, combination_source
        ) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const result = await query(insertSql, [
        openid,
        firstSelectedId,
        combination_id,
        JSON.stringify(audio_ids),
        JSON.stringify(selected_audio_ids),
        'combination',
        play_mode,
        timer_minutes,
        JSON.stringify(finalVolumeConfig),
        device_info,
        play_duration,
        is_completed ? 1 : 0,
        combination_source
      ]);

      if (!result.success) {
        throw new Error(result.error);
      }

      return {
        success: true,
        data: {
          history_id: result.insertId,
          combination_id: combination_id,
          audio_ids: audio_ids,
          selected_audio_ids: selected_audio_ids,
          play_mode: play_mode,
          volume_config: finalVolumeConfig
        },
        message: '组合播放记录成功'
      };

    } catch (error) {
      console.error('添加组合播放记录失败:', error);
      return {
        success: false,
        message: '添加组合播放记录失败',
        error: error.message
      };
    }
  }

  /**
   * 获取用户组合播放历史
   */
  static async getUserCombinationHistory(openid, options = {}) {
    try {
      const { limit = 20, offset = 0 } = options;

      // 根据实际的数据库表结构查询播放历史
      const sql = `
        SELECT 
          ph.history_id, ph.openid, ph.audio_id, ph.played_at, ph.position_seconds,
          ph.device_info
        FROM play_history ph
        WHERE ph.openid = ?
        ORDER BY ph.played_at DESC
        LIMIT ? OFFSET ?
      `;

      const result = await query(sql, [openid, parseInt(limit), parseInt(offset)]);

      if (!result.success) {
        throw new Error(result.error);
      }

      // 获取音频详细信息
      const combinationHistories = await Promise.all(
        result.data.map(async (history) => {
          // 获取音频详细信息
          const audioResult = await query(`
            SELECT 
              a.audio_id, a.title, a.audio_url, a.duration_seconds, a.cover_url,
              GROUP_CONCAT(DISTINCT ac.name) as categories
            FROM audios a
            LEFT JOIN audio_category_mapping acm ON a.audio_id = acm.audio_id
            LEFT JOIN audio_categories ac ON acm.category_id = ac.category_id
            WHERE a.audio_id = ?
            GROUP BY a.audio_id
          `, [history.audio_id]);

          const audio = audioResult.data && audioResult.data.length > 0 
            ? audioResult.data[0] 
            : null;

          if (!audio) {
            return null; // 音频不存在，跳过
          }

          return {
            history_id: history.history_id,
            openid: history.openid,
            audio_id: parseInt(history.audio_id),
            played_at: history.played_at,
            position_seconds: history.position_seconds || 0,
            device_info: history.device_info || 'unknown',
            play_type: 'single', // 当前数据库结构只支持单音频播放
            audio: {
              audio_id: parseInt(audio.audio_id),
              title: audio.title,
              audio_url: audio.audio_url,
              duration_seconds: audio.duration_seconds,
              cover_url: audio.cover_url,
              categories: audio.categories ? audio.categories.split(',') : []
            }
          };
        })
      );

      // 过滤掉null值
      const validHistories = combinationHistories.filter(history => history !== null);

      // 获取总数
      const countSql = `
        SELECT COUNT(*) as total_count
        FROM play_history 
        WHERE openid = ?
      `;
      
      const countResult = await query(countSql, [openid]);

      return {
        success: true,
        data: validHistories,
        total: countResult.data[0]?.total_count || 0
      };

    } catch (error) {
      console.error('获取播放历史失败:', error);
      return {
        success: false,
        message: '获取播放历史失败',
        error: error.message
      };
    }
  }

  /**
   * 记录播放（兼容旧接口）
   */
  static async recordPlay(playData) {
    // 如果是组合播放，使用新方法
    if (playData.play_type === 'combination') {
      return await this.recordCombinationPlay(playData.openid, playData);
    }
    
    // 否则使用旧方法
    return await this.addPlayRecord(playData.openid, playData);
  }

}

module.exports = PlayHistory;