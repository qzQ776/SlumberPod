const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken'); // 引入JWT模块
require('dotenv').config();

// ====================== 基础配置 ======================
// 确保临时上传目录存在（用于接收前端文件）
const UPLOAD_TEMP_DIR = path.join(__dirname, '../temp-uploads');
if (!fs.existsSync(UPLOAD_TEMP_DIR)) {
  fs.mkdirSync(UPLOAD_TEMP_DIR, { recursive: true });
}

// JWT密钥（与登录时生成token的密钥一致，从环境变量读取）
const JWT_SECRET = process.env.JWT_SECRET || 'your-wechat-jwt-secret';


// ====================== 核心中间件 ======================

/**
 * 1. 微信小程序请求识别中间件
 * 作用：标记请求是否来自微信小程序，提取基础信息（UA、IP等）
 */
function wechatRequestMiddleware(req, res, next) {
  const userAgent = req.headers['user-agent'] || '';
  // 判断是否为微信小程序环境（基于UA特征）
  const isWechatMiniProgram = userAgent.includes('MicroMessenger') && 
                             (userAgent.includes('miniProgram') || userAgent.includes('wxwork'));
  
  // 将识别结果附加到req对象，供后续中间件使用
  req.isWechatMiniProgram = isWechatMiniProgram;
  
  if (isWechatMiniProgram) {
    req.wechatInfo = {
      userAgent,
      timestamp: new Date().toISOString(),
      clientIP: req.ip || req.connection.remoteAddress // 记录客户端IP
    };
    console.log('微信小程序请求:', {
      path: req.path,
      method: req.method,
      ip: req.wechatInfo.clientIP
    });
  }
  
  next(); // 继续执行下一个中间件
}

/**
 * 2. JWT认证中间件（仅对微信小程序请求生效）
 * 作用：验证前端传递的token，提取openid并附加到请求对象
 * 前端需在请求头携带：Authorization: Bearer <token>
 */
function authenticateWechatUser(req, res, next) {
  // 非微信小程序请求跳过认证（可选，根据业务需求调整）
  if (!req.isWechatMiniProgram) {
    return next();
  }

  try {
    // 1. 从请求头获取token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '未登录，请先完成微信授权',
        errorCode: 'NO_AUTH'
      });
    }
    const token = authHeader.split(' ')[1]; // 提取Bearer后的token

    // 2. 验证token并解析 payload（包含openid）
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.openid) {
      return res.status(401).json({
        success: false,
        message: '登录凭证无效，未包含用户信息',
        errorCode: 'INVALID_TOKEN'
      });
    }

    // 3. 将openid附加到req.user，供后续接口使用
    req.user = {
      openid: decoded.openid
    };
    next(); // 认证通过，继续执行

  } catch (error) {
    console.error('微信用户认证失败:', error);
    return res.status(401).json({
      success: false,
      message: '登录已过期，请重新登录',
      errorCode: 'TOKEN_EXPIRED',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * 3. 微信小程序文件上传限制中间件
 * 作用：验证上传文件的类型、大小，使用multer处理临时文件
 */
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 临时存储目录（后续会删除）
    cb(null, UPLOAD_TEMP_DIR);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名（避免冲突）
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// 文件类型验证（仅允许微信常用音频格式）
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'audio/mpeg', 'audio/wav', 'audio/mp3', 
    'audio/x-m4a', 'audio/aac', 'audio/amr'
  ];
  const allowedExts = ['.mp3', '.wav', '.m4a', '.aac', '.amr'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  const isValidMime = allowedMimeTypes.includes(file.mimetype);
  const isValidExt = allowedExts.includes(ext);
  
  if (isValidMime && isValidExt) {
    cb(null, true); // 验证通过
  } else {
    cb(new Error('不支持的文件类型，请上传mp3、wav、m4a、aac或amr格式'), false);
  }
};

// 配置multer：限制大小10MB，单次1个文件
const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1
  },
  fileFilter
});

// 封装为中间件，仅对微信上传请求生效
function wechatUploadMiddleware(req, res, next) {
  if (req.isWechatMiniProgram && req.path.includes('/upload') && 
      ['POST', 'PUT'].includes(req.method)) {
    // 使用multer处理名为"audio"的文件字段
    const uploadSingle = upload.single('audio');
    uploadSingle(req, res, (err) => {
      if (err) {
        let message = '文件上传失败';
        if (err.code === 'LIMIT_FILE_SIZE') {
          message = `文件大小超过限制（最大10MB）`;
        } else if (err.message.includes('不支持的文件类型')) {
          message = err.message;
        }
        return res.status(400).json({
          success: false,
          message,
          errorCode: 'UPLOAD_ERROR'
        });
      }
      next(); // 文件验证通过，继续执行
    });
  } else {
    next(); // 非上传请求直接跳过
  }
}

