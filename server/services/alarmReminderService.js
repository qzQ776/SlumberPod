const AlarmService = require('./alarmService');

class AlarmReminderService {
  /**
   * 闹钟提醒服务 - 检查并触发闹钟提醒
   */
  static async checkAndTriggerAlarms(openid) {
    try {
      console.log(`⏰ 检查用户 ${openid} 的闹钟提醒`);
      
      const result = await AlarmService.getEnabledAlarms(openid);
      
      if (!result.success) {
        console.error('获取启用闹钟失败:', result.error);
        return {
          success: false,
          error: result.error
        };
      }
      
      const currentTime = new Date();
      const activeAlarms = result.data.filter(alarm => 
        AlarmService.shouldTriggerAlarm(alarm, currentTime)
      );
      
      if (activeAlarms.length === 0) {
        return {
          success: true,
          data: {
            activeAlarms: [],
            message: '当前没有需要触发的闹钟'
          }
        };
      }
      
      console.log(`🔔 发现 ${activeAlarms.length} 个闹钟需要触发`);
      
      // 这里可以集成推送服务、WebSocket通知等
      const notificationResults = await this.sendAlarmNotifications(activeAlarms);
      
      return {
        success: true,
        data: {
          activeAlarms: activeAlarms,
          notificationResults: notificationResults,
          currentTime: currentTime.toISOString(),
          activeCount: activeAlarms.length
        }
      };
      
    } catch (error) {
      console.error('检查闹钟提醒失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 发送闹钟通知（预留接口）
   */
  static async sendAlarmNotifications(alarms) {
    const results = [];
    
    for (const alarm of alarms) {
      try {
        // 这里可以实现推送服务集成
        // 例如：微信模板消息、App推送、WebSocket通知等
        
        const notification = {
          alarm_id: alarm.alarm_id,
          title: `闹钟提醒 - ${alarm.label || '闹钟'}`,
          message: `现在是 ${new Date(alarm.alarm_time).toLocaleTimeString('zh-CN')}，${alarm.label || '闹钟'}已触发`,
          timestamp: new Date().toISOString(),
          type: 'alarm_reminder',
          data: {
            alarm: alarm,
            vibration: alarm.vibration,
            volume: alarm.volume
          }
        };
        
        // 模拟发送通知
        console.log(`📢 发送闹钟通知: ${notification.title}`);
        
        results.push({
          alarm_id: alarm.alarm_id,
          success: true,
          notification: notification
        });
        
      } catch (error) {
        console.error(`发送闹钟 ${alarm.alarm_id} 通知失败:`, error);
        results.push({
          alarm_id: alarm.alarm_id,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * 获取用户今日闹钟安排
   */
  static async getTodayAlarms(openid) {
    try {
      const result = await AlarmService.getEnabledAlarms(openid);
      
      if (!result.success) {
        return result;
      }
      
      const today = new Date();
      const todayDay = today.getDay() || 7; // 周日为0，转换为7
      
      const todayAlarms = result.data.filter(alarm => {
        if (!alarm.repeat_days || alarm.repeat_days.length === 0) {
          // 一次性闹钟：检查是否是今天设置的
          const alarmDate = new Date(alarm.created_at);
          return alarmDate.toDateString() === today.toDateString();
        }
        
        // 重复闹钟：检查是否包含今天
        return alarm.repeat_days.includes(todayDay);
      });
      
      // 按时间排序
      todayAlarms.sort((a, b) => {
        const timeA = new Date(a.alarm_time).getTime();
        const timeB = new Date(b.alarm_time).getTime();
        return timeA - timeB;
      });
      
      return {
        success: true,
        data: todayAlarms,
        count: todayAlarms.length,
        today: today.toISOString().split('T')[0]
      };
      
    } catch (error) {
      console.error('获取今日闹钟安排失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取闹钟统计信息
   */
  static async getAlarmStats(openid) {
    try {
      const result = await AlarmService.getUserAlarms(openid);
      
      if (!result.success) {
        return result;
      }
      
      const alarms = result.data;
      const totalAlarms = alarms.length;
      const enabledAlarms = alarms.filter(a => a.is_enabled).length;
      const disabledAlarms = totalAlarms - enabledAlarms;
      
      // 统计重复类型
      const repeatStats = {
        daily: alarms.filter(a => a.repeat_days && a.repeat_days.length === 7).length,
        weekdays: alarms.filter(a => a.repeat_days && 
          a.repeat_days.length === 5 && 
          a.repeat_days.every(d => d >= 1 && d <= 5)).length,
        weekend: alarms.filter(a => a.repeat_days && 
          a.repeat_days.length === 2 && 
          a.repeat_days.includes(6) && a.repeat_days.includes(7)).length,
        custom: alarms.filter(a => a.repeat_days && a.repeat_days.length > 0 && 
          !(a.repeat_days.length === 7 || 
            (a.repeat_days.length === 5 && a.repeat_days.every(d => d >= 1 && d <= 5)) ||
            (a.repeat_days.length === 2 && a.repeat_days.includes(6) && a.repeat_days.includes(7)))).length,
        once: alarms.filter(a => !a.repeat_days || a.repeat_days.length === 0).length
      };
      
      // 时间段统计
      const timeStats = {
        morning: alarms.filter(a => {
          const hour = new Date(a.alarm_time).getHours();
          return hour >= 5 && hour < 12;
        }).length,
        afternoon: alarms.filter(a => {
          const hour = new Date(a.alarm_time).getHours();
          return hour >= 12 && hour < 18;
        }).length,
        evening: alarms.filter(a => {
          const hour = new Date(a.alarm_time).getHours();
          return hour >= 18 && hour < 24;
        }).length,
        night: alarms.filter(a => {
          const hour = new Date(a.alarm_time).getHours();
          return hour >= 0 && hour < 5;
        }).length
      };
      
      return {
        success: true,
        data: {
          total: totalAlarms,
          enabled: enabledAlarms,
          disabled: disabledAlarms,
          repeatStats: repeatStats,
          timeStats: timeStats,
          createdDates: alarms.map(a => a.created_at.split('T')[0])
        }
      };
      
    } catch (error) {
      console.error('获取闹钟统计失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 备份闹钟设置
   */
  static async backupAlarms(openid) {
    try {
      const result = await AlarmService.getUserAlarms(openid);
      
      if (!result.success) {
        return result;
      }
      
      const backupData = {
        version: '1.0',
        backup_time: new Date().toISOString(),
        user_openid: openid,
        alarms: result.data.map(alarm => ({
          alarm_id: alarm.alarm_id,
          label: alarm.label,
          alarm_time: alarm.alarm_time,
          repeat_days: alarm.repeat_days,
          snooze_duration: alarm.snooze_duration,
          vibration: alarm.vibration,
          volume: alarm.volume,
          is_enabled: alarm.is_enabled,
          created_at: alarm.created_at
        }))
      };
      
      return {
        success: true,
        data: backupData,
        message: `成功备份 ${result.data.length} 个闹钟设置`
      };
      
    } catch (error) {
      console.error('备份闹钟设置失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 从备份恢复闹钟
   */
  static async restoreAlarms(openid, backupData) {
    try {
      if (!backupData || !backupData.alarms || !Array.isArray(backupData.alarms)) {
        return {
          success: false,
          message: '备份数据格式无效'
        };
      }
      
      const restoreResults = [];
      
      for (const alarmData of backupData.alarms) {
        try {
          // 创建新闹钟（忽略原ID）
          const createData = {
            label: alarmData.label,
            alarm_time: alarmData.alarm_time,
            repeat_days: alarmData.repeat_days,
            snooze_duration: alarmData.snooze_duration,
            vibration: alarmData.vibration,
            volume: alarmData.volume
          };
          
          const result = await AlarmService.createAlarm(openid, createData);
          
          restoreResults.push({
            original_alarm_id: alarmData.alarm_id,
            success: result.success,
            new_alarm_id: result.success ? result.data.alarm_id : null,
            error: result.error
          });
          
        } catch (error) {
          restoreResults.push({
            original_alarm_id: alarmData.alarm_id,
            success: false,
            error: error.message
          });
        }
      }
      
      const successCount = restoreResults.filter(r => r.success).length;
      
      return {
        success: true,
        data: {
          restoreResults: restoreResults,
          total: backupData.alarms.length,
          successCount: successCount
        },
        message: `恢复完成，成功 ${successCount} 个闹钟，共 ${backupData.alarms.length} 个`
      };
      
    } catch (error) {
      console.error('恢复闹钟设置失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = AlarmReminderService;