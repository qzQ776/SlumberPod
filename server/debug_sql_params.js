require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');

async function debugSQLParams() {
  console.log('🔍 调试SQL参数绑定问题...\n');
  
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
    
    // 原始SQL查询
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
    
    console.log('📊 测试1：直接执行SQL（不带参数）');
    try {
      const [rows] = await connection.execute(sql.replace(/\?/g, 'NULL'));
      console.log('✅ 直接执行成功，结果长度:', rows.length);
    } catch (error) {
      console.log('❌ 直接执行失败:', error.message);
    }
    
    console.log('\n📊 测试2：逐个参数测试');
    
    // 测试第一个参数：status
    try {
      const testSql1 = `SELECT * FROM posts WHERE status = ? LIMIT 1`;
      const [rows1] = await connection.execute(testSql1, ['published']);
      console.log('✅ 状态参数测试成功，结果:', rows1.length);
    } catch (error) {
      console.log('❌ 状态参数测试失败:', error.message);
    }
    
    // 测试LIMIT参数
    try {
      const testSql2 = `SELECT * FROM posts LIMIT ?`;
      const [rows2] = await connection.execute(testSql2, [20]);
      console.log('✅ LIMIT参数测试成功，结果:', rows2.length);
    } catch (error) {
      console.log('❌ LIMIT参数测试失败:', error.message);
    }
    
    // 测试OFFSET参数
    try {
      const testSql3 = `SELECT * FROM posts LIMIT 10 OFFSET ?`;
      const [rows3] = await connection.execute(testSql3, [0]);
      console.log('✅ OFFSET参数测试成功，结果:', rows3.length);
    } catch (error) {
      console.log('❌ OFFSET参数测试失败:', error.message);
    }
    
    console.log('\n📊 测试3：完整参数化查询');
    try {
      const [rows] = await connection.execute(sql, params);
      console.log('✅ 完整查询成功，结果长度:', rows.length);
    } catch (error) {
      console.log('❌ 完整查询失败:', error.message);
      console.log('  错误详情:', error);
    }
    
    connection.release();
  } catch (error) {
    console.error('❌ 连接失败:', error.message);
  }
}

debugSQLParams().catch(console.error);