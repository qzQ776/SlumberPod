const CommunityPost = require('./database/models/CommunityPost');
const CommentModel = require('./database/models/Comment');

/**
 * 社区服务层 - 处理帖子、评论、点赞等业务逻辑
 */
class CommunityService {
  
  /**
   * 获取帖子列表
   */
  async getPosts(options = {}) {
    try {
      const result = await CommunityPost.getPosts(options);
      
      if (!result.success) {
        return {
          success: false,
          message: result.error || '获取帖子列表失败'
        };
      }
      
      return {
        success: true,
        data: result.data,
        total: result.total,
        message: '获取帖子列表成功'
      };
    } catch (error) {
      console.error('社区服务 - 获取帖子列表失败:', error);
      return {
        success: false,
        message: '获取帖子列表失败',
        error: error.message
      };
    }
  }

  /**
   * 获取帖子详情
   */
  async getPostDetail(postId) {
    try {
      if (!postId || isNaN(parseInt(postId))) {
        return {
          success: false,
          message: '帖子ID格式无效'
        };
      }
      
      const result = await CommunityPost.getPostById(parseInt(postId));
      
      if (!result.success) {
        return {
          success: false,
          message: result.error || '获取帖子详情失败'
        };
      }
      
      if (!result.data) {
        return {
          success: false,
          message: '帖子不存在'
        };
      }
      
      return {
        success: true,
        data: result.data,
        message: '获取帖子详情成功'
      };
    } catch (error) {
      console.error('社区服务 - 获取帖子详情失败:', error);
      return {
        success: false,
        message: '获取帖子详情失败',
        error: error.message
      };
    }
  }

  /**
   * 创建帖子
   */
  async createPost(openid, postData) {
    try {
      console.log('社区服务 - 创建帖子参数:', { openid, postData });
      
      // 验证必填字段 - 更灵活的验证逻辑
      if (!postData.content && !postData.title) {
        return {
          success: false,
          message: '帖子内容或标题不能同时为空'
        };
      }
      
      // 如果content为空但有title，则使用title作为content
      const processedData = {
        ...postData,
        content: postData.content || postData.title || '用户的分享'
      };
      
      const result = await CommunityPost.createPost(openid, processedData);
      
      if (!result.success) {
        console.error('社区服务 - 创建帖子失败:', result.message);
        return {
          success: false,
          message: result.message || '创建帖子失败'
        };
      }
      
      console.log('社区服务 - 帖子创建成功:', result.data);
      return {
        success: true,
        data: result.data,
        message: '帖子创建成功'
      };
    } catch (error) {
      console.error('社区服务 - 创建帖子失败:', error);
      return {
        success: false,
        message: '创建帖子失败',
        error: error.message
      };
    }
  }

  /**
   * 更新帖子
   */
  async updatePost(postId, openid, postData) {
    try {
      if (!postId || isNaN(parseInt(postId))) {
        return {
          success: false,
          message: '帖子ID格式无效'
        };
      }
      
      const result = await CommunityPost.updatePost(parseInt(postId), openid, postData);
      
      if (!result.success) {
        return {
          success: false,
          message: result.error || '更新帖子失败'
        };
      }
      
      return {
        success: true,
        data: result.data,
        message: '帖子更新成功'
      };
    } catch (error) {
      console.error('社区服务 - 更新帖子失败:', error);
      return {
        success: false,
        message: '更新帖子失败',
        error: error.message
      };
    }
  }

  /**
   * 删除帖子
   */
  async deletePost(postId, openid) {
    try {
      if (!postId || isNaN(parseInt(postId))) {
        return {
          success: false,
          message: '帖子ID格式无效'
        };
      }
      
      const result = await CommunityPost.deletePost(parseInt(postId), openid);
      
      if (!result.success) {
        return {
          success: false,
          message: result.error || '删除帖子失败'
        };
      }
      
      return {
        success: true,
        message: '帖子删除成功'
      };
    } catch (error) {
      console.error('社区服务 - 删除帖子失败:', error);
      return {
        success: false,
        message: '删除帖子失败',
        error: error.message
      };
    }
  }

