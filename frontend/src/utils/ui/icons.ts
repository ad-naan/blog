/**
 * 应用图标统一管理模块
 * - 使用 Vite import.meta.glob 批量导入本地图标
 * - 支持本地图标和 CDN 图标混合使用
 * - 提供类型安全的配置
 */

// 批量导入本地图标（eager: true 立即导入，避免异步）
const localIcons = import.meta.glob<{ default: string }>('@/assets/icons/app/*.{png,jpg,svg}', {
  eager: true,
});

// 解析本地图标路径
const parseLocalIcons = () => {
  const icons: Record<string, string> = {};
  Object.entries(localIcons).forEach(([path, module]) => {
    // 从路径中提取文件名：@/assets/icons/app/cursor.png -> cursor
    const fileName = path.match(/\/([^/]+)\.(png|jpg|svg)$/)?.[1];
    if (fileName) {
      icons[fileName] = module.default;
    }
  });
  return icons;
};

const LOCAL_ICONS = parseLocalIcons();

// 应用图标配置类型
export interface AppIconConfig {
  name: string; // 应用名称
  icon: string; // 图标路径（本地或 CDN）
  color: string; // 主题色
}

// 应用图标配置（优先使用本地图标，降级到 CDN）
const APP_ICON_CONFIGS: Record<string, Omit<AppIconConfig, 'name'>> = {
  // 开发工具
  Adnify: {
    icon: LOCAL_ICONS.adnify,
    color: '#7C3AED',
  },
  Cursor: {
    icon: LOCAL_ICONS.cursor,
    color: '#007ACC',
  },
  Windsurf: {
    icon: LOCAL_ICONS.windsurf,
    color: '#0078D4',
  },
  'VS Code': {
    icon: LOCAL_ICONS.vscode,
    color: '#007ACC',
  },
  PyCharm: {
    icon: LOCAL_ICONS.pycharm,
    color: '#FCF84A',
  },
  'IntelliJ IDEA': {
    icon: LOCAL_ICONS.intellij,
    color: '#fe315d',
  },
  WebStorm: {
    icon: LOCAL_ICONS.webstorm,
    color: '#00CDD7',
  },
  'Sublime Text': {
    icon: LOCAL_ICONS.sublime,
    color: '#FF9800',
  },

  // 浏览器
  Chrome: {
    icon: LOCAL_ICONS.chrome,
    color: '#4285F4',
  },
  Firefox: {
    icon: LOCAL_ICONS.firefox,
    color: '#FF7139',
  },
  Edge: {
    icon: LOCAL_ICONS.edge,
    color: '#0078D4',
  },

  // 音乐播放器
  Spotify: {
    icon: LOCAL_ICONS.spotify,
    color: '#1DB954',
  },
  网易云音乐: {
    icon: LOCAL_ICONS.netease,
    color: '#C20C0C',
  },
  QQ音乐: {
    icon: LOCAL_ICONS.qqmusic,
    color: '#31C27C',
  },
  微信: {
    icon: LOCAL_ICONS.wechat,
    color: '#09B83E',
  },

  // 默认状态
  深夜休息: {
    icon: '',
    color: '#9333EA',
  },
  早晨时光: {
    icon: '',
    color: '#F59E0B',
  },
  工作状态: {
    icon: '',
    color: '#10B981',
  },
  午间休息: {
    icon: '',
    color: '#06B6D4',
  },
  夜间时光: {
    icon: '',
    color: '#6366F1',
  },
  深夜时光: {
    icon: '',
    color: '#8B5CF6',
  },
};

/**
 * 获取应用图标配置
 */
export const getAppIconConfig = (appName: string): AppIconConfig => {
  const config = APP_ICON_CONFIGS[appName];
  if (config) {
    return {
      name: appName,
      ...config,
    };
  }

  // 默认配置
  return {
    name: appName,
    icon: '',
    color: '#666666',
  };
};

/**
 * 获取应用图标 URL
 */
export const getAppIcon = (appName: string): string => {
  return getAppIconConfig(appName).icon;
};

/**
 * 获取应用主题色
 */
export const getAppColor = (appName: string): string => {
  return getAppIconConfig(appName).color;
};

/**
 * 导出所有图标配置（用于调试）
 */
export const getAllAppIcons = (): Record<string, AppIconConfig> => {
  const result: Record<string, AppIconConfig> = {};
  Object.keys(APP_ICON_CONFIGS).forEach((appName) => {
    result[appName] = getAppIconConfig(appName);
  });
  return result;
};

/**
 * 导出本地图标映射（用于调试）
 */
export const getLocalIcons = () => LOCAL_ICONS;
