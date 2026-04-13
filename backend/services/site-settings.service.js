const { SiteSettings, User } = require('../models');
const { AppError } = require('@/utils/response');

class SiteSettingsService {
  /**
   * 获取网站设置
   */
  async getSiteSettings() {
    const settings = await SiteSettings.findOne({
      // 单站长架构：始终使用第一条记录作为全站唯一站点配置
      order: [['id', 'ASC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['avatar'],
        },
      ],
    });

    if (!settings) {
      throw new AppError('网站设置不存在', 404);
    }

    // 将管理员的 avatar 添加到返回结果中
    return {
      ...settings.toJSON(),
      avatar: settings.user?.avatar || null,
    };
  }

  /**
   * 更新网站设置
   * @param {Number} userId - 用户ID
   * @param {Object} settingsData - 设置数据
   */
  async updateSiteSettings(userId, settingsData) {
    // 单站长架构：全站仅保留一条站点设置记录
    let settings = await SiteSettings.findOne({
      order: [['id', 'ASC']],
    });

    if (settings) {
      // 已存在记录时只更新字段，不再按 userId 拆分多条
      await settings.update(settingsData);
    } else {
      // 首次创建时，记录当前管理员为站长
      settings = await SiteSettings.create({
        userId,
        ...settingsData,
      });
    }

    return settings;
  }
}

module.exports = new SiteSettingsService();
