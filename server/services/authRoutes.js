const express = require('express');
const router = express.Router();
const UserModel = require('../database/models/User');
const { authenticateToken, verifyToken, optionalAuth, generateToken } = require('../middleware/auth');

/**
 * 统一的认证状态检查接口
 * 支持多种验证方式：Authorization头、query参数、body参数
 */
router.get('/me', optionalAuth, async (req, res) => {
  try {
    if (!req.isAuthenticated) {
      return res.status(401).json({
        success: false,
        message: '用户未登录',
        code: 'USER_NOT_AUTHENTICATED',
        data: {
          isAuthenticated: false,
          user: null
        }
      });
    }

    // 获取用户详细信息
    const user = await UserModel.findByOpenid(req.openid);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在',
        code: 'USER_NOT_FOUND',
        data: {
          isAuthenticated: false,
          user: null
        }
      });
    }

    // 返回用户信息（隐藏敏感信息）
    const userInfo = {
      openid: user.openid,
      nickname: user.nickname,
      avatar_url: user.avatar_url,
      gender: user.gender,
      city: user.city,
      province: user.province,
      country: user.country,
      created_at: user.created_at,
      last_login_at: user.last_login_at
    };

    res.json({
      success: true,
      message: '获取用户信息成功',
      data: {
        isAuthenticated: true,
        user: userInfo,
        permissions: ['basic'] // 可扩展权限系统
      }
    });

  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败',
      error: error.message,
      code: 'GET_USER_INFO_FAILED'
    });
  }
});

/**
 * 验证token有效性
 * 可以通过多种方式提供token
 */
router.post('/verify', async (req, res) => {
  try {
    // 支持多种token传递方式
    let token = req.headers.authorization;
    
    if (token && token.startsWith('Bearer ')) {
      token = token.substring(7);
    } else if (req.body.token) {
      token = req.body.token;
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'token不能为空',
        code: 'TOKEN_REQUIRED'
      });
    }

    // 验证token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'token无效或已过期',
        code: 'TOKEN_INVALID',
        data: {
          isValid: false,
          expiresAt: null
        }
      });
    }

    // 验证用户是否存在
    const user = await UserModel.findByOpenid(decoded.openid);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在',
        code: 'USER_NOT_FOUND',
        data: {
          isValid: false,
          expiresAt: null
        }
      });
    }

    res.json({
      success: true,
      message: 'token验证成功',
      data: {
        isValid: true,
        expiresAt: new Date(decoded.exp * 1000),
        user: {
          openid: user.openid,
          nickname: user.nickname,
          avatar_url: user.avatar_url
        }
      }
    });

  } catch (error) {
    console.error('token验证失败:', error);
    res.status(500).json({
      success: false,
      message: 'token验证失败',
      error: error.message,
      code: 'TOKEN_VERIFICATION_FAILED'
    });
  }
});

/**
 * 刷新token
 * 在token即将过期时刷新
 */
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const { openid } = req;
    
    // 验证用户是否存在
    const user = await UserModel.findByOpenid(openid);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在',
        code: 'USER_NOT_FOUND'
      });
    }

    // 生成新的token
    const newToken = generateToken(openid);

    res.json({
      success: true,
      message: 'token刷新成功',
      data: {
        token: newToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30天后
      }
    });

  } catch (error) {
    console.error('token刷新失败:', error);
    res.status(500).json({
      success: false,
      message: 'token刷新失败',
      error: error.message,
      code: 'TOKEN_REFRESH_FAILED'
    });
  }
});

/**
 * 退出登录
 * 客户端可以调用此接口来标记token失效
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { openid } = req;
    
    // 在实际项目中，这里可以将token加入黑名单
    // 目前简单实现，返回成功响应
    
    res.json({
      success: true,
      message: '退出登录成功',
      data: {
        logoutAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('退出登录失败:', error);
    res.status(500).json({
      success: false,
      message: '退出登录失败',
      error: error.message,
      code: 'LOGOUT_FAILED'
    });
  }
});

/**
 * 获取认证配置信息
 * 前端可以用来了解认证系统的配置
 */
router.get('/config', (req, res) => {
  res.json({
    success: true,
    message: '获取认证配置成功',
    data: {
      authType: 'jwt',
      tokenType: 'Bearer',
      tokenExpiresIn: '30d',
      supportedMethods: ['header', 'query', 'body'],
      endpoints: {
        login: '/api/wechat/login',
        verify: '/api/auth/verify',
        refresh: '/api/auth/refresh',
        logout: '/api/auth/logout',
        me: '/api/auth/me'
      }
    }
  });
});

module.exports = router;