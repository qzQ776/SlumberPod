const { query } = require('../config');

// 数据库迁移脚本 - 添加 is_user_creation 字段到 audios 表
async function addIsUserCreationField() {
  try {
    console.log('🔄 开始数据库迁移：添加 is_user_creation 字段到 audios 表...');
    
    // 检查字段是否已存在
    const checkSql = `
      SELECT COUNT(*) as count FROM information_schema.columns 
      WHERE table_name = 'audios' AND column_name = 'is_user_creation'
    `;
    
    const checkResult = await query(checkSql);
    
    if (checkResult.success && checkResult.data && checkResult.data[0].count > 0) {
      console.log('✅ is_user_creation 字段已存在，无需迁移');
      return { success: true, message: '字段已存在' };
    }
    
    // 添加 is_user_creation 字段
    const addFieldSql = `
      ALTER TABLE audios 
      ADD COLUMN is_user_creation tinyint(1) DEFAULT 0 COMMENT '是否为用户创作：1-是，0-否'
    `;
    
    console.log('📝 添加 is_user_creation 字段...');
    const addResult = await query(addFieldSql);
    
    if (!addResult.success) {
      throw new Error(`添加字段失败: ${addResult.error}`);
    }
    
    // 添加索引
    const addIndexSql = `
      ALTER TABLE audios 
      ADD INDEX idx_is_user_creation (is_user_creation)
    `;
    
    console.log('🔍 添加 is_user_creation 索引...');
    const indexResult = await query(addIndexSql);
    
    if (!indexResult.success) {
      throw new Error(`添加索引失败: ${indexResult.error}`);
    }
    
    // 更新现有数据的 is_user_creation 字段值
    // 根据 type 字段自动设置：如果 type = 'user_created'，则 is_user_creation = 1
    const updateDataSql = `
      UPDATE audios 
      SET is_user_creation = CASE 
        WHEN type = 'user_created' THEN 1 
        ELSE 0 
      END
    `;
    
    console.log('🔄 更新现有数据...');
    const updateResult = await query(updateDataSql);
    
    if (!updateResult.success) {
      throw new Error(`更新数据失败: ${updateResult.error}`);
    }
    
    console.log('✅ 数据库迁移完成！');
    return { 
      success: true, 
      message: 'is_user_creation 字段添加成功，数据已同步更新' 
    };
    
  } catch (error) {
    console.error('❌ 数据库迁移失败:', error.message);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// 如果直接运行此文件，则执行迁移
if (require.main === module) {
  addIsUserCreationField()
    .then(result => {
      if (result.success) {
        console.log('🎉 迁移成功！');
        process.exit(0);
      } else {
        console.error('❌ 迁移失败:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ 迁移异常:', error.message);
      process.exit(1);
    });
}

module.exports = {
  addIsUserCreationField
};