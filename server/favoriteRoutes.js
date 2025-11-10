const express = require('express');
const router = express.Router();

// 获取用户收藏列表
router.get('/', async (req, res) => {
  try {
    const openid = req.openid;
    const { limit = 20, offset = 0 } = req.query;

    const FavoriteModel = require('./database/models/Favorite');
    const result = await FavoriteModel.getUserFavorites(openid, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    res.json({
      success: true,
      items: result.data.map(item => ({
        audio_id: item.audio_id,
        created_at: item.created_at
      })),
      total: result.total || 0
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

// 添加收藏
router.post('/', async (req, res) => {
  try {
    const openid = req.openid;
    const { audio_id } = req.body;

    if (!audio_id || isNaN(parseInt(audio_id))) {
      return res.status(400).json({
        success: false,
        message: '音频ID格式无效'
      });
    }

    const FavoriteModel = require('./database/models/Favorite');
    const result = await FavoriteModel.addFavorite(openid, parseInt(audio_id));

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.json({
      success: true,
      favorited: true
    });

  } catch (error) {
    console.error('添加收藏失败:', error);
    res.status(500).json({
      success: false,
      message: '添加收藏失败',
      error: error.message
    });
  }
});

// 取消收藏
router.delete('/:audioId', async (req, res) => {
  try {
    const openid = req.openid;
    const { audioId } = req.params;

    if (!audioId || isNaN(parseInt(audioId))) {
      return res.status(400).json({
        success: false,
        message: '音频ID格式无效'
      });
    }

    const FavoriteModel = require('./database/models/Favorite');
    const result = await FavoriteModel.removeFavorite(openid, parseInt(audioId));

    if (!result.success) {
      // 如果收藏记录不存在，返回成功状态而不是错误
      if (result.error === '收藏记录不存在') {
        return res.json({
          success: true,
          favorited: false,
          message: '收藏记录不存在，已默认取消收藏'
        });
      }
      
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.json({
      success: true,
      favorited: false
    });

  } catch (error) {
    console.error('取消收藏失败:', error);
    res.status(500).json({
      success: false,
      message: '取消收藏失败',
      error: error.message
    });
  }
});

// 检查是否已收藏
router.get('/:audioId', async (req, res) => {
  try {
    const openid = req.openid;
    const { audioId } = req.params;

    if (!audioId || isNaN(parseInt(audioId))) {
      return res.status(400).json({
        success: false,
        message: '音频ID格式无效'
      });
    }

    const FavoriteModel = require('./database/models/Favorite');
    const result = await FavoriteModel.isFavorited(openid, parseInt(audioId));

    if (!result.success) {
      throw new Error(result.error);
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

module.exports = router;