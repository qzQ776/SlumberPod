const { query } = require('../config');

class CommunityPost {
  /**
   * 获取社区帖子列表（根据数据库表结构设计）
   */
  static async getPosts(options = {}) {
    try {
      const { 
        limit = 20, 
        offset = 0, 
        category_id = null,
        status = 'published',
        orderBy = 'created_at',
        order = 'DESC'
      } = options;
      
      // 确保参数是数字类型
      const limitNum = parseInt(limit) || 20;
      const offsetNum = parseInt(offset) || 0;
      
      // 使用手动参数替换解决MySQL2参数绑定问题
      let sql = `
        SELECT 
          p.post_id,
          p.author_openid as openid,
          p.title,
          p.content,
          p.cover_image as cover_url,
          p.audio_id,
          p.like_count,
          p.comment_count,
          p.status,
          p.created_at,
          p.updated_at,
          u.nickname,
          u.avatar_url,
          a.title as audio_title,
          a.cover_url as audio_cover
        FROM posts p
        LEFT JOIN users u ON p.author_openid = u.openid
        LEFT JOIN audios a ON p.audio_id = a.audio_id
        WHERE p.status = '${status}'
      `;
      
      // 分类筛选
      if (category_id) {
        sql += ` AND EXISTS (
          SELECT 1 FROM audio_category_mapping acm 
          WHERE acm.audio_id = p.audio_id AND acm.category_id = ${category_id}
        )`;
      }
      
      // 排序
      sql += ` ORDER BY p.${orderBy} ${order}`;
      
      // 分页 - 使用手动参数替换
      sql += ` LIMIT ${limitNum} OFFSET ${offsetNum}`;
      
      // 直接执行SQL，不使用参数绑定
      const result = await query(sql);
      
      return {
        success: true,
        data: result.data || [],
        total: result.data ? result.data.length : 0
      };
    } catch (error) {
      console.error('获取社区帖子失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取帖子详情
   */
  static async getPostById(postId) {
    try {
      const sql = `
        SELECT 
          p.post_id,
          p.author_openid as openid,
          p.title,
          p.content,
          p.cover_image as cover_url,
          p.audio_id,
          p.like_count,
          p.comment_count,
          p.status,
          p.created_at,
          p.updated_at,
          u.nickname,
          u.avatar_url,
          a.title as audio_title,
          a.cover_url as audio_cover,
          a.duration_seconds as audio_duration
        FROM posts p
        LEFT JOIN users u ON p.author_openid = u.openid
        LEFT JOIN audios a ON p.audio_id = a.audio_id
        WHERE p.post_id = ?
      `;
      
      const result = await query(sql, [postId]);
      
        if (!result.success || !result.data || result.data.length === 0) {
        return {
          success: false,
          message: '帖子不存在'
        };
      }
      
      return {
        success: true,
        data: result.data[0],
        message: '获取帖子详情成功'
      };
    } catch (error) {
      console.error('获取帖子详情失败:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 创建帖子
   */
  static async createPost(openid, postData) {
    try {
      console.log('数据库模型 - 创建帖子参数:', { openid, postData });
      
      const { title, content, cover_image, audio_id } = postData;
      
      // 更灵活的验证逻辑 - 允许title或content有一个为空
      if (!content && !title) {
        return {
          success: false,
          message: '帖子内容或标题不能同时为空'
        };
      }
      
      // 如果content为空但有title，则使用title作为content
      const actualContent = content || title || '用户的分享';
      const actualTitle = title || '用户的分享';
      
      // 将 undefined 转换为 null，避免 MySQL 参数绑定错误
      const safeCoverImage = cover_image === undefined ? null : cover_image;
      const safeAudioId = audio_id === undefined ? null : audio_id;
      
      console.log('数据库模型 - 实际插入数据:', {
        openid,
        title: actualTitle,
        content: actualContent,
        cover_image: safeCoverImage,
        audio_id: safeAudioId
      });
      
      const sql = `
        INSERT INTO posts (author_openid, title, content, cover_image, audio_id, status)
        VALUES (?, ?, ?, ?, ?, 'published')
      `;
      
      const result = await query(sql, [openid, actualTitle, actualContent, safeCoverImage, safeAudioId]);
      
      if (!result.success || !result.insertId) {
        console.error('数据库模型 - 创建帖子SQL失败:', result.error);
        return {
          success: false,
          message: '创建帖子失败',
          error: result.error
        };
      }
      
      console.log('数据库模型 - 帖子创建成功，插入ID:', result.insertId);
      
      // 直接返回成功信息，避免递归调用getPostById可能的问题
      return {
        success: true,
        data: {
          post_id: result.insertId,
          openid: openid,
          title: actualTitle,
          content: actualContent,
          cover_url: safeCoverImage,
          audio_id: safeAudioId,
          status: 'published',
          like_count: 0,
          comment_count: 0,
          created_at: new Date(),
          updated_at: new Date()
        },
        message: '帖子创建成功'
      };
    } catch (error) {
      console.error('创建帖子失败:', error);
      console.error('错误堆栈:', error.stack);
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
  static async updatePost(postId, openid, postData) {
    try {
      // 验证帖子所有权
      const checkSql = `
        SELECT post_id FROM posts 
        WHERE post_id = ? AND author_openid = ?
      `;
      
      const checkResult = await query(checkSql, [postId, openid]);
      
      if (!checkResult.success || !checkResult.data || checkResult.data.length === 0) {
        return {
          success: false,
          error: '无权修改此帖子'
        };
      }
      
      const { title, content, cover_image, audio_id } = postData;
      
      // 将 undefined 转换为 null，避免 MySQL 参数绑定错误
      const safeCoverImage = cover_image === undefined ? null : cover_image;
      const safeAudioId = audio_id === undefined ? null : audio_id;
      
      const sql = `
        UPDATE posts 
        SET title = ?, content = ?, cover_image = ?, audio_id = ?, updated_at = NOW()
        WHERE post_id = ?
      `;
      
      const result = await query(sql, [title, content, safeCoverImage, safeAudioId, postId]);
      
      if (!result.success) {
        return {
          success: false,
          error: '更新帖子失败'
        };
      }
      
      // 返回更新后的帖子
      const updatedPost = await this.getPostById(postId);
      return updatedPost;
    } catch (error) {
      console.error('更新帖子失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 删除帖子（软删除）
   */
  static async deletePost(postId, openid) {
    try {
      // 验证帖子所有权
      const checkSql = `
        SELECT post_id FROM posts 
        WHERE post_id = ? AND author_openid = ?
      `;
      
      const checkResult = await query(checkSql, [postId, openid]);
      
      if (!checkResult.success || !checkResult.data || checkResult.data.length === 0) {
        return {
          success: false,
          error: '无权删除此帖子'
        };
      }
      
      const sql = `
        UPDATE posts 
        SET status = 'deleted', updated_at = NOW()
        WHERE post_id = ?
      `;
      
      const result = await query(sql, [postId]);
      
      if (!result.success) {
        return {
          success: false,
          error: '删除帖子失败'
        };
      }
      
      return {
        success: true,
        message: '帖子删除成功'
      };
    } catch (error) {
      console.error('删除帖子失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 点赞/取消点赞帖子
   */
  static async toggleLike(openid, postId) {
    try {
      // 检查是否已经点赞
      const checkSql = `
        SELECT id FROM post_likes 
        WHERE openid = ? AND post_id = ?
      `;
      
      const checkResult = await query(checkSql, [openid, postId]);
      
      if (checkResult.success && checkResult.data && checkResult.data.length > 0) {
        // 取消点赞
        const deleteSql = `
          DELETE FROM post_likes 
          WHERE openid = ? AND post_id = ?
        `;
        
        const deleteResult = await query(deleteSql, [openid, postId]);
        
        if (deleteResult.success) {
          // 更新帖子点赞数
          await this.updateLikeCount(postId, -1);
          
          return {
            success: true,
            liked: false,
            message: '取消点赞成功'
          };
        }
      } else {
        // 点赞
        const insertSql = `
          INSERT INTO post_likes (openid, post_id)
          VALUES (?, ?)
        `;
        
        const insertResult = await query(insertSql, [openid, postId]);
        
        if (insertResult.success) {
          // 更新帖子点赞数
          await this.updateLikeCount(postId, 1);
          
          return {
            success: true,
            liked: true,
            message: '点赞成功'
          };
        }
      }
      
      return {
        success: false,
        error: '操作失败'
      };
    } catch (error) {
      console.error('切换点赞状态失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 检查用户是否点赞了帖子
   */
  static async isLiked(openid, postId) {
    try {
      const sql = `
        SELECT id FROM post_likes 
        WHERE openid = ? AND post_id = ?
      `;
      
      const result = await query(sql, [openid, postId]);
      
      return {
        success: true,
        isLiked: result.success && result.data && result.data.length > 0
      };
    } catch (error) {
      console.error('检查点赞状态失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 更新帖子点赞数（内部方法）
   */
  static async updateLikeCount(postId, increment) {
    try {
      const sql = `
        UPDATE posts 
        SET like_count = like_count + ?, updated_at = NOW()
        WHERE post_id = ?
      `;
      
      await query(sql, [increment, postId]);
    } catch (error) {
      console.error('更新点赞数失败:', error);
    }
  }

  /**
   * 搜索帖子
   */
  static async searchPosts(keyword, options = {}) {
    try {
      const { limit = 20, offset = 0, status = 'published' } = options;
      
      if (!keyword || keyword.trim() === '') {
        return {
          success: false,
          error: '搜索关键词不能为空'
        };
      }
      
      const sql = `
        SELECT 
          p.post_id,
          p.author_openid as openid,
          p.title,
          p.content,
          p.cover_image as cover_url,
          p.audio_id,
          p.like_count,
          p.comment_count,
          p.status,
          p.created_at,
          p.updated_at,
          u.nickname,
          u.avatar_url,
          a.title as audio_title,
          a.cover_url as audio_cover
        FROM posts p
        LEFT JOIN users u ON p.author_openid = u.openid
        LEFT JOIN audios a ON p.audio_id = a.audio_id
        WHERE p.status = ? AND (
          p.title LIKE ? OR 
          p.content LIKE ? OR
          u.nickname LIKE ?
        )
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      const searchTerm = `%${keyword}%`;
      
      const result = await query(sql, [status, searchTerm, searchTerm, searchTerm, parseInt(limit) || 20, parseInt(offset) || 0]);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }
      
      // 获取总数
      const countSql = `
        SELECT COUNT(*) as total
        FROM posts p
        LEFT JOIN users u ON p.author_openid = u.openid
        WHERE p.status = ? AND (
          p.title LIKE ? OR 
          p.content LIKE ? OR
          u.nickname LIKE ?
        )
      `;
      
      const countResult = await query(countSql, [status, searchTerm, searchTerm, searchTerm]);
      const total = countResult.success && countResult.data ? countResult.data[0].total : 0;
      
      return {
        success: true,
        data: result.data || [],
        total: total
      };
    } catch (error) {
      console.error('搜索帖子失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取用户发布的帖子列表
   */
  static async getUserPosts(openid, options = {}) {
    try {
      const { limit = 20, offset = 0, status = 'published' } = options;
      
      const sql = `
        SELECT 
          p.post_id,
          p.title,
          p.content,
          p.cover_image as cover_url,
          p.audio_id,
          p.like_count,
          p.comment_count,
          p.status,
          p.created_at,
          p.updated_at,
          a.title as audio_title
        FROM posts p
        LEFT JOIN audios a ON p.audio_id = a.audio_id
        WHERE p.author_openid = ? AND p.status = ?
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      const result = await query(sql, [openid, status, parseInt(limit) || 20, parseInt(offset) || 0]);
      
      return {
        success: true,
        data: result.data || [],
        total: result.data ? result.data.length : 0
      };
    } catch (error) {
      console.error('获取用户帖子失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = CommunityPost;