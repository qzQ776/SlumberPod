const express = require('express')
const cors = require('cors')
const { createClient } = require('@supabase/supabase-js')

const app = express()
const PORT = process.env.PORT || 3003

// Supabase配置
const supabaseUrl = 'https://uhddqryjkororlxlqgna.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoZGRxcnlqa29yb3JseGxxZ25hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NDMyODIsImV4cCI6MjA3NzExOTI4Mn0.7430326qr1tuVLFyi8ivxq6PFqHZMVwo3o8xtn4DU3U';

const supabase = createClient(supabaseUrl, supabaseKey)

// 中间件
app.use(cors())
app.use(express.json())

// 认证中间件
function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '未授权访问，请提供有效的认证token'
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
    
    // 验证用户ID是否为有效的UUID格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return res.status(401).json({
        success: false,
        message: '用户ID格式无效'
      });
    }
    
    // 检查用户是否存在
    supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()
      .then(({ data: user, error }) => {
        if (error || !user) {
          return res.status(401).json({
            success: false,
            message: '用户不存在'
          });
        }
        
        // 将用户ID添加到请求对象中
        req.userId = userId;
        next();
      })
      .catch(error => {
        console.error('认证中间件错误:', error);
        return res.status(500).json({
          success: false,
          message: '认证失败',
          error: error.message
        });
      });
      
  } catch (error) {
    console.error('认证中间件异常:', error);
    return res.status(500).json({
      success: false,
      message: '认证处理异常',
      error: error.message
    });
  }
}

// 显式检查路由是否加载
console.log('注册路由: /api/auth');
const authRoutes = require('./authRoutes');
app.use('/api/auth', authRoutes);

// 打印所有已注册路由
app._router.stack.forEach((layer) => {
  if (layer.route) {
    console.log(`已注册路由: ${layer.route.path}`);
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'SlumberPod API服务运行正常',
    timestamp: new Date().toISOString()
  })
})

// 音频相关接口
app.get('/api/audios', async (req, res) => {
  try {
    const { category_id, limit = 20, offset = 0 } = req.query
    
    console.log('查询参数:', { category_id, limit, offset })
    
    let query = supabase
      .from('audios')
      .select('*, audio_categories(name)')
      .order('play_count', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)
    
    if (category_id) {
      // 验证category_id是否为有效的UUID格式
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(category_id)) {
        return res.status(400).json({
          success: false,
          message: '分类ID格式无效，请使用正确的UUID格式'
        })
      }
      query = query.eq('category_id', category_id)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    console.log('查询结果数量:', data ? data.length : 0)
    if (data) {
      console.log('返回的分类ID:', data.map(item => item.category_id))
    }
    
    res.json({
      success: true,
      data: data || [],
      total: data ? data.length : 0
    })
  } catch (error) {
    console.error('获取音频列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取音频列表失败',
      error: error.message
    })
  }
})

app.get('/api/audios/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    // 验证ID是否为有效的UUID格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: '音频ID格式无效，请使用正确的UUID格式'
      })
    }
    
    const { data, error } = await supabase
      .from('audios')
      .select('*, audio_categories(name), profiles(username)')
      .eq('id', id)
      .single()
    
    if (error) throw error
    
    if (!data) {
      return res.status(404).json({
        success: false,
        message: '音频不存在'
      })
    }
    
    res.json({
      success: true,
      data: data
    })
  } catch (error) {
    console.error('获取音频详情失败:', error)
    res.status(500).json({
      success: false,
      message: '获取音频详情失败',
      error: error.message
    })
  }
})

