const Alarm = require('../database/models/Alarm');

class AlarmService {
  /**
   * 获取用户所有闹钟（含业务逻辑处理）
   */
  static async getUserAlarms(openid) {
    try {
      const result = await Alarm.getUserAlarms(openid);
      
      if (!result.success) {
        return result;
      }
      
      // 业务逻辑处理：格式化时间、处理重复规则等
      const alarms = result.data.map(alarm => this.formatAlarmData(alarm));
      
      return {
        success: true,
        data: alarms,
        count: alarms.length
      };
    } catch (error) {
      console.error('获取用户闹钟服务失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 创建闹钟（含业务验证）
   */
  static async createAlarm(openid, alarmData) {
    try {
      // 业务验证：检查闹钟时间是否合理
      if (!this.validateAlarmTime(alarmData.alarm_time)) {
        return {
          success: false,
          message: '闹钟时间格式无效'
        };
      }

      // 验证重复规则格式
      if (alarmData.repeat_days && !this.validateRepeatDays(alarmData.repeat_days)) {
        return {
          success: false,
          message: '重复规则格式无效'
        };
      }

      const result = await Alarm.createAlarm(openid, alarmData);
      
      if (result.success && result.data) {
        result.data = this.formatAlarmData(result.data);
      }
      
      return result;
    } catch (error) {
      console.error('创建闹钟服务失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 更新闹钟
   */
  static async updateAlarm(alarmId, alarmData) {
    try {
      // 验证闹钟是否存在
      const existingAlarm = await Alarm.getAlarmById(alarmId);
      if (!existingAlarm.success || !existingAlarm.data) {
        return {
          success: false,
          message: '闹钟不存在'
        };
      }

      // 业务验证
      if (alarmData.alarm_time && !this.validateAlarmTime(alarmData.alarm_time)) {
        return {
          success: false,
          message: '闹钟时间格式无效'
        };
      }

      const result = await Alarm.updateAlarm(alarmId, alarmData);
      
      if (result.success && result.data) {
        result.data = this.formatAlarmData(result.data);
      }
      
      return result;
    } catch (error) {
      console.error('更新闹钟服务失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 删除闹钟
   */
  static async deleteAlarm(alarmId) {
    try {
      // 验证闹钟是否存在
      const existingAlarm = await Alarm.getAlarmById(alarmId);
      if (!existingAlarm.success || !existingAlarm.data) {
        return {
          success: false,
          message: '闹钟不存在'
        };
      }

      return await Alarm.deleteAlarm(alarmId);
    } catch (error) {
      console.error('删除闹钟服务失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取闹钟详情
   */
  static async getAlarmDetail(alarmId) {
    try {
      const result = await Alarm.getAlarmById(alarmId);
      
      if (result.success && result.data) {
        result.data = this.formatAlarmData(result.data);
      }
      
      return result;
    } catch (error) {
      console.error('获取闹钟详情服务失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 切换闹钟状态
   */
  static async toggleAlarm(alarmId, enabled) {
    try {
      // 验证闹钟是否存在
      const existingAlarm = await Alarm.getAlarmById(alarmId);
      if (!existingAlarm.success || !existingAlarm.data) {
        return {
          success: false,
          message: '闹钟不存在'
        };
      }

      const result = await Alarm.toggleAlarm(alarmId, enabled);
      
      if (result.success) {
        return {
          success: true,
          message: enabled ? '闹钟已启用' : '闹钟已禁用',
          data: {
            alarm_id: alarmId,
            is_enabled: enabled
          }
        };
      }
      
      return result;
    } catch (error) {
      console.error('切换闹钟状态服务失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取用户启用的闹钟列表（用于闹钟提醒服务）
   */
  static async getEnabledAlarms(openid) {
    try {
      const result = await Alarm.getUserAlarms(openid);
      
      if (!result.success) {
        return result;
      }
      
      // 过滤启用的闹钟
      const enabledAlarms = result.data
        .filter(alarm => alarm.is_enabled)
        .map(alarm => this.formatAlarmData(alarm));
      
      return {
        success: true,
        data: enabledAlarms,
        count: enabledAlarms.length
      };
    } catch (error) {
      console.error('获取启用闹钟服务失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 批量操作闹钟
   */
  static async batchUpdateAlarms(openid, operations) {
    try {
      const results = [];
      
      for (const operation of operations) {
        const { action, alarm_id, data } = operation;
        
        switch (action) {
          case 'enable':
            results.push(await this.toggleAlarm(alarm_id, true));
            break;
          case 'disable':
            results.push(await this.toggleAlarm(alarm_id, false));
            break;
          case 'delete':
            results.push(await this.deleteAlarm(alarm_id));
            break;
          case 'update':
            results.push(await this.updateAlarm(alarm_id, data));
            break;
          default:
            results.push({
              success: false,
              message: `不支持的操作: ${action}`
            });
        }
      }
      
      return {
        success: true,
        data: results,
        total: results.length,
        successCount: results.filter(r => r.success).length
      };
    } catch (error) {
      console.error('批量操作闹钟服务失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 格式化闹钟数据
   */
  static formatAlarmData(alarm) {
    return {
      alarm_id: alarm.alarm_id || alarm.id,
      openid: alarm.openid,
      alarm_time: alarm.alarm_time,
      repeat_days: alarm.repeat_days ? alarm.repeat_days.split(',').map(Number) : [],
      label: alarm.label,
      snooze_duration: alarm.snooze_duration,
      vibration: Boolean(alarm.vibration),
      volume: alarm.volume,
      is_enabled: Boolean(alarm.is_enabled),
      created_at: alarm.created_at,
      updated_at: alarm.updated_at
    };
  }

  /**
   * 验证闹钟时间格式
   */
  static validateAlarmTime(time) {
    if (!time) return false;
    
    // 如果是时间字符串（如 "08:30"）
    if (typeof time === 'string' && time.includes(':')) {
      const [hourStr, minuteStr] = time.split(':');
      
      // 严格验证数字格式，避免 parseInt(x) || 0 的写法
      const hour = parseInt(hourStr);
      const minute = parseInt(minuteStr);
      
      // 检查是否为有效的数字
      if (isNaN(hour) || isNaN(minute)) {
        return false;
      }
      
      // 范围校验
      if (hour < 0 || hour > 23) {
        return false;
      }
      if (minute < 0 || minute > 59) {
        return false;
      }
      
      return true;
    }
    
    // 如果是 Date 对象
    try {
      const date = new Date(time);
      return !isNaN(date.getTime());
    } catch (error) {
      return false;
    }
  }

  /**
   * 验证重复规则格式
   */
  static validateRepeatDays(days) {
    if (!days) return true; // 允许为空
    
    try {
      const dayArray = days.split(',').map(Number);
      return dayArray.every(day => day >= 1 && day <= 7);
    } catch (error) {
      return false;
    }
  }

  /**
   * 检查是否应该触发闹钟（用于提醒服务）
   */
  static shouldTriggerAlarm(alarm, currentTime) {
    if (!alarm.is_enabled) return false;
    
    const alarmTime = new Date(alarm.alarm_time);
    const current = currentTime || new Date();
    
    // 检查重复规则
    if (alarm.repeat_days && alarm.repeat_days.length > 0) {
      const currentDay = current.getDay() || 7; // 周日为0，转换为7
      return alarm.repeat_days.includes(currentDay);
    }
    
    // 一次性闹钟：检查时间是否匹配
    return alarmTime.getHours() === current.getHours() && 
           alarmTime.getMinutes() === current.getMinutes();
  }
}

module.exports = AlarmService;