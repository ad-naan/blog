/**
 * 富文本解析工具类
 * 提供统一的富文本处理、清理、样式化功能
 */
export class RichTextParser {
  // LRU缓存，存储解析结果（最多缓存50个结果）
  private static cache = new Map<string, { result: string; timestamp: number }>();
  private static readonly CACHE_MAX_SIZE = 50;
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟过期

  // 系统支持的HTML标签白名单
  private static readonly ALLOWED_TAGS = [
    'div',
    'p',
    'span',
    'br',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's', // 删除线
    'blockquote',
    'code',
    'pre',
    'a',
    'img',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'hr',
    'mark', // 高亮
    'sub', // 下标
    'sup', // 上标
    'label', // 任务列表用
    'input', // 任务列表复选框
    'colgroup', // 表格列宽
    'col', // 表格列宽
  ];

  // 系统支持的CSS类名白名单
  private static readonly ALLOWED_CLASSES = [
    'rich-text-content',
    'rich-text-code-block',
    'rich-text-inline-code',
    'rich-text-quote',
    'rich-text-link',
    'rich-text-image',
    'rich-text-table-wrapper',
    'rich-text-table',
    'editor-table', // 编辑器输出的表格类名（与 rich-text-table 共存）
    'editor-image', // 编辑器输出的图片类名
    'rich-text-cursor', // 允许打字机光标
  ];

  // 各标签允许的属性白名单（DOMParser 与正则两条清洗路径共用）
  private static readonly ALLOWED_ATTRIBUTES: Record<string, string[]> = {
    div: ['class', 'data-language'],
    p: ['class', 'style'], // 段落支持样式
    span: ['class', 'style'], // span 支持样式（文字颜色/字体等）
    h1: ['class', 'style', 'id'],
    h2: ['class', 'style', 'id'],
    h3: ['class', 'style', 'id'],
    h4: ['class', 'style', 'id'],
    h5: ['class', 'style', 'id'],
    h6: ['class', 'style', 'id'],
    a: ['href', 'target', 'rel', 'class'],
    img: ['src', 'alt', 'loading', 'class', 'width', 'height', 'style', 'data-align'],
    code: ['class'],
    pre: ['class', 'data-language'],
    blockquote: ['class'],
    table: ['class', 'style'],
    th: ['colspan', 'rowspan', 'class', 'style', 'colwidth', 'data-colwidth'],
    td: ['colspan', 'rowspan', 'class', 'style', 'colwidth', 'data-colwidth'],
    colgroup: ['class'],
    col: ['class', 'style', 'width', 'span'],
    mark: ['class', 'style', 'data-color'], // 高亮支持样式和颜色标记
    ul: ['class', 'data-type'], // 任务列表需要 data-type
    li: ['class', 'data-type', 'data-checked'], // 任务项需要 data-type 和 data-checked
    input: ['type', 'checked', 'disabled'], // 任务列表复选框
    label: ['class'],
  };

  // 任意标签下都视为安全的"有值属性"（布尔属性 checked/disabled 单独处理）
  private static readonly SAFE_VALUE_ATTRS = [
    'target',
    'rel',
    'alt',
    'loading',
    'data-language',
    'colspan',
    'rowspan',
    'width',
    'height',
    'data-align',
    'data-color',
    'data-type',
    'data-checked',
    'data-colwidth',
    'colwidth',
    'span',
    'type',
    'id',
  ];

  // 危险标签：整个删除，不保留子内容
  private static readonly FORBIDDEN_TAGS = new Set([
    'script',
    'style',
    'link',
    'meta',
    'base',
    'iframe',
    'frame',
    'object',
    'embed',
    'noscript',
    'form',
  ]);

