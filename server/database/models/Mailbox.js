const { query, transaction } = require('../config');

class Mailbox {
  /**
   * 获取信箱列表（投递/接收/我的信箱）
   */
  static async getThreads(options = {}) {
    try {
      const { 
        tab = 'send', // send | receive | mybox
        offset = 0,
        limit = 20,
        openid
      } = options;

      let sql = '';
      let params = [];

      switch (tab) {
        case 'send':
          // 投递的信件
          sql = `
            SELECT 
              t.thread_id,
              t.title,
              t.content,
              t.sender_openid,
              t.recipient_openid,
              t.status,
              t.created_at,
              u_s.nickname as sender_name,
              u_s.avatar_url as sender_avatar,
              u_r.nickname as recipient_name,
              u_r.avatar_url as recipient_avatar,
              (SELECT COUNT(*) FROM mailbox_attachments WHERE thread_id = t.thread_id) as attachment_count
            FROM mailbox_threads t
            LEFT JOIN users u_s ON t.sender_openid = u_s.openid
            LEFT JOIN users u_r ON t.recipient_openid = u_r.openid
            WHERE t.sender_openid = ?
            ORDER BY t.created_at DESC
            LIMIT ? OFFSET ?
          `;
          params = [openid, parseInt(limit), parseInt(offset)];
          break;

        case 'receive':
          // 接收的信件（已领取的）
          sql = `
            SELECT 
              t.thread_id,
              t.title,
              t.content,
              t.sender_openid,
              t.recipient_openid,
              t.status,
              t.picked_at,
              t.created_at,
              u_s.nickname as sender_name,
              u_s.avatar_url as sender_avatar,
              u_r.nickname as recipient_name,
              u_r.avatar_url as recipient_avatar,
              (SELECT COUNT(*) FROM mailbox_attachments WHERE thread_id = t.thread_id) as attachment_count
            FROM mailbox_threads t
            LEFT JOIN users u_s ON t.sender_openid = u_s.openid
            LEFT JOIN users u_r ON t.recipient_openid = u_r.openid
            WHERE t.recipient_openid = ? AND t.status = 'picked'
            ORDER BY t.picked_at DESC
            LIMIT ? OFFSET ?
          `;
          params = [openid, parseInt(limit), parseInt(offset)];
          break;

        case 'mybox':
          // 我的信箱（所有与该用户相关的信件）
          sql = `
            SELECT 
              t.thread_id,
              t.title,
              t.content,
              t.sender_openid,
              t.recipient_openid,
              t.status,
              t.picked_at,
              t.created_at,
              CASE 
                WHEN t.sender_openid = ? THEN 'sent'
                WHEN t.recipient_openid = ? THEN 'received'
                ELSE 'other'
              END as type,
              u_s.nickname as sender_name,
              u_s.avatar_url as sender_avatar,
              u_r.nickname as recipient_name,
              u_r.avatar_url as recipient_avatar,
              (SELECT COUNT(*) FROM mailbox_attachments WHERE thread_id = t.thread_id) as attachment_count
            FROM mailbox_threads t
            LEFT JOIN users u_s ON t.sender_openid = u_s.openid
            LEFT JOIN users u_r ON t.recipient_openid = u_r.openid
            WHERE t.sender_openid = ? OR t.recipient_openid = ?
            ORDER BY t.created_at DESC
            LIMIT ? OFFSET ?
          `;
          params = [openid, openid, openid, openid, parseInt(limit), parseInt(offset)];
          break;

        default:
          return { success: false, message: '无效的tab参数' };
      }

      const result = await query(sql, params);
      
      // 获取总数
      let countSql = '';
      let countParams = [];
      
      switch (tab) {
        case 'send':
          countSql = 'SELECT COUNT(*) as total FROM mailbox_threads WHERE sender_openid = ?';
          countParams = [openid];
          break;
        case 'receive':
          countSql = 'SELECT COUNT(*) as total FROM mailbox_threads WHERE recipient_openid = ? AND status = "picked"';
          countParams = [openid];
          break;
        case 'mybox':
          countSql = 'SELECT COUNT(*) as total FROM mailbox_threads WHERE sender_openid = ? OR recipient_openid = ?';
          countParams = [openid, openid];
          break;
      }
      
      const countResult = await query(countSql, countParams);

      return {
        success: true,
        data: result.data || [],
        total: countResult.data[0].total,
        message: '获取信箱列表成功'
      };
    } catch (error) {
      console.error('获取信箱列表失败:', error);
      return {
        success: false,
        message: '获取信箱列表失败',
        error: error.message
      };
    }
  }

