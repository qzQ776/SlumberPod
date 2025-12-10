const express = require('express');
const router = express.Router();

// 组合音频模型
const CombinationModel = require('./database/models/Combination');

/**
 * 获取随机组合（骰子功能）
 */
router.get('/dice', async (req, res) => {
  try {
    const openid = req.openid; // 从中间件获取
    const { 
      category_id, // 分类ID
      max_duration, // 最大时长（秒）
      audio_count = 3 // 音频数量（1-3）
    } = req.query;
    
    // 参数验证
    const count = parseInt(audio_count);
    if (isNaN(count) || count < 1 || count > 3) {
      return res.status(400).json({
        success: false,
        message: '音频数量必须为1-3之间的整数'
      });
    }
    
    const preferences = {
      category_id: category_id ? parseInt(category_id) : null,
      max_duration: max_duration ? parseInt(max_duration) : null,
      audio_count: count
    };
    
    const result = await CombinationModel.diceRandomCombination(openid, preferences);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data,
      source: result.source
    });
  } catch (error) {
    console.error('骰子随机组合失败:', error);
    res.status(500).json({
      success: false,
      message: '骰子随机组合失败',
      error: error.message
    });
  }
});

/**
 * 创建组合音频
 */
router.post('/', async (req, res) => {
  try {
    const openid = req.openid; // 从中间件获取
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }
    
    const { name, audio_ids, is_system = false, is_active = true } = req.body;
    
    // 参数验证
    if (!name || !audio_ids || !Array.isArray(audio_ids)) {
      return res.status(400).json({
        success: false,
        message: '组合名称和音频ID数组不能为空'
      });
    }
    
    const result = await CombinationModel.createCombination(openid, {
      name,
      audio_ids,
      is_system,
      is_active
    });
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      data: result,
      message: '组合创建成功'
    });
  } catch (error) {
    console.error('创建组合音频失败:', error);
    res.status(500).json({
      success: false,
      message: '创建组合音频失败',
      error: error.message
    });
  }
});

/**
 * 获取组合详情
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const openid = req.openid; // 从中间件获取
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: '组合ID格式无效'
      });
    }
    
    const result = await CombinationModel.getCombinationDetail(parseInt(id), openid);
    
    if (!result.success) {
      return res.status(result.error.includes('无权限') ? 403 : 404).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('获取组合详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取组合详情失败',
      error: error.message
    });
  }
});

/**
 * 获取用户的所有组合
 */
router.get('/user/mine', async (req, res) => {
  try {
    const openid = req.openid; // 从中间件获取
    const { 
      limit = 20, 
      offset = 0, 
      include_system = false 
    } = req.query;
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }
    
    const result = await CombinationModel.getUserCombinations(openid, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      include_system: include_system === 'true'
    });
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data,
      total: result.data.length
    });
  } catch (error) {
    console.error('获取用户组合失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户组合失败',
      error: error.message
    });
  }
});

/**
 * 获取系统推荐组合
 */
router.get('/system/recommendations', async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    
    const result = await CombinationModel.getSystemCombinations({
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data,
      total: result.data.length
    });
  } catch (error) {
    console.error('获取系统组合失败:', error);
    res.status(500).json({
      success: false,
      message: '获取系统组合失败',
      error: error.message
    });
  }
});

/**
 * 更新组合音频
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const openid = req.openid; // 从中间件获取
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: '组合ID格式无效'
      });
    }
    
    const updates = req.body;
    
    // 移除不允许更新的字段
    delete updates.combination_id;
    delete updates.openid;
    
    const result = await CombinationModel.updateCombination(parseInt(id), openid, updates);
    
    if (!result.success) {
      return res.status(result.error.includes('无权限') ? 403 : 400).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('更新组合失败:', error);
    res.status(500).json({
      success: false,
      message: '更新组合失败',
      error: error.message
    });
  }
});

/**
 * 删除组合音频
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const openid = req.openid; // 从中间件获取
    
    if (!openid) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: '组合ID格式无效'
      });
    }
    
    const result = await CombinationModel.deleteCombination(parseInt(id), openid);
    
    if (!result.success) {
      return res.status(result.error.includes('无权限') ? 403 : 400).json({
        success: false,
        message: result.error
      });
    }
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('删除组合失败:', error);
    res.status(500).json({
      success: false,
      message: '删除组合失败',
      error: error.message
    });
  }
});

module.exports = router;