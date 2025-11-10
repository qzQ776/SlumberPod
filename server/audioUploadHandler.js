const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getSupabaseClient } = require('./services/supabaseService'); // 使用统一的Supabase客户端
const supabase = getSupabaseClient();

// 配置multer用于文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/audio');
    
    // 确保上传目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名：时间戳 + 随机数 + 原扩展名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'audio-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// 文件过滤器 - 只允许音频文件
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'audio/mpeg',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/mp3',
    'audio/mp4',
    'audio/aac',
    'audio/ogg',
    'audio/webm'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传音频文件 (MP3, WAV, AAC, OGG, WebM等)'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB限制
    files: 1 // 每次只允许上传一个文件
  }
}).single('file'); // 明确指定字段名为'file'，避免Unexpected field错误

/**
 * 音频上传服务
 */
class AudioUploadService {
  
  /**
   * 上传音频文件到本地服务器
   */
  async uploadAudioToLocal(req, res) {
    return new Promise((resolve, reject) => {
      upload(req, res, async (err) => {
        if (err) {
          return reject(err);
        }
        
        if (!req.file) {
          return reject(new Error('请选择要上传的音频文件'));
        }
        
        try {
          const fileInfo = {
            filename: req.file.filename,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path,
            url: `/uploads/audio/${req.file.filename}`
          };
          
          resolve(fileInfo);
        } catch (error) {
          reject(error);
        }
      });
    });
  }
  
  /**
   * 上传音频文件到Supabase Storage
   */
  async uploadAudioToSupabase(req, res) {
    return new Promise((resolve, reject) => {
      upload(req, res, async (err) => {
        if (err) {
          return reject(err);
        }
        
        if (!req.file) {
          return reject(new Error('请选择要上传的音频文件'));
        }
        
        try {
          // 读取文件内容
          const fileBuffer = fs.readFileSync(req.file.path);
          
          // 生成唯一文件名（清理文件名中的特殊字符）
          const cleanFileName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
          const fileName = `audios/${Date.now()}-${cleanFileName}`;
          
          console.log('开始上传音频到Supabase Storage:', fileName);
          
          // 上传到Supabase Storage
          const { data, error } = await supabase.storage
            .from('audio-files') // 存储桶名称
            .upload(fileName, fileBuffer, {
              contentType: req.file.mimetype,
              upsert: false
            });
          
          if (error) {
            console.error('Supabase Storage上传失败:', error);
            throw error;
          }
          
          console.log('Supabase Storage上传成功:', data);
          
          // 获取公开URL
          const { data: { publicUrl } } = supabase.storage
            .from('audio-files')
            .getPublicUrl(fileName);
          
          console.log('获取公开URL:', publicUrl);
          
          // 清理本地临时文件
          fs.unlinkSync(req.file.path);
          
          const fileInfo = {
            filename: req.file.filename,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            storagePath: fileName,
            url: publicUrl
          };
          
          resolve(fileInfo);
        } catch (error) {
          console.error('音频上传过程出错:', error);
          // 确保清理临时文件
          if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          reject(error);
        }
      });
    });
  }
  
  /**
   * 获取音频时长（秒）
   */
  async getAudioDuration(filePath) {
    // 简化版本 - 实际项目中应该使用音频处理库如 node-ffmpeg
    // 这里返回一个默认值，实际应该解析音频文件
    return new Promise((resolve) => {
      // 模拟音频时长计算
      // 实际应该使用: const ffmpeg = require('fluent-ffmpeg');
      setTimeout(() => {
        // 基于文件大小估算时长（粗略估算）
        const stats = fs.statSync(filePath);
        const estimatedDuration = Math.round(stats.size / (128 * 1024)); // 假设128kbps码率
        resolve(Math.max(30, Math.min(3600, estimatedDuration))); // 限制在30秒到1小时之间
      }, 100);
    });
  }
  
/**
 * 保存音频信息到数据库
 */
async saveAudioToDatabase(audioData) {
  try {
    // 从请求的 headers 或 session 中获取 openid
    const openid = this.req.headers['x-openid'] || this.req.session.openid;

    const { data, error } = await supabase
      .from('audios')
      .insert([{
        title: audioData.title,
        description: audioData.description || '',
        audio_url: audioData.url,
        duration: audioData.duration || 180,
        category_id: audioData.categoryId,
        owner_openid: openid  // 使用自动获取的 openid
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('保存音频信息失败:', error);
    throw error;
  }
}
  
  /**
   * 验证音频文件
   */
  validateAudioFile(fileInfo) {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedExtensions = ['.mp3', '.wav', '.aac', '.ogg', '.m4a', '.webm'];
    
    if (fileInfo.size > maxSize) {
      throw new Error(`音频文件大小不能超过 ${maxSize / 1024 / 1024}MB`);
    }
    
    const ext = path.extname(fileInfo.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      throw new Error(`不支持的文件格式。支持格式: ${allowedExtensions.join(', ')}`);
    }
    
    return true;
  }
}

module.exports = new AudioUploadService();