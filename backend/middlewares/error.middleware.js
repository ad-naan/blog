const { logger } = require('@/utils/logger');
const {
  AppError,
  NotFoundError,
  InternalServerError,
  formatSequelizeError,
  formatJWTError,
  formatErrorResponse,
  isOperationalError,
} = require('@/utils/errors');
const environment = require('@/config/environment');

// 需要脱敏的敏感字段名（小写匹配，包含式判断）
const SENSITIVE_FIELD_PATTERN = /password|passphrase|secret|token|apikey|api_key|authorization|credential/i;

/**
 * 递归剥离请求数据中的敏感字段（用于日志脱敏）
 */
const sanitizeSensitiveData = (data, depth = 0) => {
  if (depth > 3 || data === null || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.slice(0, 20).map(item => sanitizeSensitiveData(item, depth + 1));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_FIELD_PATTERN.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (value !== null && typeof value === 'object') {
      sanitized[key] = sanitizeSensitiveData(value, depth + 1);
    } else if (typeof value === 'string' && value.length > 500) {
      sanitized[key] = `${value.slice(0, 500)}...[truncated]`;
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

/**
 * 错误处理中间件
 * 用于统一处理API请求中的错误
 */

// 捕获404错误
const notFound = (req, res, next) => {
  logger.warn('404错误', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  const error = new NotFoundError('RESOURCE_NOT_FOUND', `未找到资源 - ${req.originalUrl}`, {
    url: req.originalUrl,
    method: req.method,
  });

  next(error);
};

// 全局错误处理
const errorHandler = (err, req, res, next) => {
  let error = err;

  // 转换Sequelize错误
  if (
    err.name === 'SequelizeValidationError' ||
    err.name === 'SequelizeUniqueConstraintError' ||
    err.name === 'SequelizeForeignKeyConstraintError'
  ) {
    error = formatSequelizeError(err);
  }

  // 转换JWT错误
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error = formatJWTError(err);
  }

  // 如果不是AppError，转换为InternalServerError
  if (!(error instanceof AppError)) {
    error = new InternalServerError('INTERNAL_SERVER_ERROR', err.message, {
      originalError: err.name,
    });
  }

  // 确定状态码
  const statusCode = error.statusCode || 500;

  // 记录错误日志（敏感字段脱敏，避免密码/令牌原文进入日志文件）
  const logLevel = statusCode >= 500 ? 'error' : 'warn';
  logger[logLevel]('应用错误', {
    code: error.code,
    errorCode: error.errorCode,
    message: error.message,
    statusCode,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id || 'anonymous',
    body: sanitizeSensitiveData(req.body),
    query: sanitizeSensitiveData(req.query),
    params: sanitizeSensitiveData(req.params),
    stack: error.stack,
    isOperational: isOperationalError(error),
  });

  // 格式化错误响应
  const isDevelopment = environment.isDevelopment();
  const response = formatErrorResponse(error, isDevelopment);

  // 发送响应
  res.status(statusCode).json(response);
};

module.exports = {
  notFound,
  errorHandler,
};
