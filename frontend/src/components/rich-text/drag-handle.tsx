/**
 * 块级拖拽手柄 - 类似 Notion/飞书的左侧操作按钮
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import { Editor } from '@tiptap/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus,
  FiMoreVertical,
  FiCopy,
  FiTrash2,
  FiType,
  FiList,
  FiCheckSquare,
  FiCode,
  FiMessageSquare,
  FiGrid,
  FiMinus,
} from 'react-icons/fi';

interface DragHandleProps {
  editor: Editor;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface MenuState {
  type: 'add' | 'actions' | null;
  top: number;
  left: number;
  nodePos: number;
  nodeSize: number;
}

export const DragHandle: React.FC<DragHandleProps> = ({ editor, containerRef }) => {
  const [handlePos, setHandlePos] = useState({ top: 0, visible: false });
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [currentNode, setCurrentNode] = useState({ pos: 0, size: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  // 更新手柄位置
  const updateHandle = useCallback(() => {
    const { view, state } = editor;
    const { selection } = state;
    const { $from } = selection;

    try {
      const resolvedPos = state.doc.resolve($from.pos);
      const depth = resolvedPos.depth;
      
      if (depth < 1) {
        setHandlePos({ top: 0, visible: false });
        return;
      }

      const blockStart = $from.start(1);
      const node = resolvedPos.node(1);

      if (!node) {
        setHandlePos({ top: 0, visible: false });
        return;
      }

      const dom = view.nodeDOM(blockStart - 1);
      if (!dom || !(dom instanceof HTMLElement)) {
        setHandlePos({ top: 0, visible: false });
        return;
      }

      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const domRect = dom.getBoundingClientRect();

      setHandlePos({
        top: domRect.top - containerRect.top + 4,
        visible: true,
      });
      setCurrentNode({ pos: blockStart - 1, size: node.nodeSize });
    } catch {
      setHandlePos({ top: 0, visible: false });
    }
  }, [editor, containerRef]);

  useEffect(() => {
    editor.on('selectionUpdate', updateHandle);
    editor.on('transaction', updateHandle);
    return () => {
      editor.off('selectionUpdate', updateHandle);
      editor.off('transaction', updateHandle);
    };
  }, [editor, updateHandle]);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 显示添加菜单
  const showAddMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();

    setMenu({
      type: 'add',
      top: rect.bottom - containerRect.top + 4,
      left: rect.left - containerRect.left,
      nodePos: currentNode.pos,
      nodeSize: currentNode.size,
    });
  };

  // 显示操作菜单
  const showActionsMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();

    setMenu({
      type: 'actions',
      top: rect.bottom - containerRect.top + 4,
      left: rect.left - containerRect.left,
      nodePos: currentNode.pos,
      nodeSize: currentNode.size,
    });
  };

  // 删除块
  const deleteBlock = () => {
    if (menu) {
      editor.commands.deleteRange({
        from: menu.nodePos,
        to: menu.nodePos + menu.nodeSize,
      });
    }
    setMenu(null);
  };

  // 复制块
  const duplicateBlock = () => {
    if (menu) {
      const node = editor.state.doc.nodeAt(menu.nodePos);
      if (node) {
        editor.commands.insertContentAt(menu.nodePos + menu.nodeSize, node.toJSON());
      }
    }
    setMenu(null);
  };

  // 插入块
  const insertBlock = (type: string) => {
    const pos = menu ? menu.nodePos + menu.nodeSize : editor.state.selection.to;
    editor.chain().focus().insertContentAt(pos, { type: 'paragraph' }).run();

    setTimeout(() => {
      switch (type) {
        case 'h1':
          editor.chain().focus().toggleHeading({ level: 1 }).run();
          break;
        case 'h2':
          editor.chain().focus().toggleHeading({ level: 2 }).run();
          break;
        case 'h3':
          editor.chain().focus().toggleHeading({ level: 3 }).run();
          break;
        case 'bullet':
          editor.chain().focus().toggleBulletList().run();
          break;
        case 'ordered':
          editor.chain().focus().toggleOrderedList().run();
          break;
        case 'task':
          editor.chain().focus().toggleTaskList().run();
          break;
        case 'code':
          editor.chain().focus().toggleCodeBlock().run();
          break;
        case 'quote':
          editor.chain().focus().toggleBlockquote().run();
          break;
        case 'table':
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
          break;
        case 'divider':
          editor.chain().focus().setHorizontalRule().run();
          break;
      }
    }, 10);

    setMenu(null);
  };

  if (!handlePos.visible) return null;

  return (
    <>
      {/* 手柄按钮 */}
      <HandleWrapper style={{ top: handlePos.top }}>
        <HandleBtn onClick={showAddMenu} title="添加块">
          <FiPlus />
        </HandleBtn>
        <HandleBtn onClick={showActionsMenu} title="更多操作" className="drag">
          <FiMoreVertical />
        </HandleBtn>
      </HandleWrapper>

      {/* 菜单 */}
      <AnimatePresence>
        {menu && (
          <MenuWrapper
            ref={menuRef}
            style={{ top: menu.top, left: menu.left }}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.12 }}
          >
            {menu.type === 'add' ? (
              <>
                <MenuSection>
                  <SectionTitle>基础</SectionTitle>
                  <MenuItem onClick={() => insertBlock('text')}>
                    <FiType /> 正文
                  </MenuItem>
                  <MenuItem onClick={() => insertBlock('h1')}>
                    <span style={{ fontWeight: 700 }}>H1</span> 标题 1
                  </MenuItem>
                  <MenuItem onClick={() => insertBlock('h2')}>
                    <span style={{ fontWeight: 600 }}>H2</span> 标题 2
                  </MenuItem>
                  <MenuItem onClick={() => insertBlock('h3')}>
                    <span style={{ fontWeight: 600 }}>H3</span> 标题 3
                  </MenuItem>
                </MenuSection>
                <MenuDivider />
                <MenuSection>
                  <SectionTitle>列表</SectionTitle>
                  <MenuItem onClick={() => insertBlock('bullet')}>
                    <FiList /> 无序列表
                  </MenuItem>
                  <MenuItem onClick={() => insertBlock('ordered')}>
                    <FiList /> 有序列表
                  </MenuItem>
                  <MenuItem onClick={() => insertBlock('task')}>
                    <FiCheckSquare /> 待办列表
                  </MenuItem>
                </MenuSection>
                <MenuDivider />
                <MenuSection>
                  <SectionTitle>高级</SectionTitle>
                  <MenuItem onClick={() => insertBlock('code')}>
                    <FiCode /> 代码块
                  </MenuItem>
                  <MenuItem onClick={() => insertBlock('quote')}>
                    <FiMessageSquare /> 引用
                  </MenuItem>
                  <MenuItem onClick={() => insertBlock('table')}>
                    <FiGrid /> 表格
                  </MenuItem>
                  <MenuItem onClick={() => insertBlock('divider')}>
                    <FiMinus /> 分割线
                  </MenuItem>
                </MenuSection>
              </>
            ) : (
              <>
                <MenuItem onClick={duplicateBlock}>
                  <FiCopy /> 复制块
                </MenuItem>
                <MenuItem onClick={deleteBlock} danger>
                  <FiTrash2 /> 删除块
                </MenuItem>
              </>
            )}
          </MenuWrapper>
        )}
      </AnimatePresence>
    </>
  );
};

