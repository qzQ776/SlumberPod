const mysql = require('mysql2/promise');

async function addMissingFields() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Qi413040',
      database: 'slumberpod'
    });
    
    // 添加 post_likes 表的 is_active 字段
    await connection.execute("ALTER TABLE post_likes ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否有效：1-是，0-否'");
    
    // 添加 post_comments 表的 is_active 字段
    await connection.execute("ALTER TABLE post_comments ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否有效：1-是，0-否'");
    
    console.log('缺失字段添加成功！');
    
    await connection.end();
  } catch (error) {
    console.log('添加字段错误:', error.message);
  }
}

addMissingFields();