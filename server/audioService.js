import { supabase } from './supabaseClient.js'

/**
 * 音频服务 - 处理白噪音相关功能
 */
class AudioService {
  
  /**
   * 获取所有音频分类
   */
  async getAudioCategories() {
    const { data, error } = await supabase
      .from('audio_categories')
      .select('*')
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return data || []
  }
  
  /**
   * 根据分类获取音频
   */
  async getAudiosByCategory(categoryId) {
    const { data, error } = await supabase
      .from('audios')
      .select(`
        *,
        audio_categories(name)
      `)
      .eq('category_id', categoryId)
      .order('play_count', { ascending: false })
    
    if (error) throw error
    return data || []
  }
  
  /**
   * 获取所有音频
   */
  async getAllAudios() {
    const { data, error } = await supabase
      .from('audios')
      .select(`
        *,
        audio_categories(name)
      `)
      .order('play_count', { ascending: false })
    
    if (error) throw error
    return data || []
  }
  
  /**
   * 随机推荐音频
   */
  async getRandomAudios(count = 5) {
    const { data, error } = await supabase
      .from('audios')
      .select(`
        *,
        audio_categories(name)
      `)
      .order('play_count', { ascending: false })
      .limit(count)
    
    if (error) throw error
    return data || []
  }
  
  /**
   * 获取音频详情
   */
  async getAudioDetail(audioId) {
    const { data, error } = await supabase
      .from('audios')
      .select(`
        *,
        audio_categories(name),
        profiles(username)
      `)
      .eq('id', audioId)
      .single()
    
    if (error) throw error
    return data
  }
  
  /**
   * 增加播放次数
   */
  async incrementPlayCount(audioId) {
    const { data, error } = await supabase
      .from('audios')
      .update({ 
        play_count: supabase.sql`play_count + 1`,
        updated_at: new Date().toISOString()
      })
      .eq('id', audioId)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
  
  /**
   * 点赞音频
   */
  async likeAudio(audioId) {
    const { data, error } = await supabase
      .from('audios')
      .update({ 
        like_count: supabase.sql`like_count + 1`,
        updated_at: new Date().toISOString()
      })
      .eq('id', audioId)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
  
  /**
   * 搜索音频
   */
  async searchAudios(keyword) {
    const { data, error } = await supabase
      .from('audios')
      .select(`
        *,
        audio_categories(name)
      `)
      .ilike('title', `%${keyword}%`)
      .order('play_count', { ascending: false })
    
    if (error) throw error
    return data || []
  }
}

export default new AudioService()