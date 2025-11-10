const { query, testConnection } = require('./config');

// 数据库初始化脚本
async function initializeDatabase() {
  console.log('🚀 开始初始化SlumberPod数据库...');
  
  // 测试数据库连接
  const isConnected = await testConnection();
  if (!isConnected) {
    console.error('❌ 数据库连接失败，无法初始化');
    process.exit(1);
  }
  
  try {
    // 创建用户表
    console.log('📊 创建用户表...');
    await createUsersTable();
    
    // 创建音频分类表
    console.log('🎵 创建音频分类表...');
    await createAudioCategoriesTable();
    
    // 创建音频表
    console.log('🎵 创建音频表...');
    await createAudiosTable();
    
    // 创建音频分类映射表
    console.log('🎵 创建音频分类映射表...');
    await createAudioCategoryMappingTable();
    
    // 创建收藏表
    console.log('❤️ 创建收藏表...');
    await createFavoritesTable();
    
    // 创建播放历史表
    console.log('📖 创建播放历史表...');
    await createPlayHistoryTable();
    
    // 创建搜索历史表
    console.log('🔍 创建搜索历史表...');
    await createSearchHistoryTable();
    
    // 创建播放列表表
    console.log('📋 创建播放列表表...');
    await createPlaylistsTable();
    
    // 创建播放列表项表
    console.log('📋 创建播放列表项表...');
    await createPlaylistItemsTable();
    
    // 创建播放设置表
    console.log('⚙️ 创建播放设置表...');
    await createPlaySettingsTable();
    
    // 创建社区帖子表
    console.log('💬 创建社区帖子表...');
    await createPostsTable();
    
    // 创建帖子点赞表
    console.log('👍 创建帖子点赞表...');
    await createPostLikesTable();
    
    // 创建评论表
    console.log('💬 创建评论表...');
    await createCommentsTable();
    
    // 创建闹钟表
    console.log('⏰ 创建闹钟表...');
    await createAlarmsTable();
    
    // 创建小憩定时任务表
    console.log('😴 创建小憩定时任务表...');
    await createSleepTimersTable();
    
    // 创建睡眠会话表
    console.log('😴 创建睡眠会话表...');
    await createSleepSessionsTable();
    
    // 创建睡眠反馈表
    console.log('📝 创建睡眠反馈表...');
    await createSleepFeedbackTable();
    
    // 创建反馈提醒表
    console.log('⏰ 创建反馈提醒表...');
    await createFeedbackRemindersTable();
    
    console.log('✅ 数据库初始化完成！');
    console.log('📋 已创建的表结构：');
    console.log('   - users (用户表)');
    console.log('   - audio_categories (音频分类表)');
    console.log('   - audios (音频表)');
    console.log('   - audio_category_mapping (音频分类映射表)');
    console.log('   - favorites (收藏表)');
    console.log('   - play_history (播放历史表)');
    console.log('   - search_history (搜索历史表)');
    console.log('   - playlists (播放列表表)');
    console.log('   - playlist_items (播放列表项表)');
    console.log('   - play_settings (播放设置表)');
    console.log('   - posts (社区帖子表)');
    console.log('   - post_likes (帖子点赞表)');
    console.log('   - comments (评论表)');
    console.log('   - alarms (闹钟表)');
    console.log('   - sleep_timers (小憩定时任务表)');
    console.log('   - sleep_sessions (睡眠会话表)');
    console.log('   - sleep_feedback (睡眠反馈表)');
    console.log('   - feedback_reminders (反馈提醒表)');
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    process.exit(1);
  }
}

