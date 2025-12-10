const express = require('express')
const multer = require('multer')
const router = express.Router()

// 导入认证中间件
const { authenticateToken } = require('./middleware/auth')

// MySQL音频模型
const AudioModel = require('./database/models/Audio')
const { query } = require('./database/config')

// 配置multer用于文件上传（内存存储）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB限制
  },
  fileFilter: (req, file, cb) => {
    // 检查文件类型
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的图片格式，支持：JPEG, PNG, GIF, WebP, BMP'), false);
    }
  }
});

// 导入图片上传服务
const imageUploadService = require('./services/imageUploadService');

// 智能搜索音频（必须在 /:id 之前）
router.get('/search', async (req, res) => {
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
    } = req.query;

    // 验证搜索关键词
    if (!keyword.trim() && !category && !type && !tags) {
      return res.status(400).json({
        success: false,
        message: '请提供搜索关键词或筛选条件'
      });
    }

    // 构建查询条件
    let whereConditions = [];
    let params = [];

    // 关键词搜索（增强搜索能力）
    if (keyword && keyword.trim()) {
      whereConditions.push('(a.title LIKE ? OR a.description LIKE ? OR ac.name LIKE ?)');
      const searchTerm = `%${keyword.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // 分类筛选 - 通过音频分类映射表进行筛选
    if (category) {
      whereConditions.push(`a.audio_id IN (
        SELECT acm.audio_id 
        FROM audio_category_mapping acm 
        WHERE acm.category_id = ?
      )`);
      params.push(parseInt(category));
    }

    // 类型筛选
    if (type) {
      whereConditions.push('type = ?');
      params.push(type);
    }

    // 时长筛选
    if (duration_min !== null && !isNaN(parseInt(duration_min))) {
      whereConditions.push('duration_seconds >= ?');
      params.push(parseInt(duration_min));
    }
    if (duration_max !== null && !isNaN(parseInt(duration_max))) {
      whereConditions.push('duration_seconds <= ?');
      params.push(parseInt(duration_max));
    }

      // 如果没有任何条件，则返回空结果（避免返回所有数据）
    if (whereConditions.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供搜索关键词或筛选条件'
      });
    }

    // 排序
    let orderClause = 'ORDER BY ';
    switch (sort_by) {
      case 'popularity':
        orderClause += 'a.play_count DESC, a.created_at DESC';
        break;
      case 'latest':
        orderClause += 'a.created_at DESC';
        break;
      default: // relevance
        orderClause += 'a.play_count DESC, a.created_at DESC';
    }

    // 分页
    const limitNum = Math.min(parseInt(limit) || 20, 100); // 最大限制100条
    const offsetNum = parseInt(offset) || 0;
    
    const limitClause = `LIMIT ? OFFSET ?`;
    params.push(limitNum, offsetNum);

    // 构建完整查询（包含分类信息）
    const baseQuery = `
      SELECT 
        a.audio_id,
        a.title,
        a.description,
        a.cover_url,
        a.audio_url,
        a.duration_seconds,
        a.is_public,
        a.type,
        a.is_user_creation,
        a.is_free,
        a.created_at,
        a.updated_at,
        GROUP_CONCAT(DISTINCT ac.name) as categories
      FROM audios a
      LEFT JOIN audio_category_mapping acm ON a.audio_id = acm.audio_id
      LEFT JOIN audio_categories ac ON acm.category_id = ac.category_id
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY a.audio_id
      ${orderClause}
      ${limitClause}
    `;

    // 查询总数
    const countQuery = `
      SELECT COUNT(DISTINCT a.audio_id) as total 
      FROM audios a
      LEFT JOIN audio_category_mapping acm ON a.audio_id = acm.audio_id
      ${whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : ''}
    `;

    // 去掉最后两个参数（LIMIT和OFFSET）用于计数查询
    const countParams = params.slice(0, -2);

    try {
      // 执行查询
      const [audiosResult, countResult] = await Promise.all([
        query(baseQuery, params),
        query(countQuery, countParams)
      ]);

      const audios = audiosResult.success ? audiosResult.data : [];
      const total = countResult.success && countResult.data[0] ? countResult.data[0].total : 0;

      res.json({
        success: true,
        data: audios,
        total: total,
        search_params: {
          keyword: keyword.trim(),
          category,
          type,
          tags,
          duration_min,
          duration_max,
          sort_by
        }
      });
    } catch (dbError) {
      console.error('数据库查询错误:', dbError);
      
      // 如果数据库查询失败，返回空结果而不是错误
      res.json({
        success: true,
        data: [],
        total: 0,
        search_params: {
          keyword: keyword.trim(),
          category,
          type,
          tags,
          duration_min,
          duration_max,
          sort_by
        }
      });
    }
  } catch (error) {
    console.error('搜索音频失败:', error);
    res.status(500).json({
      success: false,
      message: '搜索音频失败',
      error: error.message
    });
  }
});

// 获取热门标签（基于音频分类）
router.get('/tags/popular', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const limitNum = Math.min(parseInt(limit) || 20, 100);

      // 从音频分类表中获取热门分类
      const categoryQuery = `
        SELECT 
          ac.category_id,
          ac.name as tag_name,
          COUNT(acm.audio_id) as usage_count,
          'category' as category
        FROM audio_categories ac
        LEFT JOIN audio_category_mapping acm ON ac.category_id = acm.category_id 
        GROUP BY ac.category_id, ac.name
        HAVING usage_count > 0
        ORDER BY usage_count DESC
        LIMIT ?
      `;

    try {
      const categoriesResult = await query(categoryQuery, [limitNum]);
      
      if (categoriesResult.success && categoriesResult.data.length > 0) {
        res.json({
          success: true,
          data: categoriesResult.data,
          total: categoriesResult.data.length
        });
      } else {
        // 如果分类查询没有结果，直接返回分类表数据作为标签
        const fallbackQuery = `
          SELECT 
            category_id,
            name as tag_name,
            (SELECT COUNT(*) FROM audio_category_mapping WHERE category_id = ac.category_id) as usage_count,
            'category' as category
          FROM audio_categories ac
          ORDER BY usage_count DESC, category_id ASC
          LIMIT ?
        `;

        try {
          const fallbackResult = await query(fallbackQuery, [limitNum]);
          
          if (fallbackResult.success && fallbackResult.data.length > 0) {
            res.json({
              success: true,
              data: fallbackResult.data,
              total: fallbackResult.data.length
            });
          } else {
            // 最终回退：返回分类名称作为标签
            const simpleQuery = `
              SELECT 
                category_id,
                name as tag_name,
                1 as usage_count,
                'category' as category
              FROM audio_categories
              ORDER BY category_id ASC
              LIMIT ?
            `;
            
            const simpleResult = await query(simpleQuery, [limitNum]);
            
            res.json({
              success: true,
              data: simpleResult.success ? simpleResult.data : [],
              total: simpleResult.success ? simpleResult.data.length : 0
            });
          }
        } catch (fallbackError) {
          console.error('备用查询错误:', fallbackError);
          
          // 最终回退：返回分类名称作为标签
          const simpleQuery = `
            SELECT 
              category_id,
              name as tag_name,
              1 as usage_count,
              'category' as category
            FROM audio_categories
            ORDER BY category_id ASC
            LIMIT ?
          `;
          
          const simpleResult = await query(simpleQuery, [limitNum]);
          
          res.json({
            success: true,
            data: simpleResult.success ? simpleResult.data : [],
            total: simpleResult.success ? simpleResult.data.length : 0
          });
        }
      }
    } catch (dbError) {
      console.error('数据库查询错误:', dbError);
      
      // 最终回退：返回分类名称作为标签
      const simpleQuery = `
        SELECT 
          category_id,
          name as tag_name,
          1 as usage_count,
          'category' as category
        FROM audio_categories
        ORDER BY category_id ASC
        LIMIT ?
      `;
      
      const simpleResult = await query(simpleQuery, [limitNum]);
      
      res.json({
        success: true,
        data: simpleResult.success ? simpleResult.data : [],
        total: simpleResult.success ? simpleResult.data.length : 0
      });
    }
  } catch (error) {
    console.error('获取热门标签失败:', error);
    res.status(500).json({
      success: false,
      message: '获取热门标签失败',
      error: error.message
    });
  }
});

// 根据标签获取音频（基于分类名称或类型）
router.get('/tag/:tagName', async (req, res) => {
  try {
    const { tagName } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    if (!tagName || tagName.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '标签名称不能为空'
      });
    }

    const searchTerm = tagName.trim();
    const limitNum = Math.min(parseInt(limit) || 20, 100);
    const offsetNum = parseInt(offset) || 0;

    // 改为通过分类名称进行模糊搜索
    const categoryQuery = `
      SELECT 
        a.audio_id,
        a.title,
        a.description,
        a.cover_url,
        a.audio_url,
        a.duration_seconds,
        a.is_public,
        a.type,
        a.is_user_creation,
        a.is_free,
        a.play_count,
        a.created_at,
        a.updated_at,
        GROUP_CONCAT(DISTINCT ac.name) as category_names
      FROM audios a
      LEFT JOIN audio_category_mapping acm ON a.audio_id = acm.audio_id
      LEFT JOIN audio_categories ac ON acm.category_id = ac.category_id
      WHERE a.is_public = 1
      AND ac.name LIKE ?
      GROUP BY a.audio_id
      ORDER BY a.play_count DESC, a.created_at DESC
      LIMIT ? OFFSET ?
    `;

    // 计数查询
    const countQuery = `
      SELECT COUNT(DISTINCT a.audio_id) as total 
      FROM audios a
      LEFT JOIN audio_category_mapping acm ON a.audio_id = acm.audio_id
      LEFT JOIN audio_categories ac ON acm.category_id = ac.category_id
      WHERE a.is_public = 1
      AND ac.name LIKE ?
    `;

    try {
      // 使用模糊搜索匹配分类名称
      const searchTermWithWildcards = `%${searchTerm}%`;
      const categoryResult = await query(categoryQuery, [searchTermWithWildcards, limitNum, offsetNum]);
      let audios = categoryResult.success ? categoryResult.data : [];

      // 获取总数
      const countResult = await query(countQuery, [searchTermWithWildcards]);
      const total = (countResult.success && countResult.data[0]) ? countResult.data[0].total : 0;

      res.json({
        success: true,
        data: audios,
        total: total
      });
    } catch (dbError) {
      console.error('数据库查询错误:', dbError);
      
      // 如果数据库查询失败，返回空结果而不是错误
      res.json({
        success: true,
        data: [],
        total: 0
      });
    }
  } catch (error) {
    console.error('根据标签获取音频失败:', error);
    
    // 如果数据库查询失败，返回空结果而不是错误
    res.json({
      success: true,
      data: [],
      total: 0
    });
  }
});

// 获取音频列表
router.get('/', async (req, res) => {
  try {
    const { 
      category_id, 
      my_creations, 
      user_creations,
      limit = 20, 
      offset = 0,
      orderBy = 'play_count',
      order = 'DESC'
    } = req.query;

    // 处理用户认证逻辑
    let openid = req.openid; // 从中间件获取（如果有）
    
    // 如果请求用户创作音频但没有openid，返回错误
    if (user_creations === 'true' && !openid) {
      return res.status(401).json({
        success: false,
        message: '获取用户创作音频需要用户登录'
      });
    }
    
    // 如果请求"我的创作"分类但没有openid，返回错误
    if (category_id === 'my_creations' && !openid) {
      return res.status(401).json({
        success: false,
        message: '获取"我的创作"分类需要用户登录'
      });
    }

    const audios = await AudioModel.getAudios({
      category_id,
      user_creations: user_creations === 'true',
      openid: openid,  // 从中间件获取（可能为undefined）
      limit,
      offset,
      orderBy,
      order
    });

    res.json({
      success: true,
      data: audios || [],
      total: audios ? audios.length : 0
    });
  } catch (error) {
    console.error('获取音频列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取音频列表失败',
      error: error.message
    });
  }
});



/**
 * 直接列表选择白噪音组合
 * POST /api/audios/white-noise/direct-select
 */
router.post('/white-noise/direct-select', async (req, res) => {
  try {
    const {
      openid,
      audio_ids,
      selected_audio_ids,
      play_mode = 'parallel',
      timer_minutes = 0
    } = req.body;

    // 验证参数
    if (!openid) {
      return res.status(400).json({
        success: false,
        message: '用户标识不能为空'
      });
    }

    if (!audio_ids || !Array.isArray(audio_ids) || audio_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '音频ID列表不能为空'
      });
    }

    if (!selected_audio_ids || !Array.isArray(selected_audio_ids) || selected_audio_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '已选音频ID列表不能为空'
      });
    }

    // 获取音频详细信息
    const placeholders = audio_ids.map(() => '?').join(',');
    const sql = `
      SELECT 
        a.audio_id, a.title, a.description, a.cover_url, a.audio_url,
        a.duration_seconds, a.type,
        GROUP_CONCAT(DISTINCT ac.name) as categories
      FROM audios a
      LEFT JOIN audio_category_mapping acm ON a.audio_id = acm.audio_id
      LEFT JOIN audio_categories ac ON acm.category_id = ac.category_id
      WHERE a.audio_id IN (${placeholders}) AND a.is_public = 1
      GROUP BY a.audio_id
    `;

    const result = await query(sql, audio_ids);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '获取音频信息失败',
        error: result.error
      });
    }

    // 构建播放配置
    const playConfig = {
      mode: play_mode,
      tracks: result.data.map(audio => ({
        audio_id: audio.audio_id,
        title: audio.title,
        description: audio.description,
        cover_url: audio.cover_url,
        audio_url: audio.audio_url,
        duration_seconds: audio.duration_seconds,
        categories: audio.categories ? audio.categories.split(',') : [],
        is_selected: selected_audio_ids.includes(audio.audio_id),
        is_disabled: !selected_audio_ids.includes(audio.audio_id),
        volume: 0.7,
        effects: {
          fade_in: 2,
          fade_out: 3,
          loop: true
        }
      })),
      total_duration: Math.max(...result.data.map(audio => audio.duration_seconds || 0)),
      combination_id: `direct_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timer_minutes: timer_minutes
    };

    res.json({
      success: true,
      data: playConfig,
      message: '直接列表选择播放配置生成成功'
    });

  } catch (error) {
    console.error('直接列表选择失败:', error);
    res.status(500).json({
      success: false,
      message: '直接列表选择失败',
      error: error.message
    });
  }
});

