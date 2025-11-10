const { query } = require('../config');

class PlayHistory {
  // 获取用户的播放历史
  static async getUserPlayHistory(openid, limit = 20, offset = 0) {
    try {
      const sql = `
        SELECT ph.*, a.title, a.audio_url, a.duration, a.cover_image, 
               ac.name as category_name
        FROM play_history ph
        JOIN audios a ON ph.audio_id = a.id
        LEFT JOIN audio_categories ac ON a.category_id = ac.id
        WHERE ph.openid = ?
        ORDER BY ph.last_played_at DESC
        LIMIT ? OFFSET ?
      `;
      
      const result = await query(sql, [openid, parseInt(limit) || 20, parseInt(offset) || 0]);
      
      return {
        success: true,
        data: result.data || [],
        total: result.data ? result.data.length : 0
      };
    } catch (error) {
      console.error('获取播放历史失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 添加播放记录
  static async addPlayRecord(openid, audioId, playDuration = 0) {
    try {
      // 检查是否已有记录
      const checkSql = `
        SELECT id, play_count FROM play_history 
        WHERE openid = ? AND audio_id = ?
      `;
      
      const checkResult = await query(checkSql, [openid, audioId]);
      
      if (checkResult.data && checkResult.data.length > 0) {
        // 更新现有记录
        const updateSql = `
          UPDATE play_history 
          SET play_count = play_count + 1, 
              last_played_at = NOW(),
              total_play_duration = total_play_duration + ?
          WHERE id = ?
        `;
        
        const updateResult = await query(updateSql, [playDuration, checkResult.data[0].id]);
        
        return {
          success: true,
          message: '播放记录更新成功'
        };
      } else {
        // 新增记录
        const insertSql = `
          INSERT INTO play_history (openid, audio_id, play_count, total_play_duration)
          VALUES (?, ?, 1, ?)
        `;
        
        const result = await query(insertSql, [openid, audioId, playDuration]);
        
        return {
          success: true,
          message: '播放记录添加成功'
        };
      }
    } catch (error) {
      console.error('添加播放记录失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 清空用户的播放历史
  static async clearPlayHistory(openid) {
    try {
      const sql = `
        DELETE FROM play_history 
        WHERE openid = ?
      `;
      
      const result = await query(sql, [openid]);
      
      return {
        success: true,
        message: '播放历史已清空'
      };
    } catch (error) {
      console.error('清空播放历史失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 获取用户最近播放的音频
  static async getRecentPlayed(openid, limit = 10) {
    try {
      const sql = `
        SELECT ph.*, a.title, a.audio_url, a.duration, a.cover_image, 
               ac.name as category_name
        FROM play_history ph
        JOIN audios a ON ph.audio_id = a.id
        LEFT JOIN audio_categories ac ON a.category_id = ac.id
        WHERE ph.openid = ?
        ORDER BY ph.last_played_at DESC
        LIMIT ?
      `;
      
      const result = await query(sql, [openid, parseInt(limit)]);
      
      return {
        success: true,
        data: result.data || []
      };
    } catch (error) {
      console.error('获取最近播放失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 获取用户播放统计
  static async getUserPlayStats(openid) {
    try {
      const sql = `
        SELECT 
          COUNT(DISTINCT audio_id) as total_audios_played,
          SUM(play_count) as total_play_count,
          SUM(total_play_duration) as total_play_duration
        FROM play_history 
        WHERE openid = ?
      `;
      
      const result = await query(sql, [openid]);
      
      return {
        success: true,
        data: result.data && result.data.length > 0 ? result.data[0] : null
      };
    } catch (error) {
      console.error('获取播放统计失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = PlayHistory;