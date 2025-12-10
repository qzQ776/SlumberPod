const express = require('express');
const router = express.Router();
const CommunityService = require('./communityService');

// 认证中间件 - 使用微信JWT token验证
const jwt = require('jsonwebtoken');
// 直接使用正确的JWT密钥，避免环境变量加载问题
const JWT_SECRET = 'slumberpod_jwt_secret_key_2024';

function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '未授权访问，请提供有效的微信token'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.openid = decoded.openid;
      next();
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'token无效或已过期'
      });
    }
    
  } catch (error) {
    console.error('微信token验证失败:', error);
    return res.status(500).json({
      success: false,
      message: '认证处理异常'
    });
  }
}

// ==================== 帖子相关接口 ====================

// 获取社区帖子列表
router.get('/', async (req, res) => {
  try {
    const { 
      limit = 20, 
      offset = 0, 
      category_id,
      status = 'published',
      orderBy = 'created_at',
      order = 'DESC'
    } = req.query;

    // 修复参数解析bug：确保limit和offset是有效数字
    const parsedLimit = parseInt(limit) || 20;
    const parsedOffset = parseInt(offset) || 0;
    const parsedCategoryId = category_id ? parseInt(category_id) : null;

    const result = await CommunityService.getPosts({
      limit: parsedLimit,
      offset: parsedOffset,
      category_id: parsedCategoryId,
      status,
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
      data: result.data || [],
      total: result.total || 0,
      message: result.message
    });

  } catch (error) {
    console.error('获取社区帖子失败:', error);
    res.status(500).json({
      success: false,
      message: '获取社区帖子失败',
      error: error.message
    });
  }
});

// ==================== 搜索和分类相关接口 ====================

// 搜索帖子（必须放在动态路由参数之前）
router.get('/search', async (req, res) => {
  try {
    const { 
      q: keyword,
      limit = 20, 
      offset = 0,
      status = 'published'
    } = req.query;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: '请输入搜索关键词'
      });
    }

    // 修复参数解析bug
    const parsedLimit = parseInt(limit) || 20;
    const parsedOffset = parseInt(offset) || 0;

    // 获取用户身份信息（如果已登录）
    let openid = null;
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        openid = decoded.openid;
      }
    } catch (authError) {
      // 身份验证失败不影响搜索功能，只是不记录搜索历史
      console.log('用户未登录或token无效，搜索历史将不会被记录');
    }

    const result = await CommunityService.searchPosts(keyword, {
      limit: parsedLimit,
      offset: parsedOffset,
      status,
      openid: openid
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      data: result.data || [],
      total: result.total || 0,
      message: result.message
    });

  } catch (error) {
    console.error('搜索帖子失败:', error);
    res.status(500).json({
      success: false,
      message: '搜索帖子失败',
      error: error.message
    });
  }
});

// ==================== 搜索历史相关接口 ====================

// 获取用户搜索历史记录
router.get('/search/history', async (req, res) => {
  try {
    // 验证用户身份
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }

    const token = authHeader.substring(7);
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const openid = decoded.openid;

    const { 
      limit = 10,
      targetType = 'post'
    } = req.query;

    const SearchHistory = require('./database/models/SearchHistory');
    const result = await SearchHistory.getUserSearchHistory(openid, targetType, limit);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.json({
      success: true,
      data: result.data || [],
      message: result.message
    });

  } catch (error) {
    console.error('获取搜索历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取搜索历史失败',
      error: error.message
    });
  }
});

// 删除单条搜索记录
router.delete('/search/history/:recordId', async (req, res) => {
  try {
    // 验证用户身份
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }

    const token = authHeader.substring(7);
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const openid = decoded.openid;

    const { recordId } = req.params;

    const SearchHistory = require('./database/models/SearchHistory');
    const result = await SearchHistory.deleteSearchRecord(openid, recordId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('删除搜索记录失败:', error);
    res.status(500).json({
      success: false,
      message: '删除搜索记录失败',
      error: error.message
    });
  }
});

// 清空用户搜索历史
router.delete('/search/history', async (req, res) => {
  try {
    // 验证用户身份
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }

    const token = authHeader.substring(7);
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const openid = decoded.openid;

    const { targetType = null } = req.query;

    const SearchHistory = require('./database/models/SearchHistory');
    const result = await SearchHistory.clearUserSearchHistory(openid, targetType);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('清空搜索历史失败:', error);
    res.status(500).json({
      success: false,
      message: '清空搜索历史失败',
      error: error.message
    });
  }
});

