require('dotenv').config({ path: '../.env' });
const { query } = require('./database/config');

async function testFixedQuery() {
  console.log('🔍 测试修复后的SQL查询功能...');
  
  // 测试1：社区帖子查询（原始问题查询）
  console.log('\n📊 测试1：社区帖子查询');
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
  
  try {
    const result = await query(sql, params);
    console.log('✅ 社区帖子查询结果:', result);
    
    if (result.success && result.data) {
      console.log(`📊 查询到 ${result.data.length} 条帖子`);
      if (result.data.length > 0) {
        console.log('📄 示例帖子:', result.data[0]);
      }
    }
  } catch (error) {
    console.error('❌ 社区帖子查询失败:', error.message);
  }
  
  // 测试2：SHOW TABLES查询
  console.log('\n📊 测试2：SHOW TABLES查询');
  try {
    const result = await query('SHOW TABLES LIKE ?', ['posts']);
    console.log('✅ SHOW TABLES结果:', result);
  } catch (error) {
    console.error('❌ SHOW TABLES失败:', error.message);
  }
  
  // 测试3：简单的参数化查询
  console.log('\n📊 测试3：简单参数化查询');
  try {
    const result = await query('SELECT ? as test_param', ['test_value']);
    console.log('✅ 简单查询结果:', result);
  } catch (error) {
    console.error('❌ 简单查询失败:', error.message);
  }
  
  // 测试4：检查posts表数据
  console.log('\n📊 测试4：检查posts表数据');
  try {
    const result = await query('SELECT COUNT(*) as total FROM posts WHERE status = ?', ['published']);
    console.log('✅ posts表数据统计:', result);
    
    if (result.success && result.data) {
      console.log(`📊 已发布帖子数量: ${result.data[0].total}`);
      
      if (result.data[0].total > 0) {
        const sampleResult = await query('SELECT * FROM posts WHERE status = ? LIMIT 5', ['published']);
        console.log('📄 示例帖子数据:', sampleResult.data);
      } else {
        console.log('⚠️ 帖子表中暂无数据，这是查询返回空列表的原因');
      }
    }
  } catch (error) {
    console.error('❌ 数据检查失败:', error.message);
  }
}

testFixedQuery();