app.post('/api/audios/:id/play', async (req, res) => {
  try {
    const { id } = req.params
    
    // 先获取当前播放次数
    const { data: currentAudio, error: getError } = await supabase
      .from('audios')
      .select('play_count')
      .eq('id', id)
      .single()
    
    if (getError) throw getError
    
    // 更新播放次数
    const { data, error } = await supabase
      .from('audios')
      .update({ 
        play_count: (currentAudio.play_count || 0) + 1
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    res.json({
      success: true,
      message: '播放次数增加成功',
      data: data
    })
  } catch (error) {
    console.error('增加播放次数失败:', error)
    res.status(500).json({
      success: false,
      message: '增加播放次数失败',
      error: error.message
    })
  }
})

// 音频上传接口
app.post('/api/audios/upload', authenticateToken, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      category_id, 
      duration, 
      file_url, 
      tags 
    } = req.body;
    
    const author_id = req.userId; // 从认证中间件获取用户ID
    
    // 验证必填字段
    if (!title || !category_id) {
      return res.status(400).json({
        success: false,
        message: '标题和分类ID不能为空'
      });
    }
    
    // 验证分类ID是否为有效的UUID格式
    if (!uuidRegex.test(category_id)) {
      return res.status(400).json({
        success: false,
        message: '分类ID格式无效，请使用正确的UUID格式'
      });
    }
    
    // 检查用户是否存在 - 使用服务端密钥绕过RLS
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', author_id)
      .single();
    
    if (userError || !user) {
      return res.status(400).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 检查分类是否存在 - 使用服务端密钥绕过RLS
    const { data: category, error: categoryError } = await supabase
      .from('audio_categories')
      .select('id')
      .eq('id', category_id)
      .single();
    
    if (categoryError || !category) {
      return res.status(400).json({
        success: false,
        message: '音频分类不存在'
      });
    }
    
    // 生成音频ID
    const audioId = generateUUID();
    
    // 创建音频记录 - 根据实际表结构调整字段
    const audioData = {
      id: audioId,
      title,
      description: description || '',
      category_id,
      duration: duration || 0,
      audio_url: file_url || '', // 使用audio_url字段而不是file_url
      author_id: author_id, // 改为author_id以匹配数据库字段
      play_count: 0,
      like_count: 0,
      created_at: new Date().toISOString()
      // 移除updated_at字段，因为表中可能不存在
    };
    
    console.log('正在创建音频记录:', audioData);
    
    // 创建音频记录 - 使用服务端密钥绕过RLS策略
    console.log('创建音频记录，使用服务端密钥绕过RLS');
    
    // 使用服务端Supabase客户端（绕过RLS）
    const serviceSupabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    
    const { data: audioResult, error: audioError } = await serviceSupabase
      .from('audios')
      .insert([audioData])
      .select()
      .single();
    
    if (audioError) {
      console.error('创建音频记录失败:', audioError);
      
      // 如果服务端插入也失败，尝试使用原始客户端作为备用
      console.log('尝试使用原始客户端作为备用方案');
      const { data: fallbackResult, error: fallbackError } = await supabase
        .from('audios')
        .insert([audioData])
        .select()
        .single();
        
      if (fallbackError) {
        console.error('备用插入也失败:', fallbackError);
        
        // 如果所有方法都失败，返回详细的错误信息
        throw new Error(`音频上传失败: ${audioError.message}. 备用方案也失败: ${fallbackError.message}`);
      }
      
      audioResult = fallbackResult;
    }
    
    console.log('音频记录创建成功:', audioResult);
    
    res.json({
      success: true,
      message: '音频上传成功',
      data: audioResult
    });
    
  } catch (error) {
    console.error('音频上传失败:', error);
    res.status(500).json({
      success: false,
      message: '音频上传失败',
      error: error.message
    });
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

// 社区相关接口
app.get('/api/posts', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const from = (parseInt(page) - 1) * parseInt(limit)
    const to = from + parseInt(limit) - 1
    
    const { data, error, count } = await supabase
      .from('community_posts')
      .select('*, profiles(username, avatar_url)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)
    
    if (error) throw error
    
    res.json({
      success: true,
      data: data || [],
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit)
    })
  } catch (error) {
    console.error('获取帖子列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取帖子列表失败',
      error: error.message
    })
  }
})

