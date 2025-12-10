const { query, transaction } = require('../config');

class WhiteNoiseCombination {
  /**
   * 随机选择3个白噪音音频
   */
  static async rollWhiteNoise(options = {}) {
    try {
      const { 
        categoryIds = [1, 4, 5], // 默认白噪音分类：自然、雨声、森林
        excludeIds = [],
        limit = 3
      } = options;

      // 先获取符合条件的音频ID
      let audioIdSql = `
        SELECT DISTINCT a.audio_id
        FROM audios a
        INNER JOIN audio_category_mapping acm ON a.audio_id = acm.audio_id
        WHERE acm.category_id IN (${categoryIds.map(() => '?').join(',')})
      `;
      
      let audioIdParams = [...categoryIds];
      
      if (excludeIds.length > 0) {
        audioIdSql += ` AND a.audio_id NOT IN (${excludeIds.map(() => '?').join(',')})`;
        audioIdParams.push(...excludeIds);
      }

      audioIdSql += ` ORDER BY RAND() LIMIT ?`;

      const audioIdResult = await query(audioIdSql, [...audioIdParams, limit]);
      
      if (!audioIdResult.success) {
        throw new Error(audioIdResult.error);
      }

      if (audioIdResult.data.length === 0) {
        return {
          success: false,
          message: '暂无可用的白噪音音频'
        };
      }

      const audioIds = audioIdResult.data.map(row => row.audio_id);

      // 获取音频详细信息
      const audiosResult = await query(`
        SELECT a.audio_id, a.title, a.audio_url, a.cover_url, a.duration_seconds, a.play_count,
               GROUP_CONCAT(DISTINCT acm.category_id) as categories
        FROM audios a
        LEFT JOIN audio_category_mapping acm ON a.audio_id = acm.audio_id
        WHERE a.audio_id IN (${audioIds.map(() => '?').join(',')})
        GROUP BY a.audio_id
        ORDER BY FIND_IN_SET(a.audio_id, '${audioIds.join(',')}')
      `, audioIds);

      if (!audiosResult.success) {
        throw new Error(audiosResult.error);
      }

      // 检查音频数据是否为空
      if (audiosResult.data.length === 0) {
        return {
          success: false,
          message: '暂无可用的白噪音音频'
        };
      }

      // 获取音频的完整分类信息
      const categoriesResult = await query(`
        SELECT acm.audio_id, ac.category_id, ac.name as category_name
        FROM audio_category_mapping acm
        INNER JOIN audio_categories ac ON acm.category_id = ac.category_id
        WHERE acm.audio_id IN (${audioIds.join(',')})
      `);

      // 构建音频详情映射
      const categoryMap = {};
      categoriesResult.data.forEach(item => {
        if (!categoryMap[item.audio_id]) {
          categoryMap[item.audio_id] = [];
        }
        categoryMap[item.audio_id].push({
          category_id: item.category_id,
          category_name: item.category_name
        });
      });

      // 组合最终数据
      const rolledAudios = audiosResult.data.map(audio => ({
        audio_id: audio.audio_id,
        title: audio.title,
        audio_url: audio.audio_url,
        duration_seconds: audio.duration_seconds,
        play_count: audio.play_count,
        main_category_name: audio.main_category_name,
        categories: categoryMap[audio.audio_id] || []
      }));

      return {
        success: true,
        data: rolledAudios,
        message: `摇骰子成功，获得${rolledAudios.length}个白噪音音频`
      };

    } catch (error) {
      console.error('摇骰子选择白噪音失败:', error);
      return {
        success: false,
        message: '摇骰子失败',
        error: error.message
      };
    }
  }

