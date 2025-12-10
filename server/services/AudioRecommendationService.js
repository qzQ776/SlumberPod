const { query } = require('../database/config');

/**
 * 音频推荐服务
 * 负责智能推荐和搜索优化
 */
class AudioRecommendationService {
  
  /**
   * 基于用户播放历史推荐音频
   */
  static async recommendBasedOnHistory(openid, limit = 10) {
    try {
      // 获取用户播放历史
      const historySql = `
        SELECT audio_id, COUNT(*) as play_count, MAX(created_at) as last_played
        FROM play_history 
        WHERE openid = ? 
        GROUP BY audio_id 
        ORDER BY play_count DESC, last_played DESC 
        LIMIT 20
      `;

      const historyResult = await query(historySql, [openid]);
      
      if (!historyResult.success || historyResult.data.length === 0) {
        // 如果没有播放历史，返回热门推荐
        return await this.getPopularRecommendations(limit);
      }

      const playedAudioIds = historyResult.data.map(item => item.audio_id);
      
      // 基于相似音频推荐
      const similarAudioIds = await this.findSimilarAudio(playedAudioIds, limit);
      
      if (similarAudioIds.length === 0) {
        return await this.getPopularRecommendations(limit);
      }

      // 获取推荐音频的详细信息
      const audioSql = `
        SELECT 
          a.audio_id, a.owner_openid, a.title, a.description, a.cover_url, a.audio_url,
          a.duration_seconds, a.is_public, a.type, a.is_user_creation, a.is_free,
          a.play_count, a.favorite_count, a.created_at, a.updated_at,
          ac.name as category_name
        FROM audios a
        LEFT JOIN audio_categories ac ON a.category_id = ac.id
        WHERE a.id IN (${similarAudioIds.map(() => '?').join(',')})
        AND a.status = 'active'
        ORDER BY a.created_at DESC
        LIMIT ?
      `;

      const audioResult = await query(audioSql, [...similarAudioIds, limit]);
      
      if (!audioResult.success) {
        return { success: false, error: '获取音频信息失败' };
      }

      return {
        success: true,
        data: {
          recommendations: audioResult.data,
          recommendation_type: 'history_based',
          total_count: audioResult.data.length
        }
      };
    } catch (error) {
      console.error('基于历史推荐音频失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 基于相似音频推荐
   */
  static async findSimilarAudio(audioIds, limit = 10) {
    try {
      if (!audioIds || audioIds.length === 0) {
        return [];
      }

      // 获取音频的标签和分类
      const audioInfoSql = `
        SELECT a.id, a.category_id, a.tags, a.duration, a.mood
        FROM audios a
        WHERE a.id IN (${audioIds.map(() => '?').join(',')})
        AND a.status = 'active'
      `;

      const audioInfoResult = await query(audioInfoSql, audioIds);
      
      if (!audioInfoResult.success || audioInfoResult.data.length === 0) {
        return [];
      }

      // 提取共同的标签和分类
      const categories = [...new Set(audioInfoResult.data.map(a => a.category_id))];
      const allTags = audioInfoResult.data.flatMap(a => 
        a.tags ? JSON.parse(a.tags) : []
      );
      
      // 统计标签频率
      const tagFrequency = allTags.reduce((acc, tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
      }, {});

      // 获取热门标签
      const popularTags = Object.entries(tagFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([tag]) => tag);

      // 查询相似音频
      const similarSql = `
        SELECT DISTINCT a.id
        FROM audios a
        WHERE a.status = 'active'
        AND a.id NOT IN (${audioIds.map(() => '?').join(',')})
        AND (
          a.category_id IN (${categories.map(() => '?').join(',')})
          OR JSON_OVERLAPS(a.tags, ?)
          OR a.mood IN (${audioInfoResult.data.map(() => '?').join(',')})
        )
        ORDER BY 
          CASE WHEN a.category_id IN (${categories.map(() => '?').join(',')}) THEN 1 ELSE 0 END DESC,
          a.play_count DESC,
          a.created_at DESC
        LIMIT ?
      `;

      const params = [
        ...audioIds,
        ...categories,
        JSON.stringify(popularTags),
        ...audioInfoResult.data.map(a => a.mood),
        ...categories,
        limit
      ];

      const similarResult = await query(similarSql, params);
      
      if (!similarResult.success) {
        return [];
      }

      return similarResult.data.map(item => item.id);
    } catch (error) {
      console.error('查找相似音频失败:', error);
      return [];
    }
  }

  /**
   * 获取热门推荐
   */
  static async getPopularRecommendations(limit = 10) {
    try {
      const sql = `
        SELECT 
          a.audio_id, a.owner_openid, a.title, a.description, a.cover_url, a.audio_url,
          a.duration_seconds, a.is_public, a.type, a.is_user_creation, a.is_free,
          a.play_count, a.favorite_count, a.created_at, a.updated_at,
          ac.name as category_name
        FROM audios a
        LEFT JOIN audio_categories ac ON a.category_id = ac.id
        WHERE a.status = 'active'
        ORDER BY a.created_at DESC, a.like_count DESC
        LIMIT ?
      `;

      const result = await query(sql, [limit]);
      
      if (!result.success) {
        return { success: false, error: '获取热门推荐失败' };
      }

      return {
        success: true,
        data: {
          recommendations: result.data,
          recommendation_type: 'popular',
          total_count: result.data.length
        }
      };
    } catch (error) {
      console.error('获取热门推荐失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 基于时间推荐（早中晚不同推荐）
   */
  static async recommendByTimeOfDay(openid, limit = 5) {
    try {
      const hour = new Date().getHours();
      let timeOfDay, moodFilters;

      if (hour >= 5 && hour < 12) {
        timeOfDay = 'morning';
        moodFilters = ['energetic', 'calm', 'refreshing'];
      } else if (hour >= 12 && hour < 18) {
        timeOfDay = 'afternoon';
        moodFilters = ['relaxing', 'focused', 'peaceful'];
      } else {
        timeOfDay = 'evening';
        moodFilters = ['sleepy', 'calm', 'soothing'];
      }

      const sql = `
        SELECT 
          a.audio_id, a.owner_openid, a.title, a.description, a.cover_url, a.audio_url,
          a.duration_seconds, a.is_public, a.type, a.is_user_creation, a.is_free,
          a.play_count, a.favorite_count, a.created_at, a.updated_at,
          ac.name as category_name
        FROM audios a
        LEFT JOIN audio_categories ac ON a.category_id = ac.id
        WHERE a.status = 'active'
        AND a.mood IN (${moodFilters.map(() => '?').join(',')})
        ORDER BY a.created_at DESC
        LIMIT ?
      `;

      const result = await query(sql, [...moodFilters, limit]);
      
      if (!result.success) {
        // 如果失败，返回热门推荐
        return await this.getPopularRecommendations(limit);
      }

      return {
        success: true,
        data: {
          recommendations: result.data,
          recommendation_type: 'time_based',
          time_of_day: timeOfDay,
          total_count: result.data.length
        }
      };
    } catch (error) {
      console.error('基于时间推荐音频失败:', error);
      return await this.getPopularRecommendations(limit);
    }
  }

  /**
   * 基于用户偏好推荐
   */
  static async recommendBasedOnPreferences(openid, preferences = {}, limit = 10) {
    try {
      const { 
        preferred_categories = [],
        preferred_moods = [],
        preferred_duration = null,
        exclude_played = true
      } = preferences;

      let sql = `
        SELECT a.*, ac.name as category_name
        FROM audios a
        LEFT JOIN audio_categories ac ON a.category_id = ac.id
        WHERE a.status = 'active'
      `;

      const params = [];

      // 添加分类过滤
      if (preferred_categories.length > 0) {
        sql += ` AND a.category_id IN (${preferred_categories.map(() => '?').join(',')})`;
        params.push(...preferred_categories);
      }

      // 添加心情过滤
      if (preferred_moods.length > 0) {
        sql += ` AND a.mood IN (${preferred_moods.map(() => '?').join(',')})`;
        params.push(...preferred_moods);
      }

      // 添加时长过滤
      if (preferred_duration) {
        if (preferred_duration === 'short') {
          sql += ' AND a.duration <= 300';
        } else if (preferred_duration === 'medium') {
          sql += ' AND a.duration > 300 AND a.duration <= 600';
        } else if (preferred_duration === 'long') {
          sql += ' AND a.duration > 600';
        }
      }

      // 排除已播放的音频
      if (exclude_played && openid) {
        sql += ` AND a.id NOT IN (
          SELECT DISTINCT audio_id FROM play_history WHERE openid = ?
        )`;
        params.push(openid);
      }

      sql += ` ORDER BY a.play_count DESC, a.like_count DESC LIMIT ?`;
      params.push(limit);

      const result = await query(sql, params);
      
      if (!result.success) {
        return { success: false, error: '基于偏好推荐失败' };
      }

      return {
        success: true,
        data: {
          recommendations: result.data,
          recommendation_type: 'preference_based',
          total_count: result.data.length
        }
      };
    } catch (error) {
      console.error('基于偏好推荐音频失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 智能搜索音频
   */
  static async smartSearch(queryString, filters = {}, limit = 20) {
    try {
      const { 
        category_id = null,
        mood = null,
        duration_min = null,
        duration_max = null,
        sort_by = 'relevance'
      } = filters;

      let sql = `
        SELECT a.*, ac.name as category_name,
        (
          CASE 
            WHEN a.title LIKE ? THEN 10
            WHEN a.description LIKE ? THEN 5
            WHEN JSON_SEARCH(a.tags, 'one', ?) IS NOT NULL THEN 8
            ELSE 1
          END
        ) as relevance_score
        FROM audios a
        LEFT JOIN audio_categories ac ON a.category_id = ac.id
        WHERE a.status = 'active'
        AND (
          a.title LIKE ? 
          OR a.description LIKE ? 
          OR JSON_SEARCH(a.tags, 'one', ?) IS NOT NULL
        )
      `;

      const searchPattern = `%${queryString}%`;
      const params = [
        searchPattern, searchPattern, queryString,
        searchPattern, searchPattern, queryString
      ];

      // 添加分类过滤
      if (category_id) {
        sql += ' AND a.category_id = ?';
        params.push(category_id);
      }

      // 添加心情过滤
      if (mood) {
        sql += ' AND a.mood = ?';
        params.push(mood);
      }

      // 添加时长过滤
      if (duration_min !== null) {
        sql += ' AND a.duration >= ?';
        params.push(duration_min);
      }

      if (duration_max !== null) {
        sql += ' AND a.duration <= ?';
        params.push(duration_max);
      }

      // 添加排序
      switch (sort_by) {
        case 'relevance':
          sql += ' ORDER BY relevance_score DESC, a.play_count DESC';
          break;
        case 'popular':
          sql += ' ORDER BY a.play_count DESC, a.like_count DESC';
          break;
        case 'recent':
          sql += ' ORDER BY a.created_at DESC';
          break;
        case 'duration':
          sql += ' ORDER BY a.duration DESC';
          break;
        default:
          sql += ' ORDER BY relevance_score DESC, a.play_count DESC';
      }

      sql += ' LIMIT ?';
      params.push(limit);

      const result = await query(sql, params);
      
      if (!result.success) {
        return { success: false, error: '搜索失败' };
      }

      return {
        success: true,
        data: {
          results: result.data,
          total_count: result.data.length,
          query: queryString,
          filters: filters
        }
      };
    } catch (error) {
      console.error('智能搜索音频失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取搜索建议
   */
  static async getSearchSuggestions(queryString, limit = 10) {
    try {
      if (!queryString || queryString.length < 2) {
        return { success: true, data: { suggestions: [] } };
      }

      const searchPattern = `%${queryString}%`;

      // 从标题获取建议
      const titleSql = `
        SELECT DISTINCT title as suggestion
        FROM audios 
        WHERE status = 'active' 
        AND title LIKE ? 
        LIMIT ?
      `;

      const titleResult = await query(titleSql, [searchPattern, Math.floor(limit/2)]);
      
      // 从标签获取建议
      const tagSql = `
        SELECT DISTINCT tag as suggestion
        FROM (
          SELECT JSON_UNQUOTE(JSON_EXTRACT(tags, CONCAT('$[', idx, ']'))) as tag
          FROM audios,
          JSON_TABLE(
            JSON_KEYS(tags),
            '$[*]' COLUMNS(idx FOR ORDINALITY)
          ) AS t
          WHERE status = 'active'
          AND JSON_SEARCH(tags, 'one', ?) IS NOT NULL
        ) as tag_table
        WHERE tag LIKE ?
        LIMIT ?
      `;

      const tagResult = await query(tagSql, [queryString, searchPattern, Math.floor(limit/2)]);

      const suggestions = [
        ...(titleResult.success ? titleResult.data.map(item => item.suggestion) : []),
        ...(tagResult.success ? tagResult.data.map(item => item.suggestion) : [])
      ];

      // 去重并限制数量
      const uniqueSuggestions = [...new Set(suggestions)].slice(0, limit);

      return {
        success: true,
        data: {
          suggestions: uniqueSuggestions,
          query: queryString
        }
      };
    } catch (error) {
      console.error('获取搜索建议失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 分析用户搜索模式
   */
  static async analyzeSearchPatterns(openid, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const sql = `
        SELECT 
          query,
          COUNT(*) as search_count,
          MAX(created_at) as last_searched
        FROM search_history 
        WHERE openid = ? AND created_at >= ?
        GROUP BY query
        ORDER BY search_count DESC, last_searched DESC
        LIMIT 20
      `;

      const result = await query(sql, [openid, startDate]);
      
      if (!result.success) {
        return { success: false, error: '分析搜索模式失败' };
      }

      return {
        success: true,
        data: {
          search_patterns: result.data,
          total_days: days,
          total_searches: result.data.reduce((sum, item) => sum + item.search_count, 0)
        }
      };
    } catch (error) {
      console.error('分析用户搜索模式失败:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = AudioRecommendationService;