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

/**
 * 搜索音频组合（支持组合形式）
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Object} searchOptions - 搜索选项
 */
async function searchCombinations(req, res, searchOptions) {
  try {
    const { keyword, category_id, limit, offset, sort_by } = searchOptions;
    
    // 构建组合查询条件
    let whereConditions = [];
    let params = [];
    
    // 关键词搜索
    if (keyword && keyword.trim()) {
      whereConditions.push('(a.title LIKE ? OR a.description LIKE ?)');
      const searchTerm = `%${keyword.trim()}%`;
      params.push(searchTerm, searchTerm);
    }
    
    // 分类筛选
    if (category_id) {
      whereConditions.push(`a.audio_id IN (
        SELECT acm.audio_id 
        FROM audio_category_mapping acm 
        WHERE acm.category_id = ?
      )`);
      params.push(parseInt(category_id));
    }
    
    // 随机选择9个音频（每组3个，共3组）
    const sql = `
      SELECT 
        a.audio_id, a.title, a.description, a.cover_url, a.audio_url,
        a.duration_seconds, a.type, a.created_at,
        GROUP_CONCAT(DISTINCT ac.name) as categories
      FROM audios a
      LEFT JOIN audio_category_mapping acm ON a.audio_id = acm.audio_id
      LEFT JOIN audio_categories ac ON acm.category_id = ac.category_id
      ${whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : ''}
      GROUP BY a.audio_id
      ORDER BY RAND()
      LIMIT 50
    `;
    
    const result = await query(sql, params);
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    const allAudios = result.data;
    const combinations = [];
    
    // 生成组合（每组3个音频，默认选中1-2个）
    for (let i = 0; i < allAudios.length; i += 3) {
      if (i + 2 < allAudios.length) {
        const audioIds = [
          allAudios[i].audio_id,
          allAudios[i+1].audio_id,
          allAudios[i+2].audio_id
        ];
        
        // 确保audio_ids是数字类型
        const numericAudioIds = audioIds.map(id => parseInt(id));
        
        // 随机选择1-2个音频作为默认选中
        const selectedCount = Math.floor(Math.random() * 2) + 1; // 1或2
        const shuffled = [...Array(3).keys()].sort(() => Math.random() - 0.5);
        const selectedIndices = shuffled.slice(0, selectedCount);
        const selectedIds = selectedIndices.map(index => numericAudioIds[index]);
        
        // 计算选中音频的最短时长
        const selectedAudios = allAudios.slice(i, i + 3).filter((audio, index) => 
          selectedIndices.includes(index)
        );
        const selectedDurations = selectedAudios.map(audio => audio.duration_seconds || 0);
        const minDuration = selectedDurations.length > 0 ? Math.min(...selectedDurations) : 0;
        
        const combination = {
          combination_id: `combo_${Date.now()}_${Math.floor(i/3)}`,
          audio_ids: numericAudioIds,
          selected_audio_ids: selectedIds,
          audios: [
            { 
              ...allAudios[i], 
              audio_id: parseInt(allAudios[i].audio_id), // 确保是数字
              is_selected: selectedIndices.includes(0),
              volume: selectedIndices.includes(0) ? 0.7 : 0
            },
            { 
              ...allAudios[i+1], 
              audio_id: parseInt(allAudios[i+1].audio_id), // 确保是数字
              is_selected: selectedIndices.includes(1),
              volume: selectedIndices.includes(1) ? 0.7 : 0
            },
            { 
              ...allAudios[i+2], 
              audio_id: parseInt(allAudios[i+2].audio_id), // 确保是数字
              is_selected: selectedIndices.includes(2),
              volume: selectedIndices.includes(2) ? 0.7 : 0
            }
          ],
          total_count: 3,
          selected_count: selectedCount,
          total_duration: minDuration, // 使用最短音频时长作为播放时长
          play_mode: 'parallel',
          created_at: new Date().toISOString()
        };
        
        combinations.push(combination);
      }
    }
    
    // 分页处理
    const limitNum = Math.min(parseInt(limit) || 20, 100);
    const offsetNum = parseInt(offset) || 0;
    const paginatedCombinations = combinations.slice(offsetNum, offsetNum + limitNum);
    
    res.json({
      success: true,
      data: paginatedCombinations,
      total: combinations.length,
      search_type: 'combination',
      search_params: {
        keyword: keyword?.trim() || '',
        category_id,
        sort_by
      }
    });
    
  } catch (error) {
    console.error('搜索音频组合失败:', error);
    res.status(500).json({
      success: false,
      message: '搜索音频组合失败',
      error: error.message
    });
  }
}