  /**
   * 创建白噪音组合
   */
  static async createCombination(openid, combinationData) {
    try {
      const { 
        name, 
        description, 
        audioIds, 
        playMode = 'mixed',
        volumeConfig,
        isPublic = false 
      } = combinationData;

      // 验证音频ID列表
      if (!Array.isArray(audioIds) || audioIds.length === 0) {
        throw new Error('音频列表不能为空');
      }

      if (audioIds.length > 10) {
        throw new Error('音频数量不能超过10个');
      }

      // 验证音频是否存在
      const audioCheckResult = await query(`
        SELECT COUNT(*) as count
        FROM audios
        WHERE audio_id IN (${audioIds.map(() => '?').join(',')})
      `, audioIds);

      if (audioCheckResult.data[0].count !== audioIds.length) {
        throw new Error('部分音频不存在');
      }

      const insertSql = `
        INSERT INTO white_noise_combinations 
        (openid, name, description, audio_ids, play_mode, volume_config, is_public)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const result = await query(insertSql, [
        openid,
        name,
        description || null,
        JSON.stringify(audioIds),
        playMode,
        volumeConfig ? JSON.stringify(volumeConfig) : null,
        isPublic ? 1 : 0
      ]);

      if (!result.success) {
        throw new Error(result.error);
      }

      return {
        success: true,
        data: {
          id: result.insertId,
          name,
          audioIds,
          playMode,
          isPublic
        },
        message: '白噪音组合创建成功'
      };

    } catch (error) {
      console.error('创建白噪音组合失败:', error);
      return {
        success: false,
        message: '创建白噪音组合失败',
        error: error.message
      };
    }
  }

  /**
   * 获取用户的组合列表
   */
  static async getUserCombinations(openid, options = {}) {
    try {
      const { 
        offset = 0, 
        limit = 20,
        isPublic = null
      } = options;

      let whereClause = 'WHERE openid = ?';
      let params = [openid];

      if (isPublic !== null) {
        whereClause += ' AND is_public = ?';
        params.push(isPublic ? 1 : 0);
      }

      const result = await query(`
        SELECT 
          id, name, description, audio_ids, play_mode, volume_config,
          is_public, play_count, favorite_count, created_at, updated_at
        FROM white_noise_combinations
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `, [...params, parseInt(limit), parseInt(offset)]);

      // 解析JSON字段
      const combinations = result.data.map(combination => ({
        ...combination,
        audio_ids: JSON.parse(combination.audio_ids),
        volume_config: combination.volume_config ? JSON.parse(combination.volume_config) : null
      }));

      return {
        success: true,
        data: combinations,
        message: '获取组合列表成功'
      };

    } catch (error) {
      console.error('获取用户组合列表失败:', error);
      return {
        success: false,
        message: '获取组合列表失败',
        error: error.message
      };
    }
  }

  /**
   * 获取组合详情
   */
  static async getCombinationById(id, openid = null) {
    try {
      let whereClause = 'WHERE id = ?';
      let params = [id];

      // 如果提供了openid，检查权限
      if (openid) {
        whereClause += ' AND (openid = ? OR is_public = 1)';
        params.push(openid);
      }

      const result = await query(`
        SELECT 
          id, name, description, audio_ids, play_mode, volume_config,
          is_public, play_count, favorite_count, created_at, updated_at
        FROM white_noise_combinations
        ${whereClause}
      `, params);

      if (!result.success || result.data.length === 0) {
        return {
          success: false,
          message: '组合不存在或无权限访问'
        };
      }

      const combination = result.data[0];
      
      // 解析JSON字段
      combination.audio_ids = JSON.parse(combination.audio_ids);
      combination.volume_config = combination.volume_config ? JSON.parse(combination.volume_config) : null;

      // 获取音频详情
      if (combination.audio_ids.length > 0) {
        const audiosResult = await query(`
          SELECT a.audio_id, a.title, a.audio_url, a.duration_seconds,
                 GROUP_CONCAT(ac.category_id) as categories
          FROM audios a
          LEFT JOIN audio_category_mapping ac ON a.audio_id = ac.audio_id
          WHERE a.audio_id IN (${combination.audio_ids.map(() => '?').join(',')})
          GROUP BY a.audio_id
        `, combination.audio_ids);

        combination.audios = audiosResult.data.map(audio => ({
          ...audio,
          categories: audio.categories ? audio.categories.split(',').map(id => parseInt(id)) : []
        }));
      } else {
        combination.audios = [];
      }

      return {
        success: true,
        data: combination,
        message: '获取组合详情成功'
      };

    } catch (error) {
      console.error('获取组合详情失败:', error);
      return {
        success: false,
        message: '获取组合详情失败',
        error: error.message
      };
    }
  }

  /**
   * 播放组合（记录播放历史）
   */
  static async playCombination(combinationId, openid, playData = {}) {
    try {
      const { 
        playDuration = 0, 
        playMode, 
        deviceInfo = 'unknown' 
      } = playData;

      // 先检查组合是否存在
      const combinationResult = await this.getCombinationById(combinationId, openid);
      if (!combinationResult.success) {
        return combinationResult;
      }

      // 记录播放历史
      const insertSql = `
        INSERT INTO combination_play_history 
        (combination_id, openid, play_duration, play_mode, device_info)
        VALUES (?, ?, ?, ?, ?)
      `;

      const historyResult = await query(insertSql, [
        combinationId,
        openid || null,
        playDuration,
        playMode || null,
        deviceInfo
      ]);

      // 更新播放次数
      await query(`
        UPDATE white_noise_combinations 
        SET play_count = play_count + 1
        WHERE id = ?
      `, [combinationId]);

      if (!historyResult.success) {
        throw new Error(historyResult.error);
      }

      return {
        success: true,
        data: {
          combinationId,
          playDuration,
          historyId: historyResult.insertId
        },
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
   * 收藏组合
   */
  static async favoriteCombination(combinationId, openid) {
    try {
      // 检查是否已收藏
      const checkResult = await query(`
        SELECT id FROM combination_favorites 
        WHERE combination_id = ? AND openid = ?
      `, [combinationId, openid]);

      if (checkResult.success && checkResult.data.length > 0) {
        return {
          success: false,
          message: '已经收藏过该组合'
        };
      }

      // 添加收藏
      const insertResult = await query(`
        INSERT INTO combination_favorites (combination_id, openid)
        VALUES (?, ?)
      `, [combinationId, openid]);

      // 更新收藏次数
      await query(`
        UPDATE white_noise_combinations 
        SET favorite_count = favorite_count + 1
        WHERE id = ?
      `, [combinationId]);

      if (!insertResult.success) {
        throw new Error(insertResult.error);
      }

      return {
        success: true,
        data: { combinationId, favoriteId: insertResult.insertId },
        message: '收藏成功'
      };

    } catch (error) {
      console.error('收藏组合失败:', error);
      return {
        success: false,
        message: '收藏失败',
        error: error.message
      };
    }
  }

  /**
   * 取消收藏组合
   */
  static async unfavoriteCombination(combinationId, openid) {
    try {
      const result = await query(`
        DELETE FROM combination_favorites 
        WHERE combination_id = ? AND openid = ?
      `, [combinationId, openid]);

      if (!result.success) {
        throw new Error(result.error);
      }

      if (result.affectedRows === 0) {
        return {
          success: false,
          message: '未收藏过该组合'
        };
      }

      // 更新收藏次数
      await query(`
        UPDATE white_noise_combinations 
        SET favorite_count = GREATEST(favorite_count - 1, 0)
        WHERE id = ?
      `, [combinationId]);

      return {
        success: true,
        data: { combinationId },
        message: '取消收藏成功'
      };

    } catch (error) {
      console.error('取消收藏失败:', error);
      return {
        success: false,
        message: '取消收藏失败',
        error: error.message
      };
    }
  }

  /**
   * 获取公开的组合列表
   */
  static async getPublicCombinations(options = {}) {
    try {
      const { 
        offset = 0, 
        limit = 20,
        orderBy = 'play_count',
        order = 'DESC'
      } = options;

      const result = await query(`
        SELECT 
          id, name, description, audio_ids, play_mode,
          play_count, favorite_count, created_at,
          (SELECT nickname FROM users WHERE openid = white_noise_combinations.openid) as creator_name
        FROM white_noise_combinations
        WHERE is_public = 1
        ORDER BY ${orderBy} ${order}
        LIMIT ? OFFSET ?
      `, [parseInt(limit), parseInt(offset)]);

      // 解析JSON字段
      const combinations = result.data.map(combination => ({
        ...combination,
        audio_ids: JSON.parse(combination.audio_ids),
        is_favorited: false // 这个需要在前端根据用户状态设置
      }));

      return {
        success: true,
        data: combinations,
        message: '获取公开组合列表成功'
      };

    } catch (error) {
      console.error('获取公开组合列表失败:', error);
      return {
        success: false,
        message: '获取公开组合列表失败',
        error: error.message
      };
    }
  }
}

module.exports = WhiteNoiseCombination;