const aiService = require('./ai.service');
const aiModel = require('./core/ai-model.service');
const { logger } = require('@/utils/logger');

/**
 * AI 写作服务
 * 提供各种写作相关的 AI 功能
 */
class AIWritingService {
  /**
   * 生成文章（流水线：大纲 → 逐章节生成 → 组装）
   * 单次调用生成长文会被 token 上限截断且内容泛泛，改为多步生成保证长度与质量
   */
  async generateArticle(params, onChunk = null) {
    const { title, keywords = [], wordCount = 1500, style = '专业且易懂', taskId } = params;

    logger.info('生成文章(流水线)', { title, wordCount, taskId });

    const keywordStr = keywords.join(', ');

    // 1. 生成大纲
    const outline = await aiService.generate('outline', { topic: title, keywords: keywordStr });
    if (!outline || !outline.trim()) {
      throw new Error('大纲生成失败');
    }

    // 2. 解析章节（按 ## / ### 标题拆分）
    const sections = this._parseOutlineSections(outline);
    if (sections.length === 0) {
      // 大纲解析失败时退回单次生成
      logger.warn('大纲解析失败，退回单次生成', { taskId });
      return this._generateArticleSingle(title, keywordStr, wordCount, style, onChunk, taskId);
    }

    // 3. 按字数分配各章节目标字数
    const sectionWordCount = Math.max(200, Math.ceil(wordCount / sections.length));

    // 4. 逐章节生成并流式推送
    const parts = [];
    parts.push(this._articleHeader(title, style));

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const sectionTaskId = taskId ? `${taskId}_s${i}` : undefined;

      const sectionText = onChunk
        ? await aiService.streamGenerate(
            'section',
            {
              title,
              keywords: keywordStr,
              outline,
              section,
              sectionWordCount,
              style,
            },
            onChunk,
            { taskId: sectionTaskId }
          )
        : await aiService.generate('section', {
            title,
            keywords: keywordStr,
            outline,
            section,
            sectionWordCount,
            style,
          });

      parts.push(sectionText.trim());
    }