// 样式
const HandleWrapper = styled.div`
  position: absolute;
  left: 8px;
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 10;

  .editor-container:hover & {
    opacity: 1;
  }
`;

const HandleBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.12s ease;

  &:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
  }

  &.drag {
    cursor: grab;
    &:active {
      cursor: grabbing;
    }
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const MenuWrapper = styled(motion.div)`
  position: absolute;
  min-width: 180px;
  max-height: 360px;
  overflow-y: auto;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  z-index: 100;
  padding: 6px;

  [data-theme='dark'] & {
    background: #1a1a1a;
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
  }
`;

const MenuSection = styled.div`
  padding: 4px 0;
`;

const SectionTitle = styled.div`
  padding: 4px 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const MenuDivider = styled.div`
  height: 1px;
  background: var(--border-color);
  margin: 4px 0;
`;

const MenuItem = styled.button<{ danger?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: ${(props) => (props.danger ? 'var(--error-color)' : 'var(--text-primary)')};
  font-size: 13px;
  text-align: left;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.1s ease;

  svg, span {
    width: 14px;
    color: ${(props) => (props.danger ? 'var(--error-color)' : 'var(--text-secondary)')};
  }

  &:hover {
    background: ${(props) => (props.danger ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-secondary)')};
  }
`;

export default DragHandle;
