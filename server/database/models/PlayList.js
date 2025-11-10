const { query } = require('../config');

class Playlist {
  // 获取用户的所有播放列表
  static async getUserPlaylists(openid) {
    try {
      const sql = `
        SELECT p.* 
        FROM playlists p
        WHERE p.openid = ?
        ORDER BY p.created_at DESC
      `;
      const result = await query(sql, [openid]);
      return {
        success: true,
        data: result.data || []
      };
    } catch (error) {
      console.error('获取播放列表失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 获取播放列表的音频项（含音频详情）
  static async getPlaylistItems(playlistId) {
    try {
      const sql = `
        SELECT pi.*, a.title, a.audio_url, a.duration_seconds, a.cover_url
        FROM playlist_items pi
        JOIN audios a ON pi.audio_id = a.audio_id
        WHERE pi.playlist_id = ?
        ORDER BY pi.position ASC
      `;
      const result = await query(sql, [playlistId]);
      return {
        success: true,
        data: result.data || []
      };
    } catch (error) {
      console.error('获取播放列表项失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 添加音频到播放列表
  static async addToPlaylist(playlistId, audioId, position) {
    try {
      // 防止重复添加
      const checkSql = `
        SELECT id FROM playlist_items 
        WHERE playlist_id = ? AND audio_id = ?
      `;
      const checkResult = await query(checkSql, [playlistId, audioId]);
      if (checkResult.data && checkResult.data.length > 0) {
        return {
          success: false,
          error: '音频已在播放列表中'
        };
      }

      const sql = `
        INSERT INTO playlist_items (playlist_id, audio_id, position, added_at)
        VALUES (?, ?, ?, NOW())
      `;
      await query(sql, [playlistId, audioId, position]);
      return {
        success: true,
        message: '添加到播放列表成功'
      };
    } catch (error) {
      console.error('添加到播放列表失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 清空播放列表
  static async clearPlaylist(playlistId) {
    try {
      const sql = `
        DELETE FROM playlist_items 
        WHERE playlist_id = ?
      `;
      await query(sql, [playlistId]);
      return {
        success: true,
        message: '播放列表已清空'
      };
    } catch (error) {
      console.error('清空播放列表失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 从播放列表中移除音频
  static async removeFromPlaylist(playlistId, audioId) {
    try {
      const sql = `
        DELETE FROM playlist_items 
        WHERE playlist_id = ? AND audio_id = ?
      `;
      await query(sql, [playlistId, audioId]);
      return {
        success: true,
        message: '从播放列表中移除成功'
      };
    } catch (error) {
      console.error('从播放列表中移除失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 创建新的播放列表（支持默认列表）
  static async createPlaylist(openid, name, isDefault = false) {
    try {
      // 确保用户仅一个默认列表
      if (isDefault) {
        await query(`
          UPDATE playlists 
          SET is_default = 0 
          WHERE openid = ?
        `, [openid]);
      }

      const sql = `
        INSERT INTO playlists (openid, name, is_default, created_at)
        VALUES (?, ?, ?, NOW())
      `;
      const result = await query(sql, [openid, name, isDefault ? 1 : 0]);
      return {
        success: true,
        data: {
          playlistId: result.insertId
        },
        message: '播放列表创建成功'
      };
    } catch (error) {
      console.error('创建播放列表失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = Playlist;