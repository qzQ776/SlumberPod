const express = require('express')
const cors = require('cors')
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
app.use(cors())
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

// 注册新的路由文件
console.log('注册路由: /api/audios');
const audioRoutes = require('./audioRoutes');
app.use('/api/audios', audioRoutes);

console.log('注册路由: /api/community');
const communityRoutes = require('./communityRoutes');
app.use('/api/community', communityRoutes);

console.log('注册路由: /api/users');
const userRoutes = require('./userRoutes');
app.use('/api/users', userRoutes);

console.log('注册路由: /api/sleep');
const sleepRoutes = require('./sleepRoutes');
app.use('/api/sleep', authenticateToken, sleepRoutes);

console.log('注册路由: /api/creations');
const creationRoutes = require('./creationRoutes');
app.use('/api/creations', authenticateToken, creationRoutes);

console.log('注册路由: /api/comments');
const commentRoutes = require('./commentRoutes');
app.use('/api/comments', authenticateToken, commentRoutes);

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

console.log('注册路由: /api/search');
const searchRoutes = require('./searchRoutes');
app.use('/api/search', authenticateToken, searchRoutes);

console.log('注册路由: /api/categories');
const categoryRoutes = require('./categoryRoutes');
app.use('/api/categories', categoryRoutes);

console.log('注册路由: /api/audio');
const audioUploadRoutes = require('./audioUploadRoutes');
app.use('/api/audio', authenticateToken, audioUploadRoutes);

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
    
    app.listen(PORT, () => {
      console.log(`📍 服务地址: http://localhost:${PORT}`)
      console.log(`📊 健康检查: http://localhost:${PORT}/api/health`)
      console.log(`🔐 认证接口: http://localhost:${PORT}/api/auth`)
      console.log(`👤 微信登录: http://localhost:${PORT}/api/wechat/login`)
      console.log(`🎵 音频接口: http://localhost:${PORT}/api/audios`)
      console.log(`🎵 音频上传: http://localhost:${PORT}/api/audio/upload`)
      console.log(`💬 社区接口: http://localhost:${PORT}/api/community`)
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