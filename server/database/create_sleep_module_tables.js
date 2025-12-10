const { query } = require('./config');

async function createSleepModuleTables() {
  try {
    console.log('🔨 开始创建小屋模块相关数据表...');

    // 1. 创建信箱线程表
    console.log('📝 创建 mailbox_threads 表...');
    const mailboxThreadsSql = `
      CREATE TABLE IF NOT EXISTS mailbox_threads (
        thread_id BIGINT AUTO_INCREMENT PRIMARY KEY,
        sender_openid VARCHAR(128) NOT NULL COMMENT '发送者openid',
        recipient_openid VARCHAR(128) NULL COMMENT '接收者openid，为空表示公开信件',
        title VARCHAR(255) NOT NULL COMMENT '信件标题',
        content TEXT NOT NULL COMMENT '信件内容',
        status ENUM('public', 'private', 'picked') DEFAULT 'public' COMMENT '状态：public-公开可领取，private-私发给指定用户，picked-已被领取',
        is_read TINYINT(1) DEFAULT 0 COMMENT '是否已读：0-未读，1-已读',
        picked_at TIMESTAMP NULL COMMENT '领取时间',
        read_at TIMESTAMP NULL COMMENT '阅读时间',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sender_openid (sender_openid),
        INDEX idx_recipient_openid (recipient_openid),
        INDEX idx_status (status),
        INDEX idx_is_read (is_read),
        INDEX idx_created_at (created_at),
        INDEX idx_picked_at (picked_at),
        INDEX idx_read_at (read_at),
        FOREIGN KEY (sender_openid) REFERENCES users(openid) ON DELETE CASCADE,
        FOREIGN KEY (recipient_openid) REFERENCES users(openid) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='晚安邮箱信件表';
    `;
    await query(mailboxThreadsSql);

    // 2. 创建信箱附件表
    console.log('📎 创建 mailbox_attachments 表...');
    const mailboxAttachmentsSql = `
      CREATE TABLE IF NOT EXISTS mailbox_attachments (
        attachment_id BIGINT AUTO_INCREMENT PRIMARY KEY,
        thread_id BIGINT NOT NULL COMMENT '信件ID',
        url VARCHAR(500) NOT NULL COMMENT '附件URL',
        filename VARCHAR(255) NULL COMMENT '文件名',
        file_type ENUM('image', 'file', 'audio') DEFAULT 'file' COMMENT '文件类型',
        file_size INT NULL COMMENT '文件大小（字节）',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_thread_id (thread_id),
        INDEX idx_created_at (created_at),
        FOREIGN KEY (thread_id) REFERENCES mailbox_threads(thread_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='信箱附件表';
    `;
    await query(mailboxAttachmentsSql);

    // 3. 创建故事表
    console.log('📖 创建 stories 表...');
    const storiesSql = `
      CREATE TABLE IF NOT EXISTS stories (
        story_id BIGINT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL COMMENT '故事标题',
        content LONGTEXT NOT NULL COMMENT '故事内容',
        excerpt TEXT NULL COMMENT '故事摘要',
        cover_url VARCHAR(500) NULL COMMENT '封面图片URL',
        audio_url VARCHAR(500) NULL COMMENT '音频URL（TTS生成或上传）',
        duration INT NULL COMMENT '音频时长（秒）',
        category ENUM('sleep', 'relax', 'meditation', 'fairy_tale', 'education') DEFAULT 'sleep' COMMENT '故事分类',
        tts_config JSON NULL COMMENT 'TTS配置信息',
        view_count INT DEFAULT 0 COMMENT '浏览次数',
        play_count INT DEFAULT 0 COMMENT '播放次数',
        total_play_time INT DEFAULT 0 COMMENT '总播放时长（秒）',
        status ENUM('draft', 'published', 'archived') DEFAULT 'draft' COMMENT '状态',
        sort_order INT DEFAULT 0 COMMENT '排序权重',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at),
        INDEX idx_sort_order (sort_order),
        INDEX idx_view_count (view_count),
        INDEX idx_play_count (play_count)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='睡眠故事表';
    `;
    await query(storiesSql);

    // 4. 创建故事播放历史表
    console.log('▶️ 创建 story_play_history 表...');
    const storyPlayHistorySql = `
      CREATE TABLE IF NOT EXISTS story_play_history (
        history_id BIGINT AUTO_INCREMENT PRIMARY KEY,
        story_id BIGINT NOT NULL COMMENT '故事ID',
        play_duration INT NOT NULL DEFAULT 0 COMMENT '播放时长（秒）',
        device VARCHAR(100) NULL COMMENT '设备标识',
        user_agent TEXT NULL COMMENT '用户代理',
        ip_address VARCHAR(45) NULL COMMENT 'IP地址',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_story_id (story_id),
        INDEX idx_created_at (created_at),
        INDEX idx_play_duration (play_duration),
        FOREIGN KEY (story_id) REFERENCES stories(story_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='故事播放历史表';
    `;
    await query(storyPlayHistorySql);

    // 5. 更新现有表结构
    console.log('🔧 更新现有表结构...');
    
    // 为 audios 表添加 total_play_time 字段（如果不存在）
    await query(`
      ALTER TABLE audios 
      ADD COLUMN IF NOT EXISTS total_play_time INT DEFAULT 0 COMMENT '总播放时长（秒）',
      ADD COLUMN IF NOT EXISTS favorite_count INT DEFAULT 0 COMMENT '收藏次数'
    `);

    // 为 play_history 表添加 play_type 字段（如果不存在）
    await query(`
      ALTER TABLE play_history 
      ADD COLUMN IF NOT EXISTS play_type ENUM('general', 'study', 'story') DEFAULT 'general' COMMENT '播放类型'
    `);

    // 确保 favorites 表有 favorite_type 字段
    await query(`
      ALTER TABLE favorites 
      ADD COLUMN IF NOT EXISTS favorite_type ENUM('general', 'study', 'story') DEFAULT 'general' COMMENT '收藏类型'
    `);

    // 为 mailbox_threads 表添加 is_read 和 read_at 字段（如果不存在）
    await query(`
      ALTER TABLE mailbox_threads 
      ADD COLUMN IF NOT EXISTS is_read TINYINT(1) DEFAULT 0 COMMENT '是否已读：0-未读，1-已读',
      ADD COLUMN IF NOT EXISTS read_at TIMESTAMP NULL COMMENT '阅读时间'
    `);

    // 为 mailbox_threads 表添加 is_read 和 read_at 字段（如果不存在）
    await query(`
      ALTER TABLE mailbox_threads 
      ADD COLUMN IF NOT EXISTS is_read TINYINT(1) DEFAULT 0 COMMENT '是否已读：0-未读，1-已读',
      ADD COLUMN IF NOT EXISTS read_at TIMESTAMP NULL COMMENT '阅读时间'
    `);

    // 6. 插入一些默认的故事数据
    console.log('📚 插入默认故事数据...');
    const defaultStories = [
      {
        title: '小熊的甜蜜梦境',
        content: '从前，有一只可爱的小熊，他每天晚上都会做一个甜美的梦...',
        excerpt: '关于小熊和甜美梦境的睡前故事',
        cover_url: 'https://example.com/covers/bear_dream.jpg',
        category: 'sleep',
        status: 'published',
        sort_order: 1
      },
      {
        title: '月光下的森林',
        content: '在一个月光明媚的夜晚，小兔子走进了神秘的森林...',
        excerpt: '月光下森林里的奇妙冒险',
        cover_url: 'https://example.com/covers/forest_moon.jpg',
        category: 'fairy_tale',
        status: 'published',
        sort_order: 2
      },
      {
        title: '深海漫游',
        content: '潜入深蓝色的海洋，与小鱼们一起探索神秘的海底世界...',
        excerpt: '放松身心的深海冥想故事',
        cover_url: 'https://example.com/covers/deep_sea.jpg',
        category: 'meditation',
        status: 'published',
        sort_order: 3
      }
    ];

    for (const story of defaultStories) {
      await query(`
        INSERT INTO stories (title, content, excerpt, cover_url, category, status, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        story.title,
        story.content,
        story.excerpt,
        story.cover_url,
        story.category,
        story.status,
        story.sort_order
      ]);
    }

    // 7. 插入一些默认的信箱数据
    console.log('✉️ 插入默认信箱数据...');
    const defaultMails = [
      {
        sender_openid: 'system_openid',
        title: '晚安，好梦',
        content: '愿你今夜好梦，被温柔的月光包围，所有的烦恼都会在梦中消散...',
        status: 'public'
      },
      {
        sender_openid: 'system_openid', 
        title: '星光守护',
        content: '夜空中最亮的星星会守护你的梦境，给你带来平安和喜悦...',
        status: 'public'
      }
    ];

    for (const mail of defaultMails) {
      await query(`
        INSERT INTO mailbox_threads (sender_openid, title, content, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())
      `, [
        mail.sender_openid,
        mail.title,
        mail.content,
        mail.status
      ]);
    }

    console.log('✅ 小屋模块数据表创建完成！');
    
    // 验证表是否创建成功
    const tables = await query('SHOW TABLES');
    const tableNames = tables.data.map(row => Object.values(row)[0]);
    
    const requiredTables = [
      'mailbox_threads',
      'mailbox_attachments', 
      'stories',
      'story_play_history'
    ];

    console.log('\n📊 表创建验证:');
    requiredTables.forEach(table => {
      const exists = tableNames.includes(table);
      console.log(`  ${exists ? '✅' : '❌'} ${table}`);
    });

  } catch (error) {
    console.error('❌ 创建数据表失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  createSleepModuleTables()
    .then(() => {
      console.log('🎉 脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { createSleepModuleTables };