// 创建用户表
async function createUsersTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS users (
      openid varchar(128) NOT NULL COMMENT '微信唯一标识，主键',
      unionid varchar(128) DEFAULT NULL COMMENT '多平台统一标识',
      nickname varchar(128) DEFAULT NULL COMMENT '用户昵称',
      avatar_url varchar(512) DEFAULT NULL COMMENT '头像URL',
      gender tinyint(1) DEFAULT 0 COMMENT '性别：0-未知，1-男，2-女',
      city varchar(64) DEFAULT NULL COMMENT '城市',
      country varchar(64) DEFAULT NULL COMMENT '国家',
      province varchar(64) DEFAULT NULL COMMENT '省份',
      language varchar(32) DEFAULT NULL COMMENT '语言（如zh_CN）',
      session_key varchar(256) DEFAULT NULL COMMENT '微信会话密钥（临时存储）',
      settings text DEFAULT NULL COMMENT '用户偏好（JSON格式，如主题、播放速度）',
      bio varchar(512) DEFAULT NULL COMMENT '个人简介',
      birthday date DEFAULT NULL COMMENT '生日',
      phone varchar(20) DEFAULT NULL COMMENT '手机号（脱敏展示）',
      total_sleep_duration decimal(10,2) DEFAULT 0.00 COMMENT '累计睡眠时长（小时）',
      preferred_category varchar(64) DEFAULT NULL COMMENT '偏好音频类别（如“自然”）',
      is_deleted tinyint(1) DEFAULT 0 COMMENT '是否注销：1-是，0-否',
      created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      PRIMARY KEY (openid),
      KEY idx_nickname (nickname) COMMENT '昵称搜索索引'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  
  const result = await query(sql);
  if (!result.success) {
    throw new Error(`创建用户表失败: ${result.error}`);
  }
}

// 创建音频分类表
async function createAudioCategoriesTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS audio_categories (
      category_id tinyint(4) NOT NULL AUTO_INCREMENT COMMENT '分类ID',
      name varchar(32) NOT NULL COMMENT '分类名称（如“雨声”“自然”“免费”）',
      parent_id tinyint(4) DEFAULT 0 COMMENT '父分类ID（0为一级分类）',
      sort_order tinyint(4) DEFAULT 0 COMMENT '排序权重（越大越靠前）',
      is_free tinyint(1) DEFAULT 0 COMMENT '是否免费分类：1-是，0-否',
      created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (category_id),
      UNIQUE KEY uk_category_name (name) COMMENT '分类名称唯一',
      KEY idx_parent (parent_id) COMMENT '父分类查询索引'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  
  const result = await query(sql);
  if (!result.success) {
    throw new Error(`创建音频分类表失败: ${result.error}`);
  }
}

// 创建音频表
async function createAudiosTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS audios (
      audio_id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '音频ID',
      owner_openid varchar(128) DEFAULT NULL COMMENT '上传者（系统音频为NULL）',
      title varchar(255) NOT NULL COMMENT '音频标题',
      description text DEFAULT NULL COMMENT '描述',
      cover_url varchar(512) DEFAULT NULL COMMENT '封面图URL',
      audio_url varchar(1024) NOT NULL COMMENT '音频文件URL（OSS）',
      duration_seconds int(11) DEFAULT NULL COMMENT '时长（秒）',
      is_public tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否公开：1-是，0-否',
      type varchar(32) NOT NULL COMMENT '类型：system（系统）/user_created（用户创作）',
      is_user_creation tinyint(1) DEFAULT 0 COMMENT '是否为用户创作：1-是，0-否',
      play_count int(11) NOT NULL DEFAULT 0 COMMENT '播放量',
      favorite_count int(11) NOT NULL DEFAULT 0 COMMENT '收藏量',
      comment_count int(11) NOT NULL DEFAULT 0 COMMENT '评论量',
      created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (audio_id),
      KEY idx_owner (owner_openid),
      KEY idx_type (type),
      KEY idx_title (title) COMMENT '标题搜索索引',
      KEY idx_is_user_creation (is_user_creation) COMMENT '筛选“我的创作”',
      CONSTRAINT fk_audios_owner FOREIGN KEY (owner_openid) REFERENCES users(openid) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  
  const result = await query(sql);
  if (!result.success) {
    throw new Error(`创建音频表失败: ${result.error}`);
  }
}

