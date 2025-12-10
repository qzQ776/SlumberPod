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
 * @param {string} [options.orderBy='created_at'] - 排序字段（如'created_at'|'duration_seconds'）
 * @param {string} [options.order='DESC'] - 排序方向（'DESC'|'ASC'）
 * @returns {Promise<Array>} 音频列表数据
 */
static async getAudios(options = {}) {
  try {
    // 解构参数并设置默认值
    const { 
      category_id, 
      user_creations, 
      openid, 
      limit = 20, 
      offset = 0, 
      orderBy = 'created_at', 
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
    const validOrderFields = ['created_at', 'duration_seconds'];
    const orderField = validOrderFields.includes(orderBy) ? orderBy : 'created_at';
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
  static async isAudioFavorite(openid, audioId) {
    try {
      const sql = `SELECT favorite_id FROM favorites WHERE openid = ? AND JSON_CONTAINS(audio_ids, JSON_ARRAY(?)) AND favorite_type = 'single'`;
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
  static async toggleFavorite(openid, audioId, audioInfo = null) {
    try {
      // 检查音频是否存在
      const audioCheck = await query('SELECT * FROM audios WHERE audio_id = ?', [audioId]);
      
      if (!audioCheck.success || audioCheck.data.length === 0) {
        throw new Error('音频不存在');
      }

      const isFavorite = await this.isAudioFavorite(openid, audioId);
      
      if (isFavorite) {
        // 取消收藏
        const deleteSql = `
          DELETE FROM favorites 
          WHERE openid = ? AND favorite_type = 'single' 
          AND JSON_CONTAINS(audio_ids, JSON_ARRAY(?))
        `;
        
        const deleteResult = await query(deleteSql, [openid, audioId]);
        
        // 更新音频的收藏计数
        await query('UPDATE audios SET favorite_count = favorite_count - 1 WHERE audio_id = ?', [audioId]);
        
        return { success: true, action: 'unfavorite', message: '取消收藏成功' };
      } else {
        // 添加收藏
        const insertSql = `
          INSERT INTO favorites (openid, audio_ids, custom_name, favorite_type) 
          VALUES (?, JSON_ARRAY(?), ?, 'single')
        `;
        
        const audio = audioInfo || audioCheck.data[0];
        const insertResult = await query(insertSql, [openid, audioId, audio.title || `音频${audioId}`]);
        
        // 更新音频的收藏计数
        await query('UPDATE audios SET favorite_count = favorite_count + 1 WHERE audio_id = ?', [audioId]);
        
        return { success: true, action: 'favorite', message: '收藏成功' };
      }
    } catch (error) {
      console.error('切换收藏状态失败:', error);
      return {
        success: false,
        message: '切换收藏状态失败',
        error: error.message
      };
    }
  }

  /**
   * 获取音频详情（含分类信息）
   */
  static async getAudioDetail(audioId) {
    try {
      const sql = `
        SELECT 
          a.audio_id, a.title, a.description, a.cover_url, a.audio_url, 
          a.duration_seconds, a.is_public, a.type, a.is_user_creation, a.is_free,
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
   * 增加播放次数并记录播放历史
   */
  static async recordPlay(openid, audioId, playInfo = {}) {
    try {
      // 检查音频是否存在
      const audioCheck = await query('SELECT * FROM audios WHERE audio_id = ?', [audioId]);
      
      if (!audioCheck.success || audioCheck.data.length === 0) {
        throw new Error('音频不存在');
      }

      // 增加播放次数
      const updateResult = await query('UPDATE audios SET play_count = play_count + 1 WHERE audio_id = ?', [audioId]);
      
      if (!updateResult.success) {
        throw new Error(updateResult.error);
      }

      // 如果有openid，记录播放历史
      if (openid) {
        const PlayHistory = require('./PlayHistory');
        await PlayHistory.recordPlay({
          openid: openid,
          audio_ids: [audioId],
          play_type: 'single',
          play_duration: playInfo.play_duration || 0,
          timer_minutes: playInfo.timer_minutes || 0
        });
      }

      return {
        success: true,
        message: '播放记录成功'
      };
    } catch (error) {
      console.error('记录播放失败:', error);
      return {
        success: false,
        message: '记录播放失败',
        error: error.message
      };
    }
  }


  /**
   * 获取分类下的音频
   */
  static async getAudiosByCategory(categoryId, options = {}) {
    try {
      const { limit = 20, offset = 0 } = options;
      
      const sql = `
        SELECT 
          a.audio_id, a.title, a.description, a.cover_url, a.audio_url, 
          a.duration_seconds, a.is_public, a.type, a.is_user_creation, a.is_free,
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
        ORDER BY a.created_at DESC
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
  static async searchAudios(keyword, options = {}) {
    try {
      const { limit = 20, offset = 0 } = options;
      
      const sql = `
        SELECT 
          a.audio_id, a.title, a.description, a.cover_url, a.audio_url, 
          a.duration_seconds, a.is_public, a.type, a.is_user_creation, a.is_free,
          a.created_at, a.updated_at,
          u.nickname as owner_nickname, u.avatar_url as owner_avatar
        FROM audios a
        LEFT JOIN users u ON a.owner_openid = u.openid
        WHERE a.is_public = 1
        AND (a.title LIKE ? OR a.description LIKE ?)
        ORDER BY a.created_at DESC
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
  static async createAudio(audioData) {
    try {
      // 联动type和is_user_creation
      const type = audioData.type || (audioData.is_user_creation ? 'user_created' : 'system');
      const isUserCreation = audioData.is_user_creation !== undefined ? audioData.is_user_creation : (type === 'user_created' ? 1 : 0);
      
      const sql = `
        INSERT INTO audios (
          owner_openid, title, description, cover_url, audio_url,
          duration_seconds, is_public, type, is_user_creation, is_free,
          play_count, favorite_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        audioData.is_free !== undefined ? audioData.is_free : 0,
        0, // play_count 默认值
        0  // favorite_count 默认值
      ];
      
      const result = await query(sql, params);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // 返回创建的音频信息
      const audioInfo = await AudioModel.getAudioById(result.data.insertId);
      
      if (!audioInfo.success) {
        throw new Error(audioInfo.message || '获取新创建的音频信息失败');
      }
      
      return {
        success: true,
        data: audioInfo.data,
        audio_id: audioInfo.data.audio_id
      };
    } catch (error) {
      console.error('创建音频失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 更新音频（仅能更新自己创作的音频）
   */
  static async updateAudio(audioId, openid, updates) {
    try {
      // 1. 校验音频归属权和创作类型
      const audioResult = await AudioModel.getAudioById(audioId);
      if (!audioResult.success || !audioResult.data) throw new Error('音频不存在');
      const audio = audioResult.data;
      
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
        const audioResult = await AudioModel.getAudioById(audioId);
        return audioResult.success ? audioResult.data : null;
      }
      
      values.push(audioId);
      
      const sql = `UPDATE audios SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE audio_id = ?`;
      const result = await query(sql, values);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      const updatedAudioResult = await AudioModel.getAudioById(audioId);
      return updatedAudioResult.success ? updatedAudioResult.data : null;
    } catch (error) {
      console.error('更新音频失败:', error);
      throw error;
    }
  }

  /**
   * 删除音频（仅能删除自己创作的音频）
   */
  static async deleteAudio(audioId, openid) {
    try {
      // 1. 校验音频归属权和创作类型
      const audioResult = await AudioModel.getAudioById(audioId);
      if (!audioResult.success || !audioResult.data) throw new Error('音频不存在');
      const audio = audioResult.data;
      
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
   * 获取热门音频（已废弃，改为获取最新音频）
   */
  async getPopularAudios(limit = 10) {
    try {
      const sql = `
        SELECT 
          a.audio_id, a.title, a.description, a.cover_url, a.audio_url, 
          a.duration_seconds, a.is_free,
          a.created_at,
          u.nickname as owner_nickname, u.avatar_url as owner_avatar
        FROM audios a
        LEFT JOIN users u ON a.owner_openid = u.openid
        WHERE a.is_public = 1
        ORDER BY a.created_at DESC
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
  static async getRandomAudios(count = 5) {
    try {
      const sql = `
        SELECT 
          a.audio_id, a.title, a.description, a.cover_url, a.audio_url, 
          a.duration_seconds, a.is_public, a.type, a.is_user_creation, a.is_free,
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
  static async getUserUploads(openid, options = {}) {
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

  /**
   * 智能搜索音频 - 增强版，支持多条件搜索
   */
  static async searchAudios(options = {}) {
    try {
      const {
        keyword = '',
        category = null,
        type = null,
        tags = null,
        duration_min = null,
        duration_max = null,
        limit = 20,
        offset = 0,
        sort_by = 'relevance' // relevance, popularity, latest
      } = options;

      let sql = `
        SELECT 
          a.audio_id, a.title, a.description, a.cover_url, a.audio_url, 
          a.duration_seconds, a.is_public, a.type, a.is_user_creation, a.is_free,
          a.created_at, a.updated_at,
          u.nickname as owner_nickname, u.avatar_url as owner_avatar,
          GROUP_CONCAT(DISTINCT ac.name) as category_names
        FROM audios a
        LEFT JOIN users u ON a.owner_openid = u.openid
        LEFT JOIN audio_category_mapping acm ON a.audio_id = acm.audio_id
        LEFT JOIN audio_categories ac ON acm.category_id = ac.category_id
        WHERE a.is_public = 1
      `;

      const params = [];

      // 关键词搜索
      if (keyword && keyword.trim() !== '') {
        sql += ` AND (a.title LIKE ? OR a.description LIKE ?)`;
        const searchTerm = `%${keyword.trim()}%`;
        params.push(searchTerm, searchTerm);
      }

      // 分类筛选
      if (category && !isNaN(parseInt(category))) {
        sql += ` AND a.audio_id IN (
          SELECT audio_id FROM audio_category_mapping 
          WHERE category_id IN (
            SELECT category_id FROM audio_categories 
            WHERE category_id = ? OR parent_id = ?
          )
        )`;
        params.push(parseInt(category), parseInt(category));
      }

      // 类型筛选
      if (type) {
        sql += ` AND a.type = ?`;
        params.push(type);
      }

      // 标签筛选（基于分类名称）
      if (tags && Array.isArray(tags) && tags.length > 0) {
        sql += ` AND (`;
        tags.forEach((tag, index) => {
          if (index > 0) sql += ` OR `;
          sql += `ac.name LIKE ?`;
          params.push(`%${tag}%`);
        });
        sql += `)`;
      }

      // 时长筛选
      if (duration_min !== null && !isNaN(parseInt(duration_min))) {
        sql += ` AND a.duration_seconds >= ?`;
        params.push(parseInt(duration_min));
      }
      if (duration_max !== null && !isNaN(parseInt(duration_max))) {
        sql += ` AND a.duration_seconds <= ?`;
        params.push(parseInt(duration_max));
      }

      // 分组
      sql += ` GROUP BY a.audio_id`;

      // 排序
      switch (sort_by) {
        case 'popular':
          sql += ` ORDER BY a.favorite_count DESC, a.created_at DESC`;
          break;
        case 'latest':
          sql += ` ORDER BY a.created_at DESC`;
          break;
        case 'relevance':
        default:
          if (keyword && keyword.trim() !== '') {
            sql += ` ORDER BY 
              CASE 
                WHEN a.title LIKE ? THEN 1 
                WHEN a.description LIKE ? THEN 2 
                ELSE 3 
              END,
              a.created_at DESC`;
            const searchTerm = `%${keyword.trim()}%`;
            params.push(searchTerm, searchTerm);
          } else {
            sql += ` ORDER BY a.created_at DESC`;
          }
      }

      // 分页
      sql += ` LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), parseInt(offset));

      const result = await query(sql, params);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      // 获取总数
      const countSql = sql.replace(/SELECT.*?FROM/, 'SELECT COUNT(DISTINCT a.audio_id) as total FROM').replace(/GROUP BY.*$/, '').replace(/ORDER BY.*$/, '').replace(/LIMIT.*$/, '');
      const countResult = await query(countSql, params.slice(0, -2)); // 去掉分页参数

      return {
        success: true,
        data: result.data || [],
        total: countResult.success ? countResult.data[0]?.total || 0 : 0
      };
    } catch (error) {
      console.error('智能搜索音频失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取个性化推荐音频
   */
  static async getPersonalizedRecommendations(openid, limit = 10) {
    try {
      if (!openid) {
        return this.getPopularAudios(limit);
      }

      // 基于用户播放历史和收藏偏好推荐
      const recommendations = [];

      // 1. 基于播放历史推荐相似音频
      const historySql = `
        SELECT DISTINCT a.type, a.tags
        FROM play_history ph
        JOIN audios a ON JSON_UNQUOTE(JSON_EXTRACT(ph.audio_ids, '$[0]')) = a.audio_id
        WHERE ph.openid = ? AND ph.is_completed = 1
        ORDER BY ph.played_at DESC
        LIMIT 5
      `;
      
      const historyResult = await query(historySql, [openid]);
      
      if (historyResult.success && historyResult.data.length > 0) {
        const userPreferences = historyResult.data;
        
        // 基于用户偏好推荐
        const preferenceSql = `
          SELECT DISTINCT a.audio_id, a.title, a.description, a.cover_url, a.audio_url, 
            a.duration_seconds, a.type, a.tags, a.created_at,
            u.nickname as owner_nickname, u.avatar_url as owner_avatar
          FROM audios a
          LEFT JOIN users u ON a.owner_openid = u.openid
          WHERE a.is_public = 1
          AND (
            a.type IN (${userPreferences.map(() => '?').join(',')}) 
            OR a.tags LIKE '%' || ? || '%'
          )
          AND a.audio_id NOT IN (
            SELECT DISTINCT JSON_UNQUOTE(JSON_EXTRACT(ph.audio_ids, '$[0]'))
            FROM play_history ph
            WHERE ph.openid = ?
          )
          ORDER BY RAND()
          LIMIT ?
        `;
        
        const preferenceParams = [
          ...userPreferences.map(p => p.type),
          userPreferences[0].tags || '',
          openid,
          Math.min(limit, 5)
        ];
        
        const preferenceResult = await query(preferenceSql, preferenceParams);
        
        if (preferenceResult.success) {
          recommendations.push(...preferenceResult.data);
        }
      }

      // 2. 如果推荐数量不足，补充热门音频
      if (recommendations.length < limit) {
        const remaining = limit - recommendations.length;
        const popularAudios = await this.getPopularAudios(remaining);
        recommendations.push(...popularAudios);
      }

      return recommendations.slice(0, limit);
    } catch (error) {
      console.error('获取个性化推荐失败:', error);
      // 失败时返回热门音频
      return this.getPopularAudios(limit);
    }
  }

  /**
   * 获取相似音频
   */
  static async getSimilarAudios(audioId, limit = 10) {
    try {
      // 获取目标音频信息
      const audioResult = await this.getAudioById(audioId);
      
      if (!audioResult.success) {
        return this.getPopularAudios(limit);
      }

      const audio = audioResult.data;
      
      // 基于类型和标签推荐相似音频
      const sql = `
        SELECT 
          a.audio_id, a.title, a.description, a.cover_url, a.audio_url, 
          a.duration_seconds, a.type, a.tags, a.created_at,
          u.nickname as owner_nickname, u.avatar_url as owner_avatar
        FROM audios a
        LEFT JOIN users u ON a.owner_openid = u.openid
        WHERE a.is_public = 1
        AND a.audio_id != ?
        AND (
          a.type = ? 
          OR (a.tags LIKE ? AND a.tags IS NOT NULL)
        )
        ORDER BY 
          CASE WHEN a.type = ? THEN 1 ELSE 2 END,
          RAND()
        LIMIT ?
      `;
      
      const params = [
        audioId,
        audio.type,
        `%${audio.type}%`,
        audio.type,
        limit
      ];
      
      const result = await query(sql, params);
      
      if (!result.success || result.data.length === 0) {
        // 如果没有相似音频，返回热门音频
        return this.getPopularAudios(limit);
      }

      return result.data;
    } catch (error) {
      console.error('获取相似音频失败:', error);
      return this.getPopularAudios(limit);
    }
  }

  /**
   * 获取热门音频
   */
  static async getPopularAudios(limit = 10) {
    try {
      const sql = `
        SELECT 
          a.audio_id, a.title, a.description, a.cover_url, a.audio_url, 
          a.duration_seconds, a.is_public, a.type, a.is_user_creation, a.is_free,
          a.created_at, a.updated_at,
          u.nickname as owner_nickname, u.avatar_url as owner_avatar
        FROM audios a
        LEFT JOIN users u ON a.owner_openid = u.openid
        WHERE a.is_public = 1
        ORDER BY a.created_at DESC
        LIMIT ?
      `;
      
      const result = await query(sql, [parseInt(limit)]);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return result.data || [];
    } catch (error) {
      console.error('获取热门音频失败:', error);
      return [];
    }
  }

  /**
   * 获取热门标签（基于音频分类）
   */
  static async getPopularTags(limit = 20) {
    try {
      // 通过 audio_category_mapping 表统计每个分类的使用次数
      const sql = `
        SELECT 
          ac.category_id as tag_id,
          ac.name as tag_name,
          COUNT(acm.audio_id) as usage_count
        FROM audio_categories ac
        LEFT JOIN audio_category_mapping acm ON ac.category_id = acm.category_id
        GROUP BY ac.category_id, ac.name
        HAVING usage_count > 0
        ORDER BY usage_count DESC
        LIMIT ?
      `;
      
      const result = await query(sql, [parseInt(limit)]);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // 转换数据格式以匹配期望的输出
      return (result.data || []).map(row => ({
        tag_name: row.tag_name,
        usage_count: row.usage_count,
        category: 'category' // 标识这是分类标签
      }));
    } catch (error) {
      console.error('获取热门标签失败:', error);
      return [];
    }
  }

  /**
   * 根据标签获取音频（基于分类名称）
   */
  static async getAudiosByTag(tagName, options = {}) {
    try {
      const { limit = 20, offset = 0 } = options;
      
      const sql = `
        SELECT 
          a.audio_id, a.title, a.description, a.cover_url, a.audio_url, 
          a.duration_seconds, a.is_public, a.type, a.is_user_creation, a.is_free,
          a.created_at, a.updated_at,
          u.nickname as owner_nickname, u.avatar_url as owner_avatar,
          GROUP_CONCAT(DISTINCT ac.name) as categories
        FROM audios a
        LEFT JOIN users u ON a.owner_openid = u.openid
        LEFT JOIN audio_category_mapping acm ON a.audio_id = acm.audio_id
        LEFT JOIN audio_categories ac ON acm.category_id = ac.category_id
        WHERE a.is_public = 1
        AND ac.name LIKE ?
        GROUP BY a.audio_id
        ORDER BY a.created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      const searchTag = `%${tagName}%`;
      const result = await query(sql, [searchTag, parseInt(limit), parseInt(offset)]);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return result.data || [];
    } catch (error) {
      console.error('根据标签获取音频失败:', error);
      throw error;
    }
  }

  /**
   * 管理员专用：批量更新音频封面（绕过权限检查）
   * 用于批量上传图标等管理操作
   */
  static async adminBatchUpdateCover(audioId, coverUrl) {
    try {
      // 验证音频是否存在
      const audioResult = await AudioModel.getAudioById(audioId);
      if (!audioResult.success || !audioResult.data) {
        throw new Error('音频不存在');
      }
      
      const audio = audioResult.data;
      
      // 只能更新系统音频，不能更新用户创作的音频
      if (audio.is_user_creation === 1) {
        return {
          success: false,
          error: '跳过用户创作的音频',
          error_code: 'USER_CREATION_SKIPPED'
        };
      }
      
      // 执行更新
      const sql = 'UPDATE audios SET cover_url = ?, updated_at = NOW() WHERE audio_id = ?';
      const result = await query(sql, [coverUrl, audioId]);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return {
        success: true,
        message: '封面更新成功',
        audio_id: audioId
      };
      
    } catch (error) {
      console.error('管理员更新音频封面失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = AudioModel;