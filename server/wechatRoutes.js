const express = require('express');
const router = express.Router();
const axios = require('axios');
const UserModel = require('./database/models/User');

// 导入标准JWT认证中间件
const { generateToken, verifyToken } = require('./middleware/auth');

// 微信小程序登录配置
const WECHAT_CONFIG = {
  appid: process.env.WECHAT_APP_ID || 'your_wechat_appid',
  secret: process.env.WECHAT_APP_SECRET || 'your_wechat_secret',
  grant_type: 'authorization_code'
};

// 微信小程序登录
router.post('/login', async (req, res) => {
  try {
    const { code, encryptedData, iv } = req.body;

    console.log('微信登录请求:', { code: code ? '已提供' : '未提供', encryptedData: encryptedData ? '已提供' : '未提供', iv: iv ? '已提供' : '未提供' });
    
    // 1. 验证必填参数
    if (!code) {
      return res.status(400).json({
        success: false,
        message: '微信授权码不能为空',
        code: 'WECHAT_CODE_REQUIRED'
      });
    }

    // 2. 调用真实微信API
    const wechatUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${WECHAT_CONFIG.appid}&secret=${WECHAT_CONFIG.secret}&js_code=${code}&grant_type=${WECHAT_CONFIG.grant_type}`;
    console.log('调用微信接口:', wechatUrl.replace(WECHAT_CONFIG.secret, '***'));
    const wechatResponse = await axios.get(wechatUrl);
    const wechatData = wechatResponse.data;

    console.log('微信接口返回:', wechatData);

    // 3. 检查微信接口返回
    if (wechatData.errcode) {
      return res.status(400).json({
        success: false,
        message: `微信登录失败: ${wechatData.errmsg}`,
        errorCode: wechatData.errcode,
        code: 'WECHAT_API_ERROR'
      });
    }

    const { openid, session_key, unionid } = wechatData;

    if (!openid) {
      return res.status(400).json({
        success: false,
        message: '微信登录失败: 未获取到openid',
        code: 'OPENID_NOT_FOUND'
      });
    }

    // 4. 解密用户信息（如果提供了加密数据）
    let userInfo = null;
    if (encryptedData && iv) {
      try {
        userInfo = decryptUserInfo(encryptedData, iv, session_key);
        console.log('解密用户信息成功:', { 
          nickname: userInfo.nickName,
          gender: userInfo.gender,
          city: userInfo.city 
        });
      } catch (decryptError) {
        console.error('解密用户信息失败:', decryptError);
        // 解密失败不影响登录，继续使用openid
      }
    }

    // 5. 查找或创建用户
    let user = await UserModel.findByOpenid(openid);
    
    if (!user) {
      console.log('用户不存在，创建新用户...');
      
      // 创建新用户
      const userData = {
        openid: openid,
        unionid: unionid || null,
        nickname: userInfo ? userInfo.nickName : `用户_${openid.slice(-8)}`,
        avatar_url: userInfo ? userInfo.avatarUrl : '',
        gender: userInfo ? userInfo.gender : 0,
        city: userInfo ? userInfo.city : '',
        province: userInfo ? userInfo.province : '',
        country: userInfo ? userInfo.country : '',
        language: userInfo ? userInfo.language : 'zh_CN',
        session_key: session_key,
        settings: JSON.stringify({})
      };

      user = await UserModel.create(userData);
      console.log('新用户创建成功:', { openid: user.openid, nickname: user.nickname });
    } else {
      console.log('用户已存在，更新登录信息:', { openid: user.openid, nickname: user.nickname });
      
      // 更新用户信息（如果提供了新的用户信息）
      if (userInfo) {
        const updateData = {
          nickname: userInfo.nickName,
          avatar_url: userInfo.avatarUrl,
          gender: userInfo.gender,
          city: userInfo.city,
          province: userInfo.province,
          country: userInfo.country,
          language: userInfo.language,
          session_key: session_key,
          last_login_at: new Date()
        };

        user = await UserModel.update(user.openid, updateData);
      } else {
        // 只更新session_key和登录时间
        user = await UserModel.update(user.openid, { 
          session_key: session_key,
          last_login_at: new Date() 
        });
      }
    }

    // 6. 使用标准JWT库生成token
    const token = generateToken(user.openid);

    // 7. 返回登录结果
    const responseData = {
      success: true,
      message: '微信登录成功',
      data: {
        token: token,
        user: {
          openid: user.openid,
          nickname: user.nickname,
          avatar_url: user.avatar_url,
          gender: user.gender,
          city: user.city,
          province: user.province,
          country: user.country,
          created_at: user.created_at,
          last_login_at: user.last_login_at
        }
      }
    };

    console.log('微信登录成功:', { openid: user.openid, nickname: user.nickname });
    res.json(responseData);

  } catch (error) {
    console.error('微信登录失败:', error);
    
    // 处理网络错误
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(500).json({
        success: false,
        message: '网络连接失败，请检查网络设置',
        code: 'NETWORK_ERROR'
      });
    }

    // 处理超时错误
    if (error.code === 'ECONNABORTED') {
      return res.status(500).json({
        success: false,
        message: '微信接口请求超时',
        code: 'REQUEST_TIMEOUT'
      });
    }

    res.status(500).json({
      success: false,
      message: '微信登录失败',
      error: error.message,
      code: 'LOGIN_FAILED'
    });
  }
});

// 检查微信登录状态
router.post('/check-session', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'token不能为空',
        code: 'TOKEN_REQUIRED'
      });
    }

    // 使用标准JWT库验证token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'token无效或已过期',
        code: 'TOKEN_INVALID'
      });
    }

    // 查找用户
    const user = await UserModel.findByOpenid(decoded.openid);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: '登录状态有效',
      data: {
        user: {
          openid: user.openid,
          nickname: user.nickname,
          avatar_url: user.avatar_url,
          last_login_at: user.last_login_at
        }
      }
    });

  } catch (error) {
    console.error('检查登录状态失败:', error);
    res.status(500).json({
      success: false,
      message: '检查登录状态失败',
      error: error.message,
      code: 'SESSION_CHECK_FAILED'
    });
  }
});

// 解密用户信息（简化版本，实际应该使用微信官方解密库）
function decryptUserInfo(encryptedData, iv, sessionKey) {
  // 这里应该使用微信官方提供的解密算法
  // 由于解密算法较复杂，这里返回模拟数据用于测试
  console.log('解密用户信息（模拟）:', { encryptedData: encryptedData.slice(0, 20) + '...', iv: iv.slice(0, 10) + '...' });
  
  return {
    nickName: '测试用户',
    avatarUrl: 'https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4nibH0KlMECNjjGxQUq24ZEaGT4poC6icRiccVGKSyXwibcPq4BWmiaIGuG1icwxaQX6grC9VemZoJ8rg/132',
    gender: 1,
    city: '深圳市',
    province: '广东省',
    country: '中国',
    language: 'zh_CN'
  };
}
// 测试专用登录接口（无需微信code）
router.post('/test-login', async (req, res) => {
  try {
    const { openid = 'test_openid_123456' } = req.body;

    console.log('测试登录请求:', { openid });

    // 查找或创建测试用户
    let user = await UserModel.findByOpenid(openid);
    
    if (!user) {
      console.log('创建测试用户...');
      
      const userData = {
        openid: openid,
        nickname: `测试用户_${openid.slice(-8)}`,
        avatar_url: 'https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4nibH0KlMECNjjGxQUq24ZEaGT4poC6icRiccVGKSyXwibcPq4BWmiaIGuG1icwxaQX6grC9VemZoJ8rg/132',
        gender: 1,
        city: '深圳市',
        province: '广东省',
        country: '中国',
        language: 'zh_CN',
        settings: JSON.stringify({})
      };

      user = await UserModel.create(userData);
      console.log('测试用户创建成功:', { openid: user.openid, nickname: user.nickname });
    }

    // 生成token
    const token = generateToken(user.openid);

    const responseData = {
      success: true,
      message: '测试登录成功',
      data: {
        token: token,
        user: {
          openid: user.openid,
          nickname: user.nickname,
          avatar_url: user.avatar_url,
          gender: user.gender,
          city: user.city,
          province: user.province,
          country: user.country
        }
      }
    };

    console.log('测试登录成功:', { openid: user.openid });
    res.json(responseData);

  } catch (error) {
    console.error('测试登录失败:', error);
    res.status(500).json({
      success: false,
      message: '测试登录失败',
      error: error.message
    });
  }
});
module.exports = router;