const { query } = require('./server/database/config');

async function debugSQLParams() {
    console.log('🔍 调试SQL参数绑定问题...\n');
    
    // 测试1: 直接使用query函数
    console.log('📋 测试1: 直接使用query函数');
    try {
        const sql = `
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
        
        const params = ['published', 20, 0];
        console.log('📊 SQL参数:', params);
        console.log('📊 参数类型:', params.map(p => typeof p));
        
        const result = await query(sql, params);
        console.log('✅ 测试1结果:', result.success ? '成功' : '失败', result.error || '');
        
        if (result.success) {
            console.log(`📊 返回数据数量: ${result.data ? result.data.length : 0}`);
        }
        
    } catch (error) {
        console.error('❌ 测试1异常:', error);
    }
    
    console.log('\n---\n');
    
    // 测试2: 测试不同的参数类型
    console.log('📋 测试2: 测试不同的参数类型');
    
    const testCases = [
        { name: '字符串数字', params: ['published', '20', '0'] },
        { name: '混合类型', params: ['published', 20, '0'] },
        { name: '全部数字', params: ['published', 20, 0] },
        { name: '带解析', params: ['published', parseInt('20'), parseInt('0')] }
    ];
    
    for (const testCase of testCases) {
        try {
            console.log(`\n📊 测试: ${testCase.name}`);
            console.log('📊 参数:', testCase.params);
            console.log('📊 参数类型:', testCase.params.map(p => typeof p));
            
            const sql = `
                SELECT 1 as test
                FROM posts p
                WHERE p.status = ?
                LIMIT ? OFFSET ?
            `;
            
            const result = await query(sql, testCase.params);
            console.log(`✅ 结果: ${result.success ? '成功' : '失败'}`);
            
        } catch (error) {
            console.error(`❌ 异常: ${error.message}`);
        }
    }
    
    console.log('\n🎉 调试完成！');
}

debugSQLParams();