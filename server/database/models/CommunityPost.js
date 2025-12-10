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
      
      // 验证排序字段，防止SQL注入
      const validOrderFields = ['created_at', 'updated_at', 'like_count', 'comment_count'];
      const validOrderDirections = ['ASC', 'DESC'];
      
      const safeOrderBy = validOrderFields.includes(orderBy) ? orderBy : 'created_at';
      const safeOrder = validOrderDirections.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';
      
      // 构建WHERE条件
      let whereConditions = "p.status = 'published'";
      
      // 处理分类筛选
      if (category_id && !isNaN(parseInt(category_id))) {
        whereConditions += ` AND p.category_id = ${parseInt(category_id)}`;
      }
      
      // 使用手动参数替换解决MySQL2参数绑定问题
      let sql = `
        SELECT 
          p.post_id,
          p.author_openid,
          p.title,
          p.content,
          p.cover_image,
          p.audio_id,
          p.like_count,
          p.comment_count,
          p.status,
          p.created_at,
          p.updated_at,
          u.nickname,
          u.avatar_url
        FROM posts p
        LEFT JOIN users u ON p.author_openid = u.openid
        WHERE ${whereConditions}
      `;
      
      // 排序
      sql += ` ORDER BY p.${safeOrderBy} ${safeOrder}`;
      
      // 分页 - 使用手动参数替换
      sql += ` LIMIT ${limitNum} OFFSET ${offsetNum}`;
      
      // 直接执行SQL，不使用参数绑定
      const result = await query(sql);
      
      // 获取总数 - 使用相同的WHERE条件
      const countSql = `
        SELECT COUNT(*) as total
        FROM posts p
        WHERE ${whereConditions}
      `;
      
      const countResult = await query(countSql);
      const total = countResult.success && countResult.data ? countResult.data[0].total : 0;
      
      return {
        success: true,
        data: result.data || [],
        total: total
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
          p.author_openid,
          p.title,
          p.content,
          p.cover_image,
          p.audio_id,
          p.like_count,
          p.comment_count,
          p.status,
          p.created_at,
          p.updated_at,
          u.nickname,
          u.avatar_url
        FROM posts p
        LEFT JOIN users u ON p.author_openid = u.openid
        WHERE p.post_id = ? AND p.status = 'published'
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
      
    // 严格验证 - content字段不能为空（数据库约束）
    if (!content || content.trim() === '') {
      console.error('数据库模型 - 内容验证失败:', { content });
      return {
        success: false,
        message: '帖子内容不能为空'
      };
    }
      
      // 处理title，如果为空则使用默认值
      const actualTitle = title || '用户的分享';
      
      // 将undefined转换为null，避免MySQL参数绑定错误
      const safeCoverImage = cover_image === undefined ? null : cover_image;
      const safeAudioId = audio_id === undefined ? null : audio_id;
      
      console.log('数据库模型 - 实际插入数据:', {
        openid,
        title: actualTitle,
        content: content,
        cover_image: safeCoverImage,
        audio_id: safeAudioId
      });
      
      // 使用正确的表名和字段名（移除category_id）
      const sql = `
        INSERT INTO posts (author_openid, title, content, cover_image, audio_id, status)
        VALUES (?, ?, ?, ?, ?, 'published')
      `;
      
      const result = await query(sql, [openid, actualTitle, content, safeCoverImage, safeAudioId]);
      
      if (!result.success || !result.data.insertId) {
        console.error('数据库模型 - 创建帖子SQL失败:', result.error);
        return {
          success: false,
          message: '创建帖子失败',
          error: result.error
        };
      }
      
      console.log('数据库模型 - 帖子创建成功，插入ID:', result.data.insertId);
      
      // 直接返回成功信息，避免递归调用getPostById可能的问题
      return {
        success: true,
        data: {
          post_id: result.data.insertId,
          author_openid: openid,
          title: actualTitle,
          content: content,
          cover_image: safeCoverImage,
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
        WHERE post_id = ? AND author_openid = ? AND status = 'published'
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
        WHERE post_id = ? AND author_openid = ? AND status = 'published'
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
      // 检查是否已经点赞（包括所有状态）
      const checkSql = `
        SELECT id, is_active FROM post_likes 
        WHERE openid = ? AND post_id = ?
      `;
      
      const checkResult = await query(checkSql, [openid, postId]);
      
      if (checkResult.success && checkResult.data && checkResult.data.length > 0) {
        const existingLike = checkResult.data[0];
        
        if (existingLike.is_active === 1) {
          // 取消点赞
          const deleteSql = `
            UPDATE post_likes 
            SET is_active = 0, updated_at = NOW()
            WHERE id = ?
          `;
          
          const deleteResult = await query(deleteSql, [existingLike.id]);
          
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
          // 重新点赞（更新现有记录）
          const reactivateSql = `
            UPDATE post_likes 
            SET is_active = 1, updated_at = NOW()
            WHERE id = ?
          `;
          
          const reactivateResult = await query(reactivateSql, [existingLike.id]);
          
          if (reactivateResult.success) {
            // 更新帖子点赞数
            await this.updateLikeCount(postId, 1);
            
            return {
              success: true,
              liked: true,
              message: '点赞成功'
            };
          }
        }
      } else {
        // 首次点赞
        const insertSql = `
          INSERT INTO post_likes (openid, post_id, is_active)
          VALUES (?, ?, 1)
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
        WHERE openid = ? AND post_id = ? AND is_active = 1
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
          p.author_openid,
          p.title,
          p.content,
          p.cover_image,
          p.audio_id,
          p.like_count,
          p.comment_count,
          p.status,
          p.created_at,
          p.updated_at,
          u.nickname,
          u.avatar_url
        FROM posts p
        LEFT JOIN users u ON p.author_openid = u.openid
        WHERE p.status = 'published' AND (
          p.title LIKE ? OR 
          p.content LIKE ? OR
          u.nickname LIKE ?
        )
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      const searchTerm = `%${keyword}%`;
      
      const result = await query(sql, [searchTerm, searchTerm, searchTerm, parseInt(limit) || 20, parseInt(offset) || 0]);
      
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
        WHERE p.status = 'published' AND (
          p.title LIKE ? OR 
          p.content LIKE ? OR
          u.nickname LIKE ?
        )
      `;
      
      const countResult = await query(countSql, [searchTerm, searchTerm, searchTerm]);
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
          p.author_openid,
          p.title,
          p.content,
          p.cover_image,
          p.audio_id,
          p.like_count,
          p.comment_count,
          p.status,
          p.created_at,
          p.updated_at
        FROM posts p
        WHERE p.author_openid = ? AND p.status = 'published'
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      const result = await query(sql, [openid, parseInt(limit) || 20, parseInt(offset) || 0]);
      
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

  /**
   * 获取用户点赞的帖子列表
   */
  static async getUserLikedPosts(openid, options = {}) {
    try {
      const { 
        limit = 20, 
        offset = 0,
        status = 'published'
      } = options;

      // 查询用户点赞的帖子
      const sql = `
        SELECT 
          p.*,
          u.nickname as author_nickname,
          u.avatar_url as author_avatar,
          pl.created_at as liked_at
        FROM post_likes pl
        INNER JOIN community_posts p ON pl.post_id = p.id
        INNER JOIN users u ON p.author_openid = u.openid
        WHERE pl.openid = ? 
          AND pl.is_active = 1
          AND p.status = ?
          AND p.is_deleted = 0
        ORDER BY pl.created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      const countSql = `
        SELECT COUNT(*) as total
        FROM post_likes pl
        INNER JOIN community_posts p ON pl.post_id = p.id
        WHERE pl.openid = ? 
          AND pl.is_active = 1
          AND p.status = ?
          AND p.is_deleted = 0
      `;

      const [postsResult, countResult] = await Promise.all([
        query(sql, [openid, status, limit, offset]),
        query(countSql, [openid, status])
      ]);

      if (!postsResult.success || !countResult.success) {
        return {
          success: false,
          error: '获取点赞帖子列表失败'
        };
      }

      return {
        success: true,
        data: postsResult.data || [],
        total: countResult.data && countResult.data[0] ? countResult.data[0].total : 0,
        message: '获取点赞帖子列表成功'
      };
    } catch (error) {
      console.error('获取用户点赞帖子列表失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取用户点赞的帖子数量
   */
  static async getUserLikedPostsCount(openid) {
    try {
      const sql = `
        SELECT COUNT(*) as total
        FROM post_likes pl
        INNER JOIN community_posts p ON pl.post_id = p.id
        WHERE pl.openid = ? 
          AND pl.is_active = 1
          AND p.status = 'published'
          AND p.is_deleted = 0
      `;

      const result = await query(sql, [openid]);

      if (!result.success) {
        return {
          success: false,
          error: '获取点赞帖子数量失败'
        };
      }

      return {
        success: true,
        total: result.data && result.data[0] ? result.data[0].total : 0,
        message: '获取点赞帖子数量成功'
      };
    } catch (error) {
      console.error('获取用户点赞帖子数量失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = CommunityPost;