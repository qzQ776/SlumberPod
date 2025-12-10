const express = require('express');
const router = express.Router();

const FavoriteModel = require('./database/models/Favorite');

// 获取用户收藏列表（组合形式）
router.get('/', async (req, res) => {
  try {
    const openid = req.openid;
    const { 
      limit = 20, 
      offset = 0,
      type = 'combination' // 默认只获取组合收藏
    } = req.query;

    // 获取组合收藏
    const result = await FavoriteModel.getUserCombinationFavorites(openid, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    if (!result.success) {
      throw new Error(result.message || result.error);
    }

    // 处理返回数据格式
    const processedItems = result.data.map(item => {
      // 将组合数据格式化为前端需要的格式
      return {
        type: 'combination',
        id: item.favorite_id,
        combination_id: item.combination_id,
        name: item.custom_name || '白噪音组合',
        audio_ids: item.audio_ids,
        selected_audio_ids: item.selected_audio_ids,
        audios: item.audios.map(audio => ({
          audio_id: audio.audio_id,
          title: audio.title,
          cover_url: audio.cover_url,
          duration_seconds: audio.duration_seconds,
          categories: audio.categories,
          is_selected: item.selected_audio_ids.includes(audio.audio_id)
        })),
        audio_count: item.audio_count,
        selected_count: item.selected_count,
        description: item.description,
        created_at: item.created_at
      };
    });

    res.json({
      success: true,
      data: processedItems,
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

// 添加组合收藏（支持音频组合收藏）
router.post('/', async (req, res) => {
  try {
    const openid = req.openid;
    const { 
      combination_id = null, // 摇骰子组合ID
      audio_ids, // 组合中的所有音频ID（3个或更多）
      selected_audio_ids, // 用户选择的音频ID（1-3个）
      custom_name = null, // 自定义名称
      description = null, // 描述
      item_type = 'combination' // 默认为组合类型
    } = req.body;

    if (!Array.isArray(audio_ids) || audio_ids.length < 3) {
      return res.status(400).json({
        success: false,
        message: '音频组合必须包含至少3个音频'
      });
    }

    if (!Array.isArray(selected_audio_ids) || selected_audio_ids.length === 0 || selected_audio_ids.length > 3) {
      return res.status(400).json({
        success: false,
        message: '已选音频数量必须在1-3个之间'
      });
    }

    if (!['audio', 'combination'].includes(item_type)) {
      return res.status(400).json({
        success: false,
        message: '类型必须为 audio 或 combination'
      });
    }

    const result = await FavoriteModel.favoriteCombination({
      openid: openid,
      combination_id: combination_id,
      audio_ids: audio_ids,
      selected_audio_ids: selected_audio_ids,
      custom_name: custom_name,
      description: description
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      favorited: true,
      data: result.data,
      message: result.message,
      item_type: item_type
    });

  } catch (error) {
    console.error('添加组合收藏失败:', error);
    res.status(500).json({
      success: false,
      message: '添加组合收藏失败',
      error: error.message
    });
  }
});

// 取消收藏（支持音频和组合音频）
router.delete('/:itemType/:itemId', async (req, res) => {
  try {
    const openid = req.openid;
    const { itemType, itemId } = req.params;

    if (!itemId) {
      return res.status(400).json({
        success: false,
        message: '项目ID不能为空'
      });
    }

    if (!['audio', 'combination'].includes(itemType)) {
      return res.status(400).json({
        success: false,
        message: '类型必须为 audio 或 combination'
      });
    }

    const result = await FavoriteModel.removeFavoriteByType(openid, itemId, itemType);

    if (!result.success) {
      // 如果收藏记录不存在，返回成功状态而不是错误
      if (result.error.includes('记录不存在')) {
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
      favorited: false,
      message: result.message,
      item_type: itemType
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

// 检查是否已收藏（支持音频和组合音频）
router.get('/:itemType/:itemId', async (req, res) => {
  try {
    const openid = req.openid;
    const { itemType, itemId } = req.params;

    if (!itemId) {
      return res.status(400).json({
        success: false,
        message: '项目ID不能为空'
      });
    }

    if (!['audio', 'combination'].includes(itemType)) {
      return res.status(400).json({
        success: false,
        message: '类型必须为 audio 或 combination'
      });
    }

    const result = await FavoriteModel.isFavoritedByType(openid, itemId, itemType);

    if (!result.success) {
      throw new Error(result.error);
    }

    res.json({
      success: true,
      favorited: result.isFavorited,
      item_type: itemType
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

// 获取用户收藏统计
router.get('/statistics', async (req, res) => {
  try {
    const openid = req.openid;

    const result = await FavoriteModel.getUserFavoriteStats(openid);

    if (!result.success) {
      throw new Error(result.error);
    }

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('获取收藏统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取收藏统计失败',
      error: error.message
    });
  }
});

// 批量检查收藏状态
router.post('/batch-check', async (req, res) => {
  try {
    const openid = req.openid;
    const { items } = req.body; // [{id: '123', type: 'audio'}, {id: '456', type: 'combination'}]

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'items 必须是数组'
      });
    }

    const results = [];
    
    for (const item of items) {
      const { id, type = 'audio' } = item;
      
      if (!id || !['audio', 'combination'].includes(type)) {
        results.push({
          id,
          type,
          favorited: false,
          error: '参数无效'
        });
        continue;
      }

      const result = await FavoriteModel.isFavoritedByType(openid, id, type);
      
      if (result.success) {
        results.push({
          id,
          type,
          favorited: result.isFavorited
        });
      } else {
        results.push({
          id,
          type,
          favorited: false,
          error: result.error
        });
      }
    }

    res.json({
      success: true,
      items: results
    });

  } catch (error) {
    console.error('批量检查收藏状态失败:', error);
    res.status(500).json({
      success: false,
      message: '批量检查收藏状态失败',
      error: error.message
    });
  }
});

// 批量操作收藏
router.post('/batch-action', async (req, res) => {
  try {
    const openid = req.openid;
    const { 
      action, // 'add' | 'remove'
      items // [{id: '123', type: 'audio'}, {id: '456', type: 'combination'}]
    } = req.body;

    if (!['add', 'remove'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'action 必须是 add 或 remove'
      });
    }

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'items 必须是数组'
      });
    }

    const results = [];
    
    for (const item of items) {
      const { id, type = 'audio' } = item;
      
      if (!id || !['audio', 'combination'].includes(type)) {
        results.push({
          id,
          type,
          success: false,
          error: '参数无效'
        });
        continue;
      }

      let result;
      if (action === 'add') {
        result = await FavoriteModel.addFavoriteByType(openid, id, type);
      } else {
        result = await FavoriteModel.removeFavoriteByType(openid, id, type);
      }
      
      results.push({
        id,
        type,
        success: result.success,
        message: result.message,
        error: result.error
      });
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    res.json({
      success: true,
      action: action,
      results: results,
      summary: {
        total: totalCount,
        success: successCount,
        failed: totalCount - successCount
      }
    });

  } catch (error) {
    console.error('批量操作收藏失败:', error);
    res.status(500).json({
      success: false,
      message: '批量操作收藏失败',
      error: error.message
    });
  }
});

module.exports = router;