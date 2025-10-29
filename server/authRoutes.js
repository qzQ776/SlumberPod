const express = require('express');
const router = express.Router();
const supabase = require('./supabaseClient');

// 验证 Supabase 连接
console.log('Supabase 客户端已加载:', !!supabase);

// 用户注册
router.post('/register', async (req, res) => {
  try {
    const { email, phoneNumber, password, username } = req.body;
    
    // 1. 验证输入格式
    if ((!email && !phoneNumber) || !password || !username) {
      return res.status(400).json({
        success: false,
        message: '邮箱或手机号、密码和用户名不能为空'
      });
    }

    // 邮箱或手机号格式验证
    let loginIdentifier = '';
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: '邮箱格式无效'
        });
      }
      loginIdentifier = email;
    } else if (phoneNumber) {
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(phoneNumber)) {
        return res.status(400).json({
          success: false,
          message: '手机号格式无效'
        });
      }
      loginIdentifier = phoneNumber;
    }

    // 密码强度检查（至少8位，包含大小写字母和数字）
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: '密码必须包含大小写字母和数字，且长度至少为8位'
      });
    }
    
    // 2. 检查用户是否已存在
    let existingUser = null;
    let existingMessage = '';
    
    if (email) {
      // 检查邮箱是否已注册
      const { data: emailUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();
      existingUser = emailUser;
      existingMessage = '邮箱已注册';
    } else if (phoneNumber) {
      // 检查手机号是否已注册
      const { data: phoneUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone_number', phoneNumber)
        .single();
      existingUser = phoneUser;
      existingMessage = '手机号已注册';
    }
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingMessage
      });
    }
    
    // 3. 创建用户 - 简化版本（外键约束已移除）
    console.log('创建用户资料（外键约束已移除）...');
    
    // 生成用户ID
    const userId = generateUUID();
    
    // 创建用户资料
    const profileData = {
      id: userId,
      username,
      avatar_url: '',
      email: email || null, // 使用null而不是空字符串
      phone_number: phoneNumber || null, // 使用null而不是空字符串
      password: password, // 注意：实际项目中应该使用哈希密码
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('正在创建用户资料:', profileData);
    
    // 插入用户资料
    const { data: profileResult, error: profileError } = await supabase
      .from('profiles')
      .insert([profileData])
      .select()
      .single();
    
    if (profileError) {
      console.error('创建用户资料失败:', profileError);
      
      // 如果是唯一性约束错误，可能是并发注册导致的
      if (profileError.message.includes('duplicate key') || profileError.message.includes('unique constraint')) {
        return res.status(400).json({
          success: false,
          message: '用户已存在，请勿重复注册'
        });
      }
      
      throw profileError;
    }
    
    console.log('用户资料创建成功:', profileResult);
    
    // 生成简单的token（实际项目中应该使用JWT等安全方案）
    const token = Buffer.from(`${profileResult.id}:${Date.now()}`).toString('base64');
    
    res.json({
      success: true,
      token: token,
      user: {
        id: profileResult.id,
        email: profileResult.email || '',
        phoneNumber: profileResult.phone_number || '',
        username: profileResult.username
      }
    });
    
    // 生成UUID函数
    function generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({
      success: false,
      message: '注册失败',
      error: error.message
    });
  }
});

