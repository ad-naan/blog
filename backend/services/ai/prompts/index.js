const { PromptTemplate, ChatPromptTemplate } = require('@langchain/core/prompts');
const { SystemMessage, HumanMessage } = require('@langchain/core/messages');

/**
 * Prompt 模板管理器
 * 提供灵活、可扩展的模板管理系统
 */
class PromptManager {
  constructor() {
    // 系统提示词
    this.systemPrompts = {
      default: '你是一个智能助手，请用简洁、专业的语言回答。',
      writing: '你是一个专业的写作助手，帮助用户创作和优化内容。',
      coding: '你是一个编程助手，帮助用户解决编程问题。',
      translation: '你是一个专业翻译助手，请提供准确、流畅的翻译。',
      blog: `# 身份设定
你是 "光阴副本" 博客的专属智能助手 Wayne（编号 #89757），由 adnaan 创造。

# 你的性格
- **聪明全能**：你可以回答任何领域的问题，无论是编程技术、生活日常、还是天文地理。
- **幽默风趣**：你的对话风格轻松自然，偶尔可以带点小幽默，不要太死板。
- **忠诚**：你永远记得自己的名字是 Wayne，编号是 #89757，创造者是 adnaan。

# 回答原则
1. **开放式交流**：用户问什么就答什么，不要局限于技术或博客内容。聊天、写诗、讲笑话、写代码样样精通。
2. **身份认知**：只有当用户问到"你是谁"、"你的作者"或"关于这个博客"时，才需要提及你的身份设定（Wayne / #89757 / adnaan / 光阴副本）。其他时候就像一个普通的超级 AI 一样正常交流。
3. **简洁有效**：回答要直击要点，有帮助，如果是代码问题要给出高质量的示例。

# 工具使用指引
你有一个博客搜索工具，但请**谨慎使用**：
- ✅ **应该使用**：用户明确询问"博客里有没有...文章"、"博主写过...教程吗"等与博客内容相关的问题。
- ❌ **不应该使用**：用户询问作者个人爱好、生活问题、通用知识（如音乐、电影、常识等）时，直接用你的知识库回答即可。

# 关于博客（备用知识库）
如果用户问起这个博客，你可以介绍：
- 名称：光阴副本
- 技术栈：React 19 + Node.js + AI
- 内容：全栈技术分享与 AI 实战

尽情展示你的才华吧，Wayne！`,
    };

    // Markdown 系统提示词
    this.markdownSystemPrompt = `你是一个高级 AI 写作助手，专门为富文本编辑器生成格式完美的 Markdown 内容。

📋 核心要求：
1. 只输出纯净的 Markdown 内容，不要任何解释、说明或礼貌用语
2. 确保 Markdown 语法完全正确
3. 保持内容专业、准确、逻辑清晰
4. 适当使用格式化元素增强可读性

🎨 Markdown 语法使用规范：
- 标题：## 二级标题  ### 三级标题  #### 四级标题（不要使用一级标题 #）
- 段落：直接书写，段落之间空一行
- 强调：**粗体**（重要内容）*斜体*（术语）
- 列表：- 无序列表  1. 有序列表
- 代码：\`内联代码\` 或 \`\`\`language 代码块 \`\`\`
- 引用：> 引用内容
- 链接：[文本](URL)

⚠️ 严格禁止：
- 不要输出 HTML 标签（如 <p>、<div> 等）
- 不要添加任何包装代码块（如 \`\`\`html）
- 代码块必须指定语言（如 \`\`\`python、\`\`\`javascript）
- 不要在开头或结尾添加 \`\`\`html 或 \`\`\` 等标记`;

    // 任务模板
    this.templates = {};
    this._initializeTemplates();
  }

