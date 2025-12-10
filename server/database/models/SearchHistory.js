const { query } = require('../config');

class SearchHistory {
  /**
   * 添加搜索记录
   */
  static async addSearchRecord(openid, keyword, targetType = 'post') {
    try {
      if (!openid || !keyword || keyword.trim() === '') {
        return {
          success: false,
          error: '参数不完整'
        };
      }

      // 检查是否已存在相同搜索记录（避免重复）
      const checkSql = `
        SELECT id FROM search_history 
        WHERE openid = ? AND keyword = ? AND target_type = ?
        ORDER BY created_at DESC LIMIT 1
      `;
      
      const checkResult = await query(checkSql, [openid, keyword, targetType]);
      
      if (checkResult.success && checkResult.data && checkResult.data.length > 0) {
        // 更新现有记录的搜索时间
        const updateSql = `
          UPDATE search_history 
          SET updated_at = NOW()
          WHERE id = ?
        `;
        
        await query(updateSql, [checkResult.data[0].id]);
        
        return {
          success: true,
          message: '搜索记录已更新'
        };
      } else {
        // 插入新记录
        const insertSql = `
          INSERT INTO search_history (openid, keyword, target_type, search_count)
          VALUES (?, ?, ?, 1)
        `;
        
        const result = await query(insertSql, [openid, keyword, targetType]);
        
        if (result.success) {
          return {
            success: true,
            message: '搜索记录添加成功'
          };
        }
      }
      
      return {
        success: false,
        error: '添加搜索记录失败'
      };
    } catch (error) {
      console.error('添加搜索记录失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取用户搜索记录
   */
  static async getUserSearchHistory(openid, targetType = null, limit = 10) {
    try {
      if (!openid) {
        return {
          success: false,
          error: '用户ID不能为空'
        };
      }

      let sql = `
        SELECT id, openid, keyword, target_type, search_count, created_at, updated_at
        FROM search_history 
        WHERE openid = ?
      `;
      
      const params = [openid];
      
      if (targetType) {
        sql += ' AND target_type = ?';
        params.push(targetType);
      }
      
      sql += ' ORDER BY updated_at DESC LIMIT ?';
      params.push(parseInt(limit) || 10);
      
      const result = await query(sql, params);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }
      
      return {
        success: true,
        data: result.data || [],
        message: '获取搜索记录成功'
      };
    } catch (error) {
      console.error('获取搜索记录失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 删除搜索记录
   */
  static async deleteSearchRecord(openid, recordId) {
    try {
      if (!openid || !recordId) {
        return {
          success: false,
          error: '参数不完整'
        };
      }

      const sql = `
        DELETE FROM search_history 
        WHERE id = ? AND openid = ?
      `;
      
      const result = await query(sql, [recordId, openid]);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }
      
      return {
        success: true,
        message: '搜索记录删除成功'
      };
    } catch (error) {
      console.error('删除搜索记录失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 清空用户搜索记录
   */
  static async clearUserSearchHistory(openid, targetType = null) {
    try {
      if (!openid) {
        return {
          success: false,
          error: '用户ID不能为空'
        };
      }

      let sql = `
        DELETE FROM search_history 
        WHERE openid = ?
      `;
      
      const params = [openid];
      
      if (targetType) {
        sql += ' AND target_type = ?';
        params.push(targetType);
      }
      
      const result = await query(sql, params);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }
      
      return {
        success: true,
        message: '搜索记录清空成功'
      };
    } catch (error) {
      console.error('清空搜索记录失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取热门搜索关键词
   */
  static async getHotSearchKeywords(limit = 10, days = 7) {
    try {
      const sql = `
        SELECT keyword, COUNT(*) as search_count
        FROM search_history 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY keyword
        ORDER BY search_count DESC
        LIMIT ?
      `;
      
      const result = await query(sql, [days, parseInt(limit) || 10]);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }
      
      return {
        success: true,
        data: result.data || [],
        message: '获取热门搜索成功'
      };
    } catch (error) {
      console.error('获取热门搜索失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 添加搜索记录
   */
  static async addSearchRecord(openid, keyword, targetType = 'audio') {
    try {
      if (!openid || !keyword) {
        return {
          success: false,
          error: '参数不完整'
        };
      }

      const sql = `
        INSERT INTO search_history (openid, keyword, target_type, created_at)
        VALUES (?, ?, ?, NOW())
      `;
      
      const result = await query(sql, [openid, keyword, targetType]);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }
      
      return {
        success: true,
        message: '搜索记录添加成功'
      };
    } catch (error) {
      console.error('添加搜索记录失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取用户搜索历史
   */
  static async getUserSearchHistory(openid, targetType = 'audio', limit = 10) {
    try {
      if (!openid) {
        return {
          success: false,
          error: '用户ID不能为空'
        };
      }

      const sql = `
        SELECT id, keyword, target_type, created_at
        FROM search_history 
        WHERE openid = ? AND target_type = ?
        ORDER BY created_at DESC
        LIMIT ?
      `;
      
      const result = await query(sql, [openid, targetType, parseInt(limit) || 10]);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }
      
      return {
        success: true,
        data: result.data || [],
        message: '获取搜索记录成功'
      };
    } catch (error) {
      console.error('获取搜索记录失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取用户搜索记录（用于避免递归调用）
   */
  static async getUserSearchRecords(openid, targetType = 'audio', limit = 10) {
    try {
      if (!openid) {
        return {
          success: false,
          error: '用户ID不能为空'
        };
      }

      const sql = `
        SELECT id, keyword, target_type, created_at
        FROM search_history 
        WHERE openid = ? AND target_type = ?
        ORDER BY created_at DESC
        LIMIT ?
      `;
      
      const result = await query(sql, [openid, targetType, parseInt(limit) || 10]);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }
      
      return {
        success: true,
        data: result.data || [],
        message: '获取搜索记录成功'
      };
    } catch (error) {
      console.error('获取搜索记录失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 清空搜索历史（用于避免递归调用）
   */
  static async clearSearchHistory(openid, targetType = 'audio') {
    try {
      if (!openid) {
        return {
          success: false,
          error: '用户ID不能为空'
        };
      }

      let sql = `
        DELETE FROM search_history 
        WHERE openid = ?
      `;
      
      const params = [openid];
      
      if (targetType) {
        sql += ' AND target_type = ?';
        params.push(targetType);
      }
      
      const result = await query(sql, params);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }
      
      return {
        success: true,
        message: '搜索记录清空成功'
      };
    } catch (error) {
      console.error('清空搜索记录失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取用户搜索记录（用于避免递归调用）
   */
  static async getUserSearchRecords(openid, targetType = 'audio', limit = 10) {
    try {
      if (!openid) {
        return {
          success: false,
          error: '用户ID不能为空'
        };
      }

      const sql = `
        SELECT id, keyword, target_type, created_at
        FROM search_history 
        WHERE openid = ? AND target_type = ?
        ORDER BY created_at DESC
        LIMIT ?
      `;
      
      const result = await query(sql, [openid, targetType, parseInt(limit) || 10]);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }
      
      return {
        success: true,
        data: result.data || [],
        message: '获取搜索记录成功'
      };
    } catch (error) {
      console.error('获取搜索记录失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 清空搜索历史（用于避免递归调用）
   */
  static async clearSearchHistory(openid, targetType = 'audio') {
    try {
      if (!openid) {
        return {
          success: false,
          error: '用户ID不能为空'
        };
      }

      let sql = `
        DELETE FROM search_history 
        WHERE openid = ?
      `;
      
      const params = [openid];
      
      if (targetType) {
        sql += ' AND target_type = ?';
        params.push(targetType);
      }
      
      const result = await query(sql, params);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }
      
      return {
        success: true,
        message: '搜索记录清空成功'
      };
    } catch (error) {
      console.error('清空搜索记录失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取热门搜索（兼容旧接口）
   */
  static async getHotSearches(limit = 10) {
    return await this.getHotSearchKeywords(limit, 7);
  }

  /**
   * 添加搜索记录（兼容旧接口）
   */
  static async addSearch(openid, keyword) {
    return await this.addSearchRecord(openid, keyword, 'audio');
  }

  /**
   * 清空用户搜索历史（兼容旧接口）
   */
  static async clearUserSearchHistory(openid) {
    return await this.clearSearchHistory(openid, 'audio');
  }

  /**
   * 获取用户搜索历史（兼容旧接口）
   */
  static async getUserSearchHistory(openid, limit = 10) {
    return await this.getUserSearchRecords(openid, 'audio', limit);
  }
}

module.exports = SearchHistory;