const { query } = require('../config');

class AudioCategory {
  // 获取所有音频分类
  static async getCategories() {
    try {
      const sql = `
        SELECT 
          category_id ,
          name,
          parent_id,
          sort_order,
          created_at
        FROM 
          audio_categories
        ORDER BY 
          sort_order DESC, 
          created_at DESC
      `;
      
      const result = await query(sql);
      
      if (!result.success) throw new Error(result.error);
      return result.data;
    } catch (error) {
      console.error('获取音频分类失败:', error);
      throw error;
    }
  }

  // 根据ID获取分类详情
  static async getById(id) {
    try {
      const sql = `
        SELECT category_id, name, created_at 
        FROM audio_categories 
        WHERE category_id = ? 
      `;
      
      const result = await query(sql, [category_id]);
      
      return {
        success: true,
        data: result.data && result.data.length > 0 ? result.data[0] : null
      };
    } catch (error) {
      console.error('获取音频分类详情失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }



}

module.exports = AudioCategory;