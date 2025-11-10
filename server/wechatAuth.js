const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const path = require('path');

// 确保环境变量已加载 - 指定正确的.env文件路径
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// MySQL用户模型
const UserModel = require('./database/models/User');

// 微信小程序配置
const WECHAT_CONFIG = {
  appId: process.env.WECHAT_APP_ID || 'your_wechat_app_id',
  appSecret: process.env.WECHAT_APP_SECRET || 'your_wechat_app_secret'
};

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'slumberpod_wechat_secret_key';

// 调试：打印环境变量加载情况
console.log('环境变量加载状态:');
console.log('WECHAT_APP_ID:', process.env.WECHAT_APP_ID ? '已加载' : '未加载');
console.log('WECHAT_APP_SECRET:', process.env.WECHAT_APP_SECRET ? '已加载' : '未加载');
console.log('实际配置:', WECHAT_CONFIG);

/**
 * 微信小程序登录
 * 前端通过wx.login获取code，后端用code换取openid和session_key
 */
router.post('/login', async (req, res) => {
  try {
    const { code, encryptedData, iv } = req.body;
    console.log('code:', code);


    console.log('iv:', iv);
    if (!code) {
      return res.status(400).json({
        success: false,
        message: '微信登录code不能为空'
      });
    }

    // 1. 使用code换取openid和session_key
    console.log('微信配置:', WECHAT_CONFIG);
    console.log('调用微信API:', {
      appid: WECHAT_CONFIG.appId,
      js_code: code
    });
    
    const wechatResponse = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
      params: {
        appid: WECHAT_CONFIG.appId,
        secret: WECHAT_CONFIG.appSecret,
        js_code: code,
        grant_type: 'authorization_code'
      }
    });

    console.log('微信API响应:', wechatResponse.data);
    const { openid, session_key, unionid, errcode, errmsg } = wechatResponse.data;
    
    if (errcode) {
      console.error('微信API错误:', { errcode, errmsg });
      return res.status(400).json({
        success: false,
        message: `微信登录失败: ${errmsg}`,
        code: errcode
      });
    }

    // 2. 检查用户是否已存在
    let user = await findOrCreateWechatUser(openid, unionid, encryptedData, iv, session_key);

    // 3. 生成JWT token
    const token = jwt.sign(
      {
        openid: openid,
        type: 'wechat'
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token: token,
      user: {
        openid: openid,
        nickname: user.nickname || '',
        avatar: user.avatar || '',
        unionid: user.unionid || ''
      }
    });

  } catch (error) {
    console.error('微信登录失败:', error);
    res.status(500).json({
      success: false,
      message: '微信登录失败',
      error: error.message
    });
  }
});

/**
 * 查找或创建微信用户
 */
async function findOrCreateWechatUser(openid, unionid, encryptedData, iv, session_key) {
  try {
    // 先查找用户
    const existingUser = await UserModel.findByOpenid(openid);

    if (existingUser) {
      // 更新最后登录时间
      await UserModel.updateLastLogin(openid);
      return existingUser;
    }

    // 创建新用户数据
    let userData = {
      openid: openid,
      unionid: unionid || null,
      session_key: session_key || null
    };

    // 如果有加密数据，尝试解密用户信息
    if (encryptedData && iv && session_key) {
      try {
        const decryptedData = decryptWechatData(encryptedData, iv, session_key);
        if (decryptedData) {
          userData.nickname = decryptedData.nickName || '';
          userData.avatar_url = decryptedData.avatarUrl || '';
          userData.gender = decryptedData.gender || 0;
          userData.city = decryptedData.city || '';
          userData.province = decryptedData.province || '';
          userData.country = decryptedData.country || '';
        }
      } catch (decryptError) {
        console.warn('微信用户信息解密失败:', decryptError);
      }
    }

    // 创建新用户
    const newUser = await UserModel.create(userData);

    // 创建默认用户偏好设置
    await createDefaultUserPreferences(openid);

    return newUser;
  } catch (error) {
    console.error('查找或创建微信用户失败:', error);
    throw error;
  }
}

/**
 * 解密微信加密数据（简化版，实际需要完整实现）
 */
function decryptWechatData(encryptedData, iv, sessionKey) {
  // 这里需要实现微信数据解密逻辑
  // 实际项目中需要使用crypto模块进行AES解密
  console.log('需要实现微信数据解密逻辑');
  return null;
}

/**
 * 验证微信JWT token
 */
function authenticateWechatToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '未授权访问，请提供有效的微信token'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.userId = decoded.userId;
      req.openid = decoded.openid;
      next();
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'token无效或已过期'
      });
    }
    
  } catch (error) {
    console.error('微信token验证失败:', error);
    return res.status(500).json({
      success: false,
      message: '认证处理异常'
    });
  }
}



/**
 * 创建默认用户偏好设置
 */
async function createDefaultUserPreferences(openid) {
  try {
    // 创建默认闹钟设置
    const { query } = require('./database/config');
    const alarmSql = `
      INSERT INTO alarms (openid, label, alarm_time, is_enabled) 
      VALUES (?, '起床闹钟', '07:00:00', 1)
    `;
    
    const alarmResult = await query(alarmSql, [openid]);
    
    if (!alarmResult.success) {
      console.warn('创建默认闹钟失败:', alarmResult.error);
    }

    console.log(`为用户 ${openid} 创建默认偏好设置成功`);
  } catch (error) {
    console.error('创建默认用户偏好设置失败:', error);
  }
}

module.exports = {
  router,
  authenticateWechatToken
};