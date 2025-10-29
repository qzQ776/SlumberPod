const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uhddqryjkororlxlqgna.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoZGRxcnlqa29yb3JseGxxZ25hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NDMyODIsImV4cCI6MjA3NzExOTI4Mn0.7430326qr1tuVLFyi8ivxq6PFqHZMVwo3o8xtn4DU3U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuth() {
  console.log('开始测试Supabase认证功能...\n');
  
  // 测试1: 检查Supabase连接
  console.log('1. 测试Supabase连接...');
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error) {
      console.log('❌ 连接测试失败:', error.message);
    } else {
      console.log('✅ 连接测试成功');
    }
  } catch (error) {
    console.log('❌ 连接测试异常:', error.message);
  }
  
  // 测试2: 尝试注册新用户
  console.log('\n2. 测试用户注册...');
  const testEmail = `test${Date.now()}@slumberpod.com`;
  const testPassword = 'Test123456';
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });
    
    if (error) {
      console.log('❌ 注册测试失败:');
      console.log('   错误信息:', error.message);
      console.log('   状态码:', error.status);
      console.log('   错误代码:', error.code);
      console.log('   完整错误:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ 注册测试成功');
      console.log('   用户ID:', data.user?.id);
      console.log('   会话:', data.session ? '有会话' : '无会话');
      console.log('   需要确认:', data.user?.email_confirmed_at ? '已确认' : '未确认');
    }
  } catch (error) {
    console.log('❌ 注册测试异常:', error.message);
  }
  
  // 测试3: 检查认证设置
  console.log('\n3. 检查认证设置...');
  try {
    // 尝试获取当前认证状态
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      console.log('✅ 当前有登录用户:', user.email);
    } else {
      console.log('ℹ️ 当前无登录用户');
    }
  } catch (error) {
    console.log('❌ 认证状态检查失败:', error.message);
  }
  
  console.log('\n测试完成！');
}

testAuth().catch(console.error);