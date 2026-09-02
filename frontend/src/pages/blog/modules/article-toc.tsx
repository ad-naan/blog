import React, { memo, useMemo, useState, useEffect, useCallback } from 'react';
import styled from '@emotion/styled';
import { motion, AnimatePresence } from 'framer-motion';
import { FiHeart, FiBookmark, FiShare2, FiMessageSquare } from 'react-icons/fi';
import { useAnimationEngine } from '@/utils/ui/animation';
import { FadeScrollContainer } from '@/components/common/fade-scroll-container';
import ShareModal from './share-modal';

const SidebarWrapper = styled(motion.div)`
  position: relative;
  width: 280px;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0; /* 允许 flex 子项收缩，使内部滚动区生效 */
  padding: 2rem 1rem 0;
`;



// 目录容器
const TocContainer = styled.div`
  flex: 1;
  min-height: 0; /* flex 布局内允许收缩，让 overflow 生效 */
  overflow-y: auto;
  transition: all 0.3s ease;
  /* 隐藏滚动条，用上下虚化渐变提示可滚动 */
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 860px) {
    max-height: 300px;
  }
`;

// 工具栏容器 - 仿 Shiro 风格
const ToolbarContainer = styled.div<{ isBottom: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: auto;
  padding-top: 2rem;
  padding-left: 1rem; /* 默认左边距 */

  /* 
    旋转中心：以最底部的分享按钮中心为轴
    X轴: padding-left (16px) + button_width/2 (20px) = 36px
    Y轴: 底部 - button_height/2 (20px) = calc(100% - 20px)
  */
  transform-origin: 36px calc(100% - 20px);

  /* 顺时针旋转 90 度 */
  transform: ${(props) => (props.isBottom ? 'rotate(90deg)' : 'rotate(0deg)')};

  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  opacity: 1;

  /* 底部状态时的微调 */
  ${(props) =>
    props.isBottom &&
    `
    /* 旋转后，不需要额外的 margin/padding 调整，依赖 transform-origin 定位 */
  `}
`;

// 分隔线
const Divider = styled.div`
  width: 100%;
  height: 1px;
  background: var(--border-color);
  margin: 1rem 0;
`;

// 环形进度条容器
const CircularProgressContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  padding: 4px 0 4px 16px;
  margin-bottom: 1rem;
`;

// 环形进度条 SVG
const CircularProgress = styled.svg`
  transform: rotate(-90deg);
  width: 14px;
  height: 14px;
  flex-shrink: 0;
`;

// 进度文本（在圆圈后面）
const ProgressText = styled.div`
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--text-secondary);
  white-space: nowrap;
`;

// 工具按钮
const ToolButton = styled.button<{ active?: boolean; isBottom?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid ${(props) => (props.active ? 'var(--accent-color)' : 'transparent')};
  background: ${(props) => (props.active ? 'var(--accent-color-alpha)' : 'transparent')};
  color: ${(props) => (props.active ? 'var(--accent-color)' : 'var(--text-secondary)')};
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  flex-shrink: 0;
  overflow: visible;

  /* 图标反向旋转，保持直立 */
  svg {
    transform: ${(props) => (props.isBottom ? 'rotate(-90deg)' : 'rotate(0deg)')};
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  &:hover {
    border-color: var(--accent-color);
    color: var(--accent-color);
    background: var(--accent-color-alpha);
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
`;

// 徽章（用于点赞数等）
const Badge = styled.span`
  position: absolute;
  top: -2px;
  right: -2px;
  background: var(--accent-color);
  color: white;
  font-size: 0.6rem;
  font-weight: 700;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border: 2px solid var(--bg-primary);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 2;
`;

// 目录列表容器
const TocList = styled.div`
  position: relative;
  overflow-x: hidden;
`;

// 目录项
const TocItem = styled.div<{ active: boolean; level: number }>`
  position: relative;
  padding: 4px 0 4px ${(props) => 16 + (props.level - 2) * 16}px; /* 恢复原来的缩进逻辑 */
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  /* 恢复选中状态时的短线指示器 */
  &:before {
    content: '';
    position: absolute;
    left: ${(props) => (props.level - 2) * 16}px;
    top: 50%;
    transform: translateY(-50%);
    width: ${(props) => (props.active ? '8px' : '0')};
    height: 2px;
    background-color: var(--accent-color);
    transition:
      width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
      opacity 0.3s ease;
    opacity: ${(props) => (props.active ? '1' : '0')};
  }

  &:hover:before {
    width: 8px;
    opacity: 1;
    background-color: var(--accent-color);
  }

  span {
    font-size: ${(props) => (props.level === 2 ? '0.85rem' : props.level === 3 ? '0.82rem' : '0.8rem')};
    color: ${(props) => (props.active ? 'var(--text-primary)' : 'var(--text-secondary)')};
    font-weight: ${(props) => (props.active ? '500' : props.level === 2 ? '500' : 'normal')};
    transition:
      color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
      transform 0.2s ease,
      opacity 0.3s ease;
    display: block;
    line-height: 1.4;
    position: relative;
    z-index: 1;
    opacity: ${(props) => (props.level > 3 ? 0.85 : 1)};
  }

  &:hover span {
    color: var(--text-primary);
    transform: translateX(2px);
    opacity: 1;
  }
`;

interface ArticleTocProps {
  headings: { id: string; text: string; level: number }[];
  activeHeading: string;
  readingProgress: number;
  onHeadingClick?: (id: string) => void;
  liked: boolean;
  bookmarked: boolean;
  commentCount?: number;
  onLike: () => void;
  onBookmark: () => void;
  onCommentClick: () => void;
  articleData?: {
    title: string;
    excerpt: string;
    author: string;
    coverImage?: string;
  };
}

const ArticleToc: React.FC<ArticleTocProps> = memo(
  ({
    headings,
    activeHeading,
    readingProgress,
    onHeadingClick,
    liked,
    bookmarked,
    commentCount = 0,
    onLike,
    onBookmark,
    onCommentClick,
    articleData,
  }) => {
    const { variants } = useAnimationEngine();
    const [isBottom, setIsBottom] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);

    const checkScroll = useCallback(() => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const distanceToBottom = documentHeight - (scrollTop + windowHeight);

      setIsBottom(distanceToBottom < 300);
    }, []);

    useEffect(() => {
      checkScroll();
      window.addEventListener('scroll', checkScroll, { passive: true });
      return () => window.removeEventListener('scroll', checkScroll);
    }, [checkScroll]);

    const radius = 5.5;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (readingProgress / 100) * circumference;

    const renderedHeadings = useMemo(() => {
      if (headings.length === 0) {
        return (
          <div style={{ padding: '1rem', color: 'var(--text-tertiary)', fontSize: '0.85rem', fontStyle: 'italic' }}>
            暂无目录
          </div>
        );
      }

      return headings.map((heading) => (
        <TocItem
          key={heading.id}
          active={activeHeading === heading.id}
          level={heading.level}
          onClick={() => onHeadingClick?.(heading.id)}
        >
          <span>{heading.text}</span>
        </TocItem>
      ));
    }, [headings, activeHeading, onHeadingClick]);

    return (
      <>
        <SidebarWrapper initial="hidden" animate="visible" variants={variants.fadeIn}>
          {/* 顶部：目录列表 - 无标题，滚动条隐藏，用上下虚化渐变提示可滚动 */}
          <FadeScrollContainer
            dependencies={[headings.length]}
            style={{ flex: '1', minHeight: 0, display: 'flex', flexDirection: 'column' }}
          >
            <TocContainer>
              <TocList>{renderedHeadings}</TocList>
            </TocContainer>
          </FadeScrollContainer>

          {/* 分隔线 */}
          <Divider />

          {/* 中间：环形阅读进度 */}
          <CircularProgressContainer>
            <CircularProgress>
              <circle cx="7" cy="7" r={radius} fill="none" stroke="var(--bg-secondary)" strokeWidth="1.5" />
              <circle
                cx="7"
                cy="7"
                r={radius}
                fill="none"
                stroke="var(--accent-color)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'stroke-dashoffset 0.3s ease' }}
              />
            </CircularProgress>
            <ProgressText>{readingProgress}% 已阅读</ProgressText>
          </CircularProgressContainer>

          {/* 底部：垂直工具栏 (Shiro 风格) */}
          <ToolbarContainer isBottom={isBottom}>
            <ToolButton active={liked} isBottom={isBottom} onClick={onLike} aria-label="点赞" title="点赞">
              <FiHeart size={20} fill={liked ? 'currentColor' : 'none'} />
              {liked && <Badge>1</Badge>}
            </ToolButton>

            <ToolButton isBottom={isBottom} onClick={onCommentClick} aria-label="评论" title="评论">
              <FiMessageSquare size={20} />
              {commentCount > 0 && <Badge>{commentCount > 99 ? '99+' : commentCount}</Badge>}
            </ToolButton>

            <ToolButton active={bookmarked} isBottom={isBottom} onClick={onBookmark} aria-label="收藏" title="收藏">
              <FiBookmark size={20} fill={bookmarked ? 'currentColor' : 'none'} />
            </ToolButton>

            <ToolButton isBottom={isBottom} onClick={() => setShowShareModal(true)} aria-label="分享" title="分享">
              <FiShare2 size={20} />
            </ToolButton>
          </ToolbarContainer>
        </SidebarWrapper>

        {/* 分享模态框 */}
        {articleData && (
          <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} article={articleData} />
        )}
      </>
    );
  },
);

ArticleToc.displayName = 'ArticleToc';

export default ArticleToc;