/**
 * 记录组合播放历史
 * POST /api/audios/white-noise/record-play
 */
router.post('/white-noise/record-play', async (req, res) => {
  try {
    const {
      openid,
      audio_ids,
      selected_audio_ids,
      play_mode = 'parallel',
      play_duration = 0,
      timer_minutes = 0
    } = req.body;

    // 验证参数
    if (!openid) {
      return res.status(400).json({
        success: false,
        message: '用户标识不能为空'
      });
    }

    if (!audio_ids || !Array.isArray(audio_ids) || audio_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '音频ID列表不能为空'
      });
    }

    if (!selected_audio_ids || !Array.isArray(selected_audio_ids)) {
      return res.status(400).json({
        success: false,
        message: '已选音频ID列表不能为空'
      });
    }

    const PlayHistory = require('./database/models/PlayHistory');
    
    // 记录播放历史
    const playResult = await PlayHistory.recordPlay({
      openid: openid,
      audio_ids: audio_ids,
      selected_audio_ids: selected_audio_ids,
      play_type: 'combination',
      play_mode: play_mode,
      play_duration: play_duration,
      timer_minutes: timer_minutes
    });

    if (!playResult.success) {
      return res.status(400).json({
        success: false,
        message: playResult.message || '记录播放历史失败',
        error: playResult.error
      });
    }

    // 增加播放计数
    for (const audioId of selected_audio_ids) {
      await AudioModel.recordPlay(openid, parseInt(audioId), {
        play_duration: play_duration,
        timer_minutes: timer_minutes
      });
    }

    res.json({
      success: true,
      data: playResult.data,
      message: '播放记录成功'
    });

  } catch (error) {
    console.error('记录播放历史失败:', error);
    res.status(500).json({
      success: false,
      message: '记录播放历史失败',
      error: error.message
    });
  }
});