// 用户登录
router.post('/login', async (req, res) => {
  try {
    const { email, phoneNumber, password } = req.body;
    
    // 1. 验证登录标识和密码
    if ((!email && !phoneNumber) || !password) {
      return res.status(400).json({
        success: false,
        message: '邮箱或手机号和密码不能为空'
      });
    }

    // 邮箱或手机号格式验证
    let loginIdentifier = '';
    let loginField = '';
    
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: '邮箱格式无效'
        });
      }
      loginIdentifier = email;
      loginField = 'email';
    } else if (phoneNumber) {
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(phoneNumber)) {
        return res.status(400).json({
          success: false,
          message: '手机号格式无效'
        });
      }
      loginIdentifier = phoneNumber;
      loginField = 'phone_number';
    }
    
    console.log('登录查询信息:', { loginIdentifier, loginField });
    
    // 2. 查询用户资料
    const { data: profileData, error: queryError } = await supabase
      .from('profiles')
      .select('*')
      .eq(loginField, loginIdentifier)
      .single();
    
    if (queryError || !profileData) {
      return res.status(400).json({
        success: false,
        message: loginField === 'email' ? '邮箱未注册' : '手机号未注册'
      });
    }
    
    // 3. 验证密码
    if (profileData.password !== password) {
      return res.status(400).json({
        success: false,
        message: '密码错误'
      });
    }
    
    console.log('登录成功，用户信息:', profileData);
    
    // 4. 生成简单的token（实际项目中应该使用JWT等安全方案）
    const token = Buffer.from(`${profileData.id}:${Date.now()}`).toString('base64');
    
    res.json({
      success: true,
      token: token,
      user: {
        id: profileData.id,
        email: profileData.email || '',
        phoneNumber: profileData.phone_number || '',
        username: profileData.username
      }
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({
      success: false,
      message: '登录失败',
      error: error.message
    });
  }
});

// 获取当前用户信息
router.get('/me', async (req, res) => {
  try {
    // 从请求头获取token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '未授权访问'
      });
    }
    
    const token = authHeader.substring(7);
    
    // 解析token获取用户ID（简化版本，实际应该使用JWT验证）
    const tokenData = Buffer.from(token, 'base64').toString('utf-8');
    const [userId, timestamp] = tokenData.split(':');
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '无效的token'
      });
    }
    
    // 查询用户信息
    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 获取用户统计数据
    const statistics = await getUserStatistics(userId);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email || '',
        phoneNumber: user.phone_number || '',
        avatar: user.avatar_url || '',
        bio: user.bio || '',
        createdAt: user.created_at,
        statistics
      }
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败',
      error: error.message
    });
  }
});

// 获取指定用户信息
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 验证ID是否为有效的UUID格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: '用户ID格式无效'
      });
    }
    
    // 查询用户信息
    const { data: user, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, bio, created_at')
      .eq('id', id)
      .single();
    
    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 获取公开的统计数据
    const statistics = await getUserPublicStatistics(id);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar_url || '',
        bio: user.bio || '',
        createdAt: user.created_at,
        statistics
      }
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败',
      error: error.message
    });
  }
});

// 获取用户统计数据（私有）
async function getUserStatistics(userId) {
  try {
    // 并行获取各种统计数据
    const [
      sleepRecords,
      favorites,
      playHistory,
      userCreations,
      communityPosts,
      dreamAnalysis
    ] = await Promise.all([
      supabase.from('sleep_records').select('id').eq('user_id', userId),
      supabase.from('user_favorites').select('id').eq('user_id', userId),
      supabase.from('play_history').select('id').eq('user_id', userId),
      supabase.from('user_creations').select('id').eq('user_id', userId),
      supabase.from('community_posts').select('id').eq('user_id', userId),
      supabase.from('dream_analysis').select('id').eq('user_id', userId)
    ]);
    
    return {
      sleepRecords: sleepRecords.data?.length || 0,
      favorites: favorites.data?.length || 0,
      playHistory: playHistory.data?.length || 0,
      userCreations: userCreations.data?.length || 0,
      communityPosts: communityPosts.data?.length || 0,
      dreamAnalysis: dreamAnalysis.data?.length || 0
    };
  } catch (error) {
    console.error('获取用户统计数据失败:', error);
    return {};
  }
}

// 获取用户公开统计数据
async function getUserPublicStatistics(userId) {
  try {
    // 只获取公开的统计数据
    const [
      userCreations,
      communityPosts
    ] = await Promise.all([
      supabase.from('user_creations').select('id').eq('user_id', userId).eq('is_public', true),
      supabase.from('community_posts').select('id').eq('user_id', userId)
    ]);
    
    return {
      userCreations: userCreations.data?.length || 0,
      communityPosts: communityPosts.data?.length || 0
    };
  } catch (error) {
    console.error('获取用户公开统计数据失败:', error);
    return {};
  }
}

module.exports = router;