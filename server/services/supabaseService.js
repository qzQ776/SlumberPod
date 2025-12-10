const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise'); // 引入MySQL客户端

// 加载环境变量
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// === Supabase配置 ===
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// MySQL配置（从环境变量读取）
const mysqlConfig = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT || 3306
};

// Supabase客户端单例
let supabaseClient = null;
let supabaseServiceClient = null;

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

function getSupabaseServiceClient() {
  if (!supabaseServiceClient) {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('缺少Supabase服务端配置：SUPABASE_SERVICE_ROLE_KEY');
    }
    supabaseServiceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });
  }
  return supabaseServiceClient;
}

// === 通用工具函数 ===
/**
 * 验证音频文件合法性（大小和类型）
 * @param {number} fileSize - 文件大小（字节）
 * @param {string} fileName - 文件名（用于获取扩展名）
 */
function validateAudioFile(fileSize, fileName) {
  const maxSize = 50 * 1024 * 1024; // 50MB
  const allowedExtensions = ['.mp3', '.wav', '.aac', '.ogg', '.m4a', '.webm'];
  const fileExt = path.extname(fileName).toLowerCase();

  if (fileSize > maxSize) {
    throw new Error(`文件大小超过限制（最大${maxSize / 1024 / 1024}MB）`);
  }

  if (!allowedExtensions.includes(fileExt)) {
    throw new Error(`不支持的格式，支持：${allowedExtensions.join(', ')}`);
  }
}

/**
 * 生成唯一文件名（避免重复）
 * @param {string} originalName - 原始文件名
 * @param {string} folder - 存储文件夹
 * @returns {string} 唯一文件路径
 */