/**
 * 收藏/取消收藏音频组合
 * POST /api/audios/white-noise/favorite
 */
router.post('/white-noise/favorite', async (req, res) => {
  try {
    const {
      openid,
      audio_ids,
      selected_audio_ids,
      custom_name = null,
      description = null
    } = req.body;

    // 验证参数
    if (!openid) {
      return res.status(400).json({
        success: false,
        message: '用户标识不能为空'
      });
    }

    if (!audio_ids || !Array.isArray(audio_ids) || audio_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '音频ID列表不能为空'
      });
    }

    if (!selected_audio_ids || !Array.isArray(selected_audio_ids)) {
      return res.status(400).json({
        success: false,
        message: '已选音频ID列表不能为空'
      });
    }

    const Favorite = require('./database/models/Favorite');

    // 检查是否已收藏
    const isFavorite = await Favorite.isCombinationFavorite(openid, audio_ids);

    if (isFavorite) {
      // 取消收藏
      const unfavoriteResult = await Favorite.unfavoriteCombination(openid, audio_ids);
      
      if (!unfavoriteResult.success) {
        return res.status(400).json({
          success: false,
          message: unfavoriteResult.message || '取消收藏失败',
          error: unfavoriteResult.error
        });
      }

      res.json({
        success: true,
        action: 'unfavorite',
        message: '取消收藏成功'
      });
    } else {
      // 添加收藏
      const favoriteResult = await Favorite.favoriteCombination({
        openid: openid,
        audio_ids: audio_ids,
        selected_audio_ids: selected_audio_ids,
        custom_name: custom_name,
        description: description
      });

      if (!favoriteResult.success) {
        return res.status(400).json({
          success: false,
          message: favoriteResult.message || '收藏失败',
          error: favoriteResult.error
        });
      }

      res.json({
        success: true,
        action: 'favorite',
        data: favoriteResult.data,
        message: '收藏成功'
      });
    }

  } catch (error) {
    console.error('切换组合收藏状态失败:', error);
    res.status(500).json({
      success: false,
      message: '切换收藏状态失败',
      error: error.message
    });
  }
});

