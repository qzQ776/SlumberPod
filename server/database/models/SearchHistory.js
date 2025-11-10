const { query } = require('../config');

class SearchHistory {
  // 记录用户搜索行为（同时更新热门搜索）
  static async addSearch(openid, keyword) {
    try {
      // 处理用户搜索历史（去重+更新时间）
      const checkUserSql = `SELECT id FROM search_history WHERE openid = ? AND keyword = ?`;
      const userResult = await query(checkUserSql, [openid, keyword]);
      
      if (userResult.data && userResult.data.length > 0) {
        await query(`UPDATE search_history SET updated_at = NOW() WHERE id = ?`, [userResult.data[0].id]);
      } else {
        await query(`
          INSERT INTO search_history (openid, keyword, created_at, updated_at) 
          VALUES (?, ?, NOW(), NOW())
        `, [openid, keyword]);
      }
      
      // 处理热门搜索（统计点击次数）
      const checkHotSql = `SELECT id FROM search_history WHERE openid IS NULL AND keyword = ?`;
      const hotResult = await query(checkHotSql, [keyword]);
      
      if (hotResult.data && hotResult.data.length > 0) {
        await query(`
          UPDATE search_history 
          SET search_count = search_count + 1, updated_at = NOW() 
          WHERE id = ?
        `, [hotResult.data[0].id]);
      } else {
        await query(`
          INSERT INTO search_history (keyword, search_count, is_hot, created_at, updated_at) 
          VALUES (?, 1, 1, NOW(), NOW())
        `, [keyword]);
      }
      
      return { success: true, message: '搜索记录添加成功' };
    } catch (error) {
      console.error('添加搜索记录失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 获取热门搜索（TOP10）
  static async getHotSearches(limit = 10) {
    try {
      const sql = `
        SELECT keyword, search_count 
        FROM search_history 
        WHERE is_hot = 1 
        ORDER BY search_count DESC, updated_at DESC 
        LIMIT ?
      `;
      const result = await query(sql, [limit]);
      return { success: true, data: result.data || [] };
    } catch (error) {
      console.error('获取热门搜索失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 获取用户搜索历史
  static async getUserSearchHistory(openid, limit = 10) {
    try {
      const sql = `
        SELECT keyword, created_at 
        FROM search_history 
        WHERE openid = ? 
        ORDER BY updated_at DESC 
        LIMIT ?
      `;
      const result = await query(sql, [openid, limit]);
      return { success: true, data: result.data || [] };
    } catch (error) {
      console.error('获取用户搜索历史失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 清空用户搜索历史
  static async clearUserSearchHistory(openid) {
    try {
      await query(`DELETE FROM search_history WHERE openid = ?`, [openid]);
      return { success: true, message: '搜索历史已清空' };
    } catch (error) {
      console.error('清空用户搜索历史失败:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = SearchHistory;