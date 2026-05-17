import React, { useState, useCallback, useMemo } from 'react';
import styled from '@emotion/styled';
import { keyframes, css } from '@emotion/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStatus } from '@/hooks/useSocket';
import type { StatusData } from '@/types';
import {
  FiChrome,
  FiCode,
  FiMusic,
  FiMonitor,
  FiImage,
  FiZap,
  FiMessageCircle,
  FiVideo,
  FiMoon,
  FiSun,
  FiCoffee,
  FiStar,
  FiActivity,
} from 'react-icons/fi';
import { getAppIcon, getAppColor } from '@/utils/ui/icons';

// 备用图标
const FALLBACK_ICONS: Record<string, React.ReactNode> = {
  Adnify: <FiCode />,
  Cursor: <FiCode />,
  Windsurf: <FiCode />,
  'VS Code': <FiCode />,
  PyCharm: <FiCode />,
  'IntelliJ IDEA': <FiCode />,
  WebStorm: <FiCode />,
  'Sublime Text': <FiCode />,
  Chrome: <FiChrome />,
  Firefox: <FiChrome />,
  Edge: <FiChrome />,
  Spotify: <FiMusic />,
  Discord: <FiMessageCircle />,
  网易云音乐: <FiMusic />,
  QQ音乐: <FiMusic />,
  PotPlayer: <FiVideo />,
  VLC: <FiVideo />,
  微信: <FiMessageCircle />,
  深夜休息: <FiMoon />,
  早晨时光: <FiCoffee />,
  工作状态: <FiCode />,
  午间休息: <FiSun />,
  夜间时光: <FiMoon />,
  深夜时光: <FiStar />,
  default: <FiMonitor />,
};


// 波形动画
const wave = keyframes`
  0%, 100% { height: 3px; }
  50% { height: 10px; }
`;

const StatusContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px; /* 紧凑间距 */
  z-index: 50;
  height: 32px; /* 固定高度 */
`;

const AppIconWrapper = styled(motion.div)<{ $color: string; $isActive?: boolean }>`
  position: relative;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: ${(props) => (props.$isActive ? `${props.$color}25` : 'var(--bg-secondary)')};
  border: 1px solid ${(props) => (props.$isActive ? `${props.$color}40` : 'transparent')};
  color: ${(props) => props.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
  /* 非活跃图标半透明 */
  opacity: ${(props) => (props.$isActive ? 1 : 0.5)};
  transition: all 0.2s ease;

  /* 悬停效果 */
  &:hover {
    transform: translateY(-2px);
    opacity: 1;
    background: ${(props) => props.$color}30;
    box-shadow: 0 4px 12px ${(props) => props.$color}25;
    border-color: ${(props) => props.$color};
    z-index: 10;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    padding: 5px;
    border-radius: 8px;
  }
`;

// 极简的状态点
const StatusDot = styled.div<{ $connected: boolean }>`
  position: absolute;
  top: -2px;
  right: -2px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${(props) => (props.$connected ? 'var(--success-color)' : 'var(--warning-color)')};
  border: 1px solid var(--bg-primary);
  box-shadow: 0 0 0 1px var(--bg-primary);
`;

// 音乐波形指示器
const MiniWaveform = styled.div`
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 1px;
  align-items: flex-end;
  height: 10px;

  div {
    width: 2px;
    background: var(--accent-color);
    border-radius: 1px;
    animation: ${wave} 1s ease-in-out infinite;

    &:nth-of-type(1) {
      animation-delay: 0s;
    }
    &:nth-of-type(2) {
      animation-delay: 0.1s;
    }
    &:nth-of-type(3) {
      animation-delay: 0.2s;
    }
  }
`;

const Tooltip = styled(motion.div)`
  position: absolute;
  top: 100%;
  left: 50%;
  /* 移除 CSS transform，改用 style={{ x: '-50%' }} 以兼容 Framer Motion */
  /* transform: translateX(-50%); */
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  padding: 8px 12px;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.05);
  /* 允许换行，防止太宽 */
  white-space: normal;
  max-width: 260px;
  min-width: 120px;
  z-index: 100;
  margin-top: 10px;
  pointer-events: none;
  text-align: center;

  [data-theme='dark'] & {
    background: rgba(30, 30, 30, 0.9);
    border-color: rgba(255, 255, 255, 0.1);
  }

  /* 小三角 */
  &::before {
    content: '';
    position: absolute;
    top: -4px;
    left: 50%;
    transform: translateX(-50%) rotate(45deg);
    width: 8px;
    height: 8px;
    background: inherit;
    border-left: 1px solid rgba(0, 0, 0, 0.05);
    border-top: 1px solid rgba(0, 0, 0, 0.05);

    [data-theme='dark'] & {
      border-color: rgba(255, 255, 255, 0.1);
    }
  }
`;

const TooltipTitle = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
`;

const TooltipDesc = styled.div`
  font-size: 0.7rem;
  color: var(--text-secondary);
  opacity: 0.8;
`;

