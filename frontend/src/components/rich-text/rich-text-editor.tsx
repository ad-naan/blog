import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import styled from '@emotion/styled';
import '@/styles/rich-text.css';
import { API } from '@/utils';
import { EditorToolbar } from './toolbar/editor-toolbar';
import { SlashMenu } from './slash-menu';
import { SelectionMenu } from './selection-menu';
import { TableFloatingMenu } from './table-floating-menu';
import { DragHandle } from './drag-handle';
import { InputPanel } from './toolbar/input-panel';
import { AIAssistant } from './ai-assistant';
import { createExtensions } from '@/utils/editor/extensions';
import { uploadImage } from '@/utils/editor/helpers';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  maxHeight?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onChange, maxHeight }) => {
  // 状态
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // 斜杠菜单状态
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuPos, setSlashMenuPos] = useState({ top: 0, left: 0 });
  const [slashQuery, setSlashQuery] = useState('');
  const slashTriggerPosRef = useRef<number | null>(null);

  // Refs
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);
  // 记录最近一次由本编辑器 onUpdate 抛出的 HTML，用于区分"外部注入内容"与"自身回显"
  const lastEmittedHtmlRef = useRef<string | null>(null);

  // 扩展
  const extensions = useMemo(() => createExtensions(), []);

  // 图片上传
  const uploadAndInsertImage = useCallback(async (file: File) => {
    try {
      if (isMountedRef.current) setIsUploading(true);
      const url = await uploadImage(file, API.user.batchUpload);
      return url;
    } catch (error: any) {
      console.error('图片上传失败:', error);
      if (isMountedRef.current) {
        adnaan?.toast.error(error.message || '图片上传失败', '上传失败');
      }
      return null;
    } finally {
      if (isMountedRef.current) setIsUploading(false);
    }
  }, []);

  // 编辑器实例
  const editor: Editor | null = useEditor({
    extensions,
    content: content || '<p></p>',
    editorProps: {
      attributes: {
        class: 'ProseMirror rich-text-content',
      },
      // 粘贴图片
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || []);
        const imageItems = items.filter((item) => item.type.indexOf('image') !== -1);

        if (imageItems.length > 0) {
          event.preventDefault();
          imageItems.forEach(async (item) => {
            const file = item.getAsFile();
            if (file) {
              const url = await uploadAndInsertImage(file);
              if (url && view.state.doc) {
                const { state } = view;
                const { tr } = state;
                const pos = state.selection.from;
                tr.insert(pos, state.schema.nodes.resizableImage.create({ src: url }));
                view.dispatch(tr);
              }
            }
          });
          return true;
        }
        return false;
      },
      // 拖放图片
      handleDrop: (view, event) => {
        const files = Array.from(event.dataTransfer?.files || []);
        const imageFiles = files.filter((file) => file.type.indexOf('image') !== -1);

        if (imageFiles.length > 0) {
          event.preventDefault();
          const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
          if (!coords) return false;

          imageFiles.forEach(async (file) => {
            const url = await uploadAndInsertImage(file);
            if (url && view.state.doc) {
              const { state } = view;
              const { tr } = state;
              tr.insert(coords.pos, state.schema.nodes.resizableImage.create({ src: url }));
              view.dispatch(tr);
            }
          });
          return true;
        }
        return false;
      },
      // 键盘事件
      handleKeyDown: (view, event) => {
        // 输入 / 触发斜杠菜单
        if (event.key === '/' && !slashMenuOpen) {
          const { state } = view;
          const { selection } = state;
          const { $from } = selection;

          // 只在段落开头或空格后触发
          const textBefore = $from.parent.textContent.substring(0, $from.parentOffset);
          if (textBefore === '' || textBefore.endsWith(' ')) {
            // 记录触发位置
            slashTriggerPosRef.current = selection.from;

            // 计算菜单位置
            const coords = view.coordsAtPos(selection.from);
            const containerRect = containerRef.current?.getBoundingClientRect();
            if (containerRect) {
              setSlashMenuPos({
                top: coords.bottom - containerRect.top + 8,
                left: coords.left - containerRect.left,
              });
            }

            setSlashQuery('');
            setSlashMenuOpen(true);
          }
        }

        // ESC 关闭菜单
        if (event.key === 'Escape' && slashMenuOpen) {
          setSlashMenuOpen(false);
          slashTriggerPosRef.current = null;
          return true;
        }

        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastEmittedHtmlRef.current = html;
      onChange(html);

      // 更新斜杠菜单搜索
      if (slashMenuOpen && slashTriggerPosRef.current !== null) {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;
        const textBefore = $from.parent.textContent.substring(0, $from.parentOffset);
        const slashIndex = textBefore.lastIndexOf('/');

        if (slashIndex >= 0) {
          const query = textBefore.substring(slashIndex + 1);
          setSlashQuery(query);
        } else {
          // 斜杠被删除，关闭菜单
          setSlashMenuOpen(false);
          slashTriggerPosRef.current = null;
        }
      }
    },
  });

  // 清理
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 同步外部内容（非受控模式）：
  // 仅当传入内容既不是本编辑器最近抛出的回显、也与当前文档一致时才注入，
  // 典型场景是异步加载草稿/文章。这样彻底切断"onChange -> state -> setContent"反馈环，
  // 打字过程中编辑器永远不会被整体重设（光标跳动/输入卡顿的根因）。
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    const incoming = content ?? '';
    if (incoming === lastEmittedHtmlRef.current || incoming === editor.getHTML()) return;

    const trimmed = incoming.trim();
    if (!trimmed || trimmed === '<p></p>') return;

    editor.commands.setContent(trimmed, { emitUpdate: false });
  }, [content, editor]);

  // 删除斜杠命令文本
  const removeSlashText = useCallback(() => {
    if (!editor || slashTriggerPosRef.current === null) return;

    const { state } = editor;
    const { selection } = state;
    const from = slashTriggerPosRef.current;
    const to = selection.from;

    if (from < to) {
      editor.chain().focus().deleteRange({ from, to }).run();
    }
  }, [editor]);

  // 斜杠菜单命令执行
  const handleSlashCommand = useCallback(
    (command: () => void) => {
      removeSlashText();
      command();
      setSlashMenuOpen(false);
      slashTriggerPosRef.current = null;
    },
    [removeSlashText],
  );

  // 链接插入
  const insertLink = useCallback(() => {
    if (linkUrl && editor) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl('');
      setShowLinkInput(false);
    }
  }, [editor, linkUrl]);

  // 图片URL插入
  const insertImage = useCallback(() => {
    if (imageUrl && editor) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl('');
      setShowImageInput(false);
    }
  }, [editor, imageUrl]);

  // 文件上传
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      const imageFiles = files.filter((file) => file.type.indexOf('image') !== -1);

      if (imageFiles.length === 0) {
        adnaan?.toast.error('请选择图片文件', '文件类型错误');
        return;
      }

      for (const file of imageFiles) {
        try {
          setIsUploading(true);
          const url = await uploadImage(file, API.user.batchUpload);
          editor?.chain().focus().setImage({ src: url }).run();
        } catch (error: any) {
          adnaan?.toast.error(error.message || '图片上传失败', '上传失败');
        } finally {
          setIsUploading(false);
        }
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [editor],
  );

  if (!editor) return null;

  return (
    <EditorWrapper ref={editorRef} maxHeight={maxHeight}>
      {/* 顶部工具栏 */}
      <EditorToolbar
        editor={editor}
        isUploading={isUploading}
        onImageUploadClick={() => fileInputRef.current?.click()}
        onLinkClick={() => setShowLinkInput(!showLinkInput)}
        onImageClick={() => setShowImageInput(!showImageInput)}
      />

      {/* 链接输入 */}
      {showLinkInput && (
        <InputPanel
          type="link"
          value={linkUrl}
          onChange={setLinkUrl}
          onConfirm={insertLink}
          onCancel={() => setShowLinkInput(false)}
        />
      )}

      {/* 图片URL输入 */}
      {showImageInput && (
        <InputPanel
          type="image"
          value={imageUrl}
          onChange={setImageUrl}
          onConfirm={insertImage}
          onCancel={() => setShowImageInput(false)}
        />
      )}

      {/* 隐藏文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      {/* 上传提示 */}
      {isUploading && <UploadingIndicator>正在上传图片...</UploadingIndicator>}

      {/* 编辑器内容区 */}
      <EditorContainer ref={containerRef} className="editor-container">
        <EditorContent editor={editor} />

        {/* 拖拽手柄 */}
        <DragHandle editor={editor} containerRef={containerRef} />

        {/* 选中文本菜单 */}
        <SelectionMenu
          editor={editor}
          containerRef={containerRef}
          onLinkClick={() => setShowLinkInput(true)}
        />

        {/* 表格浮动菜单 */}
        <TableFloatingMenu editor={editor} containerRef={containerRef} />

        {/* 斜杠命令菜单 */}
        <SlashMenu
          editor={editor}
          isOpen={slashMenuOpen}
          position={slashMenuPos}
          searchQuery={slashQuery}
          onSelect={handleSlashCommand}
          onClose={() => {
            setSlashMenuOpen(false);
            slashTriggerPosRef.current = null;
          }}
          onImageClick={() => {
            removeSlashText();
            setSlashMenuOpen(false);
            slashTriggerPosRef.current = null;
            setShowImageInput(true);
          }}
          onLinkClick={() => {
            removeSlashText();
            setSlashMenuOpen(false);
            slashTriggerPosRef.current = null;
            setShowLinkInput(true);
          }}
        />

        {/* AI助手 */}
        <AIAssistant editor={editor} editorRef={editorRef} />
      </EditorContainer>
    </EditorWrapper>
  );
};

