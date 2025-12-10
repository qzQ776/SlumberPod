const { query } = require('../config');

class StudyRoom {
  /**
   * 开始或恢复自习室计时
   */
  static async startOrResumeStudySession(openid, audioId = null) {
    try {
      // 检查是否有未结束的会话
      const existingSession = await query(
        `SELECT session_id, start_time, last_resume_time, total_study_time, status
         FROM study_room_sessions 
         WHERE openid = ? AND status IN ('active', 'paused')
         ORDER BY session_id DESC LIMIT 1`,
        [openid]
      );

      if (existingSession.success && existingSession.data.length > 0) {
        // 恢复现有会话
        const session = existingSession.data[0];
        const now = new Date();
        
        // 更新最后恢复时间和状态
        await query(
          'UPDATE study_room_sessions SET last_resume_time = ?, status = "active", updated_at = NOW() WHERE session_id = ?',
          [now, session.session_id]
        );

        return {
          success: true,
          data: {
            session_id: session.session_id,
            action: 'resume',
            start_time: session.start_time,
            last_resume_time: now,
            total_study_time: session.total_study_time
          },
          message: '恢复自习室计时成功'
        };
      } else {
        // 创建新会话
        const now = new Date();
        const insertResult = await query(
          `INSERT INTO study_room_sessions 
           (openid, audio_id, start_time, last_resume_time, total_study_time, status, created_at)
           VALUES (?, ?, ?, ?, 0, 'active', NOW())`,
          [openid, audioId, now, now]
        );

        // 检查插入是否成功
        if (!insertResult.success || !insertResult.data) {
          return {
            success: false,
            message: '创建自习室会话失败',
            error: '数据库插入操作失败'
          };
        }

        return {
          success: true,
          data: {
            session_id: insertResult.data.insertId,
            action: 'start',
            start_time: now,
            last_resume_time: now,
            total_study_time: 0
          },
          message: '开始自习室计时成功'
        };
      }
    } catch (error) {
      console.error('开始/恢复自习室计时失败:', error);
      return {
        success: false,
        message: '开始/恢复自习室计时失败',
        error: error.message
      };
    }
  }

  /**
   * 暂停自习室计时
   */
  static async pauseStudySession(openid, sessionId) {
    try {
      // 验证会话存在且属于当前用户
      const sessionCheck = await query(
        'SELECT session_id, last_resume_time, total_study_time FROM study_room_sessions WHERE session_id = ? AND openid = ? AND status = "active"',
        [sessionId, openid]
      );

      if (!sessionCheck.success || sessionCheck.data.length === 0) {
        return {
          success: false,
          message: '会话不存在或已结束'
        };
      }

      const session = sessionCheck.data[0];
      const now = new Date();
      
      // 计算本次学习时长
      const lastResumeTime = new Date(session.last_resume_time);
      const currentDuration = Math.floor((now - lastResumeTime) / 1000); // 转换为秒
      
      // 更新总学习时长和状态
      const newTotalTime = session.total_study_time + currentDuration;
      
      await query(
        `UPDATE study_room_sessions 
         SET total_study_time = ?, status = 'paused', updated_at = NOW()
         WHERE session_id = ? AND openid = ?`,
        [newTotalTime, sessionId, openid]
      );

      return {
        success: true,
        data: {
          session_id: sessionId,
          total_study_time: newTotalTime,
          current_duration: currentDuration
        },
        message: '暂停自习室计时成功'
      };
    } catch (error) {
      console.error('暂停自习室计时失败:', error);
      return {
        success: false,
        message: '暂停自习室计时失败',
        error: error.message
      };
    }
  }

  /**
   * 结束自习室计时
   */
  static async endStudySession(openid, sessionId) {
    try {
      // 验证会话存在且属于当前用户
      const sessionCheck = await query(
        'SELECT session_id, last_resume_time, total_study_time, status FROM study_room_sessions WHERE session_id = ? AND openid = ?',
        [sessionId, openid]
      );

      if (!sessionCheck.success || sessionCheck.data.length === 0) {
        return {
          success: false,
          message: '会话不存在'
        };
      }

      const session = sessionCheck.data[0];
      const now = new Date();
      
      // 计算总学习时长
      let totalTime = session.total_study_time;
      
      // 如果是活动状态，需要计算最后一次的时长
      if (session.status === 'active') {
        const lastResumeTime = new Date(session.last_resume_time);
        const currentDuration = Math.floor((now - lastResumeTime) / 1000);
        totalTime += currentDuration;
      }

      // 更新会话为结束状态
      await query(
        `UPDATE study_room_sessions 
         SET total_study_time = ?, end_time = ?, status = 'completed', updated_at = NOW()
         WHERE session_id = ? AND openid = ?`,
        [totalTime, now, sessionId, openid]
      );

      return {
        success: true,
        data: {
          session_id: sessionId,
          total_study_time: totalTime,
          end_time: now
        },
        message: '结束自习室计时成功'
      };
    } catch (error) {
      console.error('结束自习室计时失败:', error);
      return {
        success: false,
        message: '结束自习室计时失败',
        error: error.message
      };
    }
  }

