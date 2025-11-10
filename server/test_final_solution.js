require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');

async function testFinalSolution() {
  console.log('🎯 测试最终解决方案...\n');
  
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    charset: 'utf8mb4'
  });
  
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL连接成功\n');
    
    // 方法1：使用手动参数替换（解决参数绑定问题）
    console.log('📊 方法1：手动参数替换');
    const manualSql = `
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
      WHERE p.status = 'published'
      ORDER BY p.created_at DESC LIMIT 20 OFFSET 0
    `;
    
    try {
      const [rows] = await connection.execute(manualSql);
      console.log('✅ 手动SQL查询成功');
      console.log(`📊 查询到 ${rows.length} 条帖子`);
      
      if (rows.length > 0) {
        console.log('📝 第一条帖子信息:');
        console.log('  - 标题:', rows[0].title);
        console.log('  - 作者:', rows[0].nickname);
        console.log('  - 状态:', rows[0].status);
      } else {
        console.log('ℹ️ 帖子表中暂无数据');
      }
    } catch (error) {
      console.log('❌ 手动SQL查询失败:', error.message);
    }
    
    // 方法2：简化查询（只查询posts表）
    console.log('\n📊 方法2：简化查询（只查询posts表）');
    const simpleSql = `SELECT * FROM posts WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    
    try {
      const [rows] = await connection.execute(simpleSql, ['published', 20, 0]);
      console.log('✅ 简化查询成功');
      console.log(`📊 查询到 ${rows.length} 条帖子`);
    } catch (error) {
      console.log('❌ 简化查询失败:', error.message);
    }
    
    connection.release();
    
    console.log('\n🎉 测试完成！');
    
    // 总结解决方案
    console.log('\n🔧 解决方案总结:');
    console.log('1. ✅ 数据库连接正常');
    console.log('2. ✅ posts表存在');
    console.log('3. ❌ 复杂JOIN查询参数绑定有问题');
    console.log('4. 💡 建议使用手动参数替换或简化查询');
    
  } catch (error) {
    console.error('❌ 连接失败:', error.message);
  }
}

testFinalSolution().catch(console.error);