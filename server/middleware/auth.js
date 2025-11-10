const jwt = require('jsonwebtoken');
const UserModel = require('../database/models/User');

// JWT密钥配置
const JWT_SECRET = process.env.JWT_SECRET || 'slumberpod_wechat_secret_key';

/**
 * 标准JWT认证中间件
 * 统一处理所有路由的认证需求
 */
const authenticateToken = (req, res, next) => {
  try {
    // 从Authorization头获取token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '未授权访问，请提供有效的Bearer token',
        code: 'AUTH_TOKEN_REQUIRED'
      });
    }

    const token = authHeader.substring(7); // 移除'Bearer '前缀
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'token不能为空',
        code: 'TOKEN_EMPTY'
      });
    }

    // 使用标准JWT库验证token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 验证token结构
    if (!decoded.openid) {
      return res.status(401).json({
        success: false,
        message: 'token格式无效',
        code: 'TOKEN_INVALID_FORMAT'
      });
    }

    // 将用户信息挂载到req对象
    req.openid = decoded.openid;
    req.user = {
      openid: decoded.openid,
      type: decoded.type || 'wechat'
    };

    next();
  } catch (error) {
    console.error('JWT认证失败:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'token无效',
        code: 'TOKEN_INVALID'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'token已过期，请重新登录',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(500).json({
      success: false,
      message: '认证处理异常',
      code: 'AUTH_INTERNAL_ERROR'
    });
  }
};

/**
 * 生成标准JWT token
 * @param {string} openid - 用户openid
 * @param {Object} additionalData - 额外的用户数据
 * @returns {string} JWT token
 */
const generateToken = (openid, additionalData = {}) => {
  const payload = {
    openid: openid,
    type: 'wechat',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30天过期
    ...additionalData
  };

  return jwt.sign(payload, JWT_SECRET);
};

/**
 * 验证token并返回用户信息
 * @param {string} token - JWT token
 * @returns {Object|null} 解码后的用户信息
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * 可选认证中间件
 * 不强制要求认证，但会验证有效的token
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (decoded) {
      req.openid = decoded.openid;
      req.user = {
        openid: decoded.openid,
        type: decoded.type || 'wechat'
      };
      req.isAuthenticated = true;
    } else {
      req.isAuthenticated = false;
    }
  } else {
    req.isAuthenticated = false;
  }
  
  next();
};

/**
 * 检查用户权限中间件
 * @param {Array} requiredPermissions - 需要的权限列表
 */
const requirePermissions = (requiredPermissions = []) => {
  return async (req, res, next) => {
    if (!req.openid) {
      return res.status(401).json({
        success: false,
        message: '需要认证才能访问',
        code: 'AUTH_REQUIRED'
      });
    }

    try {
      // 获取用户权限信息
      const user = await UserModel.findByOpenid(req.openid);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: '用户不存在',
          code: 'USER_NOT_FOUND'
        });
      }

      // 这里可以扩展权限检查逻辑
      // 暂时简单实现，所有认证用户都有基本权限
      
      next();
    } catch (error) {
      console.error('权限检查失败:', error);
      return res.status(500).json({
        success: false,
        message: '权限检查异常',
        code: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
};

module.exports = {
  authenticateToken,
  generateToken,
  verifyToken,
  optionalAuth,
  requirePermissions,
  JWT_SECRET
};