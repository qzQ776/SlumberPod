const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getSupabaseClient } = require('./services/supabaseService'); // 使用统一的Supabase客户端
const supabase = getSupabaseClient();

// 配置multer用于音频文件上传
const audioStorage = multer.diskStorage({
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

// 配置multer用于图片文件上传
const imageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/images');
    
    // 确保上传目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名：时间戳 + 随机数 + 原扩展名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'cover-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// 音频文件过滤器
const audioFileFilter = (req, file, cb) => {
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

// 图片文件过滤器
const imageFileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件 (JPEG, PNG, GIF, WebP, BMP等)'), false);
  }
};

// 音频上传配置
const audioUpload = multer({
  storage: audioStorage,
  fileFilter: audioFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB限制
    files: 1 // 每次只允许上传一个音频文件
  }
});

// 图片上传配置
const imageUpload = multer({
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB限制
    files: 1 // 每次只允许上传一个图片文件
  }
});

// 同时上传音频和封面的配置
const combinedUpload = multer({
  storage: multer.memoryStorage(), // 使用内存存储，避免文件系统冲突
  fileFilter: (req, file, cb) => {
    // 根据字段名判断文件类型
    if (file.fieldname === 'file') {
      // 音频文件使用音频过滤器
      audioFileFilter(req, file, cb);
    } else if (file.fieldname === 'cover') {
      // 封面文件使用图片过滤器
      imageFileFilter(req, file, cb);
    } else {
      cb(new Error('未知的文件字段'), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB限制（音频）
    files: 2 // 允许上传两个文件（音频+封面）
  }
}).fields([
  { name: 'file', maxCount: 1 }, // 音频文件字段
  { name: 'cover', maxCount: 1 } // 封面图片字段
  // 其他字段（如title、description等）由req.body处理，不在files中定义
]);

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
      audioUpload.single('file')(req, res, async (err) => {
        if (err) {
          return reject(err);
        }
        
        if (!req.file) {
          return reject(new Error('请选择要上传的音频文件'));
        }
        
        try {
          const file = req.file;
          
          // 读取文件内容
          const fileBuffer = fs.readFileSync(file.path);
          
          // 生成唯一文件名（清理文件名中的特殊字符）
          const cleanFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
          const fileName = `audios/${Date.now()}-${cleanFileName}`;
          
          console.log('开始上传音频到Supabase Storage:', fileName);
          
          // 上传到Supabase Storage
          const { data, error } = await supabase.storage
            .from('audio-files') // 存储桶名称
            .upload(fileName, fileBuffer, {
              contentType: file.mimetype,
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
          
          // 获取表单字段（标题和描述）
          const title = req.body.title || req.body.Title || null;
          const description = req.body.description || req.body.Description || null;
          
          console.log('表单字段 - title:', title, 'description:', description);
          
          // 清理本地临时文件
          fs.unlinkSync(file.path);
          
          const fileInfo = {
            filename: file.filename,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            storagePath: fileName,
            url: publicUrl,
            title: title, // 传递标题信息
            description: description // 传递描述信息
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
   * 同时上传音频和封面到Supabase Storage
   */
  async uploadAudioWithCoverToSupabase(req, res) {
    return new Promise((resolve, reject) => {
      combinedUpload(req, res, async (err) => {
        if (err) {
          return reject(err);
        }
        
        if (!req.files || !req.files.file || req.files.file.length === 0) {
          return reject(new Error('请选择要上传的音频文件'));
        }
        
        try {
          const audioFile = req.files.file[0];
          const coverFile = req.files.cover ? req.files.cover[0] : null;
          
          let coverUrl = null;
          let coverPath = null;
          
          // 如果提供了封面图片，先上传封面
          if (coverFile) {
            console.log('开始上传封面图片到Supabase Storage');
            const coverBuffer = coverFile.buffer; // 直接从内存中获取
            
            // 生成封面文件名
            const cleanCoverName = coverFile.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
            const coverFileName = `covers/${Date.now()}-${cleanCoverName}`;
            
            // 上传封面到Supabase Storage
            const { data: coverData, error: coverError } = await supabase.storage
              .from('audios_cover_url')
              .upload(coverFileName, coverBuffer, {
                contentType: coverFile.mimetype,
                upsert: false
              });
            
            if (coverError) {
              console.error('封面图片上传失败:', coverError);
              throw coverError;
            }
            
            // 获取封面公开URL
            const { data: { publicUrl: coverPublicUrl } } = supabase.storage
              .from('audios_cover_url')
              .getPublicUrl(coverFileName);
            
            coverUrl = coverPublicUrl;
            coverPath = coverData.path;
            
            console.log('封面图片上传成功:', coverUrl);
          }
          
          // 上传音频文件
          const audioBuffer = audioFile.buffer; // 直接从内存中获取
          const cleanAudioName = audioFile.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
          const audioFileName = `audios/${Date.now()}-${cleanAudioName}`;
          
          console.log('开始上传音频到Supabase Storage:', audioFileName);
          
          const { data: audioData, error: audioError } = await supabase.storage
            .from('audio-files')
            .upload(audioFileName, audioBuffer, {
              contentType: audioFile.mimetype,
              upsert: false
            });
          
          if (audioError) {
            console.error('音频文件上传失败:', audioError);
            throw audioError;
          }
          
          // 获取音频公开URL
          const { data: { publicUrl: audioPublicUrl } } = supabase.storage
            .from('audio-files')
            .getPublicUrl(audioFileName);
          
          console.log('音频文件上传成功:', audioPublicUrl);
          
          // 获取表单字段
          const title = req.body.title || req.body.Title || null;
          const description = req.body.description || req.body.Description || null;
          const isPublic = req.body.is_public || req.body.isPublic || '1';
          const isFree = req.body.is_free || req.body.isFree || '1';
          const categoryIds = req.body.category_ids || req.body.categoryIds || '';
          
          console.log('表单字段 - title:', title, 'description:', description, 'isPublic:', isPublic, 'isFree:', isFree);
          
          const fileInfo = {
            filename: audioFile.filename,
            originalname: audioFile.originalname,
            mimetype: audioFile.mimetype,
            size: audioFile.size,
            storagePath: audioData.path,
            url: audioPublicUrl,
            title: title,
            description: description,
            coverUrl: coverUrl,
            coverPath: coverPath,
            isPublic: isPublic,
            isFree: isFree,
            categoryIds: categoryIds
          };
          
          resolve(fileInfo);
        } catch (error) {
          console.error('音频和封面上传过程出错:', error);
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

// 创建服务实例
const uploadService = new AudioUploadService();

// 导出服务实例和中间件
module.exports = {
  uploadAudioToSupabase: uploadService.uploadAudioToSupabase.bind(uploadService),
  uploadAudioWithCoverToSupabase: uploadService.uploadAudioWithCoverToSupabase.bind(uploadService),
  combinedUpload // 导出多文件上传中间件
};