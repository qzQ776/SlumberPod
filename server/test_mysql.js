require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');

async function testMySQL() {
  console.log('🔍 测试MySQL连接和参数绑定...');
  
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
    console.log('✅ MySQL连接成功');
    
    // 测试1：简单查询
    console.log('\n📊 测试1：简单查询');
    const [rows1] = await connection.execute('SELECT 1 as test');
    console.log('✅ 简单查询结果:', rows1);
    
    // 测试2：参数化查询
    console.log('\n📊 测试2：参数化查询');
    const [rows2] = await connection.execute('SELECT ? as param1, ? as param2', ['test', 123]);
    console.log('✅ 参数化查询结果:', rows2);
    
    // 测试3：SHOW TABLES查询
    console.log('\n📊 测试3：SHOW TABLES查询');
    try {
      const [tables] = await connection.execute('SHOW TABLES LIKE ?', ['posts']);
      console.log('✅ SHOW TABLES结果:', tables);
    } catch (error) {
      console.error('❌ SHOW TABLES失败:', error.message);
    }
    
    // 测试4：检查posts表是否存在
    console.log('\n📊 测试4：检查posts表是否存在');
    try {
      const [tables] = await connection.execute(
        'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
        [process.env.MYSQL_DATABASE, 'posts']
      );
      console.log('✅ 表检查结果:', tables);
      
      if (tables.length > 0) {
        console.log('✅ posts表存在');
      } else {
        console.log('⚠️ posts表不存在');
      }
    } catch (error) {
      console.error('❌ 表检查失败:', error.message);
    }
    
    connection.release();
  } catch (error) {
    console.error('❌ 连接失败:', error.message);
  }
}

testMySQL();