// 获取热门搜索关键词
router.get('/search/hot', async (req, res) => {
  try {
    const { 
      limit = 10,
      days = 7
    } = req.query;

    const SearchHistory = require('./database/models/SearchHistory');
    const result = await SearchHistory.getHotSearchKeywords(limit, days);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.json({
      success: true,
      data: result.data || [],
      message: result.message
    });

  } catch (error) {
    console.error('获取热门搜索失败:', error);
    res.status(500).json({
      success: false,
      message: '获取热门搜索失败',
      error: error.message
    });
  }
});

// ==================== 热门帖子接口（必须在动态路由参数之前） ====================

// 获取热门帖子（按点赞数排序）
router.get('/hot', async (req, res) => {
  try {
    const { 
      limit = 20, 
      offset = 0,
      category_id,
      status = 'published'
    } = req.query;

    // 修复参数解析bug
    const parsedLimit = parseInt(limit) || 20;
    const parsedOffset = parseInt(offset) || 0;
    const parsedCategoryId = category_id ? parseInt(category_id) : null;

    const result = await CommunityService.getPosts({
      limit: parsedLimit,
      offset: parsedOffset,
      category_id: parsedCategoryId,
      status,
      orderBy: 'like_count',
      order: 'DESC'
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
      total: result.total || 0,
      message: result.message
    });

  } catch (error) {
    console.error('获取热门帖子失败:', error);
    res.status(500).json({
      success: false,
      message: '获取热门帖子失败',
      error: error.message
    });
  }
});



// 获取帖子详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await CommunityService.getPostDetail(id);

    if (!result.success) {
      if (result.message === '帖子不存在') {
        return res.status(404).json({
          success: false,
          message: result.message
        });
      }
      return res.status(400).json({
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
    console.error('获取帖子详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取帖子详情失败',
      error: error.message
    });
  }
});

// 创建帖子（需要认证）
router.post('/', authenticateToken, async (req, res) => {
  try {
    const openid = req.openid;
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }

    console.log('社区路由 - 创建帖子请求头:', req.headers);
    console.log('社区路由 - 创建帖子请求体:', req.body);
    
    // 处理不同格式的请求体
    let requestBody = req.body;
    
    // 如果是x-www-form-urlencoded格式，需要解析参数
    if (req.headers['content-type'] && req.headers['content-type'].includes('application/x-www-form-urlencoded')) {
      // 从请求体中提取参数，支持多种可能的字段名
      requestBody = {
        title: req.body.title || req.body.name,
        content: req.body.content || req.body.text || req.body.description,
        cover_image: req.body.cover_image || req.body.coverUrl,
        audio_id: req.body.audio_id ? parseInt(req.body.audio_id) : null
      };
      
      console.log('社区路由 - 处理后请求体:', requestBody);
    }

    const { title, content, cover_image, audio_id } = requestBody;

    const result = await CommunityService.createPost(openid, {
      title,
      content,
      cover_image,
      audio_id: audio_id ? parseInt(audio_id) : null
    });

    if (!result.success) {
      console.error('社区路由 - 创建帖子失败:', result.message);
      console.error('社区路由 - 错误详情:', result.error);
      return res.status(400).json({
        success: false,
        message: result.message || '创建帖子失败',
        error: result.error || null,
        details: result.details || null
      });
    }

    console.log('社区路由 - 帖子创建成功:', result.data);
    res.json({
      success: true,
      data: result.data,
      message: result.message
    });

  } catch (error) {
    console.error('社区路由 - 创建帖子失败:', error);
    console.error('社区路由 - 错误堆栈:', error.stack);
    res.status(500).json({
      success: false,
      message: '创建帖子失败',
      error: error.message,
      details: error.stack
    });
  }
});

// 更新帖子（需要认证）
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const openid = req.openid;
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }

    const { id } = req.params;
    const { title, content, cover_image, audio_id } = req.body;

    const result = await CommunityService.updatePost(id, openid, {
      title,
      content,
      cover_image,
      audio_id: audio_id ? parseInt(audio_id) : null
    });

    if (!result.success) {
      if (result.message === '帖子不存在') {
        return res.status(404).json({
          success: false,
          message: result.message
        });
      }
      if (result.message === '无权修改此帖子') {
        return res.status(403).json({
          success: false,
          message: result.message
        });
      }
      return res.status(400).json({
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
    console.error('更新帖子失败:', error);
    res.status(500).json({
      success: false,
      message: '更新帖子失败',
      error: error.message
    });
  }
});

