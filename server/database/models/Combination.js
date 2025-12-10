const { query } = require('../config');

/**
 * 组合音频管理模型类
 */
class CombinationModel {
  
  /**
   * 创建组合音频
   */
  static async createCombination(openid, combinationData) {
    try {
      const { name, audio_ids, is_system = false, is_active = true } = combinationData;
      
      // 验证参数
      if (!name || !audio_ids || !Array.isArray(audio_ids) || audio_ids.length === 0) {
        throw new Error('组合名称和音频ID数组不能为空');
      }
      
      // 验证音频数量（1-3个）
      if (audio_ids.length < 1 || audio_ids.length > 3) {
        throw new Error('组合音频数量必须在1-3个之间');
      }
      
      // 验证音频是否存在
      const audioCheckSql = `SELECT audio_id FROM audios WHERE audio_id IN (?) AND is_public = 1`;
      const audioCheckResult = await query(audioCheckSql, [audio_ids]);
      
      if (!audioCheckResult.success || audioCheckResult.data.length !== audio_ids.length) {
        throw new Error('部分音频不存在或无权限访问');
      }
      
      const sql = `
        INSERT INTO combinations (
          openid, name, audio_ids, is_system, is_active
        ) VALUES (?, ?, ?, ?, ?)
      `;
      
      const params = [
        openid,
        name,
        JSON.stringify(audio_ids),
        is_system ? 1 : 0,
        is_active ? 1 : 0
      ];
      
      const result = await query(sql, params);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return {
        success: true,
        combination_id: result.data.insertId,
        message: '组合创建成功'
      };
    } catch (error) {
      console.error('创建组合音频失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取组合音频详情
   */
  static async getCombinationDetail(combinationId, openid = null) {
    try {
      const sql = `
        SELECT 
          c.combination_id, c.openid, c.name, c.audio_ids, c.is_system, c.is_active,
          c.created_at, c.updated_at,
          u.nickname as owner_nickname, u.avatar_url as owner_avatar
        FROM combinations c
        LEFT JOIN users u ON c.openid = u.openid
        WHERE c.combination_id = ?
      `;
      
      const result = await query(sql, [combinationId]);
      
      if (!result.success || result.data.length === 0) {
        return { success: false, error: '组合不存在' };
      }
      
      const combination = result.data[0];
      
      // 权限检查：非系统组合只能由创建者访问
      if (!combination.is_system && openid && combination.openid !== openid) {
        return { success: false, error: '无权限访问此组合' };
      }
      
      // 获取组合中的音频详情
      const audioIds = JSON.parse(combination.audio_ids);
      const audioDetails = await this.getAudioDetailsByIds(audioIds);
      
      return {
        success: true,
        data: {
          ...combination,
          audio_ids: audioIds,
          audio_details: audioDetails
        }
      };
    } catch (error) {
      console.error('获取组合详情失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取用户的所有组合
   */
  static async getUserCombinations(openid, options = {}) {
    try {
      const { limit = 20, offset = 0, include_system = false } = options;
      
      let sql = `
        SELECT 
          c.combination_id, c.openid, c.name, c.audio_ids, c.is_system, c.is_active,
          c.created_at, c.updated_at
        FROM combinations c
        WHERE c.is_active = 1
      `;
      
      const params = [];
      
      if (include_system) {
        sql += ` AND (c.openid = ? OR c.is_system = 1)`;
        params.push(openid);
      } else {
        sql += ` AND c.openid = ?`;
        params.push(openid);
      }
      
      sql += ` ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), parseInt(offset));
      
      const result = await query(sql, params);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // 获取每个组合的音频详情
      const combinationsWithDetails = await Promise.all(
        result.data.map(async (combination) => {
          const audioIds = JSON.parse(combination.audio_ids);
          const audioDetails = await this.getAudioDetailsByIds(audioIds);
          return {
            ...combination,
            audio_ids: audioIds,
            audio_details: audioDetails
          };
        })
      );
      
      return {
        success: true,
        data: combinationsWithDetails
      };
    } catch (error) {
      console.error('获取用户组合失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取系统推荐组合
   */
  static async getSystemCombinations(options = {}) {
    try {
      const { limit = 10, offset = 0 } = options;
      
      const sql = `
        SELECT 
          c.combination_id, c.openid, c.name, c.audio_ids, c.is_system, c.is_active,
          c.created_at, c.updated_at
        FROM combinations c
        WHERE c.is_system = 1 AND c.is_active = 1
        ORDER BY c.created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      const result = await query(sql, [parseInt(limit), parseInt(offset)]);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // 获取每个组合的音频详情
      const combinationsWithDetails = await Promise.all(
        result.data.map(async (combination) => {
          const audioIds = JSON.parse(combination.audio_ids);
          const audioDetails = await this.getAudioDetailsByIds(audioIds);
          return {
            ...combination,
            audio_ids: audioIds,
            audio_details: audioDetails
          };
        })
      );
      
      return {
        success: true,
        data: combinationsWithDetails
      };
    } catch (error) {
      console.error('获取系统组合失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 骰子随机算法 - 增强版，支持不同类型骰子和智能推荐
   */
  static async diceRandomCombination(openid, preferences = {}) {
    try {
      const { 
        category_id = null, 
        max_duration = null, 
        audio_count = 3,
        dice_type = 'normal', // normal, weighted, thematic
        theme = null // 主题：relaxation, focus, sleep, meditation
      } = preferences;
      
      // 骰子类型配置
      const diceConfigs = {
        normal: {
          min: 1,
          max: 6,
          multiplier: 1.0
        },
        weighted: {
          min: 1,
          max: 12,
          multiplier: 0.8
        },
        thematic: {
          min: 1,
          max: 20,
          multiplier: 1.2
        }
      };
      
      const config = diceConfigs[dice_type] || diceConfigs.normal;
      
      // 基础查询：获取可用的公开音频
      let sql = `
        SELECT audio_id, title, duration_seconds, type, tags
        FROM audios
        WHERE is_public = 1
      `;
      
      const params = [];
      
      // 按分类筛选
      if (category_id) {
        sql += ` AND audio_id IN (
          SELECT audio_id FROM audio_category_mapping 
          WHERE category_id IN (
            SELECT category_id FROM audio_categories 
            WHERE category_id = ? OR parent_id = ?
          )
        )`;
        params.push(category_id, category_id);
      }
      
      // 按主题筛选
      if (theme) {
        sql += ` AND (type LIKE ? OR tags LIKE ?)`;
        params.push(`%${theme}%`, `%${theme}%`);
      }
      
      // 按时长筛选
      if (max_duration) {
        sql += ` AND (duration_seconds <= ? OR duration_seconds IS NULL)`;
        params.push(max_duration);
      }
      
      const result = await query(sql, params);
      
      if (!result.success || result.data.length === 0) {
        return { success: false, error: '没有符合条件的音频' };
      }
      
      const availableAudios = result.data;
      
      // 智能选择算法：考虑音频类型平衡
      const selectedAudios = this.intelligentAudioSelection(availableAudios, audio_count, config);
      
      const audioIds = selectedAudios.map(audio => audio.audio_id);
      
      // 智能命名组合
      const combinationName = this.generateCombinationName(selectedAudios, theme);
      
      // 获取推荐配置
      const recommendedConfig = this.getRecommendedPlaybackConfig(selectedAudios);
      
      // 创建临时组合
      const combination = {
        name: combinationName,
        audio_ids: audioIds,
        audio_details: await this.getAudioDetailsByIds(audioIds),
        recommended_config: recommendedConfig,
        dice_type: dice_type,
        theme: theme
      };
      
      return {
        success: true,
        data: combination,
        source: 'dice',
        metadata: {
          total_available: availableAudios.length,
          selection_algorithm: 'intelligent',
          dice_config: config
        }
      };
    } catch (error) {
      console.error('骰子随机算法失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 智能音频选择算法
   */
  static intelligentAudioSelection(audios, count, config) {
    // 按类型分组
    const audioByType = {};
    audios.forEach(audio => {
      const type = audio.type || 'other';
      if (!audioByType[type]) {
        audioByType[type] = [];
      }
      audioByType[type].push(audio);
    });
    
    // 计算每种类型应该选择的数量
    const typeCounts = this.calculateTypeDistribution(Object.keys(audioByType), count);
    
    const selectedAudios = [];
    
    // 从每种类型中随机选择
    Object.entries(typeCounts).forEach(([type, typeCount]) => {
      const typeAudios = audioByType[type] || [];
      if (typeAudios.length > 0) {
        const shuffled = this.shuffleArray(typeAudios);
        selectedAudios.push(...shuffled.slice(0, typeCount));
      }
    });
    
    // 如果选择的音频数量不足，从其他类型补充
    if (selectedAudios.length < count) {
      const remainingCount = count - selectedAudios.length;
      const remainingAudios = audios.filter(audio => 
        !selectedAudios.some(selected => selected.audio_id === audio.audio_id)
      );
      const shuffled = this.shuffleArray(remainingAudios);
      selectedAudios.push(...shuffled.slice(0, remainingCount));
    }
    
    return selectedAudios.slice(0, count);
  }

  /**
   * 计算类型分布
   */
  static calculateTypeDistribution(types, totalCount) {
    const distribution = {};
    const typeCount = types.length;
    
    if (typeCount === 0) {
      return { other: totalCount };
    }
    
    // 基础分配：每种类型至少1个
    types.forEach(type => {
      distribution[type] = 1;
    });
    
    // 剩余数量按类型比例分配
    const remaining = totalCount - types.length;
    if (remaining > 0) {
      const equalShare = Math.floor(remaining / typeCount);
      types.forEach(type => {
        distribution[type] += equalShare;
      });
      
      // 处理余数
      const remainder = remaining % typeCount;
      for (let i = 0; i < remainder; i++) {
        distribution[types[i % typeCount]] += 1;
      }
    }
    
    return distribution;
  }

  /**
   * 生成组合名称
   */
  static generateCombinationName(audios, theme = null) {
    const themes = [
      '宁静时光', '专注时刻', '放松空间', '冥想角落',
      '自然之声', '城市韵律', '海洋之歌', '森林密语'
    ];
    
    if (theme) {
      const themeNames = {
        relaxation: '放松',
        focus: '专注',
        sleep: '睡眠',
        meditation: '冥想'
      };
      return `${themeNames[theme] || theme}组合-${new Date().toLocaleDateString()}`;
    }
    
    // 基于音频类型推断主题
    const types = audios.map(audio => audio.type).filter(Boolean);
    if (types.includes('rain') || types.includes('water')) {
      return `雨声组合-${new Date().toLocaleDateString()}`;
    }
    if (types.includes('forest') || types.includes('birds')) {
      return `自然组合-${new Date().toLocaleDateString()}`;
    }
    
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    return `${randomTheme}-${new Date().toLocaleDateString()}`;
  }

  /**
   * 获取推荐的播放配置
   */
  static getRecommendedPlaybackConfig(audios) {
    const volumeConfig = {};
    const speedConfig = {};
    
    audios.forEach(audio => {
      const type = audio.type || 'other';
      
      // 根据音频类型设置推荐音量和速度
      switch (type) {
        case 'rain':
        case 'water':
          volumeConfig[audio.audio_id] = 0.7;
          speedConfig[audio.audio_id] = 1.0;
          break;
        case 'forest':
        case 'birds':
          volumeConfig[audio.audio_id] = 0.8;
          speedConfig[audio.audio_id] = 1.0;
          break;
        case 'white_noise':
          volumeConfig[audio.audio_id] = 0.4;
          speedConfig[audio.audio_id] = 1.0;
          break;
        case 'meditation':
          volumeConfig[audio.audio_id] = 0.6;
          speedConfig[audio.audio_id] = 0.8;
          break;
        default:
          volumeConfig[audio.audio_id] = 0.7;
          speedConfig[audio.audio_id] = 1.0;
      }
    });
    
    return {
      volume_config: volumeConfig,
      speed_config: speedConfig,
      recommendation_note: '基于音频类型智能推荐'
    };
  }

  /**
   * 更新组合音频
   */
  static async updateCombination(combinationId, openid, updates) {
    try {
      // 验证组合存在性和权限
      const combinationResult = await this.getCombinationDetail(combinationId);
      if (!combinationResult.success) {
        throw new Error('组合不存在');
      }
      
      const combination = combinationResult.data;
      
      // 权限检查：只有创建者可以更新
      if (combination.openid !== openid) {
        throw new Error('无权限更新此组合');
      }
      
      // 构建更新字段
      const fields = [];
      const params = [];
      
      Object.keys(updates).forEach(key => {
        if (key === 'audio_ids' && Array.isArray(updates[key])) {
          // 验证音频数量
          if (updates[key].length < 1 || updates[key].length > 3) {
            throw new Error('组合音频数量必须在1-3个之间');
          }
          
          // 验证音频存在
          const audioIds = updates[key];
          const audioCheckSql = `SELECT audio_id FROM audios WHERE audio_id IN (?) AND is_public = 1`;
          const audioCheckResult = query(audioCheckSql, [audioIds]);
          
          if (!audioCheckResult.success || audioCheckResult.data.length !== audioIds.length) {
            throw new Error('部分音频不存在或无权限访问');
          }
          
          fields.push(`${key} = ?`);
          params.push(JSON.stringify(audioIds));
        } else if (key !== 'combination_id' && key !== 'openid') {
          fields.push(`${key} = ?`);
          params.push(updates[key]);
        }
      });
      
      if (fields.length === 0) {
        return { success: true, message: '无需更新' };
      }
      
      params.push(combinationId);
      
      const sql = `UPDATE combinations SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE combination_id = ?`;
      const result = await query(sql, params);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return { success: true, message: '组合更新成功' };
    } catch (error) {
      console.error('更新组合失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 删除组合音频
   */
  static async deleteCombination(combinationId, openid) {
    try {
      // 验证组合存在性和权限
      const combinationResult = await this.getCombinationDetail(combinationId);
      if (!combinationResult.success) {
        throw new Error('组合不存在');
      }
      
      const combination = combinationResult.data;
      
      // 权限检查：只有创建者可以删除
      if (combination.openid !== openid) {
        throw new Error('无权限删除此组合');
      }
      
      const sql = `DELETE FROM combinations WHERE combination_id = ?`;
      const result = await query(sql, [combinationId]);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return { success: true, message: '组合删除成功' };
    } catch (error) {
      console.error('删除组合失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 辅助方法：获取音频详情
   */
  static async getAudioDetailsByIds(audioIds) {
    try {
      if (!audioIds || audioIds.length === 0) return [];
      
      const sql = `
        SELECT 
          a.audio_id, a.title, a.description, a.cover_url, a.audio_url, 
          a.duration_seconds, a.is_free,
          u.nickname as owner_nickname, u.avatar_url as owner_avatar
        FROM audios a
        LEFT JOIN users u ON a.owner_openid = u.openid
        WHERE a.audio_id IN (?)
      `;
      
      const result = await query(sql, [audioIds]);
      
      if (!result.success) {
        return [];
      }
      
      return result.data;
    } catch (error) {
      console.error('获取音频详情失败:', error);
      return [];
    }
  }

  /**
   * 辅助方法：随机打乱数组
   */
  static shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }
}

module.exports = CombinationModel;