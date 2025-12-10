const express = require('express');
const router = express.Router();
const StudyRoom = require('./database/models/StudyRoom');

// 导入认证中间件
const { authenticateToken } = require('./middleware/auth');

// 应用认证中间件到所有路由
router.use(authenticateToken);

// 开始或恢复自习室计时
router.post('/sessions/start', async (req, res) => {
  try {
    const { audio_id = null } = req.body;

    const result = await StudyRoom.startOrResumeStudySession(req.openid, audio_id);

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
    console.error('开始/恢复自习室计时失败:', error);
    res.status(500).json({
      success: false,
      message: '开始/恢复自习室计时失败',
      error: error.message
    });
  }
});

// 暂停自习室计时
router.post('/sessions/:sessionId/pause', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId || isNaN(parseInt(sessionId))) {
      return res.status(400).json({
        success: false,
        message: '会话ID无效'
      });
    }

    const result = await StudyRoom.pauseStudySession(req.openid, parseInt(sessionId));

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
    console.error('暂停自习室计时失败:', error);
    res.status(500).json({
      success: false,
      message: '暂停自习室计时失败',
      error: error.message
    });
  }
});

// 结束自习室计时
router.post('/sessions/:sessionId/end', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId || isNaN(parseInt(sessionId))) {
      return res.status(400).json({
        success: false,
        message: '会话ID无效'
      });
    }

    const result = await StudyRoom.endStudySession(req.openid, parseInt(sessionId));

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
    console.error('结束自习室计时失败:', error);
    res.status(500).json({
      success: false,
      message: '结束自习室计时失败',
      error: error.message
    });
  }
});

// 获取当前活跃的自习室会话
router.get('/sessions/active', async (req, res) => {
  try {
    const result = await StudyRoom.getActiveStudySession(req.openid);

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
    console.error('获取自习室会话失败:', error);
    res.status(500).json({
      success: false,
      message: '获取自习室会话失败',
      error: error.message
    });
  }
});

// 获取用户自习室统计
router.get('/stats', async (req, res) => {
  try {
    const result = await StudyRoom.getUserStudyStats(req.openid);

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
    console.error('获取自习室统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取自习室统计失败',
      error: error.message
    });
  }
});

// 获取自习室历史记录
router.get('/history', async (req, res) => {
  try {
    const { 
      page = 1,
      limit = 20
    } = req.query;

    const result = await StudyRoom.getStudyHistory(req.openid, {
      page: parseInt(page),
      limit: parseInt(limit)
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
    console.error('获取自习室历史记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取自习室历史记录失败',
      error: error.message
    });
  }
});

module.exports = router;