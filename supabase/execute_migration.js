// 使用Supabase SQL API执行数据库迁移
const https = require('https');

// 配置信息
const SUPABASE_URL = 'https://uhddqryjkororlxlqgna.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoZGRxcnlqa29yb3JseGxxZ25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU0MzI4MiwiZXhwIjoyMDc3MTE5MjgyfQ.MzyVhs2cPAHxEoV6dctanUQC2B0QKZBPp9v9L5FW2xk';

// 读取SQL文件内容
const fs = require('fs');
const path = require('path');

// 执行SQL查询的函数
async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'uhddqryjkororlxlqgna.supabase.co',
      path: '/rest/v1/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Prefer': 'return=minimal'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ data: JSON.parse(data || '{}'), error: null });
        } else {
          reject({ error: { message: `HTTP ${res.statusCode}: ${data}` } });
        }
      });
    });

    req.on('error', (error) => {
      reject({ error });
    });

    // 发送SQL查询
    req.write(JSON.stringify({ query: sql }));
    req.end();
  });
}

async function executeMigration() {
  try {
    console.log('开始执行Supabase数据库迁移...');
    
    // 读取表结构文件
    const createTablesSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', '001_create_tables_with_auth.sql'), 
      'utf8'
    );
    
    // 读取示例数据文件
    const sampleDataSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', '002_insert_sample_data_with_auth.sql'), 
      'utf8'
    );
    
    // 读取用户数据文件
    const userDataSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', '003_insert_user_data.sql'), 
      'utf8'
    );
    
    console.log('正在创建数据库表结构...');
    
    // 执行表创建SQL
    try {
      const result = await executeSQL(createTablesSQL);
      console.log('表结构创建成功');
    } catch (error) {
      console.log('表创建错误:', error);
    }
    
    console.log('正在插入示例数据...');
    
    // 执行示例数据插入
    try {
      const result = await executeSQL(sampleDataSQL);
      console.log('示例数据插入成功');
    } catch (error) {
      console.log('示例数据插入错误:', error);
    }
    
    console.log('正在插入用户数据...');
    
    // 执行用户数据插入
    try {
      const result = await executeSQL(userDataSQL);
      console.log('用户数据插入成功');
    } catch (error) {
      console.log('用户数据插入错误:', error);
    }
    
    console.log('数据库迁移执行完成！');
    
  } catch (error) {
    console.error('迁移执行失败:', error);
  }
}

// 执行迁移
executeMigration();