    return parts.join('\n\n');
  }

  /**
   * 单次生成文章（退路 & 短文场景）
   */
  async _generateArticleSingle(title, keywordStr, wordCount, style, onChunk, taskId) {
    const variables = { title, keywords: keywordStr, wordCount, style };
    if (onChunk) {
      return await aiService.streamGenerate('article', variables, onChunk, { taskId });
    }
    return await aiService.generate('article', variables);
  }

  /**
   * 解析大纲为章节块（每个二级标题及其下的要点为一块）
   */
  _parseOutlineSections(outline) {
    const lines = outline.split('\n');
    const sections = [];
    let current = null;

    for (const line of lines) {
      const h2 = line.match(/^##\s+(.+)/);
      const h3 = line.match(/^###?\s+(.+)/);

      if (h2) {
        if (current) sections.push(current);
        current = { title: h2[1].trim(), body: [] };
      } else if (h3 && current) {
        current.body.push(line);
      } else if (current && line.trim()) {
        current.body.push(line);
      }
    }
    if (current) sections.push(current);

    return sections
      .map(s => (s.body.length ? `${s.title}\n${s.body.join('\n')}` : s.title))
      .filter(s => s.trim().length > 0);
  }

  /**
   * 文章头部（标题 + 引言）
   */
  _articleHeader(title, style) {
    return `# ${title}`;
  }

  /**
   * 润色文本
   */
  async polish(content, style = '更加流畅和专业', onChunk = null, taskId = null) {
    logger.info('润色文本', { contentLength: content.length, taskId });

    const variables = { content, style };

    if (onChunk) {
      return await aiService.streamGenerate('polish', variables, onChunk, { taskId });
    } else {
      return await aiService.generate('polish', variables);
    }
  }

  /**
   * 改进文本
   */
  async improve(content, improvements = '提高可读性和逻辑性', onChunk = null, taskId = null) {
    logger.info('改进文本', { contentLength: content.length, taskId });

    const variables = { content, improvements };

    if (onChunk) {
      return await aiService.streamGenerate('improve', variables, onChunk, { taskId });
    } else {
      return await aiService.generate('improve', variables);
    }
  }

  /**
   * 扩展内容
   */
  async expand(content, length = 'medium', onChunk = null, taskId = null) {
    const lengthInstructions = {
      short: '适度扩展：增加 20%-50% 内容，补充必要的细节和说明',
      medium: '充分扩展：增加 100%-200% 内容，添加详细解释、实例和相关知识',
      long: '深度扩展：增加 200%-400% 内容，全面深入分析，包含丰富案例、背景知识和延伸思考',
    };

    logger.info('扩展内容', { contentLength: content.length, length, taskId });

    const variables = {
      content,
      lengthInstruction: lengthInstructions[length] || lengthInstructions.medium,
    };

    if (onChunk) {
      return await aiService.streamGenerate('expand', variables, onChunk, { taskId });
    } else {
      return await aiService.generate('expand', variables);
    }
  }

  /**
   * 总结内容
   */
  async summarize(content, length = 'medium', onChunk = null, taskId = null) {
    const summaryInstructions = {
      short: '简洁摘要：1-2 个段落，80-150 字，提炼核心要点',
      medium: '标准摘要：3-5 个段落，200-400 字，涵盖主要内容和关键信息',
      long: '详细摘要：6-10 个段落，500-800 字，全面总结包含背景、要点、结论',
    };

    logger.info('总结内容', { contentLength: content.length, length, taskId });

    const variables = {
      content,
      summaryInstruction: summaryInstructions[length] || summaryInstructions.medium,
    };

    if (onChunk) {
      return await aiService.streamGenerate('summarize', variables, onChunk, { taskId });
    } else {
      return await aiService.generate('summarize', variables);
    }
  }

  /**
   * 翻译内容
   */
  async translate(content, targetLang = '英文', onChunk = null, taskId = null) {
    logger.info('翻译内容', { contentLength: content.length, targetLang, taskId });

    const variables = { content, targetLang };

    if (onChunk) {
      return await aiService.streamGenerate('translate', variables, onChunk, { taskId });
    } else {
      return await aiService.generate('translate', variables);
    }
  }

  /**
   * 生成标题
   */
  async generateTitle(content, keywords = []) {
    const variables = {
      content,
      keywords: keywords.join(', '),
    };
    const result = await aiService.generate('title', variables);
    return this._extractPlainText(result);
  }

  /**
   * 生成摘要
   */
  async generateSummary(content) {
    const variables = { content };
    const result = await aiService.generate('summary', variables);
    return this._extractPlainText(result);
  }

  /**
   * 生成大纲
   */
  async generateOutline(topic, keywords = [], onChunk = null, taskId = null) {
    logger.info('生成大纲', { topic, taskId });

    const variables = {
      topic,
      keywords: keywords.join(', '),
    };

    if (onChunk) {
      return await aiService.streamGenerate('outline', variables, onChunk, { taskId });
    } else {
      return await aiService.generate('outline', variables);
    }
  }

  /**
   * 提取纯文本（用于标题和摘要）
   */
  _extractPlainText(content) {
    if (!content || typeof content !== 'string') {
      return '';
    }

    let text = content.trim();

    // 移除 Markdown 代码块标记
    text = text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '');

    // 移除 HTML 标签
    text = text.replace(/<[^>]+>/g, '');

    // 移除多余的空白
    text = text.replace(/\s+/g, ' ').trim();

    // 移除 Markdown 标记
    text = text.replace(/[#*_`~]/g, '');

    return text;
  }

  /**
   * 取消任务
   */
  cancelTask(taskId) {
    return aiService.cancelStream(taskId);
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId) {
    return aiService.getStreamStatus(taskId);
  }
}

module.exports = new AIWritingService();