// 删除帖子（需要认证）
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const openid = req.openid;
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }

    const { id } = req.params;

    const result = await CommunityService.deletePost(id, openid);

    if (!result.success) {
      if (result.message === '帖子不存在') {
        return res.status(404).json({
          success: false,
          message: result.message
        });
      }
      if (result.message === '无权删除此帖子') {
        return res.status(403).json({
          success: false,
          message: result.message
        });
      }
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('删除帖子失败:', error);
    res.status(500).json({
      success: false,
      message: '删除帖子失败',
      error: error.message
    });
  }
});

// 点赞/取消点赞帖子（需要认证）
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const openid = req.openid;
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }

    const { id } = req.params;

    const result = await CommunityService.toggleLikePost(id, openid);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      liked: result.liked,
      message: result.message
    });

  } catch (error) {
    console.error('点赞帖子失败:', error);
    res.status(500).json({
      success: false,
      message: '点赞帖子失败',
      error: error.message
    });
  }
});

// 检查用户是否点赞了帖子（需要认证）
router.get('/:id/like', authenticateToken, async (req, res) => {
  try {
    const openid = req.openid;
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }

    const { id } = req.params;

    const result = await CommunityService.checkPostLike(id, openid);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      isLiked: result.isLiked,
      message: result.message
    });

  } catch (error) {
    console.error('检查点赞状态失败:', error);
    res.status(500).json({
      success: false,
      message: '检查点赞状态失败',
      error: error.message
    });
  }
});

// ==================== 评论相关接口 ====================

// 获取帖子评论列表
router.get('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      limit = 20, 
      offset = 0,
      orderBy = 'created_at',
      order = 'DESC'
    } = req.query;

    // 修复参数解析bug
    const parsedLimit = parseInt(limit) || 20;
    const parsedOffset = parseInt(offset) || 0;

    const result = await CommunityService.getPostComments(id, {
      limit: parsedLimit,
      offset: parsedOffset,
      orderBy,
      order
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      data: result.data || [],
      total: result.total || 0,
      message: result.message
    });

  } catch (error) {
    console.error('获取评论列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取评论列表失败',
      error: error.message
    });
  }
});

// 添加评论（需要认证）
router.post('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const openid = req.openid;
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }

    const { id } = req.params;
    const { content, parent_id } = req.body;

    const result = await CommunityService.addComment(openid, 'post', id, content, parent_id ? parseInt(parent_id) : null);

    if (!result.success) {
      return res.status(400).json({
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
    console.error('添加评论失败:', error);
    res.status(500).json({
      success: false,
      message: '添加评论失败',
      error: error.message
    });
  }
});

// 删除评论（需要认证）
router.delete('/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const openid = req.openid;
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }

    const { commentId } = req.params;

    const result = await CommunityService.deleteComment(commentId, openid);

    if (!result.success) {
      if (result.message === '无权删除此评论') {
        return res.status(403).json({
          success: false,
          message: result.message
        });
      }
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('删除评论失败:', error);
    res.status(500).json({
      success: false,
      message: '删除评论失败',
      error: error.message
    });
  }
});

// 点赞/取消点赞评论（需要认证）
router.post('/comments/:commentId/like', authenticateToken, async (req, res) => {
  try {
    const openid = req.openid;
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }

    const { commentId } = req.params;

    const result = await CommunityService.toggleLikeComment(commentId, openid);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      liked: result.liked,
      message: result.message
    });

  } catch (error) {
    console.error('点赞评论失败:', error);
    res.status(500).json({
      success: false,
      message: '点赞评论失败',
      error: error.message
    });
  }
});

// ==================== 音频评论相关接口 ====================

// 获取音频评论列表
router.get('/audio/:audio_id/comments', async (req, res) => {
  try {
    const { audio_id } = req.params;
    const { 
      limit = 20, 
      offset = 0,
      orderBy = 'created_at',
      order = 'DESC'
    } = req.query;

    // 修复参数解析bug
    const parsedLimit = parseInt(limit) || 20;
    const parsedOffset = parseInt(offset) || 0;

    const result = await CommunityService.getAudioComments(audioId, {
      limit: parsedLimit,
      offset: parsedOffset,
      orderBy,
      order
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      data: result.data || [],
      total: result.total || 0,
      message: result.message
    });

  } catch (error) {
    console.error('获取音频评论列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取音频评论列表失败',
      error: error.message
    });
  }
});

