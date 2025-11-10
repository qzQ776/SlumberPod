const CommunityPost = require('./server/database/models/CommunityPost');

async function testSQLFix() {
    console.log('🔧 测试SQL参数绑定修复...');
    
    try {
        // 测试正常的参数
        console.log('📋 测试1: 正常参数');
        const result1 = await CommunityPost.getPosts({
            limit: 20,
            offset: 0
        });
        console.log('✅ 测试1结果:', result1.success ? '成功' : '失败', result1.error || '');
        
        // 测试字符串参数
        console.log('📋 测试2: 字符串参数');
        const result2 = await CommunityPost.getPosts({
            limit: '20',
            offset: '0'
        });
        console.log('✅ 测试2结果:', result2.success ? '成功' : '失败', result2.error || '');
        
        // 测试无效参数
        console.log('📋 测试3: 无效参数');
        const result3 = await CommunityPost.getPosts({
            limit: 'invalid',
            offset: 'invalid'
        });
        console.log('✅ 测试3结果:', result3.success ? '成功' : '失败', result3.error || '');
        
        // 测试空参数
        console.log('📋 测试4: 空参数');
        const result4 = await CommunityPost.getPosts({});
        console.log('✅ 测试4结果:', result4.success ? '成功' : '失败', result4.error || '');
        
        console.log('\n🎉 SQL参数绑定修复测试完成！');
        
    } catch (error) {
        console.error('❌ 测试失败:', error);
    }
}

testSQLFix();