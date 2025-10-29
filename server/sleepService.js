import { supabase } from './supabaseClient.js'

/**
 * 睡眠服务 - 处理睡眠记录、闹钟、反馈等功能
 */
class SleepService {
  
  /**
   * 创建睡眠记录
   */
  async createSleepRecord(recordData) {
    const { data, error } = await supabase
      .from('sleep_records')
      .insert([{
        user_id: recordData.userId,
        start_time: recordData.startTime,
        end_time: recordData.endTime,
        duration: recordData.duration,
        quality_rating: recordData.qualityRating,
        notes: recordData.notes,
        audio_ids: recordData.audioIds || []
      }])
      .select()
      .single()
    
    if (error) throw error
    return data
  }
  
  /**
   * 获取用户睡眠记录
   */
  async getUserSleepRecords(userId, limit = 30) {
    const { data, error } = await supabase
      .from('sleep_records')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data || []
  }
  
  /**
   * 获取睡眠记录详情
   */
  async getSleepRecordDetail(recordId) {
    const { data, error } = await supabase
      .from('sleep_records')
      .select(`
        *,
        audios(title, audio_url)
      `)
      .eq('id', recordId)
      .single()
    
    if (error) throw error
    return data
  }
  
  /**
   * 创建闹钟
   */
  async createAlarm(alarmData) {
    const { data, error } = await supabase
      .from('alarms')
      .insert([{
        user_id: alarmData.userId,
        title: alarmData.title,
        alarm_time: alarmData.alarmTime,
        repeat_days: alarmData.repeatDays || [],
        audio_ids: alarmData.audioIds || [],
        is_nap: alarmData.isNap || false
      }])
      .select()
      .single()
    
    if (error) throw error
    return data
  }
  
  /**
   * 获取用户闹钟
   */
  async getUserAlarms(userId) {
    const { data, error } = await supabase
      .from('alarms')
      .select(`
        *,
        audios(title, audio_url)
      `)
      .eq('user_id', userId)
      .order('alarm_time', { ascending: true })
    
    if (error) throw error
    return data || []
  }
  
  /**
   * 更新闹钟状态
   */
  async updateAlarmStatus(alarmId, isActive) {
    const { data, error } = await supabase
      .from('alarms')
      .update({ 
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', alarmId)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
  
  /**
   * 删除闹钟
   */
  async deleteAlarm(alarmId) {
    const { error } = await supabase
      .from('alarms')
      .delete()
      .eq('id', alarmId)
    
    if (error) throw error
    return { success: true }
  }
  
  /**
   * 提交睡眠反馈
   */
  async submitFeedback(feedbackData) {
    const { data, error } = await supabase
      .from('feedback_records')
      .insert([{
        user_id: feedbackData.userId,
        sleep_record_id: feedbackData.sleepRecordId,
        feedback_content: feedbackData.content,
        rating: feedbackData.rating,
        is_resolved: feedbackData.isResolved || false
      }])
      .select()
      .single()
    
    if (error) throw error
    return data
  }
  
  /**
   * 获取用户反馈记录
   */
  async getUserFeedback(userId, limit = 50) {
    const { data, error } = await supabase
      .from('feedback_records')
      .select(`
        *,
        sleep_records(start_time, end_time, duration)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data || []
  }
  
  /**
   * 获取睡眠统计数据
   */
  async getSleepStatistics(userId, days = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    const { data, error } = await supabase
      .from('sleep_records')
      .select('duration, quality_rating, start_time')
      .eq('user_id', userId)
      .gte('start_time', startDate.toISOString())
      .order('start_time', { ascending: true })
    
    if (error) throw error
    
    const stats = {
      totalDays: data?.length || 0,
      avgDuration: 0,
      avgQuality: 0,
      bestQuality: 0,
      worstQuality: 5
    }
    
    if (data && data.length > 0) {
      const totalDuration = data.reduce((sum, record) => sum + (record.duration || 0), 0)
      const totalQuality = data.reduce((sum, record) => sum + (record.quality_rating || 0), 0)
      
      stats.avgDuration = Math.round(totalDuration / data.length)
      stats.avgQuality = Math.round((totalQuality / data.length) * 10) / 10
      stats.bestQuality = Math.max(...data.map(r => r.quality_rating || 0))
      stats.worstQuality = Math.min(...data.map(r => r.quality_rating || 5))
    }
    
    return stats
  }
}

export default new SleepService()