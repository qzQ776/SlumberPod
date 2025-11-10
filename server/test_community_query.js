const mysql = require('mysql2/promise');

async function testQuery() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Qi413040',
      database: 'slumberpod'
    });
    
    // 测试社区帖子查询
    const sql = `
      SELECT p.*, u.nickname, u.avatar_url,
             COUNT(DISTINCT l.id) as like_count,
             COUNT(DISTINCT c.id) as comment_count
      FROM community_posts p
      LEFT JOIN users u ON p.openid = u.openid
      LEFT JOIN post_likes l ON p.id = l.post_id AND l.is_active = 1
      LEFT JOIN post_comments c ON p.id = c.post_id AND c.is_active = 1
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT 10 OFFSET 0
    `;
    
    const [rows] = await connection.execute(sql);
    
    console.log('社区帖子查询成功！');
    console.log('查询结果数量:', rows.length);
    
    await connection.end();
  } catch (error) {
    console.log('查询错误:', error.message);
  }
}

testQuery();