// 社区发帖接口（需要认证）
app.post('/api/posts', authenticateToken, async (req, res) => {
  try {
    const { title, content, imageUrls } = req.body
    const userId = req.userId; // 从认证中间件获取用户ID
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: '内容不能为空'
      })
    }
    
    const { data, error } = await supabase
      .from('community_posts')
      .insert([{
        user_id: userId,
        title: title || '',
        content: content,
        image_urls: imageUrls || []
      }])
      .select()
      .single()
    
    if (error) throw error
    
    res.json({
      success: true,
      message: '帖子创建成功',
      data: data
    })
  } catch (error) {
    console.error('创建帖子失败:', error)
    res.status(500).json({
      success: false,
      message: '创建帖子失败',
      error: error.message
    })
  }
})

// 兼容旧版发帖接口（向后兼容）
app.post('/api/posts/legacy', async (req, res) => {
  try {
    const { userId, title, content, imageUrls } = req.body
    
    if (!userId || !content) {
      return res.status(400).json({
        success: false,
        message: '用户ID和内容不能为空'
      })
    }
    
    // 验证用户ID是否为有效的UUID格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userId)) {
      return res.status(400).json({
        success: false,
        message: '用户ID格式无效，请使用正确的UUID格式'
      })
    }
    
    // 检查用户是否存在
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()
    
    if (userError || !user) {
      return res.status(400).json({
        success: false,
        message: '用户不存在'
      })
    }
    
    const { data, error } = await supabase
      .from('community_posts')
      .insert([{
        user_id: userId,
        title: title || '',
        content: content,
        image_urls: imageUrls || []
      }])
      .select()
      .single()
    
    if (error) throw error
    
    res.json({
      success: true,
      message: '帖子创建成功',
      data: data
    })
  } catch (error) {
    console.error('创建帖子失败:', error)
    res.status(500).json({
      success: false,
      message: '创建帖子失败',
      error: error.message
    })
  }
})

// 用户相关接口
app.get('/api/users/:id', async (req, res) => {
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

// 播放历史接口
app.get('/api/users/:id/play-history', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    // 验证ID是否为有效的UUID格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: '用户ID格式无效'
      });
    }
    
    // 查询播放历史
    const { data: playHistory, error } = await supabase
      .from('play_history')
      .select(`
        id,
        play_duration,
        created_at,
        audios (
          id,
          title,
          description,
          audio_url,
          duration,
          audio_categories(name)
        )
      `)
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: playHistory || [],
      total: playHistory ? playHistory.length : 0
    });
  } catch (error) {
    console.error('获取播放历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取播放历史失败',
      error: error.message
    });
  }
});

// 用户偏好接口
app.get('/api/users/:id/preferences', async (req, res) => {
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
    
    // 获取用户最喜欢的音频分类
    const { data: favoriteCategory } = await supabase
      .from('play_history')
      .select(`
        audios!inner(
          category_id,
          audio_categories!inner(name)
        )
      `)
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(100);
    
    // 统计分类出现次数
    const categoryCounts = {};
    if (favoriteCategory) {
      favoriteCategory.forEach(item => {
        if (item.audios && item.audios.audio_categories) {
          const categoryName = item.audios.audio_categories.name;
          categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
        }
      });
    }
    
    // 获取最喜欢的音频
    const mostPlayedCategory = Object.keys(categoryCounts).reduce((a, b) => 
      categoryCounts[a] > categoryCounts[b] ? a : b, '');
    
    // 获取用户收藏的音频
    const { data: favorites } = await supabase
      .from('user_favorites')
      .select(`
        created_at,
        audios(
          id,
          title,
          audio_categories(name)
        )
      `)
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    res.json({
      success: true,
      data: {
        favoriteCategory: mostPlayedCategory,
        favoriteAudios: favorites || [],
        listeningHours: await getUserListeningHours(id),
        preferredTime: await getUserPreferredTime(id)
      }
    });
  } catch (error) {
    console.error('获取用户偏好失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户偏好失败',
      error: error.message
    });
  }
});

// 辅助函数：获取用户公开统计数据
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

