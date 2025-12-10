const express = require('express');
const multer = require('multer');
const router = express.Router();

// 导入认证中间件
const { authenticateToken } = require('./middleware/auth');

// MySQL音频模型
const AudioModel = require('./database/models/Audio');
const { query } = require('./database/config');

// 导入图片上传服务
const imageUploadService = require('./services/imageUploadService');

// 配置multer用于图片上传（内存存储）
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

// ================================
// 音频管理接口 - 统一优化版本
// ================================

/**
 * 智能搜索音频
 * GET /api/audios/search
 * 参数: keyword, category, type, tags, duration_min, duration_max, limit, offset, sort_by
 */
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
      sort_by = 'relevance'
    } = req.query;

    const result = await AudioModel.searchAudios({
      keyword,
      category,
      type,
      tags,
      duration_min,
      duration_max,
      limit,
      offset,
      sort_by
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.json({
      success: true,
      data: result.data,
      total: result.total,
      search_params: {
        keyword,
        category,
        type,
        tags,
        duration_min,
        duration_max,
        sort_by
      }
    });
  } catch (error) {
    console.error('搜索音频失败:', error);
    res.status(500).json({
      success: false,
      message: '搜索音频失败',
      error: error.message
    });
  }
});

/**
 * 获取音频列表
 * GET /api/audios
 * 参数: category_id, user_creations, limit, offset, orderBy, order
 */
router.get('/', async (req, res) => {
  try {
    const { 
      category_id, 
      user_creations, 
      limit = 20, 
      offset = 0,
      orderBy = 'created_at',
      order = 'DESC'
    } = req.query;

    let openid = req.openid;

    // 验证权限
    if ((category_id === 'my_creations' || user_creations === 'true') && !openid) {
      return res.status(401).json({
        success: false,
        message: '获取用户创作音频需要用户登录'
      });
    }

    const audios = await AudioModel.getAudios({
      category_id,
      user_creations: user_creations === 'true',
      openid,
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
 * 随机推荐音频
 * GET /api/audios/random
 * 参数: count
 */
router.get('/random', async (req, res) => {
  try {
    const { count = 5 } = req.query;
    
    if (isNaN(parseInt(count)) || parseInt(count) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'count参数必须为正整数'
      });
    }
    
    const randomAudios = await AudioModel.getRandomAudios(parseInt(count));
    
    res.json({
      success: true,
      data: randomAudios,
      total: randomAudios.length
    });
  } catch (error) {
    console.error('获取随机推荐音频失败:', error);
    res.status(500).json({
      success: false,
      message: '获取随机推荐音频失败',
      error: error.message
    });
  }
});

/**
 * 获取热门标签
 * GET /api/audios/tags/popular
 * 参数: limit
 */
router.get('/tags/popular', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const tags = await AudioModel.getPopularTags(parseInt(limit));
    
    res.json({
      success: true,
      data: tags,
      total: tags.length
    });
  } catch (error) {
    console.error('获取热门标签失败:', error);
    res.status(500).json({
      success: false,
      message: '获取热门标签失败',
      error: error.message
    });
  }
});

/**
 * 根据标签获取音频
 * GET /api/audios/tag/:tagName
 * 参数: limit, offset
 */
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

    const audios = await AudioModel.getAudiosByTag(tagName.trim(), {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: audios,
      total: audios.length
    });
  } catch (error) {
    console.error('根据标签获取音频失败:', error);
    res.status(500).json({
      success: false,
      message: '根据标签获取音频失败',
      error: error.message
    });
  }
});

/**
 * 获取音频详情
 * GET /api/audios/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: '音频ID格式无效'
      });
    }
    
    const audio = await AudioModel.getAudioDetail(parseInt(id));
    
    if (!audio) {
      return res.status(404).json({
        success: false,
        message: '音频不存在'
      });
    }
    
    res.json({
      success: true,
      data: audio
    });
  } catch (error) {
    console.error('获取音频详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取音频详情失败',
      error: error.message
    });
  }
});

/**
 * 播放音频并记录播放历史
 * POST /api/audios/:id/play
 * 需要认证
 */
router.post('/:id/play', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const openid = req.openid;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: '音频ID格式无效'
      });
    }
    
    const result = await AudioModel.recordPlay(openid, parseInt(id), {
      play_duration: req.body.play_duration || 0,
      timer_minutes: req.body.timer_minutes || 0
    });
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || '播放记录失败',
        error: result.error
      });
    }
    
    res.json({
      success: true,
      message: result.message || '播放记录成功'
    });
  } catch (error) {
    console.error('增加播放次数失败:', error);
    res.status(500).json({
      success: false,
      message: '增加播放次数失败',
      error: error.message
    });
  }
});

/**
 * 切换音频收藏状态
 * POST /api/audios/:id/favorite
 * 需要认证
 */
router.post('/:id/favorite', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const openid = req.openid;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: '音频ID格式无效'
      });
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
    });
  } catch (error) {
    console.error('切换收藏状态失败:', error);
    res.status(500).json({
      success: false,
      message: '切换收藏状态失败',
      error: error.message
    });
  }
});

