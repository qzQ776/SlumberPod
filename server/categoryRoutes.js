const express = require('express')
const router = express.Router()

// MySQL音频分类模型
const AudioCategoryModel = require('./database/models/AudioCategory')

// 获取所有音频分类列表
router.get('/', async (req, res) => {
  try {
    console.log('获取音频分类列表')
    
    // 使用MySQL模型获取所有分类
    const categories = await AudioCategoryModel.getCategories();
    
    console.log('音频分类数量:', categories ? categories.length : 0)
    
    res.json({
      success: true,
      data: categories || [],
      total: categories ? categories.length : 0
    })
  } catch (error) {
    console.error('获取音频分类列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取音频分类列表失败',
      error: error.message
    })
  }
})

// 根据ID获取分类详情
router.get('/:category_id', async (req, res) => {
  try {
    const { category_id } = req.params
    
    // 验证ID是否为有效的数字格式
    if (!category_id || isNaN(parseInt(category_id))) {
      return res.status(400).json({
        success: false,
        message: '分类ID格式无效，请使用正确的数字格式'
      })
    }
    
    console.log('获取音频分类详情，ID:', category_id)
    
    // 使用MySQL模型获取分类详情
    const result = await AudioCategoryModel.getById(parseInt(category_id));
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    if (!result.data) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      })
    }
    
    res.json({
      success: true,
      data: result.data
    })
  } catch (error) {
    console.error('获取音频分类详情失败:', error)
    res.status(500).json({
      success: false,
      message: '获取音频分类详情失败',
      error: error.message
    })
  }
})


module.exports = router