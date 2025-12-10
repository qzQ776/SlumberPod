const { query } = require('./config');

async function addMissingTables() {
  try {
    console.log('🔨 检查并添加缺失的数据表...');

    // 创建 uploaded_files 表（用于文件上传记录）
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
        INDEX idx_file_type (file_type),
        FOREIGN KEY (openid) REFERENCES users(openid) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文件上传记录表';
    `;
    await query(uploadedFilesSql);

    // 更新 categories 表，添加缺失字段
    console.log('🏷️ 更新 categories 表...');
    await query(`
      ALTER TABLE categories 
      ADD COLUMN IF NOT EXISTS icon VARCHAR(100) NULL COMMENT '分类图标',
      ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0 COMMENT '排序权重',
      ADD COLUMN IF NOT EXISTS type ENUM('general', 'study', 'story', 'sleep') DEFAULT 'general' COMMENT '分类类型'
    `);

    // 为 categories 表插入默认数据
    console.log('📚 插入默认分类数据...');
    const categoriesToInsert = [
      { name: '通用音频', description: '各种类型的音频内容', type: 'general', sort_order: 1 },
      { name: '学习专注', description: '适合学习和专注的音频', type: 'study', sort_order: 2 },
      { name: '睡眠故事', description: '帮助睡眠的睡前故事', type: 'story', sort_order: 3 },
      { name: '助眠音乐', description: '帮助睡眠的音乐', type: 'sleep', sort_order: 4 },
      { name: '白噪音', description: '各种类型的白噪音', type: 'study', sort_order: 5 },
      { name: '冥想引导', description: '冥想和放松指导', type: 'sleep', sort_order: 6 }
    ];

    for (const category of categoriesToInsert) {
      // 检查分类是否已存在
      const existingResult = await query(
        'SELECT category_id FROM categories WHERE name = ? AND type = ?',
        [category.name, category.type]
      );

      if (existingResult.success && existingResult.data.length === 0) {
        await query(`
          INSERT INTO categories (name, description, type, sort_order, created_at)
          VALUES (?, ?, ?, ?, NOW())
        `, [
          category.name,
          category.description,
          category.type,
          category.sort_order
        ]);
      }
    }

    // 确保所有必要的索引存在
    console.log('🔍 检查和创建索引...');
    
    const indexes = [
      // audios 表索引
      'ALTER TABLE audios ADD INDEX IF NOT EXISTS idx_category_id (category_id)',
      'ALTER TABLE audios ADD INDEX IF NOT EXISTS idx_status (status)',
      'ALTER TABLE audios ADD INDEX IF NOT EXISTS idx_created_at (created_at)',
      'ALTER TABLE audios ADD INDEX IF NOT EXISTS idx_play_count (play_count)',
      'ALTER TABLE audios ADD INDEX IF NOT EXISTS idx_like_count (like_count)',
      
      // play_history 表索引
      'ALTER TABLE play_history ADD INDEX IF NOT EXISTS idx_play_type (play_type)',
      'ALTER TABLE play_history ADD INDEX IF NOT EXISTS idx_audio_id (audio_id)',
      'ALTER TABLE play_history ADD INDEX IF NOT EXISTS idx_created_at (created_at)',
      
      // favorites 表索引
      'ALTER TABLE favorites ADD INDEX IF NOT EXISTS idx_favorite_type (favorite_type)',
      'ALTER TABLE favorites ADD INDEX IF NOT EXISTS idx_created_at (created_at)',
      
      // categories 表索引
      'ALTER TABLE categories ADD INDEX IF NOT EXISTS idx_type (type)',
      'ALTER TABLE categories ADD INDEX IF NOT EXISTS idx_sort_order (sort_order)'
    ];

    for (const indexSql of indexes) {
      try {
        await query(indexSql);
      } catch (error) {
        console.log(`⚠️ 索引可能已存在: ${error.message}`);
      }
    }

    console.log('✅ 数据表结构更新完成！');

    // 验证表是否创建成功
    const tables = await query('SHOW TABLES');
    const tableNames = tables.data.map(row => Object.values(row)[0]);
    
    const requiredTables = [
      'uploaded_files',
      'categories',
      'audios',
      'play_history',
      'favorites',
      'users'
    ];

    console.log('\n📊 表验证:');
    requiredTables.forEach(table => {
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
    console.error('❌ 添加缺失表失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  addMissingTables()
    .then(() => {
      console.log('🎉 脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { addMissingTables };