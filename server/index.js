const express = require('express')
const cors = require('cors')
const path = require('path')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3003

// MySQL数据库配置
const { testConnection } = require('./database/config');

// 初始化数据库连接
async function initializeDatabase() {
  try {
    console.log('🔌 初始化MySQL数据库连接...');
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ MySQL数据库连接失败');
      process.exit(1);
    }
    console.log('✅ MySQL数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    process.exit(1);
  }
}

// 中间件
app.use(cors({
  origin: function (origin, callback) {
    // 允许所有来源，包括微信开发者工具
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))
app.use(express.json())

// 导入标准JWT认证中间件
const { authenticateToken, optionalAuth } = require('./middleware/auth');

// 显式检查路由是否加载
console.log('注册路由: /api/auth');
const authRoutes = require('./services/authRoutes');
app.use('/api/auth', authRoutes);

console.log('注册路由: /api/wechat');
const wechatRoutes = require('./wechatRoutes');
app.use('/api/wechat', wechatRoutes);

console.log('注册路由: /api/play-history');
const playHistoryRoutes = require('./playHistoryRoutes');
app.use('/api/play-history', authenticateToken, playHistoryRoutes);

console.log('注册路由: /api/favorites');
const favoriteRoutes = require('./favoriteRoutes');
app.use('/api/favorites', authenticateToken, favoriteRoutes);

console.log('注册路由: /api/audio');
const audioUploadRoutes = require('./audioUploadRoutes');
app.use('/api/audio', authenticateToken, audioUploadRoutes);



// 注册新的路由文件
console.log('注册路由: /api/audios');
const audioRoutes = require('./audioRoutes');
app.use('/api/audios', optionalAuth, audioRoutes);

console.log('注册路由: /api/community');
const communityRoutes = require('./communityRoutes');
app.use('/api/community', communityRoutes);

console.log('注册路由: /api/users');
const userRoutes = require('./userRoutes');
app.use('/api/users', authenticateToken, userRoutes);

console.log('注册路由: /api/sleep');
const sleepRoutes = require('./sleepRoutes');
app.use('/api/sleep', authenticateToken, sleepRoutes);

console.log('注册路由: /api/creations');
const creationRoutes = require('./creationRoutes');
app.use('/api/creations', authenticateToken, creationRoutes);



// 注册新的业务逻辑路由
console.log('注册路由: /api/playlists');
const playlistRoutes = require('./playlistRoutes');
app.use('/api/playlists', authenticateToken, playlistRoutes);

console.log('注册路由: /api/play-settings');
const playSettingRoutes = require('./playSettingRoutes');
app.use('/api/play-settings', authenticateToken, playSettingRoutes);

console.log('注册路由: /api/sleep-timers');
const sleepTimerRoutes = require('./sleepTimerRoutes');
app.use('/api/sleep-timers', authenticateToken, sleepTimerRoutes);

console.log('注册路由: /api/alarms');
const alarmRoutes = require('./alarmRoutes');
app.use('/api/alarms', authenticateToken, alarmRoutes);

console.log('注册路由: /api/alarms/reminder');
const alarmReminderRoutes = require('./services/alarmReminderRoutes');
app.use('/api/alarms/reminder', authenticateToken, alarmReminderRoutes);



// 注册统一的音频管理接口（替换所有重复的音频相关路由）
console.log('注册路由: /api/audio-manager');
const audioManagerRoutes = require('./audioManager');
app.use('/api/audio-manager', authenticateToken, audioManagerRoutes);

// 保留原有的分类路由（作为公共接口）
console.log('注册路由: /api/categories');
const categoryRoutes = require('./categoryRoutes');
app.use('/api/categories', categoryRoutes);

// 注册播放控制路由
console.log('注册路由: /api/playback');
const playbackControlRoutes = require('./playbackControlRoutes');
app.use('/api/playback', authenticateToken, playbackControlRoutes);

// 注册小屋模块路由
console.log('注册路由: /api/mailbox');
const mailboxRoutes = require('./mailboxRoutes');
app.use('/api/mailbox', authenticateToken, mailboxRoutes);

console.log('注册路由: /api/stories');
const storiesRoutes = require('./storiesRoutes');
app.use('/api/stories', storiesRoutes);

console.log('注册路由: /api/study-room');
const studyRoomRoutes = require('./studyRoomRoutes');
app.use('/api/study-room', authenticateToken, studyRoomRoutes);



// 注册搜索路由
console.log('注册路由: /api/search');
const searchRoutes = require('./searchRoutes');
app.use('/api/search', optionalAuth, searchRoutes);

// 白噪音组合功能已集成到 /api/audios 接口中
// 不再需要单独的白噪音路由文件

// 注册音频图标批量上传管理接口
console.log('注册路由: /api/admin/audio-icons');
const audioIconUploadRoutes = require('./audioIconUploadRoutes');
app.use('/api/admin/audio-icons', audioIconUploadRoutes);



// 静态文件服务（用于上传的文件）
console.log('注册静态文件服务: /uploads');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 静态文件服务（用于HTML页面）
console.log('注册根目录静态文件服务');
app.use(express.static(path.join(__dirname, '..')));

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

// 启动服务
async function startServer() {
  try {
    // 初始化数据库
    await initializeDatabase();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`📍 服务地址: http://localhost:${PORT}`)
      console.log(`🌐 外部访问: http://192.168.1.128:${PORT}`)
      console.log(`📊 健康检查: http://localhost:${PORT}/api/health`)
      console.log(`🔐 认证接口: http://localhost:${PORT}/api/auth`)
      console.log(`👤 微信登录: http://localhost:${PORT}/api/wechat/login`)
      console.log(`🎵 音频接口: http://localhost:${PORT}/api/audios`)
      console.log(`🎵 音频上传: http://localhost:${PORT}/api/audio/upload`)
      console.log(`📁 文件上传: http://localhost:${PORT}/api/common/upload`)
      console.log(`💬 社区接口: http://localhost:${PORT}/api/community`)
      console.log(`👤 用户资料: http://localhost:${PORT}/api/users/profile`)
      console.log(`📮 晚安邮箱: http://localhost:${PORT}/api/mailbox`)
      console.log(`📖 睡眠故事: http://localhost:${PORT}/api/stories`)
      console.log(`🎓 学习专注: http://localhost:${PORT}/api/study`)
      console.log(`😴 睡眠接口: http://localhost:${PORT}/api/sleep/records`)
      console.log(`❤️ 收藏接口: http://localhost:${PORT}/api/favorites`)
      console.log(`📖 播放历史: http://localhost:${PORT}/api/play-history`)
      console.log(`🎨 创作接口: http://localhost:${PORT}/api/creations`)
      console.log(`💬 评论接口: http://localhost:${PORT}/api/comments`)
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error.message);
    process.exit(1);
  }
}

// 启动服务器
startServer();