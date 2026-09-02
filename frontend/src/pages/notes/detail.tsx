import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCalendar, FiTag, FiMapPin, FiCloud, FiHeart, FiEye, FiClock, FiArrowLeft, FiShare2 } from 'react-icons/fi';
import styled from '@emotion/styled';
import { API } from '@/utils/api';
import type { Note } from '@/types';
import RichTextContent from '@/components/rich-text/rich-text-content';
import LazyRichTextRenderer from '@/components/rich-text/lazy-rich-text-renderer';
import { useAnimationEngine, SPRING_PRESETS } from '@/utils/ui/animation';
import { DetailPageLayout, DetailNoiseBackground, CommentSection } from '@/components/content';
import { usePageInfo } from '@/hooks/usePageInfo';
import { getTimeAgo, formatDate as formatDateUtil } from '@/utils';
import { SEO, NoteDetailSkeleton } from '@/components/common';
import { RichTextParser } from '@/utils/editor/parser';

// 扩展Note接口以包含相关手记
interface NoteWithRelated extends Note {
  relatedNotes?: Note[];
}

// --- Styled Components ---

// 页面头部渐变背景
const PageHeadGradient = styled.div<{ mood?: string }>`
  pointer-events: none;
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  height: 700px;
  width: 100%;
  overflow: hidden;
  z-index: 0;
  transition: opacity 1s ease;

  /* 根据心情调整颜色 */
  --gradient-color: ${(props) => {
    switch (props.mood) {
      case '开心':
        return 'var(--success-color)';
      case '平静':
        return 'var(--info-color)';
      case '思考':
        return 'var(--accent-color)';
      case '感慨':
        return 'var(--warning-color)';
      default:
        return 'var(--accent-color)';
    }
  }};

  &::before,
  &::after {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    pointer-events: none;
    will-change: transform;
  }

  /* 第一层：主光晕 */
  &::before {
    background: radial-gradient(
      ellipse 160% 110% at 15% 10%,
      rgba(var(--accent-rgb), 0.28) 0%,
      rgba(var(--accent-rgb), 0.15) 25%,
      rgba(var(--accent-rgb), 0.05) 50%,
      transparent 75%
    );
    transform-origin: 15% 10%;
    animation: breatheGlow1 25s ease-in-out infinite;
  }

  /* 第二层：次光晕 */
  &::after {
    background: radial-gradient(
      ellipse 140% 95% at 85% 15%,
      rgba(var(--accent-rgb), 0.22) 0%,
      rgba(var(--accent-rgb), 0.12) 30%,
      rgba(var(--accent-rgb), 0.04) 55%,
      transparent 80%
    );
    transform-origin: 85% 15%;
    animation: breatheGlow2 30s ease-in-out infinite;
    animation-delay: 8s;
  }

  @keyframes breatheGlow1 {
    0%,
    100% {
      transform: scale(1) rotate(0deg);
      opacity: 1;
    }
    33% {
      transform: scale(1.08) rotate(1deg);
      opacity: 0.92;
    }
    66% {
      transform: scale(0.96) rotate(-0.5deg);
      opacity: 0.96;
    }
  }

  @keyframes breatheGlow2 {
    0%,
    100% {
      transform: scale(1) rotate(0deg);
      opacity: 1;
    }
    40% {
      transform: scale(1.06) rotate(-1deg);
      opacity: 0.88;
    }
    75% {
      transform: scale(0.98) rotate(0.8deg);
      opacity: 0.94;
    }
  }

  /* 遮罩 */
  mask-image: linear-gradient(to bottom, black 0%, rgba(0, 0, 0, 0.8) 40%, transparent 80%);
  -webkit-mask-image: linear-gradient(to bottom, black 0%, rgba(0, 0, 0, 0.8) 40%, transparent 80%);
`;

const PageContainer = styled.div`
  width: 100%;
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    padding: 1rem 1rem 3rem;
  }
`;

// 非对称布局网格
const LayoutGrid = styled.div`
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 4rem;
  align-items: start;

  @media (max-width: 1024px) {
    grid-template-columns: 240px 1fr;
    gap: 2.5rem;
  }

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
`;

