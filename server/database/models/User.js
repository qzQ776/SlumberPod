const { query } = require('../config');

/**
 * 用户模型类 - 处理所有用户相关操作
 */
class UserModel {
  
  /**
   * 根据openid查找用户（返回完整用户信息，含累计睡眠时长、偏好类别等）
   */
  async findByOpenid(openid) {
    try {
      const sql = 'SELECT * FROM users WHERE openid = ? AND is_deleted = 0';
      const result = await query(sql, [openid]);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return result.data.length > 0 ? result.data[0] : null;
    } catch (error) {
      console.error('查找用户失败:', error);
      throw error;
    }
  }

  /**
   * 创建新用户
   */
  async create(userData) {
    try {
      const sql = `
        INSERT INTO users (
          openid, unionid, nickname, avatar_url, gender, city, country, 
          province, language, session_key, settings, bio, birthday
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        userData.openid,
        userData.unionid || null,
        userData.nickname || `微信用户_${userData.openid.slice(-8)}`,
        userData.avatar_url || null,
        userData.gender || 0,
        userData.city || null,
        userData.country || null,
        userData.province || null,
        userData.language || null,
        userData.session_key || null,
        userData.settings || JSON.stringify({}),
        userData.bio || null,
        userData.birthday || null
      ];
      
      const result = await query(sql, params);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // 返回创建的用户信息
      return await this.findByOpenid(userData.openid);
    } catch (error) {
      console.error('创建用户失败:', error);
      throw error;
    }
  }

  /**
   * 更新用户信息（通用方法，支持账号资料、偏好设置等所有字段更新）
   */
  async update(openid, updates) {
    try {
      const fields = [];
      const values = [];
      
      Object.keys(updates).forEach(key => {
        if (key !== 'openid') {
          // 确保没有undefined值传入数据库
          let value = updates[key];
          if (value === undefined) {
            value = null;
          }
          
          fields.push(`${key} = ?`);
          values.push(value);
        }
      });
      
      if (fields.length === 0) {
        return await this.findByOpenid(openid);
      }
      
      values.push(openid);
      
      const sql = `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE openid = ?`;
      const result = await query(sql, values);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return await this.findByOpenid(openid);
    } catch (error) {
      console.error('更新用户失败:', error);
      throw error;
    }
  }

  /**
   * 更新用户最后登录时间
   */
  async updateLastLogin(openid) {
    try {
      const sql = 'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE openid = ?';
      const result = await query(sql, [openid]);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return true;
    } catch (error) {
      console.error('更新最后登录时间失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户统计数据（含累计睡眠时长、偏好类别、收藏/播放历史等）
   */
  async getUserStatistics(openid) {
    try {
      const user = await this.findByOpenid(openid);
      if (!user) {
        return {
          favorites: 0,
          playHistory: 0,
          userCreations: 0,
          communityPosts: 0,
          sleepSessions: 0,
          totalSleepDuration: 0,
          preferredCategory: '未设置'
        };
      }
      // 并行获取各种统计数据
      const [
        favorites,
        playHistory,
        userCreations,
        communityPosts,
        sleepSessions
      ] = await Promise.all([
        this.getFavoritesCount(openid),
        this.getPlayHistoryCount(openid),
        this.getUserCreationsCount(openid),
        this.getCommunityPostsCount(openid),
        this.getSleepSessionsCount(openid)
      ]);
      
      return {
        favorites,
        playHistory,
        userCreations,
        communityPosts,
        sleepSessions,
        totalSleepDuration: user.total_sleep_duration,
        preferredCategory: user.preferred_category || '未设置'
      };
    } catch (error) {
      console.error('获取用户统计数据失败:', error);
      throw error;
    }
  }

  /**
   * 更新账号资料（昵称、简介、性别、生日、手机号等）
   */
  async updateAccountInfo(openid, accountData) {
    return this.update(openid, accountData);
  }

  /**
   * 获取收藏数量
   */
  async getFavoritesCount(openid) {
    const sql = 'SELECT COUNT(*) as count FROM favorites WHERE openid = ?';
    const result = await query(sql, [openid]);
    return result.success ? result.data[0].count : 0;
  }

  /**
   * 获取播放历史数量
   */
  async getPlayHistoryCount(openid) {
    const sql = 'SELECT COUNT(*) as count FROM play_history WHERE openid = ?';
    const result = await query(sql, [openid]);
    return result.success ? result.data[0].count : 0;
  }

  /**
   * 获取用户创作数量
   */
  async getUserCreationsCount(openid) {
    const sql = 'SELECT COUNT(*) as count FROM audios WHERE owner_openid = ? AND is_user_creation = 1';
    const result = await query(sql, [openid]);
    return result.success ? result.data[0].count : 0;
  }

  /**
   * 获取社区帖子数量
   */
  async getCommunityPostsCount(openid) {
    const sql = 'SELECT COUNT(*) as count FROM posts WHERE author_openid = ? AND status = "published"';
    const result = await query(sql, [openid]);
    return result.success ? result.data[0].count : 0;
  }

  /**
   * 获取睡眠会话数量
   */
  async getSleepSessionsCount(openid) {
    const sql = 'SELECT COUNT(*) as count FROM sleep_sessions WHERE openid = ?';
    const result = await query(sql, [openid]);
    return result.success ? result.data[0].count : 0;
  }

  /**
   * 获取用户最近活动
   */
  async getRecentActivity(openid, limit = 10) {
    try {
      const activities = [];
      
      // 获取最近睡眠记录
      const sleepSql = `
        SELECT session_id, start_time, end_time 
        FROM sleep_sessions 
        WHERE openid = ? 
        ORDER BY start_time DESC 
        LIMIT 5
      `;
      const sleepResult = await query(sleepSql, [openid]);
      
      if (sleepResult.success && sleepResult.data.length > 0) {
        sleepResult.data.forEach(record => {
          const duration = record.end_time ? 
            Math.round((new Date(record.end_time) - new Date(record.start_time)) / (1000 * 60 * 60)) : 0;
          
          activities.push({
            type: 'sleep',
            time: record.start_time,
            description: `睡眠 ${duration}小时`,
            icon: 'bed'
          });
        });
      }
      
      // 获取最近播放历史
      const playSql = `
        SELECT ph.played_at, a.title 
        FROM play_history ph 
        JOIN audios a ON ph.audio_id = a.audio_id 
        WHERE ph.openid = ? 
        ORDER BY ph.played_at DESC 
        LIMIT 5
      `;
      const playResult = await query(playSql, [openid]);
      
      if (playResult.success && playResult.data.length > 0) {
        playResult.data.forEach(record => {
          activities.push({
            type: 'play',
            time: record.played_at,
            description: `播放了 ${record.title || '音频'}`,
            icon: 'play'
          });
        });
      }
      
      // 获取最近社区帖子
      const postSql = `
        SELECT created_at, title 
        FROM posts 
        WHERE author_openid = ? AND status = 'published'
        ORDER BY created_at DESC 
        LIMIT 5
      `;
      const postResult = await query(postSql, [openid]);
      
      if (postResult.success && postResult.data.length > 0) {
        postResult.data.forEach(post => {
          activities.push({
            type: 'post',
            time: post.created_at,
            description: `发布了帖子：${post.title}`,
            icon: 'edit'
          });
        });
      }
      
      // 按时间排序并限制数量
      activities.sort((a, b) => new Date(b.time) - new Date(a.time));
      
      return activities.slice(0, limit);
    } catch (error) {
      console.error('获取用户最近活动失败:', error);
      throw error;
    }
  }

  /**
   * 软删除用户（注销账户）
   */
  async softDelete(openid) {
    try {
      const sql = 'UPDATE users SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE openid = ?';
      const result = await query(sql, [openid]);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return true;
    } catch (error) {
      console.error('删除用户失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户设置
   */
  async getSettings(openid) {
    try {
      const sql = 'SELECT settings FROM users WHERE openid = ?';
      const result = await query(sql, [openid]);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      if (result.data.length === 0) {
        return this.getDefaultSettings();
      }
      
      const settings = result.data[0].settings;
      return settings ? JSON.parse(settings) : this.getDefaultSettings();
    } catch (error) {
      console.error('获取用户设置失败:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * 更新用户设置
   */
  async updateSettings(openid, settings) {
    try {
      const sql = 'UPDATE users SET settings = ?, updated_at = CURRENT_TIMESTAMP WHERE openid = ?';
      const result = await query(sql, [JSON.stringify(settings), openid]);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return true;
    } catch (error) {
      console.error('更新用户设置失败:', error);
      throw error;
    }
  }

  /**
   * 默认用户设置
   */
  getDefaultSettings() {
    return {
      notifications: {
        alarm: true,
        community: true,
        system: true
      },
      playback: {
        autoPlay: false,
        quality: 'standard',
        backgroundPlay: true
      },
      privacy: {
        profilePublic: true,
        sleepRecordsPrivate: false
      }
    };
  }
}

module.exports = new UserModel();8