const express = require('express')
const router = express.Router()

// MySQL音频模型
const AudioModel = require('./database/models/Audio')
const { query } = require('./database/config')

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

// 增加播放次数
router.post('/:id/play', async (req, res) => {
  try {
    const { id } = req.params
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: '音频ID格式无效，请使用正确的数字格式'
      })
    }
    
    // 调用模型方法（成功无返回值，失败抛异常）
    await AudioModel.incrementPlayCount(parseInt(id));
    
    res.json({
      success: true,
      message: '播放次数增加成功'
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
router.post('/:id/favorite', async (req, res) => {
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
router.get('/favorites/mine', async (req, res) => {
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
    })
  }
})

// 新增：获取分类及其子分类下的音频
router.get('/category/:categoryId/with-subcategories', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    // 验证分类ID格式
    if (!categoryId || isNaN(parseInt(categoryId))) {
      return res.status(400).json({
        success: false,
        message: '分类ID格式无效'
      })
    }
    
    const audios = await AudioModel.getAudiosByCategoryWithSubcategories(parseInt(categoryId), {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      data: audios || [],
      total: audios ? audios.length : 0
    })
  } catch (error) {
    console.error('获取分类及其子分类音频失败:', error);
    res.status(500).json({
      success: false,
      message: '获取分类及其子分类音频失败',
      error: error.message
    })
  }
})

module.exports = router