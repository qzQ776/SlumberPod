const mysql = require('mysql2/promise');
const config = require('./server/database/config');

async function testSearchHistory() {
  try {
    console.log('🔍 测试搜索历史功能...\n');
    
    const connection = await mysql.createConnection(config);
    
    // 检查表是否存在
    const [tables] = await connection.execute('SHOW TABLES LIKE "search_history"');
    console.log('📊 表存在检查:', tables.length > 0 ? '✅ 存在' : '❌ 不存在');
    
    if (tables.length > 0) {
      // 检查表结构
      const [columns] = await connection.execute('DESCRIBE search_history');
      console.log('\n📋 表结构:');
      columns.forEach(col => {
        console.log(`  ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? '可空' : '非空'}`);
      });
      
      // 测试数据插入
      console.log('\n🧪 测试数据插入...');
      try {
        const [result] = await connection.execute(
          'INSERT INTO search_history (openid, keyword, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
          ['test_openid_123', '测试关键词']
        );
        console.log('✅ 数据插入成功, ID:', result.insertId);
        
        // 测试查询
        const [rows] = await connection.execute('SELECT * FROM search_history WHERE openid = ?', ['test_openid_123']);
        console.log('✅ 数据查询成功, 记录数:', rows.length);
        
        // 清理测试数据
        await connection.execute('DELETE FROM search_history WHERE openid = ?', ['test_openid_123']);
        console.log('✅ 测试数据清理完成');
        
      } catch (error) {
        console.log('❌ 数据操作失败:', error.message);
      }
    }
    
    await connection.end();
    console.log('\n🎯 测试完成！');
    
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
  }
}

testSearchHistory();