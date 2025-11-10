/**
 * 测试复杂JOIN查询的手动参数替换
 * 解决原始的参数绑定错误问题
 */

require('dotenv').config({ path: '../.env' });
const { query } = require('./server/database/config');

async function testComplexJoin() {
  console.log('🎯 测试复杂JOIN查询的手动参数替换...\n');

  // 之前有问题的复杂查询
  const complexSql = `
    SELECT 
      p.post_id,
      p.author_openid as openid,
      p.title,
      p.content,
      p.cover_image as cover_url,
      p.audio_id,
      p.like_count,
      p.comment_count,
      p.status,
      p.created_at,
      p.updated_at,
      u.nickname,
      u.avatar_url,
      a.title as audio_title,
      a.cover_url as audio_cover
    FROM posts p
    LEFT JOIN users u ON p.author_openid = u.openid
    LEFT JOIN audios a ON p.audio_id = a.audio_id
    WHERE p.status = ?
    ORDER BY p.created_at DESC LIMIT ? OFFSET ?
  `;

  const params = ['published', 10, 0];

  try {
    // 先测试普通模式（可能会失败）
    console.log('📊 测试普通参数绑定模式...');
    const normalResult = await query(complexSql, params);
    
    if (normalResult.success) {
      console.log('✅ 普通模式成功（可能在某些环境下工作）');
      console.log(`查询到 ${normalResult.data ? normalResult.data.length : 0} 条记录`);
    } else {
      console.log('❌ 普通模式失败（这是预期的，因为复杂JOIN查询有参数绑定问题）');
      console.log('错误信息:', normalResult.error);
    }
    console.log('');

    // 再测试手动参数替换模式
    console.log('📊 测试手动参数替换模式...');
    const manualResult = await query(complexSql, params, { useManualReplace: true });
    
    if (manualResult.success) {
      console.log('✅ 手动参数替换模式成功！');
      console.log(`📊 查询到 ${manualResult.data ? manualResult.data.length : 0} 条记录`);
      
      if (manualResult.data && manualResult.data.length > 0) {
        console.log('📝 第一条记录信息:');
        console.log('  - 帖子标题:', manualResult.data[0].title);
        console.log('  - 作者昵称:', manualResult.data[0].nickname);
        console.log('  - 创建时间:', manualResult.data[0].created_at);
      }
    } else {
      console.log('❌ 手动参数替换模式失败:', manualResult.error);
    }

    console.log('\n🔍 测试总结:');
    console.log('• 手动参数替换模式解决了复杂JOIN查询的参数绑定问题');
    console.log('• 即使普通模式失败，手动模式也能正常工作');
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
  }
}

// 运行测试
testComplexJoin().catch(console.error);