  /**
   * 获取当前活跃的自习室会话
   */
  static async getActiveStudySession(openid) {
    try {
      const result = await query(
        `SELECT 
          session_id, 
          audio_id,
          start_time, 
          last_resume_time, 
          total_study_time,
          status,
          created_at
         FROM study_room_sessions 
         WHERE openid = ? AND status IN ('active', 'paused')
         ORDER BY session_id DESC LIMIT 1`,
        [openid]
      );

      if (result.success && result.data.length > 0) {
        const session = result.data[0];
        
        // 如果是活动状态，计算当前时长
        let current_duration = 0;
        if (session.status === 'active') {
          const lastResumeTime = new Date(session.last_resume_time);
          const now = new Date();
          current_duration = Math.floor((now - lastResumeTime) / 1000);
        }

        return {
          success: true,
          data: {
            ...session,
            current_duration
          },
          message: '获取自习室会话成功'
        };
      }

      return {
        success: true,
        data: null,
        message: '没有活跃的自习室会话'
      };
    } catch (error) {
      console.error('获取自习室会话失败:', error);
      return {
        success: false,
        message: '获取自习室会话失败',
        error: error.message
      };
    }
  }

  /**
   * 获取用户自习室统计
   */
  static async getUserStudyStats(openid) {
    try {
      // 获取总学习时长、总学习天数、今日学习时长
      const statsResult = await query(
        `SELECT 
          COUNT(DISTINCT DATE(created_at)) as total_days,
          SUM(total_study_time) as total_time,
          SUM(CASE WHEN DATE(created_at) = CURDATE() THEN total_study_time ELSE 0 END) as today_time,
          COUNT(*) as total_sessions
         FROM study_room_sessions 
         WHERE openid = ? AND status = 'completed'`,
        [openid]
      );

      // 获取最近7天的学习记录
      const weeklyStatsResult = await query(
        `SELECT 
          DATE(created_at) as study_date,
          SUM(total_study_time) as daily_study_time
         FROM study_room_sessions 
         WHERE openid = ? AND status = 'completed' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
         GROUP BY DATE(created_at)
         ORDER BY study_date ASC`,
        [openid]
      );

      const stats = statsResult.success && statsResult.data.length > 0 ? statsResult.data[0] : {
        total_days: 0, total_time: 0, today_time: 0, total_sessions: 0
      };

      return {
        success: true,
        data: {
          total_days: stats.total_days || 0,
          total_time: stats.total_time || 0,
          today_time: stats.today_time || 0,
          total_sessions: stats.total_sessions || 0,
          weekly_stats: weeklyStatsResult.success ? weeklyStatsResult.data : []
        },
        message: '获取自习室统计成功'
      };
    } catch (error) {
      console.error('获取自习室统计失败:', error);
      return {
        success: false,
        message: '获取自习室统计失败',
        error: error.message
      };
    }
  }

  /**
   * 获取自习室历史记录
   */
  static async getStudyHistory(openid, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const result = await query(
        `SELECT 
          session_id,
          audio_id,
          start_time,
          end_time,
          total_study_time,
          status,
          created_at
         FROM study_room_sessions 
         WHERE openid = ? AND status = 'completed'
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [openid, parseInt(limit), parseInt(offset)]
      );

      // 获取总数
      const countResult = await query(
        'SELECT COUNT(*) as total FROM study_room_sessions WHERE openid = ? AND status = "completed"',
        [openid]
      );

      return {
        success: true,
        data: result.data || [],
        total: countResult.data[0].total || 0,
        message: '获取自习室历史记录成功'
      };
    } catch (error) {
      console.error('获取自习室历史记录失败:', error);
      return {
        success: false,
        message: '获取自习室历史记录失败',
        error: error.message
      };
    }
  }
}

module.exports = StudyRoom;