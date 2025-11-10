const express = require('express');
const UserModel = require('./server/database/models/User');
const config = require('./server/database/config');
const query = config.query;

async function debugWechatLogin() {
  console.log('=== 微信登录调试开始 ===');
  
  // 1. 检查用户是否存在
  console.log('1. 检查用户o4qN_1x4J8Gszzm_HZ5as6ht4-pw是否存在...');
  const user = await UserModel.findByOpenid('o4qN_1x4J8Gszzm_HZ5as6ht4-pw');
  console.log('用户查找结果:', user ? '存在' : '不存在');
  
  if (user) {
    console.log('用户详细信息:', {
      openid: user.openid,
      nickname: user.nickname,
      created_at: user.created_at,
      updated_at: user.updated_at
    });
  }
  
  // 2. 模拟微信登录过程
  console.log('\n2. 模拟微信登录过程...');
  
  // 模拟用户数据
  const userData = {
    openid: 'o4qN_1x4J8Gszzm_HZ5as6ht4-pw',
    nickname: '用户_s6ht4-pw',
    avatar_url: '',
    gender: 0,
    city: '',
    province: '',
    country: '',
    language: 'zh_CN',
    session_key: 'w6Fra0ZjGK+QbhCjiUQcJw==',
    settings: JSON.stringify({})
  };
  
  try {
    // 检查用户是否存在
    let existingUser = await UserModel.findByOpenid(userData.openid);
    
    if (!existingUser) {
      console.log('用户不存在，尝试创建用户...');
      const newUser = await UserModel.create(userData);
      console.log('用户创建成功:', newUser.openid);
    } else {
      console.log('用户已存在，更新登录信息...');
      const updatedUser = await UserModel.update(existingUser.openid, {
        session_key: userData.session_key,
        last_login_at: new Date()
      });
      console.log('用户信息更新成功');
    }
    
    // 3. 再次验证用户信息
    console.log('\n3. 验证用户信息...');
    const finalUser = await UserModel.findByOpenid(userData.openid);
    console.log('最终用户信息:', {
      openid: finalUser.openid,
      nickname: finalUser.nickname,
      last_login_at: finalUser.last_login_at
    });
    
    console.log('\n=== 微信登录调试完成 ===');
    
  } catch (error) {
    console.error('微信登录过程出错:', error);
  }
}

debugWechatLogin();