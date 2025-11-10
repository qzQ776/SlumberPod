const { query } = require('../config');

/**
 * 音频模型类 - 处理所有音频相关操作
 */
class AudioModel {
  
 /**
 * 获取音频列表（支持：分类及其子分类、我的创作、免费音频、用户创作等场景）
 * @param {Object} options - 查询参数
 * @param {string|number} [options.category_id] - 分类ID（支持'my_creations'|'free'|具体ID）
 * @param {boolean} [options.user_creations] - 是否查询用户创作（true/false）
 * @param {string} [options.openid] - 用户openid（用于权限校验）
 * @param {number} [options.limit=20] - 每页数量
 * @param {number} [options.offset=0] - 分页偏移量
 * @param {string} [options.orderBy='play_count'] - 排序字段（如'play_count'|'created_at'）
 * @param {string} [options.order='DESC'] - 排序方向（'DESC'|'ASC'）
 * @returns {Promise<Array>} 音频列表数据
 */
async getAudios(options = {}) {
  try {
    // 解构参数并设置默认值
    const { 
      category_id, 
      user_creations, 
      openid, 
      limit = 20, 
      offset = 0, 
      orderBy = 'play_count', 
      order = 'DESC' 
    } = options;
    
    // 权限校验：我的创作/用户创作必须有openid
    if ((category_id === 'my_creations' || user_creations) && !openid) {
      throw new Error('用户未登录或登录状态已过期');
    }

    // 基础SQL：查询音频及关联的用户信息
    let sql = `
      SELECT 
        a.audio_id, a.title, a.description, a.cover_url, a.audio_url, 
        a.duration_seconds, a.is_public, a.type, a.is_user_creation, a.is_free,
        a.play_count, a.favorite_count, a.comment_count,
        a.created_at, a.updated_at,
        u.nickname as owner_nickname, u.avatar_url as owner_avatar
      FROM audios a
      LEFT JOIN users u ON a.owner_openid = u.openid
      WHERE 1=1
    `;

    const params = [];

    // 1. 分类逻辑：处理'my_creations'|'free'|具体分类ID（含子分类）
    if (category_id) {
      if (category_id === 'my_creations') {
        // 场景1：我的创作（仅当前用户的创作音频）
        sql += ` AND a.owner_openid = ? AND a.is_user_creation = 1`;
        params.push(openid);
      } else if (category_id === 'free') {
        // 场景2：免费音频（仅is_free=1的公开音频）
        sql += ` AND a.is_free = 1 AND a.is_public = 1`;
      } else {
        // 场景3：具体分类ID（含该分类及其所有子分类下的公开音频）
        // 更健壮的类型检查 - 处理空字符串、null和无效值
        if (!category_id || category_id.trim() === '') {
          throw new Error('分类ID不能为空');
        }
        
        const catId = parseInt(category_id);
        if (isNaN(catId) || catId <= 0) {
          throw new Error('分类ID必须为有效的正整数');
        }
        sql += ` AND a.audio_id IN (
          SELECT audio_id FROM audio_category_mapping 
          WHERE category_id IN (
            -- 子查询：获取目标分类自身及所有子分类（通过parent_id关联）
            SELECT category_id FROM audio_categories 
            WHERE category_id = ? OR parent_id = ?
          )
        ) AND a.is_public = 1`;
        params.push(catId, catId); // 绑定分类ID（自身+子分类）
      }
    } 
    // 2. 用户创作逻辑（与'my_creations'场景一致，兼容历史参数）
    else if (user_creations) {
      sql += ` AND a.owner_openid = ? AND a.is_user_creation = 1 AND a.is_public = 1`;
      params.push(openid);
    } 
    // 3. 默认场景：所有公开音频
    else {
      sql += ` AND a.is_public = 1`;
    }

    // 排序处理：限制合法的排序字段，使用字符串插值
    const validOrderFields = ['play_count', 'created_at', 'favorite_count', 'duration_seconds'];
    const orderField = validOrderFields.includes(orderBy) ? orderBy : 'play_count';
    const orderDir = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${orderField} ${orderDir}`;

    // 分页处理：强制转换为数字，使用字符串插值
    const queryLimit = Math.max(1, Math.min(100, parseInt(limit) || 20)); // 限制最大100条
    const queryOffset = Math.max(0, parseInt(offset) || 0);
    sql += ` LIMIT ${queryLimit} OFFSET ${queryOffset}`;

    // 执行查询
    const result = await query(sql, params);
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    return result.data;
  } catch (error) {
    console.error('获取音频列表失败:', error);
    throw error; // 向上层抛出错误，由调用方处理
  }
}

  

  /**
   * 检查用户是否收藏该音频
   */
  async isAudioFavorite(openid, audioId) {
    try {
      const sql = `SELECT id FROM favorites WHERE openid = ? AND audio_id = ?`;
      const result = await query(sql, [openid, audioId]);
      return result.data.length > 0;
    } catch (error) {
      console.error('检查收藏状态失败:', error);
      return false;
    }
  }

  /**
   * 切换音频收藏状态
   */
  async toggleFavorite(openid, audioId) {
    try {
      const isFavorite = await this.isAudioFavorite(openid, audioId);
      
      if (isFavorite) {
        // 取消收藏
        await query(`DELETE FROM favorites WHERE openid = ? AND audio_id = ?`, [openid, audioId]);
        await query(`UPDATE audios SET favorite_count = favorite_count - 1 WHERE audio_id = ?`, [audioId]);
        return { success: true, isFavorite: false };
      } else {
        // 添加收藏
        await query(`INSERT INTO favorites (openid, audio_id, created_at) VALUES (?, ?, NOW())`, [openid, audioId]);
        await query(`UPDATE audios SET favorite_count = favorite_count + 1 WHERE audio_id = ?`, [audioId]);
        return { success: true, isFavorite: true };
      }
    } catch (error) {
      console.error('切换收藏状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取音频详情（含分类信息）
   */
  async getAudioDetail(audioId) {
    try {
      const sql = `
        SELECT 
          a.audio_id, a.title, a.description, a.cover_url, a.audio_url, 
          a.duration_seconds, a.is_public, a.type, a.is_user_creation, a.is_free,
          a.play_count, a.favorite_count, a.comment_count,
          a.created_at, a.updated_at,
          u.nickname as owner_nickname, u.avatar_url as owner_avatar,
          GROUP_CONCAT(DISTINCT ac.name) as category_names
        FROM audios a
        LEFT JOIN users u ON a.owner_openid = u.openid
        LEFT JOIN audio_category_mapping acm ON a.audio_id = acm.audio_id
        LEFT JOIN audio_categories ac ON acm.category_id = ac.category_id
        WHERE a.audio_id = ?
        GROUP BY a.audio_id
      `;
      
      const result = await query(sql, [audioId]);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return result.data.length > 0 ? result.data[0] : null;
    } catch (error) {
      console.error('获取音频详情失败:', error);
      throw error;
    }
  }

  /**
   * 增加播放次数
   */
  async incrementPlayCount(audioId) {
    try {
      const sql = 'UPDATE audios SET play_count = play_count + 1 WHERE audio_id = ?';
      const result = await query(sql, [audioId]);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return true;
    } catch (error) {
      console.error('增加播放次数失败:', error);
      throw error;
    }
  }


  /**
   * 获取分类下的音频
   */
  async getAudiosByCategory(categoryId, options = {}) {
    try {
      const { limit = 20, offset = 0 } = options;
      
      const sql = `
        SELECT 
          a.audio_id, a.title, a.description, a.cover_url, a.audio_url, 
          a.duration_seconds, a.is_public, a.type, a.is_user_creation, a.is_free,
          a.play_count, a.favorite_count, a.comment_count,
          a.created_at, a.updated_at,
          u.nickname as owner_nickname, u.avatar_url as owner_avatar
        FROM audios a
        LEFT JOIN users u ON a.owner_openid = u.openid
        WHERE a.is_public = 1
        AND a.audio_id IN (
          SELECT audio_id FROM audio_category_mapping 
          WHERE category_id IN (
            SELECT category_id FROM audio_categories 
            WHERE parent_id = ? OR category_id = ?
          )
        )
        AND a.is_public = 1
        ORDER BY a.play_count DESC
        LIMIT ${parseInt(limit) || 20} OFFSET ${parseInt(offset) || 0}
      `;
      
      const result = await query(sql, [parseInt(categoryId), parseInt(categoryId)]);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return result.data;
    } catch (error) {
      console.error('获取分类音频失败:', error);
      throw error;
    }
  }


  /**
   * 搜索音频
   */
  async searchAudios(keyword, options = {}) {
    try {
      const { limit = 20, offset = 0 } = options;
      
      const sql = `
        SELECT 
          a.audio_id, a.title, a.description, a.cover_url, a.audio_url, 
          a.duration_seconds, a.is_public, a.type, a.is_user_creation, a.is_free,
          a.play_count, a.favorite_count, a.comment_count,
          a.created_at, a.updated_at,
          u.nickname as owner_nickname, u.avatar_url as owner_avatar
        FROM audios a
        LEFT JOIN users u ON a.owner_openid = u.openid
        WHERE a.is_public = 1
        AND (a.title LIKE ? OR a.description LIKE ?)
        ORDER BY a.play_count DESC
        LIMIT ? OFFSET ?
      `;
      
      const searchTerm = `%${keyword}%`;
      const result = await query(sql, [searchTerm, searchTerm, parseInt(limit) || 20, parseInt(offset) || 0]);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return result.data;
    } catch (error) {
      console.error('搜索音频失败:', error);
      throw error;
    }
  }

  /**
   * 创建音频
   */
  async createAudio(audioData) {
    try {
      // 联动type和is_user_creation
      const type = audioData.type || (audioData.is_user_creation ? 'user_created' : 'system');
      const isUserCreation = audioData.is_user_creation !== undefined ? audioData.is_user_creation : (type === 'user_created' ? 1 : 0);
      
      const sql = `
        INSERT INTO audios (
          owner_openid, title, description, cover_url, audio_url,
          duration_seconds, is_public, type, is_user_creation, is_free
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        audioData.owner_openid, // 系统音频可传null
        audioData.title,
        audioData.description || null,
        audioData.cover_url || null,
        audioData.audio_url,
        audioData.duration_seconds || null,
        audioData.is_public !== undefined ? audioData.is_public : 1,
        type,
        isUserCreation,
        audioData.is_free !== undefined ? audioData.is_free : 0
      ];
      
      const result = await query(sql, params);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // 返回创建的音频信息
      const audioInfo = await this.getAudioById(result.data.insertId);
      
      if (!audioInfo.success) {
        throw new Error(audioInfo.message || '获取新创建的音频信息失败');
      }
      
      return audioInfo;
    } catch (error) {
      console.error('创建音频失败:', error);
      throw error;
    }
  }

