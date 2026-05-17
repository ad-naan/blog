import React, { useState, useEffect, useCallback } from 'react';
import styled from '@emotion/styled';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnimationEngine, SPRING_PRESETS } from '@/utils/ui/animation';
import { SEO } from '@/components/common';
import { Button, Input } from 'adnaan-ui';
import { PAGE_SEO_CONFIG } from '@/config/seo.config';

import {
  FiEdit,
  FiHeart,
  FiMessageSquare,
  FiTrendingUp,
  FiUsers,
  FiBookmark,
  FiActivity,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiFileText,
  FiFolder,
  FiGithub,
  FiExternalLink,
  FiCalendar,
  FiStar,
  FiEye,
  FiThumbsUp,
  FiMessageCircle,
  FiBarChart2,
  FiTrendingDown,
  FiCode,
  FiTag,
  FiEdit3,
  FiTrash2,
  FiLayers,
  FiSettings,
  FiShield,
  FiLogOut,
  FiCheck,
  FiHome,
  FiX,
  FiMusic,
  FiPlay,
} from 'react-icons/fi';

import { useNavigate } from 'react-router-dom';
import { API } from '@/utils/api';
import type { UserProfile, UserStats, UserActivity, UserAchievement, SiteSettings, Project } from '@/types';
import { storage } from '@/utils';
import { useModalScrollLock } from '@/hooks';
import {
  EditProfileModal,
  CommonPage,
  ProfileHero,
  SecuritySettings,
  SiteSettingsManagement,
  MobileProfileHeader,
  AddMusicModal,
} from './modules';
import type { EditProfileForm } from './modules/types';
import { useUserRole } from '@/hooks/useUserRole';
import { useAppDispatch } from '@/store';
import { updateUser } from '@/store/modules/userSlice';

// 动作到 Tab ID 的映射
const ACTION_TO_TAB_MAP: Record<string, string> = {
  'view-articles': 'articles',
  'view-notes': 'notes',
  'view-comments': 'comments',
  'view-guestbook': 'guestbook',
  'view-friends': 'friends',
  'view-users': 'users',
  'view-tags': 'tags',
  'view-categories': 'categories',
  'view-projects': 'projects',
  'edit-site-settings': 'site-settings',
  'view-security': 'security',
};

// 获取快捷操作图标
const getQuickActionIcon = (actionId: string, defaultIcon: string) => {
  switch (actionId) {
    case 'view-likes': return <FiHeart />;
    case 'view-note-likes': return <FiHeart />;
    case 'view-bookmarks': return <FiBookmark />;
    case 'view-articles': return <FiFileText />;
    case 'view-notes': return <FiEdit />;
    case 'view-comments': return <FiMessageSquare />;
    case 'view-users': return <FiUsers />;
    case 'view-tags': return <FiTag />;
    case 'view-categories': return <FiFolder />;
    case 'view-projects': return <FiLayers />;
    case 'view-guestbook': return <FiMessageCircle />;
    case 'view-friends': return <FiUsers />;
    case 'edit-site-settings': return <FiSettings />;
    case 'view-security': return <FiShield />;
    case 'logout': return <FiLogOut />;
    default: return <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{defaultIcon}</span>;
  }
};

// ==================== 样式组件 ====================

const ProfileWrapper = styled.div`
  min-height: 100vh;
  width: 100%;
  position: relative;
`;

const LayoutContainer = styled.div`
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 2.5rem;
  max-width: 1800px;
  margin: 0 auto;
  padding: 2rem;
  padding-bottom: 8rem;
  min-height: 100vh;
  position: relative;
  z-index: 1;

  @media (max-width: 1200px) {
    grid-template-columns: 280px 1fr;
    gap: 1.5rem;
  }

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    padding: 1rem;
    padding-bottom: 7rem;
  }
`;

const IdentityColumn = styled.div`
  position: sticky;
  top: 2rem;
  height: fit-content;
  max-height: calc(100vh - 4rem);
  z-index: 10;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  @media (max-width: 1024px) {
    display: none;
  }
`;

const MusicCard = styled(motion.div)`
  background: rgba(var(--bg-primary-rgb), 0.6);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(var(--border-rgb), 0.1);
  overflow: hidden;
  box-shadow: 0 8px 24px -8px rgba(0, 0, 0, 0.15);
`;

const MusicCardHeader = styled.div`
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(var(--border-rgb), 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const UnifiedIdentityCard = styled(motion.div)`
  position: relative;
  background: rgba(var(--bg-primary-rgb), 0.6);
  backdrop-filter: blur(20px);
  border-radius: 32px;
  border: 1px solid rgba(var(--border-rgb), 0.1);
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.2);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 200px;
    background: linear-gradient(180deg, rgba(var(--accent-rgb), 0.08) 0%, transparent 100%);
    z-index: 0;
    pointer-events: none;
  }
`;

const StageArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-width: 0;
`;

