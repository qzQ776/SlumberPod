const { query } = require('../config');

class AudioCategory {
  // 获取所有音频分类
  static async getCategories() {
    try {
      const sql = `
        SELECT 
          category_id,
          name,
          parent_id,
          sort_order,
          is_free,
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
        SELECT category_id, name, parent_id, sort_order, is_free, created_at 
        FROM audio_categories 
        WHERE category_id = ? 
      `;
      
      const result = await query(sql, [id]);
      
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

  // 创建新分类
  static async create(categoryData) {
    try {
      const sql = `
        INSERT INTO audio_categories (name, parent_id, sort_order, is_free)
        VALUES (?, ?, ?, ?)
      `;
      
      const result = await query(sql, [
        categoryData.name,
        categoryData.parent_id || 0,
        categoryData.sort_order || 0,
        categoryData.is_free || 0
      ]);
      
      if (!result.success) throw new Error(result.error);
      
      return {
        success: true,
        data: {
          category_id: result.insertId,
          ...categoryData
        }
      };
    } catch (error) {
      console.error('创建音频分类失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 更新分类
  static async update(id, updateData) {
    try {
      const fields = [];
      const values = [];
      
      // 动态构建更新字段
      if (updateData.name !== undefined) {
        fields.push('name = ?');
        values.push(updateData.name);
      }
      if (updateData.parent_id !== undefined) {
        fields.push('parent_id = ?');
        values.push(updateData.parent_id);
      }
      if (updateData.sort_order !== undefined) {
        fields.push('sort_order = ?');
        values.push(updateData.sort_order);
      }
      if (updateData.is_free !== undefined) {
        fields.push('is_free = ?');
        values.push(updateData.is_free);
      }
      
      if (fields.length === 0) {
        throw new Error('没有要更新的字段');
      }
      
      const sql = `
        UPDATE audio_categories 
        SET ${fields.join(', ')}
        WHERE category_id = ?
      `;
      
      values.push(id);
      const result = await query(sql, values);
      
      if (!result.success) throw new Error(result.error);
      
      return {
        success: true,
        data: { category_id: id, ...updateData }
      };
    } catch (error) {
      console.error('更新音频分类失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 删除分类
  static async delete(id) {
    try {
      // 检查是否有子分类
      const childrenResult = await query(
        'SELECT COUNT(*) as count FROM audio_categories WHERE parent_id = ?',
        [id]
      );
      
      if (childrenResult.success && childrenResult.data[0].count > 0) {
        throw new Error('存在子分类，无法删除');
      }
      
      // 检查是否有关联的音频
      const audioResult = await query(
        'SELECT COUNT(*) as count FROM audio_category_mapping WHERE category_id = ?',
        [id]
      );
      
      if (audioResult.success && audioResult.data[0].count > 0) {
        throw new Error('存在关联的音频，无法删除');
      }
      
      const result = await query('DELETE FROM audio_categories WHERE category_id = ?', [id]);
      
      if (!result.success) throw new Error(result.error);
      
      return {
        success: true,
        data: { category_id: id, deleted: true }
      };
    } catch (error) {
      console.error('删除音频分类失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 获取分类树结构
  static async getCategoryTree() {
    try {
      const categories = await this.getCategories();
      
      // 构建父子关系映射
      const categoryMap = new Map();
      const rootCategories = [];
      
      categories.forEach(category => {
        categoryMap.set(category.category_id, { ...category, children: [] });
      });
      
      categories.forEach(category => {
        if (category.parent_id === 0) {
          rootCategories.push(categoryMap.get(category.category_id));
        } else {
          const parent = categoryMap.get(category.parent_id);
          if (parent) {
            parent.children.push(categoryMap.get(category.category_id));
          }
        }
      });
      
      return {
        success: true,
        data: rootCategories
      };
    } catch (error) {
      console.error('获取分类树失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

}

module.exports = AudioCategory;