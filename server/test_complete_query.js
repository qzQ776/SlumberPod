require('dotenv').config({ path: '../.env' });
const { query } = require('./database/config');

async function testCompleteQuery() {
  console.log('🔍 测试完整的帖子查询功能...\n');
  
  // 测试完整的帖子查询SQL
  const sql = `
    SELECT
      p.post_id,
      p.author_openid as openid,
      p.title,
      p.content,
      p.cover_image as cover_url,
      p.audio_id,
      p.like_count,
      p.comment_count,
      p.status,
      p.created_at,
      p.updated_at,
      u.nickname,
      u.avatar_url,
      a.title as audio_title,
      a.cover_url as audio_cover
    FROM posts p
    LEFT JOIN users u ON p.author_openid = u.openid
    LEFT JOIN audios a ON p.audio_id = a.audio_id
    WHERE p.status = ?
    ORDER BY p.created_at DESC LIMIT ? OFFSET ?
  `;
  
  const params = ['published', 20, 0];
  
  console.log('📊 执行完整查询...');
  console.log('SQL:', sql.replace(/\s+/g, ' ').trim());
  console.log('参数:', params);
  
  try {
    const result = await query(sql, params);
    console.log('✅ 查询结果:', JSON.stringify(result, null, 2));
    
    if (result.success && result.data) {
      console.log(`📊 查询到 ${result.data.length} 条帖子`);
      if (result.data.length > 0) {
        console.log('📝 第一条帖子信息:');
        console.log('  - 标题:', result.data[0].title);
        console.log('  - 作者:', result.data[0].nickname);
        console.log('  - 状态:', result.data[0].status);
      }
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
  }
}

async function testAllTables() {
  console.log('\n🔍 检查所有相关表是否存在...');
  
  const tables = ['posts', 'users', 'audios'];
  
  for (const table of tables) {
    const result = await query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
    `, [process.env.MYSQL_DATABASE, table]);
    
    if (result.success && result.data.length > 0) {
      console.log(`✅ ${table}表存在`);
    } else {
      console.log(`❌ ${table}表不存在`);
    }
  }
}

async function main() {
  console.log('🎯 开始完整测试...\n');
  
  await testAllTables();
  await testCompleteQuery();
  
  console.log('\n🎉 测试完成！');
}

main().catch(console.error);