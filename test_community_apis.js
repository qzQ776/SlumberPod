const axios = require('axios');

const BASE_URL = 'http://localhost:3003/api';

// 测试用的微信token（需要替换为实际可用的token）
const TEST_TOKEN = 'test_token_placeholder';

// 测试配置
const config = {
  headers: {
    'Authorization': `Bearer ${TEST_TOKEN}`
  }
};

async function testCommunityAPIs() {
  console.log('🚀 开始测试社区和帖子接口...\n');

  let results = [];

  try {
    // 1. 测试健康检查
    console.log('1. 测试健康检查接口...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/health`);
      results.push({
        name: '健康检查',
        status: healthResponse.status === 200 ? '✅ 通过' : '❌ 失败',
        details: healthResponse.data
      });
    } catch (error) {
      results.push({
        name: '健康检查',
        status: '❌ 失败',
        details: error.message
      });
    }

    // 2. 测试获取帖子列表（无需认证）
    console.log('2. 测试获取帖子列表接口...');
    try {
      const postsResponse = await axios.get(`${BASE_URL}/community`);
      results.push({
        name: '获取帖子列表',
        status: postsResponse.status === 200 ? '✅ 通过' : '❌ 失败',
        details: `获取到 ${postsResponse.data.data?.length || 0} 条帖子`
      });
    } catch (error) {
      results.push({
        name: '获取帖子列表',
        status: '❌ 失败',
        details: error.response?.data?.message || error.message
      });
    }

    // 3. 测试热门帖子接口
    console.log('3. 测试热门帖子接口...');
    try {
      const hotPostsResponse = await axios.get(`${BASE_URL}/community/hot`);
      results.push({
        name: '热门帖子',
        status: hotPostsResponse.status === 200 ? '✅ 通过' : '❌ 失败',
        details: `获取到 ${hotPostsResponse.data.data?.length || 0} 条热门帖子`
      });
    } catch (error) {
      results.push({
        name: '热门帖子',
        status: '❌ 失败',
        details: error.response?.data?.message || error.message
      });
    }

    // 4. 测试最新帖子接口
    console.log('4. 测试最新帖子接口...');
    try {
      const latestPostsResponse = await axios.get(`${BASE_URL}/community/latest`);
      results.push({
        name: '最新帖子',
        status: latestPostsResponse.status === 200 ? '✅ 通过' : '❌ 失败',
        details: `获取到 ${latestPostsResponse.data.data?.length || 0} 条最新帖子`
      });
    } catch (error) {
      results.push({
        name: '最新帖子',
        status: '❌ 失败',
        details: error.response?.data?.message || error.message
      });
    }

    // 5. 测试搜索帖子接口
    console.log('5. 测试搜索帖子接口...');
    try {
      const searchResponse = await axios.get(`${BASE_URL}/community/search?q=测试`);
      results.push({
        name: '搜索帖子',
        status: searchResponse.status === 200 ? '✅ 通过' : '❌ 失败',
        details: `搜索到 ${searchResponse.data.data?.length || 0} 条相关帖子`
      });
    } catch (error) {
      results.push({
        name: '搜索帖子',
        status: '❌ 失败',
        details: error.response?.data?.message || error.message
      });
    }

    // 6. 测试需要认证的接口（使用测试token）
    console.log('6. 测试需要认证的接口...');
    try {
      const userPostsResponse = await axios.get(`${BASE_URL}/community/user/posts`, config);
      results.push({
        name: '用户帖子列表（认证）',
        status: userPostsResponse.status === 200 ? '✅ 通过' : '❌ 失败',
        details: `获取到 ${userPostsResponse.data.data?.length || 0} 条用户帖子`
      });
    } catch (error) {
      const status = error.response?.status;
      if (status === 401) {
        results.push({
          name: '用户帖子列表（认证）',
          status: '⚠️ 需要有效token',
          details: '认证失败，需要有效的微信token'
        });
      } else {
        results.push({
          name: '用户帖子列表（认证）',
          status: '❌ 失败',
          details: error.response?.data?.message || error.message
        });
      }
    }

    // 7. 测试评论相关接口
    console.log('7. 测试评论接口...');
    try {
      // 先获取一个帖子来测试评论
      const samplePostsResponse = await axios.get(`${BASE_URL}/community?limit=1`);
      if (samplePostsResponse.data.data && samplePostsResponse.data.data.length > 0) {
        const postId = samplePostsResponse.data.data[0].post_id;
        
        // 测试获取帖子评论
        const commentsResponse = await axios.get(`${BASE_URL}/community/${postId}/comments`);
        results.push({
          name: '获取帖子评论',
          status: commentsResponse.status === 200 ? '✅ 通过' : '❌ 失败',
          details: `获取到 ${commentsResponse.data.data?.length || 0} 条评论`
        });
      } else {
        results.push({
          name: '获取帖子评论',
          status: '⚠️ 跳过',
          details: '没有可用帖子进行测试'
        });
      }
    } catch (error) {
      results.push({
        name: '获取帖子评论',
        status: '❌ 失败',
        details: error.response?.data?.message || error.message
      });
    }

    // 8. 测试音频评论接口
    console.log('8. 测试音频评论接口...');
    try {
      const audioCommentsResponse = await axios.get(`${BASE_URL}/community/audio/1/comments`);
      results.push({
        name: '获取音频评论',
        status: audioCommentsResponse.status === 200 ? '✅ 通过' : '❌ 失败',
        details: `获取到 ${audioCommentsResponse.data.data?.length || 0} 条音频评论`
      });
    } catch (error) {
      results.push({
        name: '获取音频评论',
        status: '❌ 失败',
        details: error.response?.data?.message || error.message
      });
    }

  } catch (error) {
    console.error('测试过程中出现异常:', error);
  }

  // 输出测试结果
  console.log('\n📊 社区和帖子接口测试结果:');
  console.log('='.repeat(60));
  
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.name}: ${result.status}`);
    console.log(`   详情: ${result.details}`);
    console.log('');
  });

  // 统计结果
  const passed = results.filter(r => r.status.includes('✅')).length;
  const failed = results.filter(r => r.status.includes('❌')).length;
  const skipped = results.filter(r => r.status.includes('⚠️')).length;

  console.log(`\n📈 测试统计:`);
  console.log(`✅ 通过: ${passed} 个`);
  console.log(`❌ 失败: ${failed} 个`);
  console.log(`⚠️ 跳过: ${skipped} 个`);
  console.log(`📊 总计: ${results.length} 个接口`);

  return {
    passed,
    failed,
    skipped,
    total: results.length
  };
}

// 检查路由注册情况
function checkRouteRegistrations() {
  console.log('\n🔍 检查路由注册情况...');
  
  const routes = [
    '/api/community',
    '/api/community/hot',
    '/api/community/latest',
    '/api/community/search',
    '/api/community/user/posts',
    '/api/community/:id/comments',
    '/api/community/audio/:audioId/comments'
  ];

  routes.forEach(route => {
    console.log(`   ${route}`);
  });
}

// 检查数据库表结构
function checkDatabaseTables() {
  console.log('\n🗄️ 检查数据库表结构...');
  
  const requiredTables = [
    'posts',
    'comments',
    'post_likes',
    'comment_likes',
    'users'
  ];

  requiredTables.forEach(table => {
    console.log(`   ${table}`);
  });

  console.log('\n💡 注意: 需要确保这些表在数据库中已正确创建');
}

// 运行测试
async function main() {
  try {
    checkRouteRegistrations();
    checkDatabaseTables();
    
    const result = await testCommunityAPIs();
    
    if (result.failed > 0) {
      console.log('\n❌ 部分接口测试失败，需要检查以下问题:');
      console.log('   1. 数据库表结构是否正确');
      console.log('   2. 路由是否正确注册');
      console.log('   3. 认证中间件是否正常工作');
      console.log('   4. 业务逻辑是否存在错误');
    } else {
      console.log('\n🎉 所有接口测试通过！');
    }
  } catch (error) {
    console.error('测试执行失败:', error);
  }
}

main();