const ControlDock = styled(motion.div)`
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%) !important;
  background: rgba(var(--bg-secondary-rgb), 0.4);
  backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0.75rem;
  border-radius: 24px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  box-shadow:
    0 20px 40px -10px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  z-index: 1000;
  width: auto;
  max-width: 90vw;

  &::after {
    content: '';
    position: absolute;
    bottom: -15px;
    left: 15%;
    width: 70%;
    height: 15px;
    background: var(--accent-color);
    filter: blur(30px);
    opacity: 0.15;
    border-radius: 50%;
    z-index: -1;
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

const DockSeparator = styled.div`
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 0.25rem;
`;

const DockItem = styled(motion.button) <{ active?: boolean }>`
  position: relative;
  width: 52px;
  height: 52px;
  border-radius: 16px;
  border: none;
  background: ${(props) => (props.active ? 'rgba(var(--accent-rgb), 0.15)' : 'rgba(255, 255, 255, 0.03)')};
  color: ${(props) => (props.active ? 'var(--accent-color)' : 'var(--text-secondary)')};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  flex-shrink: 0;

  &::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%) translateY(-8px);
    padding: 0.4rem 0.8rem;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    font-size: 0.75rem;
    border-radius: 8px;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: all 0.2s ease;
    margin-bottom: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(4px);
  }

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-primary);
    transform: translateY(-8px) scale(1.15);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
    z-index: 10;
    text-shadow: 0 0 15px var(--accent-color);

    &::after {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  &:active {
    transform: scale(0.95);
  }
`;

const TabContent = styled.div`
  width: 100%;
  min-width: 0;
  min-height: calc(100vh - 300px);
  display: flex;
  flex-direction: column;
`;

const BottomSheet = styled(motion.div)`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-primary);
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  padding: 1.5rem;
  max-height: 80vh;
  overflow-y: auto;

  &::before {
    content: '';
    position: absolute;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    width: 40px;
    height: 4px;
    background: var(--border-color);
    border-radius: 2px;
    opacity: 0.5;
  }
`;

const BottomSheetGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem 1rem;
  margin-top: 1.5rem;
`;

const BottomSheetItem = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;

  .icon-wrapper {
    width: 56px;
    height: 56px;
    border-radius: 20px;
    background: var(--bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    color: var(--text-secondary);
    transition: all 0.2s ease;
  }

  span {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  &:active {
    transform: scale(0.95);
    .icon-wrapper {
      background: var(--bg-tertiary);
    }
  }
`;

const DrawerOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
`;

const DashboardLayout = styled(motion.div)`
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 1.5rem;
  width: 100%;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const MainColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-width: 0;
`;

const SideColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-width: 0;
`;

const GroupedCard = styled(motion.div)`
  background: rgba(var(--bg-secondary-rgb), 0.4);
  backdrop-filter: blur(24px);
  border-radius: 24px;
  border: 1px solid rgba(var(--border-rgb), 0.1);
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.5), transparent);
    opacity: 0.6;
  }
`;

const GroupHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const GroupTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: var(--accent-color);
  }
`;

const DataOverviewGrid = styled.div`
  display: grid;
  grid-template-columns: 280px 1fr 300px;
  gap: 2rem;
  align-items: stretch;

  @media (max-width: 1400px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const MetricBox = styled.div`
  background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.05) 0%, rgba(var(--accent-rgb), 0.01) 100%);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    right: -10px;
    bottom: -10px;
    width: 100px;
    height: 100px;
    background: radial-gradient(circle, rgba(var(--accent-rgb), 0.1) 0%, transparent 70%);
    border-radius: 50%;
    pointer-events: none;
  }
`;

const MetricLabel = styled.div`
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
`;

const MetricValue = styled.div`
  font-size: 2rem;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
  letter-spacing: -0.02em;
  font-family: var(--font-code);
`;

const MetricTrend = styled.div<{ isPositive: boolean }>`
  font-size: 0.8rem;
  color: ${(props) => (props.isPositive ? '#10b981' : '#ef4444')};
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
`;

const BarChartContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 180px;
  padding-top: 1rem;
`;

const BarChartTitle = styled.div`
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
`;

const BarsRow = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 100%;
  gap: 12px;
`;

const BarColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
  height: 100%;
  justify-content: flex-end;
`;

const Bar = styled(motion.div) <{ height: number; color?: string }>`
  width: 100%;
  max-width: 24px;
  height: ${(props) => props.height}%;
  background: ${(props) => props.color || 'var(--accent-color)'};
  border-radius: 6px 6px 0 0;
  opacity: 0.8;
  position: relative;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
`;

const BarLabel = styled.span`
  font-size: 0.75rem;
  color: var(--text-tertiary);
`;

const DonutChartContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  height: 180px;
`;

const DonutLegend = styled.div`
  margin-left: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const LegendItem = styled.div<{ color: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: var(--text-secondary);

  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 2px;
    background: ${(props) => props.color};
  }