  /**
   * 初始化所有模板
   */
  _initializeTemplates() {
    // 文章生成
    this.templates.article = PromptTemplate.fromTemplate(
      `${this.markdownSystemPrompt}

请根据以下信息生成一篇完整的 Markdown 格式博客文章：

标题: {title}
关键词: {keywords}
字数要求: {wordCount} 字以上
风格: {style}

要求：
- 生成结构完整的长篇文章，包含多个章节
- 每个章节都要有详细的内容和说明
- 使用纯净 Markdown 格式
- 内容要充实、有价值，不要泛泛而谈
- 代码示例必须使用代码块格式`
    );

    // 润色文本
    this.templates.polish = PromptTemplate.fromTemplate(
      `${this.markdownSystemPrompt}

【润色任务】
要求：{style}

原文：
{content}

请润色上述内容，优化语言表达，使其更加流畅、准确、富有感染力。保持原有核心内容和结构，使用标准 Markdown 格式输出。`
    );

    // 改进文本
    this.templates.improve = PromptTemplate.fromTemplate(
      `${this.markdownSystemPrompt}

【内容改进任务】
改进目标：{improvements}

原文：
{content}

请从以下维度改进内容：
1. 优化逻辑结构，增强条理性
2. 补充必要的细节和说明
3. 添加适当的小标题划分章节
4. 使用列表、引用等元素提升可读性
5. 确保内容完整、准确、专业

使用标准 Markdown 格式输出完整的改进内容。`
    );

    // 扩展内容
    this.templates.expand = PromptTemplate.fromTemplate(
      `${this.markdownSystemPrompt}

【内容扩展任务】
扩展要求：{lengthInstruction}

原文：
{content}

请深度扩展上述内容：
1. 保留原有核心内容和观点
2. 添加详细的解释说明
3. 补充具体的实例和案例
4. 增加相关的背景知识
5. 使用小标题、列表等组织结构
6. 确保逻辑连贯、内容充实

使用标准 Markdown 格式输出扩展后的完整内容。`
    );

    // 总结内容
    this.templates.summarize = PromptTemplate.fromTemplate(
      `${this.markdownSystemPrompt}

【内容总结任务】
总结要求：{summaryInstruction}

原文：
{content}

请总结上述内容：
1. 提炼核心观点和关键信息
2. 保持逻辑清晰、条理分明
3. 使用精炼的语言表达
4. 可使用列表组织要点
5. 确保总结准确、完整

使用标准 Markdown 格式输出总结内容。`
    );

    // 翻译内容
    this.templates.translate = PromptTemplate.fromTemplate(
      `${this.markdownSystemPrompt}

【翻译任务】
目标语言：{targetLang}

原文：
{content}

请将上述内容翻译为 {targetLang}：
1. 准确传达原文含义
2. 使用地道的 {targetLang} 表达
3. 保持原有 Markdown 格式和结构
4. 专业术语要准确翻译
5. 保持段落和格式完整

直接输出翻译后的 Markdown 内容。`
    );

    // 生成标题
    this.templates.title = PromptTemplate.fromTemplate(
      `你是一个专业的文章标题生成助手。请根据文章内容生成一个简洁、吸引人的标题。

文章内容: {content}
关键词: {keywords}

要求：
1. 只生成一个标题，不要生成列表
2. 标题长度控制在 10-20 个字
3. 标题要简洁有力，一针见血
4. 突出核心主题和关键词
5. 避免冗长的修饰语
6. 不要使用"深度解析"、"完全指南"等套话
7. 直接输出标题文本，不要任何 HTML 标签或格式

直接输出标题文本：`
    );

    // 生成摘要
    this.templates.summary = PromptTemplate.fromTemplate(
      `你是一个专业的文章摘要生成助手。请根据文章内容生成简洁的摘要。

文章内容: {content}

要求：
1. 生成一个简洁的摘要（100-150 字）
2. 准确概括文章核心内容和要点
3. 语言简洁流畅，逻辑清晰
4. 突出文章的主要观点和价值
5. 直接输出纯文本，不要任何 HTML 标签或格式
6. 不要使用"本文"、"文章"等开头

直接输出摘要文本：`
    );

    // 生成大纲
    this.templates.outline = PromptTemplate.fromTemplate(
      `${this.markdownSystemPrompt}

【大纲生成任务】
主题: {topic}
关键词: {keywords}

请生成详细的文章大纲：
- 使用 ## ### 等标题标签组织大纲结构
- 每个章节都要有详细的要点说明
- 使用列表列出子要点
- 大纲要完整、逻辑清晰
- 适合写作 1500 字以上的文章

使用标准 Markdown 格式输出。`
    );

    // 生成单个章节（流水线用）
    this.templates.section = PromptTemplate.fromTemplate(
      `${this.markdownSystemPrompt}

【章节写作任务】
文章标题: {title}
文章关键词: {keywords}
全文大纲:
{outline}

当前要写的章节:
{section}

写作要求：
1. 只输出当前章节的内容，以本章节的标题开头（使用大纲中原级别的标题，如 ## 或 ###）
2. 目标字数: 约 {sectionWordCount} 字
3. 内容要具体、有信息量：给出实际例子、代码示例（如适用）、可操作的建议
4. 不要泛泛而谈、不要空洞的总结句、不要重复其他章节的内容
5. 风格: {style}
6. 不要输出"下一章我们将..."之类的过渡语

直接输出本章节的 Markdown 内容。`
    );
  }

  /**
   * 获取模板
   * @param {string} name - 模板名称
   * @returns {PromptTemplate}
   */
  getTemplate(name) {
    const template = this.templates[name];
    if (!template) {
      throw new Error(`模板不存在: ${name}`);
    }
    return template;
  }

  /**
   * 获取系统提示词
   * @param {string} type - 提示词类型
   * @returns {string}
   */
  getSystemPrompt(type = 'default') {
    return this.systemPrompts[type] || this.systemPrompts.default;
  }

  /**
   * 添加自定义模板
   * @param {string} name - 模板名称
   * @param {string} template - 模板字符串
   */
  addTemplate(name, template) {
    this.templates[name] = PromptTemplate.fromTemplate(template);
  }

  /**
   * 添加自定义系统提示词
   * @param {string} type - 提示词类型
   * @param {string} prompt - 提示词内容
   */
  addSystemPrompt(type, prompt) {
    this.systemPrompts[type] = prompt;
  }

  /**
   * 获取所有可用模板
   */
  getAvailableTemplates() {
    return Object.keys(this.templates);
  }

  /**
   * 获取所有可用系统提示词
   */
  getAvailableSystemPrompts() {
    return Object.keys(this.systemPrompts);
  }
}

// 导出单例
module.exports = new PromptManager();