/**
 * 获取用户收藏的音频列表
 * GET /api/audios/favorites/mine
 * 需要认证
 */
router.get('/favorites/mine', authenticateToken, async (req, res) => {
  try {
    const openid = req.openid;
    const { limit = 20, offset = 0 } = req.query;
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
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
    });
  } catch (error) {
    console.error('获取用户收藏音频失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户收藏音频失败',
      error: error.message
    });
  }
});

// ================================
// 白噪音组合播放功能 - 简化版本
// ================================

/**
 * 摇骰子随机选择白噪音组合
 * POST /api/audios/white-noise/dice-random
 * 需要认证
 */
router.post('/white-noise/dice-random', authenticateToken, async (req, res) => {
  try {
    const openid = req.openid;
    const {
      category = null,
      count = 3,
      play_mode = 'parallel'
    } = req.body;

    const selectCount = Math.min(Math.max(parseInt(count) || 3, 1), 10);

    // 构建查询条件
    let whereConditions = ['a.is_public = 1'];
    let params = [];

    // 分类筛选
    if (category) {
      whereConditions.push(`a.audio_id IN (
        SELECT audio_id FROM audio_category_mapping 
        WHERE category_id IN (
          SELECT category_id FROM audio_categories 
          WHERE name LIKE ?
        )
      )`);
      params.push(`%${category}%`);
    }

    // 随机选择音频
    const sql = `
      SELECT 
        a.audio_id, a.title, a.description, a.cover_url, a.audio_url,
        a.duration_seconds, a.type, a.created_at,
        GROUP_CONCAT(DISTINCT ac.name) as categories
      FROM audios a
      LEFT JOIN audio_category_mapping acm ON a.audio_id = acm.audio_id
      LEFT JOIN audio_categories ac ON acm.category_id = ac.category_id
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY a.audio_id
      ORDER BY RAND()
      LIMIT ?
    `;

    params.push(selectCount);

    const result = await query(sql, params);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '随机选择音频失败',
        error: result.error
      });
    }

    const selectedAudios = result.data.map(audio => ({
      ...audio,
      is_selected: false,
      is_disabled: false
    }));

    res.json({
      success: true,
      data: {
        audios: selectedAudios,
        total_selected: selectedAudios.length,
        roll_id: `roll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        play_mode: play_mode
      },
      message: `随机选择了${selectedAudios.length}个音频`
    });
  } catch (error) {
    console.error('摇骰子随机选择失败:', error);
    res.status(500).json({
      success: false,
      message: '随机选择音频失败',
      error: error.message
    });
  }
});

/**
 * 直接列表选择白噪音组合
 * POST /api/audios/white-noise/direct-select
 * 需要认证
 */
router.post('/white-noise/direct-select', authenticateToken, async (req, res) => {
  try {
    const openid = req.openid;
    const {
      audio_ids,
      selected_audio_ids,
      play_mode = 'parallel',
      timer_minutes = 0
    } = req.body;

    // 验证参数
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

// ================================
// 音频封面上传功能
// ================================

/**
 * 上传音频封面
 * POST /api/audios/:audioId/cover/upload
 * 需要认证
 */
router.post('/:audioId/cover/upload', authenticateToken, upload.single('cover'), async (req, res) => {
  try {
    const openid = req.openid;
    const { audioId } = req.params;
    
    // 验证用户登录状态
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }

    // 验证音频ID格式
    if (!audioId || isNaN(parseInt(audioId)) || parseInt(audioId) <= 0) {
      return res.status(400).json({
        success: false,
        message: '音频ID格式无效'
      });
    }

    // 验证文件上传
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的图标文件'
      });
    }

    // 验证音频是否存在
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
        message: '图片存储服务初始化失败',
        error: bucketResult.error
      });
    }

    // 上传图标
    const uploadResult = await imageUploadService.handleImageUpload({
      type: 'cover',
      audioId: audioId,
      fileBuffer: req.file.buffer,
      fileName: req.file.originalname
    });

    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: '图标上传失败',
        error: uploadResult.error
      });
    }

    // 更新音频封面URL
    const updateResult = await AudioModel.updateAudio(parseInt(audioId), openid, {
      cover_url: uploadResult.url
    });

    if (!updateResult) {
      return res.status(500).json({
        success: false,
        message: '图标URL更新失败'
      });
    }

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
    console.error('音频图标上传失败:', error);
    res.status(500).json({
      success: false,
      message: '音频图标上传失败',
      error: error.message
    });
  }
});

/**
 * Base64格式上传音频封面（支持小程序端）
 * POST /api/audios/:audioId/cover/upload-base64
 * 需要认证
 */
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

    // 验证用户权限
    const audioResult = await AudioModel.getAudioById(parseInt(audioId));
    if (!audioResult.success || !audioResult.data) {
      return res.status(404).json({
        success: false,
        message: '音频不存在'
      });
    }

    const audio = audioResult.data;
    
    if (audio.is_user_creation !== 1 || audio.owner_openid !== openid) {
      return res.status(403).json({
        success: false,
        message: '无权限修改该音频封面'
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

    // 上传封面
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

    // 更新音频封面URL
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

module.exports = router;