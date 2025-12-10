const { query } = require('./config');

async function createWhiteNoiseCombinationTable() {
  try {
    console.log('🎵 创建白噪音组合表...');

    // 创建音频组合表
    const createCombinationSql = `
      CREATE TABLE IF NOT EXISTS white_noise_combinations (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        openid VARCHAR(128) NOT NULL COMMENT '用户openid',
        name VARCHAR(255) NOT NULL COMMENT '组合名称',
        description TEXT NULL COMMENT '组合描述',
        audio_ids JSON NOT NULL COMMENT '音频ID列表，如[1,2,3]',
        play_mode ENUM('sequential', 'parallel', 'mixed') DEFAULT 'mixed' COMMENT '播放模式：顺序、并行、混合',
        volume_config JSON NULL COMMENT '音量配置，如{1: 0.8, 2: 0.5}',
        is_public TINYINT(1) DEFAULT 0 COMMENT '是否公开分享',
        play_count INT DEFAULT 0 COMMENT '播放次数',
        favorite_count INT DEFAULT 0 COMMENT '收藏次数',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_openid (openid),
        INDEX idx_created_at (created_at),
        INDEX idx_is_public (is_public),
        INDEX idx_play_count (play_count)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='白噪音组合表';
    `;

    await query(createCombinationSql);

    // 创建组合播放记录表
    const createPlayHistorySql = `
      CREATE TABLE IF NOT EXISTS combination_play_history (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        combination_id BIGINT NOT NULL COMMENT '组合ID',
        openid VARCHAR(128) NULL COMMENT '用户openid（可选，用于记录游客播放）',
        play_duration INT DEFAULT 0 COMMENT '播放时长（秒）',
        play_mode VARCHAR(20) NULL COMMENT '实际播放模式',
        device_info VARCHAR(255) NULL COMMENT '设备信息',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_combination_id (combination_id),
        INDEX idx_openid (openid),
        INDEX idx_created_at (created_at),
        
        FOREIGN KEY (combination_id) REFERENCES white_noise_combinations(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='组合播放记录表';
    `;

    await query(createPlayHistorySql);

    // 创建组合收藏表
    const createFavoriteSql = `
      CREATE TABLE IF NOT EXISTS combination_favorites (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        combination_id BIGINT NOT NULL COMMENT '组合ID',
        openid VARCHAR(128) NOT NULL COMMENT '用户openid',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE KEY uk_combination_user (combination_id, openid),
        INDEX idx_combination_id (combination_id),
        INDEX idx_openid (openid),
        
        FOREIGN KEY (combination_id) REFERENCES white_noise_combinations(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='组合收藏表';
    `;

    await query(createFavoriteSql);

    console.log('✅ 白噪音组合相关表创建成功！');

    // 验证表结构
    const tablesResult = await query(`
      SHOW TABLES LIKE '%combination%'
    `);
    
    console.log('\n📊 创建的表:');
    tablesResult.data.forEach(table => {
      console.log('  ✅ ' + Object.values(table)[0]);
    });

    console.log('\n🎯 功能说明:');
    console.log('1. white_noise_combinations - 存储用户创建的白噪音组合');
    console.log('2. combination_play_history - 记录组合播放历史');
    console.log('3. combination_favorites - 管理组合收藏关系');

  } catch (error) {
    console.error('❌ 创建白噪音组合表失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  createWhiteNoiseCombinationTable()
    .then(() => {
      console.log('🎉 脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { createWhiteNoiseCombinationTable };