// 创建音频分类映射表
async function createAudioCategoryMappingTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS audio_category_mapping (
      id bigint(20) NOT NULL AUTO_INCREMENT,
      audio_id bigint(20) NOT NULL COMMENT '音频ID',
      category_id tinyint(4) NOT NULL COMMENT '分类ID',
      PRIMARY KEY (id),
      UNIQUE KEY uk_audio_category (audio_id,category_id) COMMENT '同一音频不重复关联同一分类',
      KEY idx_category (category_id) COMMENT '按分类查询音频',
      CONSTRAINT fk_mapping_audio FOREIGN KEY (audio_id) REFERENCES audios(audio_id) ON DELETE CASCADE,
      CONSTRAINT fk_mapping_category FOREIGN KEY (category_id) REFERENCES audio_categories(category_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  
  const result = await query(sql);
  if (!result.success) {
    throw new Error(`创建音频分类映射表失败: ${result.error}`);
  }
}

// 创建收藏表
async function createFavoritesTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS favorites (
      id bigint(20) NOT NULL AUTO_INCREMENT,
      openid varchar(128) NOT NULL COMMENT '用户ID',
      audio_id bigint(20) NOT NULL COMMENT '音频ID',
      created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
      PRIMARY KEY (id),
      UNIQUE KEY uk_user_audio (openid,audio_id) COMMENT '防止重复收藏',
      KEY idx_audio (audio_id),
      CONSTRAINT fk_fav_user FOREIGN KEY (openid) REFERENCES users(openid) ON DELETE CASCADE,
      CONSTRAINT fk_fav_audio FOREIGN KEY (audio_id) REFERENCES audios(audio_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  
  const result = await query(sql);
  if (!result.success) {
    throw new Error(`创建收藏表失败: ${result.error}`);
  }
}

// 创建播放历史表
async function createPlayHistoryTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS play_history (
      history_id bigint(20) NOT NULL AUTO_INCREMENT,
      openid varchar(128) NOT NULL COMMENT '用户ID',
      audio_id bigint(20) NOT NULL COMMENT '音频ID',
      played_at datetime NOT NULL COMMENT '播放时间',
      position_seconds int(11) DEFAULT 0 COMMENT '上次播放位置（秒）',
      device_info varchar(255) DEFAULT NULL COMMENT '设备信息（如“微信小程序-Android”）',
      PRIMARY KEY (history_id),
      KEY idx_user_played (openid,played_at DESC) COMMENT '按用户+播放时间排序（最近播放）',
      KEY idx_audio (audio_id),
      CONSTRAINT fk_history_user FOREIGN KEY (openid) REFERENCES users(openid) ON DELETE CASCADE,
      CONSTRAINT fk_history_audio FOREIGN KEY (audio_id) REFERENCES audios(audio_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  
  const result = await query(sql);
  if (!result.success) {
    throw new Error(`创建播放历史表失败: ${result.error}`);
  }
}

// 创建搜索历史表
async function createSearchHistoryTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS search_history (
      id bigint(20) NOT NULL AUTO_INCREMENT,
      openid varchar(128) DEFAULT NULL COMMENT '用户ID（匿名搜索为NULL）',
      keyword varchar(255) NOT NULL COMMENT '搜索关键词',
      is_hot tinyint(1) DEFAULT 0 COMMENT '是否为热门搜索：1-是，0-否',
      search_count int(11) DEFAULT 0 COMMENT '热门搜索点击次数',
      created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_user_keyword (openid,keyword) COMMENT '用户搜索历史去重',
      KEY idx_hot_count (is_hot,search_count DESC) COMMENT '热门搜索排序'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  
  const result = await query(sql);
  if (!result.success) {
    throw new Error(`创建搜索历史表失败: ${result.error}`);
  }
}

// 创建播放列表主表
async function createPlaylistsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS playlists (
      playlist_id bigint(20) NOT NULL AUTO_INCREMENT,
      openid varchar(128) NOT NULL,
      name varchar(128) NOT NULL COMMENT '列表名称（如“我的助眠列表”）',
      is_default tinyint(1) DEFAULT 0 COMMENT '是否为默认列表：1-是，0-否',
      created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (playlist_id),
      UNIQUE KEY uk_user_default (openid,is_default) COMMENT '用户只能有一个默认列表',
      KEY idx_user (openid) COMMENT '查询用户的所有列表',
      CONSTRAINT fk_playlist_user FOREIGN KEY (openid) REFERENCES users(openid) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  
  const result = await query(sql);
  if (!result.success) {
    throw new Error(`创建播放列表表失败: ${result.error}`);
  }
}

// 创建播放列表项表
async function createPlaylistItemsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS playlist_items (
      id bigint(20) NOT NULL AUTO_INCREMENT,
      playlist_id bigint(20) NOT NULL,
      audio_id bigint(20) NOT NULL,
      position int(11) NOT NULL COMMENT '列表内排序位置',
      added_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_playlist_audio (playlist_id,audio_id) COMMENT '同一列表不重复添加音频',
      KEY idx_playlist (playlist_id) COMMENT '查询列表内所有音频',
      CONSTRAINT fk_item_playlist FOREIGN KEY (playlist_id) REFERENCES playlists(playlist_id) ON DELETE CASCADE,
      CONSTRAINT fk_item_audio FOREIGN KEY (audio_id) REFERENCES audios(audio_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  
  const result = await query(sql);
  if (!result.success) {
    throw new Error(`创建播放列表项表失败: ${result.error}`);
  }
}

// 创建播放设置表
async function createPlaySettingsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS play_settings (
      id bigint(20) NOT NULL AUTO_INCREMENT,
      openid varchar(128) NOT NULL,
      play_mode varchar(32) NOT NULL DEFAULT 'list_loop' COMMENT '播放模式：single_loop（单曲循环）、list_loop（列表循环）、single_once（单曲一次）',
      timer_minutes int(11) DEFAULT 0 COMMENT '定时关闭分钟数（0为关闭）',
      created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_user_settings (openid) COMMENT '用户唯一设置记录',
      CONSTRAINT fk_settings_user FOREIGN KEY (openid) REFERENCES users(openid) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  
  const result = await query(sql);
  if (!result.success) {
    throw new Error(`创建播放设置表失败: ${result.error}`);
  }
}

// 创建社区帖子表
async function createPostsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS community_posts (
      id bigint(20) NOT NULL AUTO_INCREMENT,
      openid varchar(128) NOT NULL COMMENT '用户ID',
      title varchar(255) DEFAULT NULL COMMENT '标题',
      content text NOT NULL COMMENT '内容',
      category_id int(11) DEFAULT NULL COMMENT '分类ID',
      image_urls text DEFAULT NULL COMMENT '图片URLs（JSON格式）',
      like_count int(11) NOT NULL DEFAULT 0 COMMENT '点赞数',
      comment_count int(11) NOT NULL DEFAULT 0 COMMENT '评论数',
      view_count int(11) NOT NULL DEFAULT 0 COMMENT '浏览数',
      is_active tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否有效：1-是，0-否',
      created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_openid (openid) COMMENT '用户查询索引',
      KEY idx_category (category_id) COMMENT '分类查询索引',
      KEY idx_created (created_at DESC) COMMENT '最新帖子排序',
      KEY idx_active (is_active) COMMENT '有效帖子过滤',
      CONSTRAINT fk_community_posts_openid FOREIGN KEY (openid) REFERENCES users(openid) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  
  const result = await query(sql);
  if (!result.success) {
    throw new Error(`创建社区帖子表失败: ${result.error}`);
  }
}

// 创建帖子点赞表
async function createPostLikesTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS post_likes (
      id bigint(20) NOT NULL AUTO_INCREMENT,
      post_id bigint(20) NOT NULL COMMENT '帖子ID',
      openid varchar(128) NOT NULL COMMENT '点赞用户ID',
      is_active tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否有效：1-是，0-否',
      created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_post_user_active (post_id,openid,is_active) COMMENT '防止重复点赞',
      KEY idx_user (openid) COMMENT '查询用户点赞的帖子',
      KEY idx_post (post_id) COMMENT '查询帖子点赞情况',
      CONSTRAINT fk_like_post FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
      CONSTRAINT fk_like_user FOREIGN KEY (openid) REFERENCES users(openid) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  
  const result = await query(sql);
  if (!result.success) {
    throw new Error(`创建帖子点赞表失败: ${result.error}`);
  }
}

// 创建帖子评论表
async function createCommentsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS post_comments (
      id bigint(20) NOT NULL AUTO_INCREMENT,
      post_id bigint(20) NOT NULL COMMENT '帖子ID',
      openid varchar(128) NOT NULL COMMENT '评论用户ID',
      parent_id bigint(20) DEFAULT NULL COMMENT '父评论ID（回复场景）',
      content text NOT NULL COMMENT '评论内容',
      like_count int(11) DEFAULT 0 COMMENT '点赞数',
      is_active tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否有效：1-是，0-否',
      created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_post (post_id) COMMENT '按帖子查询评论',
      KEY idx_openid (openid) COMMENT '查询用户评论',
      KEY idx_parent (parent_id) COMMENT '查询回复评论',
      KEY idx_created (created_at DESC) COMMENT '按时间排序',
      CONSTRAINT fk_post_comment_post FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
      CONSTRAINT fk_post_comment_user FOREIGN KEY (openid) REFERENCES users(openid) ON DELETE CASCADE,
      CONSTRAINT fk_post_comment_parent FOREIGN KEY (parent_id) REFERENCES post_comments(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  
  const result = await query(sql);
  if (!result.success) {
    throw new Error(`创建帖子评论表失败: ${result.error}`);
  }
}

// 创建闹钟表
async function createAlarmsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS alarms (
      alarm_id bigint(20) NOT NULL AUTO_INCREMENT,
      openid varchar(128) NOT NULL COMMENT '用户ID',
      alarm_time time NOT NULL COMMENT '闹钟时间（如08:30:00）',
      repeat_days varchar(20) DEFAULT NULL COMMENT '重复规则（1-7代表周一到周日，如"1,2,3"）',
      label varchar(128) DEFAULT NULL COMMENT '闹钟备注（如“起床闹钟”）',
      snooze_duration int(11) DEFAULT 0 COMMENT '再睡一会时长（0-关闭，5/10/15分钟）',
      vibration tinyint(1) DEFAULT 1 COMMENT '振动：1-开启，0-关闭',
      volume int(11) DEFAULT 80 COMMENT '音量（0-100）',
      is_enabled tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用：1-是，0-否',
      created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (alarm_id),
      KEY idx_user_enabled (openid,is_enabled,alarm_time) COMMENT '查询用户启用的闹钟',
      CONSTRAINT fk_alarm_user FOREIGN KEY (openid) REFERENCES users(openid) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  
  const result = await query(sql);
  if (!result.success) {
    throw new Error(`创建闹钟表失败: ${result.error}`);
  }
}

// 创建小憩/定时任务表
async function createSleepTimersTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS sleep_timers (
      timer_id bigint(20) NOT NULL AUTO_INCREMENT PRIMARY KEY,
      openid varchar(128) NOT NULL,
      type varchar(32) NOT NULL COMMENT '类型：小憩、科学小眠10、高效午休24、自定义',
      duration_minutes int(11) NOT NULL COMMENT '时长（分钟）',
      start_time datetime NOT NULL COMMENT '开始时间',
      end_time datetime NOT NULL COMMENT '结束时间（计算得出）',
      status varchar(20) NOT NULL DEFAULT 'active' COMMENT '状态：active（进行中）、completed（已完成）',
      created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_sleep_timer_user FOREIGN KEY (openid) REFERENCES users(openid) ON DELETE CASCADE,
      KEY idx_user_start_time (openid,start_time DESC)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  
  const result = await query(sql);
  if (!result.success) {
    throw new Error(`创建小憩定时任务表失败: ${result.error}`);
  }
}

// 创建睡眠会话表
async function createSleepSessionsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS sleep_sessions (
      session_id bigint(20) NOT NULL AUTO_INCREMENT,
      openid varchar(128) NOT NULL COMMENT '用户ID',
      audio_id bigint(20) DEFAULT NULL COMMENT '关联音频',
      start_time datetime NOT NULL COMMENT '开始时间',
      end_time datetime DEFAULT NULL COMMENT '结束时间（NULL表示未结束）',
      auto_stop tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否自动停止：1-是，0-否',
      PRIMARY KEY (session_id),
      KEY idx_user_time (openid,start_time DESC) COMMENT '查询用户睡眠记录',
      CONSTRAINT fk_session_user FOREIGN KEY (openid) REFERENCES users(openid) ON DELETE CASCADE,
      CONSTRAINT fk_session_audio FOREIGN KEY (audio_id) REFERENCES audios(audio_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  
  const result = await query(sql);
  if (!result.success) {
    throw new Error(`创建睡眠会话表失败: ${result.error}`);
  }
}

// 创建睡眠反馈表
async function createSleepFeedbackTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS sleep_feedback (
      feedback_id bigint(20) NOT NULL AUTO_INCREMENT PRIMARY KEY,
      openid varchar(128) NOT NULL,
      sleep_quality varchar(64) NOT NULL COMMENT '睡眠质量（如“良好”“一般”）',
      sleep_problems json NOT NULL COMMENT '睡眠问题（如["多梦","易醒"]）',
      pre_sleep_activities json NOT NULL COMMENT '睡前活动（如["饮用咖啡","使用电子设备超1小时"]）',
      other varchar(255) DEFAULT NULL COMMENT '其他备注',
      mental_state varchar(64) NOT NULL COMMENT '心理状态（如“无压力”“轻微压力”）',
      is_shared tinyint(1) DEFAULT 0 COMMENT '是否同步到社区：1-是，0-否',
      created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_feedback_user FOREIGN KEY (openid) REFERENCES users(openid) ON DELETE CASCADE,
      KEY idx_user_created_at (openid,created_at DESC) COMMENT '查询用户反馈记录'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  
  const result = await query(sql);
  if (!result.success) {
    throw new Error(`创建睡眠反馈表失败: ${result.error}`);
  }
}

// 创建反馈提醒表
async function createFeedbackRemindersTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS feedback_reminders (
      reminder_id bigint(20) NOT NULL AUTO_INCREMENT PRIMARY KEY,
      openid varchar(128) NOT NULL,
      feedback_id bigint(20) DEFAULT NULL COMMENT '关联的反馈ID（若已提交）',
      remind_time datetime NOT NULL COMMENT '提醒时间',
      status varchar(20) NOT NULL DEFAULT 'pending' COMMENT '状态：pending（待提醒）、reminded（已提醒）、completed（已完成）',
      created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_reminder_user FOREIGN KEY (openid) REFERENCES users(openid) ON DELETE CASCADE,
      CONSTRAINT fk_reminder_feedback FOREIGN KEY (feedback_id) REFERENCES sleep_feedback(feedback_id) ON DELETE SET NULL,
      KEY idx_user_remind_time (openid,remind_time ASC) COMMENT '查询待提醒任务'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  
  const result = await query(sql);
  if (!result.success) {
    throw new Error(`创建反馈提醒表失败: ${result.error}`);
  }
}

// 创作表已包含在音频表中，这里删除独立的创作表

// 如果直接运行此文件，则执行初始化
if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = {
  initializeDatabase,
  createUsersTable,
  createAudioCategoriesTable,
  createAudiosTable,
  createAudioCategoryMappingTable,
  createFavoritesTable,
  createPlayHistoryTable,
  createSearchHistoryTable,
  createPlaylistsTable,
  createPlaylistItemsTable,
  createPlaySettingsTable,
  createPostsTable,
  createPostLikesTable,
  createCommentsTable,
  createAlarmsTable,
  createSleepTimersTable,
  createSleepSessionsTable,
  createSleepFeedbackTable,
  createFeedbackRemindersTable
};