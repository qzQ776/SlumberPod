const express = require('express');
const router = express.Router();

// 获取帖子评论列表
router.get('/post/:post_id', async (req, res) => {
  try {
    const { post_id } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    if (!post_id || isNaN(parseInt(post_id))) {
      return res.status(400).json({
        success: false,
        message: '帖子ID格式无效'
      });
    }

    const CommentModel = require('./database/models/Comment');
    const result = await CommentModel.getPostComments(parseInt(post_id), {
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
    console.error('获取评论列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取评论列表失败',
      error: error.message
    });
  }
});

// 添加评论
router.post('/', async (req, res) => {
  try {
    const openid = req.openid;
    const { post_id, content, parent_id } = req.body;

    if (!post_id || !content) {
      return res.status(400).json({
        success: false,
        message: '帖子ID和评论内容不能为空'
      });
    }

    const CommentModel = require('./database/models/Comment');
    const result = await CommentModel.addComment(openid, post_id, content, parent_id || null);

    if (!result.success) {
      throw new Error(result.error);
    }

    res.json({
      success: true,
      message: '评论添加成功',
      data: result.data
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

// 删除评论
router.delete('/:id', async (req, res) => {
  try {
    const openid = req.openid;
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: '评论ID格式无效'
      });
    }

    const CommentModel = require('./database/models/Comment');
    const result = await CommentModel.deleteComment(parseInt(id), openid);

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
    console.error('删除评论失败:', error);
    res.status(500).json({
      success: false,
      message: '删除评论失败',
      error: error.message
    });
  }
});

// 获取评论回复列表
router.get('/:id/replies', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: '评论ID格式无效'
      });
    }

    const CommentModel = require('./database/models/Comment');
    const result = await CommentModel.getCommentReplies(parseInt(id), {
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
    console.error('获取评论回复失败:', error);
    res.status(500).json({
      success: false,
      message: '获取评论回复失败',
      error: error.message
    });
  }
});

module.exports = router;