  /**
   * 获取信件详情
   */
  static async getThreadDetail(threadId, openid = null) {
    try {
      const sql = `
        SELECT 
          t.thread_id,
          t.title,
          t.content,
          t.sender_openid,
          t.recipient_openid,
          t.status,
          t.is_read,
          t.picked_at,
          t.read_at,
          t.created_at,
          t.updated_at,
          u_s.nickname as sender_name,
          u_s.avatar_url as sender_avatar,
          u_r.nickname as recipient_name,
          u_r.avatar_url as recipient_avatar
        FROM mailbox_threads t
        LEFT JOIN users u_s ON t.sender_openid = u_s.openid
        LEFT JOIN users u_r ON t.recipient_openid = u_r.openid
        WHERE t.thread_id = ?
      `;

      const result = await query(sql, [threadId]);
      
      if (!result.success || result.data.length === 0) {
        return {
          success: false,
          message: '信件不存在'
        };
      }

      // 如果提供了openid，检查权限
      if (openid) {
        const thread = result.data[0];
        if (thread.sender_openid !== openid && thread.recipient_openid !== openid && thread.status === 'public') {
          return {
            success: false,
            message: '无权查看此信件'
          };
        }
      }

      // 获取附件列表
      const attachmentsResult = await query(
        'SELECT * FROM mailbox_attachments WHERE thread_id = ? ORDER BY created_at',
        [threadId]
      );

      const threadData = result.data[0];
      threadData.attachments = attachmentsResult.data || [];

      return {
        success: true,
        data: threadData,
        message: '获取信件详情成功'
      };
    } catch (error) {
      console.error('获取信件详情失败:', error);
      return {
        success: false,
        message: '获取信件详情失败',
        error: error.message
      };
    }
  }

