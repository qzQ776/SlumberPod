// 用户管理服务
import supabase from '../supabaseClient.js'

/**
 * 用户服务类 - 处理所有用户相关操作
 */
class UserService {
  
  /**
   * 获取用户资料
   * 功能：我的页面用户信息展示
   */
  async getUserProfile(userId = null) {
    try {
      const targetUserId = userId || supabase.auth.user()?.id
      if (!targetUserId) throw new Error('用户未登录')
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single()
      
      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('获取用户资料失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 更新用户资料
   * 功能：编辑个人信息
   */
  async updateUserProfile(updates) {
    try {
      const user = supabase.auth.user()
      if (!user) throw new Error('用户未登录')
      
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single()
      
      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('更新用户资料失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 创建用户资料（首次登录时）
   * 功能：用户注册后创建资料
   */
  async createUserProfile(username, avatarUrl = null, bio = '') {
    try {
      const user = supabase.auth.user()
      if (!user) throw new Error('用户未登录')
      
      // 检查用户名是否已存在
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single()
      
      if (existing) throw new Error('用户名已存在')
      
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          username,
          avatar_url: avatarUrl,
          bio
        })
        .select()
        .single()
      
      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('创建用户资料失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 上传用户头像
   * 功能：更换头像
   */
  async uploadAvatar(file) {
    try {
      const user = supabase.auth.user()
      if (!user) throw new Error('用户未登录')
      
      // 生成唯一文件名
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/avatar.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file)
      
      if (error) throw error
      
      // 获取公开URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)
      
      return { success: true, data: publicUrl }
    } catch (error) {
      console.error('上传头像失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 获取用户统计数据
   * 功能：我的页面统计信息
   */
  async getUserStatistics() {
    try {
      const user = supabase.auth.user()
      if (!user) throw new Error('用户未登录')
      
      // 并行获取各种统计数据
      const [
        sleepRecords,
        favorites,
        playHistory,
        userCreations,
        communityPosts,
        dreamAnalysis
      ] = await Promise.all([
        supabase.from('sleep_records').select('id').eq('user_id', user.id),
        supabase.from('user_favorites').select('id').eq('user_id', user.id),
        supabase.from('play_history').select('id').eq('user_id', user.id),
        supabase.from('user_creations').select('id').eq('user_id', user.id),
        supabase.from('community_posts').select('id').eq('user_id', user.id),
        supabase.from('dream_analysis').select('id').eq('user_id', user.id)
      ])
      
      const statistics = {
        sleepRecords: sleepRecords.data?.length || 0,
        favorites: favorites.data?.length || 0,
        playHistory: playHistory.data?.length || 0,
        userCreations: userCreations.data?.length || 0,
        communityPosts: communityPosts.data?.length || 0,
        dreamAnalysis: dreamAnalysis.data?.length || 0
      }
      
      return { success: true, data: statistics }
    } catch (error) {
      console.error('获取用户统计数据失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 获取用户最近活动
   * 功能：我的页面最近活动
   */
  async getUserRecentActivity(limit = 10) {
    try {
      const user = supabase.auth.user()
      if (!user) throw new Error('用户未登录')
      
      // 由于Supabase不支持跨表联合查询，这里分别获取各种活动
      const recentActivities = []
      
      // 获取最近睡眠记录
      const { data: sleepRecords } = await supabase
        .from('sleep_records')
        .select('id, start_time, duration')
        .eq('user_id', user.id)
        .order('start_time', { ascending: false })
        .limit(5)
      
      if (sleepRecords) {
        sleepRecords.forEach(record => {
          recentActivities.push({
            type: 'sleep',
            time: record.start_time,
            description: `睡眠 ${Math.round(record.duration / 60)}小时`,
            icon: 'bed'
          })
        })
      }
      
      // 获取最近播放历史
      const { data: playHistory } = await supabase
        .from('play_history')
        .select('id, created_at, audios(title)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (playHistory) {
        playHistory.forEach(record => {
          recentActivities.push({
            type: 'play',
            time: record.created_at,
            description: `播放了 ${record.audios?.title || '音频'}`,
            icon: 'play'
          })
        })
      }
      
      // 获取最近社区帖子
      const { data: communityPosts } = await supabase
        .from('community_posts')
        .select('id, created_at, title')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (communityPosts) {
        communityPosts.forEach(post => {
          recentActivities.push({
            type: 'post',
            time: post.created_at,
            description: `发布了帖子：${post.title}`,
            icon: 'edit'
          })
        })
      }
      
      // 按时间排序并限制数量
      recentActivities.sort((a, b) => new Date(b.time) - new Date(a.time))
      
      return { success: true, data: recentActivities.slice(0, limit) }
    } catch (error) {
      console.error('获取用户最近活动失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 检查用户名是否可用
   * 功能：注册时用户名验证
   */
  async checkUsernameAvailability(username) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single()
      
      if (error && error.code === 'PGRST116') {
        // 未找到记录，用户名可用
        return { success: true, available: true }
      } else if (error) {
        throw error
      }
      
      // 找到记录，用户名不可用
      return { success: true, available: false }
    } catch (error) {
      console.error('检查用户名可用性失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 获取用户成就
   * 功能：我的页面成就展示
   */
  async getUserAchievements() {
    try {
      const user = supabase.auth.user()
      if (!user) throw new Error('用户未登录')
      
      const statistics = await this.getUserStatistics()
      if (!statistics.success) throw new Error(statistics.error)
      
      const achievements = []
      const stats = statistics.data
      
      // 定义成就条件
      const achievementConditions = [
        { id: 'first_sleep', name: '初次入眠', condition: stats.sleepRecords >= 1, icon: '🌙' },
        { id: 'sleep_expert', name: '睡眠专家', condition: stats.sleepRecords >= 10, icon: '💤' },
        { id: 'music_lover', name: '音乐爱好者', condition: stats.playHistory >= 5, icon: '🎵' },
        { id: 'collector', name: '收藏家', condition: stats.favorites >= 3, icon: '⭐' },
        { id: 'creator', name: '创作者', condition: stats.userCreations >= 1, icon: '🎨' },
        { id: 'community_contributor', name: '社区贡献者', condition: stats.communityPosts >= 1, icon: '👥' },
        { id: 'dream_explorer', name: '梦境探索者', condition: stats.dreamAnalysis >= 1, icon: '🔮' },
        { id: 'dedicated_sleeper', name: '专注睡眠者', condition: stats.sleepRecords >= 30, icon: '🏆' }
      ]
      
      achievementConditions.forEach(achievement => {
        if (achievement.condition) {
          achievements.push({
            id: achievement.id,
            name: achievement.name,
            icon: achievement.icon,
            unlocked: true,
            unlockedAt: new Date().toISOString()
          })
        } else {
          achievements.push({
            id: achievement.id,
            name: achievement.name,
            icon: achievement.icon,
            unlocked: false,
            progress: this.calculateAchievementProgress(achievement.id, stats)
          })
        }
      })
      
      return { success: true, data: achievements }
    } catch (error) {
      console.error('获取用户成就失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 计算成就进度
   */
  calculateAchievementProgress(achievementId, stats) {
    const progressMap = {
      'sleep_expert': Math.min(stats.sleepRecords / 10 * 100, 100),
      'music_lover': Math.min(stats.playHistory / 5 * 100, 100),
      'collector': Math.min(stats.favorites / 3 * 100, 100),
      'dedicated_sleeper': Math.min(stats.sleepRecords / 30 * 100, 100)
    }
    
    return progressMap[achievementId] || 0
  }

  /**
   * 删除用户账户
   * 功能：账户注销
   */
  async deleteUserAccount() {
    try {
      const user = supabase.auth.user()
      if (!user) throw new Error('用户未登录')
      
      // 注意：实际项目中需要谨慎处理账户删除
      // 这里只是示例，实际应该提供更安全的删除流程
      
      const { error } = await supabase.auth.api.deleteUser(
        user.id,
        supabase.auth.session()?.access_token
      )
      
      if (error) throw error
      
      return { success: true }
    } catch (error) {
      console.error('删除用户账户失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 获取用户设置
   * 功能：用户个性化设置
   */
  async getUserSettings() {
    try {
      const user = supabase.auth.user()
      if (!user) throw new Error('用户未登录')
      
      // 这里可以扩展为专门的用户设置表
      // 目前返回默认设置
      const defaultSettings = {
        notifications: {
          alarm: true,
          community: true,
          system: true
        },
        playback: {
          autoPlay: false,
          quality: 'standard',
          backgroundPlay: true
        },
        privacy: {
          profilePublic: true,
          sleepRecordsPrivate: false
        }
      }
      
      return { success: true, data: defaultSettings }
    } catch (error) {
      console.error('获取用户设置失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 更新用户设置
   * 功能：保存用户设置
   */
  async updateUserSettings(settings) {
    try {
      const user = supabase.auth.user()
      if (!user) throw new Error('用户未登录')
      
      // 这里可以扩展为专门的用户设置表
      // 目前只是示例
      console.log('更新用户设置:', settings)
      
      return { success: true }
    } catch (error) {
      console.error('更新用户设置失败:', error)
      return { success: false, error: error.message }
    }
  }
}

export default new UserService()