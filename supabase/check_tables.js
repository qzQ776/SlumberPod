// 检查所有表的数据状态
const https = require('https');

const SUPABASE_URL = 'https://uhddqryjkororlxlqgna.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoZGRxcnlqa29yb3JseGxxZ25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU0MzI4MiwiZXhwIjoyMDc3MTE5MjgyfQ.MzyVhs2cPAHxEoV6dctanUQC2B0QKZBPp9v9L5FW2xk';

// 检查表数据的函数
function checkTableData(tableName) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'uhddqryjkororlxlqgna.supabase.co',
      path: `/rest/v1/${tableName}?select=*&limit=5`,
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
        if (res.statusCode === 200) {
          const result = JSON.parse(data || '[]');
          resolve({ tableName, count: result.length, data: result });
        } else if (res.statusCode === 404) {
          resolve({ tableName, count: 0, error: '表不存在' });
        } else {
          resolve({ tableName, count: 0, error: `HTTP ${res.statusCode}` });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ tableName, count: 0, error: error.message });
    });

    req.end();
  });
}

async function main() {
  console.log('正在检查Supabase数据库表状态...\n');
  
  // 需要检查的表列表
  const tables = [
    'profiles',
    'audio_categories', 
    'audios',
    'user_favorites',
    'sleep_records',
    'community_posts',
    'comments',
    'alarms',
    'dream_analysis',
    'user_creations',
    'play_history',
    'feedback_records'
  ];
  
  for (const table of tables) {
    const result = await checkTableData(table);
    
    if (result.error) {
      console.log(`❌ ${table}: ${result.error}`);
    } else if (result.count === 0) {
      console.log(`⚠️  ${table}: 表存在但无数据`);
    } else {
      console.log(`✅ ${table}: 有 ${result.count} 条记录`);
      
      // 显示前几条记录的关键信息
      if (result.count > 0) {
        const sample = result.data.slice(0, 2);
        sample.forEach((record, index) => {
          if (record.title) {
            console.log(`   ${index + 1}. ${record.title}`);
          } else if (record.username) {
            console.log(`   ${index + 1}. ${record.username}`);
          } else if (record.id) {
            console.log(`   ${index + 1}. ID: ${record.id.substring(0, 8)}...`);
          }
        });
      }
    }
  }
  
  console.log('\n检查完成！');
}

main();