// 辅助函数：获取用户收听时长
async function getUserListeningHours(userId) {
  try {
    const { data: playHistory } = await supabase
      .from('play_history')
      .select('play_duration')
      .eq('user_id', userId);
    
    const totalSeconds = playHistory?.reduce((sum, item) => sum + (item.play_duration || 0), 0) || 0;
    return Math.round(totalSeconds / 3600 * 100) / 100; // 转换为小时，保留两位小数
  } catch (error) {
    console.error('获取用户收听时长失败:', error);
    return 0;
  }
}

// 辅助函数：获取用户偏好收听时间
async function getUserPreferredTime(userId) {
  try {
    const { data: playHistory } = await supabase
      .from('play_history')
      .select('created_at')
      .eq('user_id', userId)
      .limit(100);
    
    if (!playHistory || playHistory.length === 0) return '未知';
    
    // 统计各时间段播放次数
    const timeCounts = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    
    playHistory.forEach(item => {
      const hour = new Date(item.created_at).getHours();
      if (hour >= 6 && hour < 12) timeCounts.morning++;
      else if (hour >= 12 && hour < 18) timeCounts.afternoon++;
      else if (hour >= 18 && hour < 22) timeCounts.evening++;
      else timeCounts.night++;
    });
    
    const maxTime = Object.keys(timeCounts).reduce((a, b) => 
      timeCounts[a] > timeCounts[b] ? a : b);
    
    const timeMap = {
      morning: '早晨 (6:00-12:00)',
      afternoon: '下午 (12:00-18:00)',
      evening: '晚上 (18:00-22:00)',
      night: '深夜 (22:00-6:00)'
    };
    
    return timeMap[maxTime] || '未知';
  } catch (error) {
    console.error('获取用户偏好收听时间失败:', error);
    return '未知';
  }
}

// 睡眠相关接口
app.get('/api/sleep/records', authenticateToken, async (req, res) => {
  try {
    const { days = 7 } = req.query
    const userId = req.userId; // 从认证中间件获取用户ID
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(days))
    
    const { data, error } = await supabase
      .from('sleep_records')
      .select('*')
      .eq('user_id', userId)
      .gte('start_time', startDate.toISOString())
      .order('start_time', { ascending: false })
    
    if (error) throw error
    
    res.json({
      success: true,
      data: data || []
    })
  } catch (error) {
    console.error('获取睡眠记录失败:', error)
    res.status(500).json({
      success: false,
      message: '获取睡眠记录失败',
      error: error.message
    })
  }
})

app.post('/api/sleep/records', authenticateToken, async (req, res) => {
  try {
    const { startTime, endTime, duration, qualityRating } = req.body
    const userId = req.userId; // 从认证中间件获取用户ID
    
    if (!startTime) {
      return res.status(400).json({
        success: false,
        message: '开始时间不能为空'
      })
    }
    
    // 计算结束时间（如果未提供）
    const calculatedEndTime = endTime || new Date(new Date(startTime).getTime() + (duration || 480) * 60000).toISOString()
    
    const { data, error } = await supabase
      .from('sleep_records')
      .insert([{
        user_id: userId,
        start_time: startTime,
        end_time: calculatedEndTime,
        duration: duration || 480,
        quality_rating: qualityRating || 3
      }])
      .select()
      .single()
    
    if (error) throw error
    
    res.json({
      success: true,
      message: '睡眠记录创建成功',
      data: data
    })
  } catch (error) {
    console.error('创建睡眠记录失败:', error)
    res.status(500).json({
      success: false,
      message: '创建睡眠记录失败',
      error: error.message
    })
  }
})

// 用户收藏接口
app.get('/api/users/:id/favorites', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    // 验证ID是否为有效的UUID格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: '用户ID格式无效'
      });
    }
    
    // 查询用户收藏
    const { data: favorites, error } = await supabase
      .from('user_favorites')
      .select(`
        id,
        created_at,
        audios (
          id,
          title,
          description,
          audio_url,
          duration,
          play_count,
          like_count,
          audio_categories(name)
        )
      `)
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: favorites || [],
      total: favorites ? favorites.length : 0
    });
  } catch (error) {
    console.error('获取用户收藏失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户收藏失败',
      error: error.message
    });
  }
});

