import React, { useState, useEffect, useCallback } from 'react';
import styled from '@emotion/styled';
import {
  FiBold,
  FiItalic,
  FiUnderline,
  FiCode,
  FiLink,
  FiImage,
  FiList,
  FiAlignLeft,
  FiAlignCenter,
  FiAlignRight,
  FiAlignJustify,
  FiFileText,
  FiMinus as FiStrikethrough,
  FiMessageSquare,
  FiUpload,
  FiRotateCcw,
  FiRotateCw,
  FiCheckSquare,
  FiGrid,
  FiTrash2,
  FiMinus,
} from 'react-icons/fi';
import { HeadingMenu } from './heading-menu';
import { ColorPicker } from './color-picker';
import { Editor } from '@tiptap/react';

// 样式组件
const FloatingToolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  flex-wrap: wrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(8px);
  width: 100%;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 100;

  [data-theme='dark'] & {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
`;

const ToolbarGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  position: relative;
`;

const Divider = styled.div`
  width: 1px;
  height: 20px;
  background: var(--border-color);
  margin: 0 4px;
`;

const FONT_OPTIONS = [
  { label: '默认字体', value: '' },
  { label: '思源黑体', value: "'Source Han Sans', 'Noto Sans SC', sans-serif" },
  { label: '宋体', value: "'SimSun', 'Songti SC', serif" },
  { label: '楷体', value: "'KaiTi', 'Kaiti SC', serif" },
  { label: '等宽代码体', value: "'JetBrains Mono', 'Fira Code', Consolas, monospace" },
];

const FontSelect = styled.select`
  height: 32px;
  padding: 0 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  max-width: 110px;
  outline: none;
  transition: border-color 0.2s;

  &:hover {
    border-color: var(--accent-color);
  }
`;

interface ToolbarButtonProps {
  active?: boolean;
  disabled?: boolean;
}

const ToolbarButton = styled.button<ToolbarButtonProps>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: ${(props) => (props.active ? 'var(--accent-color)' : 'transparent')};
  color: ${(props) => (props.active ? 'var(--text-on-accent)' : 'var(--text-primary)')};
  border-radius: 4px;
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  transition: all 0.2s;
  font-size: 16px;
  position: relative;
  opacity: ${(props) => (props.disabled ? 0.5 : 1)};

  &:hover {
    background: ${(props) =>
      props.disabled ? 'transparent' : props.active ? 'var(--accent-color)' : 'var(--bg-secondary)'};
    color: ${(props) => (props.active ? 'var(--text-on-accent)' : 'var(--text-primary)')};
  }

  &:active {
    transform: ${(props) => (props.disabled ? 'none' : 'scale(0.95)')};
  }

  ${(props) =>
    props.active &&
    !props.disabled &&
    `
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  `}

  [data-theme='dark'] & {
    ${(props) =>
      props.active &&
      !props.disabled &&
      `
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: var(--shadow-md), inset 0 1px 0 rgba(255, 255, 255, 0.05);
    `}
  }
`;

// 接口定义
interface EditorToolbarProps {
  editor: Editor;
  isUploading: boolean;
  onImageUploadClick: () => void;
  onLinkClick: () => void;
  onImageClick: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editor,
  isUploading,
  onImageUploadClick,
  onLinkClick,
  onImageClick,
}) => {
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [fontFamily, setFontFamily] = useState('');
  // 强制更新状态，用于响应编辑器选区变化
  const [, forceUpdate] = useState(0);

  // 监听编辑器选区和内容变化，触发工具栏状态更新
  useEffect(() => {
    if (!editor) return;

    const updateToolbar = () => {
      forceUpdate((n) => n + 1);
      // 同步当前光标处的字体（未设置时为空）
      setFontFamily((editor.getAttributes('textStyle').fontFamily as string) || '');
    };

    // 监听选区变化和事务
    editor.on('selectionUpdate', updateToolbar);
    editor.on('transaction', updateToolbar);

    return () => {
      editor.off('selectionUpdate', updateToolbar);
      editor.off('transaction', updateToolbar);
    };
  }, [editor]);

  if (!editor) return null;

  // 工具栏按钮操作
  const toggleBold = () => editor.chain().focus().toggleBold().run();
  const toggleItalic = () => editor.chain().focus().toggleItalic().run();
  const toggleUnderline = () => editor.chain().focus().toggleUnderline().run();
  const toggleStrike = () => editor.chain().focus().toggleStrike().run();
  const toggleCode = () => editor.chain().focus().toggleCode().run();
  const toggleBulletList = () => editor.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () => editor.chain().focus().toggleOrderedList().run();
  const toggleBlockquote = () => editor.chain().focus().toggleBlockquote().run();
  const toggleCodeBlock = () => editor.chain().focus().toggleCodeBlock().run();

  const setAlignment = (align: 'left' | 'center' | 'right' | 'justify') => {
    editor.chain().focus().setTextAlign(align).run();
  };

  return (
    <FloatingToolbar>
      {/* 撤销/重做 */}
      <ToolbarGroup>
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="撤销 (Ctrl+Z)"
        >
          <FiRotateCcw />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="重做 (Ctrl+Shift+Z)"
        >
          <FiRotateCw />
        </ToolbarButton>
      </ToolbarGroup>

      <Divider />

      {/* 文本样式 */}
      <ToolbarGroup>
        <ToolbarButton onClick={toggleBold} active={editor.isActive('bold')} title="加粗 (Ctrl+B)">
          <FiBold />
        </ToolbarButton>
        <ToolbarButton onClick={toggleItalic} active={editor.isActive('italic')} title="斜体 (Ctrl+I)">
          <FiItalic />
        </ToolbarButton>
        <ToolbarButton onClick={toggleUnderline} active={editor.isActive('underline')} title="下划线 (Ctrl+U)">
          <FiUnderline />
        </ToolbarButton>
        <ToolbarButton onClick={toggleStrike} active={editor.isActive('strike')} title="删除线">
          <FiStrikethrough />
        </ToolbarButton>
        <ToolbarButton onClick={toggleCode} active={editor.isActive('code')} title="行内代码">
          <FiCode />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          active={editor.isActive('subscript')}
          title="下标"
        >
          X<sub style={{ fontSize: '0.7em' }}>₂</sub>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          active={editor.isActive('superscript')}
          title="上标"
        >
          X<sup style={{ fontSize: '0.7em' }}>²</sup>
        </ToolbarButton>
      </ToolbarGroup>

      <Divider />

      {/* 文字颜色和高亮 */}
      <ToolbarGroup>
        <ColorPicker
          type="text"
          editor={editor}
          isOpen={showTextColorPicker}
          onToggle={() => setShowTextColorPicker(!showTextColorPicker)}
          onClose={() => setShowTextColorPicker(false)}
        />

        <ColorPicker
          type="highlight"
          editor={editor}
          isOpen={showHighlightPicker}
          onToggle={() => setShowHighlightPicker(!showHighlightPicker)}
          onClose={() => setShowHighlightPicker(false)}
        />

        <FontSelect
          value={fontFamily}
          title="字体"
          onChange={(e) => {
            const value = e.target.value;
            editor.chain().focus().setFontFamily(value).run();
            setFontFamily(value);
          }}
        >
          {FONT_OPTIONS.map((opt) => (
            <option key={opt.label} value={opt.value} style={{ fontFamily: opt.value || undefined }}>
              {opt.label}
            </option>
          ))}
        </FontSelect>
      </ToolbarGroup>

      <Divider />

      {/* 标题 */}
      <ToolbarGroup>
        <HeadingMenu
          editor={editor}
          isOpen={showHeadingMenu}
          onToggle={() => setShowHeadingMenu(!showHeadingMenu)}
          onClose={() => setShowHeadingMenu(false)}
        />
      </ToolbarGroup>

      <Divider />

      {/* 列表 */}
      <ToolbarGroup>
        <ToolbarButton onClick={toggleBulletList} active={editor.isActive('bulletList')} title="无序列表">
          <FiList />
        </ToolbarButton>
        <ToolbarButton onClick={toggleOrderedList} active={editor.isActive('orderedList')} title="有序列表">
          <FiFileText />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          active={editor.isActive('taskList')}
          title="任务列表"
        >
          <FiCheckSquare />
        </ToolbarButton>
        <ToolbarButton onClick={toggleBlockquote} active={editor.isActive('blockquote')} title="引用块">
          <FiMessageSquare />
        </ToolbarButton>
      </ToolbarGroup>

      <Divider />

      {/* 表格操作 */}
      <ToolbarGroup>
        <ToolbarButton
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title="插入表格"
        >
          <FiGrid />
        </ToolbarButton>
        {editor.isActive('table') && (
          <>
            <ToolbarButton onClick={() => editor.chain().focus().addColumnBefore().run()} title="在左侧插入列">
              ←
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()} title="在右侧插入列">
              →
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().deleteColumn().run()} title="删除列">
              <FiTrash2 />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().addRowBefore().run()} title="在上方插入行">
              ↑
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()} title="在下方插入行">
              ↓
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().deleteRow().run()} title="删除行">
              <FiMinus />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().deleteTable().run()} title="删除表格">
              <FiTrash2 style={{ color: 'var(--error-color)' }} />
            </ToolbarButton>
          </>
        )}
      </ToolbarGroup>

      <Divider />

      {/* 对齐 */}
      <ToolbarGroup>
        <ToolbarButton
          onClick={() => setAlignment('left')}
          active={editor.isActive({ textAlign: 'left' })}
          title="左对齐"
        >
          <FiAlignLeft />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => setAlignment('center')}
          active={editor.isActive({ textAlign: 'center' })}
          title="居中对齐"
        >
          <FiAlignCenter />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => setAlignment('right')}
          active={editor.isActive({ textAlign: 'right' })}
          title="右对齐"
        >
          <FiAlignRight />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => setAlignment('justify')}
          active={editor.isActive({ textAlign: 'justify' })}
          title="两端对齐"
        >
          <FiAlignJustify />
        </ToolbarButton>
      </ToolbarGroup>

      <Divider />

      {/* 链接和图片 */}
      <ToolbarGroup>
        <ToolbarButton onClick={onLinkClick} active={editor.isActive('link')} title="插入链接">
          <FiLink />
        </ToolbarButton>
        <ToolbarButton onClick={onImageClick} title="插入图片URL">
          <FiImage />
        </ToolbarButton>
        <ToolbarButton onClick={onImageUploadClick} title="上传图片" disabled={isUploading}>
          {isUploading ? '...' : <FiUpload />}
        </ToolbarButton>
        <ToolbarButton onClick={toggleCodeBlock} active={editor.isActive('codeBlock')} title="代码块">
          <FiCode />
        </ToolbarButton>
      </ToolbarGroup>
    </FloatingToolbar>
  );
};