`;

const SideListCard = styled(GroupedCard)`
  padding: 0;
  display: flex;
  flex-direction: column;
  height: fit-content;
`;

const SideListHeader = styled.div`
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(var(--border-rgb), 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SideListItem = styled(motion.div)`
  padding: 1rem 1.5rem;
  padding-left: 2.5rem;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  border-bottom: 1px solid rgba(var(--border-rgb), 0.05);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 2.25rem;
    top: 3.5rem;
    bottom: -1rem;
    width: 2px;
    background: rgba(var(--border-rgb), 0.15);
  }

  &:last-child {
    border-bottom: none;
    &::before {
      display: none;
    }
  }

  &:hover {
    background: rgba(var(--bg-secondary-rgb), 0.5);
    transform: translateX(4px);
  }
`;

const ItemAvatar = styled.div<{ src?: string; iconColor?: string; iconBg?: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${(props) =>
    props.src ? `url(${props.src}) center/cover` : props.iconBg || 'rgba(var(--accent-rgb), 0.1)'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${(props) => props.iconColor || 'var(--accent-color)'};
  flex-shrink: 0;
  font-size: 1.1rem;
  border: 2px solid var(--bg-secondary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  z-index: 2;
  position: relative;
`;

const ItemInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ItemDesc = styled.div`
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;

  .highlight {
    color: var(--accent-color);
    font-weight: 600;
  }

  .action {
    color: var(--text-secondary);
    font-weight: 400;
  }
`;

const ItemTime = styled.span`
  font-size: 0.75rem;
  color: var(--text-tertiary);
  white-space: nowrap;
`;

const ProjectRow = styled(motion.div)`
  display: grid;
  grid-template-columns: 2fr 100px 120px 100px 1fr;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid rgba(var(--border-rgb), 0.05);

  &:last-child {
    border-bottom: none;
  }

  @media (max-width: 768px) {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
`;

const ProjectName = styled.div`
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StatusTag = styled.span<{ status: string }>`
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;

  ${(props) => {
    switch (props.status) {
      case 'active': return 'background: rgba(16, 185, 129, 0.1); color: #10b981;';
      case 'pending': return 'background: rgba(245, 158, 11, 0.1); color: #f59e0b;';
      default: return 'background: rgba(107, 114, 128, 0.1); color: #6b7280;';
    }
  }}
`;

const MusicList = styled.div`
  display: flex;
  flex-direction: column;
  max-height: 220px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(var(--text-secondary-rgb), 0.15);
    border-radius: 2px;
  }
`;

const MusicItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 1rem;
  border-bottom: 1px solid rgba(var(--border-rgb), 0.05);
  transition: all 0.2s;
  cursor: pointer;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: rgba(var(--accent-rgb), 0.05);
  }
`;

const MusicCover = styled.div<{ src: string }>`
  width: 36px;
  height: 36px;
  border-radius: 6px;
  background: url(${(props) => props.src}) center/cover;
  flex-shrink: 0;
`;

const MusicInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const MusicTitle = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const MusicArtist = styled.div`
  font-size: 0.75rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ContentGlassCard = styled(motion.div)`
  background: rgba(var(--bg-secondary-rgb), 0.4);
  backdrop-filter: blur(24px);
  border-radius: 24px;
  border: 1px solid rgba(var(--border-rgb), 0.1);
  padding: 2rem;
  min-height: 600px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(var(--accent-rgb), 0.5),
      var(--accent-color),
      rgba(var(--accent-rgb), 0.5),
      transparent
    );
    opacity: 0.6;
  }

  h1, h2, h3 { color: var(--text-primary); }
  p, span { color: var(--text-secondary); }

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb {
    background: rgba(var(--accent-rgb), 0.2);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover { background: rgba(var(--accent-rgb), 0.4); }
`;

interface TodoItemType {
  id: string;
  content: string;
  time: string;
  priority: 'high' | 'medium' | 'low';
  link?: string;
  action?: string;
  count?: number;
  type?: string;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const syncGlobalUser = useCallback(
    (profile: UserProfile) => {
      dispatch(
        updateUser({
          id: profile.id,
          username: profile.username,
          email: profile.email,
          avatar: profile.avatar,
          role: profile.role,
          status: profile.status,
          fullName: profile.fullName,
          bio: profile.bio,
          joinDate: profile.joinDate,
          lastLoginTime: profile.lastLoginTime,
        }),
      );
    },
    [dispatch],
  );

  const withCacheBust = useCallback((url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}_=${Date.now()}`;
  }, []);

  const { variants } = useAnimationEngine();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [publishTrend, setPublishTrend] = useState<{ date: string; count: number }[]>([]);
  const [todoItems, setTodoItems] = useState<TodoItemType[]>([]);
  const [commentStatusFilter, setCommentStatusFilter] = useState<string | undefined>(undefined);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [userMusicList, setUserMusicList] = useState<any[]>([]);
  const [isMusicLoading, setIsMusicLoading] = useState(false);
  const [isAddMusicModalOpen, setIsAddMusicModalOpen] = useState(false);
  const [categoryStats, setCategoryStats] = useState<{ name: string; value: number; color: string }[]>([]);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUserLoading, setIsUserLoading] = useState(false);
  const [isSiteSettingsLoading, setIsSiteSettingsLoading] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);

  const { isAdmin, permissions } = useUserRole(user);

  const [activeTab, setActiveTab] = useState(() => {
    const savedActiveTab = storage.local.get<string>('profile_active_tab');
    return savedActiveTab || 'dashboard';
  });

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setRightDrawerOpen(false);
  }, [activeTab]);

  useModalScrollLock(isEditModalOpen || rightDrawerOpen);

  useEffect(() => {
    storage.local.set('profile_active_tab', activeTab);
  }, [activeTab]);

  const loadUserMusic = useCallback(async () => {
    setIsMusicLoading(true);
    try {
      const response = await API.userMusic.getMyMusic();
      if (response.success) {
        setUserMusicList(response.data || []);
      }
    } catch (error) {
      console.error('加载用户音乐失败:', error);
    } finally {
      setIsMusicLoading(false);
    }
  }, []);

  const handleDeleteMusic = useCallback(async (musicId: number, title: string) => {
    const confirmed = await adnaan.confirm.delete(`确定要删除“${title}”吗？`, '删除音乐');
    if (!confirmed) return;

    try {
      await API.userMusic.deleteMusic(musicId);
      adnaan.toast.success('删除成功');
      setUserMusicList((prev) => prev.filter((item) => item.id !== musicId));
    } catch (error: any) {
      adnaan.toast.error(error.message || '删除失败');
    }
  }, []);


  const loadDashboard = useCallback(async () => {
    setIsUserLoading(true);
    try {
      const response = await API.user.getDashboard();
      const data: any = response.data;

      if (data.user) {
        setUser(data.user);
        syncGlobalUser(data.user);
      }

      const statsArray = (data.stats || []) as UserStats[];
      setUserStats(statsArray.map((stat: UserStats) => ({
        ...stat,
        icon: getStatIcon(stat.label),
      })));

      setPublishTrend((data.publishTrend || []).map((item: any) => ({
        date: item.month,
        count: item.value,
      })));

      setActivities((data.activities || []).map((activity: any) => {
        const config = getActivityConfig(activity.type);
        return {
          ...activity,
          content: stripHtml(activity.description) || activity.title,
          createdAt: activity.timestamp,
          icon: config.icon,
          iconColor: config.color,
          iconBg: config.bg,
        };
      }));

      setAchievements((data.achievements || []) as any);

      const rawCategoryStats = (data.categoryStats || []) as Array<{ name: string; value: number }>;
      const sorted = [...rawCategoryStats].sort((a, b) => b.value - a.value);
      const top = sorted.slice(0, 4);
      const colors = ['var(--accent-color)', '#10b981', '#f59e0b', '#6366f1', 'rgba(var(--border-rgb), 0.3)'];
      const coloredTop = top.map((item, index) => ({
        name: item.name,
        value: item.value,
        color: colors[index % colors.length],
      }));
      const totalCount = rawCategoryStats.reduce((sum, item) => sum + item.value, 0);
      const topCount = top.reduce((sum, item) => sum + item.value, 0);
      if (totalCount > topCount) {
        coloredTop.push({ name: '其他', value: totalCount - topCount, color: colors[4] });
      }
      setCategoryStats(coloredTop);

      setRecentProjects((data.recentProjects || []) as Project[]);

      const todoSource = (data.todoItems || []) as any[];
      setTodoItems(todoSource.map((item) => ({
        id: item.id,
        content: item.title,
        count: item.count,
        type: item.type,
        priority: item.priority || 'medium',
        action: item.action,
        time: '',
      })));

      loadUserMusic();
    } catch (error: any) {
      console.error('加载仪表盘数据失败:', error);
    } finally {
      setIsUserLoading(false);
    }
  }, [syncGlobalUser, loadUserMusic]);

  const handleTodoClick = (item: TodoItemType) => {
    if (item.action === 'view-pending-comments') {
      setCommentStatusFilter('pending');
      setActiveTab('comments');
      return;
    }
    if (item.action === 'view-draft-posts') {
      setActiveTab('articles');
      return;
    }
    if (item.link) navigate(item.link);
  };

  const getStatIcon = (label: string) => {
    switch (label) {
      case '发布文章': return <FiFileText />;
      case '总阅读量': return <FiEye />;
      case '获得点赞': return <FiHeart />;
      case '评论回复': return <FiMessageSquare />;
      case '关注者': return <FiUsers />;
      case '收藏数': return <FiBookmark />;
      default: return <FiEdit />;
    }
  };

  const getActivityConfig = (type: string) => {
    switch (type) {
      case 'comment_created': return { icon: <FiMessageSquare />, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' };
      case 'note_created': return { icon: <FiEdit3 />, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
      case 'post_created': return { icon: <FiFileText />, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' };
      default: return { icon: <FiActivity />, color: 'var(--accent-color)', bg: 'var(--accent-color-alpha)' };
    }
  };

  const stripHtml = (html?: string) => {
    if (!html) return '';
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const formatActivityTitle = (activity: any) => {
    const { type, title, metadata } = activity;
    switch (type) {
      case 'comment_created':
        return <>在文章 <span className="highlight">《{metadata?.postTitle || title}》</span> <span className="action">发表了评论</span></>;
      case 'note_created': return <>发布了手记 <span className="highlight">《{title}》</span></>;
      case 'post_created': return <>发布了文章 <span className="highlight">《{title}》</span></>;
      default: return activity.content || title;
    }
  };

  const loadSiteSettings = async () => {
    try {
      const response = await API.siteSettings.getSiteSettings();
      setSiteSettings(response.data);
    } catch (error) { }
  };

  useEffect(() => {
    loadDashboard();
    loadSiteSettings();
  }, [loadDashboard]);

  const handleSaveProfile = async (formData: EditProfileForm, avatarFile?: File) => {
    if (!user) return;
    setIsUserLoading(true);
    try {
      let avatarUrl = user.avatar;
      if (avatarFile) {
        const avatarResponse = await API.user.uploadAvatar(avatarFile);
        avatarUrl = withCacheBust(avatarResponse.data.data.url);
      }
      const response = await API.user.updateProfile({ fullName: formData.fullName, email: formData.email, bio: formData.bio });
      const updatedUser: UserProfile = { ...user, ...response.data, avatar: avatarUrl };
      setUser(updatedUser);
      syncGlobalUser(updatedUser);
      setIsEditModalOpen(false);
    } catch (error: any) { } finally { setIsUserLoading(false); }
  };

  const handleAvatarChange = async (file: File) => {
    if (!user) return;
    setIsUserLoading(true);
    try {
      const response = await API.user.uploadAvatar(file);
      const updatedUser: UserProfile = { ...user, avatar: withCacheBust(response.data.data.url) };
      setUser(updatedUser);
      syncGlobalUser(updatedUser);
    } catch (error: any) { } finally { setIsUserLoading(false); }
  };

  const handleQuickAction = (actionId: string) => {
    switch (actionId) {
      case 'view-notes': setActiveTab('notes'); break;
      case 'view-articles': setActiveTab('articles'); break;
      case 'view-comments': setActiveTab('comments'); break;
      case 'view-likes': setActiveTab('likes'); break;
      case 'view-bookmarks': setActiveTab('bookmarks'); break;
      case 'view-security': setActiveTab('security'); break;
      case 'logout':
        if (window.confirm('确定要退出登录吗？')) {
          API.user.logout().then(() => navigate('/')).catch(() => navigate('/'));
        }
        break;
      default:
        if (isAdmin) {
          if (actionId === 'view-guestbook') setActiveTab('guestbook');
          else if (actionId === 'view-friends') setActiveTab('friends');
          else if (actionId === 'view-users') setActiveTab('users');
          else if (actionId === 'view-categories') setActiveTab('categories');
          else if (actionId === 'view-tags') setActiveTab('tags');
          else if (actionId === 'view-projects') setActiveTab('projects');
          else if (actionId === 'edit-site-settings') setActiveTab('site-settings');
        }
    }
  };

  const handleSaveSiteSettings = async (settings: Partial<SiteSettings>) => {
    setIsSiteSettingsLoading(true);
    try {
      const response = await API.siteSettings.updateSiteSettings(settings);
      setSiteSettings(response.data);
      await loadSiteSettings();
    } catch (error: any) { } finally { setIsSiteSettingsLoading(false); }
  };

  const handleActivityClick = (activity: any) => { if (activity.link) navigate(activity.link); };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const renderTabContent = () => {
    const pageTransition: any = {
      initial: { opacity: 0, y: 20, scale: 0.98 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: -20, scale: 0.98 },
      transition: { duration: 0.3, ease: 'easeInOut' },
    };

    if (activeTab === 'dashboard') {
      return (
        <DashboardLayout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <MainColumn>
            <GroupedCard>
              <GroupHeader>
                <GroupTitle><FiBarChart2 /> 业务核心数据</GroupTitle>
                <Button variant="secondary" size="small">查看详情</Button>
              </GroupHeader>
              <DataOverviewGrid>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <MetricBox>
                    <MetricLabel>总阅读量</MetricLabel>
                    <MetricValue>{userStats.find((s) => s.label === '总阅读量')?.value || 0}</MetricValue>
                    <div style={{ height: '1.2em' }}></div>
                  </MetricBox>
                  <MetricBox>
                    <MetricLabel>总互动数</MetricLabel>
                    <MetricValue>
                      {parseInt(String(userStats.find((s) => s.label === '获得点赞')?.value || 0)) +
                        parseInt(String(userStats.find((s) => s.label === '评论回复')?.value || 0))}
                    </MetricValue>
                    {userStats.find((s) => s.label === '评论回复')?.trend ? (
                      <MetricTrend isPositive={userStats.find((s) => s.label === '评论回复')?.trend?.direction === 'up'}>
                        <FiTrendingUp /> 评论环比 {userStats.find((s) => s.label === '评论回复')?.trend?.percentage}%
                      </MetricTrend>
                    ) : <div style={{ height: '1.2em' }}></div>}
                  </MetricBox>
                </div>
                <BarChartContainer>
                  <BarChartTitle>近6个月发布趋势</BarChartTitle>
                  <BarsRow>
                    {publishTrend.length > 0 ? publishTrend.slice(-6).map((item, i) => {
                      const maxVal = Math.max(...publishTrend.map((d) => d.count), 1);
                      const height = (item.count / maxVal) * 100;
                      return (
                        <BarColumn key={i}>
                          <Bar height={height} initial={{ height: 0 }} animate={{ height: height + '%' }} transition={{ delay: i * 0.1, duration: 0.5 }} />
                          <BarLabel>{item.date}</BarLabel>
                        </BarColumn>
                      );
                    }) : <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-tertiary)', alignSelf: 'center' }}>暂无数据</div>}
                  </BarsRow>
                </BarChartContainer>
                <DonutChartContainer>
                  <svg width="160" height="160" viewBox="0 0 160 160">
                    <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(var(--border-rgb), 0.1)" strokeWidth="12" />
                    {categoryStats.map((item, i) => {
                      const total = categoryStats.reduce((acc, cur) => acc + cur.value, 0);
                      const percentage = (item.value / total) * 100;
                      const dashArray = 2 * Math.PI * 70;
                      const strokeDasharray = `${(percentage / 100) * dashArray} ${dashArray}`;
                      const prevPercentage = categoryStats.slice(0, i).reduce((acc, cur) => acc + cur.value, 0) / total;
                      const strokeDashoffset = -prevPercentage * dashArray;
                      return (
                        <motion.circle key={item.name} cx="80" cy="80" r="70" fill="none" stroke={item.color} strokeWidth="12" strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.2, duration: 0.5 }} transform="rotate(-90 80 80)" />
                      );
                    })}
                    <text x="80" y="75" textAnchor="middle" fill="var(--text-secondary)" fontSize="12">总文章</text>
                    <text x="80" y="100" textAnchor="middle" fill="var(--text-primary)" fontSize="24" fontWeight="bold">{userStats.find((s) => s.label === '发布文章')?.value || 0}</text>
                  </svg>
                  <DonutLegend>
                    {categoryStats.map((item, i) => (
                      <LegendItem key={i} color={item.color}>{item.name} ({Math.round((item.value / (categoryStats.reduce((a, b) => a + b.value, 0) || 1)) * 100)}%)</LegendItem>
                    ))}
                  </DonutLegend>
                </DonutChartContainer>
              </DataOverviewGrid>
            </GroupedCard>

            <GroupedCard>
              <GroupHeader>
                <GroupTitle><FiLayers /> 重点项目</GroupTitle>
                <Button variant="secondary" size="small" onClick={() => setActiveTab('projects')}>管理项目</Button>
              </GroupHeader>
              <div style={{ padding: '0.5rem 0' }}>
                <ProjectRow style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', borderBottom: 'none', paddingBottom: '0.5rem' }}>
                  <div>项目名称</div><div>可见性</div><div>创建时间</div><div>状态</div><div>操作</div>
                </ProjectRow>
                {recentProjects.length > 0 ? recentProjects.map((project) => (
                  <ProjectRow key={project.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <ProjectName>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(var(--accent-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)' }}><FiFolder size={16} /></div>
                      {project.title}
                    </ProjectName>
                    <span style={{ background: project.visibility === 'public' ? '#eff6ff' : '#fff7ed', color: project.visibility === 'public' ? '#1d4ed8' : '#c2410c', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>{project.visibility === 'public' ? '公开' : '私密'}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{formatTime(project.createdAt)}</span>
                    <StatusTag status={project.status}>{project.status === 'active' ? '进行中' : project.status === 'developing' ? '开发中' : project.status === 'paused' ? '暂停' : '已归档'}</StatusTag>
                    <div style={{ display: 'flex', gap: '0.5rem' }}><Button variant="ghost" size="small" onClick={() => window.open(project.demoUrl || project.githubUrl, '_blank')}>查看</Button></div>
                  </ProjectRow>
                )) : <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>暂无项目</div>}
              </div>
            </GroupedCard>
          </MainColumn>

          <SideColumn>
            <SideListCard>
              <SideListHeader>
                <GroupTitle style={{ fontSize: '1rem' }}><FiCheck /> 待办事项</GroupTitle>
                <Button variant="ghost" size="small" style={{ color: 'var(--accent-color)' }}>查看全部</Button>
              </SideListHeader>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', padding: '1rem 1.5rem', borderBottom: '1px solid rgba(var(--border-rgb), 0.05)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', flex: 1 }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{todoItems.reduce((acc, item) => acc + (item.count || 0), 0)}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>待处理</span>
                </div>
                <div style={{ width: 1, height: 30, background: 'rgba(var(--border-rgb), 0.1)' }}></div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', flex: 1 }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>0</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>已完成</span>
                </div>
              </div>
              {todoItems.length > 0 ? todoItems.map((item) => (
                <SideListItem key={item.id} onClick={() => handleTodoClick(item)}>
                  <ItemAvatar style={{ background: item.priority === 'high' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(var(--accent-rgb), 0.1)', color: item.priority === 'high' ? '#ef4444' : 'var(--accent-color)' }}>{item.id === 'pending-posts' ? <FiFileText /> : <FiMessageSquare />}</ItemAvatar>
                  <ItemInfo style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.content}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{item.priority === 'high' ? '需立即处理' : '待处理'}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white', background: item.priority === 'high' ? '#ef4444' : 'var(--accent-color)', padding: '2px 8px', borderRadius: 12, minWidth: '24px', textAlign: 'center' }}>{item.count}</div>
                  </ItemInfo>
                </SideListItem>
              )) : <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>暂无待办事项</div>}
            </SideListCard>

            <SideListCard>
              <SideListHeader><GroupTitle style={{ fontSize: '1rem' }}><FiActivity /> 最近动态</GroupTitle></SideListHeader>
              {activities.slice(0, 6).map((activity: any, i) => (
                <SideListItem key={i} onClick={() => handleActivityClick(activity)}>
                  <ItemAvatar iconColor={activity.iconColor} iconBg={activity.iconBg}>{activity.icon || <FiActivity />}</ItemAvatar>
                  <ItemInfo><ItemDesc>{formatActivityTitle(activity)}</ItemDesc><ItemTime>{formatTime(activity.createdAt)}</ItemTime></ItemInfo>
                </SideListItem>
              ))}
            </SideListCard>
          </SideColumn>
        </DashboardLayout>
      );
    }

    switch (activeTab) {
      case 'notes': return <ContentGlassCard {...pageTransition}><CommonPage type="notes" /></ContentGlassCard>;
      case 'articles': return <ContentGlassCard {...pageTransition}><CommonPage type="articles" /></ContentGlassCard>;
      case 'comments': return <ContentGlassCard {...pageTransition}><CommonPage type="comments" initialStatusFilter={commentStatusFilter} /></ContentGlassCard>;
      case 'guestbook': if (!isAdmin) return <div>无权限访问</div>; return <ContentGlassCard {...pageTransition}><CommonPage type="guestbook" /></ContentGlassCard>;
      case 'likes': return <ContentGlassCard {...pageTransition}><CommonPage type="likes" /></ContentGlassCard>;
      case 'bookmarks': return <ContentGlassCard {...pageTransition}><CommonPage type="bookmarks" /></ContentGlassCard>;
      case 'security': return <ContentGlassCard {...pageTransition}><SecuritySettings /></ContentGlassCard>;
      case 'site-settings': return <ContentGlassCard {...pageTransition}><SiteSettingsManagement settings={siteSettings} onSave={handleSaveSiteSettings} isLoading={isSiteSettingsLoading} /></ContentGlassCard>;
      case 'projects': if (!isAdmin) return <div>无权限访问</div>; return <ContentGlassCard {...pageTransition}><CommonPage type="projects" /></ContentGlassCard>;
      case 'friends': if (!isAdmin) return <div>无权限访问</div>; return <ContentGlassCard {...pageTransition}><CommonPage type="friends" /></ContentGlassCard>;
      case 'users': if (!isAdmin) return <div>无权限访问</div>; return <ContentGlassCard {...pageTransition}><CommonPage type="users" /></ContentGlassCard>;
      case 'categories': if (!isAdmin) return <div>无权限访问</div>; return <ContentGlassCard {...pageTransition}><CommonPage type="categories" /></ContentGlassCard>;
      case 'tags': if (!isAdmin) return <div>无权限访问</div>; return <ContentGlassCard {...pageTransition}><CommonPage type="tags" /></ContentGlassCard>;
      default: return <div>页面未找到</div>;
    }
  };

  return (
    <>
      <SEO title={PAGE_SEO_CONFIG.profile.title} description={PAGE_SEO_CONFIG.profile.description} keywords={PAGE_SEO_CONFIG.profile.keywords} type="profile" index={false} follow={false} />
      <ProfileWrapper>
        <LayoutContainer>
          <IdentityColumn>
            {user && (
              <UnifiedIdentityCard initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <ProfileHero user={user} achievements={achievements} onEditProfile={() => setIsEditModalOpen(true)} onAvatarChange={handleAvatarChange} isLoading={isUserLoading} />
              </UnifiedIdentityCard>
            )}
            
            {/* 音乐卡片 */}
            <MusicCard initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
              <MusicCardHeader>
                <GroupTitle style={{ fontSize: '0.95rem' }}><FiMusic /> 我的音乐</GroupTitle>
                <Button variant="ghost" size="small" style={{ color: 'var(--accent-color)', padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => setIsAddMusicModalOpen(true)}>添加</Button>
              </MusicCardHeader>
              <MusicList>
                {isMusicLoading ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>加载中...</div>
                ) : userMusicList.length > 0 ? (
                  userMusicList.map((music, i) => (
                    <MusicItem key={music.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                      <MusicCover src={music.pic} />
                      <MusicInfo>
                        <MusicTitle>{music.title}</MusicTitle>
                        <MusicArtist>{music.artist}</MusicArtist>
                      </MusicInfo>
                      <Button variant="ghost" size="small" style={{ borderRadius: '50%', width: 28, height: 28, padding: 0, flexShrink: 0 }}>
                        <FiPlay size={12} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="small"
                        style={{ borderRadius: '50%', width: 28, height: 28, padding: 0, flexShrink: 0, color: 'var(--error-color)' }}
                        onClick={() => handleDeleteMusic(music.id, music.title)}
                        title="删除音乐"
                      >
                        <FiTrash2 size={12} />
                      </Button>
                    </MusicItem>
                  ))
                ) : (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>暂无收藏音乐</div>
                )}
              </MusicList>
            </MusicCard>
          </IdentityColumn>
          <StageArea>
            <MobileProfileHeader user={user} stats={userStats} onEdit={() => setIsEditModalOpen(true)} onSwitchTab={(tab: any) => setActiveTab(tab)} onOpenQuickActions={() => setRightDrawerOpen(true)} activeTab={activeTab} isAdmin={isAdmin} />
            <TabContent>
              <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.3, ease: 'easeInOut' }} style={{ width: '100%', minHeight: 'inherit' }}>
                  {renderTabContent()}
                </motion.div>
              </AnimatePresence>
            </TabContent>
          </StageArea>
        </LayoutContainer>

        {!isMobile && (
          <ControlDock initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5, ...SPRING_PRESETS.bouncy }}>
            <DockItem onClick={() => navigate('/')} data-tooltip="返回首页" whileHover={{ scale: 1.1, y: -5 }} whileTap={{ scale: 0.9 }}><FiHome /></DockItem>
            <DockSeparator />
            <DockItem onClick={() => setActiveTab('dashboard')} active={activeTab === 'dashboard'} data-tooltip="仪表盘" whileHover={{ scale: 1.1, y: -5 }} whileTap={{ scale: 0.9 }}><FiBarChart2 /></DockItem>
            <DockSeparator />
            {permissions.quickActions.map((action) => {
              const isActive = activeTab === ACTION_TO_TAB_MAP[action.action];
              return (
                <DockItem key={action.id} onClick={() => handleQuickAction(action.action)} active={isActive} data-tooltip={action.label} whileHover={{ scale: 1.1, y: -5 }} whileTap={{ scale: 0.9 }}>
                  {getQuickActionIcon(action.action, action.icon)}
                  {isActive && <motion.div layoutId="dock-active-dot" style={{ position: 'absolute', bottom: -4, width: 4, height: 4, borderRadius: '50%', background: 'var(--accent-color)' }} />}
                </DockItem>
              );
            })}
          </ControlDock>
        )}

        {user && <EditProfileModal isOpen={isEditModalOpen} user={user} onClose={() => setIsEditModalOpen(false)} onSave={handleSaveProfile} isLoading={isUserLoading} />}

        <AddMusicModal isOpen={isAddMusicModalOpen} onClose={() => setIsAddMusicModalOpen(false)} onSuccess={loadUserMusic} />

        <AnimatePresence>
          {rightDrawerOpen && (
            <>
              <DrawerOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRightDrawerOpen(false)} />
              <BottomSheet initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>功能导航</h3>
                  <div onClick={() => setRightDrawerOpen(false)} style={{ padding: '8px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiX size={18} color="var(--text-secondary)" /></div>
                </div>
                <BottomSheetGrid>
                  {permissions.quickActions.map((action) => (
                    <BottomSheetItem key={action.id} onClick={() => { setRightDrawerOpen(false); handleQuickAction(action.action); }}>
                      <div className="icon-wrapper">{getQuickActionIcon(action.action, action.icon)}</div>
                      <span>{action.label}</span>
                    </BottomSheetItem>
                  ))}
                </BottomSheetGrid>
              </BottomSheet>
            </>
          )}
        </AnimatePresence>
      </ProfileWrapper>
    </>
  );
};

export default Profile;
