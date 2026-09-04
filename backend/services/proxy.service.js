/**
 * 代理服务
 * 统一处理对外部 API 的调用，解决跨域问题并提供缓存
 */

const { logger } = require('@/utils/logger');
const redisManager = require('@/utils/redis');
const environment = require('@/config/environment');

class ProxyService {
  constructor() {
    // 缓存配置 - 从环境配置读取(单位:秒)
    const config = environment.get();
    this.CACHE_TTL = {
      IP_LOCATION: config.proxy.ipLocationTTL,
      WEATHER: config.proxy.weatherTTL,
      MUSIC_URL: config.proxy.musicUrlTTL,
    };

    // Redis 缓存键前缀
    this.CACHE_PREFIX = {
      IP_LOCATION: 'proxy:ip:',
      WEATHER: 'proxy:weather:',
      MUSIC_URL: 'proxy:music:',
    };
  }

  /**
   * 获取 IP 地理位置信息
   * @param {string} ip - IP 地址（可选）
   * @returns {Promise<Object>} 地理位置信息
   */
  async getIPLocation(ip = null) {
    try {
      // 检查是否是本地IP
      const isLocalIP =
        !ip ||
        ip === '127.0.0.1' ||
        ip === 'localhost' ||
        ip === '::1' ||
        ip.startsWith('192.168.') ||
        ip.startsWith('10.') ||
        ip.startsWith('172.');

      // 本地IP直接返回默认值
      if (isLocalIP) {
        return {
          success: true,
          city: '本地',
          region: '',
          country: '本地',
          latitude: 0,
          longitude: 0,
          timezone: 'Asia/Shanghai',
          location: '本地',
        };
      }

      const cacheKey = `${this.CACHE_PREFIX.IP_LOCATION}${ip}`;

      // 尝试从缓存获取
      // redisManager 的 get 方法已经自动解析 JSON，直接返回对象或字符串
      const cached = await redisManager.get(cacheKey);
      if (cached) {
        logger.debug(`✅ IP定位缓存命中: ${ip}`);
        // redisManager 已经做了 JSON 解析，直接返回
        return cached;
      }

      // 调用第三方 API，使用 AbortController 实现超时
      const url = `http://ip-api.com/json/${ip}?lang=zh-CN&fields=status,country,regionName,city,lat,lon,timezone`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`IP定位API返回错误: ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== 'success') {
        throw new Error(`IP定位失败: ${data.message || '未知错误'}`);
      }

      // 格式化返回数据
      const result = {
        success: true,
        city: data.city || '未知',
        region: data.regionName || '',
        country: data.country || '',
        latitude: data.lat || 0,
        longitude: data.lon || 0,
        timezone: data.timezone || 'Asia/Shanghai',
        // 组合地理位置文本
        location: [data.country, data.regionName, data.city].filter(Boolean).join(' · '),
      };

      // 存入缓存（redisManager.set 会自动处理 JSON 序列化）
      await redisManager.set(cacheKey, result, this.CACHE_TTL.IP_LOCATION);

      logger.info(`✅ IP定位成功: ${result.location}`);
      return result;
    } catch (error) {
      logger.error('IP定位失败:', error);
      // 返回默认值而不是抛出异常
      return {
        success: false,
        city: '未知',
        region: '',
        country: '',
        latitude: 0,
        longitude: 0,
        timezone: 'Asia/Shanghai',
        location: '未知',
        error: error.message,
      };
    }
  }

  /**
   * 获取天气信息
   * @param {string} city - 城市名称
   * @param {string} format - 返回格式 (json/text)
   * @returns {Promise<Object>} 天气信息
   */
  async getWeather(city = '北京', format = 'json') {
    try {
      const cacheKey = `${this.CACHE_PREFIX.WEATHER}${city}:${format}`;

      // 尝试从缓存获取
      // redisManager 的 get 方法已经自动解析 JSON，直接返回对象或字符串
      const cached = await redisManager.get(cacheKey);
      if (cached) {
        logger.debug(`✅ 天气缓存命中: ${city}`);
        // redisManager 已经做了 JSON 解析，直接返回
        return cached;
      }

      // 调用天气 API，使用 AbortController 实现超时
      const url = `http://shanhe.kim/api/za/tianqi.php?city=${encodeURIComponent(city)}&type=${format}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒超时

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`天气API返回错误: ${response.status}`);
        }

        const data = await response.json();

        // 检查返回的 code 是否为成功状态
        if (data.code !== 1) {
          throw new Error(`天气API返回错误: ${data.text || '未知错误'}`);
        }

        // 存入缓存（redisManager.set 会自动处理 JSON 序列化）
        await redisManager.set(cacheKey, data, this.CACHE_TTL.WEATHER);

        logger.info(`✅ 获取天气成功: ${city}`);
        return data;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      logger.error('获取天气失败:', error);