/**
 * 获取白噪音组合播放历史
 * GET /api/audios/white-noise/history/:openid
 */
router.get('/white-noise/history/:openid', async (req, res) => {
  try {
    const { openid } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    if (!openid) {
      return res.status(400).json({
        success: false,
        message: '用户标识不能为空'
      });
    }

    const PlayHistory = require('./database/models/PlayHistory');
    const historyResult = await PlayHistory.getUserCombinationHistory(openid, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    if (!historyResult.success) {
      return res.status(400).json({
        success: false,
        message: historyResult.message || '获取播放历史失败'
      });
    }

    res.json({
      success: true,
      data: historyResult.data || [],
      total: historyResult.total || 0
    });

  } catch (error) {
    console.error('获取播放历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取播放历史失败',
      error: error.message
    });
  }
});

/**
 * 获取用户收藏的白噪音组合
 * GET /api/audios/white-noise/favorites/:openid
 */
router.get('/white-noise/favorites/:openid', async (req, res) => {
  try {
    const { openid } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    if (!openid) {
      return res.status(400).json({
        success: false,
        message: '用户标识不能为空'
      });
    }

    const Favorite = require('./database/models/Favorite');
    const favoritesResult = await Favorite.getUserCombinationFavorites(openid, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    if (!favoritesResult.success) {
      return res.status(400).json({
        success: false,
        message: favoritesResult.message || '获取收藏列表失败'
      });
    }

    res.json({
      success: true,
      data: favoritesResult.data || [],
      total: favoritesResult.total || 0
    });

  } catch (error) {
    console.error('获取收藏列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取收藏列表失败',
      error: error.message
    });
  }
});



