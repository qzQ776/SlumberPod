const { query } = require('../config');

class Alarm {
   // 获取用户的所有闹钟（含启用/禁用状态）
  static async getUserAlarms(openid) {
    try {
      const sql = `
        SELECT * FROM alarms 
        WHERE openid = ? 
        ORDER BY alarm_time ASC
      `;
      
      const result = await query(sql, [openid]);
      
      return {
        success: true,
        data: result.data || []
      };
    } catch (error) {
      console.error('获取用户闹钟失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 创建闹钟（含再睡一会、振动、音量、铃声）
  static async createAlarm(openid, alarmData) {
    try {
      const { label, alarm_time, repeat_days, snooze_duration, vibration, volume } = alarmData;
      
      // 验证音量范围
      const validatedVolume = volume >= 0 && volume <= 100 ? volume : 80;
      
      const sql = `
        INSERT INTO alarms (openid, label, alarm_time, repeat_days, is_enabled, 
                           snooze_duration, vibration, volume)
        VALUES (?, ?, ?, ?, 1, ?, ?, ?)
      `;
      
      const params = [
        openid,
        label,
        alarm_time, // 直接使用时间字符串，无需转换为Date对象
        repeat_days || '',
        snooze_duration || 0,
        vibration ? 1 : 0,
        validatedVolume
      ];
      
      const result = await query(sql, params);
      
      if (result.success && result.insertId) {
        const newAlarm = await this.getAlarmById(result.insertId);
        return newAlarm;
      }
      
      return result;
    } catch (error) {
      console.error('创建闹钟失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 更新闹钟（支持全字段修改）
  static async updateAlarm(alarmId, alarmData) {
    try {
      const { label, alarm_time, repeat_days, is_enabled, snooze_duration, vibration, volume } = alarmData;
      
      const sql = `
        UPDATE alarms 
        SET label = ?, alarm_time = ?, repeat_days = ?,  is_enabled = ?, 
            snooze_duration = ?, vibration = ?, volume = ?
        WHERE alarm_id = ?
      `;
      
      const params = [
        label,
        alarm_time,
        repeat_days || '',
        is_enabled ? 1 : 0,
        snooze_duration || 0,
        vibration ? 1 : 0,
        volume || 80,
        alarmId
      ];
      
      const result = await query(sql, params);
      
      if (result.success) {
        const updatedAlarm = await this.getAlarmById(alarmId);
        return updatedAlarm;
      }
      
      return result;
    } catch (error) {
      console.error('更新闹钟失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 删除闹钟
  static async deleteAlarm(alarmId) {
    try {
      const sql = `
        DELETE FROM alarms 
        WHERE alarm_id = ?
      `;
      
      const result = await query(sql, [alarmId]);
      
      return result;
    } catch (error) {
      console.error('删除闹钟失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 根据ID获取闹钟
  static async getAlarmById(alarmId) {
    try {
      const sql = `
        SELECT * FROM alarms 
        WHERE alarm_id = ?
      `;
      
      const result = await query(sql, [alarmId]);
      
      return {
        success: true,
        data: result.data && result.data.length > 0 ? result.data[0] : null
      };
    } catch (error) {
      console.error('获取闹钟详情失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 启用/禁用闹钟
  static async toggleAlarm(alarmId, enabled) {
    try {
      const sql = `
        UPDATE alarms 
        SET is_enabled = ? 
        WHERE alarm_id = ?
      `;
      
      const result = await query(sql, [enabled ? 1 : 0, alarmId]);
      
      return result;
    } catch (error) {
      console.error('切换闹钟状态失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = Alarm;