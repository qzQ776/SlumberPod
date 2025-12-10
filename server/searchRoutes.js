const express = require('express');
const router = express.Router();

// 获取热门搜索
router.get('/hot', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const SearchHistory = require('./database/models/SearchHistory');
    const result = await SearchHistory.getHotSearches(parseInt(limit));
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '获取热门搜索失败',
        error: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
    
  } catch (error) {
    console.error('获取热门搜索失败:', error);
    res.status(500).json({
      success: false,
      message: '获取热门搜索失败',
      error: error.message
    });
  }
});

// 获取用户搜索历史
router.get('/', async (req, res) => {
  try {
    const openid = req.openid;
    const { limit = 10 } = req.query;
    
    // 如果没有openid（匿名用户），返回空结果而不是错误
    if (!openid) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    const SearchHistory = require('./database/models/SearchHistory');
    const result = await SearchHistory.getUserSearchHistory(openid, parseInt(limit));
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '获取搜索历史失败',
        error: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
    
  } catch (error) {
    console.error('获取搜索历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取搜索历史失败',
      error: error.message
    });
  }
});

// 记录搜索行为
router.post('/', async (req, res) => {
  try {
    const openid = req.openid;
    const { keyword } = req.body;
    
    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: '搜索关键词不能为空'
      });
    }
    
    const SearchHistory = require('./database/models/SearchHistory');
    const result = await SearchHistory.addSearch(openid, keyword);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '记录搜索失败',
        error: result.error
      });
    }
    
    res.json({
      success: true,
      message: result.message
    });
    
  } catch (error) {
    console.error('记录搜索失败:', error);
    res.status(500).json({
      success: false,
      message: '记录搜索失败',
      error: error.message
    });
  }
});

// 清空用户搜索历史
router.delete('/', async (req, res) => {
  try {
    const openid = req.openid;
    
    const SearchHistory = require('./database/models/SearchHistory');
    const result = await SearchHistory.clearUserSearchHistory(openid);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '清空搜索历史失败',
        error: result.error
      });
    }
    
    res.json({
      success: true,
      message: result.message
    });
    
  } catch (error) {
    console.error('清空搜索历史失败:', error);
    res.status(500).json({
      success: false,
      message: '清空搜索历史失败',
      error: error.message
    });
  }
});

module.exports = router;