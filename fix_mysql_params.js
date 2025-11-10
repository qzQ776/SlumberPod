const mysql = require('mysql2/promise');
require('dotenv').config();

async function testMySQLParams() {
  console.log('🔍 测试MySQL参数绑定问题...');
  
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    charset: 'utf8mb4',
    timezone: '+08:00'
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
    
    // 测试3：SHOW TABLES 查询
    console.log('\n📊 测试3：SHOW TABLES 查询');
    try {
      const [rows3] = await connection.execute('SHOW TABLES LIKE ?', ['posts']);
      console.log('✅ SHOW TABLES 结果:', rows3);
    } catch (error) {
      console.error('❌ SHOW TABLES 失败:', error.message);
    }
    
    // 测试4：直接查询表是否存在
    console.log('\n📊 测试4：直接查询表是否存在');
    try {
      const [rows4] = await connection.execute(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      `, [process.env.MYSQL_DATABASE, 'posts']);
      console.log('✅ 表检查结果:', rows4);
    } catch (error) {
      console.error('❌ 表检查失败:', error.message);
    }
    
    // 测试5：创建测试表（如果不存在）
    console.log('\n📊 测试5：检查或创建测试表');
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS test_params (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255),
          value INT
        )
      `);
      console.log('✅ 测试表创建/检查完成');
      
      // 插入测试数据
      await connection.execute('INSERT INTO test_params (name, value) VALUES (?, ?)', ['test1', 100]);
      
      // 查询测试数据
      const [rows5] = await connection.execute('SELECT * FROM test_params WHERE name = ?', ['test1']);
      console.log('✅ 测试数据查询结果:', rows5);
      
    } catch (error) {
      console.error('❌ 测试表操作失败:', error.message);
    }
    
    connection.release();
    
    // 测试6：使用config.js中的query函数
    console.log('\n📊 测试6：使用config.js中的query函数');
    const { query } = require('./server/database/config');
    
    const result = await query('SELECT ? as test_param', ['config_test']);
    console.log('✅ config.js query结果:', result);
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

async function main() {
  console.log('🔍 环境变量检查:');
  console.log('  MYSQL_HOST:', process.env.MYSQL_HOST);
  console.log('  MYSQL_PORT:', process.env.MYSQL_PORT);
  console.log('  MYSQL_USER:', process.env.MYSQL_USER);
  console.log('  MYSQL_DATABASE:', process.env.MYSQL_DATABASE);
  
  await testMySQLParams();
}

main();