  /**
   * 投递晚安（创建信件）
   */
  static async createThread(senderOpenid, threadData) {
    try {
      const { title, content, toUserId = null, attachments = [] } = threadData;

      if (!content) {
        return {
          success: false,
          message: '内容不能为空'
        };
      }

      // 如果标题为空，自动生成晚安标题
      const finalTitle = title || '晚安';

      return await transaction(async (connection) => {
        // 插入信件主记录
        const insertSql = `
          INSERT INTO mailbox_threads 
          (sender_openid, recipient_openid, title, content, status, is_read, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;

        const [insertResult] = await connection.execute(insertSql, [
          senderOpenid,
          toUserId,
          finalTitle,
          content,
          toUserId ? 'private' : 'public',
          toUserId ? 0 : 0 // 私信和公开信件都默认未读，公开信件需要系统分配后才变为已读状态
        ]);

        const threadId = insertResult.insertId;

        // 如果有附件，插入附件记录
        if (attachments.length > 0) {
          const attachmentSql = `
            INSERT INTO mailbox_attachments 
            (thread_id, url, filename, file_type, created_at)
            VALUES ?
          `;

          const attachmentData = attachments.map(url => [
            threadId,
            url,
            url.split('/').pop() || 'attachment',
            url.match(/\.(jpg|jpeg|png|gif)$/i) ? 'image' : 'file'
          ]);

          await connection.execute(
            'INSERT INTO mailbox_attachments (thread_id, url, filename, file_type, created_at) VALUES ?',
            [attachmentData]
          );
        }

        return {
          success: true,
          data: {
            threadId,
            sender_openid: senderOpenid,
            recipient_openid: toUserId,
            title: finalTitle,
            content,
            status: toUserId ? 'private' : 'public',
            created_at: new Date()
          },
          message: '晚安投递成功'
        };
      });

    } catch (error) {
      console.error('创建信件失败:', error);
      return {
        success: false,
        message: '创建信件失败',
        error: error.message
      };
    }
  }

  /**
   * 自动分配公开晚安信件（原子操作）
   */
  static async autoAssignPublicThread(recipientOpenid) {
    try {
      return await transaction(async (connection) => {
        // 使用SELECT ... FOR UPDATE锁定可领取的信件（按创建时间排序，取最旧的一封）
        const selectSql = `
          SELECT thread_id, sender_openid, title, content, created_at
          FROM mailbox_threads 
          WHERE status = 'public' 
          ORDER BY created_at ASC
          LIMIT 1
          FOR UPDATE
        `;

        const [selectResult] = await connection.execute(selectSql);

        if (selectResult.length === 0) {
          return {
            success: false,
            message: '暂无可分配的晚安'
          };
        }

        const thread = selectResult[0];

        // 更新信件状态为已领取，但不标记为已读（用户点击时才标记）
        const updateSql = `
          UPDATE mailbox_threads 
          SET 
            recipient_openid = ?, 
            status = 'picked', 
            picked_at = NOW(), 
            is_read = 0, 
            read_at = NULL, 
            updated_at = NOW()
          WHERE thread_id = ?
        `;

        await connection.execute(updateSql, [recipientOpenid, thread.thread_id]);

        return {
          success: true,
          data: {
            id: thread.thread_id,
            title: thread.title,
            content: thread.content,
            senderUserId: thread.sender_openid,
            pickedByUserId: recipientOpenid,
            pickedAt: new Date(),
            isRead: false,
            readAt: null
          },
          message: '晚安信件分配成功'
        };
      });

    } catch (error) {
      console.error('自动分配晚安失败:', error);
      return {
        success: false,
        message: '自动分配晚安失败',
        error: error.message
      };
    }
  }

  /**
   * 获取用户今日分配情况和统计信息
   */
  static async getDailyMailboxStats(openid) {
    try {
      // 检查今日是否已经分配过晚安信件
      const todayAssignmentSql = `
        SELECT COUNT(*) as today_assigned
        FROM mailbox_threads 
        WHERE recipient_openid = ? 
          AND DATE(picked_at) = CURDATE()
      `;
      
      const todayResult = await query(todayAssignmentSql, [openid]);
      const todayAssigned = todayResult.success ? todayResult.data[0].today_assigned : 0;

      // 获取今日收到的信件总数
      const todayReceivedSql = `
        SELECT COUNT(*) as today_received
        FROM mailbox_threads 
        WHERE recipient_openid = ? 
          AND DATE(picked_at) = CURDATE()
      `;
      
      const receivedResult = await query(todayReceivedSql, [openid]);
      const todayReceived = receivedResult.success ? receivedResult.data[0].today_received : 0;

      // 获取未读信件数量
      const unreadSql = `
        SELECT COUNT(*) as unread_count
        FROM mailbox_threads 
        WHERE recipient_openid = ? 
          AND is_read = 0
          AND status = 'picked'
      `;
      
      const unreadResult = await query(unreadSql, [openid]);
      const unreadCount = unreadResult.success ? unreadResult.data[0].unread_count : 0;

      return {
        success: true,
        data: {
          todayAssigned: todayAssigned > 0,
          todayReceived: todayReceived,
          unreadCount: unreadCount,
          message: todayAssigned > 0 ? '今日已分配' : '今日未分配'
        }
      };

    } catch (error) {
      console.error('获取信箱统计失败:', error);
      return {
        success: false,
        message: '获取信箱统计失败',
        error: error.message
      };
    }
  }

  /**
   * 我的信箱快捷接口
   */
  static async getMyBox(openid, options = {}) {
    return this.getThreads({ ...options, tab: 'mybox', openid });
  }

  /**
   * 获取我的信箱统计信息
   */
  static async getMyMailboxStats(openid) {
    try {
      // 获取未读信件数量
      const unreadSql = `
        SELECT COUNT(*) as unread_count 
        FROM mailbox_threads 
        WHERE recipient_openid = ? 
        AND status = 'picked' 
        AND is_read = 0
      `;
      const unreadResult = await query(unreadSql, [openid]);

      // 获取已发送信件数量
      const sentSql = `
        SELECT COUNT(*) as sent_count 
        FROM mailbox_threads 
        WHERE sender_openid = ?
      `;
      const sentResult = await query(sentSql, [openid]);

      // 获取已接收信件数量
      const receivedSql = `
        SELECT COUNT(*) as received_count 
        FROM mailbox_threads 
        WHERE recipient_openid = ? 
        AND status = 'picked'
      `;
      const receivedResult = await query(receivedSql, [openid]);

      // 获取今日收到的晚安数量
      const todaySql = `
        SELECT COUNT(*) as today_count 
        FROM mailbox_threads 
        WHERE recipient_openid = ? 
        AND status = 'picked'
        AND DATE(picked_at) = CURDATE()
      `;
      const todayResult = await query(todaySql, [openid]);

      // 获取最新的未读晚安信息
      const latestSql = `
        SELECT 
          t.thread_id,
          t.title,
          t.content,
          t.created_at,
          u.nickname as sender_name,
          u.avatar_url as sender_avatar
        FROM mailbox_threads t
        LEFT JOIN users u ON t.sender_openid = u.openid
        WHERE t.recipient_openid = ? 
        AND t.status = 'picked'
        AND t.is_read = 0
        ORDER BY t.picked_at DESC
        LIMIT 3
      `;
      const latestResult = await query(latestSql, [openid]);

      return {
        success: true,
        data: {
          unread_count: unreadResult.data[0].unread_count || 0,
          sent_count: sentResult.data[0].sent_count || 0,
          received_count: receivedResult.data[0].received_count || 0,
          today_count: todayResult.data[0].today_count || 0,
          latest_unread: latestResult.data || [],
          last_updated: new Date().toISOString()
        },
        message: '获取信箱统计信息成功'
      };
    } catch (error) {
      console.error('获取信箱统计信息失败:', error);
      return {
        success: false,
        message: '获取信箱统计信息失败',
        error: error.message
      };
    }
  }

  /**
   * 接受晚安（标记信件为已读）
   */
  static async acceptGoodnight(threadId, openid) {
    try {
      // 首先验证用户是否有权限查看此信件
      const threadSql = `
        SELECT thread_id, recipient_openid, is_read
        FROM mailbox_threads 
        WHERE thread_id = ? AND recipient_openid = ?
      `;
      const threadResult = await query(threadSql, [threadId, openid]);

      if (!threadResult.success || threadResult.data.length === 0) {
        return {
          success: false,
          message: '信件不存在或无权限操作'
        };
      }

      const thread = threadResult.data[0];

      // 如果已经是已读状态，直接返回成功
      if (thread.is_read === 1) {
        return {
          success: true,
          data: { thread_id: threadId, is_read: 1 },
          message: '晚安已接受'
        };
      }

      // 更新信件为已读状态
      const updateSql = `
        UPDATE mailbox_threads 
        SET is_read = 1, read_at = NOW(), updated_at = NOW()
        WHERE thread_id = ? AND recipient_openid = ?
      `;
      const updateResult = await query(updateSql, [threadId, openid]);

      if (!updateResult.success) {
        return {
          success: false,
          message: '接受晚安失败',
          error: '更新信件状态失败'
        };
      }

      // 获取更新后的信件信息
      const detailResult = await this.getThreadDetail(threadId, openid);

      return {
        success: true,
        data: {
          thread_id: threadId,
          is_read: 1,
          read_at: new Date(),
          thread_detail: detailResult.success ? detailResult.data : null
        },
        message: '晚安已成功接受'
      };
    } catch (error) {
      console.error('接受晚安失败:', error);
      return {
        success: false,
        message: '接受晚安失败',
        error: error.message
      };
    }
  }

  /**
   * 获取接收的晚安信件列表（专门用于接收晚安功能）
   */
  static async getReceivedThreads(openid, options = {}) {
    try {
      const {
        offset = 0,
        limit = 20,
        unreadOnly = false,
        todayOnly = false
      } = options;

      // 构建基础查询条件
      let whereClause = 't.recipient_openid = ? AND t.status = \'picked\'';
      let params = [openid];

      // 添加未读筛选条件
      if (unreadOnly) {
        whereClause += ' AND t.is_read = 0';
      }

      // 添加今日筛选条件
      if (todayOnly) {
        whereClause += ' AND DATE(t.picked_at) = CURDATE()';
      }

      // 获取信件列表
      const listSql = `
        SELECT 
          t.thread_id,
          t.title,
          t.content,
          t.sender_openid,
          t.recipient_openid,
          t.status,
          t.is_read,
          t.picked_at,
          t.read_at,
          t.created_at,
          t.updated_at,
          u_s.nickname as sender_name,
          u_s.avatar_url as sender_avatar,
          (SELECT COUNT(*) FROM mailbox_attachments WHERE thread_id = t.thread_id) as attachment_count,
          CASE 
            WHEN t.is_read = 0 THEN 'unread'
            ELSE 'read'
          END as read_status
        FROM mailbox_threads t
        LEFT JOIN users u_s ON t.sender_openid = u_s.openid
        WHERE ${whereClause}
        ORDER BY t.picked_at DESC
        LIMIT ? OFFSET ?
      `;
      params.push(parseInt(limit), parseInt(offset));

      const listResult = await query(listSql, params);

      if (!listResult.success) {
        return {
          success: false,
          message: '获取信件列表失败',
          error: listResult.error
        };
      }

      // 获取总数
      const countSql = `
        SELECT COUNT(*) as total_count 
        FROM mailbox_threads t
        WHERE ${whereClause}
      `;
      const countResult = await query(countSql, params.slice(0, -2)); // 移除LIMIT和OFFSET参数

      // 获取未读数量
      const unreadSql = `
        SELECT COUNT(*) as unread_count 
        FROM mailbox_threads t
        WHERE t.recipient_openid = ? AND t.status = 'picked' AND t.is_read = 0
      `;
      const unreadResult = await query(unreadSql, [openid]);

      // 获取今日数量
      const todaySql = `
        SELECT COUNT(*) as today_count 
        FROM mailbox_threads t
        WHERE t.recipient_openid = ? AND t.status = 'picked' AND DATE(t.picked_at) = CURDATE()
      `;
      const todayResult = await query(todaySql, [openid]);

      return {
        success: true,
        data: listResult.data,
        total: countResult.data[0].total_count || 0,
        unread_count: unreadResult.data[0].unread_count || 0,
        today_count: todayResult.data[0].today_count || 0,
        message: '获取接收晚安列表成功'
      };
    } catch (error) {
      console.error('获取接收晚安列表失败:', error);
      return {
        success: false,
        message: '获取接收晚安列表失败',
        error: error.message
      };
    }
  }
}

module.exports = Mailbox;