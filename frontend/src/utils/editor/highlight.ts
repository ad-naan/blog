/**
 * 渲染端共享的轻量 highlight.js 实例
 *
 * 与 extensions.ts 中 lowlight 注册的语言保持一致，
 * 避免渲染端动态引入完整版 highlight.js（约 190 种语言，压缩后约 1MB）。
 * highlightAuto 也只会在已注册的常用语言中探测，避免全语言试探的开销。
 *
 * 注意：本模块使用静态导入（与 extensions.ts 相同的路径写法），
 * 调用方应通过 `await import('@/utils/editor/highlight')` 懒加载本模块，
 * 语言定义仍会进入独立的异步 chunk。
 */
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import cpp from 'highlight.js/lib/languages/cpp';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import php from 'highlight.js/lib/languages/php';

// 与编辑器 extensions.ts 的 lowlight 注册表保持一致
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('java', java);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('c', cpp);
hljs.registerLanguage('css', css);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('json', json);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('go', go);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('php', php);

/**
 * 高亮代码，返回 HTML 字符串
 * 语言未注册时退化为自动探测（仅在已注册语言中）
 */
export const highlightCode = (code: string, language?: string): string => {
  if (language && hljs.getLanguage(language)) {
    return hljs.highlight(code, { language }).value;
  }
  return hljs.highlightAuto(code).value;
};

/**
 * HTML 转义（高亮失败时的降级处理）
 */
export const escapeHtml = (code: string): string =>
  code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
