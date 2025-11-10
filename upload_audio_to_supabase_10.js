const fs = require('fs');
const path = require('path');
const { uploadAudioToSupabase, getMysqlConnection } = require('./server/services/supabaseService');

// 音频文件路径
const audioFilePath = path.join(__dirname, '音频', '环境音-白噪音 鸟语花香 春暖花开 风声 鸟叫声 好听环境音_爱给网_aigei_com.mp3');

async function uploadAudioAndUpdateDatabase() {
    try {
        console.log('开始上传音频到Supabase...');
        
        // 1. 读取音频文件
        const audioBuffer = fs.readFileSync(audioFilePath);
        const fileName = '环境音-白噪音 鸟语花香 春暖花开 风声 鸟叫声 好听环境音_爱给网_aigei_com.mp3';
        
        // 2. 上传到Supabase存储桶
        const uploadResult = await uploadAudioToSupabase(audioBuffer, fileName, 'audios');
        
        if (!uploadResult.success) {
            throw new Error(`音频上传失败: ${uploadResult.error}`);
        }
        
        console.log('✅ 音频上传成功:', uploadResult.url);
        
        // 3. 更新MySQL数据库中的audio_id为10的记录
        const connection = await getMysqlConnection();
        
        try {
            // 先检查audio_id为10的记录是否存在
            const [rows] = await connection.execute(
                'SELECT audio_id, title FROM audios WHERE audio_id = ?',
                [10]
            );
            
            if (rows.length === 0) {
                throw new Error('audio_id为10的音频记录不存在');
            }
            
            console.log('✅ 找到音频记录:', rows[0].title);
            
            // 更新audio_url字段
            const [updateResult] = await connection.execute(
                'UPDATE audios SET audio_url = ?, updated_at = NOW() WHERE audio_id = ?',
                [uploadResult.url, 10]
            );
            
            if (updateResult.affectedRows === 1) {
                console.log('✅ 数据库更新成功');
                console.log('✅ 音频URL已更新到audio_id为10的记录中');
                console.log('✅ 音频URL:', uploadResult.url);
            } else {
                throw new Error('数据库更新失败，未影响任何记录');
            }
            
        } finally {
            await connection.end();
        }
        
        console.log('\n✅ 任务完成！');
        
    } catch (error) {
        console.error('❌ 操作失败:', error.message);
        process.exit(1);
    }
}

// 执行上传和更新
uploadAudioAndUpdateDatabase();