  /**
   * 从缓存获取结果
   */
  private static getCached(key: string): string | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // 检查是否过期
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.result;
  }

  /**
   * 存入缓存（LRU策略）
   */
  private static setCache(key: string, result: string): void {
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.CACHE_MAX_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * 清除所有缓存
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * 验证URL是否安全
   */
  private static isValidUrl(url: string): boolean {
    if (!url) return false;

    const allowedProtocols = ['http:', 'https:', 'data:', '/'];

    try {
      if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
        return true;
      }

      const urlObj = new URL(url);
      return allowedProtocols.includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  /**
   * 清理并验证 style 属性，只保留安全的 CSS 属性
   */
  private static cleanStyleAttribute(style: string): string {
    if (!style) return '';

    // 安全的 CSS 属性白名单（覆盖编辑器可产出的全部排版能力）
    const allowedStyles = [
      'color',
      'background-color',
      'background',
      'font-size',
      'font-family',
      'font-weight',
      'font-style',
      'line-height',
      'letter-spacing',
      'text-decoration',
      'text-decoration-line',
      'text-align',
      'text-indent',
      'width',
      'height',
      'min-width',
      'min-height',
      'max-width',
      'max-height',
      'margin',
      'margin-left',
      'margin-right',
      'margin-top',
      'margin-bottom',
      'padding',
      'padding-left',
      'padding-right',
      'padding-top',
      'padding-bottom',
      'display',
      'float',
      'border',
      'border-left',
      'border-right',
      'border-top',
      'border-bottom',
      'border-radius',
      'border-color',
      'border-width',
      'border-style',
      'box-shadow',
      'opacity',
      'vertical-align',
      'white-space',
      'word-break',
      'overflow-wrap',
    ];

    // 解析 style 字符串
    const styleRules = style.split(';').filter((rule) => rule.trim());
    const cleanRules: string[] = [];

    for (const rule of styleRules) {
      const [property, value] = rule.split(':').map((s) => s.trim());

      if (!property || !value) continue;

      // 检查是否为允许的属性
      if (allowedStyles.includes(property.toLowerCase())) {
        // 防止 CSS 注入（禁止 url()、expression() 等）
        if (
          !value.toLowerCase().includes('url(') &&
          !value.toLowerCase().includes('expression') &&
          !value.toLowerCase().includes('javascript:') &&
          !value.toLowerCase().includes('import')
        ) {
          cleanRules.push(`${property}: ${value}`);
        }
      }
    }

    return cleanRules.length > 0 ? cleanRules.join('; ') : '';
  }

  /**
   * 清理HTML属性，只保留安全的属性（正则路径使用；DOMParser 路径见 cleanElementAttributes）
   */
  private static cleanAttributes(attributes: string, tagName: string): string {
    if (!attributes) return '';

    const allowed = this.ALLOWED_ATTRIBUTES[tagName] || ['class'];

    // 匹配两种格式：attr="value" 和 attr (布尔属性)
    const attrWithValueRegex = /([\w-]+)=["']([^"']*)["']/g;
    const attrBooleanRegex = /\s([\w-]+)(?=\s|$|>)/g;
    const cleanAttrs: string[] = [];
    const processedAttrs = new Set<string>();

    let match;

    // 处理有值的属性
    while ((match = attrWithValueRegex.exec(attributes)) !== null) {
      const [, attrName, attrValue] = match;

      if (allowed.includes(attrName)) {
        processedAttrs.add(attrName);

        if (attrName === 'class') {
          const cleanClasses = attrValue
            .split(' ')
            .filter((cls) => this.ALLOWED_CLASSES.includes(cls) || cls.startsWith('language-'))
            .join(' ');
          if (cleanClasses) {
            cleanAttrs.push(`class="${cleanClasses}"`);
          }
        } else if (attrName === 'style') {
          // 清理并验证 style 属性
          const cleanStyle = this.cleanStyleAttribute(attrValue);
          if (cleanStyle) {
            cleanAttrs.push(`style="${cleanStyle}"`);
          }
        } else if (attrName === 'href' && this.isValidUrl(attrValue)) {
          cleanAttrs.push(`${attrName}="${attrValue}"`);
        } else if (attrName === 'src' && this.isValidUrl(attrValue)) {
          cleanAttrs.push(`${attrName}="${attrValue}"`);
        } else if (this.SAFE_VALUE_ATTRS.includes(attrName)) {
          cleanAttrs.push(`${attrName}="${attrValue}"`);
        }
      }
    }

    // 处理布尔属性（checked、disabled 等）
    while ((match = attrBooleanRegex.exec(attributes)) !== null) {
      const attrName = match[1];

      if (allowed.includes(attrName) && !processedAttrs.has(attrName)) {
        if (['checked', 'disabled'].includes(attrName)) {
          cleanAttrs.push(attrName);
        }
      }
    }

    return cleanAttrs.length > 0 ? ' ' + cleanAttrs.join(' ') : '';
  }

  /**
   * 清理单个 DOM 元素的属性（DOMParser 路径）
   * 返回 true 表示该元素需要移除（如非法 img/a）
   */
  private static cleanElementAttributes(el: Element): boolean {
    const tagName = el.tagName.toLowerCase();
    const allowed = this.ALLOWED_ATTRIBUTES[tagName] || ['class'];

    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value;

      if (!allowed.includes(name)) {
        el.removeAttribute(attr.name);
        continue;
      }

      if (name === 'class') {
        const cleanClasses = value
          .split(/\s+/)
          .filter((cls) => this.ALLOWED_CLASSES.includes(cls) || cls.startsWith('language-'))
          .join(' ');
        if (cleanClasses) {
          el.setAttribute('class', cleanClasses);
        } else {
          el.removeAttribute('class');
        }
      } else if (name === 'style') {
        const cleanStyle = this.cleanStyleAttribute(value);
        if (cleanStyle) {
          el.setAttribute('style', cleanStyle);
        } else {
          el.removeAttribute('style');
        }
      } else if (name === 'href' || name === 'src') {
        if (!this.isValidUrl(value)) {
          if (name === 'src' && tagName === 'img') return true; // 移除非法图片
          if (name === 'href' && tagName === 'a') return true; // 移除非法链接
          el.removeAttribute(attr.name);
        }
      }
      // 其余白名单属性（colspan、data-* 等）原样保留
    }

    return false;
  }

  /**
   * 使用 DOMParser 进行白名单清洗（浏览器环境优先路径）
   * 相比正则方案：能正确处理嵌套、转义、属性边界，且完整保留内联样式
   */
  private static cleanHtmlWithDom(html: string): string {
    const doc = new DOMParser().parseFromString(html, 'text/html');

    // 1. 递归遍历，移除危险标签（连内容一起删）与非法元素
    const walk = (node: Node) => {
      const children = Array.from(node.childNodes);
      for (const child of children) {
        if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as Element;
          const tag = el.tagName.toLowerCase();

          if (this.FORBIDDEN_TAGS.has(tag)) {
            el.remove();
            continue;
          }

          // 白名单外标签：保留其子内容（unwrap）
          if (!this.ALLOWED_TAGS.includes(tag)) {
            const fragment = doc.createDocumentFragment();
            while (el.firstChild) fragment.appendChild(el.firstChild);
            el.replaceWith(fragment);
            // unwrap 后子节点仍需继续清洗，从 fragment 的父级重新遍历
            walk(node);
            continue;
          }

          const shouldRemove = this.cleanElementAttributes(el);
          if (shouldRemove) {
            el.remove();
            continue;
          }
        }

        walk(child);
      }
    };

    walk(doc.body);

    return doc.body.innerHTML;
  }

  /**
   * 验证并清理HTML标签
   */
  static validateAndCleanHtml(html: string): string {
    if (!html || typeof html !== 'string') {
      return '';
    }

    let cleanHtml: string;

    // 浏览器环境优先 DOMParser：正确处理嵌套/转义/属性边界，不误伤合法样式
    if (typeof DOMParser !== 'undefined') {
      cleanHtml = this.cleanHtmlWithDom(html);
    } else {
      // SSR/测试环境兜底：沿用正则清洗
      cleanHtml = html.replace(/<(\/?)([\w-]+)([^>]*)>/gi, (match, closing, tagName, attributes) => {
        const tag = tagName.toLowerCase();

        if (this.FORBIDDEN_TAGS.has(tag)) {
          return '';
        }

        if (this.ALLOWED_TAGS.includes(tag)) {
          const cleanAttributes = this.cleanAttributes(attributes, tag);
          return `<${closing}${tag}${cleanAttributes}>`;
        }

        return '';
      });
    }

    // 清理空标签（包括只包含空白的标签）
    cleanHtml = this.removeEmptyTags(cleanHtml);

    return cleanHtml;
  }

  /**
   * 移除空标签和只包含空白的标签
   */
  private static removeEmptyTags(html: string): string {
    let cleaned = html;
    let previousLength;

    // 多次迭代，直到没有更多的空标签被移除
    do {
      previousLength = cleaned.length;

      // 移除空的标签（包括只包含空白、换行、&nbsp; 的标签）
      cleaned = cleaned.replace(/<(\w+)([^>]*)>\s*<\/\1>/gi, '');
      cleaned = cleaned.replace(/<(\w+)([^>]*)>(&nbsp;|\s)*<\/\1>/gi, '');

      // 移除多余的连续空白
      cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
    } while (cleaned.length < previousLength);

    return cleaned;
  }

  /**
   * 清理标签之间的多余空白和换行符（保留pre/code标签内的内容）
   */
  private static cleanWhitespaceBetweenTags(html: string): string {
    // 1. 先提取并保护 pre/code 标签的内容
    const protectedBlocks: string[] = [];
    let processed = html;

    // 提取 pre>code 块
    processed = processed.replace(/<pre[^>]*>\s*<code[^>]*>[\s\S]*?<\/code>\s*<\/pre>/gi, (match) => {
      protectedBlocks.push(match);
      return `%%%PROTECTED_BLOCK_${protectedBlocks.length - 1}%%%`;
    });

    // 2. 清理标签之间的空白
    processed = processed
      // 移除 > 和 < 之间的所有空白和换行（包括 \n, \r, \t, 空格）
      .replace(/>\s+</g, '><')
      // 移除标签内部的多余空白（但保留单个空格）
      .replace(/\s{2,}/g, ' ')
      // 移除开头和结尾的空白
      .trim();

    // 3. 恢复被保护的代码块
    protectedBlocks.forEach((block, index) => {
      processed = processed.replace(`%%%PROTECTED_BLOCK_${index}%%%`, () => block);
    });

    return processed;
  }

  /**
   * 清理HTML内容，移除危险标签和属性
   */
  static sanitizeHtml(html: string): string {
    if (!html) return '';

    // 尝试从缓存获取
    const cacheKey = `sanitize:${html}`;
    const cached = this.getCached(cacheKey);
    if (cached !== null) return cached;

    // 先进行基础安全清理
    const cleanHtml = html
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/<object[^>]*>.*?<\/object>/gi, '')
      .replace(/<embed[^>]*>.*?<\/embed>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '')
      .replace(/javascript:/gi, '');

    const result = this.validateAndCleanHtml(cleanHtml);

    // 存入缓存
    this.setCache(cacheKey, result);

    return result;
  }

  /**
   * 从HTML中提取纯文本
   * 注意：为了避免浏览器自动加载图片，会先移除所有图片标签
   */
  static extractText(html: string | null | undefined): string {
    if (!html || typeof html !== 'string') {
      return '';
    }

    // 移除所有图片标签，避免浏览器解析 HTML 时自动加载图片
    const htmlWithoutImages = html.replace(/<img[^>]*>/gi, '');

    if (typeof window !== 'undefined') {
      const div = document.createElement('div');
      div.innerHTML = htmlWithoutImages;
      return div.textContent || div.innerText || '';
    }

    return htmlWithoutImages
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  /**
   * 计算阅读时间
   */
  static calculateReadingTime(html: string | null | undefined, wordsPerMinute: number = 200): number {
    if (!html || typeof html !== 'string') {
      return 0;
    }

    const text = this.extractText(html);
    return Math.max(1, Math.ceil(text.length / wordsPerMinute));
  }

  /**
   * 获取内容摘要
   */
  static extractSummary(html: string | null | undefined, maxLength: number = 150): string {
    if (!html || typeof html !== 'string') {
      return '';
    }

    const text = this.extractText(html);
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength).trim() + '...';
  }

  /**
   * 将流式Markdown转换为HTML（专门处理流式输出）
   * 核心解析逻辑，支持未闭合的代码块和标签，适合流式渲染
   */
  static streamMarkdownToHtml(markdown: string): string {
    if (!markdown || typeof markdown !== 'string') {
      return '';
    }

    let html = markdown;
    const codeBlocks: string[] = [];
    const inlineCodes: string[] = [];

    // 1. 提取并保护完整闭合的代码块
    // 优化：语言名称允许包含非空白字符（如 c++, c#）
    html = html.replace(/```([^\s\n]*)\s*\n([\s\S]*?)\n```/g, (match, language, code) => {
      const placeholder = `___CODE_BLOCK_${codeBlocks.length}___`;
      const lang = language || 'text';
      const escapedCode = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
      codeBlocks.push(`<pre><code class="language-${lang}">${escapedCode}</code></pre>`);
      return placeholder;
    });

    // 2. 提取并保护未闭合的代码块 (位于末尾)
    // 优化：允许无换行符的情况，实现打字机效果的即时渲染
    html = html.replace(/```([^\s\n]*)(?:[\s\n]+([\s\S]*))?$/g, (match, language, code) => {
      const placeholder = `___CODE_BLOCK_${codeBlocks.length}___`;
      const lang = language || 'text';
      const rawCode = code || ''; // 代码可能为空
      const escapedCode = rawCode
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

      // 即使未闭合也生成完整的 HTML 结构
      codeBlocks.push(`<pre><code class="language-${lang}">${escapedCode}</code></pre>`);
      return placeholder;
    });

    // 3. 提取并保护内联代码
    html = html.replace(/`([^`\n]+)`/g, (match, code) => {
      const placeholder = `___INLINE_CODE_${inlineCodes.length}___`;
      inlineCodes.push(`<code class="rich-text-inline-code">${code}</code>`);
      return placeholder;
    });

    // 5. 处理标题
    html = html.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, title) => {
      const level = hashes.length;
      return `<h${level}>${title.trim()}</h${level}>`;
    });

    // 6. 处理粗体和斜体
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // 7. 处理链接
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      if (this.isValidUrl(url)) {
        return `<a class="rich-text-link" href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
      }
      return text;
    });

    // 8. 处理图片
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
      if (this.isValidUrl(src)) {
        return `<img class="rich-text-image" src="${src}" alt="${alt}" loading="lazy">`;
      }
      return '';
    });

    // 9. 处理引用
    html = html.replace(/^>\s+(.+)$/gm, '<blockquote class="rich-text-quote">$1</blockquote>');

    // 9.5 处理表格
    // 匹配标准 Markdown 表格
    html = html.replace(/^\|(.+)\|\n\|([-:| ]+)\|\n((?:\|.*\|\n?)*)/gm, (match, headerStr, separatorStr, bodyStr) => {
      try {
        const headers = headerStr
          .split('|')
          .map((h: string) => h.trim())
          .filter((_: any, i: number, arr: any[]) => (i > 0 && i < arr.length - 1) || arr.length <= 1); // 简单处理，假设首尾都有 |
        // 如果上面的 split 不对，我们用更通用的方法：去除首尾 | 后 split
        const cleanHeaders = headerStr.replace(/^\||\|$/g, '').split('|');
        const cleanSeparators = separatorStr.replace(/^\||\|$/g, '').split('|');

        // 解析对齐方式
        const aligns = cleanSeparators.map((s: string) => {
          s = s.trim();
          if (s.startsWith(':') && s.endsWith(':')) return 'center';
          if (s.endsWith(':')) return 'right';
          return 'left';
        });

        const ths = cleanHeaders
          .map((h: string, i: number) => `<th style="text-align: ${aligns[i] || 'left'}">${h.trim()}</th>`)
          .join('');

        const rows = bodyStr
          .trim()
          .split('\n')
          .map((row: string) => {
            const cells = row.replace(/^\||\|$/g, '').split('|');
            return `<tr>${cells
              .map((c: string, i: number) => `<td style="text-align: ${aligns[i] || 'left'}">${c.trim()}</td>`)
              .join('')}</tr>`;
          })
          .join('');

        return `<table><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table>`;
      } catch (e) {
        return match; // 解析失败返回原文
      }
    });

    // 10. 处理列表
    const lines = html.split('\n');
    const processedLines: string[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // 有序列表
      if (/^\d+\.\s+/.test(trimmed)) {
        const items: string[] = [];
        while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
          items.push(`<li>${lines[i].trim().replace(/^\d+\.\s+/, '')}</li>`);
          i++;
        }
        processedLines.push(`<ol>${items.join('')}</ol>`);
        continue;
      }

      // 无序列表
      if (/^[-*+]\s+/.test(trimmed)) {
        const items: string[] = [];
        while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
          items.push(`<li>${lines[i].trim().replace(/^[-*+]\s+/, '')}</li>`);
          i++;
        }
        processedLines.push(`<ul>${items.join('')}</ul>`);
        continue;
      }

      processedLines.push(line);
      i++;
    }

    html = processedLines.join('\n');

    // 11. 处理段落（避免将占位符包裹）
    const finalLines = html.split('\n');
    const result: string[] = [];
    let currentParagraph: string[] = [];

    for (const line of finalLines) {
      const trimmed = line.trim();

      if (
        !trimmed ||
        /^<(div|h[1-6]|ul|ol|blockquote|hr|table|pre|img)/.test(trimmed) ||
        /^___CODE_BLOCK_/.test(trimmed) ||
        /^___INLINE_CODE_/.test(trimmed)
      ) {
        if (currentParagraph.length > 0) {
          result.push(`<p>${currentParagraph.join(' ')}</p>`);
          currentParagraph = [];
        }
        if (trimmed) {
          result.push(trimmed);
        }
      } else {
        currentParagraph.push(trimmed);
      }
    }

    if (currentParagraph.length > 0) {
      result.push(`<p>${currentParagraph.join(' ')}</p>`);
    }

    html = result.join('\n');

    // 12. 恢复内联代码 (使用回调避免 $ 字符问题)
    inlineCodes.forEach((code, index) => {
      html = html.replace(`___INLINE_CODE_${index}___`, () => code);
    });

    // 13. 恢复代码块 (使用回调避免 $ 字符问题)
    codeBlocks.forEach((block, index) => {
      html = html.replace(`___CODE_BLOCK_${index}___`, () => block);
    });

    return html;
  }

  /**
   * 将Markdown内容转换为HTML
   * (已代理到 streamMarkdownToHtml 以保持行为一致且支持流式容错)
   */
  static markdownToHtml(markdown: string): string {
    return this.streamMarkdownToHtml(markdown);
  }

  /**
   * 判断内容是否为Markdown格式
   */
  private static isMarkdown(content: string): boolean {
    if (!content) return false;

    const markdownPatterns = [
      /^#{1,6}\s+/m, // 标题
      /\*\*[^*]+\*\*/, // 粗体
      /\*[^*\n]+\*/, // 斜体
      /^[-*+]\s+/m, // 无序列表
      /^\d+\.\s+/m, // 有序列表
      /^>\s+/m, // 引用
      /```[\s\S]*?```/, // 代码块
      /`[^`\n]+`/, // 内联代码
      /\[.+?\]\(.+?\)/, // 链接
      /!\[.*?\]\(.+?\)/, // 图片
    ];

    // 检查代码块特征
    if (/```[\s\S]*?```/.test(content)) {
      return true;
    }

    // 至少匹配1个特征就认为是Markdown
    return markdownPatterns.filter((pattern) => pattern.test(content)).length >= 1;
  }

  /**
   * 为富文本内容添加统一的CSS类名和样式
   */
  static addContentStyles(html: string): string {
    if (!html) return '<div class="rich-text-content"></div>';

    // 尝试从缓存获取
    const cacheKey = `styles:${html}`;
    const cached = this.getCached(cacheKey);
    if (cached !== null) return cached;

    let styledHtml = html;

    // 如果是Markdown，先转换为HTML
    if (this.isMarkdown(html)) {
      // 使用 streamMarkdownToHtml 以支持流式输出时的未闭合代码块即时渲染
      styledHtml = this.streamMarkdownToHtml(html);
      return `<div class="rich-text-content">${this.validateAndCleanHtml(styledHtml)}</div>`;
    }

    // 清理标签之间的多余换行和空白（但保留pre/code标签内的空白）
    styledHtml = this.cleanWhitespaceBetweenTags(styledHtml);

    // 处理已有的HTML内容，添加必要的类名
    // 处理代码块 - 保持原始格式，只添加必要的类名
    styledHtml = styledHtml.replace(
      /<pre([^>]*)>\s*<code([^>]*)>([\s\S]*?)<\/code>\s*<\/pre>/gi,
      (match, preAttr, codeAttr, code) => {
        if (match.includes('rich-text-code-block')) {
          return match;
        }

        // 保持原始格式，不包装
        return match;
      },
    );

    // 处理内联代码
    styledHtml = styledHtml.replace(
      /<code(?![^>]*class="rich-text)([^>]*)>(.*?)<\/code>/gi,
      '<code class="rich-text-inline-code"$1>$2</code>',
    );

    // 处理引用
    styledHtml = styledHtml.replace(
      /<blockquote(?![^>]*class="rich-text-quote")([^>]*)>/gi,
      '<blockquote class="rich-text-quote"$1>',
    );

    // 处理图片
    styledHtml = styledHtml.replace(
      /<img(?![^>]*class="rich-text-image")([^>]*?)src="([^"]*)"([^>]*?)>/gi,
      (match, before, src, after) => {
        if (this.isValidUrl(src)) {
          const loadingAttr = /loading\s*=/.test(before + after) ? '' : ' loading="lazy"';
          return `<img class="rich-text-image"${loadingAttr} src="${src}"${before}${after}>`;
        }
        return '';
      },
    );

    // 处理链接
    styledHtml = styledHtml.replace(
      /<a(?![^>]*class="rich-text-link")([^>]*?)href="([^"]*)"([^>]*?)>/gi,
      (match, before, href, after) => {
        if (this.isValidUrl(href)) {
          const hasTarget = /target\s*=/.test(before + after);
          const hasRel = /rel\s*=/.test(before + after);
          const targetAttr = hasTarget ? '' : ' target="_blank"';
          const relAttr = hasRel ? '' : ' rel="noopener noreferrer"';
          return `<a class="rich-text-link" href="${href}"${targetAttr}${relAttr}${before}${after}>`;
        }
        return '';
      },
    );

    // 处理表格
    if (!styledHtml.includes('rich-text-table-wrapper')) {
      styledHtml = styledHtml.replace(
        /<table([^>]*)>/gi,
        '<div class="rich-text-table-wrapper"><table class="rich-text-table"$1>',
      );
      styledHtml = styledHtml.replace(/<\/table>/gi, '</table></div>');
    }

    const finalHtml = this.validateAndCleanHtml(styledHtml);
    const result = `<div class="rich-text-content">${finalHtml}</div>`;

    // 存入缓存
    this.setCache(cacheKey, result);

    return result;
  }

  /**
   * 检查内容是否为空
   */
  static isEmpty(html: string | null | undefined): boolean {
    if (!html || typeof html !== 'string') {
      return true;
    }

    const text = this.extractText(html);
    return text.length === 0;
  }

  /**
   * 获取内容中的所有图片URL
   */
  static extractImages(html: string | null | undefined): string[] {
    if (!html || typeof html !== 'string') {
      return [];
    }

    const images: string[] = [];
    const imgRegex = /<img[^>]*src="([^"]*)"[^>]*>/gi;
    let match;

    while ((match = imgRegex.exec(html)) !== null) {
      images.push(match[1]);
    }

    return images;
  }

  /**
   * 获取内容中的所有链接
   */
  static extractLinks(html: string | null | undefined): Array<{ text: string; href: string }> {
    if (!html || typeof html !== 'string') {
      return [];
    }

    const links: Array<{ text: string; href: string }> = [];
    const linkRegex = /<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      links.push({
        href: match[1],
        text: this.extractText(match[2]),
      });
    }

    return links;
  }

  /**
   * 统计内容信息
   */
  static getContentStats(html: string | null | undefined) {
    if (!html || typeof html !== 'string') {
      return {
        textLength: 0,
        wordCount: 0,
        readingTime: 0,
        imageCount: 0,
        linkCount: 0,
        codeBlockCount: 0,
        summary: '',
      };
    }

    const text = this.extractText(html);
    const images = this.extractImages(html);
    const links = this.extractLinks(html);
    const codeBlocks = (html.match(/<pre><code/gi) || []).length;

    return {
      textLength: text.length,
      wordCount: text.length, // 中文按字符计算
      readingTime: this.calculateReadingTime(html),
      imageCount: images.length,
      linkCount: links.length,
      codeBlockCount: codeBlocks,
      summary: this.extractSummary(html),
    };
  }
}

// 导出便捷方法
export const {
  sanitizeHtml,
  extractText,
  calculateReadingTime,
  extractSummary,
  addContentStyles,
  isEmpty,
  extractImages,
  extractLinks,
  getContentStats,
} = RichTextParser;
