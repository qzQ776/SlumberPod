const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// 测试数据
const TEST_USER_ID = '11111111-1111-1111-1111-111111111111';
const TEST_AUDIO_ID = '3146cc5f-7387-4dbf-9636-2c5e1e6c59c1';

async function testAPI() {
  console.log('🚀 开始测试SlumberPod API接口...\n');

  try {
    // 1. 测试健康检查
    console.log('1. 测试健康检查接口...');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ 健康检查成功:', healthResponse.data);

    // 2. 测试获取音频列表
    console.log('\n2. 测试获取音频列表...');
    const audioListResponse = await axios.get(`${BASE_URL}/api/audios?limit=3`);
    console.log('✅ 获取音频列表成功，数量:', audioListResponse.data.data.length);

    // 3. 测试获取音频详情（使用正确的UUID）
    console.log('\n3. 测试获取音频详情...');
    const audioDetailResponse = await axios.get(`${BASE_URL}/api/audios/${TEST_AUDIO_ID}`);
    console.log('✅ 获取音频详情成功:', audioDetailResponse.data.data.title);

    // 4. 测试增加播放次数
    console.log('\n4. 测试增加播放次数...');
    const playResponse = await axios.post(`${BASE_URL}/api/audios/${TEST_AUDIO_ID}/play`);
    console.log('✅ 增加播放次数成功:', playResponse.data.message);

    // 5. 测试获取帖子列表
    console.log('\n5. 测试获取帖子列表...');
    const postsResponse = await axios.get(`${BASE_URL}/api/posts?limit=3`);
    console.log('✅ 获取帖子列表成功，数量:', postsResponse.data.data.length);

    // 6. 测试创建帖子
    console.log('\n6. 测试创建帖子...');
    const createPostResponse = await axios.post(`${BASE_URL}/api/posts`, {
      userId: TEST_USER_ID,
      title: '测试帖子标题',
      content: '这是测试帖子内容',
      imageUrls: []
    });
    console.log('✅ 创建帖子成功:', createPostResponse.data.message);

    // 7. 测试获取睡眠记录
    console.log('\n7. 测试获取睡眠记录...');
    const sleepResponse = await axios.get(`${BASE_URL}/api/sleep/records?userId=${TEST_USER_ID}&days=7`);
    console.log('✅ 获取睡眠记录成功，数量:', sleepResponse.data.data.length);

    // 8. 测试创建睡眠记录
    console.log('\n8. 测试创建睡眠记录...');
    const createSleepResponse = await axios.post(`${BASE_URL}/api/sleep/records`, {
      userId: TEST_USER_ID,
      startTime: new Date().toISOString(),
      duration: 480,
      qualityRating: 4
    });
    console.log('✅ 创建睡眠记录成功:', createSleepResponse.data.message);

    console.log('\n🎉 所有接口测试通过！');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

// 测试错误情况
async function testErrorCases() {
  console.log('\n🔧 测试错误情况...');

  try {
    // 测试无效的音频ID格式
    console.log('1. 测试无效音频ID格式...');
    await axios.get(`${BASE_URL}/api/audios/1`);
  } catch (error) {
    console.log('✅ 正确捕获无效ID错误:', error.response?.data?.message);
  }

  try {
    // 测试无效的用户ID格式
    console.log('2. 测试无效用户ID格式...');
    await axios.post(`${BASE_URL}/api/posts`, {
      userId: 'invalid-user-id',
      content: '测试内容'
    });
  } catch (error) {
    console.log('✅ 正确捕获无效用户ID错误:', error.response?.data?.message);
  }
}

// 运行测试
async function runTests() {
  await testAPI();
  await testErrorCases();
}

runTests();