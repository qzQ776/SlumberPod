const { createClient } = require('@supabase/supabase-js')

// Supabase配置
const supabaseUrl = 'https://uhddqryjkororlxlqgna.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoZGRxcnlqa29yb3JseGxxZ25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU0MzI4MiwiZXhwIjoyMDc3MTE5MjgyfQ.MzyVhs2cPAHxEoV6dctanUQC2B0QKZBPp9v9L5FW2xk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  console.log('🔍 测试Supabase数据库连接...')
  
  try {
    // 测试连接
    const { data, error } = await supabase
      .from('audio_categories')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('❌ 数据库连接失败:', error)
      return
    }
    
    console.log('✅ 数据库连接成功')
    
    // 检查音频分类表
    console.log('\n🔍 检查音频分类表...')
    const categories = await supabase
      .from('audio_categories')
      .select('*')
    
    if (categories.error) {
      console.error('❌ 音频分类表查询失败:', categories.error)
    } else {
      console.log(`✅ 音频分类表存在，共有 ${categories.data.length} 条记录`)
      if (categories.data.length > 0) {
        console.log('📋 分类列表:')
        categories.data.forEach(cat => {
          console.log(`   - ${cat.name} (ID: ${cat.id})`)
        })
      }
    }
    
    // 检查音频表
    console.log('\n🔍 检查音频表...')
    const audios = await supabase
      .from('audios')
      .select('*, audio_categories(name)')
      .limit(5)
    
    if (audios.error) {
      console.error('❌ 音频表查询失败:', audios.error)
    } else {
      console.log(`✅ 音频表存在，共有 ${audios.data.length} 条记录`)
      if (audios.data.length > 0) {
        console.log('📋 音频列表:')
        audios.data.forEach(audio => {
          console.log(`   - ${audio.title} (分类: ${audio.audio_categories?.name || '无'})`)
        })
      }
    }
    
    // 检查表结构
    console.log('\n🔍 检查表结构...')
    const tableInfo = await supabase
      .from('audios')
      .select('*')
      .limit(0)
    
    if (tableInfo.error) {
      console.error('❌ 表结构查询失败:', tableInfo.error)
    } else {
      console.log('✅ 表结构正常')
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error)
  }
}

testConnection()