/**
 * 直接列表选择白噪音组合
 * POST /api/audios/white-noise/direct-select
 */
router.post('/white-noise/direct-select', async (req, res) => {
  try {
    const {
      openid,
      audio_ids,
      selected_audio_ids,
      play_mode = 'parallel',
      timer_minutes = 0
    } = req.body;

    // 验证参数
    if (!openid) {
      return res.status(400).json({
        success: false,
        message: '用户标识不能为空'
      });
    }

    if (!audio_ids || !Array.isArray(audio_ids) || audio_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '音频ID列表不能为空'
      });
    }

    if (!selected_audio_ids || !Array.isArray(selected_audio_ids) || selected_audio_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '已选音频ID列表不能为空'
      });
    }

    // 获取音频详细信息
    const placeholders = audio_ids.map(() => '?').join(',');
    const sql = `
      SELECT 
        a.audio_id, a.title, a.description, a.cover_url, a.audio_url,
        a.duration_seconds, a.type,
        GROUP_CONCAT(DISTINCT ac.name) as categories
      FROM audios a
      LEFT JOIN audio_category_mapping acm ON a.audio_id = acm.audio_id
      LEFT JOIN audio_categories ac ON acm.category_id = ac.category_id
      WHERE a.audio_id IN (${placeholders}) AND a.is_public = 1
      GROUP BY a.audio_id
    `;

    const result = await query(sql, audio_ids);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '获取音频信息失败',
        error: result.error
      });
    }

    // 构建播放配置
    const playConfig = {
      mode: play_mode,
      tracks: result.data.map(audio => ({
        audio_id: audio.audio_id,
        title: audio.title,
        description: audio.description,
        cover_url: audio.cover_url,
        audio_url: audio.audio_url,
        duration_seconds: audio.duration_seconds,
        categories: audio.categories ? audio.categories.split(',') : [],
        is_selected: selected_audio_ids.includes(audio.audio_id),
        is_disabled: !selected_audio_ids.includes(audio.audio_id),
        volume: 0.7,
        effects: {
          fade_in: 2,
          fade_out: 3,
          loop: true
        }
      })),
      total_duration: Math.max(...result.data.map(audio => audio.duration_seconds || 0)),
      combination_id: `direct_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timer_minutes: timer_minutes
    };

    res.json({
      success: true,
      data: playConfig,
      message: '直接列表选择播放配置生成成功'
    });

  } catch (error) {
    console.error('直接列表选择失败:', error);
    res.status(500).json({
      success: false,
      message: '直接列表选择失败',
      error: error.message
    });
  }
});

/**
 * 记录组合播放历史
 * POST /api/audios/white-noise/record-play
 */
router.post('/white-noise/record-play', async (req, res) => {
  try {
    const {
      openid,
      audio_ids,
      selected_audio_ids,
      play_mode = 'parallel',
      play_duration = 0,
      timer_minutes = 0
    } = req.body;

    // 验证参数
    if (!openid) {
      return res.status(400).json({
        success: false,
        message: '用户标识不能为空'
      });
    }

    if (!audio_ids || !Array.isArray(audio_ids) || audio_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '音频ID列表不能为空'
      });
    }

    if (!selected_audio_ids || !Array.isArray(selected_audio_ids)) {
      return res.status(400).json({
        success: false,
        message: '已选音频ID列表不能为空'
      });
    }

    const PlayHistory = require('./database/models/PlayHistory');
    
    // 记录播放历史
    const playResult = await PlayHistory.recordPlay({
      openid: openid,
      audio_ids: audio_ids,
      selected_audio_ids: selected_audio_ids,
      play_type: 'combination',
      play_mode: play_mode,
      play_duration: play_duration,
      timer_minutes: timer_minutes
    });

    if (!playResult.success) {
      return res.status(400).json({
        success: false,
        message: playResult.message || '记录播放历史失败',
        error: playResult.error
      });
    }

    // 增加播放计数
    for (const audioId of selected_audio_ids) {
      await AudioModel.recordPlay(openid, parseInt(audioId), {
        play_duration: play_duration,
        timer_minutes: timer_minutes
      });
    }

    res.json({
      success: true,
      data: playResult.data,
      message: '播放记录成功'
    });

  } catch (error) {
    console.error('记录播放历史失败:', error);
    res.status(500).json({
      success: false,
      message: '记录播放历史失败',
      error: error.message
    });
  }
});

/**
 * 收藏/取消收藏音频组合
 * POST /api/audios/white-noise/favorite
 */
router.post('/white-noise/favorite', async (req, res) => {
  try {
    const {
      openid,
      audio_ids,
      selected_audio_ids,
      custom_name = null,
      description = null
    } = req.body;

    // 验证参数
    if (!openid) {
      return res.status(400).json({
        success: false,
        message: '用户标识不能为空'
      });
    }

    if (!audio_ids || !Array.isArray(audio_ids) || audio_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '音频ID列表不能为空'
      });
    }

    if (!selected_audio_ids || !Array.isArray(selected_audio_ids)) {
      return res.status(400).json({
        success: false,
        message: '已选音频ID列表不能为空'
      });
    }

    const Favorite = require('./database/models/Favorite');

    // 检查是否已收藏
    const isFavorite = await Favorite.isCombinationFavorite(openid, audio_ids);

    if (isFavorite) {
      // 取消收藏
      const unfavoriteResult = await Favorite.unfavoriteCombination(openid, audio_ids);
      
      if (!unfavoriteResult.success) {
        return res.status(400).json({
          success: false,
          message: unfavoriteResult.message || '取消收藏失败',
          error: unfavoriteResult.error
        });
      }

      res.json({
        success: true,
        action: 'unfavorite',
        message: '取消收藏成功'
      });
    } else {
      // 添加收藏
      const favoriteResult = await Favorite.favoriteCombination({
        openid: openid,
        audio_ids: audio_ids,
        selected_audio_ids: selected_audio_ids,
        custom_name: custom_name,
        description: description
      });

      if (!favoriteResult.success) {
        return res.status(400).json({
          success: false,
          message: favoriteResult.message || '收藏失败',
          error: favoriteResult.error
        });
      }

      res.json({
        success: true,
        action: 'favorite',
        data: favoriteResult.data,
        message: '收藏成功'
      });
    }

  } catch (error) {
    console.error('切换组合收藏状态失败:', error);
    res.status(500).json({
      success: false,
      message: '切换收藏状态失败',
      error: error.message
    });
  }
});

/**
 * 获取白噪音组合播放历史
 * GET /api/audios/white-noise/history/:openid
 */
router.get('/white-noise/history/:openid', async (req, res) => {
  try {
    const { openid } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    if (!openid) {
      return res.status(400).json({
        success: false,
        message: '用户标识不能为空'
      });
    }

    const PlayHistory = require('./database/models/PlayHistory');
    const historyResult = await PlayHistory.getUserCombinationHistory(openid, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    if (!historyResult.success) {
      return res.status(400).json({
        success: false,
        message: historyResult.message || '获取播放历史失败'
      });
    }

    res.json({
      success: true,
      data: historyResult.data || [],
      total: historyResult.total || 0
    });

  } catch (error) {
    console.error('获取播放历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取播放历史失败',
      error: error.message
    });
  }
});

/**
 * 获取用户收藏的白噪音组合
 * GET /api/audios/white-noise/favorites/:openid
 */
router.get('/white-noise/favorites/:openid', async (req, res) => {
  try {
    const { openid } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    if (!openid) {
      return res.status(400).json({
        success: false,
        message: '用户标识不能为空'
      });
    }

    const Favorite = require('./database/models/Favorite');
    const favoritesResult = await Favorite.getUserCombinationFavorites(openid, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    if (!favoritesResult.success) {
      return res.status(400).json({
        success: false,
        message: favoritesResult.message || '获取收藏列表失败'
      });
    }

    res.json({
      success: true,
      data: favoritesResult.data || [],
      total: favoritesResult.total || 0
    });

  } catch (error) {
    console.error('获取收藏列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取收藏列表失败',
      error: error.message
    });
  }
});

// 新增：随机推荐音频
router.get('/random', async (req, res) => {
  try {
    const { count = 5 } = req.query;
    
    // 验证count参数
    if (isNaN(parseInt(count)) || parseInt(count) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'count参数必须为正整数'
      })
    }
    
    const randomAudios = await AudioModel.getRandomAudios(parseInt(count));
    
    res.json({
      success: true,
      data: randomAudios,
      total: randomAudios.length
    })
  } catch (error) {
    console.error('获取随机推荐音频失败:', error)
    res.status(500).json({
      success: false,
      message: '获取随机推荐音频失败',
      error: error.message
    })
  }
})

// 获取音频详情（使用完善后的detail方法，含分类信息）
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    // 验证ID格式
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: '音频ID格式无效，请使用正确的数字格式'
      })
    }
    
    // 调用新增的getAudioDetail方法（含分类信息）
    const audio = await AudioModel.getAudioDetail(parseInt(id));
    
    if (!audio) {
      return res.status(404).json({
        success: false,
        message: '音频不存在'
      })
    }
    
    res.json({
      success: true,
      data: audio
    })
  } catch (error) {
    console.error('获取音频详情失败:', error)
    res.status(500).json({
      success: false,
      message: '获取音频详情失败',
      error: error.message
    })
  }
})

// 增加播放次数并记录播放历史
router.post('/:id/play', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const openid = req.openid;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: '音频ID格式无效，请使用正确的数字格式'
      })
    }
    
    // 调用新的播放记录方法
    const result = await AudioModel.recordPlay(openid, parseInt(id), {
      play_duration: req.body.play_duration || 0,
      timer_minutes: req.body.timer_minutes || 0
    });
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || '播放记录失败',
        error: result.error
      })
    }
    
    res.json({
      success: true,
      message: result.message || '播放记录成功'
    })
  } catch (error) {
    console.error('增加播放次数失败:', error)
    res.status(500).json({
      success: false,
      message: '增加播放次数失败',
      error: error.message
    })
  }
})

// 新增：切换音频收藏状态
router.post('/:id/favorite', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const openid = req.openid; // 从中间件获取
    
    // 验证参数
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ success: false, message: '音频ID格式无效' });
    }
    if (!openid) {
      return res.status(401).json({ success: false, message: '用户未登录，请先登录' });
    }
    
    const result = await AudioModel.toggleFavorite(openid, parseInt(id));
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || '切换收藏状态失败',
        error: result.error
      });
    }
    
    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('切换收藏状态失败:', error);
    res.status(500).json({
      success: false,
      message: '切换收藏状态失败',
      error: error.message
    })
  }
})

// 新增：获取用户收藏的音频列表
router.get('/favorites/mine', authenticateToken, async (req, res) => {
  try {
    const openid = req.openid; // 从中间件获取
    const { limit = 20, offset = 0 } = req.query;
    
    if (!openid) {
      return res.status(401).json({ success: false, message: '用户未登录，请先登录' });
    }
    
    const FavoriteModel = require('./database/models/Favorite');
    const result = await FavoriteModel.getUserFavorites(openid, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data || [],
      total: result.total || 0
    })
  } catch (error) {
    console.error('获取用户收藏音频失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户收藏音频失败',
      error: error.message
    });
  }
});

// Base64格式上传白噪音封面（支持小程序端）
router.post('/:audioId/cover/upload-base64', authenticateToken, async (req, res) => {
  try {
    const openid = req.openid;
    const { audioId } = req.params;
    const { base64, fileName } = req.body;
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }

    if (!audioId || isNaN(parseInt(audioId))) {
      return res.status(400).json({
        success: false,
        message: '音频ID格式无效'
      });
    }

    if (!base64 || !fileName) {
      return res.status(400).json({
        success: false,
        message: '缺少Base64数据或文件名'
      });
    }

    // 验证用户是否有权限修改该音频
    const audioResult = await AudioModel.getAudioById(parseInt(audioId));
    if (!audioResult.success || !audioResult.data) {
      return res.status(404).json({
        success: false,
        message: '音频不存在'
      });
    }

    const audio = audioResult.data;
    
    // 检查权限：只能修改自己创作的音频
    if (audio.is_user_creation !== 1 || audio.owner_openid !== openid) {
      return res.status(403).json({
        success: false,
        message: '无权限修改该音频封面，仅能操作自己创作的内容'
      });
    }

    // 确保存储桶存在
    const bucketResult = await imageUploadService.ensureImageBucketExists();
    if (!bucketResult.success) {
      return res.status(500).json({
        success: false,
        message: '存储服务初始化失败',
        error: bucketResult.error
      });
    }

    // 上传封面到Supabase
    const uploadResult = await imageUploadService.handleImageUpload({
      type: 'cover',
      audioId: audioId,
      base64: base64,
      fileName: fileName
    });

    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: '封面上传失败',
        error: uploadResult.error
      });
    }

    // 更新音频封面URL到数据库
    await AudioModel.updateAudio(parseInt(audioId), openid, {
      cover_url: uploadResult.url
    });

    res.json({
      success: true,
      message: '封面上传成功',
      data: {
        cover_url: uploadResult.url,
        file_path: uploadResult.filePath
      }
    });

  } catch (error) {
    console.error('上传白噪音封面失败:', error);
    res.status(500).json({
      success: false,
      message: '上传白噪音封面失败',
      error: error.message
    });
  }
});

// 上传音频封面图标接口（单独上传图标）
router.post('/:audioId/cover/upload', authenticateToken, upload.single('cover'), async (req, res) => {
  try {
    const openid = req.openid;
    const { audioId } = req.params;
    
    console.log('🖼️ 音频图标上传请求开始，音频ID:', audioId, 'openid:', openid);
    
    // 验证用户登录状态
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录，请先登录',
        error_code: 'AUTH_REQUIRED'
      });
    }

    // 验证音频ID格式
    if (!audioId || isNaN(parseInt(audioId)) || parseInt(audioId) <= 0) {
      return res.status(400).json({
        success: false,
        message: '音频ID格式无效，必须为正整数',
        error_code: 'INVALID_AUDIO_ID'
      });
    }

    // 验证文件上传
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的图标文件',
        error_code: 'NO_FILE_SELECTED'
      });
    }

    // 验证文件类型
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
    if (!allowedMimes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: '只允许上传图片文件 (JPEG, PNG, GIF, WebP, BMP等)',
        error_code: 'INVALID_FILE_TYPE'
      });
    }

    // 验证音频是否存在
    const audioResult = await AudioModel.getAudioById(parseInt(audioId));
    if (!audioResult.success || !audioResult.data) {
      return res.status(404).json({
        success: false,
        message: '音频不存在',
        error_code: 'AUDIO_NOT_FOUND'
      });
    }

    const audio = audioResult.data;
    console.log('📝 找到音频记录，标题:', audio.title);
    
    // 检查权限：只能修改自己创作的音频
    if (audio.is_user_creation !== 1 || audio.owner_openid !== openid) {
      return res.status(403).json({
        success: false,
        message: '无权限修改该音频封面，仅能操作自己创作的内容',
        error_code: 'NO_PERMISSION'
      });
    }

    // 确保存储桶存在
    const bucketResult = await imageUploadService.ensureImageBucketExists();
    if (!bucketResult.success) {
      return res.status(500).json({
        success: false,
        message: '图片存储服务初始化失败',
        error: bucketResult.error,
        error_code: 'STORAGE_INIT_FAILED'
      });
    }

    // 上传图标到Supabase的image存储桶
    const uploadResult = await imageUploadService.handleImageUpload({
      type: 'cover',
      audioId: audioId,
      fileBuffer: req.file.buffer,
      fileName: req.file.originalname
    });

    if (!uploadResult.success) {
      console.error('❌ 图标上传到Supabase失败:', uploadResult.error);
      return res.status(500).json({
        success: false,
        message: '图标上传失败，请检查网络连接或文件大小',
        error: uploadResult.error,
        error_code: 'UPLOAD_FAILED'
      });
    }

    console.log('✅ 图标上传到Supabase成功，URL:', uploadResult.url);

    // 更新音频封面URL到数据库
    const updateResult = await AudioModel.updateAudio(parseInt(audioId), openid, {
      cover_url: uploadResult.url
    });

    if (!updateResult.success) {
      console.error('❌ 更新数据库封面URL失败:', updateResult.error);
      return res.status(500).json({
        success: false,
        message: '图标URL更新失败',
        error: updateResult.error,
        error_code: 'DATABASE_UPDATE_FAILED'
      });
    }

    console.log('✅ 音频图标URL更新成功');

    res.json({
      success: true,
      message: '音频图标上传成功',
      data: {
        audio_id: parseInt(audioId),
        cover_url: uploadResult.url,
        file_path: uploadResult.filePath,
        original_filename: req.file.originalname,
        file_size: req.file.size,
        mimetype: req.file.mimetype,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ 音频图标上传失败:', error);
    res.status(500).json({
      success: false,
      message: '音频图标上传失败，请稍后重试',
      error: error.message,
      error_code: 'SERVER_ERROR'
    });
  }
});

// Base64格式上传白噪音封面（支持小程序端）
router.post('/:audioId/cover/upload-base64', authenticateToken, async (req, res) => {
  try {
    const openid = req.openid;
    const { audioId } = req.params;
    const { base64, fileName } = req.body;
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }

    if (!audioId || isNaN(parseInt(audioId))) {
      return res.status(400).json({
        success: false,
        message: '音频ID格式无效'
      });
    }

    if (!base64 || !fileName) {
      return res.status(400).json({
        success: false,
        message: '缺少Base64数据或文件名'
      });
    }

    // 验证用户是否有权限修改该音频
    const audioResult = await AudioModel.getAudioById(parseInt(audioId));
    if (!audioResult.success || !audioResult.data) {
      return res.status(404).json({
        success: false,
        message: '音频不存在'
      });
    }

    const audio = audioResult.data;
    
    // 检查权限：只能修改自己创作的音频
    if (audio.is_user_creation !== 1 || audio.owner_openid !== openid) {
      return res.status(403).json({
        success: false,
        message: '无权限修改该音频封面，仅能操作自己创作的内容'
      });
    }

    // 确保存储桶存在
    const bucketResult = await imageUploadService.ensureImageBucketExists();
    if (!bucketResult.success) {
      return res.status(500).json({
        success: false,
        message: '存储服务初始化失败',
        error: bucketResult.error
      });
    }

    // 上传封面到Supabase
    const uploadResult = await imageUploadService.handleImageUpload({
      type: 'cover',
      audioId: audioId,
      base64: base64,
      fileName: fileName
    });

    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: '封面上传失败',
        error: uploadResult.error
      });
    }

    // 更新音频封面URL到数据库
    await AudioModel.updateAudio(parseInt(audioId), openid, {
      cover_url: uploadResult.url
    });

    res.json({
      success: true,
      message: '封面上传成功',
      data: {
        cover_url: uploadResult.url,
        file_path: uploadResult.filePath
      }
    });

  } catch (error) {
    console.error('上传白噪音封面失败:', error);
    res.status(500).json({
      success: false,
      message: '上传白噪音封面失败',
      error: error.message
    });
  }
});

module.exports = router