/**
 * 表格浮动菜单 - 表格操作工具栏
 */
import React, { useEffect, useState, useCallback } from 'react';
import styled from '@emotion/styled';
import { Editor } from '@tiptap/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus,
  FiMinus,
  FiTrash2,
  FiChevronLeft,
  FiChevronRight,
  FiChevronUp,
  FiChevronDown,
} from 'react-icons/fi';

interface TableFloatingMenuProps {
  editor: Editor;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const TableFloatingMenu: React.FC<TableFloatingMenuProps> = ({
  editor,
  containerRef,
}) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isVisible, setIsVisible] = useState(false);

  const updatePosition = useCallback(() => {
    if (!editor.isActive('table')) {
      setIsVisible(false);
      return;
    }

    const { view } = editor;
    const tableElement = view.dom.querySelector('table');
    
    if (!tableElement || !containerRef.current) {
      setIsVisible(false);
      return;
    }

    const tableRect = tableElement.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    setPosition({
      top: tableRect.top - containerRect.top - 48,
      left: tableRect.left - containerRect.left,
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

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <MenuContainer
        style={{ top: position.top, left: position.left }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.12 }}
      >
        {/* 列操作 */}
        <MenuGroup>
          <ToolBtn
            onClick={() => editor.chain().focus().addColumnBefore().run()}
            title="在左侧插入列"
          >
            <FiChevronLeft size={12} />
            <FiPlus size={10} />
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            title="在右侧插入列"
          >
            <FiPlus size={10} />
            <FiChevronRight size={12} />
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().deleteColumn().run()}
            title="删除列"
            danger
          >
            <ColIcon />
            <FiMinus size={10} />
          </ToolBtn>
        </MenuGroup>

        <Divider />

        {/* 行操作 */}
        <MenuGroup>
          <ToolBtn
            onClick={() => editor.chain().focus().addRowBefore().run()}
            title="在上方插入行"
          >
            <FiChevronUp size={12} />
            <FiPlus size={10} />
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().addRowAfter().run()}
            title="在下方插入行"
          >
            <FiPlus size={10} />
            <FiChevronDown size={12} />
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().deleteRow().run()}
            title="删除行"
            danger
          >
            <RowIcon />
            <FiMinus size={10} />
          </ToolBtn>
        </MenuGroup>

        <Divider />

        {/* 单元格操作 */}
        <MenuGroup>
          <ToolBtn
            onClick={() => editor.chain().focus().mergeCells().run()}
            title="合并单元格"
            disabled={!editor.can().mergeCells()}
          >
            <MergeIcon />
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().splitCell().run()}
            title="拆分单元格"
            disabled={!editor.can().splitCell()}
          >
            <SplitIcon />
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().deleteTable().run()}
            title="删除表格"
            danger
          >
            <FiTrash2 size={14} />
          </ToolBtn>
        </MenuGroup>
      </MenuContainer>
    </AnimatePresence>
  );
};

// 图标组件
const ColIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="3" width="6" height="18" rx="1" />
  </svg>
);

const RowIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="9" width="18" height="6" rx="1" />
  </svg>
);

const MergeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 3v18M3 9h18" />
  </svg>
);

const SplitIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="12" y1="3" x2="12" y2="21" />
    <line x1="3" y1="12" x2="21" y2="12" />
  </svg>
);

// 样式
const MenuContainer = styled(motion.div)`
  position: absolute;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 50;
  white-space: nowrap;

  [data-theme='dark'] & {
    background: #1a1a1a;
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
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

interface ToolBtnProps {
  danger?: boolean;
  disabled?: boolean;
}

const ToolBtn = styled.button<ToolBtnProps>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1px;
  min-width: 28px;
  height: 28px;
  padding: 0 4px;
  border: none;
  background: transparent;
  color: ${(props) => (props.danger ? 'var(--error-color, #ef4444)' : 'var(--text-primary)')};
  border-radius: 6px;
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  opacity: ${(props) => (props.disabled ? 0.4 : 1)};
  transition: all 0.12s ease;

  &:hover:not(:disabled) {
    background: ${(props) =>
      props.danger ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-secondary)'};
    color: ${(props) => (props.danger ? 'var(--error-color)' : 'var(--accent-color)')};
  }

  &:active:not(:disabled) {
    transform: scale(0.92);
  }
`;

export default TableFloatingMenu;
