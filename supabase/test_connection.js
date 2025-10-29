// 测试Supabase连接并执行简单查询
const https = require('https');

const SUPABASE_URL = 'https://uhddqryjkororlxlqgna.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoZGRxcnlqa29yb3JseGxxZ25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU0MzI4MiwiZXhwIjoyMDc3MTE5MjgyfQ.MzyVhs2cPAHxEoV6dctanUQC2B0QKZBPp9v9L5FW2xk';

// 测试连接
function testConnection() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'uhddqryjkororlxlqgna.supabase.co',
      path: '/rest/v1/',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('连接测试响应状态:', res.statusCode);
        console.log('响应数据:', data.substring(0, 200) + '...');
        resolve({ statusCode: res.statusCode, data: data });
      });
    });

    req.on('error', (error) => {
      console.error('连接测试失败:', error);
      reject(error);
    });

    req.end();
  });
}

// 执行简单查询
function executeSimpleQuery() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'uhddqryjkororlxlqgna.supabase.co',
      path: '/rest/v1/profiles?select=*&limit=1',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('查询测试响应状态:', res.statusCode);
        console.log('查询结果:', data);
        resolve({ statusCode: res.statusCode, data: data });
      });
    });

    req.on('error', (error) => {
      console.error('查询测试失败:', error);
      reject(error);
    });

    req.end();
  });
}

async function main() {
  try {
    console.log('正在测试Supabase连接...');
    await testConnection();
    
    console.log('\n正在执行简单查询测试...');
    await executeSimpleQuery();
    
    console.log('\n测试完成！');
  } catch (error) {
    console.error('测试过程中出现错误:', error);
  }
}

main();