// 侧边栏
const Sidebar = styled(motion.aside)`
  position: sticky;
  top: 100px;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;

  @media (max-width: 860px) {
    position: static;
    order: 2; /* 移动端在内容下方 */
    display: none; /* 移动端暂时隐藏侧边栏，使用底部信息块代替 */
  }
`;

// 移动端侧边栏替代
const MobileSidebar = styled.div`
  display: none;
  @media (max-width: 860px) {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid var(--border-color);
  }
`;

// 侧边栏卡片 - 极简风格
const SidebarSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const SidebarTitle = styled.h3`
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-tertiary);
  font-weight: 600;
  margin: 0;
`;

// 元数据项
const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  color: var(--text-secondary);
  font-size: 0.9rem;

  svg {
    color: var(--accent-color);
    opacity: 0.8;
  }
`;

// 标签胶囊
const Tag = styled(Link)`
  display: inline-flex;
  align-items: center;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  background: rgba(var(--bg-primary-rgb), 0.5);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 0.8rem;
  transition: all 0.2s ease;
  text-decoration: none;

  &:hover {
    background: var(--accent-color-alpha);
    color: var(--accent-color);
    border-color: transparent;
    transform: translateY(-1px);
  }
`;

const TagsWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

// 相关手记链接
const RelatedLink = styled(Link)`
  display: block;
  padding: 1rem;
  background: rgba(var(--bg-primary-rgb), 0.3);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  border: 1px solid transparent;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  h4 {
    font-size: 0.9rem;
    margin: 0 0 0.4rem;
    color: var(--text-primary);
    line-height: 1.4;
    font-weight: 500;
  }

  span {
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  &:hover {
    background: rgba(var(--bg-primary-rgb), 0.6);
    border-color: var(--accent-color-alpha);
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);

    h4 {
      color: var(--accent-color);
    }
  }
`;

// 主内容区
const MainContent = styled(motion.main)`
  min-width: 0;
`;

// 标题区域
const HeaderArea = styled.header`
  margin-bottom: 3rem;
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-tertiary);
  font-size: 0.9rem;
  margin-bottom: 2rem;
  transition: color 0.2s ease;

  &:hover {
    color: var(--accent-color);
    transform: translateX(-4px);
  }
`;

const Title = styled.h1`
  font-family: var(--font-heading);
  font-size: 2.25rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.35;
  margin-bottom: 1.5rem;
  letter-spacing: 0.02em;

  @media (max-width: 768px) {
    font-size: 1.75rem;
  }
`;

const MobileMeta = styled.div`
  display: none;
  @media (max-width: 860px) {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 2rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid var(--border-color);
  }
`;

const MobileBackLinkWrapper = styled.div`
  display: none;
  margin-bottom: 1rem;

  @media (max-width: 860px) {
    display: block;
  }
`;

// 内容卡片 - 玻璃态
const ContentCard = styled.div`
  position: relative;

  /* 增强阅读体验的排版 */
  .rich-text-content {
    font-size: 1.05rem;
    line-height: 1.8;
    color: var(--text-primary);

    p {
      margin-bottom: 1.5rem;
    }

    img {
      border-radius: 12px;
      box-shadow: var(--shadow-md);
      margin: 2rem 0;
    }
  }
