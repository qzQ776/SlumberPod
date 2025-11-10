const { query } = require('./server/database/config');

async function testSqlQuery() {
  console.log('🔍 开始测试SQL查询...');
  
  // 测试1：原始SQL查询
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
  
  console.log('📝 SQL语句:', sql);
  console.log('🔢 参数:', params);
  console.log('📊 参数类型检查:');
  console.log('  status:', typeof params[0], params[0]);
  console.log('  limit:', typeof params[1], params[1]);
  console.log('  offset:', typeof params[2], params[2]);
  
  try {
    const result = await query(sql, params);
    console.log('✅ 查询结果:', result);
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
  }
  
  // 测试2：检查数据库表结构
  console.log('\n🔍 检查数据库表结构...');
  
  const tables = ['posts', 'users', 'audios'];
  
  for (const table of tables) {
    try {
      const result = await query(`SHOW TABLES LIKE ?`, [table]);
      console.log(`📊 表 ${table}:`, result.success ? '存在' : '不存在');
      
      if (result.success && result.data && result.data.length > 0) {
        const descResult = await query(`DESCRIBE ${table}`);
        console.log(`  表结构:`, descResult.data ? descResult.data.length + '个字段' : '无数据');
      }
    } catch (error) {
      console.error(`❌ 检查表 ${table} 失败:`, error.message);
    }
  }
  
  // 测试3：检查posts表中是否有数据
  console.log('\n🔍 检查posts表数据...');
  
  try {
    const countResult = await query(`SELECT COUNT(*) as total FROM posts WHERE status = ?`, ['published']);
    console.log('📊 已发布帖子数量:', countResult.data ? countResult.data[0].total : 0);
    
    if (countResult.data && countResult.data[0].total > 0) {
      const sampleResult = await query(`SELECT * FROM posts WHERE status = ? LIMIT 5`, ['published']);
      console.log('📄 示例数据:', sampleResult.data);
    }
  } catch (error) {
    console.error('❌ 检查posts数据失败:', error.message);
  }
}

async function main() {
  try {
    await testSqlQuery();
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

main();