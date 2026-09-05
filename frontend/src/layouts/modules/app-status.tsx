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
  FiMessageCircle,
  FiVideo,
  FiMoon,
  FiSun,
  FiCoffee,
  FiStar,
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

// 波形动画（音乐播放中）
const wave = keyframes`
  0%, 100% { height: 3px; }
  50% { height: 10px; }
`;

// 呼吸光环（在线时）
const pulseRing = keyframes`
  0% { transform: scale(1); opacity: 0.5; }
  70%, 100% { transform: scale(2.2); opacity: 0; }
`;

// ==================== 相对时间 ====================

const getRelativeTime = (timestamp?: string): string => {
  if (!timestamp) return '';
  const then = new Date(timestamp).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} 周前`;
  const months = Math.floor(days / 30);
  return `${months} 个月前`;
};

// ==================== Styled Components ====================

// 外层容器：hover 区域同时覆盖按钮和面板，避免移动到面板时关闭
const StatusWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  z-index: 50;
  height: 32px;
  align-self: center;
`;

// 微圆角状态按钮
const StatusButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 28px;
  padding: 0 10px 0 6px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-family: inherit;
  cursor: pointer;
  transition:
    border-color 0.25s ease,
    background-color 0.25s ease,
    color 0.25s ease;

  &:hover {
    border-color: rgba(var(--accent-rgb), 0.45);
    background: rgba(var(--accent-rgb), 0.05);
  }

  &:focus-visible {
    outline: 2px solid rgba(var(--accent-rgb), 0.5);
    outline-offset: 1px;
  }
`;

// 按钮内的小图标
const ButtonIcon = styled.span<{ $color: string }>`
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${(props) => props.$color};
  font-size: 13px;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;

// 按钮文字（当前状态摘要）
const ButtonLabel = styled.span`
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1;

  @media (max-width: 640px) {
    display: none; /* 小屏只留图标 */
  }
`;

// 在线呼吸点
const StatusDot = styled.span<{ $connected: boolean }>`
  position: relative;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${(props) => (props.$connected ? 'var(--success-color)' : 'var(--warning-color)')};

  ${(props) =>
    props.$connected &&
    css`
      &::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: var(--success-color);
        animation: ${pulseRing} 2s ease-out infinite;
      }
    `}
`;

// 音乐波形指示器（替代状态点）
const MiniWaveform = styled.span`
  display: flex;
  gap: 1.5px;
  align-items: center;
  height: 10px;
  flex-shrink: 0;

  i {
    width: 2px;
    background: var(--accent-color);
    border-radius: 1px;
    animation: ${wave} 1s ease-in-out infinite;

    &:nth-of-type(1) { animation-delay: 0s; }
    &:nth-of-type(2) { animation-delay: 0.12s; }
    &:nth-of-type(3) { animation-delay: 0.24s; }
  }
`;

// ==================== Hover 面板：状态 + 历史时间线 ====================

const Panel = styled(motion.div)`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: 260px;
  padding: 6px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow:
    0 8px 30px rgba(0, 0, 0, 0.1),
    0 2px 8px rgba(0, 0, 0, 0.05);
  z-index: 100;
  text-align: left;

  [data-theme='dark'] & {
    background: rgba(24, 24, 28, 0.92);
    border-color: rgba(255, 255, 255, 0.08);
    box-shadow:
      0 8px 30px rgba(0, 0, 0, 0.4),
      0 2px 8px rgba(0, 0, 0, 0.2);
  }
`;

// 面板头部
const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px 8px;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--text-tertiary);
  text-transform: uppercase;

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-weight: 500;
    letter-spacing: 0;
    text-transform: none;
    color: ${(props: any) => (props['data-connected'] ? 'var(--success-color)' : 'var(--warning-color)')};
  }
`;

// 事件行（当前 + 历史）
const EventRow = styled.div<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 8px;
  border-radius: 8px;

  ${(props) =>
    props.$active &&
    css`
      background: rgba(var(--accent-rgb), 0.07);
    `}

  + div[class*='EventRow'],
  + * {
    margin-top: 1px;
  }

  .event-icon {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 12px;

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }

  .event-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .event-title {
    font-size: 0.78rem;
    font-weight: ${(props) => (props.$active ? 600 : 500)};
    color: ${(props) => (props.$active ? 'var(--text-primary)' : 'var(--text-secondary)')};
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .event-time {
    font-size: 0.66rem;
    color: var(--text-tertiary);
    line-height: 1.25;
  }
`;

// 空状态
const EmptyRow = styled.div`
  padding: 12px 8px;
  text-align: center;
  font-size: 0.72rem;
  color: var(--text-tertiary);
`;

// ==================== 逻辑 ====================

// 获取默认状态
const getDefaultStatus = (): StatusData => {
  const now = new Date();
  const hour = now.getHours();
  let appName = '深夜休息';
  let icon = 'rest';
  let info = '夜深了，梦中编织着明天的代码~';
  let action = '休息中';

  if (hour >= 6 && hour < 8) {
    appName = '早晨时光';
    icon = 'morning';
    info = '晨光微熹，新的一天即将开启~';
    action = '准备中';
  } else if (hour >= 8 && hour < 12) {
    appName = '工作状态';
    icon = 'work';
    info = '上午工作时光，专注创造价值~';
    action = '工作中';
  } else if (hour >= 12 && hour < 13) {
    appName = '午间休息';
    icon = 'lunch';
    info = '享受午餐，为下午储备能量~';
    action = '午休中';
  } else if (hour >= 13 && hour < 18) {
    appName = '工作状态';
    icon = 'work';
    info = '下午时光，让代码如诗般优雅~';
    action = '工作中';
  } else if (hour >= 18 && hour < 22) {
    appName = '夜间时光';
    icon = 'evening';
    info = '夜幕降临，是学习充电还是放松娱乐？';
    action = '自由时间';
  } else if (hour >= 22) {
    appName = '深夜时光';
    icon = 'late';
    info = '夜深了，要不要早点休息呀？';
    action = '夜猫子';
  }

  return {
    appName,
    appIcon: icon,
    appType: 'app',
    displayInfo: info,
    action,
    timestamp: new Date().toISOString(),
    computer_name: 'Adnify',
  };
};

