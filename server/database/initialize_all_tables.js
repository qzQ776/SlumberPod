const { query } = require('./config');

async function initializeAllTables() {
  try {
    console.log('🏗️ 初始化所有必要的数据表...');

    // 1. 创建 categories 表
    console.log('📂 创建 categories 表...');
    const categoriesSql = `
      CREATE TABLE IF NOT EXISTS categories (
        category_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL COMMENT '分类名称',
        description TEXT NULL COMMENT '分类描述',
        icon VARCHAR(100) NULL COMMENT '分类图标',
        type ENUM('general', 'study', 'story', 'sleep') DEFAULT 'general' COMMENT '分类类型',
        sort_order INT DEFAULT 0 COMMENT '排序权重',
        status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_type (type),
        INDEX idx_sort_order (sort_order),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='音频分类表';
    `;
    await query(categoriesSql);

    // 2. 创建 uploaded_files 表
    console.log('📁 创建 uploaded_files 表...');
    const uploadedFilesSql = `
      CREATE TABLE IF NOT EXISTS uploaded_files (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        openid VARCHAR(128) NULL COMMENT '上传者openid',
        original_name VARCHAR(500) NOT NULL COMMENT '原始文件名',
        filename VARCHAR(500) NOT NULL COMMENT '服务器文件名',
        file_path VARCHAR(1000) NOT NULL COMMENT '文件路径',
        file_size INT NULL COMMENT '文件大小（字节）',
        mime_type VARCHAR(100) NULL COMMENT 'MIME类型',
        file_type ENUM('image', 'audio', 'video', 'document', 'other') DEFAULT 'other' COMMENT '文件类型',
        download_count INT DEFAULT 0 COMMENT '下载次数',
        status ENUM('temp', 'active', 'deleted') DEFAULT 'active' COMMENT '状态',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_openid (openid),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at),
        INDEX idx_file_type (file_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文件上传记录表';
    `;
    await query(uploadedFilesSql);

    // 3. 更新 audios 表结构
    console.log('🎵 更新 audios 表...');
    try {
      await query(`
        ALTER TABLE audios 
        ADD COLUMN IF NOT EXISTS total_play_time INT DEFAULT 0 COMMENT '总播放时长（秒）',
        ADD COLUMN IF NOT EXISTS favorite_count INT DEFAULT 0 COMMENT '收藏次数'
      `);
    } catch (error) {
      console.log('⚠️ audios表更新:', error.message);
    }

    // 4. 更新 play_history 表
    console.log('📈 更新 play_history 表...');
    try {
      await query(`
        ALTER TABLE play_history 
        ADD COLUMN IF NOT EXISTS play_type ENUM('general', 'study', 'story') DEFAULT 'general' COMMENT '播放类型'
      `);
    } catch (error) {
      console.log('⚠️ play_history表更新:', error.message);
    }

    // 5. 更新 favorites 表
    console.log('❤️ 更新 favorites 表...');
    try {
      await query(`
        ALTER TABLE favorites 
        ADD COLUMN IF NOT EXISTS favorite_type ENUM('general', 'study', 'story') DEFAULT 'general' COMMENT '收藏类型'
      `);
    } catch (error) {
      console.log('⚠️ favorites表更新:', error.message);
    }

    // 6. 插入默认分类数据
    console.log('📚 插入默认分类...');
    const defaultCategories = [
      { name: '通用音频', description: '各种类型的音频内容', type: 'general', sort_order: 1, icon: 'music' },
      { name: '学习专注', description: '适合学习和专注的音频', type: 'study', sort_order: 2, icon: 'study' },
      { name: '睡眠故事', description: '帮助睡眠的睡前故事', type: 'story', sort_order: 3, icon: 'bedtime' },
      { name: '助眠音乐', description: '帮助睡眠的音乐', type: 'sleep', sort_order: 4, icon: 'sleep' },
      { name: '白噪音', description: '各种类型的白噪音', type: 'study', sort_order: 5, icon: 'wave' },
      { name: '冥想引导', description: '冥想和放松指导', type: 'sleep', sort_order: 6, icon: 'meditation' }
    ];

    for (const category of defaultCategories) {
      // 检查分类是否已存在
      const existingResult = await query(
        'SELECT category_id FROM categories WHERE name = ? AND type = ?',
        [category.name, category.type]
      );

      if (existingResult.success && existingResult.data.length === 0) {
        await query(`
          INSERT INTO categories (name, description, icon, type, sort_order, created_at)
          VALUES (?, ?, ?, ?, ?, NOW())
        `, [
          category.name,
          category.description,
          category.icon,
          category.type,
          category.sort_order
        ]);
        console.log(`  ✅ 创建分类: ${category.name} (${category.type})`);
      }
    }

    // 7. 确保uploads目录存在
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(__dirname, '../../uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('📁 创建 uploads 目录');
    }

    console.log('✅ 数据表初始化完成！');

    // 验证所有表
    const tables = await query('SHOW TABLES');
    const tableNames = tables.data.map(row => Object.values(row)[0]);
    
    console.log('\n📊 数据库表验证:');
    const importantTables = [
      'users',
      'categories', 
      'audios',
      'play_history',
      'favorites',
      'uploaded_files',
      'mailbox_threads',
      'mailbox_attachments',
      'stories',
      'story_play_history'
    ];

    importantTables.forEach(table => {
      const exists = tableNames.includes(table);
      console.log(`  ${exists ? '✅' : '❌'} ${table}`);
    });

    // 显示分类数据
    const categoryResult = await query('SELECT * FROM categories ORDER BY sort_order ASC');
    console.log('\n📂 分类数据:');
    if (categoryResult.success && categoryResult.data.length > 0) {
      categoryResult.data.forEach(cat => {
        console.log(`  📁 ${cat.name} (${cat.type}) - ${cat.description || '无描述'}`);
      });
    } else {
      console.log('  ⚠️ 暂无分类数据');
    }

  } catch (error) {
    console.error('❌ 初始化数据表失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initializeAllTables()
    .then(() => {
      console.log('🎉 脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { initializeAllTables };