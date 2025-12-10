// 添加selected_audio_ids字段到play_history表
// 用于支持组合音频中部分音频播放的选择

const { query } = require('./config');

async function addSelectedAudioIdsField() {
  try {
    console.log('正在为play_history表添加selected_audio_ids字段...');
    
    // 检查字段是否已存在
    const checkFieldSql = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'play_history' 
      AND COLUMN_NAME = 'selected_audio_ids'
      AND TABLE_SCHEMA = DATABASE()
    `;
    
    const checkResult = await query(checkFieldSql);
    
    if (checkResult.success && checkResult.data.length > 0) {
      console.log('selected_audio_ids字段已存在，跳过添加');
      return { success: true, message: '字段已存在' };
    }
    
    // 添加字段
    const alterSql = `
      ALTER TABLE play_history 
      ADD COLUMN selected_audio_ids json DEFAULT NULL COMMENT '用户选择的音频ID列表（用于组合播放）'
    `;
    
    const result = await query(alterSql);
    
    if (!result.success) {
      throw new Error(`添加字段失败: ${result.error}`);
    }
    
    console.log('✅ 成功添加selected_audio_ids字段到play_history表');
    return { success: true, message: '字段添加成功' };
    
  } catch (error) {
    console.error('❌ 添加selected_audio_ids字段失败:', error);
    return { success: false, error: error.message };
  }
}

// 如果直接运行此文件，则执行迁移
if (require.main === module) {
  addSelectedAudioIdsField()
    .then(result => {
      if (result.success) {
        console.log('✅ 数据库迁移成功完成');
        process.exit(0);
      } else {
        console.error('❌ 数据库迁移失败:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ 数据库迁移异常:', error);
      process.exit(1);
    });
}

module.exports = { addSelectedAudioIdsField };