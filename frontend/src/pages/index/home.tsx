import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import { API } from '@/utils/api';
import type { Project } from '@/types';
import { useAnimationEngine, useSmartInView } from '@/utils/ui/animation';
import { SEO } from '@/components/common';
import { useSiteSettings } from '@/layouts';
import { PAGE_SEO_CONFIG, getRandomPoeticTitle } from '@/config/seo.config';
import {
  HeroSection,
  ArticlesSection,
  NotesSection,
  ActivitiesSection,
  ActivityChartSection,
  ProjectsSection as ProjectsSectionModule,
} from './modules';

const PageContainer = styled.div`
  width: 100%;
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 1rem;
`;

const TwoColumnLayout = styled(motion.div)`
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 4rem;
  margin-bottom: 2.5rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr 350px;
    gap: 3rem;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
`;

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3rem;
`;

const RightColumn = styled.div`
  display: flex;
  flex-direction: column;
  position: relative;
`;

const Home: React.FC = () => {
  // 使用动画引擎 - 统一的 Spring 动画系统
  const { variants } = useAnimationEngine();

  // 使用智能视口检测 - 优化两栏布局动画
  const twoColumnView = useSmartInView({ amount: 0.2, lcpOptimization: true });

  // 使用网站设置Hook - 增加加载状态检查
  const { siteSettings, loading: siteSettingsLoading } = useSiteSettings();
  // 文章和手记数据
  const [articles, setArticles] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);

  // 项目数据
  const [projects, setProjects] = useState<Project[]>([]);
  // 当前选中的项目索引
  const [selectedProjectIndex, setSelectedProjectIndex] = useState(0);
  // 贡献数据
  const [chartData, setChartData] = useState<any[]>([]);

  // 内容加载状态（供骨架屏使用）
  const [contentLoading, setContentLoading] = useState(true);

  // 加载文章列表
  const loadArticles = async () => {
    try {
      const response = await API.article.getArticles({ page: 1, limit: 3 });
      setArticles(response.data || []);
    } catch (error) {
      console.error('加载文章失败:', error);
    }
  };

  // 加载手记列表
  const loadNotes = async () => {
    try {
      const response = await API.note.getNotes({ page: 1, limit: 5, isPrivate: false });
      setNotes(response.data || []);
    } catch (error) {
      console.error('加载手记失败:', error);
    }
  };

  // 加载精选项目（轮播最多展示 10 个，无需全量拉取）
  const loadProjects = async () => {
    try {
      const response = await API.project.getFeaturedProjects({ page: 1, limit: 10 });
      setProjects(response.data || []);
    } catch (error) {
      console.error('加载项目失败:', error);
    }
  };

  // 加载贡献统计数据
  const loadContributions = async () => {
    try {
      // 从网站设置中获取用户名，或使用默认值
      const githubUsername = siteSettings?.githubUsername || 'adnaan';
      const giteeUsername = siteSettings?.giteeUsername || 'adnaan';

      const response = await API.contribution.getContributions({
        githubUsername,
        giteeUsername,
      });
      setChartData(response.data || []);
    } catch (error) {
      console.error('加载贡献数据失败:', error);
      // 加载失败时使用空数据
      setChartData([]);
    }
  };

  // 初始数据加载（三个独立请求并行执行，消除瀑布式延迟）
  useEffect(() => {
    let isMounted = true;
    const initialize = async () => {
      await Promise.all([loadArticles(), loadNotes(), loadProjects()]);
      if (isMounted) setContentLoading(false);
    };
    initialize();
    return () => {
      isMounted = false;
    };
  }, []);

  // 当 siteSettings 加载完成后，加载贡献数据
  useEffect(() => {
    if (!siteSettingsLoading && siteSettings) {
      loadContributions();
    }
  }, [siteSettings, siteSettingsLoading]);

  return (
    <>
      <SEO
        title={getRandomPoeticTitle()}
        description={PAGE_SEO_CONFIG.home.description}
        keywords={PAGE_SEO_CONFIG.home.keywords}
        type="website"
      />
      <PageContainer>
        <HeroSection siteSettings={siteSettings} loading={siteSettingsLoading} />

        {/* 两栏布局容器 */}
        <TwoColumnLayout
          ref={twoColumnView.ref as React.RefObject<HTMLDivElement>}
          initial="hidden"
          animate={twoColumnView.isInView ? 'visible' : 'hidden'}
          variants={variants.stagger}
        >
          {/* 左侧栏 */}
          <LeftColumn>
            <ArticlesSection articles={articles} loading={contentLoading} />
            <NotesSection notes={notes} loading={contentLoading} />
          </LeftColumn>

          {/* 右侧栏 */}
          <RightColumn>
            <ActivitiesSection />
          </RightColumn>
        </TwoColumnLayout>

        {/* 图表部分 */}
        <ActivityChartSection chartData={chartData} />

        {/* 项目部分 */}
        <ProjectsSectionModule
          projects={projects}
          selectedProjectIndex={selectedProjectIndex}
          onProjectChange={setSelectedProjectIndex}
        />
      </PageContainer>
    </>
  );
};

export default Home;
