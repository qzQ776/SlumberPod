const express = require('express');
const router = express.Router();

// 用户发布创作音频
router.post('/', async (req, res) => {
  try {
    const openid = req.openid;
    
    // 记录请求体，帮助调试
    console.log('创作创建请求体:', req.body);
    console.log('请求头Content-Type:', req.headers['content-type']);
    
    // 处理不同格式的请求体
    let requestBody = req.body;
    
    // 如果是x-www-form-urlencoded格式，需要解析参数
    if (req.headers['content-type'] && req.headers['content-type'].includes('application/x-www-form-urlencoded')) {
      // 从请求体中提取参数，支持多种可能的字段名
      requestBody = {
        title: req.body.title || req.body.name,
        description: req.body.description,
        audio_url: req.body.audio_url || req.body.audioUrl || req.body.url || req.body['audio url'],
        cover_url: req.body.cover_url || req.body.coverUrl,
        duration_seconds: parseInt(req.body.duration_seconds || req.body['duration seconds'] || 0),
        category_ids: req.body.category_ids ? JSON.parse(req.body.category_ids) : [],
        is_public: parseInt(req.body.is_public || req.body['is public'] || 1),
        is_free: parseInt(req.body.is_free || req.body['is free'] || 1)
      };
      
      console.log('处理后请求体:', requestBody);
    }
    
    const { 
      title, 
      description, 
      audio_url, 
      cover_url, 
      duration_seconds,
      category_ids = [],
      is_public = 1,
      is_free = 1
    } = requestBody;

    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录，请先登录'
      });
    }

    // 验证必填字段 - 更灵活的验证
    const actualTitle = title || req.body.name;
    if (!actualTitle) {
      return res.status(400).json({
        success: false,
        message: '标题是必填项',
        details: '请提供title或name字段'
      });
    }
    
    const actualAudioUrl = audio_url || req.body.audioUrl || req.body.url || req.body['audio url'];
    if (!actualAudioUrl) {
      return res.status(400).json({
        success: false,
        message: '音频URL是必填项，请确保音频已成功上传',
        details: '请提供audio_url、audioUrl或url字段'
      });
    }

    // 验证标题长度
    if (actualTitle.length > 100) {
      return res.status(400).json({
        success: false,
        message: '标题长度不能超过100个字符'
      });
    }

    // 验证描述长度
    if (description && description.length > 500) {
      return res.status(400).json({
        success: false,
        message: '描述长度不能超过500个字符'
      });
    }

    // 验证时长
    if (duration_seconds && (duration_seconds <= 0 || duration_seconds > 36000)) {
      return res.status(400).json({
        success: false,
        message: '音频时长必须在1秒到10小时之间'
      });
    }

    const AudioModel = require('./database/models/Audio');
    
    // 创建音频数据 - 使用实际参数
    const audioData = {
      owner_openid: openid,
      title: actualTitle.trim(),
      description: description ? description.trim() : null,
      audio_url: actualAudioUrl.trim(),
      cover_url: cover_url ? cover_url.trim() : null,
      duration_seconds: duration_seconds || null,
      is_public: is_public ? 1 : 0,
      is_free: is_free ? 1 : 0,
      type: 'user_created',
      is_user_creation: 1
    };
    
    console.log('准备创建的音频数据:', audioData);

    // 创建音频
    const result = await AudioModel.createAudio(audioData);
    
    if (!result.success) {
      console.error('创建音频记录失败:', result.error);
      return res.status(500).json({
        success: false,
        message: '创作发布失败，请重试'
      });
    }
    
    if (!result.success) {
      console.error('创建音频记录失败:', result.error);
      return res.status(500).json({
        success: false,
        message: '创作发布失败，请重试'
      });
    }

    // 如果有分类ID，关联分类
    if (Array.isArray(category_ids) && category_ids.length > 0) {
      try {
        const { mapAudioToCategories } = require('./services/supabaseService');
        await mapAudioToCategories(result.data.audio_id, category_ids);
      } catch (categoryError) {
        console.warn('分类关联失败:', categoryError);
        // 不阻止音频创建成功
      }
    }

    res.status(201).json({
      success: true,
      message: '创作发布成功',
      data: result.data
    });

  } catch (error) {
    console.error('发布创作失败:', error);
    res.status(500).json({
      success: false,
      message: '发布创作失败',
      error: error.message
    });
  }
});