// 获取默认状态
const getDefaultStatus = (): StatusData => {
  const now = new Date();
  const hour = now.getHours();
  let appName = '深夜休息';
  let icon = 'rest';
  let info = '夜深了，梦中编织着明天的代码~ 😴';
  let action = '休息中';

  if (hour >= 6 && hour < 8) {
    appName = '早晨时光';
    icon = 'morning';
    info = '晨光微熹，新的一天即将开启~ ☕';
    action = '准备中';
  } else if (hour >= 8 && hour < 12) {
    appName = '工作状态';
    icon = 'work';
    info = '上午工作时光，专注创造价值~ 💻';
    action = '工作中';
  } else if (hour >= 12 && hour < 13) {
    appName = '午间休息';
    icon = 'lunch';
    info = '享受午餐，为下午储备能量~ 🍱';
    action = '午休中';
  } else if (hour >= 13 && hour < 18) {
    appName = '工作状态';
    icon = 'work';
    info = '下午时光，让代码如诗般优雅~ ⌨️';
    action = '工作中';
  } else if (hour >= 18 && hour < 22) {
    appName = '夜间时光';
    icon = 'evening';
    info = '夜幕降临，是学习充电还是放松娱乐？🌙';
    action = '自由时间';
  } else if (hour >= 22) {
    appName = '深夜时光';
    icon = 'late';
    info = '夜深了，要不要早点休息呀？✨';
    action = '夜猫子';
  }

  return {
    appName,
    appIcon: icon,
    appType: 'app',
    displayInfo: info,
    action,
    timestamp: new Date().toISOString(),
    computer_name: 'Default',
  };
};

// 最大显示应用数量
const MAX_DISPLAY_APPS = 3;

// 主组件
const AppStatus: React.FC = () => {
  const { status, isConnected } = useStatus();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const statusData = status || { current: null, history: [] };

  const handleImageError = useCallback((appName: string) => {
    setImageErrors((prev) => new Set(prev).add(appName));
  }, []);

  // 构建显示数据（去重：只显示不同的应用）
  const displayApps = useMemo(() => {
    // 如果没有实时数据，使用默认状态
    const currentStatus = statusData.current || getDefaultStatus();

    // 合并当前状态和历史记录
    const allApps = [currentStatus, ...statusData.history];

    // 去重：只保留应用名称不同的记录
    const uniqueApps: StatusData[] = [];
    const seenApps = new Set<string>();

    for (const app of allApps) {
      if (!seenApps.has(app.appName)) {
        seenApps.add(app.appName);
        uniqueApps.push(app);
        // 最多显示 MAX_DISPLAY_APPS 个不同的应用
        if (uniqueApps.length >= MAX_DISPLAY_APPS) break;
      }
    }

    // 映射为显示数据
    return uniqueApps.map((app, index) => ({
      ...app,
      isActive: index === 0, // 第一个是活跃应用
      color: getAppColor(app.appName),
      imageUrl: getAppIcon(app.appName),
      fallbackIcon: FALLBACK_ICONS[app.appName] || FALLBACK_ICONS.default,
      hasImageError: imageErrors.has(app.appName),
    }));
  }, [statusData, imageErrors]);

  // 获取 Tooltip 内容
  const getTooltipContent = (app: any) => {
    if (app.appType === 'music' && app.active_app) {
      const parts = app.active_app.split(' - ');
      return {
        title: parts[1] || 'Listening',
        desc: parts.length > 2 ? parts.slice(2).join(' - ') : app.displayInfo,
      };
    }
    return {
      title: app.appName,
      desc: app.displayInfo || app.action,
    };
  };

  return (
    <StatusContainer>
      <AnimatePresence mode="popLayout">
        {displayApps.map((app, index) => {
          const tooltipData = getTooltipContent(app);
          const isMusicPlaying = app.isActive && app.appType === 'music';

          return (
            <AppIconWrapper
              key={`${app.appName}`}
              $color={app.color}
              $isActive={app.isActive}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              layout // 自动布局动画
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: app.isActive ? 1 : 0.5, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              {!app.hasImageError && app.imageUrl ? (
                <img src={app.imageUrl} alt={app.appName} onError={() => handleImageError(app.appName)} />
              ) : (
                app.fallbackIcon
              )}

              {/* 在线状态指示器 (仅第一个) */}
              {app.isActive && <StatusDot $connected={isConnected} />}

              {/* 音乐波形 (仅活跃且为音乐时) */}
              {isMusicPlaying && (
                <MiniWaveform>
                  <div />
                  <div />
                  <div />
                </MiniWaveform>
              )}

              {/* 悬停提示 */}
              <AnimatePresence>
                {hoveredIndex === index && (
                  <Tooltip
                    style={{ x: '-50%' }} // 使用 Motion style 进行居中
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                  >
                    <TooltipTitle>{tooltipData.title}</TooltipTitle>
                    <TooltipDesc>{tooltipData.desc}</TooltipDesc>
                  </Tooltip>
                )}
              </AnimatePresence>
            </AppIconWrapper>
          );
        })}
      </AnimatePresence>
    </StatusContainer>
  );
};

export default React.memo(AppStatus);
