const express = require('express');
const router = express.Router();
const uploadService = require('./audioUploadHandler');

// 音频文件上传接口
router.post('/upload', async (req, res) => {
  try {
    console.log('音频上传请求开始，openid:', req.openid);
    console.log('请求头:', req.headers);
    
    const fileInfo = await uploadService.uploadAudioToSupabase(req, res);
    console.log('音频文件上传成功:', fileInfo);
    
    // 创建音频数据库记录并返回音频ID
    const AudioModel = require('./database/models/Audio');
    const audioData = {
      owner_openid: req.openid,
      title: fileInfo.originalname || '未命名音频',
      description: null,
      audio_url: fileInfo.url,
      cover_url: null,
      duration_seconds: null,
      is_public: 1,
      is_free: 1,
      type: 'user_created',
      is_user_creation: 1
    };
    
    console.log('准备创建音频数据库记录:', audioData);
    
    const result = await AudioModel.createAudio(audioData);
    
    if (!result.success) {
      console.error('创建音频记录失败:', result.error);
      throw new Error(result.error || '创建音频记录失败');
    }
    
    console.log('音频数据库记录创建成功:', result.data);
    
    res.json({
      success: true,
      message: '音频上传成功',
      data: {
        ...fileInfo,
        audio_id: result.data.audio_id
      }
    });
  } catch (error) {
    console.error('音频上传失败:', error);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;