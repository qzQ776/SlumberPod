require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');

async function debugDetailed() {
  console.log('🔍 详细调试参数绑定问题...\n');
  
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
    
    console.log('📊 SQL语句分析:');
    console.log('  - 占位符数量:', (sql.match(/\?/g) || []).length);
    console.log('  - 参数数量:', params.length);
    console.log('  - 参数类型:', params.map(p => typeof p));
    console.log('');
    
    // 测试1：简化SQL查询
    console.log('📊 测试1：简化SQL查询（移除OFFSET）');
    const simpleSql1 = sql.replace('LIMIT ? OFFSET ?', 'LIMIT ?');
    const simpleParams1 = ['published', 20];
    
    try {
      const [rows1] = await connection.execute(simpleSql1, simpleParams1);
      console.log('✅ 简化查询1成功，结果长度:', rows1.length);
    } catch (error) {
      console.log('❌ 简化查询1失败:', error.message);
    }
    
    // 测试2：更简单的查询
    console.log('\n📊 测试2：更简单的查询（只有WHERE条件）');
    const simpleSql2 = `SELECT * FROM posts WHERE status = ?`;
    
    try {
      const [rows2] = await connection.execute(simpleSql2, ['published']);
      console.log('✅ 简化查询2成功，结果长度:', rows2.length);
    } catch (error) {
      console.log('❌ 简化查询2失败:', error.message);
    }
    
    // 测试3：测试LIMIT OFFSET语法
    console.log('\n📊 测试3：测试LIMIT OFFSET语法');
    const simpleSql3 = `SELECT * FROM posts LIMIT ? OFFSET ?`;
    
    try {
      const [rows3] = await connection.execute(simpleSql3, [20, 0]);
      console.log('✅ LIMIT OFFSET查询成功，结果长度:', rows3.length);
    } catch (error) {
      console.log('❌ LIMIT OFFSET查询失败:', error.message);
    }
    
    // 测试4：手动构建SQL（不使用参数绑定）
    console.log('\n📊 测试4：手动构建SQL（不使用参数绑定）');
    const manualSql = sql.replace('?', "'published'").replace('?', '20').replace('?', '0');
    
    try {
      const [rows4] = await connection.execute(manualSql);
      console.log('✅ 手动构建SQL成功，结果长度:', rows4.length);
    } catch (error) {
      console.log('❌ 手动构建SQL失败:', error.message);
    }
    
    // 测试5：检查posts表结构
    console.log('\n📊 测试5：检查posts表结构');
    try {
      const [columns] = await connection.execute(`DESCRIBE posts`);
      console.log('✅ posts表结构:');
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} (${col.Null})`);
      });
    } catch (error) {
      console.log('❌ 检查表结构失败:', error.message);
    }
    
    connection.release();
  } catch (error) {
    console.error('❌ 连接失败:', error.message);
  }
}

debugDetailed().catch(console.error);