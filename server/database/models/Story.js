const { query } = require('../config');

class Story {
  /**
   * 获取故事列表
   */
  static async getStories(options = {}) {
    try {
      const { 
        category = null,
        page = 1,
        limit = 20,
        orderBy = 'created_at',
        order = 'DESC'
      } = options;

      let sql = `
        SELECT
          s.story_id,
          s.title,
          s.content,
          s.excerpt,
          s.cover_url,
          s.audio_url,
          s.duration,
          s.category,
          s.tts_config,
          s.view_count,
          s.play_count,
          s.total_play_time,
          s.status,
          s.sort_order,
          s.created_at,
          s.updated_at
        FROM stories s
        WHERE s.status = 'published'
      `;

      // 确保参数构建的可靠性
      const params = [];

      // 添加分类筛选
      if (category && category !== 'all') {
        sql += ` AND s.category = ?`;
        params.push(String(category)); // 确保字符串类型
      }

      // 排序
      sql += ` ORDER BY s.${orderBy} ${order}`;

      // 分页
      const offset = (parseInt(page) - 1) * parseInt(limit);
      sql += ` LIMIT ? OFFSET ?`;
      
      // 确保参数类型正确：字符串、数字、数字
      params.push(parseInt(limit, 10), parseInt(offset, 10)); // 明确指定基数

      // 调试信息
      console.log('🔍 SQL调试信息:');
      console.log('SQL语句:', sql);
      console.log('参数:', params);
      console.log('参数数量:', params.length);
      console.log('占位符数量:', (sql.match(/\?/g) || []).length);

      const result = await query(sql, params);

      // 获取总数
      let countSql = `
        SELECT COUNT(*) as total 
        FROM stories 
        WHERE status = 'published'
      `;
      let countParams = [];

      if (category && category !== 'all') {
        countSql += ` AND category = ?`;
        countParams.push(category);
      }

      const countResult = await query(countSql, countParams);

      return {
        success: true,
        data: result.data || [],
        total: countResult.data[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        message: '获取故事列表成功'
      };
    } catch (error) {
      console.error('获取故事列表失败:', error);
      return {
        success: false,
        message: '获取故事列表失败',
        error: error.message
      };
    }
  }

  /**
   * 获取故事详情
   */
  static async getStoryDetail(storyId) {
    try {
      const sql = `
        SELECT 
          s.story_id as id,
          s.title,
          s.content,
          s.excerpt,
          s.cover_url as cover_image,
          s.audio_url,
          s.duration as duration_minutes,
          s.category,
          s.tts_config,
          s.view_count,
          s.play_count,
          s.total_play_time,
          s.status,
          s.sort_order,
          s.created_at,
          s.updated_at
        FROM stories s
        WHERE s.story_id = ? AND s.status = 'published'
      `;

      const result = await query(sql, [storyId]);

      if (!result.success || result.data.length === 0) {
        return {
          success: false,
          message: '故事不存在'
        };
      }

      // 增加浏览次数
      await query(
        'UPDATE stories SET view_count = view_count + 1 WHERE story_id = ?',
        [storyId]
      );

      return {
        success: true,
        data: result.data[0],
        message: '获取故事详情成功'
      };
    } catch (error) {
      console.error('获取故事详情失败:', error);
      return {
        success: false,
        message: '获取故事详情失败',
        error: error.message
      };
    }
  }

  /**
   * 生成TTS音频
   */
  static async generateTTS(storyId, options = {}) {
    try {
      const { voice = 'xiaoyun', speed = 1.0 } = options;

      // 获取故事内容
      const storyResult = await this.getStoryDetail(storyId);
      if (!storyResult.success) {
        return storyResult;
      }

      const story = storyResult.data;

      // 这里应该调用TTS服务API
      // 暂时返回模拟数据，实际应该集成百度、阿里云或腾讯云的TTS服务
      const ttsResult = await this.callTTSService(story.content, { voice, speed });

      if (!ttsResult.success) {
        return ttsResult;
      }

      // 更新故事的TTS信息
      await query(
        `UPDATE stories 
         SET audio_url = ?, duration = ?, tts_config = ?, updated_at = NOW() 
         WHERE story_id = ?`,
        [
          ttsResult.audioUrl,
          ttsResult.duration,
          JSON.stringify({ voice, speed }),
          storyId
        ]
      );

      return {
        success: true,
        data: {
          audioUrl: ttsResult.audioUrl,
          duration: ttsResult.duration,
          storyId: storyId
        },
        message: 'TTS生成成功'
      };
    } catch (error) {
      console.error('生成TTS失败:', error);
      return {
        success: false,
        message: '生成TTS失败',
        error: error.message
      };
    }
  }

  /**
   * 调用TTS服务（模拟实现）
   */
  static async callTTSService(text, options) {
    try {
      // 这里是模拟实现，实际应该调用真实的TTS API
      console.log('🔊 生成TTS音频:', { textLength: text.length, ...options });
      
      // 模拟TTS生成时间
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 模拟返回结果
      return {
        success: true,
        audioUrl: `https://example.com/tts/story_${Date.now()}.mp3`,
        duration: Math.ceil(text.length / 50), // 模拟音频长度
        message: 'TTS生成成功'
      };
    } catch (error) {
      return {
        success: false,
        message: 'TTS服务调用失败',
        error: error.message
      };
    }
  }

  /**
   * 记录播放行为
   */
  static async reportPlay(storyId, playData) {
    try {
      const { playDuration, device = 'unknown' } = playData;

      const sql = `
        INSERT INTO story_play_history 
        (story_id, play_duration, device, created_at)
        VALUES (?, ?, ?, NOW())
      `;

      const result = await query(sql, [storyId, playDuration, device]);

      // 更新故事的播放统计
      await query(
        `UPDATE stories 
         SET view_count = view_count + 1,
             updated_at = NOW()
         WHERE story_id = ?`,
        [storyId]
      );

      return {
        success: true,
        data: { id: result.data.insertId, storyId, playDuration, device },
        message: '播放记录上报成功'
      };
    } catch (error) {
      console.error('记录播放行为失败:', error);
      return {
        success: false,
        message: '记录播放行为失败',
        error: error.message
      };
    }
  }

  /**
   * 获取故事分类列表
   */
  static async getCategories() {
    try {
      const sql = `
        SELECT 
          category,
          COUNT(*) as count
        FROM stories 
        GROUP BY category
        ORDER BY count DESC
      `;

      const result = await query(sql);

      return {
        success: true,
        data: result.data || [],
        message: '获取分类列表成功'
      };
    } catch (error) {
      console.error('获取分类列表失败:', error);
      return {
        success: false,
        message: '获取分类列表失败',
        error: error.message
      };
    }
  }
}

module.exports = Story;