  /**
   * 点赞/取消点赞帖子
   */
  async toggleLikePost(postId, openid) {
    try {
      if (!postId || isNaN(parseInt(postId))) {
        return {
          success: false,
          message: '帖子ID格式无效'
        };
      }
      
      const result = await CommunityPost.toggleLike(openid, parseInt(postId));
      
      if (!result.success) {
        return {
          success: false,
          message: result.error || '操作失败'
        };
      }
      
      return {
        success: true,
        liked: result.liked,
        message: result.message
      };
    } catch (error) {
      console.error('社区服务 - 点赞帖子失败:', error);
      return {
        success: false,
        message: '操作失败',
        error: error.message
      };
    }
  }

  /**
   * 检查用户是否点赞了帖子
   */
  async checkPostLike(postId, openid) {
    try {
      if (!postId || isNaN(parseInt(postId))) {
        return {
          success: false,
          message: '帖子ID格式无效'
        };
      }
      
      const result = await CommunityPost.isLiked(openid, parseInt(postId));
      
      if (!result.success) {
        return {
          success: false,
          message: result.error || '检查点赞状态失败'
        };
      }
      
      return {
        success: true,
        isLiked: result.isLiked,
        message: '检查点赞状态成功'
      };
    } catch (error) {
      console.error('社区服务 - 检查点赞状态失败:', error);
      return {
        success: false,
        message: '检查点赞状态失败',
        error: error.message
      };
    }
  }

  /**
   * 获取音频评论列表
   */
  async getAudioComments(audioId, options = {}) {
    try {
      if (!audioId || isNaN(parseInt(audioId))) {
        return {
          success: false,
          message: '音频ID格式无效'
        };
      }
      
      const result = await CommentModel.getComments('audio', parseInt(audioId), options);
      
      if (!result.success) {
        return {
          success: false,
          message: result.error || '获取音频评论列表失败'
        };
      }
      
      return {
        success: true,
        data: result.data,
        total: result.total,
        message: '获取音频评论列表成功'
      };
    } catch (error) {
      console.error('社区服务 - 获取音频评论列表失败:', error);
      return {
        success: false,
        message: '获取音频评论列表失败',
        error: error.message
      };
    }
  }

  /**
   * 获取帖子评论列表
   */
  async getPostComments(postId, options = {}) {
    try {
      if (!postId || isNaN(parseInt(postId))) {
        return {
          success: false,
          message: '帖子ID格式无效'
        };
      }
      
      const result = await CommentModel.getComments('post', parseInt(postId), options);
      
      if (!result.success) {
        return {
          success: false,
          message: result.error || '获取评论列表失败'
        };
      }
      
      return {
        success: true,
        data: result.data,
        total: result.total,
        message: '获取评论列表成功'
      };
    } catch (error) {
      console.error('社区服务 - 获取评论列表失败:', error);
      return {
        success: false,
        message: '获取评论列表失败',
        error: error.message
      };
    }
  }

  /**
   * 添加评论
   */
  async addComment(openid, targetType, targetId, content, parentId = null) {
    try {
      if (!content) {
        return {
          success: false,
          message: '评论内容不能为空'
        };
      }
      
      const result = await CommentModel.addComment(openid, targetType, parseInt(targetId), content, parentId);
      
      if (!result.success) {
        return {
          success: false,
          message: result.error || '添加评论失败'
        };
      }
      
      return {
        success: true,
        data: result.data,
        message: result.message
      };
    } catch (error) {
      console.error('社区服务 - 添加评论失败:', error);
      return {
        success: false,
        message: '添加评论失败',
        error: error.message
      };
    }
  }

  /**
   * 删除评论
   */
  async deleteComment(commentId, openid) {
    try {
      if (!commentId || isNaN(parseInt(commentId))) {
        return {
          success: false,
          message: '评论ID格式无效'
        };
      }
      
      const result = await CommentModel.deleteComment(parseInt(commentId), openid);
      
      if (!result.success) {
        return {
          success: false,
          message: result.error || '删除评论失败'
        };
      }
      
      return {
        success: true,
        message: result.message
      };
    } catch (error) {
      console.error('社区服务 - 删除评论失败:', error);
      return {
        success: false,
        message: '删除评论失败',
        error: error.message
      };
    }
  }

