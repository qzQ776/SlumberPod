import { supabase } from './supabaseClient.js'

/**
 * AI解梦服务 - 处理梦境分析和记录
 */
class DreamService {
  
  /**
   * 创建解梦记录
   */
  async createDreamAnalysis(dreamData) {
    const { data, error } = await supabase
      .from('dream_analysis')
      .insert([{
        user_id: dreamData.userId,
        dream_content: dreamData.dreamContent,
        analysis_result: dreamData.analysisResult,
        mood_rating: dreamData.moodRating,
        tags: dreamData.tags || []
      }])
      .select()
      .single()
    
    if (error) throw error
    return data
  }
  
  /**
   * 获取用户解梦记录
   */
  async getUserDreamAnalysis(userId, limit = 50) {
    const { data, error } = await supabase
      .from('dream_analysis')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data || []
  }
  
  /**
   * 获取解梦记录详情
   */
  async getDreamAnalysisDetail(recordId) {
    const { data, error } = await supabase
      .from('dream_analysis')
      .select('*')
      .eq('id', recordId)
      .single()
    
    if (error) throw error
    return data
  }
  
  /**
   * 模拟AI解梦分析
   * 实际应用中应该调用真实的AI API
   */
  async analyzeDream(dreamContent) {
    // 模拟AI分析过程
    const analysisResult = this.generateDreamAnalysis(dreamContent)
    const moodRating = this.analyzeMood(dreamContent)
    const tags = this.extractTags(dreamContent)
    
    return {
      analysisResult,
      moodRating,
      tags
    }
  }
  
  /**
   * 生成梦境分析结果
   */
  generateDreamAnalysis(dreamContent) {
    const analysisTemplates = [
      "这个梦境可能反映了您对自由的向往和内心的平静。海边散步通常象征着对放松和宁静的渴望。",
      "家庭聚餐的梦境往往代表对亲情的珍视和对温暖关系的向往。",
      "被追逐的梦境可能暗示您在现实生活中感到压力或焦虑。",
      "飞翔的梦境通常与成就感和自由感相关，可能表示您正在追求更高的目标。",
      "考试的梦境可能反映了您对能力或表现的担忧。"
    ]
    
    // 简单的关键词匹配
    if (dreamContent.includes('海边') || dreamContent.includes('散步')) {
      return analysisTemplates[0]
    } else if (dreamContent.includes('家庭') || dreamContent.includes('聚餐')) {
      return analysisTemplates[1]
    } else if (dreamContent.includes('追逐') || dreamContent.includes('逃跑')) {
      return analysisTemplates[2]
    } else if (dreamContent.includes('飞翔') || dreamContent.includes('飞行')) {
      return analysisTemplates[3]
    } else if (dreamContent.includes('考试') || dreamContent.includes('学习')) {
      return analysisTemplates[4]
    }
    
    // 默认分析
    return "这个梦境可能反映了您近期的情绪状态和生活经历。建议关注梦境中的细节，它们可能包含重要的心理暗示。"
  }
  
  /**
   * 分析情绪评分
   */
  analyzeMood(dreamContent) {
    const positiveWords = ['开心', '快乐', '平静', '放松', '美好', '温暖']
    const negativeWords = ['紧张', '焦虑', '害怕', '恐惧', '压力', '困扰']
    
    let positiveCount = 0
    let negativeCount = 0
    
    positiveWords.forEach(word => {
      if (dreamContent.includes(word)) positiveCount++
    })
    
    negativeWords.forEach(word => {
      if (dreamContent.includes(word)) negativeCount++
    })
    
    if (positiveCount > negativeCount) return 4
    if (negativeCount > positiveCount) return 2
    return 3 // 中性
  }
  
  /**
   * 提取标签
   */
  extractTags(dreamContent) {
    const commonTags = ['海边', '家庭', '工作', '学习', '朋友', '自然', '城市', '动物']
    const tags = []
    
    commonTags.forEach(tag => {
      if (dreamContent.includes(tag)) {
        tags.push(tag)
      }
    })
    
    return tags.length > 0 ? tags : ['其他']
  }
}

export default new DreamService()