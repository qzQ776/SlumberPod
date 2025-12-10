/**
 * 白噪音组合播放服务
 * 处理不同播放模式的音频混合逻辑
 */

class CombinationPlayerService {
  /**
   * 生成组合播放的音频URL配置
   * @param {Array} audios - 音频列表
   * @param {Object} options - 播放选项
   * @param {string} options.playMode - 播放模式: sequential | parallel | mixed
   * @param {Object} options.volumeConfig - 音量配置 {audioId: volume}
   * @returns {Object} 播放配置
   */
  static generatePlayConfig(audios, options = {}) {
    const { playMode = 'mixed', volumeConfig = {} } = options;
    
    if (!Array.isArray(audios) || audios.length === 0) {
      throw new Error('音频列表不能为空');
    }

    const playConfig = {
      mode: playMode,
      tracks: []
    };

    switch (playMode) {
      case 'sequential':
        // 顺序播放：音频按顺序一个接一个播放
        playConfig.tracks = audios.map((audio, index) => ({
          id: audio.audio_id,
          title: audio.title,
          url: audio.audio_url,
          volume: volumeConfig[audio.audio_id] || 1.0,
          startTime: index > 0 ? null : 0, // 第一个音频立即开始
          order: index,
          description: `顺序播放第${index + 1}个音频`
        }));
        break;

      case 'parallel':
        // 并行播放：所有音频同时播放
        playConfig.tracks = audios.map(audio => ({
          id: audio.audio_id,
          title: audio.title,
          url: audio.audio_url,
          volume: volumeConfig[audio.audio_id] || 0.6, // 并行播放默认音量较低
          startTime: 0, // 所有音频同时开始
          order: 0,
          description: '同时播放'
        }));
        break;

      case 'mixed':
        // 混合播放：智能混合不同音频
        playConfig.tracks = this.generateMixedTracks(audios, volumeConfig);
        break;

      default:
        throw new Error('不支持的播放模式');
    }

    // 计算总播放时长
    playConfig.totalDuration = this.calculateTotalDuration(playConfig.tracks, playMode);
    
    // 生成播放列表描述
    playConfig.description = this.generateDescription(playConfig.mode, audios);
    
    return playConfig;
  }

  /**
   * 生成混合播放轨道
   * @param {Array} audios - 音频列表
   * @param {Object} volumeConfig - 音量配置
   * @returns {Array} 轨道配置
   */
  static generateMixedTracks(audios, volumeConfig) {
    const tracks = [];
    const fadeInTime = 2; // 淡入时间（秒）
    const fadeOutTime = 3; // 淡出时间（秒）
    
    audios.forEach((audio, index) => {
      const baseVolume = volumeConfig[audio.audio_id] || 0.8;
      
      // 为每个音频创建混合轨道
      let startTime = 0;
      let volume = baseVolume;
      
      if (index === 0) {
        // 第一个音频立即开始，音量正常
        startTime = 0;
        volume = baseVolume;
      } else if (index === 1) {
        // 第二个音频延迟3秒开始，音量稍低
        startTime = 3;
        volume = baseVolume * 0.7;
      } else {
        // 后续音频延迟递增，音量更低
        startTime = index * 3;
        volume = baseVolume * 0.5;
      }

      tracks.push({
        id: audio.audio_id,
        title: audio.title,
        url: audio.audio_url,
        volume: volume,
        startTime: startTime,
        fadeIn: fadeInTime,
        fadeOut: fadeOutTime,
        order: index,
        description: `${index + 1}号音频，${startTime}秒后开始播放`,
        effects: {
          fadeIn: true,
          fadeOut: true,
          reverb: 0.1, // 轻微混响
          delay: index > 1 ? 0.5 : 0 // 延迟效果
        }
      });
    });

    return tracks;
  }

  /**
   * 计算总播放时长
   * @param {Array} tracks - 轨道列表
   * @param {string} mode - 播放模式
   * @returns {number} 总时长（秒）
   */
  static calculateTotalDuration(tracks, mode) {
    switch (mode) {
      case 'sequential':
        // 顺序播放：总时长为所有音频时长之和
        return tracks.reduce((total, track) => {
          // 这里需要实际的音频时长，暂时用默认值
          const duration = track.duration || 300; // 默认5分钟
          return total + duration;
        }, 0);

      case 'parallel':
        // 并行播放：总时长为最长的音频时长
        return Math.max(...tracks.map(track => track.duration || 300));

      case 'mixed':
        // 混合播放：总时长为最后一个音频开始时间 + 其播放时长
        const maxStartTime = Math.max(...tracks.map(track => track.startTime || 0));
        const longestDuration = Math.max(...tracks.map(track => track.duration || 300));
        return maxStartTime + longestDuration;

      default:
        return 0;
    }
  }

  /**
   * 生成播放描述
   * @param {string} mode - 播放模式
   * @param {Array} audios - 音频列表
   * @returns {string} 描述
   */
  static generateDescription(mode, audios) {
    const audioTitles = audios.map(audio => audio.title).join('、');
    
    switch (mode) {
      case 'sequential':
        return `顺序播放: ${audioTitles}`;
      case 'parallel':
        return `并行播放: ${audioTitles}`;
      case 'mixed':
        return `智能混合: ${audioTitles}`;
      default:
        return `播放组合: ${audioTitles}`;
    }
  }

  /**
   * 生成播放端点配置
   * @param {Object} playConfig - 播放配置
   * @returns {Object} 前端播放器配置
   */
  static generatePlayerConfig(playConfig) {
    return {
      // Web Audio API 配置
      webAudioConfig: {
        sampleRate: 44100,
        numberOfChannels: 2,
        bufferSize: 4096,
        crossOrigin: 'anonymous'
      },
      
      // 播放器配置
      playerConfig: {
        mode: playConfig.mode,
        tracks: playConfig.tracks,
        totalDuration: playConfig.totalDuration,
        description: playConfig.description,
        
        // 播放控制
        controls: {
          play: true,
          pause: true,
          stop: true,
          seek: true,
          volume: true,
          loop: true,
          shuffle: false // 组合播放不支持随机
        },
        
        // 视觉化配置
        visualization: {
          enabled: true,
          type: 'waveform', // waveform | frequency | spectrum
          colors: ['#4CAF50', '#2196F3', '#FF9800'] // 对应不同音频的颜色
        }
      },
      
      // 混音器配置
      mixerConfig: {
        enabled: true,
        maxTracks: 10,
        effects: {
          fadeIn: true,
          fadeOut: true,
          crossfade: true,
          reverb: true,
          delay: true
        }
      }
    };
  }

  /**
   * 验证播放配置
   * @param {Object} playConfig - 播放配置
   * @returns {Object} 验证结果
   */
  static validatePlayConfig(playConfig) {
    const errors = [];
    
    if (!playConfig.tracks || !Array.isArray(playConfig.tracks)) {
      errors.push('播放轨道配置无效');
      return { valid: false, errors };
    }

    if (playConfig.tracks.length === 0) {
      errors.push('至少需要一个音频轨道');
    }

    if (playConfig.tracks.length > 10) {
      errors.push('音频轨道数量不能超过10个');
    }

    // 验证每个轨道
    playConfig.tracks.forEach((track, index) => {
      if (!track.url) {
        errors.push(`轨道${index + 1}缺少音频URL`);
      }
      
      if (track.volume < 0 || track.volume > 2) {
        errors.push(`轨道${index + 1}音量超出范围(0-2)`);
      }
      
      if (track.startTime < 0) {
        errors.push(`轨道${index + 1}开始时间不能为负数`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = CombinationPlayerService;