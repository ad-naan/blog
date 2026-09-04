const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const postService = require('@/services/post.service');

/**
 * 安全的数学表达式求值器（递归下降解析，无 eval / vm）
 * 支持：+ - * / % ^、括号、一元负号、常量 pi/e、白名单数学函数
 */
const SAFE_MATH_FUNCTIONS = {
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  abs: Math.abs,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  log: Math.log,
  log2: Math.log2,
  log10: Math.log10,
  exp: Math.exp,
  pow: Math.pow,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
  sign: Math.sign,
  min: Math.min,
  max: Math.max,
};
const SAFE_MATH_CONSTANTS = { pi: Math.PI, e: Math.E };

function safeMathEvaluate(expression) {
  const src = String(expression).replace(/\s+/g, '');
  if (!src) throw new Error('空表达式');
  // 只允许安全字符（数字、运算符、括号、点、逗号、字母标识符）
  if (!/^[0-9a-zA-Z+\-*/%^().,]+$/.test(src)) {
    throw new Error('包含不允许的字符');
  }

  let pos = 0;
  const peek = () => src[pos];
  const eat = ch => {
    if (src[pos] === ch) {
      pos += 1;
      return true;
    }
    return false;
  };

  const parseExpression = () => {
    let value = parseTerm();
    for (;;) {
      if (eat('+')) value += parseTerm();
      else if (eat('-')) value -= parseTerm();
      else return value;
    }
  };

  const parseTerm = () => {
    let value = parseUnary();
    for (;;) {
      if (eat('*')) value *= parseUnary();
      else if (eat('/')) value /= parseUnary();
      else if (eat('%')) value %= parseUnary();
      else return value;
    }
  };

  const parseUnary = () => {
    if (eat('-')) return -parseUnary();
    if (eat('+')) return parseUnary();
    return parsePower();
  };

  const parsePower = () => {
    const base = parseAtom();
    if (eat('^')) return Math.pow(base, parseUnary()); // 右结合
    return base;
  };

  const parseAtom = () => {
    // 括号
    if (eat('(')) {
      const value = parseExpression();
      if (!eat(')')) throw new Error('括号不匹配');
      return value;
    }
    // 数字
    const numMatch = /^\d+(\.\d+)?/.exec(src.slice(pos));
    if (numMatch) {
      pos += numMatch[0].length;
      return parseFloat(numMatch[0]);
    }
    // 标识符：常量或函数调用
    const idMatch = /^[a-zA-Z]+/.exec(src.slice(pos));
    if (idMatch) {
      const name = idMatch[0].toLowerCase();
      pos += idMatch[0].length;
      if (name in SAFE_MATH_CONSTANTS) {
        return SAFE_MATH_CONSTANTS[name];
      }
      if (name in SAFE_MATH_FUNCTIONS) {
        if (!eat('(')) throw new Error(`函数 ${name} 需要括号调用`);
        const args = [parseExpression()];
        while (eat(',')) args.push(parseExpression());
        if (!eat(')')) throw new Error('括号不匹配');
        return SAFE_MATH_FUNCTIONS[name](...args);
      }
      throw new Error(`未知的标识符: ${name}`);
    }
    throw new Error(`无法解析的位置: ${peek()}`);
  };

  const result = parseExpression();
  if (pos !== src.length) throw new Error(`多余的内容: ${src.slice(pos)}`);
  if (!Number.isFinite(result)) throw new Error('结果不是有限数字');
  return result;
}

/**
 * 博客搜索工具 (真实数据)
 */
const blogSearchTool = new DynamicStructuredTool({
  name: 'search_blog',
  description: `搜索"光阴副本"博客中的技术文章。
  
  **仅在以下情况使用此工具**：
  - 用户明确询问"博客里有没有...文章"
  - 用户询问"博主写过...相关的内容吗"
  - 用户想查找特定技术主题的教程或分享（如 React、Node.js、AI 等）
  
  **不要在以下情况使用此工具**：
  - 用户询问通用知识（如音乐、电影、生活常识等）
  - 用户只是闲聊或问候
  - 用户询问的内容明显与编程、技术无关
  
  如果不确定是否应该搜索博客，优先使用你自己的知识库回答。`,
  schema: z.object({
    query: z.string().describe('搜索关键词'),
  }),
  func: async ({ query }) => {
    console.log(`🔍 [Tool] Searching blog for: ${query}`);
    try {
      const result = await postService.findAll({
        page: 1,
        limit: 5,
        search: query,
        status: 1,
        isAdmin: false,
      });

      const posts = result.posts;

      if (!posts || posts.length === 0) {
        return '未找到相关文章。你可以尝试换个关键词，或者告诉我你想了解什么技术。';
      }

      const simplifiedPosts = posts.map(p => ({
        id: p.id,
        title: p.title,
        // findAll 列表已不返回 content，仅用 summary
        summary: p.summary || '',
        publishedAt: p.publishedAt,
      }));

      return JSON.stringify(simplifiedPosts);
    } catch (error) {
      console.error('Blog search tool error:', error);
      return `搜索出错: ${error.message}`;
    }
  },
});

