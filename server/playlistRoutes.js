const express = require('express');
const router = express.Router();

// 获取用户的所有播放列表
router.get('/', async (req, res) => {
  try {
    const openid = req.openid;
    
    const Playlist = require('./database/models/PlayList');
    const result = await Playlist.getUserPlaylists(openid);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '获取播放列表失败',
        error: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
    
  } catch (error) {
    console.error('获取播放列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取播放列表失败',
      error: error.message
    });
  }
});

// 获取播放列表详情
router.get('/:playlistId', async (req, res) => {
  try {
    const { playlistId } = req.params;
    
    if (!playlistId || isNaN(parseInt(playlistId))) {
      return res.status(400).json({
        success: false,
        message: '播放列表ID格式无效'
      });
    }
    
    const Playlist = require('./database/models/PlayList');
    const result = await Playlist.getPlaylistItems(parseInt(playlistId));
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '获取播放列表详情失败',
        error: result.error
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
    
  } catch (error) {
    console.error('获取播放列表详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取播放列表详情失败',
      error: error.message
    });
  }
});

// 创建播放列表
router.post('/', async (req, res) => {
  try {
    const openid = req.openid;
    const { name, isDefault = false } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: '播放列表名称不能为空'
      });
    }
    
    const Playlist = require('./database/models/PlayList');
    const result = await Playlist.createPlaylist(openid, name, isDefault);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '创建播放列表失败',
        error: result.error
      });
    }
    
    res.json({
      success: true,
      message: result.message,
      data: result.data
    });
    
  } catch (error) {
    console.error('创建播放列表失败:', error);
    res.status(500).json({
      success: false,
      message: '创建播放列表失败',
      error: error.message
    });
  }
});

// 添加音频到播放列表
router.post('/:playlistId/items', async (req, res) => {
  try {
    const { playlistId } = req.params;
    const { audioId, position = 0 } = req.body;
    
    if (!playlistId || isNaN(parseInt(playlistId))) {
      return res.status(400).json({
        success: false,
        message: '播放列表ID格式无效'
      });
    }
    
    if (!audioId || isNaN(parseInt(audioId))) {
      return res.status(400).json({
        success: false,
        message: '音频ID格式无效'
      });
    }
    
    const Playlist = require('./database/models/PlayList');
    const result = await Playlist.addToPlaylist(parseInt(playlistId), parseInt(audioId), position);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || '添加到播放列表失败'
      });
    }
    
    res.json({
      success: true,
      message: result.message
    });
    
  } catch (error) {
    console.error('添加到播放列表失败:', error);
    res.status(500).json({
      success: false,
      message: '添加到播放列表失败',
      error: error.message
    });
  }
});

// 从播放列表移除音频
router.delete('/:playlistId/items/:audioId', async (req, res) => {
  try {
    const { playlistId, audioId } = req.params;
    
    if (!playlistId || isNaN(parseInt(playlistId))) {
      return res.status(400).json({
        success: false,
        message: '播放列表ID格式无效'
      });
    }
    
    if (!audioId || isNaN(parseInt(audioId))) {
      return res.status(400).json({
        success: false,
        message: '音频ID格式无效'
      });
    }
    
    const Playlist = require('./database/models/PlayList');
    const result = await Playlist.removeFromPlaylist(parseInt(playlistId), parseInt(audioId));
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || '从播放列表移除失败'
      });
    }
    
    res.json({
      success: true,
      message: result.message
    });
    
  } catch (error) {
    console.error('从播放列表移除失败:', error);
    res.status(500).json({
      success: false,
      message: '从播放列表移除失败',
      error: error.message
    });
  }
});

// 清空播放列表
router.delete('/:playlistId/items', async (req, res) => {
  try {
    const { playlistId } = req.params;
    
    if (!playlistId || isNaN(parseInt(playlistId))) {
      return res.status(400).json({
        success: false,
        message: '播放列表ID格式无效'
      });
    }
    
    const Playlist = require('./database/models/PlayList');
    const result = await Playlist.clearPlaylist(parseInt(playlistId));
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || '清空播放列表失败'
      });
    }
    
    res.json({
      success: true,
      message: result.message
    });
    
  } catch (error) {
    console.error('清空播放列表失败:', error);
    res.status(500).json({
      success: false,
      message: '清空播放列表失败',
      error: error.message
    });
  }
});

module.exports = router;