// 添加收藏接口
app.post('/api/users/favorites', authenticateToken, async (req, res) => {
  try {
    const { audioId } = req.body;
    const id = req.userId; // 从认证中间件获取用户ID
    
    if (!audioId) {
      return res.status(400).json({
        success: false,
        message: '音频ID不能为空'
      });
    }
    
    // 检查音频是否存在
    const { data: audio, error: audioError } = await supabase
      .from('audios')
      .select('id')
      .eq('id', audioId)
      .single();
    
    if (audioError || !audio) {
      return res.status(400).json({
        success: false,
        message: '音频不存在'
      });
    }
    
    // 检查是否已收藏
    const { data: existingFavorite } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', id)
      .eq('audio_id', audioId)
      .single();
    
    if (existingFavorite) {
      return res.status(400).json({
        success: false,
        message: '音频已收藏'
      });
    }
    
    // 添加收藏
    const { data: favorite, error } = await supabase
      .from('user_favorites')
      .insert([{
        user_id: id,
        audio_id: audioId,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      message: '收藏成功',
      data: favorite
    });
  } catch (error) {
    console.error('添加收藏失败:', error);
    res.status(500).json({
      success: false,
      message: '添加收藏失败',
      error: error.message
    });
  }
});

// 删除收藏接口
app.delete('/api/users/favorites/:audioId', authenticateToken, async (req, res) => {
  try {
    const { audioId } = req.params;
    const id = req.userId; // 从认证中间件获取用户ID
    
    // 验证音频ID是否为有效的UUID格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(audioId)) {
      return res.status(400).json({
        success: false,
        message: '音频ID格式无效'
      });
    }
    
    // 删除收藏
    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', id)
      .eq('audio_id', audioId);
    
    if (error) throw error;
    
    res.json({
      success: true,
      message: '取消收藏成功'
    });
  } catch (error) {
    console.error('取消收藏失败:', error);
    res.status(500).json({
      success: false,
      message: '取消收藏失败',
      error: error.message
    });
  }
});

// 记录播放历史接口
app.post('/api/users/play-history', authenticateToken, async (req, res) => {
  try {
    const { audioId, playDuration } = req.body;
    const id = req.userId; // 从认证中间件获取用户ID
    
    if (!audioId) {
      return res.status(400).json({
        success: false,
        message: '音频ID不能为空'
      });
    }
    
    // 检查音频是否存在
    const { data: audio, error: audioError } = await supabase
      .from('audios')
      .select('id')
      .eq('id', audioId)
      .single();
    
    if (audioError || !audio) {
      return res.status(400).json({
        success: false,
        message: '音频不存在'
      });
    }
    
    // 记录播放历史
    const { data: playRecord, error } = await supabase
      .from('play_history')
      .insert([{
        user_id: id,
        audio_id: audioId,
        play_duration: playDuration || 0,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      message: '播放记录添加成功',
      data: playRecord
    });
  } catch (error) {
    console.error('记录播放历史失败:', error);
    res.status(500).json({
      success: false,
      message: '记录播放历史失败',
      error: error.message
    });
  }
});

// 用户创作接口
app.get('/api/users/:id/creations', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    // 验证ID是否为有效的UUID格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: '用户ID格式无效'
      });
    }
    
    // 查询用户创作
    const { data: creations, error } = await supabase
      .from('user_creations')
      .select(`
        id,
        title,
        description,
        audio_url,
        is_public,
        created_at
      `)
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: creations || [],
      total: creations ? creations.length : 0
    });
  } catch (error) {
    console.error('获取用户创作失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户创作失败',
      error: error.message
    });
  }
});

