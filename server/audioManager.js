const express = require('express');
const router = express.Router();

// 导入相关模型
const AudioModel = require('./database/models/Audio');
const AudioCategoryModel = require('./database/models/AudioCategory');
const FavoriteModel = require('./database/models/Favorite');
const PlayHistoryModel = require('./database/models/PlayHistory');
const CombinationModel = require('./database/models/Combination');

// 导入上传服务
const { uploadAudioWithCoverToSupabase } = require('./audioUploadHandler');

/**
 * 统一的音频管理接口
 * 合并了音频上传、管理、收藏、播放历史等功能
 */

// ====================== 音频分类管理 ======================

/**
 * 获取所有音频分类
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await AudioCategoryModel.getCategories();
    
    res.json({
      success: true,
      data: categories || [],
      total: categories ? categories.length : 0
    });
  } catch (error) {
    console.error('获取音频分类失败:', error);
    res.status(500).json({
      success: false,
      message: '获取音频分类失败',
      error: error.message
    });
  }
});

/**
 * 根据分类获取音频列表
 */
router.get('/categories/:category_id/audios', async (req, res) => {
  try {
    const { category_id } = req.params;
    const { 
      limit = 20, 
      offset = 0,
      sort_by = 'created_at',
      order = 'desc'
    } = req.query;

    if (!category_id || isNaN(parseInt(category_id))) {
      return res.status(400).json({
        success: false,
        message: '分类ID格式无效'
      });
    }

    const result = await AudioModel.getAudiosByCategory(parseInt(category_id), {
      limit: parseInt(limit),
      offset: parseInt(offset),
      sort_by,
      order
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
      total: result.total || 0
    });
  } catch (error) {
    console.error('获取分类音频失败:', error);
    res.status(500).json({
      success: false,
      message: '获取分类音频失败',
      error: error.message
    });
  }
});

// ====================== 音频上传管理 ======================

/**
 * 统一音频上传接口（支持音频+封面）
 */
router.post('/upload', async (req, res) => {
  try {
    const openid = req.openid;
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }

    const fileInfo = await uploadAudioWithCoverToSupabase(req, res);
    
    // 保存音频信息到数据库
    const audioData = {
      title: fileInfo.title || '未命名音频',
      description: fileInfo.description || '',
      audio_url: fileInfo.url,
      cover_url: fileInfo.coverUrl,
      duration_seconds: fileInfo.duration || 180,
      owner_openid: openid,
      is_public: fileInfo.isPublic === '1' ? 1 : 0,
      is_free: fileInfo.isFree === '1' ? 1 : 0,
      is_user_creation: 1
    };

    const saveResult = await AudioModel.createAudio(audioData);
    
    if (!saveResult.success) {
      return res.status(400).json({
        success: false,
        message: `音频信息保存失败: ${saveResult.error}`
      });
    }

    // 处理分类关联
    if (fileInfo.categoryIds) {
      const categoryIds = fileInfo.categoryIds.split(',').map(id => parseInt(id.trim()));
      await AudioModel.mapAudioToCategories(saveResult.data.audio_id, categoryIds);
    }

    res.json({
      success: true,
      message: '音频上传成功',
      data: {
        audio_id: saveResult.data.audio_id,
        title: audioData.title,
        audio_url: audioData.audio_url,
        cover_url: audioData.cover_url,
        duration_seconds: audioData.duration_seconds
      }
    });

  } catch (error) {
    console.error('音频上传失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '音频上传失败',
      error_code: 'AUDIO_UPLOAD_ERROR'
    });
  }
});

// ====================== 音频管理 ======================

/**
 * 获取音频详情
 */
