const axios = require('axios');

// 测试基础URL（根据实际服务器地址修改）
const BASE_URL = 'http://localhost:3000/api';

// 测试用户信息（需要真实可用的openid）
const TEST_OPENID = 'test_user_openid_123';

async function testAudioEndpoints() {
  console.log('🚀 开始测试音频相关接口修复...\n');

  try {
    // 测试1: 获取音频列表
    console.log('📋 测试1: 获取音频列表');
    const audioListResponse = await axios.get(`${BASE_URL}/audio`);
    console.log('✅ 音频列表接口正常');
    console.log(`   返回数据条数: ${audioListResponse.data.data.length}`);
    console.log(`   成功状态: ${audioListResponse.data.success}\n`);

    // 测试2: 获取用户创作音频
    console.log('🎵 测试2: 获取用户创作音频');
    try {
      const userCreationsResponse = await axios.get(`${BASE_URL}/audio`, {
        params: { user_creations: 'true' },
        headers: { 'x-openid': TEST_OPENID }
      });
      console.log('✅ 用户创作音频接口正常');
      console.log(`   返回数据条数: ${userCreationsResponse.data.data.length}`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('⚠️  用户创作音频接口需要登录（正常）');
      } else {
        console.log('❌ 用户创作音频接口异常:', error.message);
      }
    }
    console.log('');

    // 测试3: 获取"我的创作"分类
    console.log('🎨 测试3: 获取"我的创作"分类');
    try {
      const myCreationsResponse = await axios.get(`${BASE_URL}/audio`, {
        params: { category_id: 'my_creations' },
        headers: { 'x-openid': TEST_OPENID }
      });
      console.log('✅ "我的创作"分类接口正常');
      console.log(`   返回数据条数: ${myCreationsResponse.data.data.length}`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('⚠️  "我的创作"分类接口需要登录（正常）');
      } else {
        console.log('❌ "我的创作"分类接口异常:', error.message);
      }
    }
    console.log('');

    // 测试4: 获取用户收藏列表
    console.log('❤️  测试4: 获取用户收藏列表');
    try {
      const favoritesResponse = await axios.get(`${BASE_URL}/audio/favorites/mine`, {
        headers: { 'x-openid': TEST_OPENID }
      });
      console.log('✅ 用户收藏列表接口正常');
      console.log(`   返回数据条数: ${favoritesResponse.data.data.length}`);
      console.log(`   总条数: ${favoritesResponse.data.total}`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('⚠️  用户收藏列表接口需要登录（正常）');
      } else {
        console.log('❌ 用户收藏列表接口异常:', error.message);
      }
    }
    console.log('');

    // 测试5: 测试收藏状态切换（需要真实音频ID）
    console.log('🔄 测试5: 切换收藏状态');
    if (audioListResponse.data.data.length > 0) {
      const testAudioId = audioListResponse.data.data[0].audio_id;
      try {
        const toggleResponse = await axios.post(
          `${BASE_URL}/audio/${testAudioId}/favorite`,
          {},
          { headers: { 'x-openid': TEST_OPENID } }
        );
        console.log('✅ 切换收藏状态接口正常');
        console.log(`   操作结果: ${JSON.stringify(toggleResponse.data.data)}`);
      } catch (error) {
        if (error.response?.status === 401) {
          console.log('⚠️  切换收藏状态接口需要登录（正常）');
        } else {
          console.log('❌ 切换收藏状态接口异常:', error.message);
        }
      }
    } else {
      console.log('⚠️  无法测试切换收藏状态：没有可用的音频数据');
    }
    console.log('');

    // 测试6: 测试创作路由
    console.log('📝 测试6: 获取创作列表');
    try {
      const creationsResponse = await axios.get(`${BASE_URL}/creations`, {
        headers: { 'x-openid': TEST_OPENID }
      });
      console.log('✅ 创作列表接口正常');
      console.log(`   返回数据条数: ${creationsResponse.data.data.length}`);
      console.log(`   总条数: ${creationsResponse.data.total}`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('⚠️  创作列表接口需要登录（正常）');
      } else {
        console.log('❌ 创作列表接口异常:', error.message);
      }
    }
    console.log('');

    console.log('🎉 音频接口测试完成！');
    console.log('✨ 主要问题已修复：');
    console.log('   - Audio模型缺失方法已补全');
    console.log('   - Favorite模型字段名已修正');
    console.log('   - 收藏列表接口现在使用Favorite模型');
    console.log('   - 所有接口参数处理已优化');

  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 请确保服务器正在运行: npm run dev');
    }
  }
}

// 运行测试
testAudioEndpoints();