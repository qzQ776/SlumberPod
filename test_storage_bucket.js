const supabaseService = require('./server/services/supabaseService');

async function testStorageBucket() {
    console.log('测试Supabase存储桶功能...');
    
    try {
        // 1. 检查存储桶状态
        console.log('1. 检查存储桶状态...');
        const bucketResult = await supabaseService.ensureBucketExists();
        console.log('存储桶检查结果:', JSON.stringify(bucketResult, null, 2));
        
        // 2. 列出存储桶
        console.log('\n2. 列出可用存储桶...');
        const buckets = await supabaseService.listAvailableBuckets();
        console.log('可用存储桶列表:');
        if (buckets && buckets.length > 0) {
            buckets.forEach(bucket => {
                console.log(`- ${bucket.name} (public: ${bucket.public})`);
            });
        } else {
            console.log('无可用存储桶');
        }
        
        // 3. 测试上传功能
        console.log('\n3. 测试上传功能...');
        const testBuffer = Buffer.from('test audio content');
        const uploadResult = await supabaseService.uploadAudioToSupabase(testBuffer, 'test.mp3');
        console.log('上传测试结果:', JSON.stringify(uploadResult, null, 2));
        
        // 4. 如果上传成功，测试删除功能
        if (uploadResult.success) {
            console.log('\n4. 测试删除功能...');
            const deleteResult = await supabaseService.deleteAudioFromSupabase(uploadResult.filePath);
            console.log('删除测试结果:', JSON.stringify(deleteResult, null, 2));
        }
        
    } catch (error) {
        console.error('测试失败:', error.message);
    }
}

testStorageBucket();