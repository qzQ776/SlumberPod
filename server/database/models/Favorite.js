const { query } = require('../config');

class Favorite {
  // 获取用户的收藏列表
  static async getUserFavorites(openid, options = {}) {
    try {
      const { limit = 20, offset = 0 } = options;
      
      const sql = `
        SELECT 
          f.*, 
          a.audio_id, a.title, a.description, a.cover_url, a.audio_url, 
          a.duration_seconds, a.is_public, a.type, a.is_user_creation, a.is_free,
          a.play_count, a.favorite_count, a.comment_count,
          a.created_at, a.updated_at,
          u.nickname as owner_nickname, u.avatar_url as owner_avatar
        FROM favorites f
        JOIN audios a ON f.audio_id = a.audio_id
        LEFT JOIN users u ON a.owner_openid = u.openid
        WHERE f.openid = ?
        ORDER BY f.created_at DESC
        LIMIT ${parseInt(limit) || 20} OFFSET ${parseInt(offset) || 0}
      `;
      
      const result = await query(sql, [openid]);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }
      
      // 查询总数
      const countSql = 'SELECT COUNT(*) as total FROM favorites WHERE openid = ?';
      const countResult = await query(countSql, [openid]);
      
      if (!countResult.success) {
        return { success: false, error: countResult.error };
      }
      
      return {
        success: true,
        data: result.data || [],
        total: countResult.data[0].total || 0
      };
    } catch (error) {
      console.error('获取用户收藏失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 添加收藏
  static async addFavorite(openid, audioId) {
    try {
      // 检查是否已经收藏
      const checkSql = `
        SELECT id FROM favorites 
        WHERE openid = ? AND audio_id = ?
      `;
      
      const checkResult = await query(checkSql, [openid, audioId]);
      
      if (checkResult.data && checkResult.data.length > 0) {
        return {
          success: false,
          error: '已经收藏过该音频'
        };
      }
      
      // 新增收藏
      const insertSql = `
        INSERT INTO favorites (openid, audio_id)
        VALUES (?, ?)
      `;
      
      const result = await query(insertSql, [openid, audioId]);
      
      return {
        success: true,
        message: '收藏成功'
      };
    } catch (error) {
      console.error('添加收藏失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 取消收藏
  static async removeFavorite(openid, audioId) {
    try {
      const sql = `
        DELETE FROM favorites 
        WHERE openid = ? AND audio_id = ?
      `;
      
      const result = await query(sql, [openid, audioId]);
      
      if (result.affectedRows > 0) {
        return {
          success: true,
          message: '取消收藏成功'
        };
      } else {
        return {
          success: false,
          error: '收藏记录不存在'
        };
      }
    } catch (error) {
      console.error('取消收藏失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 检查是否已收藏
  static async isFavorited(openid, audioId) {
    try {
      const sql = `
        SELECT id FROM favorites 
        WHERE openid = ? AND audio_id = ?
      `;
      
      const result = await query(sql, [openid, audioId]);
      
      return {
        success: true,
        isFavorited: result.data && result.data.length > 0
      };
    } catch (error) {
      console.error('检查收藏状态失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = Favorite;