import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, Suspense } from 'react';
import styled from '@emotion/styled';
import { useDispatch } from 'react-redux';
import Header from './header';
import Footer from './footer';
import SmartDock from './modules/smart-dock';
import MeteorBackground from '@/components/common/meteor-background';
import { AnimatePresence, motion } from 'framer-motion';
import { useSystemTheme } from '@/hooks/useSystemTheme';
import PageLoading from '@/components/common/page-loading';
import { setupHttpConfig } from '@/utils/api';
import { useVisitorTracking } from '@/hooks';
import { AppDispatch } from '@/store';
import { API } from '@/utils';
import type { SiteSettings } from '@/types';
import { PageInfoContext, usePageInfoState } from '@/hooks/usePageInfo';
import { SiteSettingsContext } from './contexts';
import { MusicPlayerProvider } from '@/contexts/MusicPlayerContext';
import { HydrationDetector } from '@/utils/ui/animation';

export { useSiteSettings } from './hooks';

// 定义页面主体样式
const MainContainer = styled.div`
  width: 100%;
  max-width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-x: clip;
`;

// 内容区域样式 - 个人中心独立，无需预留header
const Content = styled.main<{ isProfileContext?: boolean }>`
  flex: 1;
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  overflow: visible;
  margin-top: ${(props) => (props.isProfileContext ? '0' : 'var(--header-height)')};
  min-height: ${(props) => (props.isProfileContext ? '100vh' : 'calc(100vh - var(--header-height))')};

  @media (max-width: 768px) {
    padding: ${(props) => (props.isProfileContext ? '0' : '1.5rem 1.25rem')};
  }
`;


// 加载指示器样式
const LoadingIndicator = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  background: var(--accent-color);
  z-index: 1000;
  box-shadow: 0 0 10px var(--accent-color);