// 获取用户创作列表
router.get('/', async (req, res) => {
  try {
    const openid = req.openid;
    const { limit = 20, offset = 0 } = req.query;

    const AudioModel = require('./database/models/Audio');
    const result = await AudioModel.getUserUploads(openid, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    res.json({
      success: true,
      data: result.data || [],
      total: result.total || 0
    });

  } catch (error) {
    console.error('获取创作列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取创作列表失败',
      error: error.message
    });
  }
});

// 获取创作详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const openid = req.openid;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: '创作ID格式无效'
      });
    }

    const AudioModel = require('./database/models/Audio');
    const result = await AudioModel.getAudioById(parseInt(id));

    if (!result.success) {
      throw new Error(result.error);
    }

    if (!result.data) {
      return res.status(404).json({
        success: false,
        message: '创作不存在'
      });
    }

    // 检查是否属于当前用户
    if (result.data.openid !== openid) {
      return res.status(403).json({
        success: false,
        message: '无权查看此创作'
      });
    }

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('获取创作详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取创作详情失败',
      error: error.message
    });
  }
});

// 更新创作信息
router.put('/:id', async (req, res) => {
  try {
    const openid = req.openid;
    const { id } = req.params;
    const { title, description, category_id } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: '创作ID格式无效'
      });
    }

    // 检查创作是否属于当前用户
    const AudioModel = require('./database/models/Audio');
    const audioResult = await AudioModel.getAudioById(parseInt(id));
    
    if (!audioResult.success || !audioResult.data) {
      return res.status(404).json({
        success: false,
        message: '创作不存在'
      });
    }

    if (audioResult.data.openid !== openid) {
      return res.status(403).json({
        success: false,
        message: '无权修改此创作'
      });
    }

    const result = await AudioModel.updateAudio(parseInt(id), {
      title,
      description,
      category_id
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    res.json({
      success: true,
      message: '创作信息更新成功',
      data: result.data
    });

  } catch (error) {
    console.error('更新创作信息失败:', error);
    res.status(500).json({
      success: false,
      message: '更新创作信息失败',
      error: error.message
    });
  }
});

// 删除创作
router.delete('/:id', async (req, res) => {
  try {
    const openid = req.openid;
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: '创作ID格式无效'
      });
    }

    // 检查创作是否属于当前用户
    const AudioModel = require('./database/models/Audio');
    const audioResult = await AudioModel.getAudioById(parseInt(id));
    
    if (!audioResult.success || !audioResult.data) {
      return res.status(404).json({
        success: false,
        message: '创作不存在'
      });
    }

    if (audioResult.data.openid !== openid) {
      return res.status(403).json({
        success: false,
        message: '无权删除此创作'
      });
    }

    const result = await AudioModel.deleteAudio(parseInt(id));

    if (!result.success) {
      throw new Error(result.error);
    }

    res.json({
      success: true,
      message: '创作删除成功'
    });

  } catch (error) {
    console.error('删除创作失败:', error);
    res.status(500).json({
      success: false,
      message: '删除创作失败',
      error: error.message
    });
  }
});

// 获取创作统计
router.get('/stats', async (req, res) => {
  try {
    const openid = req.openid;

    const AudioModel = require('./database/models/Audio');
    const result = await AudioModel.getUserUploads(openid, 1000, 0);

    if (!result.success) {
      throw new Error(result.error);
    }

    const stats = {
      total_creations: result.total || 0,
      total_play_count: result.data ? result.data.reduce((sum, audio) => sum + (audio.play_count || 0), 0) : 0,
      total_favorite_count: result.data ? result.data.reduce((sum, audio) => sum + (audio.favorite_count || 0), 0) : 0
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('获取创作统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取创作统计失败',
      error: error.message
    });
  }
});

module.exports = router;