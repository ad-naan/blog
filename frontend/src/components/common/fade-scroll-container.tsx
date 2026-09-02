import React, { useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';

// 容器样式
const FadeContainer = styled.div<{
  showTopFade?: boolean;
  showBottomFade?: boolean;
  fadeHeight?: number;
  className?: string;
}>`
  position: relative;
  /* clip 不会像 hidden 那样把另一轴计算为 auto，避免自身变成滚动容器，
     否则滚动条会露出且 ::before/::after 遮罩会跟随内容滚动 */
  overflow-x: clip;
  overflow-y: clip;

  /* 顶部虚化遮罩 */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: ${({ fadeHeight = 40 }) => fadeHeight}px;
    background: linear-gradient(
      to bottom,
      var(--bg-primary, #ffffff) 0%,
      var(--bg-primary, #ffffff) 30%,
      transparent 100%
    );
    pointer-events: none;
    z-index: 10;
    opacity: ${({ showTopFade }) => (showTopFade ? 1 : 0)};
    transition: opacity 0.3s ease;
  }

  /* 底部虚化遮罩 */
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: ${({ fadeHeight = 40 }) => fadeHeight}px;
    background: linear-gradient(
      to top,
      var(--bg-primary, #ffffff) 0%,
      var(--bg-primary, #ffffff) 30%,
      transparent 100%
    );
    pointer-events: none;
    z-index: 10;
    opacity: ${({ showBottomFade }) => (showBottomFade ? 1 : 0)};
    transition: opacity 0.3s ease;
  }

  /* 深色主题适配 */
  [data-theme='dark'] & {
    &::before {
      background: linear-gradient(
        to bottom,
        var(--bg-primary, #111827) 0%,
        var(--bg-primary, #111827) 30%,
        transparent 100%
      );
    }

    &::after {
      background: linear-gradient(
        to top,
        var(--bg-primary, #111827) 0%,
        var(--bg-primary, #111827) 30%,
        transparent 100%
      );
    }
  }
`;

// Props 接口
export interface FadeScrollContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  fadeHeight?: number; // 遮罩高度，默认 40px
  scrollThreshold?: number; // 滚动阈值，默认 10px
  dependencies?: any[]; // 依赖项，当这些值变化时重新检查滚动状态
}

/**
 * 带虚化遮罩效果的滚动容器
 * 自动检测滚动位置，在顶部和底部显示渐变遮罩效果
 */
export const FadeScrollContainer: React.FC<FadeScrollContainerProps> = ({
  children,
  className,
  fadeHeight = 40,
  scrollThreshold = 10,
  dependencies = [],
  ...rest
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 查找滚动容器的辅助函数
    const findScrollElement = (): HTMLElement | null => {
      // 方法1: 查找有 overflow-y: auto 或 scroll 的元素
      const allElements = container.querySelectorAll('*');
      for (const el of Array.from(allElements)) {
        const htmlEl = el as HTMLElement;
        const style = window.getComputedStyle(htmlEl);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          return htmlEl;
        }
      }
      // 方法2: 如果找不到，查找第一个有滚动条的子元素
      const firstChild = container.firstElementChild as HTMLElement;
      if (firstChild && firstChild.scrollHeight > firstChild.clientHeight) {
        return firstChild;
      }
      return null;
    };

    const handleScroll = () => {
      const scrollElement = findScrollElement();
      if (!scrollElement) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      const isAtTop = scrollTop <= scrollThreshold;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - scrollThreshold;

      setShowTopFade(!isAtTop);
      setShowBottomFade(!isAtBottom);
    };

    // 初始检查
    const checkInitialState = () => {
      const scrollElement = findScrollElement();
      if (scrollElement) {
        const { scrollHeight, clientHeight, scrollTop } = scrollElement;
        // 如果内容不足以滚动，隐藏所有遮罩
        if (scrollHeight <= clientHeight) {
          setShowBottomFade(false);
          setShowTopFade(false);
        } else {
          setShowBottomFade(true);
          // 检查初始滚动位置
          setShowTopFade(scrollTop > scrollThreshold);
        }
        handleScroll();
      }
    };

    // 延迟检查，确保子组件已渲染
    const timers: NodeJS.Timeout[] = [];
    timers.push(setTimeout(checkInitialState, 100));
    timers.push(setTimeout(checkInitialState, 300)); // 二次检查，确保内容已加载

    // 查找滚动元素并监听
    let scrollElement: HTMLElement | null = null;
    const attachScrollListener = () => {
      const element = findScrollElement();
      if (element && element !== scrollElement) {
        // 如果找到了新的滚动元素，移除旧的监听器
        if (scrollElement) {
          scrollElement.removeEventListener('scroll', handleScroll);
        }
        scrollElement = element;
        scrollElement.addEventListener('scroll', handleScroll, { passive: true });
      }
    };

    // 初始附加监听器
    attachScrollListener();

    // 使用 MutationObserver 监听内容变化
    const observer = new MutationObserver(() => {
      // 延迟检查，避免频繁触发
      const timer = setTimeout(() => {
        attachScrollListener();
        checkInitialState();
      }, 50);
      timers.push(timer);
    });

    if (container) {
      observer.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style'],
      });
    }

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      if (scrollElement) {
        scrollElement.removeEventListener('scroll', handleScroll);
      }
      observer.disconnect();
    };
  }, [scrollThreshold, ...dependencies]);

  return (
    <FadeContainer
      ref={containerRef}
      showTopFade={showTopFade}
      showBottomFade={showBottomFade}
      fadeHeight={fadeHeight}
      className={className}
      {...rest}
    >
      {children}
    </FadeContainer>
  );
};

export default FadeScrollContainer;
