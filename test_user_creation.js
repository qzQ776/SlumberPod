const config = require('./server/database/config');
const query = config.query;

// 测试数据库连接和查询
async function test() {
  try {
    console.log('测试数据库连接...');
    const result = await query('SELECT 1 as test');
    console.log('数据库连接成功:', result.success);
    
    // 检查users表是否存在
    const tablesResult = await query('SHOW TABLES LIKE \'users\'');
    console.log('检查users表是否存在:', tablesResult.success && tablesResult.data.length > 0);
    
    if (tablesResult.success && tablesResult.data.length > 0) {
      // 检查用户o4qN_1x4J8Gszzm_HZ5as6ht4-pw是否存在
      const userResult = await query('SELECT * FROM users WHERE openid = ?', ['o4qN_1x4J8Gszzm_HZ5as6ht4-pw']);
      console.log('检查用户是否存在:', userResult.success && userResult.data.length > 0);
      if (userResult.success && userResult.data.length > 0) {
        console.log('用户信息:', userResult.data[0]);
      } else {
        console.log('用户不存在，尝试手动创建用户...');
        
        // 尝试手动创建用户
        const createUserResult = await query(`
          INSERT INTO users (
            openid, nickname, avatar_url, gender, city, country, 
            province, language, session_key, settings
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          'o4qN_1x4J8Gszzm_HZ5as6ht4-pw',
          '用户_s6ht4-pw',
          '',
          0,
          '',
          '',
          '',
          'zh_CN',
          'w6Fra0ZjGK+QbhCjiUQcJw==',
          JSON.stringify({})
        ]);
        
        console.log('手动创建用户结果:', createUserResult);
        
        if (createUserResult.success) {
          console.log('用户创建成功!');
          // 再次查询确认
          const confirmResult = await query('SELECT * FROM users WHERE openid = ?', ['o4qN_1x4J8Gszzm_HZ5as6ht4-pw']);
          console.log('确认用户信息:', confirmResult.data[0]);
        }
      }
    }
  } catch (error) {
    console.error('测试失败:', error);
  }
}

test();