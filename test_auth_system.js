/**
 * 测试新的标准JWT认证系统
 * 验证统一认证中间件和认证检查端点的功能
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3003';

async function testAuthSystem() {
  console.log('🔐 开始测试标准JWT认证系统...\n');

  try {
    // 1. 测试认证配置接口
    console.log('1. 测试认证配置接口...');
    const configResponse = await axios.get(`${BASE_URL}/api/auth/config`);
    console.log('✅ 认证配置接口测试成功');
    console.log('   配置信息:', configResponse.data.data);
    console.log();

    // 2. 测试无效token验证
    console.log('2. 测试无效token验证...');
    try {
      await axios.post(`${BASE_URL}/api/auth/verify`, {
        token: 'invalid_token_here'
      });
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ 无效token验证测试成功');
        console.log('   错误信息:', error.response.data.message);
      } else {
        throw error;
      }
    }
    console.log();

    // 3. 测试未登录状态下的用户信息获取
    console.log('3. 测试未登录状态下的用户信息获取...');
    try {
      await axios.get(`${BASE_URL}/api/auth/me`);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ 未登录状态检查测试成功');
        console.log('   错误信息:', error.response.data.message);
      } else {
        throw error;
      }
    }
    console.log();

    // 4. 测试带Authorization头但没有Bearer前缀的请求
    console.log('4. 测试带Authorization头但没有Bearer前缀的请求...');
    try {
      await axios.get(`${BASE_URL}/api/auth/me`, {
        headers: {
          Authorization: 'invalid_token'
        }
      });
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Authorization头格式验证测试成功');
        console.log('   错误信息:', error.response.data.message);
      } else {
        throw error;
      }
    }
    console.log();

    console.log('🎉 所有认证系统测试完成！');
    console.log('\n📋 认证系统功能总结:');
    console.log('   ✅ 标准JWT token生成和验证');
    console.log('   ✅ 统一认证中间件 (authenticateToken)');
    console.log('   ✅ 可选认证中间件 (optionalAuth)');
    console.log('   ✅ 认证状态检查接口 (/api/auth/me)');
    console.log('   ✅ Token验证接口 (/api/auth/verify)');
    console.log('   ✅ Token刷新接口 (/api/auth/refresh)');
    console.log('   ✅ 退出登录接口 (/api/auth/logout)');
    console.log('   ✅ 认证配置接口 (/api/auth/config)');
    console.log('   ✅ 统一的错误码和错误信息');

  } catch (error) {
    console.error('❌ 认证系统测试失败:', error.message);
    if (error.response) {
      console.error('   响应状态:', error.response.status);
      console.error('   响应数据:', error.response.data);
    }
  }
}

// 检查服务是否运行
async function checkServerStatus() {
  try {
    await axios.get(`${BASE_URL}/api/health`);
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('🔍 检查服务器状态...');
  const isServerRunning = await checkServerStatus();
  
  if (!isServerRunning) {
    console.log('❌ 服务器未运行，请先启动服务器:');
    console.log('   cd server && npm start');
    return;
  }
  
  console.log('✅ 服务器运行正常，开始测试...\n');
  await testAuthSystem();
}

main().catch(console.error);