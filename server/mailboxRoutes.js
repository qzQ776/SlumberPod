const express = require('express');
const router = express.Router();
const Mailbox = require('./database/models/Mailbox');
const { authenticateToken } = require('./middleware/auth');

// 投递晚安（创建信件）
const deliverHandler = async (req, res) => {
  try {
    const { title, content, toUserId = null, attachments = [] } = req.body;

    // 验证必填字段 - 如果标题为空，自动生成晚安标题
    if (!content) {
      return res.status(400).json({
        success: false,
        message: '内容不能为空'
      });
    }

    // 如果标题为空，自动生成晚安标题
    const finalTitle = title || '晚安';
    const finalContent = content;

    // 验证附件格式
    if (attachments && !Array.isArray(attachments)) {
      return res.status(400).json({
        success: false,
        message: '附件格式错误'
      });
    }

    const result = await Mailbox.createThread(req.openid, {
      title: finalTitle,
      content: finalContent,
      toUserId,
      attachments
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

    res.status(201).json({
      success: true,
      data: result.data,
      message: result.message
    });

  } catch (error) {
    console.error('投递晚安失败:', error);
    res.status(500).json({
      success: false,
      message: '投递晚安失败',
      error: error.message
    });
  }
};

// 注册投递晚安路由路径
router.post('/deliver', authenticateToken, deliverHandler);

// 获取信箱统计信息（用于弹窗显示）
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const result = await Mailbox.getDailyMailboxStats(req.openid);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.data,
      message: '获取统计信息成功'
    });

  } catch (error) {
    console.error('获取信箱统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取信箱统计失败',
      error: error.message
    });
  }
});

// 每日自动分配晚安信件（用户第一次登录时调用）
router.post('/daily-assignment', authenticateToken, async (req, res) => {
  try {
    // 检查今天是否已经分配过晚安信件
    const statsResult = await Mailbox.getDailyMailboxStats(req.openid);
    
    if (!statsResult.success) {
      return res.status(400).json({
        success: false,
        message: statsResult.message,
        error: statsResult.error
      });
    }
    
    // 如果今日已分配过，直接返回统计信息
    if (statsResult.data.todayAssigned) {
      return res.json({
        success: true,
        data: {
          assigned: false,
          alreadyAssigned: true,
          stats: statsResult.data,
          message: '今日已分配过晚安信件'
        },
        message: '今日已分配过晚安信件'
      });
    }

    // 自动分配一封公开晚安信件
    const result = await Mailbox.autoAssignPublicThread(req.openid);

    if (!result.success) {
      // 如果没有可分配的，返回统计信息（显示收到0封）
      if (result.message === '暂无可分配的晚安') {
        return res.json({
          success: true,
          data: {
            assigned: false,
            noAvailable: true,
            stats: statsResult.data,
            message: '今日暂无可分配的晚安'
          },
          message: '今日暂无可分配的晚安'
        });
      }
      
      return res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

    // 分配成功，重新获取统计信息
    const updatedStatsResult = await Mailbox.getDailyMailboxStats(req.openid);
    
    if (!updatedStatsResult.success) {
      return res.status(400).json({
        success: false,
        message: updatedStatsResult.message,
        error: updatedStatsResult.error
      });
    }

    res.json({
      success: true,
      data: {
        assigned: true,
        thread: result.data,
        stats: updatedStatsResult.data,
        message: '晚安信件分配成功'
      },
      message: '晚安信件分配成功'
    });

  } catch (error) {
    console.error('自动分配晚安失败:', error);
    res.status(500).json({
      success: false,
      message: '自动分配晚安失败',
      error: error.message
    });
  }
});



// 获取我发送的信件列表
router.get('/sent', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1,
      limit = 20
    } = req.query;

    // 兼容前端参数：page转换为offset
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await Mailbox.getThreads({
      tab: 'send',
      offset: parseInt(offset),
      limit: parseInt(limit),
      openid: req.openid
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
      data: result.data,
      total: result.total,
      message: result.message
    });

  } catch (error) {
    console.error('获取发送信件列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取发送信件列表失败',
      error: error.message
    });
  }
});

// 获取我的信箱（所有相关信件） - 统一接口
router.get('/mybox', authenticateToken, async (req, res) => {
  try {
    const { 
      tab = 'mybox',        // 支持标签类型：mybox、send、received
      page = 1,             // 页码
      limit = 20,           // 每页数量
      offset = null         // 直接偏移量（优先级高于page）
    } = req.query;

    // 计算偏移量：优先使用offset，否则使用page计算
    let finalOffset = 0;
    if (offset && !isNaN(parseInt(offset))) {
      finalOffset = parseInt(offset);
    } else if (page && !isNaN(parseInt(page))) {
      finalOffset = (parseInt(page) - 1) * parseInt(limit);
    }

    const result = await Mailbox.getThreads({
      tab: tab,
      offset: finalOffset,
      limit: parseInt(limit),
      openid: req.openid
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
      data: result.data,
      total: result.total,
      message: result.message
    });

  } catch (error) {
    console.error('获取我的信箱失败:', error);
    res.status(500).json({
      success: false,
      message: '获取我的信箱失败',
      error: error.message
    });
  }
});





// 接收晚安列表（专门用于查看收到的晚安信件）
router.get('/received', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1,
      limit = 20,
      unreadOnly = 'false', // 是否只显示未读
      todayOnly = 'false'   // 是否只显示今日
    } = req.query;

    // 兼容前端参数：page转换为offset
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await Mailbox.getReceivedThreads(req.openid, {
      offset: parseInt(offset),
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true',
      todayOnly: todayOnly === 'true'
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
      data: result.data,
      total: result.total,
      unread_count: result.unread_count,
      today_count: result.today_count,
      message: result.message
    });

  } catch (error) {
    console.error('获取接收晚安列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取接收晚安列表失败',
      error: error.message
    });
  }
});

// ==========================================
// 动态路由 - 必须放在所有固定路由之后
// ==========================================

// 接受晚安（标记晚安信件为已读）
router.post('/:threadId/accept', authenticateToken, async (req, res) => {
  try {
    const { threadId } = req.params;

    if (!threadId || isNaN(parseInt(threadId))) {
      return res.status(400).json({
        success: false,
        message: '信件ID无效'
      });
    }

    const result = await Mailbox.acceptGoodnight(parseInt(threadId), req.openid);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.data,
      message: result.message
    });

  } catch (error) {
    console.error('接受晚安失败:', error);
    res.status(500).json({
      success: false,
      message: '接受晚安失败',
      error: error.message
    });
  }
});

// 获取信件详情
router.get('/:threadId', authenticateToken, async (req, res) => {
  try {
    const { threadId } = req.params;

    if (!threadId || isNaN(parseInt(threadId))) {
      return res.status(400).json({
        success: false,
        message: '信件ID无效'
      });
    }

    const result = await Mailbox.getThreadDetail(parseInt(threadId), req.openid);

    if (!result.success) {
      return res.status(404).json({
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
    console.error('获取信件详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取信件详情失败',
      error: error.message
    });
  }
});

module.exports = router;