/**
 * 4. 微信小程序API频率限制中间件
 * 作用：防止单IP短时间内频繁请求（1分钟最多60次）
 */
const rateLimitStore = new Map(); // 存储请求记录：key=IP，value=时间戳数组
function wechatRateLimitMiddleware(req, res, next) {
  if (!req.isWechatMiniProgram) return next();
  
  const key = req.wechatInfo.clientIP; // 以IP作为限制维度
  const now = Date.now();
  const windowMs = 60000; // 时间窗口：1分钟
  const maxRequests = 60; // 窗口内最大请求数
  
  // 清理过期记录（只保留窗口内的请求）
  let requests = rateLimitStore.get(key) || [];
  const validRequests = requests.filter(timestamp => timestamp > now - windowMs);
  rateLimitStore.set(key, validRequests);
  
  // 判断是否超过限制
  if (validRequests.length >= maxRequests) {
    return res.status(429).json({
      success: false,
      message: '请求过于频繁，请稍后再试',
      retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000), // 重试时间（秒）
      errorCode: 'TOO_MANY_REQUESTS'
    });
  }
  
  // 记录本次请求时间
  validRequests.push(now);
  rateLimitStore.set(key, validRequests);
  
  // 设置响应头（可选，供前端参考）
  res.set({
    'X-RateLimit-Limit': maxRequests,
    'X-RateLimit-Remaining': maxRequests - validRequests.length,
    'X-RateLimit-Reset': Math.ceil((validRequests[0] + windowMs) / 1000)
  });
  
  next();
}

/**
 * 5. 微信小程序响应格式化中间件
 * 作用：统一微信小程序请求的响应格式（添加timestamp、标准化结构）
 */
function wechatResponseMiddleware(req, res, next) {
  const originalJson = res.json; // 保存原始res.json方法
  
  res.json = function(data) {
    if (req.isWechatMiniProgram) {
      // 统一响应格式
      const formattedData = {
        success: data.success ?? true,
        message: data.message || '',
        data: data.data || data,
        timestamp: new Date().toISOString()
      };
      
      // 附加分页信息（如果有）
      if (data.pageInfo) formattedData.pageInfo = data.pageInfo;
      // 附加错误码（如果有）
      if (data.errorCode) formattedData.errorCode = data.errorCode;
      
      return originalJson.call(this, formattedData);
    }
    
    // 非微信请求使用原始响应格式
    return originalJson.call(this, data);
  };
  
  next();
}

/**
 * 6. 微信小程序错误处理中间件
 * 作用：统一捕获微信小程序请求的错误，标准化错误响应
 */
function wechatErrorMiddleware(err, req, res, next) {
  if (!req.isWechatMiniProgram) return next(err); // 非微信请求交给默认错误处理
  
  console.error('微信小程序请求错误:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    ip: req.wechatInfo?.clientIP
  });
  
  // 定义错误码和状态码映射
  let statusCode = 500;
  let message = '服务器内部错误';
  let errorCode = 'SERVER_ERROR';
  
  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      statusCode = 413;
      message = '文件大小超过限制';
      errorCode = 'FILE_TOO_LARGE';
      break;
    case 'INVALID_FILE_TYPE':
      statusCode = 415;
      message = '不支持的文件类型';
      errorCode = 'INVALID_TYPE';
      break;
    case 'WECHAT_API_ERROR':
      statusCode = 400;
      message = '微信接口调用失败';
      errorCode = 'WECHAT_API_FAIL';
      break;
    default:
      if (err.message.includes('不支持的文件类型')) {
        statusCode = 415;
        message = err.message;
        errorCode = 'INVALID_TYPE';
      }
  }
  
  // 返回标准化错误响应
  res.status(statusCode).json({
    success: false,
    message,
    errorCode,
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
}

/**
 * 7. 微信小程序CORS配置中间件
 * 作用：解决微信小程序跨域问题，允许必要的请求头和方法
 */
function wechatCorsMiddleware(req, res, next) {
  const allowedOrigins = [
    'https://servicewechat.com', // 微信小程序官方域名
    'http://localhost:3000',    // 本地开发环境
    'http://127.0.0.1:3000'
  ];
  
  const origin = req.headers.origin || '';
  if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 预检请求缓存24小时
  
  // 处理OPTIONS请求（预检请求）
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  next();
}


// 导出所有中间件供外部使用
module.exports = {
  wechatRequestMiddleware,      // 识别微信请求
  authenticateWechatUser,       // JWT认证（提取openid）
  wechatUploadMiddleware,       // 文件上传验证
  wechatRateLimitMiddleware,    // 频率限制
  wechatResponseMiddleware,     // 响应格式化
  wechatErrorMiddleware,        // 错误处理
  wechatCorsMiddleware,         // CORS配置
  upload                        // 导出multer实例（备用）
};