  /**
   * 点赞/取消点赞评论
   */
  async toggleLikeComment(commentId, openid) {
    try {
      if (!commentId || isNaN(parseInt(commentId))) {
        return {
          success: false,
          message: '评论ID格式无效'
        };
      }
      
      const result = await CommentModel.toggleLike(openid, parseInt(commentId));
      
      if (!result.success) {
        return {
          success: false,
          message: result.error || '操作失败'
        };
      }
      
      return {
        success: true,
        liked: result.liked,
        message: result.message
      };
    } catch (error) {
      console.error('社区服务 - 点赞评论失败:', error);
      return {
        success: false,
        message: '操作失败',
        error: error.message
      };
    }
  }

  /**
   * 获取用户发布的帖子列表
   */
  async getUserPosts(openid, options = {}) {
    try {
      const result = await CommunityPost.getUserPosts(openid, options);
      
      if (!result.success) {
        return {
          success: false,
          message: result.error || '获取用户帖子列表失败'
        };
      }
      
      return {
        success: true,
        data: result.data,
        total: result.total,
        message: '获取用户帖子列表成功'
      };
    } catch (error) {
      console.error('社区服务 - 获取用户帖子列表失败:', error);
      return {
        success: false,
        message: '获取用户帖子列表失败',
        error: error.message
      };
    }
  }

  /**
   * 获取评论详情
   */
  async getCommentDetail(commentId) {
    try {
      if (!commentId || isNaN(parseInt(commentId))) {
        return {
          success: false,
          message: '评论ID格式无效'
        };
      }
      
      const result = await CommentModel.getCommentById(parseInt(commentId));
      
      if (!result.success) {
        return {
          success: false,
          message: result.error || '获取评论详情失败'
        };
      }
      
      if (!result.data) {
        return {
          success: false,
          message: '评论不存在'
        };
      }
      
      return {
        success: true,
        data: result.data,
        message: '获取评论详情成功'
      };
    } catch (error) {
      console.error('社区服务 - 获取评论详情失败:', error);
      return {
        success: false,
        message: '获取评论详情失败',
        error: error.message
      };
    }
  }

  /**
   * 获取评论回复列表
   */
  async getCommentReplies(commentId, options = {}) {
    try {
      if (!commentId || isNaN(parseInt(commentId))) {
        return {
          success: false,
          message: '评论ID格式无效'
        };
      }
      
      const result = await CommentModel.getCommentReplies(parseInt(commentId), options);
      
      if (!result.success) {
        return {
          success: false,
          message: result.error || '获取评论回复列表失败'
        };
      }
      
      return {
        success: true,
        data: result.data,
        total: result.total,
        message: '获取评论回复列表成功'
      };
    } catch (error) {
      console.error('社区服务 - 获取评论回复列表失败:', error);
      return {
        success: false,
        message: '获取评论回复列表失败',
        error: error.message
      };
    }
  }

  /**
   * 搜索帖子
   */
  async searchPosts(keyword, options = {}) {
    try {
      if (!keyword || keyword.trim() === '') {
        return {
          success: false,
          message: '搜索关键词不能为空'
        };
      }
      
      const result = await CommunityPost.searchPosts(keyword, options);
      
      if (!result.success) {
        return {
          success: false,
          message: result.error || '搜索帖子失败'
        };
      }
      
      return {
        success: true,
        data: result.data,
        total: result.total,
        message: '搜索帖子成功'
      };
    } catch (error) {
      console.error('社区服务 - 搜索帖子失败:', error);
      return {
        success: false,
        message: '搜索帖子失败',
        error: error.message
      };
    }
  }

  /**
   * 获取用户评论列表
   */
  async getUserComments(openid, options = {}) {
    try {
      const result = await CommentModel.getUserComments(openid, options);
      
      if (!result.success) {
        return {
          success: false,
          message: result.error || '获取用户评论列表失败'
        };
      }
      
      return {
        success: true,
        data: result.data,
        total: result.total,
        message: '获取用户评论列表成功'
      };
    } catch (error) {
      console.error('社区服务 - 获取用户评论列表失败:', error);
      return {
        success: false,
        message: '获取用户评论列表失败',
        error: error.message
      };
    }
  }
}

module.exports = new CommunityService();