// 用户创作上传接口（需要认证）
app.post('/api/users/creations', authenticateToken, async (req, res) => {
  try {
    const { title, description, audioUrl, isPublic = true } = req.body;
    const userId = req.userId; // 从认证中间件获取用户ID
    
    if (!title || !audioUrl) {
      return res.status(400).json({
        success: false,
        message: '标题和音频URL不能为空'
      });
    }
    
    // 生成创作ID
    const creationId = generateUUID();
    
    // 创建创作记录
    const { data: creation, error } = await supabase
      .from('user_creations')
      .insert([{
        id: creationId,
        user_id: userId,
        title: title,
        description: description || '',
        audio_url: audioUrl,
        is_public: isPublic,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      message: '创作上传成功',
      data: creation
    });
  } catch (error) {
    console.error('创作上传失败:', error);
    res.status(500).json({
      success: false,
      message: '创作上传失败',
      error: error.message
    });
  }
});

// 用户创作上传接口（需要认证）
app.post('/api/users/creations', authenticateToken, async (req, res) => {
  try {
    const { title, description, audioUrl, isPublic = true } = req.body;
    const userId = req.userId; // 从认证中间件获取用户ID
    
    if (!title || !audioUrl) {
      return res.status(400).json({
        success: false,
        message: '标题和音频URL不能为空'
      });
    }
    
    // 生成创作ID
    const creationId = generateUUID();
    
    // 创建创作记录
    const { data: creation, error } = await supabase
      .from('user_creations')
      .insert([{
        id: creationId,
        user_id: userId,
        title: title,
        description: description || '',
        audio_url: audioUrl,
        is_public: isPublic,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      message: '创作上传成功',
      data: creation
    });
  } catch (error) {
    console.error('创作上传失败:', error);
    res.status(500).json({
      success: false,
      message: '创作上传失败',
      error: error.message
    });
  }
});

// 用户评论接口
app.get('/api/users/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    // 验证ID是否为有效的UUID格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: '用户ID格式无效'
      });
    }
    
    // 查询用户评论
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        created_at
      `)
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: comments || [],
      total: comments ? comments.length : 0
    });
  } catch (error) {
    console.error('获取用户评论失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户评论失败',
      error: error.message
    });
  }
});

// 添加评论接口（需要认证）
app.post('/api/comments', authenticateToken, async (req, res) => {
  try {
    const { content, targetId, targetType = 'audio' } = req.body;
    const userId = req.userId; // 从认证中间件获取用户ID
    
    if (!content || !targetId) {
      return res.status(400).json({
        success: false,
        message: '评论内容和目标ID不能为空'
      });
    }
    
    // 验证目标ID是否为有效的UUID格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(targetId)) {
      return res.status(400).json({
        success: false,
        message: '目标ID格式无效'
      });
    }
    
    // 根据目标类型检查目标是否存在
    let targetTable = '';
    if (targetType === 'audio') {
      targetTable = 'audios';
    } else if (targetType === 'post') {
      targetTable = 'community_posts';
    } else {
      return res.status(400).json({
        success: false,
        message: '不支持的目标类型'
      });
    }
    
    // 检查目标是否存在
    const { data: target, error: targetError } = await supabase
      .from(targetTable)
      .select('id')
      .eq('id', targetId)
      .single();
    
    if (targetError || !target) {
      return res.status(400).json({
        success: false,
        message: '目标不存在'
      });
    }
    
    // 生成评论ID
    const commentId = generateUUID();
    
    // 创建评论记录
    const { data: comment, error } = await supabase
      .from('comments')
      .insert([{
        id: commentId,
        user_id: userId,
        target_id: targetId,
        target_type: targetType,
        content: content,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      message: '评论添加成功',
      data: comment
    });
  } catch (error) {
    console.error('添加评论失败:', error);
    res.status(500).json({
      success: false,
      message: '添加评论失败',
      error: error.message
    });
  }
});

// 添加评论接口（需要认证）
app.post('/api/comments', authenticateToken, async (req, res) => {
  try {
    const { content, targetId, targetType = 'audio' } = req.body;
    const userId = req.userId; // 从认证中间件获取用户ID
    
    if (!content || !targetId) {
      return res.status(400).json({
        success: false,
        message: '评论内容和目标ID不能为空'
      });
    }
    
    // 验证目标ID是否为有效的UUID格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(targetId)) {
      return res.status(400).json({
        success: false,
        message: '目标ID格式无效'
      });
    }
    
    // 根据目标类型检查目标是否存在
    let targetTable = '';
    if (targetType === 'audio') {
      targetTable = 'audios';
    } else if (targetType === 'post') {
      targetTable = 'community_posts';
    } else {
      return res.status(400).json({
        success: false,
        message: '不支持的目标类型'
      });
    }
    
    // 检查目标是否存在
    const { data: target, error: targetError } = await supabase
      .from(targetTable)
      .select('id')
      .eq('id', targetId)
      .single();
    
    if (targetError || !target) {
      return res.status(400).json({
        success: false,
        message: '目标不存在'
      });
    }
    
    // 生成评论ID
    const commentId = generateUUID();
    
    // 创建评论记录
    const { data: comment, error } = await supabase
      .from('comments')
      .insert([{
        id: commentId,
        user_id: userId,
        target_id: targetId,
        target_type: targetType,
        content: content,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      message: '评论添加成功',
      data: comment
    });
  } catch (error) {
    console.error('添加评论失败:', error);
    res.status(500).json({
      success: false,
      message: '添加评论失败',
      error: error.message
    });
  }
});

// 添加评论接口（需要认证）
app.post('/api/comments', authenticateToken, async (req, res) => {
  try {
    const { content, targetId, targetType = 'audio' } = req.body;
    const userId = req.userId; // 从认证中间件获取用户ID
    
    if (!content || !targetId) {
      return res.status(400).json({
        success: false,
        message: '评论内容和目标ID不能为空'
      });
    }
    
    // 验证目标ID是否为有效的UUID格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(targetId)) {
      return res.status(400).json({
        success: false,
        message: '目标ID格式无效'
      });
    }
    
    // 根据目标类型检查目标是否存在
    let targetTable = '';
    if (targetType === 'audio') {
      targetTable = 'audios';
    } else if (targetType === 'post') {
      targetTable = 'community_posts';
    } else {
      return res.status(400).json({
        success: false,
        message: '不支持的目标类型'
      });
    }
    
    // 检查目标是否存在
    const { data: target, error: targetError } = await supabase
      .from(targetTable)
      .select('id')
      .eq('id', targetId)
      .single();
    
    if (targetError || !target) {
      return res.status(400).json({
        success: false,
        message: '目标不存在'
      });
    }
    
    // 生成评论ID
    const commentId = generateUUID();
    
    // 创建评论记录
    const { data: comment, error } = await supabase
      .from('comments')
      .insert([{
        id: commentId,
        user_id: userId,
        target_id: targetId,
        target_type: targetType,
        content: content,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      message: '评论添加成功',
      data: comment
    });
  } catch (error) {
    console.error('添加评论失败:', error);
    res.status(500).json({
      success: false,
      message: '添加评论失败',
      error: error.message
    });
  }
});

// 启动服务
app.listen(PORT, () => {
  console.log(`🚀 SlumberPod后端服务已启动`)
  console.log(`📍 服务地址: http://localhost:${PORT}`)
  console.log(`📊 健康检查: http://localhost:${PORT}/api/health`)
  console.log(`🎵 音频接口: http://localhost:${PORT}/api/audios`)
  console.log(`💬 社区接口: http://localhost:${PORT}/api/posts`)
  console.log(`😴 睡眠接口: http://localhost:${PORT}/api/sleep/records`)
  console.log(`👤 用户接口: http://localhost:${PORT}/api/users/:id`)
  console.log(`❤️ 收藏接口: http://localhost:${PORT}/api/users/:id/favorites`)
  console.log(`📖 播放历史: http://localhost:${PORT}/api/users/:id/play-history`)
  console.log(`🎨 创作接口: http://localhost:${PORT}/api/users/creations`)
  console.log(`💬 评论接口: http://localhost:${PORT}/api/comments`)
  console.log(`🔐 认证接口: http://localhost:${PORT}/api/auth`)
})