// 添加音频评论（需要认证）
router.post('/audio/:audio_id/comments', authenticateToken, async (req, res) => {
  try {
    const openid = req.openid;
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }

    const { audioId } = req.params;
    const { content, parent_id } = req.body;

    const result = await CommunityService.addComment(openid, 'audio', audioId, content, parent_id ? parseInt(parent_id) : null);

    if (!result.success) {
      return res.status(400).json({
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
    console.error('添加音频评论失败:', error);
    res.status(500).json({
      success: false,
      message: '添加音频评论失败',
      error: error.message
    });
  }
});

// ==================== 评论回复相关接口 ====================

// 获取评论详情
router.get('/comments/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;

    const result = await CommunityService.getCommentDetail(commentId);

    if (!result.success) {
      if (result.message === '评论不存在') {
        return res.status(404).json({
          success: false,
          message: result.message
        });
      }
      return res.status(400).json({
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
    console.error('获取评论详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取评论详情失败',
      error: error.message
    });
  }
});

// 获取评论回复列表
router.get('/comments/:commentId/replies', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { 
      limit = 20, 
      offset = 0
    } = req.query;

    // 修复参数解析bug
    const parsedLimit = parseInt(limit) || 20;
    const parsedOffset = parseInt(offset) || 0;

    const result = await CommunityService.getCommentReplies(commentId, {
      limit: parsedLimit,
      offset: parsedOffset
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      data: result.data || [],
      total: result.total || 0,
      message: result.message
    });

  } catch (error) {
    console.error('获取评论回复列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取评论回复列表失败',
      error: error.message
    });
  }
});

// 获取最新帖子（按时间排序）
router.get('/latest', async (req, res) => {
  try {
    const { 
      limit = 20, 
      offset = 0,
      category_id,
      status = 'published'
    } = req.query;

    // 修复参数解析bug
    const parsedLimit = parseInt(limit) || 20;
    const parsedOffset = parseInt(offset) || 0;
    const parsedCategoryId = category_id ? parseInt(category_id) : null;

    const result = await CommunityService.getPosts({
      limit: parsedLimit,
      offset: parsedOffset,
      category_id: parsedCategoryId,
      status,
      orderBy: 'created_at',
      order: 'DESC'
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
      total: result.total || 0,
      message: result.message
    });

  } catch (error) {
    console.error('获取最新帖子失败:', error);
    res.status(500).json({
      success: false,
      message: '获取最新帖子失败',
      error: error.message
    });
  }
});

// ==================== 用户相关接口 ====================

// 获取用户发布的帖子（需要认证）
router.get('/user/posts', authenticateToken, async (req, res) => {
  try {
    const openid = req.openid;
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }

    const { 
      limit = 20, 
      offset = 0,
      status = 'published'
    } = req.query;

    // 修复参数解析bug
    const parsedLimit = parseInt(limit) || 20;
    const parsedOffset = parseInt(offset) || 0;

    const result = await CommunityService.getUserPosts(openid, {
      limit: parsedLimit,
      offset: parsedOffset,
      status
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      data: result.data || [],
      total: result.total || 0,
      message: result.message
    });

  } catch (error) {
    console.error('获取用户帖子列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户帖子列表失败',
      error: error.message
    });
  }
});

// 获取用户评论列表（需要认证）
router.get('/user/comments', authenticateToken, async (req, res) => {
  try {
    const openid = req.openid;
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }

    const { 
      limit = 20, 
      offset = 0,
      targetType = null
    } = req.query;

    // 修复参数解析bug
    const parsedLimit = parseInt(limit) || 20;
    const parsedOffset = parseInt(offset) || 0;

    const result = await CommunityService.getUserComments(openid, {
      limit: parsedLimit,
      offset: parsedOffset,
      targetType
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      data: result.data || [],
      total: result.total || 0,
      message: result.message
    });

  } catch (error) {
    console.error('获取用户评论列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户评论列表失败',
      error: error.message
    });
  }
});

module.exports = router;