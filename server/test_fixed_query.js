require('dotenv').config({ path: '../.env' });
const CommunityPost = require('./database/models/CommunityPost');

async function testFixedQuery() {
  console.log('🎯 测试修复后的帖子查询功能...\n');
  
  try {
    // 测试默认查询
    console.log('📊 测试1：默认查询（status=published, limit=20, offset=0）');
    const result1 = await CommunityPost.getPosts();
    
    if (result1.success) {
      console.log('✅ 查询成功！');
      console.log(`📊 查询到 ${result1.data.length} 条帖子`);
      
      if (result1.data.length > 0) {
        console.log('📝 第一条帖子信息:');
        console.log('  - 标题:', result1.data[0].title);
        console.log('  - 作者:', result1.data[0].nickname);
        console.log('  - 状态:', result1.data[0].status);
      } else {
        console.log('ℹ️ 帖子表中暂无数据，这是正常的');
      }
    } else {
      console.log('❌ 查询失败:', result1.error);
    }
    
    // 测试自定义参数
    console.log('\n📊 测试2：自定义参数查询');
    const result2 = await CommunityPost.getPosts({
      limit: 10,
      offset: 0,
      status: 'published'
    });
    
    if (result2.success) {
      console.log('✅ 自定义参数查询成功！');
      console.log(`📊 查询到 ${result2.data.length} 条帖子`);
    } else {
      console.log('❌ 自定义参数查询失败:', result2.error);
    }
    
    console.log('\n🎉 修复测试完成！');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

testFixedQuery().catch(console.error);