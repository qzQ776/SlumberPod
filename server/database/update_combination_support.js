const { query } = require('./config');

/**
 * 更新播放历史表以支持组合形式
 */
async function updatePlayHistoryTable() {
  try {
    console.log('🔄 更新播放历史表结构以支持组合形式...');
    
    // 检查是否已存在这些字段
    const checkColumns = await query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'play_history'
      AND COLUMN_NAME IN ('combination_id', 'selected_audio_ids', 'play_mode')
    `);
    
    if (!checkColumns.success) {
      throw new Error('检查表结构失败: ' + checkColumns.error);
    }
    
    const existingColumns = checkColumns.data.map(col => col.COLUMN_NAME);
    
    // 添加缺失的字段
    if (!existingColumns.includes('combination_id')) {
      console.log('📝 添加 combination_id 字段...');
      await query(`
        ALTER TABLE play_history 
        ADD COLUMN combination_id bigint(20) DEFAULT NULL 
        COMMENT '摇骰子组合ID（可选）'
      `);
    }
    
    if (!existingColumns.includes('selected_audio_ids')) {
      console.log('📝 添加 selected_audio_ids 字段...');
      await query(`
        ALTER TABLE play_history 
        ADD COLUMN selected_audio_ids json DEFAULT NULL 
        COMMENT '用户选择播放的音频ID数组'
      `);
    }
    
    if (!existingColumns.includes('play_mode')) {
      console.log('📝 添加 play_mode 字段...');
      await query(`
        ALTER TABLE play_history 
        ADD COLUMN play_mode varchar(20) DEFAULT 'parallel' 
        COMMENT '播放模式：parallel-并行，sequential-顺序'
      `);
    }
    
    // 更新现有数据（为旧数据设置默认值）
    console.log('🔄 更新现有记录的默认值...');
    await query(`
      UPDATE play_history 
      SET 
        selected_audio_ids = JSON_EXTRACT(audio_ids, '$'),
        play_mode = 'parallel'
      WHERE selected_audio_ids IS NULL
    `);
    
    console.log('✅ 播放历史表结构更新完成');
    
  } catch (error) {
    console.error('❌ 更新播放历史表失败:', error);
    throw error;
  }
}

/**
 * 更新收藏表以支持组合形式
 */
async function updateFavoriteTable() {
  try {
    console.log('🔄 更新收藏表结构以支持组合形式...');
    
    // 检查是否已存在这些字段
    const checkColumns = await query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'favorites'
      AND COLUMN_NAME IN ('combination_id', 'selected_audio_ids', 'audio_count', 'selected_count')
    `);
    
    if (!checkColumns.success) {
      throw new Error('检查收藏表结构失败: ' + checkColumns.error);
    }
    
    const existingColumns = checkColumns.data.map(col => col.COLUMN_NAME);
    
    // 添加缺失的字段
    if (!existingColumns.includes('combination_id')) {
      console.log('📝 添加 favorites.combination_id 字段...');
      await query(`
        ALTER TABLE favorites 
        ADD COLUMN combination_id bigint(20) DEFAULT NULL 
        COMMENT '摇骰子组合ID（可选）'
      `);
    }
    
    if (!existingColumns.includes('selected_audio_ids')) {
      console.log('📝 添加 favorites.selected_audio_ids 字段...');
      await query(`
        ALTER TABLE favorites 
        ADD COLUMN selected_audio_ids json DEFAULT NULL 
        COMMENT '用户选择收藏的音频ID数组'
      `);
    }
    
    if (!existingColumns.includes('audio_count')) {
      console.log('📝 添加 favorites.audio_count 字段...');
      await query(`
        ALTER TABLE favorites 
        ADD COLUMN audio_count int(11) DEFAULT 0 
        COMMENT '组合中的音频总数'
      `);
    }
    
    if (!existingColumns.includes('selected_count')) {
      console.log('📝 添加 favorites.selected_count 字段...');
      await query(`
        ALTER TABLE favorites 
        ADD COLUMN selected_count int(11) DEFAULT 0 
        COMMENT '用户选择的音频数量'
      `);
    }
    
    console.log('✅ 收藏表结构更新完成');
    
  } catch (error) {
    console.error('❌ 更新收藏表失败:', error);
    throw error;
  }
}

/**
 * 创建组合音频表
 */
async function createCombinationTable() {
  try {
    console.log('🔄 创建组合音频表...');
    
    const sql = `
      CREATE TABLE IF NOT EXISTS audio_combinations (
        combination_id bigint(20) NOT NULL AUTO_INCREMENT,
        combination_name varchar(255) DEFAULT NULL COMMENT '组合名称',
        audio_ids json NOT NULL COMMENT '组合中的音频ID数组',
        selected_audio_ids json NOT NULL COMMENT '用户选择播放的音频ID数组',
        audio_count int(11) DEFAULT 0 COMMENT '组合中的音频总数',
        selected_count int(11) DEFAULT 0 COMMENT '用户选择的音频数量',
        play_mode varchar(20) DEFAULT 'parallel' COMMENT '播放模式：parallel-并行，sequential-顺序',
        category_id int(11) DEFAULT NULL COMMENT '主要分类ID',
        cover_url varchar(500) DEFAULT NULL COMMENT '组合封面URL',
        description text DEFAULT NULL COMMENT '组合描述',
        creator_openid varchar(128) DEFAULT NULL COMMENT '创建者openid',
        is_public tinyint(1) DEFAULT 1 COMMENT '是否公开：1-是，0-否',
        play_count int(11) DEFAULT 0 COMMENT '播放次数',
        favorite_count int(11) DEFAULT 0 COMMENT '收藏次数',
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (combination_id),
        KEY idx_category (category_id) COMMENT '分类查询索引',
        KEY idx_creator (creator_openid) COMMENT '创建者查询索引',
        KEY idx_public (is_public) COMMENT '公开状态查询索引',
        KEY idx_play_count (play_count) COMMENT '播放次数排序索引',
        KEY idx_created (created_at) COMMENT '创建时间排序索引',
        CONSTRAINT fk_combination_creator FOREIGN KEY (creator_openid) REFERENCES users(openid) ON DELETE CASCADE,
        CONSTRAINT fk_combination_category FOREIGN KEY (category_id) REFERENCES audio_categories(category_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='音频组合表';
    `;
    
    const result = await query(sql);
    if (!result.success) {
      throw new Error('创建组合音频表失败: ' + result.error);
    }
    
    console.log('✅ 组合音频表创建完成');
    
  } catch (error) {
    console.error('❌ 创建组合音频表失败:', error);
    throw error;
  }
}

/**
 * 执行数据库更新
 */
async function updateDatabaseForCombinationSupport() {
  try {
    console.log('🔄 开始更新数据库以支持音频组合形式...');
    
    await updatePlayHistoryTable();
    await updateFavoriteTable();
    await createCombinationTable();
    
    console.log('✅ 数据库更新完成，已支持音频组合形式');
    
  } catch (error) {
    console.error('❌ 数据库更新失败:', error);
    throw error;
  }
}

module.exports = {
  updateDatabaseForCombinationSupport,
  updatePlayHistoryTable,
  updateFavoriteTable,
  createCombinationTable
};