`;

const NoteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [note, setNote] = useState<NoteWithRelated | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { variants } = useAnimationEngine();
  const { setPageInfo } = usePageInfo();

  useEffect(() => {
    loadNote();
    return () => setPageInfo(null);
  }, [id, setPageInfo]);

  const loadNote = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const response = await API.note.getNoteDetail(id);
      setNote(response.data);
      setPageInfo({
        title: response.data.title,
        tags: response.data.tags || [],
      });
    } catch (error: any) {
      console.error('Failed to load note:', error);
      setNote(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !note) {
    return <NoteDetailSkeleton />;
  }

  // 侧边栏内容组件 - 复用逻辑
  const SidebarContent = () => (
    <>
      <SidebarSection>
        <SidebarTitle>发布信息</SidebarTitle>
        <MetaItem>
          <FiCalendar /> {formatDateUtil(note.createdAt, 'YYYY年MM月DD日')}
        </MetaItem>
        <MetaItem>
          <FiClock /> {formatDateUtil(note.createdAt, 'HH:mm')}
        </MetaItem>
        {note.location && (
          <MetaItem>
            <FiMapPin /> {note.location}
          </MetaItem>
        )}
        {note.weather && (
          <MetaItem>
            <FiCloud /> {note.weather}
          </MetaItem>
        )}
        {note.mood && (
          <MetaItem>
            <FiHeart /> {note.mood}
          </MetaItem>
        )}
      </SidebarSection>

      {note.tags && note.tags.length > 0 && (
        <SidebarSection>
          <SidebarTitle>标签</SidebarTitle>
          <TagsWrapper>
            {note.tags.map((tag) => (
              <Tag key={tag} to={`/notes?tag=${tag}`}>
                #{tag}
              </Tag>
            ))}
          </TagsWrapper>
        </SidebarSection>
      )}

      {note.relatedNotes && note.relatedNotes.length > 0 && (
        <SidebarSection>
          <SidebarTitle>相关阅读</SidebarTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {note.relatedNotes.map((related) => {
              // 提取纯文本预览
              const plainText = RichTextParser.extractText(related.content);
              const preview = plainText.length > 40 ? plainText.substring(0, 40) + '...' : plainText;

              return (
                <RelatedLink key={related.id} to={`/notes/${related.id}`}>
                  <h4>{related.title || '无题'}</h4>
                  <span>{preview}</span>
                </RelatedLink>
              );
            })}
          </div>
        </SidebarSection>
      )}
    </>
  );

  return (
    <>
      <SEO
        title={note.title || '加载中...'}
        description={note.content?.substring(0, 150)}
        keywords={note.tags?.join(', ')}
        type="article"
      />

      <DetailPageLayout showBackground={false} mainContent={<></>}>
        <DetailNoiseBackground />

        {/* 动态呼吸背景 */}
        <PageHeadGradient mood={note.mood || ''} />

        <PageContainer>
          <LayoutGrid>
            {/* 左侧固定侧边栏 */}
            <Sidebar initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={SPRING_PRESETS.gentle}>
              <BackLink to="/notes">
                <FiArrowLeft /> 返回列表
              </BackLink>
              <SidebarContent />
            </Sidebar>

            {/* 右侧主内容 */}
            <MainContent
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, ...SPRING_PRESETS.gentle }}
            >
              <HeaderArea>
                {/* 移动端返回按钮 */}
                <MobileBackLinkWrapper>
                  <BackLink to="/notes">
                    <FiArrowLeft /> 返回列表
                  </BackLink>
                </MobileBackLinkWrapper>

                <Title>{note.title}</Title>

                {/* 移动端元数据展示 */}
                <MobileMeta>
                  <MetaItem>
                    <FiCalendar /> {formatDateUtil(note.createdAt, 'MM-DD')}
                  </MetaItem>
                  {note.mood && (
                    <MetaItem>
                      <FiHeart /> {note.mood}
                    </MetaItem>
                  )}
                  {note.weather && (
                    <MetaItem>
                      <FiCloud /> {note.weather}
                    </MetaItem>
                  )}
                </MobileMeta>
              </HeaderArea>

              <ContentCard>
                <RichTextContent className="rich-text-content">
                  <LazyRichTextRenderer
                    content={note.content}
                    mode="note"
                    enableCodeHighlight={true}
                    enableImagePreview={true}
                    enableTableOfContents={false}
                  />
                </RichTextContent>
              </ContentCard>

              {/* 移动端底部侧边栏内容 */}
              <MobileSidebar>
                <SidebarContent />
              </MobileSidebar>

              <div style={{ marginTop: '4rem' }}>
                <CommentSection targetId={Number(note.id)} targetType="note" />
              </div>
            </MainContent>
          </LayoutGrid>
        </PageContainer>
      </DetailPageLayout>
    </>
  );
};

export default NoteDetail;
