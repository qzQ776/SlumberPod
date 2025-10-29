import { supabase } from './supabaseClient.js';

/**
 * 微信登录认证服务
 */
class AuthService {
  
  /**
   * 微信登录
   * @param {string} code - 微信授权码
   * @param {Object} userInfo - 微信用户信息
   * @returns {Promise<Object>} 登录结果
   */
  async wechatLogin(code, userInfo) {
    try {
      // 1. 通过微信授权码获取用户信息
      const wechatUser = await this.getWechatUserInfo(code);
      
      // 2. 检查用户是否已存在
      const existingUser = await this.findUserByWechatId(wechatUser.openid);
      
      if (existingUser) {
        // 用户已存在，直接登录
        return await this.signInWithWechat(existingUser);
      } else {
        // 新用户，创建账户
        return await this.createWechatUser(wechatUser, userInfo);
      }
    } catch (error) {
      console.error('微信登录失败:', error);
      throw error;
    }
  }
  
  /**
   * 通过微信授权码获取用户信息
   * @param {string} code - 微信授权码
   * @returns {Promise<Object>} 微信用户信息
   */
  async getWechatUserInfo(code) {
    // 这里需要调用微信API获取用户信息
    // 实际实现需要配置微信开放平台
    const response = await fetch('/api/wechat/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code })
    });
    
    if (!response.ok) {
      throw new Error('获取微信用户信息失败');
    }
    
    return await response.json();
  }
  
  /**
   * 通过微信号查找用户
   * @param {string} wechatId - 微信号
   * @returns {Promise<Object|null>} 用户信息
   */
  async findUserByWechatId(wechatId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('wechat_id', wechatId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return data;
  }
  
  /**
   * 通过手机号查找用户
   * @param {string} phoneNumber - 手机号
   * @returns {Promise<Object|null>} 用户信息
   */
  async findUserByPhone(phoneNumber) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return data;
  }
  
  /**
   * 微信用户登录
   * @param {Object} user - 用户信息
   * @returns {Promise<Object>} 登录结果
   */
  async signInWithWechat(user) {
    // 使用Supabase的认证系统登录
    // 这里需要根据实际认证方式实现
    const { data, error } = await supabase.auth.signInWithPassword({
      email: `${user.wechat_id}@wechat.user`, // 使用微信ID作为邮箱前缀
      password: user.id // 使用用户ID作为密码（实际应用中应该更安全）
    });
    
    if (error) {
      throw error;
    }
    
    return {
      user: data.user,
      profile: user,
      isNewUser: false
    };
  }
  
  /**
   * 创建微信用户
   * @param {Object} wechatUser - 微信用户信息
   * @param {Object} userInfo - 用户补充信息
   * @returns {Promise<Object>} 创建结果
   */
  async createWechatUser(wechatUser, userInfo) {
    // 生成用户ID（外键约束已移除，可以独立生成）
    const userId = this.generateUUID();
    
    // 在profiles表中创建用户资料
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: userId,
        wechat_id: wechatUser.openid,
        phone_number: userInfo.phoneNumber,
        username: userInfo.nickname || `用户_${wechatUser.openid.slice(-6)}`,
        avatar_url: userInfo.avatarUrl || wechatUser.headimgurl,
        bio: userInfo.bio || '欢迎来到SlumberPod枕眠APP',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (profileError) {
      throw profileError;
    }
    
    // 创建虚拟用户对象（兼容原有接口）
    const virtualUser = {
      id: userId,
      email: `${wechatUser.openid}@wechat.user`,
      created_at: new Date().toISOString()
    };
    
    return {
      user: virtualUser,
      profile: profileData,
      isNewUser: true
    };
  }
  
  /**
   * 生成UUID
   * @returns {string} UUID字符串
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  /**
   * 绑定手机号
   * @param {string} userId - 用户ID
   * @param {string} phoneNumber - 手机号
   * @returns {Promise<Object>} 绑定结果
   */
  async bindPhoneNumber(userId, phoneNumber) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        phone_number: phoneNumber,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  }
  
  /**
   * 更新用户资料
   * @param {string} userId - 用户ID
   * @param {Object} profileData - 用户资料
   * @returns {Promise<Object>} 更新结果
   */
  async updateProfile(userId, profileData) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...profileData,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  }
  
  /**
   * 获取当前用户资料
   * @returns {Promise<Object>} 用户资料
   */
  async getCurrentUserProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('用户未登录');
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  }
  
  /**
   * 退出登录
   * @returns {Promise<void>}
   */
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }
  
  /**
   * 检查登录状态
   * @returns {Promise<boolean>} 是否已登录
   */
  async checkAuthStatus() {
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  }
}

export default new AuthService();