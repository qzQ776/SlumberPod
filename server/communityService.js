import { supabase } from './supabaseClient.js'

/**
 * 社区服务 - 处理帖子、评论、互动等功能
 */
class CommunityService {
  
  /**
   * 创建帖子
   */
  async createPost(postData) {
    const { data, error } = await supabase
      .from('community_posts')
      .insert([{
        user_id: postData.userId,
        title: postData.title,
        content: postData.content,
        image_urls: postData.imageUrls || []
      }])
      .select()
      .single()
    
    if (error) throw error
    return data
  }
  
  /**
   * 获取帖子列表
   */
  async getPosts(page = 1, limit = 20) {
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    const { data, error, count } = await supabase
      .from('community_posts')
      .select(`
        *,
        profiles(username, avatar_url)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)
    
    if (error) throw error
    return { data: data || [], total: count || 0 }
  }
  
  /**
   * 获取帖子详情
   */
  async getPostDetail(postId) {
    const { data, error } = await supabase
      .from('community_posts')
      .select(`
        *,
        profiles(username, avatar_url)
      `)
      .eq('id', postId)
      .single()
    
    if (error) throw error
    return data
  }
  
  /**
   * 点赞帖子
   */
  async likePost(postId) {
    const { data, error } = await supabase
      .from('community_posts')
      .update({ 
        like_count: supabase.sql`like_count + 1`,
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
  
  /**
   * 创建评论
   */
  async createComment(commentData) {
    const { data, error } = await supabase
      .from('comments')
      .insert([{
        user_id: commentData.userId,
        post_id: commentData.postId,
        content: commentData.content
      }])
      .select()
      .single()
    
    if (error) throw error
    
    // 更新帖子的评论数
    await this.incrementCommentCount(commentData.postId)
    
    return data
  }
  
  /**
   * 获取帖子评论
   */
  async getPostComments(postId, page = 1, limit = 50) {
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    const { data, error, count } = await supabase
      .from('comments')
      .select(`
        *,
        profiles(username, avatar_url)
      `, { count: 'exact' })
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .range(from, to)
    
    if (error) throw error
    return { data: data || [], total: count || 0 }
  }
  
  /**
   * 点赞评论
   */
  async likeComment(commentId) {
    const { data, error } = await supabase
      .from('comments')
      .update({ 
        like_count: supabase.sql`like_count + 1`,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
  
  /**
   * 增加帖子评论数
   */
  async incrementCommentCount(postId) {
    const { error } = await supabase
      .from('community_posts')
      .update({ 
        comment_count: supabase.sql`comment_count + 1`,
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)
    
    if (error) throw error
  }
  
  /**
   * 搜索帖子
   */
  async searchPosts(keyword, page = 1, limit = 20) {
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    const { data, error, count } = await supabase
      .from('community_posts')
      .select(`
        *,
        profiles(username, avatar_url)
      `, { count: 'exact' })
      .or(`title.ilike.%${keyword}%,content.ilike.%${keyword}%`)
      .order('created_at', { ascending: false })
      .range(from, to)
    
    if (error) throw error
    return { data: data || [], total: count || 0 }
  }
  
  /**
   * 获取用户发布的帖子
   */
  async getUserPosts(userId, page = 1, limit = 20) {
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    const { data, error, count } = await supabase
      .from('community_posts')
      .select(`
        *,
        profiles(username, avatar_url)
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to)
    
    if (error) throw error
    return { data: data || [], total: count || 0 }
  }
  
  /**
   * 删除帖子
   */
  async deletePost(postId, userId) {
    const { error } = await supabase
      .from('community_posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', userId)
    
    if (error) throw error
    return { success: true }
  }
}

export default new CommunityService()