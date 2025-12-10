const express = require('express');
const router = express.Router();
const Story = require('./database/models/Story');
const { optionalAuth } = require('./middleware/auth');

// 获取故事列表
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { 
      category = 'all',
      page = 1,
      limit = 20,
      orderBy = 'created_at',
      order = 'DESC'
    } = req.query;

    const result = await Story.getStories({
      category,
      page: parseInt(page),
      limit: parseInt(limit),
      orderBy,
      order
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
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      message: result.message
    });

  } catch (error) {
    console.error('获取故事列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取故事列表失败',
      error: error.message
    });
  }
});

// 获取故事详情
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: '故事ID无效'
      });
    }

    const result = await Story.getStoryDetail(parseInt(id));

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      data: result.data,
      message: result.message
    });

  } catch (error) {
    console.error('获取故事详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取故事详情失败',
      error: error.message
    });
  }
});

// 生成TTS音频
router.post('/:id/tts', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { voice, speed } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: '故事ID无效'
      });
    }

    const result = await Story.generateTTS(parseInt(id), {
      voice: voice || 'xiaoyun',
      speed: speed ? parseFloat(speed) : 1.0
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
      data: result.data,
      message: result.message
    });

  } catch (error) {
    console.error('生成TTS失败:', error);
    res.status(500).json({
      success: false,
      message: '生成TTS失败',
      error: error.message
    });
  }
});

// 记录播放行为
router.post('/:id/play-report', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { playDuration, device } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: '故事ID无效'
      });
    }

    if (!playDuration || isNaN(parseInt(playDuration))) {
      return res.status(400).json({
        success: false,
        message: '播放时长无效'
      });
    }

    const result = await Story.reportPlay(parseInt(id), {
      playDuration: parseInt(playDuration),
      device: device || 'unknown'
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
      data: result.data,
      message: result.message
    });

  } catch (error) {
    console.error('记录播放行为失败:', error);
    res.status(500).json({
      success: false,
      message: '记录播放行为失败',
      error: error.message
    });
  }
});

// 获取故事分类列表
router.get('/categories/list', async (req, res) => {
  try {
    const result = await Story.getCategories();

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.data,
      message: result.message
    });

  } catch (error) {
    console.error('获取故事分类列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取故事分类列表失败',
      error: error.message
    });
  }
});

// 获取故事分类（兼容旧路径）
router.get('/categories', async (req, res) => {
  try {
    const result = await Story.getCategories();

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.data,
      message: result.message
    });

  } catch (error) {
    console.error('获取故事分类失败:', error);
    res.status(500).json({
      success: false,
      message: '获取故事分类失败',
      error: error.message
    });
  }
});

// 获取故事分类（兼容旧路径）
router.get('/categories', async (req, res) => {
  try {
    const result = await Story.getCategories();

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.data,
      message: result.message
    });

  } catch (error) {
    console.error('获取故事分类失败:', error);
    res.status(500).json({
      success: false,
      message: '获取故事分类失败',
      error: error.message
    });
  }
});

module.exports = router;