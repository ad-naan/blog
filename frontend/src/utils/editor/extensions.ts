/**
 * TipTap编辑器扩展配置
 */
import React from 'react';
import { ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight } from 'lowlight';
import { TextStyle, Color, FontFamily } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { ResizableImage } from '@/components/rich-text/resizable-image';
import { CodeBlockComponent } from '@/components/rich-text/code-block-component';

// 只导入常用语言，大幅减小打包体积（从1.1MB降到约100KB）
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import cpp from 'highlight.js/lib/languages/cpp';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml'; // HTML
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import php from 'highlight.js/lib/languages/php';
import plaintext from 'highlight.js/lib/languages/plaintext';

// 创建 lowlight 实例，只注册常用语言
const lowlight = createLowlight();
lowlight.register('javascript', javascript);
lowlight.register('typescript', typescript);
lowlight.register('python', python);
lowlight.register('java', java);
lowlight.register('cpp', cpp);
lowlight.register('c', cpp); // C 和 C++ 使用相同的语法
lowlight.register('css', css);
lowlight.register('html', xml);
lowlight.register('xml', xml);
lowlight.register('json', json);
lowlight.register('markdown', markdown);
lowlight.register('bash', bash);
lowlight.register('shell', bash);
lowlight.register('sql', sql);
lowlight.register('go', go);
lowlight.register('rust', rust);
lowlight.register('php', php);
// 纯文本别名：AI 输出常见 ```text 块，未注册会导致 highlight 抛 "Unknown language" 崩溃编辑器
lowlight.register('text', plaintext);
lowlight.register('plaintext', plaintext);
lowlight.register('plain', plaintext);

// 全局缓存扩展实例，所有编辑器共享
let cachedExtensions: any[] | null = null;

/**
 * 清除扩展缓存（开发时使用）
 */
export const clearExtensionsCache = () => {
  cachedExtensions = null;
};

/**
 * 创建扩展配置
 * 使用缓存机制，确保所有编辑器实例共享同一组扩展
 */
export const createExtensions = () => {
  // 如果已经创建过，直接返回缓存的实例
  if (cachedExtensions) {
    return cachedExtensions;
  }

  // 创建扩展实例
  cachedExtensions = [
    StarterKit.configure({
      codeBlock: false, // 禁用,使用 CodeBlockLowlight
      strike: false, // 禁用,使用自定义配置
      link: false, // 禁用 StarterKit 中的 Link，使用自定义配置
      underline: false, // 禁用 StarterKit 中的 Underline，使用自定义配置
      heading: {
        levels: [1, 2, 3, 4, 5, 6],
      },
    }),
    CodeBlockLowlight.extend({
      addNodeView() {
        return ReactNodeViewRenderer(CodeBlockComponent);
      },
    }).configure({
      lowlight,
      defaultLanguage: 'javascript',
    }),
    Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === 'heading') {
          return '标题';
        }
        return '输入 / 唤起命令菜单,或直接开始输入...';
      },
    }),
    ResizableImage.configure({
      allowBase64: false,
      HTMLAttributes: {
        class: 'editor-image',
      },
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
      alignments: ['left', 'center', 'right', 'justify'],
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    }),
    // 文字样式扩展(TextStyle 必须在 Color/FontFamily 之前)
    TextStyle,
    Color,
    FontFamily,
    Highlight.configure({
      multicolor: true,
    }),
    // 表格 - 支持列宽拖拽调整（渲染端已放行 colgroup/col/data-colwidth）
    Table.configure({
      resizable: true,
      HTMLAttributes: {
        class: 'editor-table',
      },
    }),
    TableRow,
    TableHeader,
    TableCell,
    // 任务列表
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    // 其他
    Underline,
    Strike,
    Subscript,
    Superscript,
  ];

  return cachedExtensions;
};