/**
 * 获取当前时间工具
 */
const currentTimeTool = new DynamicStructuredTool({
  name: 'get_current_time',
  description: '获取当前系统时间。当用户询问现在几点、今天几号时使用。',
  schema: z.object({}),
  func: async () => {
    return new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  },
});

/**
 * 随机编程名言工具
 */
const randomQuoteTool = new DynamicStructuredTool({
  name: 'get_random_quote',
  description: '获取一条随机的编程/技术相关励志名言。当用户需要鼓励、灵感或想听点有趣的话时使用。',
  schema: z.object({}),
  func: async () => {
    const quotes = [
      '代码如诗，Bug 如人生 —— 总有意外惊喜。',
      '优秀的程序员不是写代码最多的，而是删代码最狠的。',
      '先让代码跑起来，再让它跑得优雅。—— Kent Beck',
      '任何傻瓜都能写出计算机能理解的代码，只有优秀的程序员才能写出人类能理解的代码。—— Martin Fowler',
      '过早优化是万恶之源。—— Donald Knuth',
      '调试代码的难度是写代码的两倍。所以如果你尽自己所能写出最聪明的代码，那你就没有足够的智慧去调试它。—— Brian Kernighan',
      '好的代码本身就是最好的文档。—— Steve McConnell',
      'Talk is cheap, show me the code. —— Linus Torvalds',
      '编程不是关于你知道什么，而是关于你能弄清楚什么。',
      '每一个伟大的开发者都曾经是一个糟糕的开发者，关键是不要放弃。',
      'Bug 不是敌人，它们是你代码的老师。',
      '写代码就像写作，第一稿总是垃圾，重构才是艺术。',
    ];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    return `💡 ${randomQuote}`;
  },
});

/**
 * 简单计算器工具
 */
const calculatorTool = new DynamicStructuredTool({
  name: 'calculate',
  description:
    '执行数学计算。支持基本的算术运算（加减乘除、幂运算、三角函数等）。当用户需要计算数学表达式时使用。',
  schema: z.object({
    expression: z.string().describe('数学表达式，如 "2 + 2" 或 "sqrt(16) + pow(2, 3)"'),
  }),
  func: async ({ expression }) => {
    console.log(`🧮 [Tool] Calculating: ${expression}`);
    try {
      // 使用无 eval 的递归下降解析器安全求值（vm2 已废弃且有沙箱逃逸 CVE，已移除）
      const result = safeMathEvaluate(expression);
      return `计算结果: ${result}`;
    } catch (error) {
      return `计算出错: ${error.message}。请确保表达式语法正确。`;
    }
  },
});

/**
 * 随机技术建议工具
 */
const techTipTool = new DynamicStructuredTool({
  name: 'get_tech_tip',
  description: '获取一条随机的编程技巧或最佳实践建议。当用户想学习新知识或需要技术建议时使用。',
  schema: z.object({}),
  func: async () => {
    const tips = [
      '💡 使用 `console.table()` 可以更清晰地查看数组或对象数据。',
      '🔧 善用 `Array.prototype.reduce()` 可以优雅地处理复杂的数据转换。',
      '⚡ 使用 `Promise.all()` 并行执行多个异步任务，而不是串行 `await`。',
      '🎯 编写单元测试时，遵循 AAA 原则：Arrange（准备）、Act（执行）、Assert（断言）。',
      '🧹 定期重构代码，消除重复逻辑（DRY 原则）。',
      '📦 使用解构赋值可以让代码更简洁：`const { name, age } = user;`',
      '🚀 善用 `async/await` 替代 Promise 链，让异步代码更易读。',
      '🔍 使用 `Object.freeze()` 可以创建不可变对象，避免意外修改。',
      '⏱️ 使用 `performance.now()` 而不是 `Date.now()` 来精确测量代码执行时间。',
      '🎨 遵循一致的代码风格（使用 Prettier 或 ESLint），让团队协作更顺畅。',
    ];
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    return randomTip;
  },
});

module.exports = {
  blogSearchTool,
  currentTimeTool,
  randomQuoteTool,
  calculatorTool,
  techTipTool,
  // 导出所有工具列表
  tools: [
    blogSearchTool,
    currentTimeTool,
    randomQuoteTool,
    calculatorTool,
    techTipTool,
  ],
};
