const express = require('express');

/**
 * 微信小程序请求适配中间件
 * 处理微信小程序特有的请求格式和限制
 */

// 微信小程序请求头处理
function wechatRequestMiddleware(req, res, next) {
  // 记录微信小程序请求信息
  const userAgent = req.headers['user-agent'] || '';
  const isWechatMiniProgram = userAgent.includes('MicroMessenger');
  
  if (isWechatMiniProgram) {
    req.isWechatMiniProgram = true;
    
    // 添加微信小程序特定的请求头信息
    req.wechatInfo = {
      userAgent: userAgent,
      timestamp: new Date().toISOString()
    };
    
    console.log('微信小程序请求:', {
      path: req.path,
      method: req.method,
      userAgent: userAgent
    });
  }
  
  next();
}

/**
 * 微信小程序响应格式化中间件
 * 统一微信小程序的响应格式
 */
function wechatResponseMiddleware(req, res, next) {
  const originalJson = res.json;
  
  res.json = function(data) {
    // 如果是微信小程序请求，统一响应格式
    if (req.isWechatMiniProgram) {
      const formattedData = {
        success: data.success !== undefined ? data.success : true,
        message: data.message || '',
        data: data.data || data,
        timestamp: new Date().toISOString()
      };
      
      // 如果原始数据有分页信息，保留分页
      if (data.pageInfo) {
        formattedData.pageInfo = data.pageInfo;
      }
      
      return originalJson.call(this, formattedData);
    }
    
    return originalJson.call(this, data);
  };
  
  next();
}

/**
 * 微信小程序文件上传限制中间件
 * 微信小程序有文件大小和类型限制
 */
function wechatUploadLimitMiddleware(req, res, next) {
  if (req.isWechatMiniProgram && req.method === 'POST' && req.path.includes('/upload')) {
    // 微信小程序文件上传限制
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_MIME_TYPES = [
      'audio/mpeg',
      'audio/wav',
      'audio/mp3',
      'audio/x-m4a',
      'audio/aac'
    ];
    
    // 检查文件大小
    const contentLength = parseInt(req.headers['content-length']);
    if (contentLength > MAX_FILE_SIZE) {
      return res.status(413).json({
        success: false,
        message: `文件大小超过限制，最大支持 ${MAX_FILE_SIZE / 1024 / 1024}MB`
      });
    }
    
    // 检查Content-Type
    const contentType = req.headers['content-type'];
    if (contentType && !ALLOWED_MIME_TYPES.some(type => contentType.includes(type))) {
      return res.status(415).json({
        success: false,
        message: '不支持的文件类型，请上传音频文件'
      });
    }
  }
  
  next();
}

/**
 * 微信小程序API频率限制中间件
 * 防止微信小程序API被滥用
 */
const rateLimitStore = new Map();

function wechatRateLimitMiddleware(req, res, next) {
  if (!req.isWechatMiniProgram) {
    return next();
  }
  
  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 60000; // 1分钟
  const maxRequests = 60; // 每分钟最多60次请求
  
  if (!rateLimitStore.has(clientIP)) {
    rateLimitStore.set(clientIP, []);
  }
  
  const requests = rateLimitStore.get(clientIP);
  
  // 清理过期的请求记录
  const windowStart = now - windowMs;
  while (requests.length > 0 && requests[0] < windowStart) {
    requests.shift();
  }
  
  // 检查是否超过限制
  if (requests.length >= maxRequests) {
    return res.status(429).json({
      success: false,
      message: '请求过于频繁，请稍后再试',
      retryAfter: Math.ceil((requests[0] + windowMs - now) / 1000)
    });
  }
  
  // 记录当前请求
  requests.push(now);
  rateLimitStore.set(clientIP, requests);
  
  // 设置响应头
  res.set('X-RateLimit-Limit', maxRequests);
  res.set('X-RateLimit-Remaining', maxRequests - requests.length);
  res.set('X-RateLimit-Reset', Math.ceil((requests[0] + windowMs) / 1000));
  
  next();
}

/**
 * 微信小程序错误处理中间件
 * 统一处理微信小程序特有的错误
 */
function wechatErrorMiddleware(err, req, res, next) {
  if (!req.isWechatMiniProgram) {
    return next(err);
  }
  
  console.error('微信小程序错误:', err);
  
  // 根据错误类型返回不同的错误信息
  let statusCode = 500;
  let message = '服务器内部错误';
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    message = '文件大小超过限制';
  } else if (err.code === 'INVALID_FILE_TYPE') {
    statusCode = 415;
    message = '不支持的文件类型';
  } else if (err.code === 'NETWORK_ERROR') {
    statusCode = 503;
    message = '网络连接失败，请检查网络设置';
  } else if (err.code === 'WECHAT_API_ERROR') {
    statusCode = 400;
    message = '微信接口调用失败';
  }
  
  res.status(statusCode).json({
    success: false,
    message: message,
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
}

/**
 * 微信小程序CORS配置
 * 处理微信小程序的跨域请求
 */
function wechatCorsMiddleware(req, res, next) {
  // 设置允许的域名
  const allowedOrigins = [
    'https://servicewechat.com', // 微信小程序域名
    'http://localhost' // 开发环境
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
}

module.exports = {
  wechatRequestMiddleware,
  wechatResponseMiddleware,
  wechatUploadLimitMiddleware,
  wechatRateLimitMiddleware,
  wechatErrorMiddleware,
  wechatCorsMiddleware
};