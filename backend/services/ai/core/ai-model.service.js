const { logger } = require('@/utils/logger');
const environment = require('@/config/environment');

/**
 * AI 模型服务 - 统一的模型管理
 * 支持多种 LLM 提供商，提供统一的调用接口
 */
class AIModelService {
  constructor() {
    this.config = environment.get().ai;
    this.model = null; // 非流式模型实例
    this.streamingModel = null; // 流式模型实例
    this.modelName = null;
    this.providerName = null;
    this.isInitialized = false;

    // 支持的提供商配置
    this.providers = {
      openai: {
        import: async () => {
          const mod = await import('@langchain/openai');
          return mod.ChatOpenAI;
        },
        package: '@langchain/openai',
        configKey: 'openAIApiKey',
        defaultModel: 'gpt-4o-mini',
      },
      anthropic: {
        import: async () => {
          const mod = await import('@langchain/anthropic');
          return mod.ChatAnthropic;
        },
        package: '@langchain/anthropic',
        configKey: 'anthropicApiKey',
        defaultModel: 'claude-3-5-sonnet-20241022',
      },
      google: {
        import: async () => {
          const mod = await import('@langchain/google-genai');
          return mod.ChatGoogleGenerativeAI;
        },
        package: '@langchain/google-genai',
        configKey: 'apiKey',
        defaultModel: 'gemini-2.0-flash-exp',
      },
      zhipu: {
        import: async () => {
          const mod = await import('@langchain/community/chat_models/zhipuai');
          return mod.ChatZhipuAI;
        },
        package: '@langchain/community',
        configKey: 'zhipuAIApiKey',
        defaultModel: 'glm-4',
      },
    };
  }

  /**
   * 初始化 AI 模型
   */
  async initialize() {
    if (this.isInitialized) {
      return true;
    }

    try {
      const provider = this.config.provider;
      const providerConfig = this.providers[provider];

      if (!providerConfig) {
        throw new Error(
          `不支持的 AI 提供商: ${provider}。支持的提供商: ${Object.keys(this.providers).join(', ')}`
        );
      }

      if (!this.config.apiKey) {
        throw new Error(`${provider} 的 API Key 未配置，请设置环境变量 AI_API_KEY`);
      }

      // 基础配置
      const baseConfig = {
        [providerConfig.configKey]: this.config.apiKey,
        modelName: this.config.model || providerConfig.defaultModel,
        temperature: this.config.temperature || 0.7,
        maxTokens: this.config.maxTokens || 8192,
        streamUsage: false, // 禁用 token 统计
        maxRetries: 2,
        timeout: 60000,
      };

      // 自定义 Base URL（用于代理或自定义端点）
      if (this.config.baseURL) {
        baseConfig.configuration = {
          apiKey: this.config.apiKey,
          baseURL: this.config.baseURL,
        };
      }

      // 动态加载对应提供商的模型类（使用 ESM 入口）
      const ModelClass = await providerConfig.import();

      // 创建非流式模型实例
      this.model = new ModelClass({
        ...baseConfig,
        streaming: false,
      });

      // 创建流式模型实例
      this.streamingModel = new ModelClass({
        ...baseConfig,
        streaming: true,
      });

      this.modelName = baseConfig.modelName;
      this.providerName = provider;
      this.isInitialized = true;

      return true;
    } catch (error) {
      logger.error('❌ AI 模型初始化失败', error);
      throw error;
    }
  }

  /**
   * 获取模型实例（非流式）
   */
  getModel() {
    if (!this.isInitialized) {
      throw new Error('AI 模型未初始化，请先调用 initialize()');
    }
    return this.model;
  }

  /**
   * 获取流式模型实例
   */
  getStreamingModel() {
    if (!this.isInitialized) {
      throw new Error('AI 模型未初始化，请先调用 initialize()');
    }
    return this.streamingModel;
  }

  /**
   * 检查模型是否可用
   */
  isAvailable() {
    return this.isInitialized && this.model !== null;
  }

  /**
   * 获取模型信息
   */
  getInfo() {
    return {
      provider: this.providerName || this.config.provider,
      model:
        this.modelName || this.config.model || this.providers[this.config.provider]?.defaultModel,
      available: this.isAvailable(),
      temperature: this.config.temperature || 0.7,
      maxTokens: this.config.maxTokens || 8192,
    };
  }

  /**
   * 获取当前使用的模型名称（用于日志）
   */
  getCurrentModel() {
    return {
      provider: this.providerName,
      model: this.modelName,
    };
  }
}

module.exports = new AIModelService();
