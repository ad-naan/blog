import React, { useMemo, useState, useCallback } from 'react';
import styled from '@emotion/styled';
import parse, { HTMLReactParserOptions, Element, domToReact } from 'html-react-parser';
import 'highlight.js/styles/atom-one-dark.css';
import '@/styles/rich-text.css';
import { RichTextParser } from '@/utils/editor/parser';
import { ImagePreview } from '@/components/content';
import { FiCopy, FiCheck, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { useClipboard } from '@/hooks';
import adnaan from 'adnaan-ui';

// 代码块容器
// 代码块容器 - 扁平化：仅保留边框分隔，无阴影
const CodeBlockContainer = styled.div`
  position: relative;
  margin: 1.5rem 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  transition: border-color 0.2s ease;

  &:hover {
    border-color: var(--text-tertiary, var(--border-color));
  }
`;

// 代码块头部
// 代码块头部 - 扁平化：纯色背景，无渐变/毛玻璃
const CodeBlockHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  padding-left: 4.5rem; /* 为圆点留出空间 */
  background: var(--bg-tertiary, var(--bg-primary));
  border-bottom: 1px solid var(--border-color);
  position: relative;

  /* Mac 风格圆点 */
  &::before {
    content: '';
    position: absolute;
    left: 1.2rem;
    top: 50%;
    transform: translateY(-50%);
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #ff5f56;
    box-shadow:
      18px 0 0 #ffbd2e,
      36px 0 0 #27c93f;
    opacity: 0.8;
    transition: opacity 0.2s;
  }

  &:hover::before {
    opacity: 1;
  }
`;

// 语言标签
const LanguageLabel = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0 0.5rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-family: var(--font-code);
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.5px;
  opacity: 0.7;
`;

// 复制按钮
// 复制按钮 - 扁平化：无边框外阴影、无位移动画
const CopyButton = styled.button<{ copied: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.7rem;
  border: 1px solid ${(props) => (props.copied ? 'var(--accent-color)' : 'var(--border-color)')};
  border-radius: 6px;
  background: ${(props) => (props.copied ? 'var(--accent-color)' : 'var(--bg-secondary)')};
  color: ${(props) => (props.copied ? 'white' : 'var(--text-secondary)')};
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease;

  &:hover {
    color: var(--accent-color);
    border-color: var(--accent-color);
  }
`;

// 代码内容区域
const CodeContent = styled.div<{ collapsed: boolean; maxHeight: number }>`
  position: relative;
  /* 折叠时限制高度，展开时无限高 */
  max-height: ${(props) => (props.collapsed ? `${props.maxHeight}px` : 'none')};
  overflow: hidden !important; /* 强制隐藏溢出，避免出现外层滚动条 */
  transition: max-height 0.3s ease;
  will-change: max-height;

  /* 遮罩效果：仅在折叠时显示 */
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 80px;
    background: linear-gradient(to bottom, transparent, var(--bg-secondary));
    opacity: ${(props) => (props.collapsed ? 1 : 0)};
    pointer-events: none;
    transition: opacity 0.3s;
  }

  [data-theme='dark'] &::after {
    background: linear-gradient(to bottom, transparent, #1e1e1e);
  }

  pre {
    /* 重置样式以适配容器 */
    margin: 0 !important;
    border: none !important;
    border-radius: 0 !important;
    background: transparent !important;

    /* 核心修复：强制取消高度限制和纵向滚动 */
    max-height: none !important;
    overflow-y: hidden !important;
    overflow-x: auto !important; /* 保持横向滚动 */

    code {
      background: transparent !important;
      border: none !important;
      padding: 0 !important;
      margin: 0 !important;
      overflow: visible !important;
      white-space: pre;
    }
  }
`;

// 展开按钮
const ExpandButton = styled.button`
  width: 100%;
  padding: 0.5rem;
  border: none;
  border-top: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 0.75rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  transition: all 0.2s;

  &:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  /* 深色模式优化 */
  [data-theme='dark'] & {
    background: #161616;
    border-top-color: #3e3e3e;
    color: #a0a0a0;

    &:hover {
      background: #252525;
      color: #d4d4d4;
    }
  }
`;

// 简化的代码块组件
interface SimpleCodeBlockProps {
  code: string;
  language?: string;
}

const SimpleCodeBlock: React.FC<SimpleCodeBlockProps> = React.memo(({ code, language }) => {
  const [highlightedCode, setHighlightedCode] = React.useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const codeBlockRef = React.useRef<HTMLDivElement>(null);

  // 使用 IntersectionObserver 实现懒加载高亮
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '200px', // 提前200px开始加载
        threshold: 0.01,
      },
    );

    if (codeBlockRef.current) {
      observer.observe(codeBlockRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // 动态高亮 - 只在可见时加载，使用 requestIdleCallback 优化性能
  React.useEffect(() => {
    if (!isVisible) return;

    let canceled = false;

    // 使用 requestIdleCallback 在浏览器空闲时执行高亮，避免阻塞主线程
    const scheduleHighlight = () => {
      if (canceled) return;

      const performHighlight = async () => {
        if (canceled) return;

        // 轻量 highlighter：只注册常用语言（与编辑器一致），按需异步加载
        const { highlightCode, escapeHtml } = await import('@/utils/editor/highlight');
        let html = '';
        try {
          html = highlightCode(code, language);
        } catch {
          html = escapeHtml(code);
        }
        if (!canceled) {
          // 使用 requestAnimationFrame 确保 DOM 更新在下一帧
          requestAnimationFrame(() => {
            if (!canceled) setHighlightedCode(html);
          });
        }
      };

      // 优先使用 requestIdleCallback，fallback 到 setTimeout
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(performHighlight, { timeout: 1000 });
      } else {
        setTimeout(performHighlight, 0);
      }
    };

    scheduleHighlight();

    return () => {
      canceled = true;
    };
  }, [code, language, isVisible]);

  // 计算代码行数
  const lineCount = useMemo(() => code.split('\n').length, [code]);
  const shouldShowExpand = lineCount > 20;
  const maxCollapsedHeight = 400;

  // 使用 useClipboard Hook
  const { copy, copied } = useClipboard({
    timeout: 2000,
    onSuccess: () => {
      adnaan.toast.success('代码已复制到剪贴板');
    },
    onError: (error) => {
      adnaan.toast.error('复制失败');
      console.error('复制失败:', error);
    },
  });

  const handleCopy = useCallback(() => {
    copy(code);
  }, [code, copy]);
  return (
    <CodeBlockContainer ref={codeBlockRef}>
      <CodeBlockHeader>
        <LanguageLabel>{language || 'plaintext'}</LanguageLabel>
        <CopyButton copied={copied} onClick={handleCopy}>
          {copied ? <FiCheck size={12} /> : <FiCopy size={12} />}
          {copied ? '已复制' : '复制'}
        </CopyButton>
      </CodeBlockHeader>
      <CodeContent collapsed={!isExpanded && shouldShowExpand} maxHeight={maxCollapsedHeight}>
        <pre>
          <code
            className={language ? `language-${language} hljs` : 'hljs'}
            dangerouslySetInnerHTML={{ __html: highlightedCode || code }}
          />
        </pre>
      </CodeContent>
      {shouldShowExpand && (
        <ExpandButton onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
          {isExpanded ? '收起代码' : `展开全部 (${lineCount} 行)`}
        </ExpandButton>
      )}
    </CodeBlockContainer>
  );
});

// 为 React.memo 组件设置 displayName
SimpleCodeBlock.displayName = 'SimpleCodeBlock';

// 富文本内容容器
const RichTextContainer = styled.div`
  /* 应用 rich-text-content 样式 */
  &.rich-text-content {
    /* 包含内联图片的段落 */
    p:has(img[data-display='inline']) {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      margin: 0.5rem 0;
    }
  }
`;

// 组件接口
interface RichTextRendererProps {
  content: string;
  className?: string;
  mode?: 'article' | 'note' | 'comment';
  enableCodeHighlight?: boolean;
  enableImagePreview?: boolean;
  enableTableOfContents?: boolean;
  onImageClick?: (src: string) => void;
}

const RichTextRenderer: React.FC<RichTextRendererProps> = ({
  content,
  className,
  mode = 'article',
  enableCodeHighlight = true,
  enableImagePreview = true,
  enableTableOfContents = false,
  onImageClick,
}) => {
  // 用于追踪标题 ID，确保唯一性
  const headingCounterRef = React.useRef<Map<string, number>>(new Map());
  // 处理内容：保护代码块不被破坏
  const processedContent = useMemo(() => {
    if (!content) return '';

    const extractedBlocks: Array<{ code: string; language: string }> = [];
    let processed = content;
    let index = 0;

    // 1. 提取所有代码块
    const codeBlockRegex = /<pre[^>]*>\s*<code(?:\s+class="language-(\w+)")?[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/g;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const language = match[1] || '';
      let code = match[2];

      // 解码HTML实体
      code = code
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');

      extractedBlocks.push({ code, language });
    }

    // 2. 用占位符替换代码块
    processed = processed.replace(
      /<pre[^>]*>\s*<code(?:\s+class="[^"]*")?[^>]*>[\s\S]*?<\/code>\s*<\/pre>/g,
      () => `%%%CODE_BLOCK_${index++}%%%`,
    );

    // 3. 对非代码块内容应用样式
    processed = RichTextParser.addContentStyles(processed);

    // 4. 将占位符替换回代码块HTML
    extractedBlocks.forEach((block, idx) => {
      const codeHtml = `<pre><code class="language-${block.language || 'plaintext'}">${block.code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')}</code></pre>`;
      processed = processed.replace(`%%%CODE_BLOCK_${idx}%%%`, () => codeHtml);
    });

    return processed;
  }, [content]);

  // 提取目录
  const tableOfContents = useMemo(() => {
    if (!enableTableOfContents) return [];

    const headings: Array<{ level: number; text: string; id: string }> = [];
    const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
    let match;

    while ((match = headingRegex.exec(processedContent)) !== null) {
      const level = parseInt(match[1]);
      const text = RichTextParser.extractText(match[2]);
      const id = text.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-');
      headings.push({ level, text, id });
    }

    return headings;
  }, [processedContent, enableTableOfContents]);

  // HTML 解析选项
  const parserOptions: HTMLReactParserOptions = useMemo(() => {
    // 每次解析时重置标题计数器
    headingCounterRef.current.clear();

    return {
      replace: (domNode) => {
        if (!(domNode instanceof Element)) return;
        const element = domNode as Element;

        // 处理代码块 - 使用 SimpleCodeBlock 组件
        if (
          enableCodeHighlight &&
          element.name === 'pre' &&
          element.children?.some((child: any) => child.name === 'code')
        ) {
          const codeElement = element.children?.find((child: any) => child.name === 'code') as any;

          // 提取语言
          const language = codeElement?.attribs?.class?.match(/language-(\w+)/)?.[1] || '';

          // 提取代码文本（递归处理所有子节点）
          const extractText = (node: any): string => {
            if (node.type === 'text') return node.data || '';
            if (node.children) return node.children.map(extractText).join('');
            return '';
          };

          // 解码HTML实体
          const code = (codeElement?.children?.map(extractText).join('') || '')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ');

          // 代码块组件由 SimpleCodeBlock 动态高亮，已支持懒加载
          return <SimpleCodeBlock code={code} language={language} />;
        }

        // 处理图片 - 注意：图片的显示模式由父级段落决定，这里只处理单独的图片
        // 如果图片在段落内且段落有多个图片，会在段落处理中统一处理
        if (enableImagePreview && element.name === 'img') {
          const src = element.attribs.src;
          const alt = element.attribs.alt || '';
          let width = element.attribs.width;
          let height = element.attribs.height;
          const align = element.attribs['data-align'] || 'center';
          const display = element.attribs['data-display'] || 'block';

          // 如果 width/height 属性不存在，尝试从 style 中提取
          if (!width || !height) {
            const styleAttr = element.attribs.style;
            if (styleAttr) {
              const widthMatch = styleAttr.match(/width:\s*(\d+)px/);
              const heightMatch = styleAttr.match(/height:\s*(\d+)px/);

              if (widthMatch) {
                width = widthMatch[1];
              }
              if (heightMatch) {
                height = heightMatch[1];
              }
            }
          }

          if (src) {
            // 内联模式 - 图片与文字同行
            if (display === 'inline') {
              return (
                <ImagePreview
                  src={src}
                  alt={alt}
                  style={{
                    display: 'inline-block',
                    maxHeight: '150px',
                    maxWidth: '200px',
                    width: width ? parseInt(width) : undefined,
                    height: 'auto',
                    margin: '0.25em',
                  }}
                />
              );
            }

            // 块级模式 - 独占一行
            const alignStyle =
              {
                left: 'flex-start',
                center: 'center',
                right: 'flex-end',
              }[align] || 'center';

            return (
              <span
                style={{
                  display: 'flex',
                  justifyContent: alignStyle,
                  margin: '1.5rem 0',
                  width: '100%',
                }}
              >
                <ImagePreview
                  src={src}
                  alt={alt}
                  {...(width && { width: parseInt(width) })}
                  {...(height && { height: parseInt(height) })}
                />
              </span>
            );
          }
        }

        // 处理 h2-h6 标题（文章模式 - 添加锚点）
        if (mode === 'article' && ['h2', 'h3', 'h4', 'h5', 'h6'].includes(element.name) && element.children) {
          // 递归提取所有文本内容（支持嵌套元素）
          const extractText = (node: any): string => {
            if (node.type === 'text') return node.data || '';
            if (node.children && Array.isArray(node.children)) {
              return node.children.map(extractText).join('');
            }
            return '';
          };

          const text = extractText({ children: element.children }).trim();

          // 确保文本不为空，否则不渲染标题
          if (!text) {
            return undefined;
          }

          // 生成基础 ID
          const baseId = `heading-${text
            .toLowerCase()
            .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 50)}`;

          // 确保 ID 唯一性：如果已存在相同 ID，添加计数后缀
          const counter = headingCounterRef.current;
          const count = counter.get(baseId) || 0;
          counter.set(baseId, count + 1);
          const id = count === 0 ? baseId : `${baseId}-${count}`;

          const HeadingTag = element.name as 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

          return (
            <HeadingTag id={id} className="article-heading">
              {domToReact(element.children as any, parserOptions)}
            </HeadingTag>
          );
        }

        // 处理段落 - 检测是否包含多个图片，让它们同行显示
        if (element.name === 'p' && element.children) {
          // 统计图片数量
          const images = element.children.filter((child: any) => child.name === 'img');
          const hasInlineImage = element.children.some((child: any) => {
            if (child.name === 'img') {
              return child.attribs?.['data-display'] === 'inline';
            }
            return false;
          });

          // 如果段落中有多个图片，或者有标记为 inline 的图片，使用 flex 布局
          if (images.length > 1 || hasInlineImage) {
            // 为段落中的所有图片设置内联样式
            const processedChildren = element.children.map((child: any, index: number) => {
              if (child.name === 'img') {
                const src = child.attribs?.src;
                const alt = child.attribs?.alt || '';
                let width = child.attribs?.width;
                let height = child.attribs?.height;

                // 从 style 中提取尺寸
                const styleAttr = child.attribs?.style;
                if (styleAttr) {
                  const widthMatch = styleAttr.match(/width:\s*(\d+)px/);
                  const heightMatch = styleAttr.match(/height:\s*(\d+)px/);
                  if (widthMatch) width = widthMatch[1];
                  if (heightMatch) height = heightMatch[1];
                }

                if (src) {
                  return (
                    <ImagePreview
                      key={index}
                      src={src}
                      alt={alt}
                      style={{
                        maxHeight: '150px',
                        maxWidth: '200px',
                        width: width ? parseInt(width) : undefined,
                        height: 'auto',
                      }}
                    />
                  );
                }
              }
              // 非图片元素正常处理
              return domToReact([child] as any, parserOptions);
            });

            return (
              <p
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '0.5rem',
                  margin: '0.5rem 0',
                }}
              >
                {processedChildren}
              </p>
            );
          }
        }

        // 默认返回 undefined，让解析器使用默认处理
        return undefined;
      },
    };
  }, [enableCodeHighlight, enableImagePreview, onImageClick, mode]);

  // 解析 HTML 为 React 元素
  const parsedContent = useMemo(() => {
    if (!processedContent) return null;

    try {
      return parse(processedContent, parserOptions);
    } catch (error) {
      console.error('解析 HTML 失败:', error);
      return <div>内容解析失败</div>;
    }
  }, [processedContent, parserOptions]);

  return (
    <RichTextContainer className={`rich-text-content ${className || ''}`} data-mode={mode}>
      {/* 目录 */}
      {enableTableOfContents && tableOfContents.length > 0 && (
        <div
          className="table-of-contents"
          style={{
            marginBottom: '2rem',
            padding: '1rem',
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
          }}
        >
          <h4 style={{ margin: '0 0 1rem', color: 'var(--text-primary)' }}>目录</h4>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {tableOfContents.map((item, index) => (
              <li
                key={index}
                style={{
                  marginLeft: `${(item.level - 1) * 1}rem`,
                  marginBottom: '0.5rem',
                }}
              >
                <a
                  href={`#${item.id}`}
                  style={{
                    color: 'var(--accent-color)',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                  }}
                >
                  {item.text}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 主要内容 */}
      {parsedContent}
    </RichTextContainer>
  );
};

export default RichTextRenderer;
