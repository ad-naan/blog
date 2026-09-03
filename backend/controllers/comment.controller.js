const commentService = require('@/services/comment.service');
const cacheService = require('@/services/cache.service');
const { asyncHandler } = require('@/utils/response');
const { collectVisitorInfo, getLocationFromIP } = require('@/utils/visitor-info');
const { Comment, User } = require('../models');

/**
 * 转换评论数据为前端期望的格式
 * @param {Object} comment - 数据库评论对象
 * @returns {Object} 前端格式的评论对象
 */
const transformCommentForFrontend = comment => {
  if (!comment) return null;

  const commentData = comment.toJSON ? comment.toJSON() : comment;

  // 递归处理回复数据
  const replies = commentData.replies ? commentData.replies.map(transformCommentForFrontend) : [];

  // 返回扁平化的完整数据，不冗余
  return {
    ...commentData,
    replies,
  };
};

/**
 * 获取文章的评论列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
exports.getCommentsByPost = asyncHandler(async (req, res) => {
  const { targetId } = req.params;
  const { status, targetType = 'post' } = req.query;
  const { page = 1, limit = 10 } = req.pagination || {};

  // 构建缓存键（按目标类型 + 目标ID 维度缓存）
  const cacheKey = `comments:${targetType}:${targetId}:${page}:${limit}:${status || 'all'}`;

  // 尝试从缓存获取，如果没有则从数据库获取并缓存
  const result = await cacheService.getOrSet(
    cacheKey,
    async () => {
      const options = { page, limit };

      // 仅管理员可根据状态自定义筛选
      const { isAdmin = false } = req.context || {};
      if (isAdmin && status) {
        options.status = status;
      }

      return await commentService.findByTarget(targetType, targetId, options);
    },
    300
  ); // 缓存5分钟

  // 转换数据格式为前端期望的格式
  const transformedData = result.data.map(transformCommentForFrontend);

  return res.apiPaginated(transformedData, result.pagination, '获取评论列表成功');
});

exports.getUserComments = asyncHandler(async (req, res) => {
  const pagination = req.pagination || {};
  const page = pagination.page || parseInt(req.query.page || '1', 10);
  const limit = pagination.limit || parseInt(req.query.limit || '10', 10);

  const status = req.filters?.status;
  const { isAdmin = false, userId } = req.context || {};
  const scope = req.scope || (isAdmin ? 'all-comments' : 'own-comments');

  const result = await commentService.listForProfile({
    page,
    limit,
    status,
    isAdmin,
    userId,
    scope,
  });

  return res.apiPaginated(result.data, result.pagination, '获取评论列表成功');
});

/**
 * 获取单个评论
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
exports.getCommentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // 构建缓存键
  const cacheKey = `comments:${id}`;

  // 尝试从缓存获取，如果没有则从数据库获取并缓存
  const comment = await cacheService.getOrSet(
    cacheKey,
    async () => {
      return await commentService.findById(id);
    },
    600
  ); // 缓存10分钟

  if (!comment) {
    return res.apiNotFound('评论不存在');
  }

  // 非管理员只能看到已批准的评论
  const { isAdmin = false } = req.context || {};
  if (comment.status !== 'approved' && !isAdmin) {
    return res.apiForbidden('无权访问此评论');
  }

  // 转换数据格式为前端期望的格式
  const transformedComment = transformCommentForFrontend(comment);

  return res.apiItem(transformedComment, '获取评论成功');
});

/**
 * 创建评论
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
exports.createComment = asyncHandler(async (req, res) => {
  const commentData = req.body;

  // 判断是登录用户还是访客
  const isLoggedIn = req.user && req.user.id;

  if (isLoggedIn) {
    // 登录用户评论 - 自动批准
    commentData.userId = req.user.id;
    commentData.isGuest = false;
    commentData.status = 'approved'; // 登录用户评论自动批准
  } else {
    // 访客评论
    const { guestName, guestEmail, guestWebsite } = req.body;

    // 验证访客必填信息
    if (!guestName || !guestName.trim()) {
      return res.apiBadRequest('访客评论需要提供姓名');
    }

    if (!guestEmail || !guestEmail.trim()) {
      return res.apiBadRequest('访客评论需要提供邮箱');
    }

    // 简单的邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guestEmail)) {
      return res.apiBadRequest('邮箱格式不正确');
    }

    commentData.userId = null;
    commentData.isGuest = true;
    commentData.guestName = guestName.trim();
    commentData.guestEmail = guestEmail.trim().toLowerCase();
    commentData.guestWebsite = guestWebsite?.trim() || null;

    // 访客评论默认直接展示，可由管理员事后标记为垃圾（spam）
    commentData.status = commentData.status || 'approved';
  }

  // 收集访客信息
  try {
    const visitorInfo = await collectVisitorInfo(req);

    // 将访客信息添加到评论数据
    commentData.ip = visitorInfo.ip;
    commentData.userAgent = visitorInfo.userAgent;
    commentData.location = visitorInfo.location;
    commentData.browser = visitorInfo.browser;
    commentData.os = visitorInfo.os;
    commentData.device = visitorInfo.device;
  } catch (error) {
    // 如果收集访客信息失败，记录错误但不影响评论创建
    console.error('收集访客信息失败:', error);
  }

  // 规范目标类型和ID
  const validTargetTypes = ['post', 'note', 'project'];
  const rawTargetType = commentData.targetType || 'post';
  const rawTargetId = commentData.targetId;

  if (!validTargetTypes.includes(rawTargetType)) {
    return res.apiBadRequest('不支持的评论目标类型');
  }

  if (!rawTargetId || Number.isNaN(Number(rawTargetId))) {
    return res.apiBadRequest('评论目标ID无效');
  }

  commentData.targetType = rawTargetType;
  commentData.targetId = Number(rawTargetId);

  // 删除旧字段（如果前端误传 postId）
  if ('postId' in commentData) {
    delete commentData.postId;
  }

  // 创建评论
  const comment = await commentService.create(commentData);

  // 清除相关缓存
  await cacheService.deletePattern(`comments:${commentData.targetType}:${commentData.targetId}:*`);

  return res.apiCreated(comment, '评论创建成功');
});

/**
 * 更新评论状态（管理员功能）
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
exports.updateCommentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // 检查评论是否存在
  const existingComment = await commentService.findById(id);

  if (!existingComment) {
    return res.apiNotFound('评论不存在');
  }

  // 更新评论状态
  await commentService.updateStatus(id, status);

  // 清除相关缓存
  await cacheService.del(`comments:${id}`);
  if (existingComment.targetType && existingComment.targetId) {
    await cacheService.deletePattern(
      `comments:${existingComment.targetType}:${existingComment.targetId}:*`
    );
  }

  // 获取更新后的评论
  const updatedComment = await commentService.findById(id);

  return res.apiUpdated(updatedComment, '评论状态更新成功');
});

/**
 * 删除评论
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
exports.deleteComment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // 检查评论是否存在
  const existingComment = await commentService.findById(id);

  if (!existingComment) {
    return res.apiNotFound('评论不存在');
  }

  // 检查权限：只有评论作者或管理员可以删除评论
  const { userId, isAdmin = false } = req.context || {};
  if (existingComment.userId !== userId && !isAdmin) {
    return res.apiForbidden('无权删除此评论');
  }

  // 删除评论
  await commentService.delete(id);

  // 清除相关缓存
  await cacheService.del(`comments:${id}`);
  if (existingComment.targetType && existingComment.targetId) {
    await cacheService.deletePattern(
      `comments:${existingComment.targetType}:${existingComment.targetId}:*`
    );
  }

  return res.apiDeleted('评论删除成功', { deletedId: id });
});