function generateUniqueFileName(originalName, folder = 'audios') {
  const cleanName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${cleanName}`;
}

/**
 * 获取文件MIME类型
 * @param {string} fileName - 文件名
 * @returns {string} MIME类型
 */
function getContentType(fileName) {
  const ext = path.extname(fileName).toLowerCase().slice(1);
  const mimeMap = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    aac: 'audio/aac',
    m4a: 'audio/mp4',
    ogg: 'audio/ogg',
    webm: 'audio/webm'
  };
  return mimeMap[ext] || 'audio/mpeg';
}

// === Supabase存储操作 ===
/**
 * 上传音频到Supabase Storage
 * @param {Buffer} fileBuffer - 文件缓冲区
 * @param {string} originalName - 原始文件名
 * @param {string} folder - 存储文件夹
 * @returns {Promise<{success: boolean, url: string, filePath: string}>} 上传结果
 */
async function uploadAudioToSupabase(fileBuffer, originalName, folder = 'audios') {
  try {
    // 1. 验证文件
    validateAudioFile(fileBuffer.length, originalName);

    // 2. 生成唯一文件名
    const filePath = generateUniqueFileName(originalName, folder);

    // 3. 上传到Supabase
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.storage
      .from('audio-files')
      .upload(filePath, fileBuffer, {
        contentType: getContentType(originalName),
        upsert: false
      });

    if (error) throw new Error(`上传失败: ${error.message}`);

    // 4. 获取公开URL
    const { data: urlData } = supabase.storage
      .from('audio-files')
      .getPublicUrl(filePath);

    return {
      success: true,
      url: urlData.publicUrl,
      filePath: data.path
    };
  } catch (error) {
    console.error('Supabase上传失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 从Supabase删除音频文件
 * @param {string} filePath - 文件路径
 * @returns {Promise<{success: boolean}>} 删除结果
 */
async function deleteAudioFromSupabase(filePath) {
  try {
    const { error } = await getSupabaseClient()
      .storage
      .from('audio-files')
      .remove([filePath]);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Supabase删除失败:', error);
    return { success: false, error: error.message };
  }
}

// === MySQL数据库操作（存储URL） ===
/**
 * 初始化MySQL连接
 * @returns {Promise<Connection>} MySQL连接实例
 */
async function getMysqlConnection() {
  try {
    return await mysql.createConnection(mysqlConfig);
  } catch (error) {
    throw new Error(`MySQL连接失败: ${error.message}`);
  }
}

/**
 * 将音频URL保存到MySQL（适配audios表结构）
 * @param {Object} audioData - 音频信息
 * @param {string} audioData.title - 标题（必填）
 * @param {string} audioData.audio_url - Supabase音频URL（必填）
 * @param {string} [audioData.owner_openid] - 上传者openid（可选）
 * @param {string} [audioData.description] - 描述（可选）
 * @param {string} [audioData.cover_url] - 封面URL（可选）
 * @param {number} [audioData.duration_seconds] - 时长（秒，可选）
 * @param {number} [audioData.is_free=0] - 是否免费（1/0，默认0）
 * @param {number} [audioData.is_public=1] - 是否公开（1/0，默认1）
 * @param {string} [audioData.type='user_created'] - 类型（system/user_created，默认user_created）
 * @param {number} [audioData.is_user_creation=1] - 是否用户创作（1/0，默认1）
 * @returns {Promise<{success: boolean, id: number}>} 保存结果
 */
async function saveAudioUrlToMySQL(audioData) {
  const connection = await getMysqlConnection();
  try {
    const [result] = await connection.execute(
      `INSERT INTO audios 
       (
         owner_openid, title, description, cover_url, audio_url, 
         duration_seconds, is_free, is_public, type, 
         created_at, updated_at, is_user_creation
       ) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)`,
      [
        audioData.owner_openid || null, // 可选，用户openid
        audioData.title, // 必填
        audioData.description || null, // 可选
        audioData.cover_url || null, // 可选
        audioData.audio_url, // 必填（Supabase URL）
        audioData.duration_seconds || null, // 可选
        audioData.is_free ?? 0, // 默认为0（不免费）
        audioData.is_public ?? 1, // 默认为1（公开）
        audioData.type ?? 'user_created', // 默认为用户创作
        audioData.is_user_creation ?? 1 // 默认为用户创作
      ]
    );

    return {
      success: true,
      id: result.insertId // 返回音频ID（audio_id）
    };
  } catch (error) {
    console.error('MySQL保存失败:', error);
    return { success: false, error: error.message };
  } finally {
    await connection.end(); // 关闭连接
  }
}

// 新增：处理音频与分类的关联（插入audio_category_mapping）
/**
 * 关联音频与分类
 * @param {number} audioId - 音频ID（audio_id）
 * @param {number[]} categoryIds - 分类ID数组
 * @returns {Promise<{success: boolean}>} 关联结果
 */
async function mapAudioToCategories(audioId, categoryIds) {
  if (!categoryIds || categoryIds.length === 0) {
    return { success: true, message: '未传入分类ID，无需关联' };
  }

  const connection = await getMysqlConnection();
  try {
    // 批量插入关联数据
    const values = categoryIds.map(cid => `(${audioId}, ${cid})`).join(',');
    await connection.execute(
      `INSERT INTO audio_category_mapping (audio_id, category_id) VALUES ${values}`
    );

    return { success: true };
  } catch (error) {
    console.error('分类关联失败:', error);
    return { success: false, error: error.message };
  } finally {
    await connection.end();
  }
}

// === 存储桶初始化 ===
async function ensureBucketExists() {
  try {
    const supabase = getSupabaseClient();
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketName = 'audio-files';

    if (buckets?.some(b => b.name === bucketName)) {
      return { success: true, exists: true };
    }

    // 用服务端客户端创建存储桶
    const serviceClient = getSupabaseServiceClient();
    const { error } = await serviceClient.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 50 * 1024 * 1024,
      allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/aac', 'audio/ogg', 'audio/mp4', 'audio/webm']
    });

    if (error) throw error;
    return { success: true, exists: true, created: true };
  } catch (error) {
    console.error('存储桶初始化失败:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  // 客户端
  getSupabaseClient,
  getSupabaseServiceClient,
  getMysqlConnection,

  // 核心操作
  uploadAudioToSupabase,
  deleteAudioFromSupabase,
  saveAudioUrlToMySQL,

  // 工具函数
  validateAudioFile,
  generateUniqueFileName,
  getContentType,
  ensureBucketExists
};