// 智能搜索音频（必须在 /:audio_id 之前）
router.get('/search', async (req, res) => {
  try {
    const { 
      keyword = '',
      category_id = null,
      type = null,
      tags = null,
      duration_min = null,
      duration_max = null,
      limit = 20,
      offset = 0,
      sort_by = 'relevance', // relevance, popularity, latest
      search_type = 'audio' // audio, combination
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
    if (category_id) {
      whereConditions.push(`a.audio_id IN (
        SELECT acm.audio_id 
        FROM audio_category_mapping acm 
        WHERE acm.category_id = ?
      )`);
      params.push(parseInt(category_id));
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

    // 根据搜索类型执行不同的搜索逻辑
    if (search_type === 'combination') {
      return await searchCombinations(req, res, {
        keyword,
        category_id,
        type,
        duration_min,
        duration_max,
        limit,
        offset,
        sort_by
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
          category_id,
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
          category_id,
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
router.post('/white-noise/direct-select', authenticateToken, async (req, res) => {
  try {
    const openid = req.openid; // 从中间件获取
    const {
      audio_ids,
      selected_audio_ids,
      play_mode = 'parallel',
      timer_minutes = 0
    } = req.body;

    // 验证参数
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录，请先登录'
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

    // 验证音频ID格式 - 修复类型转换问题
    const numericAudioIds = audio_ids.map(id => {
      const num = parseInt(id);
      if (isNaN(num) || num <= 0) {
        return null;
      }
      return num;
    }).filter(id => id !== null);

    const numericSelectedIds = selected_audio_ids.map(id => {
      const num = parseInt(id);
      if (isNaN(num) || num <= 0) {
        return null;
      }
      return num;
    }).filter(id => id !== null);

    if (numericAudioIds.length !== audio_ids.length) {
      return res.status(400).json({
        success: false,
        message: '音频ID格式无效，请使用正确的数字格式'
      });
    }

    if (numericSelectedIds.length !== selected_audio_ids.length) {
      return res.status(400).json({
        success: false,
        message: '已选音频ID格式无效，请使用正确的数字格式'
      });
    }

    // 获取音频详细信息
    const placeholders = numericAudioIds.map(() => '?').join(',');
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

    const result = await query(sql, numericAudioIds);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '获取音频信息失败',
        error: result.error
      });
    }

    // 获取所有选中的音频
    const selectedAudios = result.data.filter(audio => 
      numericSelectedIds.includes(parseInt(audio.audio_id))
    );
    
    // 计算最短音频时长作为总播放时长（并行播放时）
    const selectedDurations = selectedAudios.map(audio => audio.duration_seconds || 0);
    const minDuration = selectedDurations.length > 0 ? Math.min(...selectedDurations) : 0;

    // 构建播放配置
    const playConfig = {
      mode: play_mode,
      tracks: result.data.map(audio => {
        const isSelected = numericSelectedIds.includes(parseInt(audio.audio_id));
        return {
          audio_id: parseInt(audio.audio_id), // 确保是数字
          title: audio.title,
          description: audio.description,
          cover_url: audio.cover_url,
          audio_url: audio.audio_url,
          duration_seconds: audio.duration_seconds,
          categories: audio.categories ? audio.categories.split(',') : [],
          is_selected: isSelected,
          is_disabled: !isSelected,
          volume: isSelected ? 0.7 : 0, // 只播放选中的音频，未选中的音量为0
          effects: {
            fade_in: 2,
            fade_out: 3,
            loop: true
          }
        };
      }),
      total_duration: minDuration, // 使用最短音频时长作为总播放时长
      combination_id: `direct_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timer_minutes: timer_minutes,
      selected_count: selectedAudios.length,
      total_count: result.data.length
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
router.get('/:audio_id', async (req, res) => {
  try {
    const { audio_id } = req.params
    
    // 验证ID格式
    if (!audio_id || isNaN(parseInt(audio_id))) {
      return res.status(400).json({
        success: false,
        message: '音频ID格式无效，请使用正确的数字格式'
      })
    }
    
    // 调用新增的getAudioDetail方法（含分类信息）
    const audio = await AudioModel.getAudioDetail(parseInt(audio_id));
    
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
router.post('/:audio_id/play', authenticateToken, async (req, res) => {
  try {
    const { audio_id } = req.params
    const openid = req.openid;
    
    if (!audio_id || isNaN(parseInt(audio_id))) {
      return res.status(400).json({
        success: false,
        message: '音频ID格式无效，请使用正确的数字格式'
      })
    }
    
    // 调用新的播放记录方法
    const result = await AudioModel.recordPlay(openid, parseInt(audio_id), {
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
router.post('/:audio_id/favorite', authenticateToken, async (req, res) => {
  try {
    const { audio_id } = req.params;
    const openid = req.openid; // 从中间件获取
    
    // 验证参数
    if (!audio_id || isNaN(parseInt(audio_id))) {
      return res.status(400).json({ success: false, message: '音频ID格式无效' });
    }
    if (!openid) {
      return res.status(401).json({ success: false, message: '用户未登录，请先登录' });
    }
    
    const result = await AudioModel.toggleFavorite(openid, parseInt(audio_id));
    
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

/**
 * 收藏/取消收藏音频组合
 * POST /api/audios/white-noise/favorite
 */
router.post('/white-noise/favorite', authenticateToken, async (req, res) => {
  try {
    const openid = req.openid; // 从中间件获取
    const {
      audio_ids,
      selected_audio_ids,
      custom_name = null,
      action = 'toggle' // toggle, favorite, unfavorite
    } = req.body;

    console.log('📝 白噪音组合收藏请求详情:');
    console.log('🔹 openid:', openid ? '已提供' : '未提供');
    console.log('🔹 audio_ids 类型:', typeof audio_ids);
    console.log('🔹 audio_ids 是否为数组:', Array.isArray(audio_ids));
    console.log('🔹 audio_ids 值:', audio_ids);
    console.log('🔹 audio_ids 构造函数:', audio_ids ? audio_ids.constructor.name : 'null');
    console.log('🔹 selected_audio_ids 类型:', typeof selected_audio_ids);
    console.log('🔹 selected_audio_ids 是否为数组:', Array.isArray(selected_audio_ids));
    console.log('🔹 selected_audio_ids 值:', selected_audio_ids);
    console.log('🔹 selected_audio_ids 构造函数:', selected_audio_ids ? selected_audio_ids.constructor.name : 'null');
    console.log('🔹 action:', action);
    console.log('🔹 custom_name:', custom_name);
    
    // 如果是对象类型，显示对象的具体结构
    if (typeof audio_ids === 'object' && audio_ids !== null) {
      console.log('🔹 audio_ids 对象键名:', Object.keys(audio_ids));
      console.log('🔹 audio_ids 对象值:', Object.values(audio_ids));
    }
    
    if (typeof selected_audio_ids === 'object' && selected_audio_ids !== null) {
      console.log('🔹 selected_audio_ids 对象键名:', Object.keys(selected_audio_ids));
      console.log('🔹 selected_audio_ids 对象值:', Object.values(selected_audio_ids));
    }

    // 验证参数
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录，请先登录'
      });
    }

    // 检查音频ID参数格式
    if (!audio_ids) {
      return res.status(400).json({
        success: false,
        message: '缺少音频ID参数，请提供 audio_ids 数组'
      });
    }

    // 处理不同格式的音频ID输入
    let processedAudioIds = [];
    if (Array.isArray(audio_ids)) {
      processedAudioIds = audio_ids;
    } else if (typeof audio_ids === 'object' && audio_ids !== null) {
      // 处理对象类型（可能是数组或其他对象结构）
      if (Array.isArray(audio_ids)) {
        processedAudioIds = audio_ids;
      } else if (audio_ids.constructor === Object) {
        // 如果是普通对象，尝试提取值
        processedAudioIds = Object.values(audio_ids);
      } else {
        processedAudioIds = [audio_ids];
      }
    } else if (typeof audio_ids === 'string') {
      // 尝试解析字符串为数组
      try {
        const parsed = JSON.parse(audio_ids);
        if (Array.isArray(parsed)) {
          processedAudioIds = parsed;
        } else {
          processedAudioIds = [audio_ids]; // 单个音频ID字符串
        }
      } catch (e) {
        processedAudioIds = [audio_ids]; // 单个音频ID字符串
      }
    } else if (typeof audio_ids === 'number') {
      processedAudioIds = [audio_ids]; // 单个音频ID数字
    }

    // 处理已选音频ID参数格式
    let processedSelectedIds = [];
    if (selected_audio_ids) {
      if (Array.isArray(selected_audio_ids)) {
        processedSelectedIds = selected_audio_ids;
      } else if (typeof selected_audio_ids === 'object' && selected_audio_ids !== null) {
        // 处理对象类型
        if (Array.isArray(selected_audio_ids)) {
          processedSelectedIds = selected_audio_ids;
        } else if (selected_audio_ids.constructor === Object) {
          processedSelectedIds = Object.values(selected_audio_ids);
        } else {
          processedSelectedIds = [selected_audio_ids];
        }
      } else if (typeof selected_audio_ids === 'string') {
        try {
          const parsed = JSON.parse(selected_audio_ids);
          if (Array.isArray(parsed)) {
            processedSelectedIds = parsed;
          } else {
            processedSelectedIds = [selected_audio_ids];
          }
        } catch (e) {
          processedSelectedIds = [selected_audio_ids];
        }
      } else if (typeof selected_audio_ids === 'number') {
        processedSelectedIds = [selected_audio_ids];
      }
    }

    // 如果没有提供 selected_audio_ids，默认使用 audio_ids
    if (processedSelectedIds.length === 0) {
      processedSelectedIds = [...processedAudioIds];
    }

    // 验证数组不为空
    if (processedAudioIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '音频ID列表不能为空'
      });
    }

    if (processedSelectedIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '已选音频ID列表不能为空'
      });
    }

    // 验证音频ID格式 - 修复类型转换问题
    const numericAudioIds = processedAudioIds.map(id => {
      const num = parseInt(id);
      if (isNaN(num) || num <= 0) {
        return null;
      }
      return num;
    }).filter(id => id !== null);

    const numericSelectedIds = processedSelectedIds.map(id => {
      const num = parseInt(id);
      if (isNaN(num) || num <= 0) {
        return null;
      }
      return num;
    }).filter(id => id !== null);

    if (numericAudioIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '音频ID格式无效，请使用正确的数字格式'
      });
    }

    if (numericSelectedIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '已选音频ID格式无效，请使用正确的数字格式'
      });
    }

    // 确保已选音频ID在音频ID列表中
    const invalidSelections = numericSelectedIds.filter(id => !numericAudioIds.includes(id));
    if (invalidSelections.length > 0) {
      return res.status(400).json({
        success: false,
        message: '已选音频ID必须包含在音频ID列表中'
      });
    }

    const FavoriteModel = require('./database/models/Favorite');
    let result;

    if (action === 'toggle') {
      // 切换收藏状态
      const isFavorite = await FavoriteModel.isCombinationFavorite(openid, numericAudioIds);
      if (isFavorite) {
        result = await FavoriteModel.unfavoriteCombination(openid, numericAudioIds);
      } else {
        result = await FavoriteModel.favoriteCombination({
          openid,
          audio_ids: numericAudioIds,
          selected_audio_ids: numericSelectedIds,
          custom_name
        });
      }
    } else if (action === 'favorite') {
      // 添加收藏
      result = await FavoriteModel.favoriteCombination({
        openid,
        audio_ids: numericAudioIds,
        selected_audio_ids: numericSelectedIds,
        custom_name
      });
    } else if (action === 'unfavorite') {
      // 取消收藏
      result = await FavoriteModel.unfavoriteCombination(openid, numericAudioIds);
    } else {
      return res.status(400).json({
        success: false,
        message: '不支持的操作类型'
      });
    }

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.data || {},
      message: result.message
    });

  } catch (error) {
    console.error('收藏/取消收藏音频组合失败:', error);
    res.status(500).json({
      success: false,
      message: '收藏/取消收藏音频组合失败',
      error: error.message
    });
  }
});

/**
 * 获取用户收藏的音频组合列表
 * GET /api/audios/white-noise/favorites
 */
router.get('/white-noise/favorites', authenticateToken, async (req, res) => {
  try {
    const openid = req.openid; // 从中间件获取
    const { limit = 20, offset = 0 } = req.query;
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录，请先登录'
      });
    }

    const FavoriteModel = require('./database/models/Favorite');
    const result = await FavoriteModel.getUserCombinationFavorites(openid, {
      limit: parseInt(limit) || 20,
      offset: parseInt(offset) || 0
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.data || [],
      total: result.total || 0
    });

  } catch (error) {
    console.error('获取用户收藏音频组合失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户收藏音频组合失败',
      error: error.message
    });
  }
});

// 获取用户收藏的音频列表
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
router.post('/:audio_id/cover/upload-base64', authenticateToken, async (req, res) => {
  try {
    const openid = req.openid;
    const { audio_id } = req.params;
    const { base64, fileName } = req.body;
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }

    if (!audio_id || isNaN(parseInt(audio_id))) {
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
    const audioResult = await AudioModel.getAudioById(parseInt(audio_id));
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
      audioId: audio_id,
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
    await AudioModel.updateAudio(parseInt(audio_id), openid, {
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
router.post('/:audio_id/cover/upload', authenticateToken, upload.single('cover'), async (req, res) => {
  try {
    const openid = req.openid;
    const { audio_id } = req.params;
    
    console.log('🖼️ 音频图标上传请求开始，音频ID:', audio_id, 'openid:', openid);
    
    // 验证用户登录状态
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录，请先登录',
        error_code: 'AUTH_REQUIRED'
      });
    }

    // 验证音频ID格式
    if (!audio_id || isNaN(parseInt(audio_id)) || parseInt(audio_id) <= 0) {
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
    const audioResult = await AudioModel.getAudioById(parseInt(audio_id));
    if (!audioResult.success || !audioResult.data) {
      return res.status(404).json({
        success: false,
        message: '音频不存在',
        error_code: 'AUDIO_NOT_FOUND'
      });
    }

    const audio = audioResult.data;
    console.log('📝 找到音频记录，标题:', audio.title, 'is_user_creation:', audio.is_user_creation, 'owner_openid:', audio.owner_openid);
    
    // 检查权限：
    // 1. 如果是系统音频（is_user_creation=0），允许任何登录用户上传图标
    // 2. 如果是用户创作的音频（is_user_creation=1），则只能由创建者本人修改
    if (audio.is_user_creation === 1) {
      // 用户创作的音频：检查是否是创建者本人
      if (audio.owner_openid !== openid) {
        return res.status(403).json({
          success: false,
          message: '无权限修改该音频封面，仅能操作自己创作的内容',
          error_code: 'NO_PERMISSION'
        });
      }
    } else {
      // 系统音频：允许任何登录用户上传图标
      console.log('✅ 系统音频，允许用户上传图标');
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
      audioId: audio_id,
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
    const updateResult = await AudioModel.updateAudio(parseInt(audio_id), openid, {
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
        audio_id: parseInt(audio_id),
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

/**
 * 获取白噪音组合播放历史
 * GET /api/audios/white-noise/history
 */
router.get('/white-noise/history', authenticateToken, async (req, res) => {
  try {
    const openid = req.openid;
    const { limit = 10, offset = 0 } = req.query;

    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }

    const PlayHistoryModel = require('./database/models/PlayHistory');
    const historyResult = await PlayHistoryModel.getUserCombinationHistory(openid, {
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
    console.error('获取白噪音播放历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取播放历史失败',
      error: error.message
    });
  }
});

/**
 * 获取音频图标接口
 * GET /api/audios/:audio_id/cover
 * 支持多种尺寸和格式选项
 */
router.get('/:audio_id/cover', async (req, res) => {
  try {
    const { audio_id } = req.params;
    const { 
      size = 'original', // original, small, medium, large, thumbnail
      format = 'url', // url, base64, info
      quality = 80 // 图片质量，1-100
    } = req.query;

    // 验证音频ID格式
    if (!audio_id || isNaN(parseInt(audio_id)) || parseInt(audio_id) <= 0) {
      return res.status(400).json({
        success: false,
        message: '音频ID格式无效，必须为正整数',
        error_code: 'INVALID_AUDIO_ID'
      });
    }

    // 获取音频信息
    const audioResult = await AudioModel.getAudioById(parseInt(audio_id));
    if (!audioResult.success || !audioResult.data) {
      return res.status(404).json({
        success: false,
        message: '音频不存在',
        error_code: 'AUDIO_NOT_FOUND'
      });
    }

    const audio = audioResult.data;
    
    // 检查音频是否有封面
    if (!audio.cover_url || audio.cover_url.trim() === '') {
      return res.status(404).json({
        success: false,
        message: '该音频暂无封面图标',
        error_code: 'COVER_NOT_FOUND'
      });
    }

    // 支持的不同尺寸处理
    const sizeOptions = {
      original: { width: null, height: null, prefix: 'original' },
      small: { width: 100, height: 100, prefix: 'small' },
      medium: { width: 200, height: 200, prefix: 'medium' },
      large: { width: 400, height: 400, prefix: 'large' },
      thumbnail: { width: 50, height: 50, prefix: 'thumbnail' }
    };

    const selectedSize = sizeOptions[size] || sizeOptions.original;

    // 根据请求的格式返回不同数据
    let responseData;
    
    if (format === 'base64') {
      // 返回Base64格式（需要实现图片下载和转换）
      try {
        const imageBuffer = await imageUploadService.downloadImage(audio.cover_url);
        const base64Data = imageBuffer.toString('base64');
        const mimeType = audio.cover_url.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i);
        const contentType = mimeType ? 
          `image/${mimeType[1].toLowerCase().replace('jpg', 'jpeg')}` : 
          'image/jpeg';
        
        responseData = {
          audio_id: parseInt(audio_id),
          base64: `data:${contentType};base64,${base64Data}`,
          mime_type: contentType,
          size: size,
          quality: parseInt(quality)
        };
      } catch (error) {
        console.warn('无法获取Base64格式，返回URL格式:', error);
        responseData = {
          audio_id: parseInt(audio_id),
          cover_url: audio.cover_url,
          size: size,
          quality: parseInt(quality),
          fallback: true
        };
      }
    } else if (format === 'info') {
      // 返回详细信息
      responseData = {
        audio_id: parseInt(audio_id),
        title: audio.title,
        cover_url: audio.cover_url,
        size: size,
        quality: parseInt(quality),
        file_info: {
          url: audio.cover_url,
          estimated_size: '需要实际下载计算',
          dimensions: selectedSize
        }
      };
    } else {
      // 默认返回URL格式
      responseData = {
        audio_id: parseInt(audio_id),
        cover_url: audio.cover_url,
        size: size,
        quality: parseInt(quality)
      };
    }

    res.json({
      success: true,
      message: '获取音频图标成功',
      data: responseData
    });

  } catch (error) {
    console.error('获取音频图标失败:', error);
    res.status(500).json({
      success: false,
      message: '获取音频图标失败，请稍后重试',
      error: error.message,
      error_code: 'SERVER_ERROR'
    });
  }
});

/**
 * 批量获取音频图标接口
 * POST /api/audios/covers/batch
 * 支持一次性获取多个音频的图标
 */
router.post('/covers/batch', async (req, res) => {
  try {
    const { 
      audio_ids, 
      size = 'original', 
      format = 'url', 
      quality = 80 
    } = req.body;

    // 验证参数
    if (!audio_ids || !Array.isArray(audio_ids) || audio_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '音频ID列表不能为空',
        error_code: 'EMPTY_AUDIO_IDS'
      });
    }

    // 验证音频ID格式
    const numericAudioIds = audio_ids.map(id => {
      const num = parseInt(id);
      if (isNaN(num) || num <= 0) {
        return null;
      }
      return num;
    }).filter(id => id !== null);

    if (numericAudioIds.length !== audio_ids.length) {
      return res.status(400).json({
        success: false,
        message: '音频ID格式无效，必须为正整数',
        error_code: 'INVALID_AUDIO_IDS'
      });
    }

    // 限制批量查询数量
    const maxBatchSize = 50;
    if (numericAudioIds.length > maxBatchSize) {
      return res.status(400).json({
        success: false,
        message: `批量查询数量不能超过${maxBatchSize}个`,
        error_code: 'BATCH_SIZE_EXCEEDED'
      });
    }

    // 批量查询音频信息
    const placeholders = numericAudioIds.map(() => '?').join(',');
    const sql = `
      SELECT 
        audio_id, title, cover_url, is_public, is_user_creation
      FROM audios 
      WHERE audio_id IN (${placeholders}) AND is_public = 1
    `;

    const result = await query(sql, numericAudioIds);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '查询音频信息失败',
        error: result.error,
        error_code: 'DATABASE_ERROR'
      });
    }

    const audioMap = {};
    result.data.forEach(audio => {
      audioMap[audio.audio_id] = audio;
    });

    // 构建响应数据
    const covers = numericAudioIds.map(audioId => {
      const audio = audioMap[audioId];
      if (!audio) {
        return {
          audio_id: audioId,
          success: false,
          message: '音频不存在或无权限访问',
          error_code: 'AUDIO_NOT_FOUND'
        };
      }

      if (!audio.cover_url || audio.cover_url.trim() === '') {
        return {
          audio_id: audioId,
          success: false,
          message: '该音频暂无封面图标',
          error_code: 'COVER_NOT_FOUND'
        };
      }

      return {
        audio_id: audioId,
        success: true,
        title: audio.title,
        cover_url: audio.cover_url,
        size: size,
        quality: parseInt(quality),
        format: format
      };
    });

    res.json({
      success: true,
      message: `批量获取音频图标成功，共处理${covers.length}个音频`,
      data: {
        covers: covers,
        total: covers.length,
        successful: covers.filter(item => item.success).length,
        failed: covers.filter(item => !item.success).length
      }
    });

  } catch (error) {
    console.error('批量获取音频图标失败:', error);
    res.status(500).json({
      success: false,
      message: '批量获取音频图标失败',
      error: error.message,
      error_code: 'SERVER_ERROR'
    });
  }
});

module.exports = router