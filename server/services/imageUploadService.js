const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// 加载环境变量
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Supabase配置
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Supabase客户端单例
let supabaseClient = null;

// === 客户端管理 ===
function getSupabaseClient() {
  if (!supabaseClient) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('缺少Supabase配置：SUPABASE_URL和SUPABASE_ANON_KEY');
    }
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
  }
  return supabaseClient;
}

// === 图片上传服务 ===

/**
 * 验证图片文件合法性（大小和类型）
 * @param {number} fileSize - 文件大小（字节）
 * @param {string} fileName - 文件名（用于获取扩展名）
 */
function validateImageFile(fileSize, fileName) {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  const fileExt = path.extname(fileName).toLowerCase();

  if (fileSize > maxSize) {
    throw new Error(`图片大小超过限制（最大${maxSize / 1024 / 1024}MB）`);
  }

  if (!allowedExtensions.includes(fileExt)) {
    throw new Error(`不支持的图片格式，支持：${allowedExtensions.join(', ')}`);
  }
}

/**
 * 生成唯一文件名（避免重复）
 * @param {string} originalName - 原始文件名
 * @param {string} folder - 存储文件夹
 * @param {string} prefix - 文件前缀
 * @returns {string} 唯一文件路径
 */
function generateUniqueFileName(originalName, folder = 'images', prefix = '') {
  const cleanName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).slice(2, 10);
  const fileExt = path.extname(originalName).toLowerCase();
  
  return `${folder}/${prefix}${timestamp}-${randomStr}-${cleanName.replace(fileExt, '')}${fileExt}`;
}

/**
 * 获取图片MIME类型
 * @param {string} fileName - 文件名
 * @returns {string} MIME类型
 */
function getImageContentType(fileName) {
  const ext = path.extname(fileName).toLowerCase().slice(1);
  const mimeMap = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp'
  };
  return mimeMap[ext] || 'image/jpeg';
}

/**
 * 上传图片到Supabase Storage
 * @param {Buffer} fileBuffer - 文件缓冲区
 * @param {string} originalName - 原始文件名
 * @param {string} folder - 存储文件夹
 * @param {string} prefix - 文件前缀
 * @returns {Promise<{success: boolean, url: string, filePath: string}>} 上传结果
 */
