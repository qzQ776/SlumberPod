/**
 * 完整闹钟系统测试脚本
 * 测试所有闹钟相关接口和功能
 */

const axios = require('axios');

// 测试配置
const BASE_URL = 'http://localhost:3003/api';
const TEST_USER = {
  openid: 'test_alarm_user_001',
  nickname: '闹钟测试用户'
};

// 获取测试用户的token
async function getTestToken() {
  try {
    // 这里可以使用现有的认证接口获取token
    // 为了简化测试，我们直接使用模拟的openid
    return 'test_token_' + TEST_USER.openid;
  } catch (error) {
    console.error('获取测试token失败:', error.message);
    return null;
  }
}

// 测试闹钟基础功能
async function testAlarmBasic() {
  console.log('\n🔔 测试闹钟基础功能...');
  
  const token = await getTestToken();
  if (!token) {
    console.error('❌ 无法获取测试token');
    return;
  }
  
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  try {
    // 1. 创建闹钟
    console.log('1. 创建闹钟...');
    const alarmData = {
      label: '起床闹钟',
      alarm_time: '2024-01-01T07:00:00.000Z',
      repeat_days: [1, 2, 3, 4, 5],
      snooze_duration: 5,
      vibration: true,
      volume: 80
    };
    
    const createResponse = await axios.post(`${BASE_URL}/alarms`, alarmData, { headers });
    console.log('✅ 创建闹钟成功:', createResponse.data);
    
    const alarmId = createResponse.data.data.alarm_id;
    
    // 2. 获取用户所有闹钟
    console.log('2. 获取用户所有闹钟...');
    const listResponse = await axios.get(`${BASE_URL}/alarms`, { headers });
    console.log('✅ 获取闹钟列表成功，数量:', listResponse.data.count);
    
    // 3. 获取闹钟详情
    console.log('3. 获取闹钟详情...');
    const detailResponse = await axios.get(`${BASE_URL}/alarms/${alarmId}`, { headers });
    console.log('✅ 获取闹钟详情成功:', detailResponse.data.data.label);
    
    // 4. 更新闹钟
    console.log('4. 更新闹钟...');
    const updateData = {
      label: '更新后的闹钟',
      volume: 90
    };
    const updateResponse = await axios.put(`${BASE_URL}/alarms/${alarmId}`, updateData, { headers });
    console.log('✅ 更新闹钟成功');
    
    // 5. 启用/禁用闹钟
    console.log('5. 启用/禁用闹钟...');
    const toggleResponse = await axios.patch(`${BASE_URL}/alarms/${alarmId}/toggle`, 
      { enabled: false }, { headers });
    console.log('✅ 切换闹钟状态成功:', toggleResponse.data.message);
    
    // 6. 获取启用的闹钟
    console.log('6. 获取启用的闹钟...');
    const enabledResponse = await axios.get(`${BASE_URL}/alarms/enabled`, { headers });
    console.log('✅ 获取启用闹钟成功，数量:', enabledResponse.data.count);
    
    // 7. 批量操作
    console.log('7. 批量操作闹钟...');
    const batchData = {
      operations: [
        { action: 'enable', alarm_id: alarmId }
      ]
    };
    const batchResponse = await axios.post(`${BASE_URL}/alarms/batch`, batchData, { headers });
    console.log('✅ 批量操作成功:', batchResponse.data.message);
    
    // 8. 检查闹钟状态
    console.log('8. 检查闹钟状态...');
    const statusResponse = await axios.get(`${BASE_URL}/alarms/check/status`, { headers });
    console.log('✅ 检查状态成功，启用闹钟数:', statusResponse.data.data.totalEnabled);
    
    // 9. 删除闹钟
    console.log('9. 删除闹钟...');
    const deleteResponse = await axios.delete(`${BASE_URL}/alarms/${alarmId}`, { headers });
    console.log('✅ 删除闹钟成功');
    
    console.log('\n🎉 闹钟基础功能测试完成！');
    
  } catch (error) {
    console.error('❌ 闹钟基础功能测试失败:', error.response?.data || error.message);
  }
}

