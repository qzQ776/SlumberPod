const axios = require('axios');

// 测试配置
const BASE_URL = 'http://localhost:3003';
const TEST_USER_OPENID = 'test_alarm_user_123';

// 创建测试请求实例
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 模拟认证中间件（实际使用时需要真实token）
api.interceptors.request.use((config) => {
  // 在实际应用中，这里应该设置真实的JWT token
  // config.headers.Authorization = `Bearer ${token}`
  
  // 模拟设置openid
  config.headers['X-Test-Openid'] = TEST_USER_OPENID;
  
  return config;
});

async function testAlarmAPIs() {
  console.log('🔧 开始测试闹钟功能API...\n');
  
  try {
    // 1. 测试健康检查
    console.log('1. 测试健康检查...');
    const healthResponse = await api.get('/api/health');
    console.log('✅ 健康检查:', healthResponse.data.message);
    
    // 2. 创建测试闹钟
    console.log('\n2. 创建测试闹钟...');
    const createAlarmData = {
      label: '测试闹钟',
      alarm_time: new Date(Date.now() + 3600000).toISOString(), // 1小时后
      repeat_days: '1,2,3,4,5',
      snooze_duration: 5,
      vibration: true,
      volume: 80
    };
    
    const createResponse = await api.post('/api/alarms', createAlarmData);
    console.log('✅ 创建闹钟成功:', createResponse.data.message);
    const alarmId = createResponse.data.data.alarm_id;
    
    // 3. 获取所有闹钟
    console.log('\n3. 获取所有闹钟...');
    const listResponse = await api.get('/api/alarms');
    console.log('✅ 获取闹钟成功，数量:', listResponse.data.count);
    
    // 4. 获取闹钟详情
    console.log('\n4. 获取闹钟详情...');
    const detailResponse = await api.get(`/api/alarms/${alarmId}`);
    console.log('✅ 获取详情成功:', detailResponse.data.data.label);
    
    // 5. 更新闹钟
    console.log('\n5. 更新闹钟...');
    const updateResponse = await api.put(`/api/alarms/${alarmId}`, {
      label: '更新后的测试闹钟',
      volume: 90
    });
    console.log('✅ 更新闹钟成功:', updateResponse.data.message);
    
    // 6. 禁用闹钟
    console.log('\n6. 禁用闹钟...');
    const disableResponse = await api.patch(`/api/alarms/${alarmId}/toggle`, {
      enabled: false
    });
    console.log('✅ 禁用闹钟成功:', disableResponse.data.message);
    
    // 7. 获取启用的闹钟
    console.log('\n7. 获取启用的闹钟...');
    const enabledResponse = await api.get('/api/alarms/enabled');
    console.log('✅ 启用的闹钟数量:', enabledResponse.data.count);
    
    // 8. 启用闹钟
    console.log('\n8. 启用闹钟...');
    const enableResponse = await api.patch(`/api/alarms/${alarmId}/toggle`, {
      enabled: true
    });
    console.log('✅ 启用闹钟成功:', enableResponse.data.message);
    
    // 9. 测试批量操作
    console.log('\n9. 测试批量操作...');
    const batchResponse = await api.post('/api/alarms/batch', {
      operations: [
        { action: 'disable', alarm_id: alarmId }
      ]
    });
    console.log('✅ 批量操作成功:', batchResponse.data.message);
    
    // 10. 测试闹钟提醒服务
    console.log('\n10. 测试闹钟提醒服务...');
    const reminderResponse = await api.get('/api/alarms/reminder/check');
    console.log('✅ 提醒检查完成，活跃闹钟:', reminderResponse.data.data.activeCount);
    
    // 11. 获取今日闹钟安排
    console.log('\n11. 获取今日闹钟安排...');
    const todayResponse = await api.get('/api/alarms/reminder/today');
    console.log('✅ 今日闹钟数量:', todayResponse.data.count);
    
    // 12. 获取闹钟统计
    console.log('\n12. 获取闹钟统计...');
    const statsResponse = await api.get('/api/alarms/reminder/stats');
    console.log('✅ 闹钟统计:', {
      total: statsResponse.data.data.total,
      enabled: statsResponse.data.data.enabled
    });
    
    // 13. 测试备份功能
    console.log('\n13. 测试备份功能...');
    const backupResponse = await api.post('/api/alarms/reminder/backup');
    console.log('✅ 备份成功，备份数量:', backupResponse.data.data.alarms.length);
    
    // 14. 删除测试闹钟
    console.log('\n14. 删除测试闹钟...');
    const deleteResponse = await api.delete(`/api/alarms/${alarmId}`);
    console.log('✅ 删除闹钟成功:', deleteResponse.data.message);
    
    console.log('\n🎉 所有闹钟API测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行测试
if (require.main === module) {
  testAlarmAPIs().catch(console.error);
}

module.exports = { testAlarmAPIs };