async function uploadImageToSupabase(fileBuffer, originalName, folder = 'images', prefix = '') {
  try {
    // 1. 验证文件
    validateImageFile(fileBuffer.length, originalName);

    // 2. 生成唯一文件名
    const filePath = generateUniqueFileName(originalName, folder, prefix);

    // 3. 上传到Supabase - 使用服务密钥绕过行级安全策略
    const uploadClient = serviceRoleKey ? 
      createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } }) :
      getSupabaseClient();
      
    const { data, error } = await uploadClient.storage
      .from('image')
      .upload(filePath, fileBuffer, {
        contentType: getImageContentType(originalName),
        upsert: false
      });

    if (error) throw new Error(`上传失败: ${error.message}`);

    // 4. 获取公开URL - 使用普通客户端
    const publicClient = getSupabaseClient();
    const { data: urlData } = publicClient.storage
      .from('image')
      .getPublicUrl(filePath);

    return {
      success: true,
      url: urlData.publicUrl,
      filePath: data.path
    };
  } catch (error) {
    console.error('图片上传失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 从Supabase删除图片文件
 * @param {string} filePath - 文件路径
 * @returns {Promise<{success: boolean}>} 删除结果
 */
async function deleteImageFromSupabase(filePath) {
  try {
    const { error } = await getSupabaseClient()
      .storage
      .from('image')
      .remove([filePath]);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('图片删除失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 上传用户头像
 * @param {Buffer} fileBuffer - 头像文件缓冲区
 * @param {string} originalName - 原始文件名
 * @param {string} openid - 用户openid
 * @returns {Promise<{success: boolean, url: string, filePath: string}>} 上传结果
 */
async function uploadUserAvatar(fileBuffer, originalName, openid) {
  return await uploadImageToSupabase(fileBuffer, originalName, 'user_avatar_url', `avatar_${openid}_`);
}

/**
 * 上传白噪音封面（带音频ID）
 * @param {Buffer} fileBuffer - 封面文件缓冲区
 * @param {string} originalName - 原始文件名
 * @param {string} audioId - 音频ID
 * @returns {Promise<{success: boolean, url: string, filePath: string}>} 上传结果
 */
async function uploadAudioCover(fileBuffer, originalName, audioId) {
  return await uploadImageToSupabase(fileBuffer, originalName, 'audios_cover_url', `cover_${audioId}_`);
}

/**
 * 上传临时白噪音封面（音频ID未知时使用）
 * @param {Buffer} fileBuffer - 封面文件缓冲区
 * @param {string} originalName - 原始文件名
 * @param {string} openid - 用户openid
 * @returns {Promise<{success: boolean, url: string, filePath: string}>} 上传结果
 */
async function uploadTempAudioCover(fileBuffer, originalName, openid) {
  return await uploadImageToSupabase(fileBuffer, originalName, 'temp_covers', `temp_cover_${openid}_`);
}

/**
 * 处理多格式上传（支持Base64和文件Buffer）
 * @param {Object} uploadData - 上传数据
 * @param {string} uploadData.type - 上传类型：'avatar' 或 'cover'
 * @param {string} uploadData.openid - 用户openid（头像上传时必填）
 * @param {string} uploadData.audioId - 音频ID（封面上传时必填）
 * @param {Buffer} [uploadData.fileBuffer] - 文件缓冲区
 * @param {string} [uploadData.base64] - Base64编码的图片数据
 * @param {string} uploadData.fileName - 文件名
 * @returns {Promise<{success: boolean, url: string, filePath: string}>} 上传结果
 */
async function handleImageUpload(uploadData) {
  try {
    const { type, openid, audioId, fileBuffer, base64, fileName } = uploadData;

    // 验证必要参数
    if (!fileName) {
      throw new Error('文件名不能为空');
    }

    let imageBuffer;
    
    // 处理Base64格式
    if (base64) {
      // 移除Base64前缀（如"data:image/jpeg;base64,"）
      const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else if (fileBuffer) {
      imageBuffer = fileBuffer;
    } else {
      throw new Error('必须提供文件缓冲区或Base64数据');
    }

    // 根据类型调用不同的上传函数
    if (type === 'avatar') {
      if (!openid) throw new Error('用户头像上传需要openid');
      return await uploadUserAvatar(imageBuffer, fileName, openid);
    } else if (type === 'cover') {
      if (!audioId) throw new Error('白噪音封面上传需要audioId');
      return await uploadAudioCover(imageBuffer, fileName, audioId);
    } else {
      throw new Error('不支持的图片类型，支持：avatar, cover');
    }
  } catch (error) {
    console.error('处理图片上传失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 存储桶初始化
 * @returns {Promise<{success: boolean, exists: boolean, created: boolean}>}
 */
async function ensureImageBucketExists() {
  try {
    const bucketName = 'image';
    
    // 先尝试使用服务密钥创建存储桶（绕过行级安全策略）
    if (!serviceRoleKey) {
      throw new Error('缺少SUPABASE_SERVICE_ROLE_KEY，无法创建存储桶');
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    // 尝试创建存储桶
    const { error } = await adminClient.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
    });

    // 如果是"已存在"错误，说明存储桶已经存在，这是正常的
    if (error && !error.message.includes('already exists')) {
      throw error;
    }

    return { 
      success: true, 
      exists: true, 
      created: error ? false : true 
    };
  } catch (error) {
    console.error('图片存储桶初始化失败:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  // 核心上传函数
  uploadUserAvatar,
  uploadAudioCover,
  uploadTempAudioCover,
  handleImageUpload,
  
  // 删除函数
  deleteImageFromSupabase,
  
  // 工具函数
  validateImageFile,
  generateUniqueFileName,
  getImageContentType,
  ensureImageBucketExists,
  
  // 客户端
  getSupabaseClient
};