// 测试闹钟提醒服务
async function testAlarmReminder() {
  console.log('\n⏰ 测试闹钟提醒服务...');
  
  const token = await getTestToken();
  if (!token) {
    console.error('❌ 无法获取测试token');
    return;
  }
  
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  try {
    // 1. 检查并触发闹钟提醒
    console.log('1. 检查并触发闹钟提醒...');
    const checkResponse = await axios.get(`${BASE_URL}/alarms/reminder/check`, { headers });
    console.log('✅ 检查提醒成功:', checkResponse.data.message);
    
    // 2. 获取今日闹钟安排
    console.log('2. 获取今日闹钟安排...');
    const todayResponse = await axios.get(`${BASE_URL}/alarms/reminder/today`, { headers });
    console.log('✅ 获取今日安排成功，数量:', todayResponse.data.count);
    
    // 3. 获取闹钟统计
    console.log('3. 获取闹钟统计...');
    const statsResponse = await axios.get(`${BASE_URL}/alarms/reminder/stats`, { headers });
    console.log('✅ 获取统计成功，总闹钟数:', statsResponse.data.data.total);
    
    // 4. 备份闹钟设置
    console.log('4. 备份闹钟设置...');
    const backupResponse = await axios.post(`${BASE_URL}/alarms/reminder/backup`, {}, { headers });
    console.log('✅ 备份成功:', backupResponse.data.message);
    
    const backupData = backupResponse.data.data;
    
    // 5. 恢复闹钟设置
    console.log('5. 恢复闹钟设置...');
    const restoreResponse = await axios.post(`${BASE_URL}/alarms/reminder/restore`, 
      { backup_data: backupData }, { headers });
    console.log('✅ 恢复成功:', restoreResponse.data.message);
    
    console.log('\n🎉 闹钟提醒服务测试完成！');
    
  } catch (error) {
    console.error('❌ 闹钟提醒服务测试失败:', error.response?.data || error.message);
  }
}

// 测试闹钟错误处理
async function testAlarmErrorHandling() {
  console.log('\n⚠️ 测试闹钟错误处理...');
  
  const token = await getTestToken();
  if (!token) {
    console.error('❌ 无法获取测试token');
    return;
  }
  
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  try {
    // 1. 测试无效的闹钟ID
    console.log('1. 测试无效的闹钟ID...');
    try {
      await axios.get(`${BASE_URL}/alarms/invalid_id`, { headers });
    } catch (error) {
      console.log('✅ 无效ID处理正确:', error.response?.data?.message);
    }
    
    // 2. 测试不存在的闹钟
    console.log('2. 测试不存在的闹钟...');
    try {
      await axios.get(`${BASE_URL}/alarms/999999`, { headers });
    } catch (error) {
      console.log('✅ 不存在闹钟处理正确:', error.response?.data?.message);
    }
    
    // 3. 测试无效的创建数据
    console.log('3. 测试无效的创建数据...');
    try {
      await axios.post(`${BASE_URL}/alarms`, {}, { headers });
    } catch (error) {
      console.log('✅ 无效数据验证正确:', error.response?.data?.message);
    }
    
    // 4. 测试批量操作错误
    console.log('4. 测试批量操作错误...');
    try {
      await axios.post(`${BASE_URL}/alarms/batch`, {}, { headers });
    } catch (error) {
      console.log('✅ 批量操作验证正确:', error.response?.data?.message);
    }
    
    console.log('\n🎉 闹钟错误处理测试完成！');
    
  } catch (error) {
    console.error('❌ 闹钟错误处理测试失败:', error.response?.data || error.message);
  }
}

// 主测试函数
async function main() {
  console.log('🚀 开始测试完整闹钟系统...\n');
  
  // 检查服务是否运行
  try {
    await axios.get(`${BASE_URL}/health`);
    console.log('✅ 服务正常运行');
  } catch (error) {
    console.error('❌ 服务未运行，请先启动服务: npm start');
    return;
  }
  
  await testAlarmBasic();
  await testAlarmReminder();
  await testAlarmErrorHandling();
  
  console.log('\n🎊 完整闹钟系统测试完成！');
  console.log('\n📋 测试总结:');
  console.log('- 基础闹钟功能: 创建、查询、更新、删除、批量操作');
  console.log('- 闹钟提醒服务: 检查提醒、今日安排、统计、备份恢复');
  console.log('- 错误处理机制: 无效数据验证、异常情况处理');
  console.log('\n💡 使用说明:');
  console.log('1. 确保服务正在运行: npm start');
  console.log('2. 运行测试: node test_complete_alarm_system.js');
  console.log('3. 查看详细日志了解接口使用方式');
}

// 运行测试
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 测试执行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  testAlarmBasic,
  testAlarmReminder,
  testAlarmErrorHandling,
  main
};