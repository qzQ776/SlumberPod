const { query } = require('../config');

class SleepTimer {
  // 创建小憩任务（自动计算结束时间）
  static async createTimer(openid, timerData) {
    try {
      const { type, duration_minutes, start_time } = timerData;
      const end_time = new Date(start_time);
      end_time.setMinutes(end_time.getMinutes() + duration_minutes);
      
      const sql = `
        INSERT INTO sleep_timers (openid, type, duration_minutes, start_time, end_time, status)
        VALUES (?, ?, ?, ?, ?, 'active')
      `;
      
      const params = [
        openid,
        type,
        duration_minutes,
        start_time,
        end_time
      ];
      
      const result = await query(sql, params);
      
      if (result.success && result.insertId) {
        const newTimer = await this.getTimerById(result.insertId);
        return newTimer;
      }
      
      return result;
    } catch (error) {
      console.error('创建小憩任务失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 获取用户的小憩任务（可筛选进行中/已完成）
  static async getUserTimers(openid, status = 'active') {
    try {
      const sql = `
        SELECT * FROM sleep_timers 
        WHERE openid = ? AND status = ?
        ORDER BY start_time DESC
      `;
      
      const result = await query(sql, [openid, status]);
      
      return {
        success: true,
        data: result.data || []
      };
    } catch (error) {
      console.error('获取用户小憩任务失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 结束小憩任务（更新状态为已完成）
  static async completeTimer(timerId) {
    try {
      const sql = `
        UPDATE sleep_timers 
        SET status = 'completed' 
        WHERE timer_id = ?
      `;
      
      const result = await query(sql, [timerId]);
      
      return result;
    } catch (error) {
      console.error('结束小憩任务失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 根据ID获取小憩任务详情
  static async getTimerById(timerId) {
    try {
      const sql = `
        SELECT * FROM sleep_timers 
        WHERE timer_id = ?
      `;
      
      const result = await query(sql, [timerId]);
      
      return {
        success: true,
        data: result.data && result.data.length > 0 ? result.data[0] : null
      };
    } catch (error) {
      console.error('获取小憩任务详情失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 获取预设小憩类型的时长（如“科学小眠10”对应10分钟）
  static getPresetDuration(type) {
    const presets = {
      'scientific_10': 10,
      'efficient_24': 24
    };
    return presets[type] || 0;
  }
}

module.exports = SleepTimer;