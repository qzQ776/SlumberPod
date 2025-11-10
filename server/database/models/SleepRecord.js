const { query } = require('../config');

class SleepRecord {
  // 获取用户的睡眠记录
  static async getUserSleepRecords(openid, limit = 30, offset = 0) {
    try {
      const sql = `
        SELECT * FROM sleep_records 
        WHERE openid = ?
        ORDER BY sleep_date DESC
        LIMIT ? OFFSET ?
      `;
      
      const result = await query(sql, [openid, parseInt(limit) || 30, parseInt(offset) || 0]);
      
      return {
        success: true,
        data: result.data || [],
        total: result.data ? result.data.length : 0
      };
    } catch (error) {
      console.error('获取睡眠记录失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 添加睡眠记录
  static async addSleepRecord(openid, recordData) {
    try {
      const { sleep_date, sleep_time, wake_time, sleep_duration, sleep_quality, notes } = recordData;
      
      // 检查是否已有当天的记录
      const checkSql = `
        SELECT id FROM sleep_records 
        WHERE openid = ? AND sleep_date = ?
      `;
      
      const checkResult = await query(checkSql, [openid, sleep_date]);
      
      if (checkResult.data && checkResult.data.length > 0) {
        // 更新现有记录
        const updateSql = `
          UPDATE sleep_records 
          SET sleep_time = ?, wake_time = ?, sleep_duration = ?, sleep_quality = ?, notes = ?
          WHERE id = ?
        `;
        
        const updateResult = await query(updateSql, [sleep_time, wake_time, sleep_duration, sleep_quality, notes, checkResult.data[0].id]);
        
        if (updateResult.success) {
          return {
            success: true,
            message: '睡眠记录更新成功'
          };
        }
      } else {
        // 新增记录
        const insertSql = `
          INSERT INTO sleep_records (openid, sleep_date, sleep_time, wake_time, sleep_duration, sleep_quality, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await query(insertSql, [openid, sleep_date, sleep_time, wake_time, sleep_duration, sleep_quality, notes]);
        
        return {
          success: true,
          message: '睡眠记录添加成功'
        };
      }
    } catch (error) {
      console.error('添加睡眠记录失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 获取用户睡眠统计
  static async getUserSleepStats(openid, startDate, endDate) {
    try {
      let sql = `
        SELECT 
          COUNT(*) as total_records,
          AVG(sleep_duration) as avg_sleep_duration,
          AVG(sleep_quality) as avg_sleep_quality,
          MIN(sleep_duration) as min_sleep_duration,
          MAX(sleep_duration) as max_sleep_duration
        FROM sleep_records 
        WHERE openid = ?
      `;
      
      const params = [openid];
      
      if (startDate && endDate) {
        sql += ' AND sleep_date BETWEEN ? AND ?';
        params.push(startDate, endDate);
      }
      
      const result = await query(sql, params);
      
      return {
        success: true,
        data: result.data && result.data.length > 0 ? result.data[0] : null
      };
    } catch (error) {
      console.error('获取睡眠统计失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 删除睡眠记录
  static async deleteSleepRecord(recordId) {
    try {
      const sql = `
        DELETE FROM sleep_records 
        WHERE id = ?
      `;
      
      const result = await query(sql, [recordId]);
      
      return result;
    } catch (error) {
      console.error('删除睡眠记录失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 获取最近7天的睡眠记录
  static async getRecentWeekSleepRecords(openid) {
    try {
      const sql = `
        SELECT * FROM sleep_records 
        WHERE openid = ? AND sleep_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        ORDER BY sleep_date ASC
      `;
      
      const result = await query(sql, [openid]);
      
      return {
        success: true,
        data: result.data || []
      };
    } catch (error) {
      console.error('获取最近一周睡眠记录失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = SleepRecord;