/**
 * 选中文本浮动菜单 - 类似飞书/语雀的选中工具栏
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import styled from '@emotion/styled';
import { Editor } from '@tiptap/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiBold,
  FiItalic,
  FiUnderline,
  FiCode,
  FiLink,
  FiType,
} from 'react-icons/fi';

interface SelectionMenuProps {
  editor: Editor;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onLinkClick: () => void;
}

export const SelectionMenu: React.FC<SelectionMenuProps> = ({
  editor,
  containerRef,
  onLinkClick,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const { selection } = editor.state;
    const { empty, from, to } = selection;

    // 只在有选中文本时显示
    if (empty || from === to) {
      setIsVisible(false);
      return;
    }

    // 不在代码块中显示
    if (editor.isActive('codeBlock')) {
      setIsVisible(false);
      return;
    }

    const { view } = editor;
    const start = view.coordsAtPos(from);
    const end = view.coordsAtPos(to);

    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();

    // 菜单宽度
    const menuWidth = 300;
    const centerX = (start.left + end.left) / 2;
    let left = centerX - containerRect.left - menuWidth / 2;

    // 边界检测
    left = Math.max(8, Math.min(left, containerRect.width - menuWidth - 8));

    setPosition({
      top: start.top - containerRect.top - 52,
      left,
    });
    setIsVisible(true);
  }, [editor, containerRef]);

  useEffect(() => {
    editor.on('selectionUpdate', updatePosition);
    editor.on('transaction', updatePosition);

    return () => {
      editor.off('selectionUpdate', updatePosition);
      editor.off('transaction', updatePosition);
    };
  }, [editor, updatePosition]);

  // 链接处理
  const handleLink = () => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
    } else {
      onLinkClick();
    }
  };

  // 标题切换
  const toggleHeading = (level: 1 | 2 | 3) => {
    editor.chain().focus().toggleHeading({ level }).run();
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <MenuContainer
        ref={menuRef}
        style={{ top: position.top, left: position.left }}
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.95 }}
        transition={{ duration: 0.12 }}
      >
        {/* 文本格式 */}
        <MenuGroup>
          <ToolButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="加粗 Ctrl+B"
          >
            <FiBold />
          </ToolButton>
          <ToolButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="斜体 Ctrl+I"
          >
            <FiItalic />
          </ToolButton>
          <ToolButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            title="下划线 Ctrl+U"
          >
            <FiUnderline />
          </ToolButton>
          <ToolButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            title="删除线"
          >
            <StrikeIcon />
          </ToolButton>
          <ToolButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive('code')}
            title="行内代码"
          >
            <FiCode />
          </ToolButton>
        </MenuGroup>

        <Divider />

        {/* 链接 */}
        <MenuGroup>
          <ToolButton
            onClick={handleLink}
            active={editor.isActive('link')}
            title="链接"
          >
            <FiLink />
          </ToolButton>
        </MenuGroup>

        <Divider />

        {/* 标题 */}
        <MenuGroup>
          <ToolButton
            onClick={() => toggleHeading(1)}
            active={editor.isActive('heading', { level: 1 })}
            title="标题 1"
          >
            <HeadingText>H1</HeadingText>
          </ToolButton>
          <ToolButton
            onClick={() => toggleHeading(2)}
            active={editor.isActive('heading', { level: 2 })}
            title="标题 2"
          >
            <HeadingText>H2</HeadingText>
          </ToolButton>
          <ToolButton
            onClick={() => toggleHeading(3)}
            active={editor.isActive('heading', { level: 3 })}
            title="标题 3"
          >
            <HeadingText>H3</HeadingText>
          </ToolButton>
        </MenuGroup>
      </MenuContainer>
    </AnimatePresence>
  );
};

// 删除线图标
const StrikeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="4" y1="12" x2="20" y2="12" />
    <path d="M17.5 7.5c0-2-1.5-3.5-5.5-3.5s-5.5 1.5-5.5 3.5c0 2 1.5 3 5.5 4.5" />
    <path d="M6.5 16.5c0 2 1.5 3.5 5.5 3.5s5.5-1.5 5.5-3.5" />
  </svg>
);

// 标题文字
const HeadingText = styled.span`
  font-size: 11px;
  font-weight: 700;
`;

// 样式
const MenuContainer = styled(motion.div)`
  position: absolute;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  z-index: 50;

  [data-theme='dark'] & {
    background: #1a1a1a;
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
  }

  /* 底部箭头 */
  &::after {
    content: '';
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%);
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid var(--bg-primary);
  }

  &::before {
    content: '';
    position: absolute;
    bottom: -7px;
    left: 50%;
    transform: translateX(-50%);
    border-left: 7px solid transparent;
    border-right: 7px solid transparent;
    border-top: 7px solid var(--border-color);
  }

  [data-theme='dark'] &::after {
    border-top-color: #1a1a1a;
  }

  [data-theme='dark'] &::before {
    border-top-color: rgba(255, 255, 255, 0.1);
  }
`;

const MenuGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`;

const Divider = styled.div`
  width: 1px;
  height: 20px;
  background: var(--border-color);
  margin: 0 6px;
`;

const ToolButton = styled.button<{ active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  background: ${(props) => (props.active ? 'var(--accent-color)' : 'transparent')};
  color: ${(props) => (props.active ? '#fff' : 'var(--text-primary)')};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.12s ease;

  svg {
    width: 15px;
    height: 15px;
  }

  &:hover {
    background: ${(props) => (props.active ? 'var(--accent-color)' : 'var(--bg-secondary)')};
  }

  &:active {
    transform: scale(0.94);
  }
`;

export default SelectionMenu;