router.get('/audios/:audio_id', async (req, res) => {
  try {
    const { audio_id } = req.params;
    const openid = req.openid;

    if (!audio_id || isNaN(parseInt(audio_id))) {
      return res.status(400).json({
        success: false,
        message: '音频ID格式无效'
      });
    }

    const result = await AudioModel.getAudioDetail(parseInt(audio_id), openid);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error
      });
    }

    res.json({
      success: true,
      data: result.data
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
 * 搜索音频
 */
router.get('/audios/search', async (req, res) => {
  try {
    const { 
      keyword,
      category_id,
      limit = 20, 
      offset = 0 
    } = req.query;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: '搜索关键词不能为空'
      });
    }

    const result = await AudioModel.searchAudios(keyword, {
      category_id: category_id ? parseInt(category_id) : null,
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
      data: result.data,
      total: result.total || 0
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
 * 获取用户上传的音频
 */
router.get('/user/audios', async (req, res) => {
  try {
    const openid = req.openid;
    const { 
      limit = 20, 
      offset = 0 
    } = req.query;

    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }

    const result = await AudioModel.getUserUploads(openid, {
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
      data: result.data,
      total: result.total || 0
    });
  } catch (error) {
    console.error('获取用户音频失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户音频失败',
      error: error.message
    });
  }
});

// ====================== 收藏管理 ======================

/**
 * 收藏/取消收藏音频
 */
router.post('/audios/:audio_id/favorite', async (req, res) => {
  try {
    const openid = req.openid;
    const { audio_id } = req.params;
    const { action = 'toggle' } = req.body; // toggle, add, remove

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

    let result;
    if (action === 'add') {
      result = await FavoriteModel.addFavoriteByType(openid, audio_id, 'audio');
    } else if (action === 'remove') {
      result = await FavoriteModel.removeFavoriteByType(openid, audio_id, 'audio');
    } else {
      // toggle模式
      const checkResult = await FavoriteModel.isFavoritedByType(openid, audio_id, 'audio');
      if (checkResult.isFavorited) {
        result = await FavoriteModel.removeFavoriteByType(openid, audio_id, 'audio');
      } else {
        result = await FavoriteModel.addFavoriteByType(openid, audio_id, 'audio');
      }
    }

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.json({
      success: true,
      favorited: action === 'remove' ? false : true,
      message: result.message
    });
  } catch (error) {
    console.error('操作收藏失败:', error);
    res.status(500).json({
      success: false,
      message: '操作收藏失败',
      error: error.message
    });
  }
});

/**
 * 检查是否已收藏音频
 */
router.get('/audios/:audio_id/favorite', async (req, res) => {
  try {
    const openid = req.openid;
    const { audio_id } = req.params;

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

    const result = await FavoriteModel.isFavoritedByType(openid, audio_id, 'audio');

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.json({
      success: true,
      favorited: result.isFavorited
    });
  } catch (error) {
    console.error('检查收藏状态失败:', error);
    res.status(500).json({
      success: false,
      message: '检查收藏状态失败',
      error: error.message
    });
  }
});

// ====================== 播放历史管理 ======================

/**
 * 添加播放记录
 */
router.post('/audios/:audio_id/play', async (req, res) => {
  try {
    const openid = req.openid;
    const { audio_id } = req.params;
    const {
      timer_minutes = 0,
      play_duration = 0,
      is_completed = true,
      device_info = 'unknown'
    } = req.body;

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

    const result = await PlayHistoryModel.addPlayRecord(openid, {
      audio_ids: [parseInt(audio_id)],
      play_type: 'single',
      timer_minutes: parseInt(timer_minutes),
      play_duration: parseInt(play_duration),
      is_completed: is_completed === 'true' || is_completed === true,
      device_info
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || result.error
      });
    }

    res.json({
      success: true,
      message: '播放记录添加成功'
    });
  } catch (error) {
    console.error('添加播放记录失败:', error);
    res.status(500).json({
      success: false,
      message: '添加播放记录失败',
      error: error.message
    });
  }
});

/**
 * 获取播放历史
 */
router.get('/user/play-history', async (req, res) => {
  try {
    const openid = req.openid;
    const { limit = 20, offset = 0 } = req.query;

    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }

    const result = await PlayHistoryModel.getUserPlayHistory(openid, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || result.error
      });
    }

    res.json({
      success: true,
      data: result.data || [],
      total: result.total || 0
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

// ====================== 组合音频管理 ======================

/**
 * 创建组合音频
 */
router.post('/combinations', async (req, res) => {
  try {
    const openid = req.openid;
    const { name, audio_ids, is_system = false } = req.body;

    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }

    if (!name || !audio_ids || !Array.isArray(audio_ids)) {
      return res.status(400).json({
        success: false,
        message: '组合名称和音频ID数组不能为空'
      });
    }

    const result = await CombinationModel.createCombination(openid, {
      name,
      audio_ids,
      is_system
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.json({
      success: true,
      data: result,
      message: '组合创建成功'
    });
  } catch (error) {
    console.error('创建组合音频失败:', error);
    res.status(500).json({
      success: false,
      message: '创建组合音频失败',
      error: error.message
    });
  }
});

/**
 * 获取随机组合（骰子功能）
 */
router.get('/combinations/dice', async (req, res) => {
  try {
    const openid = req.openid;
    const { 
      category_id,
      max_duration,
      audio_count = 3 
    } = req.query;

    const preferences = {
      category_id: category_id ? parseInt(category_id) : null,
      max_duration: max_duration ? parseInt(max_duration) : null,
      audio_count: parseInt(audio_count)
    };

    const result = await CombinationModel.diceRandomCombination(openid, preferences);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.json({
      success: true,
      data: result.data,
      source: result.source
    });
  } catch (error) {
    console.error('骰子随机组合失败:', error);
    res.status(500).json({
      success: false,
      message: '骰子随机组合失败',
      error: error.message
    });
  }
});

module.exports = router;