// 样式
const EditorWrapper = styled.div<{ maxHeight?: string }>`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-primary);
  max-height: ${(props) => props.maxHeight || 'none'};

  @media (max-width: 768px) {
    border: none;
    border-radius: 0;
  }
`;

const EditorContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  position: relative;
  min-height: 300px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(var(--text-secondary-rgb, 107, 114, 126), 0.2);
    border-radius: 3px;
  }

  .ProseMirror {
    padding: 2rem 3rem 2rem 4rem;
    min-height: 300px;
    outline: none;

    &:focus {
      outline: none;
    }

    > * + * {
      margin-top: 0.75em;
    }

    /* 当有 AI 触发器时隐藏原生 placeholder */
    p.is-editor-empty:first-of-type::before {
      content: attr(data-placeholder);
      float: left;
      color: var(--text-tertiary);
      pointer-events: none;
      height: 0;
    }

    /* AI 连接时隐藏原生 placeholder（由 AIAssistant 组件控制显示） */
    &.hide-placeholder p.is-editor-empty:first-of-type::before {
      display: none;
    }
  }

  @media (max-width: 768px) {
    .ProseMirror {
      padding: 1.5rem 1rem 1.5rem 2.5rem;
    }
  }
`;

const UploadingIndicator = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 12px 24px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: var(--shadow-lg);
  color: var(--text-primary);
  font-size: 14px;
  z-index: 1000;
  animation: pulse 1.5s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
`;

export default RichTextEditor;
