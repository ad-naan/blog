import React, { useEffect, memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import { FiFileText, FiArrowLeft } from 'react-icons/fi';
import LazyRichTextRenderer from '@/components/rich-text/lazy-rich-text-renderer';
import RichTextContent from '@/components/rich-text/rich-text-content';
import { ImagePreview } from '@/components/content';
import type { Article } from '@/types';
import { useAnimationEngine } from '@/utils/ui/animation';
import { getTimeAgo, formatDate as formatDateUtil } from '@/utils';
import { RichTextParser } from '@/utils/editor/parser';

// 文章详情页容器
const ArticleDetailContainer = styled(motion.div)`
  width: 100%;
  padding: 2.5rem 1rem 0;
`;

// 文章标题
const ArticleDetailTitle = styled.h1`
  font-size: 2.25rem;
  font-weight: 700;
  margin-bottom: 1rem;
  line-height: 1.3;

  @media (max-width: 768px) {
    font-size: 1.75rem;
  }
`;

// 返回列表链接 - 顶部左侧带返回箭头
const ArticleBackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0 0 0.75rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
  transition: color 0.2s ease;

  svg {
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  &:hover {
    color: var(--accent-color);

    svg {
      transform: translateX(-4px);
    }
  }
`;

// 文章标题区 - 居中
const ArticleDetailHeader = styled.div`
  margin: 0 0 2rem;
  text-align: center;
`;

// 文章元信息 - 单行 · 分隔，无图标
const ArticleDetailMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin-top: 0.75rem;

  span {
    display: inline-flex;
    align-items: center;
    gap: 0;
  }

  /* 「·」分隔符 */
  span + span::before {
    content: '·';
    margin: 0 0.55em;
    color: var(--text-tertiary, var(--text-secondary));
  }
`;

// 文章封面图
const ArticleCover = styled.div`
  margin-bottom: 2rem;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);

  img {
    width: 100%;
    height: auto;
    object-fit: cover;
  }

  [data-theme='dark'] & {
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  }
`;



// AI摘要区 - 中性浅灰底圆角块，铺满与正文对齐
const AISummarySection = styled.section`
  margin: 0 0 2rem;
  padding: 0.8rem 1.1rem;
  background: rgba(128, 128, 128, 0.08);
  border-radius: 8px;
`;

// AI摘要内容 - 摘要：前缀内联
const AISummaryContent = styled.div`
  font-size: 0.9rem;
  line-height: 1.8;
  color: var(--text-secondary);
  letter-spacing: 0.01em;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;

  svg {
    flex-shrink: 0;
    margin-top: 0.3rem;
    color: var(--text-tertiary, var(--text-secondary));
  }
`;



// 文章内容容器 - 继承统一的 RichTextContent 并添加文章特定样式
const ArticleContentWrapper = styled(RichTextContent)`
  /* 文章页面基础设置 */
  min-height: 300px;
  position: relative;
  width: 100%;
  /* 覆盖 RichTextContent 默认 padding: 2rem 0，避免与摘要卡片的 margin 叠加出大空隙 */
  padding: 0 0 2rem;
  h2.article-heading {
    position: relative;
    padding-bottom: 0.5rem;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 40px;
      height: 3px;
      background: var(--accent-color);
      border-radius: 2px;
    }
  }

  /* ========== 文章特定：目录导航滚动偏移 ========== */
  h2.article-heading,
  h3.article-heading,
  h4.article-heading,
  h5.article-heading,
  h6.article-heading {
    scroll-margin-top: 100px; /* 避免被 Header 遮挡 */
  }

  /* ========== 文章特定：标题高亮效果（点击目录跳转时） ========== */
  .target-highlight {
    background-color: rgba(var(--accent-rgb, 81, 131, 245), 0.1) !important;
    padding: 0.5rem !important;
    border-radius: 8px !important;
    transition: all 0.3s ease !important;
  }
`;

// 文章标签
const ArticleTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 2rem;
`;

// 标签项 - 胶囊风格，与手记页 Tag 体系统一
const ArticleTag = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.9rem;
  background: rgba(var(--accent-rgb), 0.06);
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  color: var(--accent-color);
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    background: var(--accent-color);
    border-color: var(--accent-color);
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(var(--accent-rgb), 0.3);
  }
`;

// 添加作者信息显示
const AuthorInfo = styled.div`
  display: flex;
  align-items: center;
  margin-top: 0.5rem;

  span {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }
`;

interface ArticleContentProps {
  article: Article;
  contentRef: React.RefObject<HTMLDivElement>;
  onHeadingsExtracted?: (headings: { id: string; text: string; level: number; element: HTMLElement }[]) => void;
}

// 使用memo包装组件，避免不必要的重渲染
const ArticleContent: React.FC<ArticleContentProps> = memo(({ article, contentRef, onHeadingsExtracted }) => {
  const { variants } = useAnimationEngine();
  const articleTags = useMemo(() => {
    if (!article.tags || !Array.isArray(article.tags)) return null;

    return article.tags.map((tag: any, index: number) => {
      // 处理标签可能是字符串或对象的情况
      const tagName = typeof tag === 'string' ? tag : tag?.name || String(tag);
      const tagId = typeof tag === 'string' ? index : tag?.id || index;

      return <ArticleTag key={tagId}>#{tagName}</ArticleTag>;
    });
  }, [article.tags]);

  // 内容渲染完成后，提取标题并通知父组件
  useEffect(() => {
    if (!contentRef?.current || !onHeadingsExtracted) return;

    // 使用 requestAnimationFrame 确保 DOM 完全渲染
    const rafId = requestAnimationFrame(() => {
      if (!contentRef.current) return;

      // 查找所有标题元素
      const headingElements = Array.from(contentRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6'));

      if (headingElements.length === 0) {
        onHeadingsExtracted([]);
        return;
      }

      const extractedHeadings = headingElements
        .map((element) => {
          const headingText = element.textContent?.trim() || '';
          if (!headingText) return null;

          const tagName = element.tagName.toLowerCase();
          const level = parseInt(tagName.substring(1));

          // 自动添加 article-heading 类
          element.classList.add('article-heading');

          // 生成或使用现有 ID
          let headingId = element.id;
          if (!headingId) {
            headingId = `heading-${headingText
              .toLowerCase()
              .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-')
              .replace(/^-+|-+$/g, '')
              .substring(0, 50)}`;
            element.id = headingId;
          }

          return {
            id: headingId,
            text: headingText,
            level,
            element: element as HTMLElement,
          };
        })
        .filter((h): h is { id: string; text: string; level: number; element: HTMLElement } => h !== null);

      onHeadingsExtracted(extractedHeadings);
    });

    return () => cancelAnimationFrame(rafId);
  }, [contentRef, article.content, onHeadingsExtracted]);

  const authorName =
    typeof article.author === 'object'
      ? article.author?.fullName || article.author?.username
      : article.author || '匿名';

  // 使用 formatDateUtil 避免时区偏移（toISOString 会把东八区晚间时间显示成前一天）
  const formatDate = (dateStr?: string) => (dateStr ? formatDateUtil(dateStr, 'YYYY-MM-DD') : '');

  // 使用 useMemo 缓存阅读时间计算，避免频繁调用 extractText 导致图片重复加载
  const readTime = useMemo(() => RichTextParser.calculateReadingTime(article.content || ''), [article.content]);

  return (
    <ArticleDetailContainer initial="hidden" animate="visible" variants={variants.fadeIn}>
      <ArticleBackLink to="/blog">
        <FiArrowLeft size={16} />
        <span>返回列表</span>
      </ArticleBackLink>
      <ArticleDetailHeader>
        <ArticleDetailTitle>{article.title}</ArticleDetailTitle>
        <ArticleDetailMeta>
          <span title="作者">{authorName}</span>
          <span title="发布时间">{formatDate(article.publishedAt || article.createdAt)}</span>
          {article.lastReadAt && (
            <span title={`上次阅读：${formatDateUtil(article.lastReadAt, 'YYYY-MM-DD HH:mm:ss')}`}>
              {getTimeAgo(article.lastReadAt)}阅读
            </span>
          )}
          <span title="预计阅读时长">约 {readTime} 分钟</span>
        </ArticleDetailMeta>
      </ArticleDetailHeader>

      <AISummarySection>
        <AISummaryContent>
          <FiFileText size={15} />
          <p style={{ margin: 0 }}>
            <strong style={{ fontWeight: 600 }}>摘要：</strong>
            {article.summary || '本文为您提供了详细的内容和指南。'}
          </p>
        </AISummaryContent>
      </AISummarySection>


      {article.image && (
        <ArticleCover>
          <ImagePreview
            src={article.image}
            alt={article.title}
            style={{
              width: '100%',
            }}
          />
        </ArticleCover>
      )}

      {/* 使用LazyRichTextRenderer处理长文章，优化性能 */}
      <ArticleContentWrapper ref={contentRef} className="rich-text-content">
        <LazyRichTextRenderer
          content={article.content || ''}
          mode="article"
          enableCodeHighlight={true}
          enableImagePreview={true}
          enableTableOfContents={false}
          chunkSize={10000}
        />
      </ArticleContentWrapper>

      {articleTags && <ArticleTags>{articleTags}</ArticleTags>}
    </ArticleDetailContainer>
  );
});

// 添加显示名称以便于调试
ArticleContent.displayName = 'ArticleContent';

export default ArticleContent;
