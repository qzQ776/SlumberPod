const express = require('express');
const multer = require('multer');
const router = express.Router();
const path = require('path');

// 导入数据库配置和模型
const { query } = require('./database/config');
const AudioModel = require('./database/models/Audio');
const AudioCategory = require('./database/models/AudioCategory');

// 导入图片上传服务
const imageUploadService = require('./services/imageUploadService');

// 配置multer用于多文件上传（内存存储）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB限制
    files: 50 // 最大上传文件数量
  },
  fileFilter: (req, file, cb) => {
    // 检查文件类型
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的图片格式，支持：JPEG, PNG, GIF, WebP, BMP'), false);
    }
  }
});

/**
 * 批量上传音频图标接口
 * POST /api/admin/audio-icons/batch-upload
 * 支持按分类批量上传图标，一类音频使用同一个图标
 */
router.post('/batch-upload', upload.array('icons', 50), async (req, res) => {
  try {
    console.log('🖼️ 开始批量上传音频图标，文件数量:', req.files?.length || 0);
    
    // 调试：打印上传的文件信息
    if (req.files && req.files.length > 0) {
      console.log('📁 上传的文件信息:');
      req.files.forEach((file, index) => {
        console.log(`  ${index + 1}. 文件名: ${file.originalname}, 字段名: ${file.fieldname}, 大小: ${file.size} bytes`);
      });
    }
    
    const { category_mapping } = req.body; // JSON格式的映射关系
    
    // 验证参数
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请上传图标文件',
        error_code: 'NO_FILES_UPLOADED'
      });
    }
    
    if (!category_mapping) {
      return res.status(400).json({
        success: false,
        message: '请提供分类映射关系',
        error_code: 'MISSING_CATEGORY_MAPPING'
      });
    }
    
    let mappingData;
    try {
      mappingData = JSON.parse(category_mapping);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: '分类映射关系格式无效，必须是有效的JSON',
        error_code: 'INVALID_JSON_FORMAT'
      });
    }
    
    // 验证映射数据结构
    if (!Array.isArray(mappingData) && typeof mappingData !== 'object') {
      return res.status(400).json({
        success: false,
        message: '分类映射关系必须是数组或对象格式',
        error_code: 'INVALID_MAPPING_FORMAT'
      });
    }
    
    // 确保存储桶存在
    const bucketResult = await imageUploadService.ensureImageBucketExists();
    if (!bucketResult.success) {
      return res.status(500).json({
        success: false,
        message: '图片存储服务初始化失败',
        error: bucketResult.error
      });
    }
    
    // 获取所有音频分类
    const categories = await AudioCategory.getCategories();
    const categoryMap = new Map();
    categories.forEach(cat => {
      categoryMap.set(cat.category_id, cat);
      categoryMap.set(cat.name.toLowerCase(), cat);
    });
    
    // 处理映射关系
    const uploadResults = [];
    
    // 如果是数组格式的映射
    if (Array.isArray(mappingData)) {
      for (const mapping of mappingData) {
        const result = await processSingleMapping(mapping, req.files, categoryMap);
        uploadResults.push(result);
      }
    } else {
      // 如果是对象格式的映射
      for (const [categoryKey, fileInfo] of Object.entries(mappingData)) {
        const result = await processSingleMapping({
          category_key: categoryKey,
          ...fileInfo
        }, req.files, categoryMap);
        uploadResults.push(result);
      }
    }
    
    // 统计结果
    const successfulUploads = uploadResults.filter(r => r.success);
    const failedUploads = uploadResults.filter(r => !r.success);
    
    res.json({
      success: true,
      message: `批量上传完成，成功：${successfulUploads.length}个，失败：${failedUploads.length}个`,
      data: {
        total_processed: uploadResults.length,
        successful: successfulUploads.length,
        failed: failedUploads.length,
        details: uploadResults
      }
    });
    
  } catch (error) {
    console.error('❌ 批量上传音频图标失败:', error);
    res.status(500).json({
      success: false,
      message: '批量上传音频图标失败',
      error: error.message,
      error_code: 'BATCH_UPLOAD_FAILED'
    });
  }
});

/**
 * 处理单个分类映射
 */
