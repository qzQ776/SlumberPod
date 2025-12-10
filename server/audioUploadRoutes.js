const express = require('express');
const router = express.Router();
const { uploadAudioToSupabase, uploadAudioWithCoverToSupabase, combinedUpload } = require('./audioUploadHandler');

// 音频文件上传接口（仅音频）
router.post('/upload', async (req, res) => {
  try {
    console.log('🎵 音频上传请求开始，openid:', req.openid);
    
    // 验证用户登录状态
    if (!req.openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录，请先登录'
      });
    }
    
    const fileInfo = await uploadAudioToSupabase(req, res);
    console.log('✅ 音频文件上传到Supabase成功:', fileInfo);
    
    // 从fileInfo中获取标题和描述
    const title = fileInfo.title || fileInfo.originalname || '未命名音频';
    const description = fileInfo.description || '';
    const isPublic = parseInt(fileInfo.isPublic) || 1;
    const isFree = parseInt(fileInfo.isFree) || 1;
    const categoryIds = fileInfo.categoryIds ? fileInfo.categoryIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) : [];
    
    // 创建音频数据库记录
    const AudioModel = require('./database/models/Audio');
    const audioData = {
      owner_openid: req.openid,
      title: title,
      description: description,
      audio_url: fileInfo.url,
      cover_url: null, // 初始化为null，后续可通过单独上传接口更新
      duration_seconds: null,
      is_public: isPublic,
      is_free: isFree,
      type: 'user_created',
      is_user_creation: 1
    };
    
    console.log('📝 准备创建音频数据库记录:', audioData);
    
    const result = await AudioModel.createAudio(audioData);
    
    if (!result.success) {
      console.error('❌ 创建音频记录失败:', result.error);
      throw new Error(result.error || '创建音频记录失败');
    }
    
    // 如果提供了分类ID，关联音频和分类
    if (categoryIds.length > 0) {
      try {
        await AudioModel.mapAudioToCategories(result.data.audio_id, categoryIds);
        console.log('✅ 音频分类关联成功');
      } catch (categoryError) {
        console.warn('⚠️ 音频分类关联失败，但音频已创建:', categoryError);
        // 分类关联失败不影响音频创建
      }
    }
    
    console.log('✅ 音频数据库记录创建成功，音频ID:', result.data.audio_id);
    
    res.json({
      success: true,
      message: '音频上传成功，您可以通过 /api/audio/:audioId/cover/upload 接口单独上传图标',
      data: {
        audio_id: result.data.audio_id,
        title: title,
        description: description,
        audio_url: fileInfo.url,
        cover_url: null,
        is_public: isPublic,
        is_free: isFree,
        category_ids: categoryIds,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ 音频上传失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '音频上传失败，请稍后重试',
      error_code: 'AUDIO_UPLOAD_ERROR'
    });
  }
});

// 同时上传音频和封面接口（音频+图标）
router.post('/upload-with-cover', combinedUpload, async (req, res) => {
  try {
    console.log('🎵+🖼️ 音频和图标同时上传请求开始，openid:', req.openid);
    
    // 验证用户登录状态
    if (!req.openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录，请先登录',
        error_code: 'AUTH_REQUIRED'
      });
    }
    
    // 验证文件上传
    if (!req.files || (!req.files.file && !req.files.cover)) {
      return res.status(400).json({
        success: false,
        message: '请同时选择音频文件和图标文件',
        error_code: 'FILES_REQUIRED'
      });
    }
    
    if (!req.files.file) {
      return res.status(400).json({
        success: false,
        message: '请选择音频文件',
        error_code: 'AUDIO_FILE_REQUIRED'
      });
    }
    
    if (!req.files.cover) {
      return res.status(400).json({
        success: false,
        message: '请选择图标文件',
        error_code: 'COVER_FILE_REQUIRED'
      });
    }
    
    console.log('📁 上传文件信息:', {
      audioFile: req.files.file[0]?.originalname,
      coverFile: req.files.cover[0]?.originalname
    });
    
    const fileInfo = await uploadAudioWithCoverToSupabase(req, res);
    console.log('✅ 音频和图标文件上传到Supabase成功:', fileInfo);
    
    // 从fileInfo中获取标题和描述
    const title = fileInfo.title || fileInfo.originalname || '未命名音频';
    const description = fileInfo.description || '';
    const isPublic = parseInt(fileInfo.isPublic) || 1;
    const isFree = parseInt(fileInfo.isFree) || 1;
    const categoryIds = fileInfo.categoryIds ? fileInfo.categoryIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) : [];
    
    // 创建音频数据库记录
    const AudioModel = require('./database/models/Audio');
    const audioData = {
      owner_openid: req.openid,
      title: title,
      description: description,
      audio_url: fileInfo.url,
      cover_url: fileInfo.coverUrl || null,
      duration_seconds: null,
      is_public: isPublic,
      is_free: isFree,
      type: 'user_created',
      is_user_creation: 1
    };
    
    console.log('📝 准备创建带图标的音频数据库记录:', audioData);
    
    const result = await AudioModel.createAudio(audioData);
    
    if (!result.success) {
      console.error('❌ 创建音频记录失败:', result.error);
      throw new Error(result.error || '创建音频记录失败');
    }
    
    // 如果提供了分类ID，关联音频和分类
    if (categoryIds.length > 0) {
      try {
        await AudioModel.mapAudioToCategories(result.data.audio_id, categoryIds);
        console.log('✅ 音频分类关联成功');
      } catch (categoryError) {
        console.warn('⚠️ 音频分类关联失败，但音频已创建:', categoryError);
        // 分类关联失败不影响音频创建
      }
    }
    
    console.log('✅ 音频数据库记录创建成功，音频ID:', result.data.audio_id);
    
    res.json({
      success: true,
      message: '音频和图标同时上传成功',
      data: {
        audio_id: result.data.audio_id,
        title: title,
        description: description,
        audio_url: fileInfo.url,
        cover_url: fileInfo.coverUrl,
        is_public: isPublic,
        is_free: isFree,
        category_ids: categoryIds,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ 音频和图标同时上传失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '音频和图标上传失败，请稍后重试',
      error_code: 'AUDIO_COVER_UPLOAD_ERROR'
    });
  }
});

module.exports = router;