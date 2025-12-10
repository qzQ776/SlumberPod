const { query } = require('../config');

class Favorite {
  // 获取用户的收藏列表（支持组合音频）
  static async getUserFavorites(openid, options = {}) {
    try {
      const { limit = 20, offset = 0 } = options;
      
      // 获取收藏列表（支持单个音频和组合音频）
      const sql = `
        SELECT 
          f.*,
          CASE 
            WHEN f.favorite_type = 'single' THEN a.title
            WHEN f.favorite_type = 'combination' THEN f.custom_name
            ELSE f.custom_name
          END as display_name,
          CASE 
            WHEN f.favorite_type = 'single' THEN a.cover_url
            WHEN f.favorite_type = 'combination' THEN NULL
            ELSE NULL
          END as cover_url,
          CASE 
            WHEN f.favorite_type = 'single' THEN a.duration_seconds
            WHEN f.favorite_type = 'combination' THEN (
              SELECT SUM(duration_seconds) 
              FROM audios 
              WHERE audio_id IN (SELECT JSON_EXTRACT(f.audio_ids, '$[*]'))
            )
            ELSE 0
          END as duration_seconds,
          u.nickname as owner_nickname, 
          u.avatar_url as owner_avatar
        FROM favorites f
        LEFT JOIN audios a ON f.favorite_type = 'single' AND JSON_CONTAINS(f.audio_ids, CAST(a.audio_id AS JSON))
        LEFT JOIN users u ON f.openid = u.openid
        WHERE f.openid = ? AND f.is_active = 1
        ORDER BY f.created_at DESC
        LIMIT ${parseInt(limit) || 20} OFFSET ${parseInt(offset) || 0}
      `;
      
      const result = await query(sql, [openid]);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }
      
      // 查询总数
      const countSql = `
        SELECT COUNT(*) as total_count
        FROM favorites 
        WHERE openid = ? AND is_active = 1
      `;
      
      const countResult = await query(countSql, [openid]);
      
      if (!countResult.success) {
        return { success: false, error: countResult.error };
      }
      
      return {
        success: true,
        data: result.data || [],
        total: countResult.data[0].total_count || 0
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
        SELECT favorite_id FROM favorites 
        WHERE openid = ? AND JSON_CONTAINS(audio_ids, ?) AND favorite_type = 'single' AND is_active = 1
      `;
      
      const checkResult = await query(checkSql, [openid, JSON.stringify([audioId])]);
      
      if (checkResult.data && checkResult.data.length > 0) {
        return {
          success: false,
          error: '已经收藏过该音频'
        };
      }
      
      // 获取音频信息用于设置自定义名称
      const audioSql = `
        SELECT title FROM audios WHERE audio_id = ?
      `;
      
      const audioResult = await query(audioSql, [audioId]);
      const customName = audioResult.data && audioResult.data[0] ? audioResult.data[0].title : '音频收藏';
      
      // 新增收藏
      const insertSql = `
        INSERT INTO favorites (openid, audio_ids, custom_name, favorite_type)
        VALUES (?, ?, ?, 'single')
      `;
      
      const result = await query(insertSql, [openid, JSON.stringify([audioId]), customName]);
      
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
        UPDATE favorites 
        SET is_active = 0 
        WHERE openid = ? AND JSON_CONTAINS(audio_ids, ?) AND favorite_type = 'single'
      `;
      
      const result = await query(sql, [openid, JSON.stringify([audioId])]);
      
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
        SELECT favorite_id FROM favorites 
        WHERE openid = ? AND JSON_CONTAINS(audio_ids, ?) AND favorite_type = 'single' AND is_active = 1
      `;
      
      const result = await query(sql, [openid, JSON.stringify([audioId])]);
      
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

  // 添加组合音频收藏
  static async addCombinationFavorite(openid, combinationId, customName = '组合音频') {
    try {
      // 检查是否已经收藏
      const checkSql = `
        SELECT favorite_id FROM favorites 
        WHERE openid = ? AND JSON_CONTAINS(audio_ids, ?) AND favorite_type = 'combination' AND is_active = 1
      `;
      
      const checkResult = await query(checkSql, [openid, JSON.stringify([combinationId])]);
      
      if (checkResult.data && checkResult.data.length > 0) {
        return {
          success: false,
          error: '已经收藏过该组合音频'
        };
      }
      
      // 新增收藏
      const insertSql = `
        INSERT INTO favorites (openid, audio_ids, custom_name, favorite_type)
        VALUES (?, ?, ?, 'combination')
      `;
      
      const result = await query(insertSql, [openid, JSON.stringify([combinationId]), customName]);
      
      return {
        success: true,
        message: '组合音频收藏成功'
      };
    } catch (error) {
      console.error('添加组合音频收藏失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 取消组合音频收藏
  static async removeCombinationFavorite(openid, combinationId) {
    try {
      const sql = `
        UPDATE favorites 
        SET is_active = 0 
        WHERE openid = ? AND JSON_CONTAINS(audio_ids, ?) AND favorite_type = 'combination'
      `;
      
      const result = await query(sql, [openid, JSON.stringify([combinationId])]);
      
      if (result.affectedRows > 0) {
        return {
          success: true,
          message: '取消组合音频收藏成功'
        };
      } else {
        return {
          success: false,
          error: '组合音频收藏记录不存在'
        };
      }
    } catch (error) {
      console.error('取消组合音频收藏失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 检查组合音频是否已收藏
  static async isCombinationFavorited(openid, combinationId) {
    try {
      const sql = `
        SELECT favorite_id FROM favorites 
        WHERE openid = ? AND JSON_CONTAINS(audio_ids, ?) AND favorite_type = 'combination' AND is_active = 1
      `;
      
      const result = await query(sql, [openid, JSON.stringify([combinationId])]);
      
      return {
        success: true,
        isFavorited: result.data && result.data.length > 0
      };
    } catch (error) {
      console.error('检查组合音频收藏状态失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 统一收藏接口（根据类型自动判断）
  static async addFavoriteByType(openid, itemId, itemType) {
    try {
      if (itemType === 'audio') {
        return await this.addFavorite(openid, itemId);
      } else if (itemType === 'combination') {
        return await this.addCombinationFavorite(openid, itemId);
      } else {
        return {
          success: false,
          error: '不支持的类型'
        };
      }
    } catch (error) {
      console.error('添加收藏失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 统一取消收藏接口
  static async removeFavoriteByType(openid, itemId, itemType) {
    try {
      if (itemType === 'audio') {
        return await this.removeFavorite(openid, itemId);
      } else if (itemType === 'combination') {
        return await this.removeCombinationFavorite(openid, itemId);
      } else {
        return {
          success: false,
          error: '不支持的类型'
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

  // 统一检查收藏状态接口
  static async isFavoritedByType(openid, itemId, itemType) {
    try {
      if (itemType === 'audio') {
        return await this.isFavorited(openid, itemId);
      } else if (itemType === 'combination') {
        return await this.isCombinationFavorited(openid, itemId);
      } else {
        return {
          success: false,
          error: '不支持的类型'
        };
      }
    } catch (error) {
      console.error('检查收藏状态失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 获取用户收藏统计
  static async getUserFavoriteStats(openid) {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_count,
          SUM(CASE WHEN favorite_type = 'single' THEN 1 ELSE 0 END) as audio_count,
          SUM(CASE WHEN favorite_type = 'combination' THEN 1 ELSE 0 END) as combination_count
        FROM favorites 
        WHERE openid = ? AND is_active = 1
      `;
      
      const result = await query(sql, [openid]);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }
      
      return {
        success: true,
        data: {
          audio: result.data[0].audio_count || 0,
          combination: result.data[0].combination_count || 0,
          total: result.data[0].total_count || 0
        }
      };
    } catch (error) {
      console.error('获取收藏统计失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 白噪音组合功能：检查是否已收藏音频组合
  static async isCombinationFavorite(openid, audioIds) {
    try {
      // 将音频ID数组排序后转换为JSON字符串进行比较
      const sortedIds = [...audioIds].sort((a, b) => a - b);
      const audioIdsJson = JSON.stringify(sortedIds);

      const sql = `
        SELECT favorite_id FROM favorites 
        WHERE openid = ? AND favorite_type = 'combination' AND is_active = 1
        AND audio_ids = ?
      `;
      
      const result = await query(sql, [openid, audioIdsJson]);
      
      return result.data && result.data.length > 0;
    } catch (error) {
      console.error('检查组合收藏状态失败:', error);
      return false;
    }
  }

  // 白噪音组合功能：收藏音频组合
  static async favoriteCombination(favoriteData) {
    try {
      const {
        openid,
        audio_ids,           // 组合中的所有音频ID
        selected_audio_ids,  // 选中的音频ID
        custom_name = null   // 自定义名称
      } = favoriteData;

      // 验证参数
      if (!Array.isArray(audio_ids) || audio_ids.length === 0) {
        throw new Error('音频组合ID列表不能为空');
      }

      if (!Array.isArray(selected_audio_ids) || selected_audio_ids.length === 0) {
        throw new Error('已选音频ID列表不能为空');
      }

      // 检查是否已收藏
      const isFavorite = await this.isCombinationFavorite(openid, audio_ids);
      if (isFavorite) {
        return {
          success: false,
          message: '该音频组合已收藏'
        };
      }

      // 构建自定义名称（如果没有提供）
      let displayName = custom_name;
      if (!displayName) {
        // 获取音频信息用于生成默认名称
        const audioIdsStr = audio_ids.slice(0, 3).join(',');
        const audioSql = `
          SELECT title FROM audios WHERE audio_id IN (${audioIdsStr})
        `;
        const audioResult = await query(audioSql, []);
        
        if (audioResult.success && audioResult.data.length > 0) {
          const audioNames = audioResult.data.map(audio => audio.title).slice(0, 2);
          displayName = `${audioNames.join('+')}${audio_ids.length > 2 ? '+' : ''}组合`;
        } else {
          displayName = `白噪音组合 (${audio_ids.length}个音频)`;
        }
      }

      // 插入收藏记录
      const insertSql = `
        INSERT INTO favorites (
          openid, audio_ids, selected_audio_ids, custom_name, 
          favorite_type, is_active
        ) VALUES (?, ?, ?, ?, 'combination', 1)
      `;

      const result = await query(insertSql, [
        openid,
        JSON.stringify(audio_ids),
        JSON.stringify(selected_audio_ids),
        displayName
      ]);

      if (!result.success) {
        throw new Error(result.error);
      }

      return {
        success: true,
        data: {
          favorite_id: result.insertId,
          audio_ids: audio_ids,
          selected_audio_ids: selected_audio_ids,
          custom_name: displayName
        },
        message: '音频组合收藏成功'
      };

    } catch (error) {
      console.error('收藏音频组合失败:', error);
      return {
        success: false,
        message: '收藏音频组合失败',
        error: error.message
      };
    }
  }

  // 白噪音组合功能：取消收藏音频组合
  static async unfavoriteCombination(openid, audioIds) {
    try {
      // 将音频ID数组排序后转换为JSON字符串进行比较
      const sortedIds = [...audioIds].sort((a, b) => a - b);
      const audioIdsJson = JSON.stringify(sortedIds);

      const sql = `
        UPDATE favorites 
        SET is_active = 0 
        WHERE openid = ? AND favorite_type = 'combination'
        AND audio_ids = ? AND is_active = 1
      `;
      
      const result = await query(sql, [openid, audioIdsJson]);
      
      if (result.affectedRows > 0) {
        return {
          success: true,
          message: '取消音频组合收藏成功'
        };
      } else {
        return {
          success: false,
          message: '音频组合收藏记录不存在'
        };
      }
    } catch (error) {
      console.error('取消音频组合收藏失败:', error);
      return {
        success: false,
        message: '取消音频组合收藏失败',
        error: error.message
      };
    }
  }

  // 白噪音组合功能：获取用户收藏的音频组合
  static async getUserCombinationFavorites(openid, options = {}) {
    try {
      const { limit = 20, offset = 0 } = options;

      const sql = `
        SELECT 
          f.favorite_id, f.audio_ids, f.selected_audio_ids, f.custom_name,
          f.created_at, f.updated_at
        FROM favorites f
        WHERE f.openid = ? AND f.favorite_type = 'combination' AND f.is_active = 1
        ORDER BY f.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const result = await query(sql, [openid, parseInt(limit), parseInt(offset)]);

      if (!result.success) {
        throw new Error(result.error);
      }

      // 解析JSON字段并获取音频详细信息
      const combinationFavorites = await Promise.all(
        result.data.map(async (favorite) => {
          const audioIds = Array.isArray(favorite.audio_ids) 
            ? favorite.audio_ids 
            : JSON.parse(favorite.audio_ids || '[]');
          const selectedAudioIds = Array.isArray(favorite.selected_audio_ids)
            ? favorite.selected_audio_ids
            : JSON.parse(favorite.selected_audio_ids || '[]');

          // 获取音频详细信息
          const audiosResult = await query(`
            SELECT 
              a.audio_id, a.title, a.audio_url, a.duration_seconds, a.cover_url,
              GROUP_CONCAT(DISTINCT ac.name) as categories
            FROM audios a
            LEFT JOIN audio_category_mapping acm ON a.audio_id = acm.audio_id
            LEFT JOIN audio_categories ac ON acm.category_id = ac.category_id
            WHERE a.audio_id IN (${audioIds.map(() => '?').join(',')})
            GROUP BY a.audio_id
            ORDER BY a.audio_id
          `, audioIds);

          const audios = audiosResult.data.map(audio => ({
            audio_id: audio.audio_id,
            title: audio.title,
            audio_url: audio.audio_url,
            duration_seconds: audio.duration_seconds,
            cover_url: audio.cover_url,
            categories: audio.categories ? audio.categories.split(',') : [],
            is_selected: selectedAudioIds.includes(audio.audio_id)
          }));

          return {
            ...favorite,
            audio_ids: audioIds,
            selected_audio_ids: selectedAudioIds,
            audios: audios,
            audio_count: audioIds.length,
            selected_count: selectedAudioIds.length
          };
        })
      );

      // 获取总数
      const countSql = `
        SELECT COUNT(*) as total_count
        FROM favorites 
        WHERE openid = ? AND favorite_type = 'combination' AND is_active = 1
      `;
      
      const countResult = await query(countSql, [openid]);

      return {
        success: true,
        data: combinationFavorites,
        total: countResult.data[0]?.total_count || 0
      };

    } catch (error) {
      console.error('获取用户音频组合收藏失败:', error);
      return {
        success: false,
        message: '获取音频组合收藏失败',
        error: error.message
      };
    }
  }
}

module.exports = Favorite;