  /**
   * 更新音频（仅能更新自己创作的音频）
   */
  async updateAudio(audioId, openid, updates) {
    try {
      // 1. 校验音频归属权和创作类型
      const audio = await this.getAudioById(audioId);
      if (!audio) throw new Error('音频不存在');
      
      // 仅允许用户更新自己创作的音频（is_user_creation=1 且 owner_openid匹配）
      if (audio.is_user_creation !== 1 || audio.owner_openid !== openid) {
        throw new Error('无权限更新该音频，仅能操作自己创作的内容');
      }
      
      // 2. 联动type和is_user_creation（若更新这两个字段）
      if (updates.hasOwnProperty('type') || updates.hasOwnProperty('is_user_creation')) {
        const newType = updates.type || (updates.is_user_creation ? 'user_created' : 'system');
        const newIsUserCreation = updates.is_user_creation !== undefined ? updates.is_user_creation : (newType === 'user_created' ? 1 : 0);
        updates.type = newType;
        updates.is_user_creation = newIsUserCreation;
      }
      
      // 3. 构建更新SQL
      const fields = [];
      const values = [];
      
      Object.keys(updates).forEach(key => {
        if (key !== 'audio_id' && key !== 'owner_openid') { // 禁止修改音频ID和归属者
          fields.push(`${key} = ?`);
          values.push(updates[key]);
        }
      });
      
      if (fields.length === 0) {
        return await this.getAudioById(audioId);
      }
      
      values.push(audioId);
      
      const sql = `UPDATE audios SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE audio_id = ?`;
      const result = await query(sql, values);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return await this.getAudioById(audioId);
    } catch (error) {
      console.error('更新音频失败:', error);
      throw error;
    }
  }