async function processSingleMapping(mapping, files, categoryMap) {
  try {
    const { category_key, file_name, category_id, subcategory_priority = true } = mapping;
    
    // 确定分类ID
    let targetCategoryId;
    
    if (category_id) {
      targetCategoryId = parseInt(category_id);
    } else if (category_key) {
      // 尝试通过分类名称或ID查找
      const category = categoryMap.get(category_key.toLowerCase()) || 
                      categoryMap.get(parseInt(category_key));
      if (category) {
        targetCategoryId = category.category_id;
      }
    }
    
    if (!targetCategoryId) {
      return {
        success: false,
        category_key,
        message: '无法找到对应的分类',
        error_code: 'CATEGORY_NOT_FOUND'
      };
    }
    
    // 查找对应的文件（智能匹配，处理中文编码问题）
    const targetFile = files.find(file => {
      console.log(`🔍 文件匹配检查: 上传文件="${file.originalname}", 目标文件="${file_name}"`);
      
      // 1. 精确匹配
      if (file.originalname === file_name) {
        console.log('✅ 精确匹配成功');
        return true;
      }
      
      // 2. 大小写不敏感匹配
      if (file.originalname.toLowerCase() === file_name.toLowerCase()) {
        console.log('✅ 大小写不敏感匹配成功');
        return true;
      }
      
      // 3. 处理中文文件名编码问题
      try {
        // 检查是否是乱码的中文文件名
        const isLikelyMojibake = /[\x80-\xFF]/.test(file.originalname) && file.originalname.includes('.png');
        
        if (isLikelyMojibake) {
          // 尝试多种编码修复方式
          
          // 方式1: Latin1 到 UTF-8
          const latin1ToUtf8 = Buffer.from(file.originalname, 'latin1').toString('utf8');
          if (latin1ToUtf8 === file_name) {
            console.log('✅ Latin1到UTF-8编码修复匹配成功');
            return true;
          }
          
          // 方式2: 二进制到UTF-8
          const binaryToUtf8 = Buffer.from(file.originalname, 'binary').toString('utf8');
          if (binaryToUtf8 === file_name) {
            console.log('✅ 二进制到UTF-8编码修复匹配成功');
            return true;
          }
          
          // 方式3: 反向编码匹配
          const utf8ToLatin1 = Buffer.from(file_name, 'utf8').toString('latin1');
          if (file.originalname === utf8ToLatin1) {
            console.log('✅ UTF-8到Latin1反向匹配成功');
            return true;
          }
          
          console.log(`编码修复尝试结果: Latin1->UTF8="${latin1ToUtf8}", Binary->UTF8="${binaryToUtf8}", UTF8->Latin1="${utf8ToLatin1}"`);
        }
      } catch (e) {
        console.log('编码转换失败:', e.message);
      }
      
      // 4. 仅扩展名匹配（作为最后的手段）
      const fileExt = file.originalname.split('.').pop();
      const targetExt = file_name.split('.').pop();
      if (fileExt === targetExt) {
        console.log('⚠️ 仅扩展名匹配，使用第一个匹配的文件');
        return true;
      }
      
      console.log('❌ 所有匹配方式都失败');
      return false;
    });
    
    if (!targetFile) {
      // 调试：打印所有可用文件
      console.log('🔍 查找文件失败，可用文件列表:');
      files.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.originalname}`);
      });
      console.log(`🔍 目标文件名: ${file_name}`);
      
      return {
        success: false,
        category_key,
        file_name,
        message: '未找到对应的图标文件',
        error_code: 'FILE_NOT_FOUND',
        available_files: files.map(f => f.originalname)
      };
    }
    
    // 上传图标到Supabase
    const uploadResult = await imageUploadService.handleImageUpload({
      type: 'cover',
      audioId: 'batch_upload', // 特殊标识用于批量上传
      fileBuffer: targetFile.buffer,
      fileName: targetFile.originalname
    });
    
    if (!uploadResult.success) {
      return {
        success: false,
        category_key,
        file_name,
        message: '图标上传失败',
        error: uploadResult.error,
        error_code: 'UPLOAD_FAILED'
      };
    }
    
    // 获取该分类下的所有音频（不包括子分类）
    const audioResult = await getAudiosByCategory(targetCategoryId, false);
    
    if (!audioResult.success) {
      return {
        success: false,
        category_key,
        message: '获取音频列表失败',
        error: audioResult.error,
        error_code: 'GET_AUDIOS_FAILED'
      };
    }
    
    const audios = audioResult.data;
    
    if (audios.length === 0) {
      return {
        success: false,
        category_key,
        message: '该分类下暂无音频',
        error_code: 'NO_AUDIOS_IN_CATEGORY'
      };
    }
    
    // 批量更新音频图标URL
    const updateResults = await batchUpdateAudioCovers(audios, uploadResult.url);
    
    return {
      success: true,
      category_key,
      category_id: targetCategoryId,
      file_name: targetFile.originalname,
      cover_url: uploadResult.url,
      file_path: uploadResult.filePath,
      audios_updated: updateResults.successful,
      audios_failed: updateResults.failed,
      total_audios: audios.length,
      message: `成功为分类 ${category_key} 下的 ${updateResults.successful} 个音频更新图标`
    };
    
  } catch (error) {
    console.error('处理单个分类映射失败:', error);
    return {
      success: false,
      category_key: mapping.category_key,
      message: '处理分类映射失败',
      error: error.message,
      error_code: 'PROCESS_MAPPING_FAILED'
    };
  }
}

/**
 * 获取分类下的所有音频（支持子分类优先）
 */
async function getAudiosByCategory(categoryId, subcategoryPriority = true) {
  try {
    let sql;
    let params = [categoryId];
    
    if (subcategoryPriority) {
      // 优先获取子分类的音频，如果没有子分类则获取当前分类的音频
      sql = `
        SELECT a.audio_id, a.title, a.cover_url, a.is_user_creation
        FROM audios a
        WHERE a.audio_id IN (
          SELECT DISTINCT acm.audio_id
          FROM audio_category_mapping acm
          WHERE acm.category_id IN (
            SELECT category_id FROM audio_categories 
            WHERE parent_id = ? OR category_id = ?
          )
        ) AND a.is_public = 1
        ORDER BY a.created_at DESC
      `;
      params = [categoryId, categoryId];
    } else {
      // 只获取当前分类的音频
      sql = `
        SELECT a.audio_id, a.title, a.cover_url, a.is_user_creation
        FROM audios a
        WHERE a.audio_id IN (
          SELECT DISTINCT acm.audio_id
          FROM audio_category_mapping acm
          WHERE acm.category_id = ?
        ) AND a.is_public = 1
        ORDER BY a.created_at DESC
      `;
    }
    
    const result = await query(sql, params);
    
    if (!result.success) {
      return { success: false, error: result.error };
    }
    
    return { success: true, data: result.data };
    
  } catch (error) {
    console.error('获取分类音频失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 批量更新音频封面URL
 */
async function batchUpdateAudioCovers(audios, coverUrl) {
  const results = { successful: 0, failed: 0, details: [] };
  
  for (const audio of audios) {
    try {
      // 使用管理员专用函数更新音频封面
      const updateResult = await AudioModel.adminBatchUpdateCover(audio.audio_id, coverUrl);
      
      if (updateResult.success) {
        results.details.push({
          audio_id: audio.audio_id,
          success: true,
          message: '更新成功'
        });
        results.successful++;
      } else {
        results.details.push({
          audio_id: audio.audio_id,
          success: false,
          message: '数据库更新失败',
          error: updateResult.error
        });
        results.failed++;
      }
      
    } catch (error) {
      results.details.push({
        audio_id: audio.audio_id,
        success: false,
        message: '更新过程中出错',
        error: error.message
      });
      results.failed++;
    }
  }
  
  return results;
}

/**
 * 获取分类列表接口
 * GET /api/admin/audio-icons/categories
 * 用于前端选择分类
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await AudioCategory.getCategories();
    
    // 构建分类树结构
    const categoryTree = buildCategoryTree(categories);
    
    res.json({
      success: true,
      data: {
        flat: categories,
        tree: categoryTree
      },
      total: categories.length
    });
    
  } catch (error) {
    console.error('获取分类列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取分类列表失败',
      error: error.message
    });
  }
});

/**
 * 构建分类树结构
 */
function buildCategoryTree(categories) {
  const categoryMap = new Map();
  const rootCategories = [];
  
  categories.forEach(category => {
    categoryMap.set(category.category_id, { ...category, children: [] });
  });
  
  categories.forEach(category => {
    if (category.parent_id === 0) {
      rootCategories.push(categoryMap.get(category.category_id));
    } else {
      const parent = categoryMap.get(category.parent_id);
      if (parent) {
        parent.children.push(categoryMap.get(category.category_id));
      }
    }
  });
  
  return rootCategories;
}

/**
 * 获取分类下音频统计信息
 * GET /api/admin/audio-icons/category/:category_id/audios
 */
router.get('/category/:category_id/audios', async (req, res) => {
  try {
    const { category_id } = req.params;
    const { include_subcategories = 'true' } = req.query;
    
    if (!category_id || isNaN(parseInt(category_id))) {
      return res.status(400).json({
        success: false,
        message: '分类ID格式无效'
      });
    }
    
    const audioResult = await getAudiosByCategory(
      parseInt(category_id), 
      include_subcategories === 'true'
    );
    
    if (!audioResult.success) {
      return res.status(500).json({
        success: false,
        message: '获取音频列表失败',
        error: audioResult.error
      });
    }
    
    const audios = audioResult.data;
    
    // 统计信息
    const stats = {
      total_audios: audios.length,
      with_cover: audios.filter(a => a.cover_url && a.cover_url.trim() !== '').length,
      without_cover: audios.filter(a => !a.cover_url || a.cover_url.trim() === '').length,
      user_creations: audios.filter(a => a.is_user_creation === 1).length
    };
    
    res.json({
      success: true,
      data: {
        audios: audios.slice(0, 10), // 只返回前10个用于预览
        statistics: stats,
        sample_count: Math.min(10, audios.length)
      },
      total: audios.length
    });
    
  } catch (error) {
    console.error('获取分类音频统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取音频统计失败',
      error: error.message
    });
  }
});

module.exports = router;