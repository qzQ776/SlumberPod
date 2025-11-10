/**
 * 简单的手动参数替换测试
 */

require('dotenv').config({ path: '../.env' });
const { query, manualParameterReplace } = require('./server/database/config');

// 测试手动参数替换函数
console.log('🔧 测试手动参数替换函数:');
const sql = 'SELECT * FROM users WHERE openid = ? AND nickname = ?';
const params = ['test123', '张三'];
const replaced = manualParameterReplace(sql, params);
console.log('原始SQL:', sql);
console.log('替换后SQL:', replaced);
console.log('');

// 测试数据库查询
async function testQuery() {
  console.log('📊 测试数据库查询:');
  
  // 方法1：手动参数替换模式
  const result1 = await query('SELECT * FROM posts WHERE status = ? LIMIT ?', 
    ['published', 3], 
    { useManualReplace: true }
  );
  
  console.log('手动模式结果:', result1.success ? '成功' : '失败');
  if (result1.success) {
    console.log('查询到记录数:', result1.data ? result1.data.length : 0);
  }
  
  // 方法2：普通模式（对比）
  const result2 = await query('SELECT * FROM posts WHERE status = ? LIMIT ?', 
    ['published', 3]
  );
  
  console.log('普通模式结果:', result2.success ? '成功' : '失败');
  console.log('两种模式结果一致:', result1.success === result2.success);
}

testQuery().catch(console.error);