  /**
   * 删除音频（仅能删除自己创作的音频）
   */
  async deleteAudio(audioId, openid) {
    try {
      // 1. 校验音频归属权和创作类型
      const audio = await this.getAudioById(audioId);
      if (!audio) throw new Error('音频不存在');
      
      // 仅允许用户删除自己创作的音频（is_user_creation=1 且 owner_openid匹配）
      if (audio.is_user_creation !== 1 || audio.owner_openid !== openid) {
        throw new Error('无权限删除该音频，仅能操作自己创作的内容');
      }
      
      // 2. 执行删除（先删除关联表数据，再删除主表）
      await query(`DELETE FROM audio_category_mapping WHERE audio_id = ?`, [audioId]);
      await query(`DELETE FROM favorites WHERE audio_id = ?`, [audioId]);
      
      const sql = 'DELETE FROM audios WHERE audio_id = ?';
      const result = await query(sql, [audioId]);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return true;
    } catch (error) {
      console.error('删除音频失败:', error);
      throw error;
    }
  }

  /**
   * 获取热门音频
   */
  async getPopularAudios(limit = 10) {
    try {
      const sql = `
        SELECT 
          a.audio_id, a.title, a.description, a.cover_url, a.audio_url, 
          a.duration_seconds, a.play_count, a.favorite_count, a.is_free,
          a.created_at,
          u.nickname as owner_nickname, u.avatar_url as owner_avatar
        FROM audios a
        LEFT JOIN users u ON a.owner_openid = u.openid
        WHERE a.is_public = 1
        ORDER BY a.play_count DESC
        LIMIT ?
      `;
      
      const result = await query(sql, [parseInt(limit)]);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return result.data;
    } catch (error) {
      console.error('获取热门音频失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户创作的音频
   */
  async getUserCreations(openid, options = {}) {
    try {
      const { limit = 20, offset = 0 } = options;
      
      const sql = `
        SELECT 
          a.audio_id, a.title, a.description, a.cover_url, a.audio_url, 
          a.duration_seconds, a.is_public, a.type, a.is_user_creation, a.is_free,
          a.play_count, a.favorite_count, a.comment_count,
          a.created_at, a.updated_at
        FROM audios a
        WHERE a.owner_openid = ?
        AND a.is_user_creation = 1
        ORDER BY a.created_at DESC
        LIMIT ${parseInt(limit) || 20} OFFSET ${parseInt(offset) || 0}
      `;
      
      const result = await query(sql, [openid]);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return result.data;
    } catch (error) {
      console.error('获取用户创作音频失败:', error);
      throw error;
    }
  }

  /**
   * 随机推荐音频
   */
  async getRandomAudios(count = 5) {
    try {
      const sql = `
        SELECT 
          a.audio_id, a.title, a.description, a.cover_url, a.audio_url, 
          a.duration_seconds, a.is_public, a.type, a.is_user_creation, a.is_free,
          a.play_count, a.favorite_count, a.comment_count,
          a.created_at, a.updated_at,
          u.nickname as owner_nickname, u.avatar_url as owner_avatar,
          GROUP_CONCAT(DISTINCT ac.name) as category_names
        FROM audios a
        LEFT JOIN users u ON a.owner_openid = u.openid
        LEFT JOIN audio_category_mapping acm ON a.audio_id = acm.audio_id
        LEFT JOIN audio_categories ac ON acm.category_id = ac.category_id
        WHERE a.is_public = 1
        GROUP BY a.audio_id
        ORDER BY RAND()
        LIMIT ${parseInt(count) || 5}
      `;
      const result = await query(sql, []);
      if (!result.success) throw new Error(result.error);
      return result.data || [];
    } catch (error) {
      console.error('获取随机推荐音频失败:', error);
      throw error;
    }
  }

  

  /**
   * 获取用户上传的音频列表（兼容creationRoutes.js中的调用）
   */
  async getUserUploads(openid, options = {}) {
    try {
      const { limit = 20, offset = 0 } = options;
      
      if (!openid) {
        return { success: false, error: '用户未登录' };
      }
      
      // 查询用户创作的音频
      const sql = `
        SELECT 
          a.audio_id, a.title, a.description, a.cover_url, a.audio_url, 
          a.duration_seconds, a.is_public, a.type, a.is_user_creation, a.is_free,
          a.play_count, a.favorite_count, a.comment_count,
          a.created_at, a.updated_at,
          u.nickname as owner_nickname, u.avatar_url as owner_avatar
        FROM audios a
        LEFT JOIN users u ON a.owner_openid = u.openid
        WHERE a.owner_openid = ? AND a.is_user_creation = 1
        ORDER BY a.created_at DESC
        LIMIT ${parseInt(limit) || 20} OFFSET ${parseInt(offset) || 0}
      `;
      
      const result = await query(sql, [openid]);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }
      
      // 查询总数
      const countSql = 'SELECT COUNT(*) as total FROM audios WHERE owner_openid = ? AND is_user_creation = 1';
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
      console.error('获取用户上传音频失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 根据音频ID获取音频信息
   */
  static async getAudioById(audioId) {
    try {
      const sql = `
        SELECT 
          a.audio_id, a.title, a.description, a.cover_url, a.audio_url, 
          a.duration_seconds, a.is_public, a.type, a.is_user_creation, a.is_free,
          a.play_count, a.favorite_count, a.comment_count,
          a.created_at, a.updated_at,
          u.nickname as owner_nickname, u.avatar_url as owner_avatar,
          u.openid as openid
        FROM audios a
        LEFT JOIN users u ON a.owner_openid = u.openid
        WHERE a.audio_id = ?
      `;
      
      const result = await query(sql, [parseInt(audioId)]);
      
      if (!result.success || !result.data || result.data.length === 0) {
        return {
          success: false,
          message: '音频不存在'
        };
      }
      
      return {
        success: true,
        data: result.data[0],
        message: '获取音频信息成功'
      };
    } catch (error) {
      console.error('获取音频信息失败:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
}

module.exports = new AudioModel();