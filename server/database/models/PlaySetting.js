const { query } = require('../config');

class PlaySetting {
  // 获取用户播放设置（无设置时返回默认值）
  static async getPlaySettings(openid) {
    try {
      const sql = `
        SELECT * FROM play_settings 
        WHERE openid = ?
      `;
      const result = await query(sql, [openid]);
      if (result.data && result.data.length > 0) {
        return {
          success: true,
          data: result.data[0]
        };
      }
      // 返回默认设置
      return {
        success: true,
        data: {
          play_mode: 'list_loop', // 列表循环
          timer_minutes: 0        // 定时关闭（0=关闭）
        }
      };
    } catch (error) {
      console.error('获取播放设置失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 更新用户播放设置
  static async updatePlaySettings(openid, settings) {
    try {
      const checkSql = `
        SELECT id FROM play_settings 
        WHERE openid = ?
      `;
      const checkResult = await query(checkSql, [openid]);
      if (checkResult.data && checkResult.data.length > 0) {
        const sql = `
          UPDATE play_settings 
          SET play_mode = ?, timer_minutes = ?, updated_at = NOW()
          WHERE openid = ?
        `;
        await query(sql, [settings.play_mode, settings.timer_minutes, openid]);
      } else {
        const sql = `
          INSERT INTO play_settings (openid, play_mode, timer_minutes, created_at)
          VALUES (?, ?, ?, NOW())
        `;
        await query(sql, [openid, settings.play_mode || 'list_loop', settings.timer_minutes || 0]);
      }
      return {
        success: true,
        message: '播放设置更新成功'
      };
    } catch (error) {
      console.error('更新播放设置失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = PlaySetting;