// 最大历史条数（不含当前状态）
const MAX_HISTORY = 5;

// 主组件
const AppStatus: React.FC = () => {
  const { status, isConnected } = useStatus();
  const [isHovered, setIsHovered] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const statusData = status || { current: null, history: [] };

  const handleImageError = useCallback((appName: string) => {
    setImageErrors((prev) => new Set(prev).add(appName));
  }, []);

  // 当前状态
  const currentApp = useMemo(() => {
    const current = statusData.current || getDefaultStatus();
    return {
      ...current,
      color: getAppColor(current.appName),
      imageUrl: getAppIcon(current.appName),
      fallbackIcon: FALLBACK_ICONS[current.appName] || FALLBACK_ICONS.default,
      hasImageError: imageErrors.has(current.appName),
    };
  }, [statusData.current, imageErrors]);

  // 历史事件（去重、过滤当前应用，最多 MAX_HISTORY 条）
  const historyApps = useMemo(() => {
    const seen = new Set([currentApp.appName]);
    const items: Array<{
      appName: string;
      color: string;
      imageUrl?: string;
      fallbackIcon: React.ReactNode;
      hasImageError: boolean;
      time: string;
      label: string;
    }> = [];

    for (const app of statusData.history) {
      if (seen.has(app.appName)) continue;
      seen.add(app.appName);

      items.push({
        appName: app.appName,
        color: getAppColor(app.appName),
        imageUrl: getAppIcon(app.appName),
        fallbackIcon: FALLBACK_ICONS[app.appName] || FALLBACK_ICONS.default,
        hasImageError: imageErrors.has(app.appName),
        time: getRelativeTime(app.timestamp),
        label: app.action || app.displayInfo || app.appName,
      });

      if (items.length >= MAX_HISTORY) break;
    }
    return items;
  }, [statusData.history, currentApp.appName, imageErrors]);

  // 按钮摘要文案：音乐显示歌名，其余显示「动作 · 应用」
  const buttonLabel = useMemo(() => {
    if (currentApp.appType === 'music' && currentApp.active_app) {
      const parts = currentApp.active_app.split(' - ');
      return parts[1] || currentApp.active_app;
    }
    return currentApp.action || currentApp.appName;
  }, [currentApp]);

  const isMusicPlaying = currentApp.appType === 'music';

  const renderAppIcon = (app: {
    appName: string;
    color: string;
    imageUrl?: string;
    fallbackIcon: React.ReactNode;
    hasImageError: boolean;
  }) =>
    !app.hasImageError && app.imageUrl ? (
      <img src={app.imageUrl} alt={app.appName} onError={() => handleImageError(app.appName)} />
    ) : (
      app.fallbackIcon
    );

  return (
    <StatusWrapper
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <StatusButton aria-label="当前状态与历史记录">
        <ButtonIcon $color={currentApp.color}>{renderAppIcon(currentApp)}</ButtonIcon>
        <ButtonLabel>{buttonLabel}</ButtonLabel>
        {isMusicPlaying ? (
          <MiniWaveform>
            <i />
            <i />
            <i />
          </MiniWaveform>
        ) : (
          <StatusDot $connected={isConnected} />
        )}
      </StatusButton>

      <AnimatePresence>
        {isHovered && (
          <Panel
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <PanelHeader data-connected={isConnected}>
              <span>实时状态</span>
              <span className="badge">
                <StatusDot $connected={isConnected} />
                {isConnected ? '在线' : '离线'}
              </span>
            </PanelHeader>

            {/* 当前状态 */}
            <EventRow $active>
              <div
                className="event-icon"
                style={{ background: `${currentApp.color}1a`, color: currentApp.color }}
              >
                {renderAppIcon(currentApp)}
              </div>
              <div className="event-body">
                <span className="event-title">{currentApp.appName}</span>
                <span className="event-time">{currentApp.displayInfo || currentApp.action}</span>
              </div>
              <span
                className="event-time"
                style={{ fontSize: '0.66rem', color: 'var(--accent-color)', flexShrink: 0 }}
              >
                现在
              </span>
            </EventRow>

            {/* 历史事件 */}
            {historyApps.length > 0 ? (
              historyApps.map((app) => (
                <EventRow key={app.appName}>
                  <div
                    className="event-icon"
                    style={{ background: `${app.color}1a`, color: app.color }}
                  >
                    {renderAppIcon(app)}
                  </div>
                  <div className="event-body">
                    <span className="event-title">{app.appName}</span>
                    <span className="event-time">{app.label}</span>
                  </div>
                  {app.time && (
                    <span className="event-time" style={{ flexShrink: 0 }}>
                      {app.time}
                    </span>
                  )}
                </EventRow>
              ))
            ) : (
              <EmptyRow>暂无历史记录</EmptyRow>
            )}
          </Panel>
        )}
      </AnimatePresence>
    </StatusWrapper>
  );
};

export default React.memo(AppStatus);
