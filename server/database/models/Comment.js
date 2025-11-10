const { query } = require('../config');

class CommentModel {
  /**
   * 获取评论列表（支持帖子评论和音频评论）
   */
  static async getComments(targetType, targetId, options = {}) {
    try {
      const { limit = 20, offset = 0, orderBy = 'created_at', order = 'DESC' } = options;
      
      // 验证目标类型
      if (!['post', 'audio'].includes(targetType)) {
        return { success: false, error: '目标类型必须是 post 或 audio' };
      }
      
      const sql = `
        SELECT 
          c.comment_id,
          c.target_type,
          c.target_id,
          c.author_openid as openid,
          c.parent_id,
          c.content,
          c.like_count,
          c.created_at,
          u.nickname,
          u.avatar_url
        FROM comments c
        LEFT JOIN users u ON c.author_openid = u.openid
        WHERE c.target_type = ? AND c.target_id = ?
        ORDER BY c.${orderBy} ${order}
        LIMIT ? OFFSET ?
      `;
      
      const result = await query(sql, [targetType, targetId, parseInt(limit) || 20, parseInt(offset) || 0]);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }
      
      // 获取总数
      const countSql = `
        SELECT COUNT(*) as total
        FROM comments 
        WHERE target_type = ? AND target_id = ?
      `;
      
      const countResult = await query(countSql, [targetType, targetId]);
      const total = countResult.success && countResult.data ? countResult.data[0].total : 0;
      
      return {
        success: true,
        data: result.data || [],
        total: total
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 添加评论
   */
  static async addComment(openid, targetType, targetId, content, parentId = null) {
    try {
      // 验证目标类型
      if (!['post', 'audio'].includes(targetType)) {
        return { success: false, error: '目标类型必须是 post 或 audio' };
      }
      
      // 验证必填字段
      if (!content) {
        return { success: false, error: '评论内容不能为空' };
      }
      
      const sql = `
        INSERT INTO comments (target_type, target_id, author_openid, parent_id, content)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      const result = await query(sql, [targetType, targetId, openid, parentId, content]);
      
      if (!result.success || !result.insertId) {
        return { success: false, error: '添加评论失败' };
      }
      
      // 获取新创建的评论
      const getSql = `
        SELECT 
          c.comment_id,
          c.target_type,
          c.target_id,
          c.author_openid as openid,
          c.parent_id,
          c.content,
          c.like_count,
          c.created_at,
          u.nickname,
          u.avatar_url
        FROM comments c
        LEFT JOIN users u ON c.author_openid = u.openid
        WHERE c.comment_id = ?
      `;
      
      const commentResult = await query(getSql, [result.insertId]);
      
      if (!commentResult.success || !commentResult.data || commentResult.data.length === 0) {
        return { success: false, error: '获取评论详情失败' };
      }
      
      // 更新对应目标的评论数
      await this.updateCommentCount(targetType, targetId, 1);
      
      return {
        success: true,
        data: commentResult.data[0],
        message: '评论添加成功'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 删除评论
   */
  static async deleteComment(commentId, openid) {
    try {
      // 检查评论是否属于当前用户
      const checkSql = `
        SELECT comment_id, target_type, target_id 
        FROM comments 
        WHERE comment_id = ? AND author_openid = ?
      `;
      
      const checkResult = await query(checkSql, [commentId, openid]);
      
      if (!checkResult.success || !checkResult.data || checkResult.data.length === 0) {
        return { success: false, error: '无权删除此评论' };
      }
      
      const { target_type, target_id } = checkResult.data[0];
      
      // 删除评论
      const deleteSql = `
        DELETE FROM comments 
        WHERE comment_id = ?
      `;
      
      const result = await query(deleteSql, [commentId]);
      
      if (!result.success) {
        return { success: false, error: '删除评论失败' };
      }
      
      // 更新对应目标的评论数
      await this.updateCommentCount(target_type, target_id, -1);
      
      return { success: true, message: '评论删除成功' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取评论详情
   */
  static async getCommentById(commentId) {
    try {
      const sql = `
        SELECT 
          c.comment_id,
          c.target_type,
          c.target_id,
          c.author_openid as openid,
          c.parent_id,
          c.content,
          c.like_count,
          c.created_at,
          u.nickname,
          u.avatar_url
        FROM comments c
        LEFT JOIN users u ON c.author_openid = u.openid
        WHERE c.comment_id = ?
      `;
      
      const result = await query(sql, [commentId]);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }
      
      if (!result.data || result.data.length === 0) {
        return { success: true, data: null };
      }
      
      return {
        success: true,
        data: result.data[0]
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取评论回复列表
   */
  static async getCommentReplies(commentId, options = {}) {
    try {
      const { limit = 20, offset = 0 } = options;
      
      const sql = `
        SELECT 
          c.comment_id,
          c.target_type,
          c.target_id,
          c.author_openid as openid,
          c.parent_id,
          c.content,
          c.like_count,
          c.created_at,
          u.nickname,
          u.avatar_url
        FROM comments c
        LEFT JOIN users u ON c.author_openid = u.openid
        WHERE c.parent_id = ?
        ORDER BY c.created_at ASC
        LIMIT ? OFFSET ?
      `;
      
      const result = await query(sql, [commentId, parseInt(limit) || 20, parseInt(offset) || 0]);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }
      
      // 获取总数
      const countSql = `
        SELECT COUNT(*) as total
        FROM comments 
        WHERE parent_id = ?
      `;
      
      const countResult = await query(countSql, [commentId]);
      const total = countResult.success && countResult.data ? countResult.data[0].total : 0;
      
      return {
        success: true,
        data: result.data || [],
        total: total
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取用户评论列表
   */
  static async getUserComments(openid, options = {}) {
    try {
      const { limit = 20, offset = 0, targetType = null } = options;
      
      let sql = `
        SELECT 
          c.comment_id,
          c.target_type,
          c.target_id,
          c.author_openid as openid,
          c.parent_id,
          c.content,
          c.like_count,
          c.created_at,
          u.nickname,
          u.avatar_url,
          p.title as post_title,
          a.title as audio_title
        FROM comments c
        LEFT JOIN users u ON c.author_openid = u.openid
        LEFT JOIN posts p ON c.target_type = 'post' AND c.target_id = p.post_id
        LEFT JOIN audios a ON c.target_type = 'audio' AND c.target_id = a.audio_id
        WHERE c.author_openid = ?
      `;
      
      const params = [openid];
      
      if (targetType) {
        sql += ' AND c.target_type = ?';
        params.push(targetType);
      }
      
      sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit) || 20, parseInt(offset) || 0);
      
      const result = await query(sql, params);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }
      
      // 获取总数
      let countSql = `
        SELECT COUNT(*) as total
        FROM comments 
        WHERE author_openid = ?
      `;
      
      const countParams = [openid];
      
      if (targetType) {
        countSql += ' AND target_type = ?';
        countParams.push(targetType);
      }
      
      const countResult = await query(countSql, countParams);
      const total = countResult.success && countResult.data ? countResult.data[0].total : 0;
      
      return {
        success: true,
        data: result.data || [],
        total: total
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 点赞/取消点赞评论
   */
  static async toggleLike(openid, commentId) {
    try {
      // 检查是否已经点赞
      const checkSql = `
        SELECT id FROM comment_likes 
        WHERE openid = ? AND comment_id = ?
      `;
      
      const checkResult = await query(checkSql, [openid, commentId]);
      
      if (checkResult.success && checkResult.data && checkResult.data.length > 0) {
        // 取消点赞
        const deleteSql = `
          DELETE FROM comment_likes 
          WHERE openid = ? AND comment_id = ?
        `;
        
        const deleteResult = await query(deleteSql, [openid, commentId]);
        
        if (deleteResult.success) {
          // 更新评论点赞数
          await this.updateLikeCount(commentId, -1);
          
          return {
            success: true,
            liked: false,
            message: '取消点赞成功'
          };
        }
      } else {
        // 点赞
        const insertSql = `
          INSERT INTO comment_likes (openid, comment_id)
          VALUES (?, ?)
        `;
        
        const insertResult = await query(insertSql, [openid, commentId]);
        
        if (insertResult.success) {
          // 更新评论点赞数
          await this.updateLikeCount(commentId, 1);
          
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
      return { success: false, error: error.message };
    }
  }

  /**
   * 更新评论点赞数（内部方法）
   */
  static async updateLikeCount(commentId, increment) {
    try {
      const sql = `
        UPDATE comments 
        SET like_count = like_count + ?
        WHERE comment_id = ?
      `;
      
      await query(sql, [increment, commentId]);
    } catch (error) {
      console.error('更新评论点赞数失败:', error);
    }
  }

  /**
   * 更新评论数（内部方法）
   */
  static async updateCommentCount(targetType, targetId, increment) {
    try {
      if (targetType === 'post') {
        const sql = `
          UPDATE posts 
          SET comment_count = comment_count + ?
          WHERE post_id = ?
        `;
        
        await query(sql, [increment, targetId]);
      } else if (targetType === 'audio') {
        const sql = `
          UPDATE audios 
          SET comment_count = comment_count + ?
          WHERE audio_id = ?
        `;
        
        await query(sql, [increment, targetId]);
      }
    } catch (error) {
      console.error('更新评论数失败:', error);
    }
  }
}

module.exports = CommentModel;