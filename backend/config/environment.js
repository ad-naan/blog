const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

/**
 * 环境配置管理类
 */
class EnvironmentManager {
  constructor() {
    this.env = process.env.NODE_ENV || 'development';
    this.config = {};
    this.loadEnvironmentConfig();
  }

  /**
   * 加载环境配置
   */
  loadEnvironmentConfig() {
    // 确定环境配置文件路径
    const envFile = path.join(process.cwd(), `env.${this.env}`);

    if (fs.existsSync(envFile)) {
      // 加载对应的环境配置文件
      dotenv.config({ path: envFile });
      console.log(`✅ 已加载环境配置: ${envFile}`);
    } else {
      console.warn(`⚠️  环境配置文件不存在: ${envFile}`);
      // 如果没有找到配置文件，尝试加载默认的.env文件
      dotenv.config();
    }

    // 验证并设置配置
    this.validateAndSetConfig();
  }

  /**
   * 验证并设置配置
   */
  validateAndSetConfig() {
    this.config = {
      // 基础配置
      nodeEnv: this.env,
      port: parseInt(process.env.PORT) || 8200,

      // 数据库配置
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        name: process.env.DB_NAME || 'blog_dev',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root',
        dialect: 'mysql',
        pool: this.getDatabasePool(),
        logging: this.env === 'development' ? console.log : false,
        define: {
          underscored: true,
          underscoredAll: true,
        },
      },

      // Redis配置
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || null,
        db: parseInt(process.env.REDIS_DB) || 1,
        url: process.env.REDIS_PASSWORD
          ? `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}/${process.env.REDIS_DB}`
          : `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}/${process.env.REDIS_DB}`,
      },