      // 返回默认天气数据而不是抛出异常
      return {
        code: 0,
        text: '获取天气失败',
        data: {
          city: city,
          temp: '--',
          tempn: '--',
          weather: '未知',
          wind: '--',
          windSpeed: '--',
          time: '',
          current: {
            temp: '--',
            weather: '未知',
            weatherEnglish: 'Unknown',
            humidity: '--',
            windSpeed: '--',
            wind: '--',
          },
        },
      };
    }
  }

  /**
   * 获取音乐播放 URL
   * @param {string} server - 音乐平台 (tencent/netease/kugou)
   * @param {string} id - 歌曲 ID
   * @returns {Promise<Object>} 音乐播放信息
   */
  async getMusicUrl(server = 'tencent', id) {
    try {
      if (!id) {
        throw new Error('歌曲ID不能为空');
      }

      const cacheKey = `${this.CACHE_PREFIX.MUSIC_URL}${server}:${id}`;

      // 尝试从缓存获取
      // redisManager 的 get 方法已经自动解析 JSON，直接返回对象或字符串
      const cached = await redisManager.get(cacheKey);
      if (cached) {
        logger.debug(`✅ 音乐URL缓存命中: ${server}:${id}`);
        // redisManager 已经做了 JSON 解析，直接返回
        return cached;
      }

      // 调用音乐 API
      const url = `https://music.3e0.cn//?server=${server}&type=song&id=${id}`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`音乐API返回错误: ${response.status}`);
      }

      const data = await response.json();

      // 存入缓存（redisManager.set 会自动处理 JSON 序列化）
      // 仅缓存看起来有效的数据，避免把错误响应长期缓存
      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        await redisManager.set(cacheKey, data, this.CACHE_TTL.MUSIC_URL);
      }

      logger.info(`✅ 获取音乐URL成功: ${server}:${id}`);
      return data;
    } catch (error) {
      logger.error('获取音乐URL失败:', error);
      throw error;
    }
  }

  /**
   * 获取单曲完整信息
   * @param {string} server - 音乐平台 (tencent/netease)
   * @param {string} id - 歌曲 ID
   * @returns {Promise<Object>} 歌曲信息 { id, name, artist, url, pic, lrc }
   */
  async getMusicInfo(server = 'netease', id) {
    try {
      if (!id) {
        throw new Error('歌曲ID不能为空');
      }

      const cacheKey = `${this.CACHE_PREFIX.MUSIC_URL}info:${server}:${id}`;

      // 尝试从缓存获取
      const cached = await redisManager.get(cacheKey);
      if (cached) {
        logger.debug(`✅ 音乐信息缓存命中: ${server}:${id}`);
        return cached;
      }

      // 调用音乐 API 获取单曲信息
      const url = `https://music.3e0.cn/?server=${server}&type=song&id=${id}`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`音乐API返回错误: ${response.status}`);
      }

      const data = await response.json();

      // API 返回的是数组，取第一个
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('未找到歌曲信息');
      }

      const songInfo = data[0];
      const result = {
        songId: String(songInfo.id || id),
        name: songInfo.name || '未知歌曲',
        artist: songInfo.artist || '未知歌手',
        url: songInfo.url || '',
        pic: songInfo.pic || '',
        lrc: songInfo.lrc || '',
      };

      // 缓存24小时
      await redisManager.set(cacheKey, result, this.CACHE_TTL.MUSIC_URL);

      logger.info(`✅ 获取音乐信息成功: ${result.name} - ${result.artist}`);
      return result;
    } catch (error) {
      logger.error('获取音乐信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取歌单中的所有歌曲
   * @param {string} server - 音乐平台 (tencent/netease)
   * @param {string} playlistId - 歌单 ID
   * @returns {Promise<Array>} 歌曲列表
   */
  async getPlaylistSongs(server = 'netease', playlistId) {
    try {
      if (!playlistId) {
        throw new Error('歌单ID不能为空');
      }

      const cacheKey = `${this.CACHE_PREFIX.MUSIC_URL}playlist:${server}:${playlistId}`;

      // 尝试从缓存获取
      const cached = await redisManager.get(cacheKey);
      if (cached) {
        logger.debug(`✅ 歌单缓存命中: ${server}:${playlistId}`);
        return cached;
      }

      // 调用音乐 API 获取歌单
      const url = `https://music.3e0.cn/?server=${server}&type=playlist&id=${playlistId}`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`音乐API返回错误: ${response.status}`);
      }

      const data = await response.json();

      // API 返回的是歌曲数组
      if (!Array.isArray(data)) {
        throw new Error('歌单解析失败');
      }

      const songs = data.map(song => ({
        songId: String(song.id),
        name: song.name || '未知歌曲',
        artist: song.artist || '未知歌手',
        url: song.url || '',
        pic: song.pic || '',
        lrc: song.lrc || '',
      }));

      // 缓存1小时
      await redisManager.set(cacheKey, songs, 3600);

      logger.info(`✅ 获取歌单成功: ${songs.length} 首歌曲`);
      return songs;
    } catch (error) {
      logger.error('获取歌单失败:', error);
      throw error;
    }
  }

  /**
   * 清除指定类型的缓存
   * @param {string} type - 缓存类型 (ip/weather/music/all)
   */
  async clearCache(type = 'all') {
    try {
      const patterns = {
        ip: `${this.CACHE_PREFIX.IP_LOCATION}*`,
        weather: `${this.CACHE_PREFIX.WEATHER}*`,
        music: `${this.CACHE_PREFIX.MUSIC_URL}*`,
        all: 'proxy:*',
      };

      const pattern = patterns[type] || patterns.all;

      // 使用 Redis SCAN 命令删除匹配的键
      const client = redisManager.getClient();
      let cursor = '0';
      let deletedCount = 0;

      do {
        const result = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = result[0];
        const keys = result[1];

        if (keys.length > 0) {
          await Promise.all(keys.map(key => client.del(key)));
          deletedCount += keys.length;
        }
      } while (cursor !== '0');

      logger.info(`✅ 清除缓存成功: ${type}, 删除 ${deletedCount} 条`);
      return { success: true, deletedCount };
    } catch (error) {
      logger.error('清除缓存失败:', error);
      throw error;
    }
  }
}

module.exports = new ProxyService();
module.exports.ProxyService = ProxyService;