`;

/**
 * 根布局组件，提供应用程序的基本结构
 * 包括页面过渡和滚动状态监听
 */
const RootLayout = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  // 网站设置状态
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [siteSettingsLoading, setSiteSettingsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // 加载指示器状态
  const [showLoader, setShowLoader] = useState(false);
  const [showPageLoading, setShowPageLoading] = useState(false);
  const previousPathRef = useRef(location.pathname);
  const loaderTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstLoadRef = useRef(true); // 标记是否是首次加载

  // 页面信息状态
  const pageInfoState = usePageInfoState();

  // 监听系统主题变化（自动在 auto 模式下启用）
  useSystemTheme();

  // 访客活动追踪（自动上报地区、设备、页面等信息）
  useVisitorTracking();

  // 配置HTTP未授权回调（传入 dispatch 以便清除 Redux 状态）
  useEffect(() => {
    setupHttpConfig(navigate, dispatch);
  }, [navigate, dispatch]);

  // 加载网站设置 - 增加重试机制
  const loadSiteSettings = async (retry = 0) => {
    try {
      setSiteSettingsLoading(true);
      const response = await API.siteSettings.getSiteSettings();
      setSiteSettings(response.data);
      setRetryCount(0); // 成功后重置重试次数
      setSiteSettingsLoading(false);
    } catch (error) {
      console.error(`加载网站设置失败 (尝试 ${retry + 1}/${maxRetries}):`, error);

      // 如果还有重试次数，延迟后重试
      if (retry < maxRetries - 1) {
        setRetryCount(retry + 1);
        setTimeout(
          () => {
            loadSiteSettings(retry + 1);
          },
          1000 * (retry + 1),
        ); // 递增延迟：1s, 2s, 3s
      } else {
        // 达到最大重试次数，使用默认值或显示错误
        console.warn('网站设置加载失败，使用默认配置');
        setSiteSettings(null);
        setSiteSettingsLoading(false);
      }
    }
  };

  // 初始化时加载网站设置
  useEffect(() => {
    loadSiteSettings();
  }, []);

  // 标记首次加载完成
  useEffect(() => {
    const timer = setTimeout(() => {
      isFirstLoadRef.current = false;
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // 路由变化时的加载指示器 - 优化逻辑
  useEffect(() => {
    // 检查路径是否变化
    const isPathChanged = previousPathRef.current !== location.pathname;

    if (!isPathChanged) return;

    // 清除之前的定时器
    if (loaderTimerRef.current) {
      clearTimeout(loaderTimerRef.current);
      loaderTimerRef.current = null;
    }

    // 只有在非首次加载时才显示loading
    if (!isFirstLoadRef.current) {
      // 显示顶部进度条和页面loading
      setShowLoader(true);
      setShowPageLoading(true);

      // 延迟隐藏loading，确保页面已经渲染
      loaderTimerRef.current = setTimeout(() => {
        setShowLoader(false);
        setShowPageLoading(false);
        loaderTimerRef.current = null;
      }, 300);
    }

    // 更新路径引用
    previousPathRef.current = location.pathname;

    // 清理函数
    return () => {
      if (loaderTimerRef.current) {
        clearTimeout(loaderTimerRef.current);
        loaderTimerRef.current = null;
      }
    };
  }, [location.pathname]);

  // 设置滚动监听
  useEffect(() => {
    // 定义滚动处理函数
    const handleScroll = () => {
      const currentScrollPosition = window.scrollY;
      setScrollPosition(currentScrollPosition);

      const newScrolledState = currentScrollPosition > 5;
      setIsScrolled(newScrolledState);
    };

    // 初始检查
    handleScroll();

    // 添加事件监听，使用passive优化性能
    window.addEventListener('scroll', handleScroll, { passive: true });

    // 清理函数
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []); // 空依赖数组，只在挂载时执行

  return (
    <SiteSettingsContext.Provider value={{ siteSettings, loading: siteSettingsLoading }}>
      <PageInfoContext.Provider value={pageInfoState}>
        <MusicPlayerProvider>
          <MainContainer>
            {/* Hydration 检测器 - 用于动画优化 */}
            <HydrationDetector />

            {/* 简洁的顶部加载进度条 */}
            <AnimatePresence>
              {showLoader && (
                <LoadingIndicator
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 0.25,
                    ease: 'easeOut',
                  }}
                />
              )}
            </AnimatePresence>

            {/* 流星背景动效（仅暗黑模式） */}
            <MeteorBackground />

            {/* 判断当前是否处于个人中心相关页面：不展示全局 Header/Footer，由页面自身负责顶部/底部结构 */}
            {(() => {
              const path = location.pathname;
              const isProfileContext =
                path === '/profile' ||
                path.startsWith('/profile/') ||
                path.startsWith('/editor/article') ||
                path.startsWith('/editor/note');

              return !isProfileContext ? (
                <Header scrolled={isScrolled} pageInfo={pageInfoState.pageInfo || undefined} />
              ) : null;
            })()}

            {(() => {
              const path = location.pathname;
              const isProfileContext =
                path === '/profile' ||
                path.startsWith('/profile/') ||
                path.startsWith('/editor/article') ||
                path.startsWith('/editor/note');

              return (
                <Suspense
                  fallback={
                    <Content isProfileContext={isProfileContext}>
                      <PageLoading />
                    </Content>
                  }
                >
                  <Content key={location.pathname} isProfileContext={isProfileContext}>
                    {showPageLoading ? <PageLoading /> : <Outlet />}
                  </Content>
                </Suspense>
              );
            })()}

            {(() => {
              const path = location.pathname;
              const isProfileContext =
                path === '/profile' ||
                path.startsWith('/profile/') ||
                path.startsWith('/editor/article') ||
                path.startsWith('/editor/note');

              return !isProfileContext ? <Footer /> : null;
            })()}

            {/* 智能悬浮坞 (整合播放器、返回顶部、陪伴物) */}
            <SmartDock />
          </MainContainer>
        </MusicPlayerProvider>
      </PageInfoContext.Provider>
    </SiteSettingsContext.Provider>
  );
};

export default RootLayout;