      // JWT配置
      jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '1d',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      },

      // CORS配置
      cors: {
        allowedOrigins: process.env.ALLOWED_ORIGINS
          ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
          : ['http://localhost:3000'],
      },

      // 日志配置
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        filePath: process.env.LOG_FILE_PATH || './logs',
      },

      // 监控配置
      monitoring: {
        enabled: process.env.ENABLE_MONITORING === 'true',
      },

      // AI配置 - 统一配置格式
      ai: {
        // 当前使用的提供商
        provider: process.env.AI_PROVIDER,

        // 当前使用的模型（如果不指定，使用提供商的默认模型）
        model: process.env.AI_MODEL,

        // 统一的 API Key
        apiKey: process.env.AI_API_KEY,

        // 自定义 Base URL（可选，用于网关或自定义端点）
        baseURL: process.env.AI_BASE_URL,

        // 模型参数
        temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.7,
        maxTokens: parseInt(process.env.AI_MAX_TOKENS) || 8192,

        // 请求配置
        timeout: parseInt(process.env.AI_TIMEOUT) || 30000, // 请求超时时间（毫秒）
        maxRetries: parseInt(process.env.AI_MAX_RETRIES) || 3, // 最大重试次数
        retryDelay: parseInt(process.env.AI_RETRY_DELAY) || 1000, // 重试延迟（毫秒）

        // 并发控制
        maxConcurrentPerUser: parseInt(process.env.AI_MAX_CONCURRENT_PER_USER) || 3, // 每用户最大并发请求数

        // 历史消息配置
        maxHistoryMessages: parseInt(process.env.AI_MAX_HISTORY_MESSAGES) || 20, // 最大历史消息数量

        // 默认 System Prompt 类型
        defaultPromptType: process.env.AI_DEFAULT_PROMPT_TYPE || 'WRITING',
      },

      // Socket.IO配置
      socketIO: {
        // 基础配置
        enabled: process.env.SOCKET_IO_ENABLED === 'true',
        authKey: process.env.SOCKET_IO_AUTH_KEY || 'duyong-socket-328',
        path: process.env.SOCKET_IO_PATH || '/socket.io',

        // CORS配置
        corsOrigin: process.env.SOCKET_IO_CORS_ORIGIN
          ? process.env.SOCKET_IO_CORS_ORIGIN.split(',').map(origin => origin.trim())
          : process.env.ALLOWED_ORIGINS
            ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
            : ['http://localhost:3000', 'http://localhost:3001'],

        // 连接配置
        pingTimeout: parseInt(process.env.SOCKET_IO_PING_TIMEOUT) || 60000,
        pingInterval: parseInt(process.env.SOCKET_IO_PING_INTERVAL) || 25000,
        upgradeTimeout: parseInt(process.env.SOCKET_IO_UPGRADE_TIMEOUT) || 30000,
        maxHttpBufferSize: parseInt(process.env.SOCKET_IO_MAX_HTTP_BUFFER_SIZE) || 1000000,
        transports: process.env.SOCKET_IO_TRANSPORTS
          ? process.env.SOCKET_IO_TRANSPORTS.split(',').map(t => t.trim())
          : ['polling', 'websocket'],

        // 限流与安全配置
        maxConnections: parseInt(process.env.SOCKET_IO_MAX_CONNECTIONS) || 1000,
        rateLimitConnections: parseInt(process.env.SOCKET_IO_RATE_LIMIT_CONNECTIONS) || 10,
        rateLimitResetInterval: parseInt(process.env.SOCKET_IO_RATE_LIMIT_RESET_INTERVAL) || 60000,
      },

      // Redis高级配置
      redisAdvanced: {
        connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT) || 30000,
        commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT) || 10000,
        retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY_ON_FAILOVER) || 100,
        maxRetries: parseInt(process.env.REDIS_MAX_RETRIES) || 5,
        lazyConnect: process.env.REDIS_LAZY_CONNECT === 'true',
        keepAlive: parseInt(process.env.REDIS_KEEP_ALIVE) || 30000,
        maxLoadingTimeout: parseInt(process.env.REDIS_MAX_LOADING_TIMEOUT) || 5000,
        maxRetryAttempts: parseInt(process.env.REDIS_MAX_RETRY_ATTEMPTS) || 20,
        retryDelay: parseInt(process.env.REDIS_RETRY_DELAY) || 200,
        maxRetryDelay: parseInt(process.env.REDIS_MAX_RETRY_DELAY) || 3000,
      },

      // 状态服务配置
      status: {
        inactiveThreshold: parseInt(process.env.STATUS_INACTIVE_THRESHOLD) || 30 * 60 * 1000,
        cleanupThreshold: parseInt(process.env.STATUS_CLEANUP_THRESHOLD) || 60 * 60 * 1000,
        autoCleanupInterval: parseInt(process.env.STATUS_AUTO_CLEANUP_INTERVAL) || 5 * 60 * 1000,
        musicExpireTime: parseInt(process.env.STATUS_MUSIC_EXPIRE_TIME) || 3600,
        maxActiveApps: parseInt(process.env.STATUS_MAX_ACTIVE_APPS) || 3,
        appExpireTime: parseInt(process.env.STATUS_APP_EXPIRE_TIME) || 86400,
      },

      // 代理服务配置
      proxy: {
        ipLocationTTL: parseInt(process.env.PROXY_IP_LOCATION_TTL) || 3600,
        weatherTTL: parseInt(process.env.PROXY_WEATHER_TTL) || 1800,
        musicUrlTTL: parseInt(process.env.PROXY_MUSIC_URL_TTL) || 86400,
      },

      // 访客统计配置
      visitor: {
        expireThreshold: parseInt(process.env.VISITOR_STATS_EXPIRE_THRESHOLD) || 5 * 60 * 1000,
      },

      // GitHub集成配置
      github: {
        token: process.env.GITHUB_TOKEN || null,
        requestTimeout: parseInt(process.env.GITHUB_REQUEST_TIMEOUT) || 10000,
        cacheTTL: parseInt(process.env.GITHUB_CACHE_TTL) || 900,
      },

      // OAuth 第三方登录配置
      oauth: {
        // 前端回调地址
        frontendCallbackUrl: process.env.OAUTH_FRONTEND_CALLBACK_URL || 'http://localhost:3000/oauth/callback',
        
        // GitHub OAuth
        github: {
          clientId: process.env.GITHUB_OAUTH_CLIENT_ID || null,
          clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET || null,
          callbackURL: process.env.GITHUB_OAUTH_CALLBACK_URL || '/api/auth/github/callback',
        },
        
        // Google OAuth
        google: {
          clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || null,
          clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || null,
          callbackURL: process.env.GOOGLE_OAUTH_CALLBACK_URL || '/api/auth/google/callback',
        },
        
        // Gitee OAuth
        gitee: {
          clientId: process.env.GITEE_OAUTH_CLIENT_ID || null,
          clientSecret: process.env.GITEE_OAUTH_CLIENT_SECRET || null,
          callbackURL: process.env.GITEE_OAUTH_CALLBACK_URL || '/api/auth/gitee/callback',
        },
      },
    };

    // 验证必需配置
    this.validateRequiredConfig();
  }

  /**
   * 获取数据库连接池配置
   */
  getDatabasePool() {
    // 从环境变量读取，或使用默认值
    const acquire = parseInt(process.env.DB_POOL_ACQUIRE) || 30000;
    const idle = parseInt(process.env.DB_POOL_IDLE) || 10000;

    // 根据环境设置连接池大小
    let max, min;
    if (process.env.DB_POOL_MAX && process.env.DB_POOL_MIN) {
      // 如果环境变量指定了，使用环境变量
      max = parseInt(process.env.DB_POOL_MAX);
      min = parseInt(process.env.DB_POOL_MIN);
    } else {
      // 否则根据环境使用默认值
      switch (this.env) {
        case 'development':
          max = 10;
          min = 0;
          break;
        case 'test':
          max = 5;
          min = 0;
          break;
        case 'production':
          max = 20;
          min = 5;
          break;
        default:
          max = 10;
          min = 0;
      }
    }

    return { acquire, idle, max, min };
  }

  /**
   * 验证必需配置
   */
  validateRequiredConfig() {
    const required = [
      { key: 'JWT_SECRET', value: this.config.jwt.secret },
      { key: 'DB_HOST', value: this.config.database.host },
      { key: 'DB_USER', value: this.config.database.user },
      { key: 'DB_PASSWORD', value: this.config.database.password },
      { key: 'DB_NAME', value: this.config.database.name },
    ];

    const missing = required.filter(item => !item.value);

    if (missing.length > 0) {
      console.error('❌ 缺少必需的环境变量:');
      missing.forEach(item => console.error(`  - ${item.key}`));
      process.exit(1);
    }
  }

  /**
   * 获取配置
   */
  get() {
    return this.config;
  }

  /**
   * 获取特定配置项
   */
  get(key) {
    return key ? this.config[key] : this.config;
  }

  /**
   * 获取当前环境
   */
  getEnvironment() {
    return this.env;
  }

  /**
   * 是否为开发环境
   */
  isDevelopment() {
    return this.env === 'development';
  }

  /**
   * 是否为测试环境
   */
  isTest() {
    return this.env === 'test';
  }

  /**
   * 是否为生产环境
   */
  isProduction() {
    return this.env === 'production';
  }

  /**
   * 打印当前配置信息
   */
  printConfig() {
    console.log(`\n🌍 当前环境: ${this.env}`);
    console.log(`🚀 服务端口: ${this.config.port}`);
    console.log(
      `🗄️  数据库: ${this.config.database.host}:${this.config.database.port}/${this.config.database.name}`
    );
    console.log(
      `📦 Redis: ${this.config.redis.host}:${this.config.redis.port}/${this.config.redis.db}`
    );
    console.log(`📝 日志级别: ${this.config.logging.level}`);
    console.log(`🤖 AI提供商: ${this.config.ai.provider || '未配置'}`);
    console.log(`🔌 Socket.IO: ${this.config.socketIO.enabled ? '启用' : '禁用'}`);
    console.log(`📊 监控: ${this.config.monitoring.enabled ? '启用' : '禁用'}\n`);
  }
}

// 创建单例实例
const environmentManager = new EnvironmentManager();

module.exports = environmentManager;
