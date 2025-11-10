// 测试Supabase集成
require('dotenv').config();
const supabaseService = require('./server/services/supabaseService');

async function testSupabaseIntegration() {
  console.log('=== 测试Supabase集成 ===\n');

  try {
    // 1. 测试Supabase客户端连接
    console.log('1. 测试Supabase客户端连接...');
    const supabase = supabaseService.getSupabaseClient();
    console.log('✅ Supabase客户端创建成功');

    // 2. 测试存储桶检查
    console.log('\n2. 检查存储桶...');
    const bucketCheck = await supabaseService.ensureBucketExists();
    if (bucketCheck.success) {
      console.log('✅ 存储桶检查成功');
    } else {
      console.log('⚠️ 存储桶检查失败:', bucketCheck.message);
    }

    // 3. 测试获取存储桶列表
    console.log('\n3. 获取存储桶列表...');
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      console.log('❌ 获取存储桶列表失败:', error.message);
    } else {
      console.log('✅ 存储桶列表获取成功');
      console.log('   当前存储桶数量:', buckets.length);
      buckets.forEach(bucket => {
        console.log(`   - ${bucket.name} (${bucket.public ? '公开' : '私有'})`);
      });
    }

    console.log('\n=== 测试完成 ===');
    console.log('📋 下一步操作建议:');
    console.log('1. 请在Supabase控制台创建名为 "audio-files" 的存储桶');
    console.log('2. 将存储桶设置为公开访问权限');
    console.log('3. 运行音频上传测试验证功能');

  } catch (error) {
    console.error('❌ Supabase集成测试失败:', error.message);
    console.log('\n🔧 排查建议:');
    console.log('1. 检查.env文件中的SUPABASE_URL和SUPABASE_ANON_KEY配置');
    console.log('2. 确认网络连接正常');
    console.log('3. 检查Supabase项目是否正常运行');
  }
}

// 运行测试
testSupabaseIntegration();