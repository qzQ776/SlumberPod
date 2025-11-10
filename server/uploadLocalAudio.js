const fs = require('fs').promises;
const path = require('path');
const {
  uploadAudioToSupabase,
  saveAudioUrlToMySQL,
  mapAudioToCategories,
  ensureBucketExists,
  deleteAudioFromSupabase
} = require('./supabaseService');

/**
 * 上传单个本地音频文件到指定分类
 * @param {string} filePath 本地音频文件路径（如 './system-audios/test.mp3'）
 * @param {number[]} categoryIds 目标分类ID数组（如 [3, 5]）
 * @returns {Promise<{success: boolean, audioId?: number, error?: string}>}
 */
async function uploadSingleLocalAudio(filePath, categoryIds) {
  try {
    // 验证文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      return { success: false, error: `文件不存在：${filePath}` };
    }

    // 验证分类ID是否有效
    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      return { success: false, error: '分类ID必须是非空数组（如 [1, 2]）' };
    }

    // 读取文件信息
    const fileName = path.basename(filePath);
    const fileStat = await fs.stat(filePath);
    if (fileStat.isDirectory()) {
      return { success: false, error: `${filePath} 是目录，不是文件` };
    }

    console.log(`开始上传单个文件：${fileName} 到分类 ${categoryIds.join(',')}`);

    // 读取文件缓冲区
    const fileBuffer = await fs.readFile(filePath);

    // 上传到Supabase（系统音频目录）
    const uploadResult = await uploadAudioToSupabase(
      fileBuffer,
      fileName,
      'system-audios'
    );
    if (!uploadResult.success) {
      return { success: false, error: `Supabase上传失败：${uploadResult.error}` };
    }

    // 保存到MySQL
    const title = path.basename(fileName, path.extname(fileName));
    const saveResult = await saveAudioUrlToMySQL({
      title: title,
      audio_url: uploadResult.url,
      owner_openid: null, // 系统音频无所有者
      description: `系统音频：${title}`,
      duration_seconds: Math.round(fileBuffer.length / (128 * 1024)), // 估算时长
      is_free: 1,
      is_public: 1,
      type: 'system',
      is_user_creation: 0
    });
    if (!saveResult.success) {
      await deleteAudioFromSupabase(uploadResult.filePath); // 回滚
      return { success: false, error: `MySQL保存失败：${saveResult.error}` };
    }

    // 关联到指定分类
    await mapAudioToCategories(saveResult.id, categoryIds);

    console.log(`✅ 单个文件上传成功：${fileName}（ID: ${saveResult.id}）`);
    return { success: true, audioId: saveResult.id };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 批量上传本地音频文件，支持为每个文件指定单独的分类ID
 * @param {Array<{filePath: string, categoryIds: number[]}>} fileList 包含文件路径和分类ID的数组
 * 示例：[
 *   { filePath: './audios/a.mp3', categoryIds: [1] },
 *   { filePath: './audios/b.wav', categoryIds: [2, 3] }
 * ]
 */
async function batchUploadWithCategories(fileList) {
  if (!Array.isArray(fileList) || fileList.length === 0) {
    console.log('批量上传列表为空，无需执行');
    return;
  }

  // 确保存储桶存在
  const bucketResult = await ensureBucketExists();
  if (!bucketResult.success) {
    console.error(`存储桶初始化失败：${bucketResult.error}`);
    return;
  }

  let successCount = 0;
  let failCount = 0;

  // 遍历文件列表逐个上传
  for (const item of fileList) {
    const { filePath, categoryIds } = item;
    const fileName = path.basename(filePath);

    try {
      const result = await uploadSingleLocalAudio(filePath, categoryIds);
      if (result.success) {
        successCount++;
      } else {
        failCount++;
        console.error(`❌ 批量上传失败：${fileName} - ${result.error}`);
      }
    } catch (error) {
      failCount++;
      console.error(`❌ 批量上传异常：${fileName} - ${error.message}`);
    }
  }

  // 输出统计结果
  console.log('\n===== 批量上传完成 =====');
  console.log(`总文件数：${fileList.length}`);
  console.log(`成功：${successCount} 个`);
  console.log(`失败：${failCount} 个`);
}

// ====================== 执行示例 ======================

// 示例1：上传单个文件到分类ID=3
// uploadSingleLocalAudio(
//   './system-audios/rain.mp3', // 本地文件路径
//   [3] // 目标分类ID
// ).then(result => {
//   if (!result.success) console.error(result.error);
// });

// 示例2：批量上传多个文件，分别指定分类
batchUploadWithCategories([
  {
    filePath: './system-audios/sea.wav', // 海浪声
    categoryIds: [2, 5] // 分类2（自然）、分类5（放松）
  },
  {
    filePath: './system-audios/piano.mp3', // 钢琴曲
    categoryIds: [1, 4] // 分类1（音乐）、分类4（专注）
  },
  {
    filePath: './system-audios/fireplace.m4a', // 壁炉声
    categoryIds: [3] // 分类3（环境）
  }
]);