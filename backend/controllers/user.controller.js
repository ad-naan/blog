const userService = require('@/services/user.service');
const { uploadService } = require('@/services/upload.service');
const { asyncHandler } = require('@/utils/response');
const { logger } = require('@/utils/logger');

/**
 * 获取用户资料
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
exports.getProfile = asyncHandler(async (req, res) => {
  logger.info('=== 获取用户资料调试信息 ===');
  logger.info('req.user:', JSON.stringify(req.user, null, 2));
  logger.info('req.headers:', JSON.stringify(req.headers, null, 2));
  logger.info('req.headers.authorization:', req.headers.authorization);

  if (!req.user) {
    logger.error('req.user 不存在');
    return res.apiUnauthorized('用户未认证');
  }

  if (!req.user.id) {
    logger.error('req.user.id 不存在');
    logger.error('req.user 完整内容:', JSON.stringify(req.user, null, 2));
    return res.apiBadRequest('用户ID无效');
  }

  const userId = req.user.id;
  logger.info(`用户ID: ${userId}, 类型: ${typeof userId}`);

  const result = await userService.getProfile(userId);
  return res.apiSuccess(result, '获取用户资料成功');
});

/**
 * 更新用户资料
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
exports.updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const profileData = req.body;

  // 验证请求数据
  if (
    !profileData.nickname &&
    !profileData.email &&
    !profileData.bio &&
    !profileData.location &&
    !profileData.website &&
    !profileData.socialLinks
  ) {
    return res.apiValidationError(
      [{ field: 'profile', message: '至少需要提供一个要更新的字段' }],
      '请提供要更新的信息'
    );
  }

  const result = await userService.updateProfile(userId, profileData);
  return res.apiSuccess(result, '资料更新成功');
});

/**
 * 修改密码
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
exports.changePassword = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword, confirmPassword } = req.body;

  // 验证请求数据
  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.apiValidationError(
      [
        { field: 'currentPassword', message: '当前密码不能为空' },
        { field: 'newPassword', message: '新密码不能为空' },
        { field: 'confirmPassword', message: '确认密码不能为空' },
      ],
      '请填写所有密码字段'
    );
  }

  if (newPassword !== confirmPassword) {
    return res.apiValidationError(
      [{ field: 'confirmPassword', message: '新密码与确认密码不一致' }],
      '新密码与确认密码不一致'
    );
  }

  if (newPassword.length < 8) {
    return res.apiValidationError(
      [{ field: 'newPassword', message: '新密码至少8位' }],
      '新密码至少8位'
    );
  }

  await userService.changePassword(userId, currentPassword, newPassword);
  return res.apiSuccess(null, '密码修改成功');
});

/**
 * 上传头像
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
exports.uploadAvatar = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  if (!req.files || req.files.length === 0) {
    return res.apiValidationError(
      [{ field: 'avatar', message: '请选择头像文件' }],
      '请选择头像文件'
    );
  }

  const file = req.files[0];
  const result = await uploadService.uploadAvatar(file, { id: userId });

  // 头像上传成功

  // 更新用户头像 - 使用相对路径存储到数据库
  await userService.updateAvatar(userId, result.data.path);

  // 返回前端期望的数据结构
  const responseData = {
    ...result.data,
    avatar: result.data.path, // 添加 avatar 字段以兼容前端
  };

  // 构建完整的头像URL
  // 优先使用环境变量 PUBLIC_BASE_URL（生产环境通过反代访问时必需）
  // 回退到请求头推断（适合本地开发直连）
  const baseUrl = (process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
  const fullAvatarUrl = `${baseUrl}/${result.data.path.replace(/^\/+/, '')}`;

  return res.apiSuccess(
    {
      ...result.data,
      avatar: fullAvatarUrl, // 返回完整URL
    },
    '头像上传成功'
  );
});

/**
 * 获取用户仪表盘数据
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
exports.getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await userService.getDashboardData(userId);
  return res.apiSuccess(result, '获取仪表盘数据成功');
});

/**
 * 导出用户数据
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
exports.exportData = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await userService.exportData(userId);
  return res.apiSuccess(result, '数据导出成功');
});

/**
 * 删除账户
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
exports.deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { password } = req.body;

  if (!password) {
    return res.apiValidationError(
      [{ field: 'password', message: '请输入密码确认删除' }],
      '请输入密码确认删除'
    );
  }

  await userService.deleteAccount(userId, password);
  return res.apiSuccess(null, '账户已删除');
});

/**
 * 批量上传文件
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
exports.batchUpload = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { type = 'general', maxCount = 10 } = req.query;

  if (!req.files || req.files.length === 0) {
    return res.apiValidationError(
      [{ field: 'files', message: '请选择要上传的文件' }],
      '请选择要上传的文件'
    );
  }

  const result = await uploadService.batchUpload(req.files, {
    type,
    maxCount: parseInt(maxCount),
    userId,
  });

  return res.apiSuccess(result.data, '文件上传成功');
});

/**
 * 删除文件
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
exports.deleteFile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { filePath } = req.body;

  if (!filePath) {
    return res.apiValidationError(
      [{ field: 'filePath', message: '文件路径不能为空' }],
      '请选择要上传的文件'
    );
  }

  const result = await uploadService.deleteFile(filePath);
  return res.apiSuccess(result, '文件删除成功');
});

/**
 * 获取上传统计信息
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
exports.getUploadStats = asyncHandler(async (req, res) => {
  const { uploadDir = 'uploads' } = req.query;
  const result = uploadService.getUploadStats(uploadDir);
  return res.apiSuccess(result, '获取上传统计成功');
});

// 以下是users.js路由需要的方法

/**
 * 获取所有用户 (管理员)
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
exports.getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search } = req.query;

  const result = await userService.getAllUsers({
    page: parseInt(page),
    limit: parseInt(limit),
    search,
  });

  return res.apiPaginated(result.data, result.pagination, '获取用户列表成功');
});

/**
 * 根据ID获取用户信息
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
exports.getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await userService.findById(id);
  if (!user) {
    return res.apiNotFound('用户不存在');
  }

  return res.apiSuccess(user, '获取用户成功');
});

/**
 * 创建新用户 (管理员)
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
exports.createUser = asyncHandler(async (req, res) => {
  const userData = req.body;

  // 验证必填字段
  if (!userData.username) {
    return res.apiValidationError(
      [{ field: 'username', message: 'username 不能为空' }],
      'username 不能为空'
    );
  }

  if (!userData.email) {
    return res.apiValidationError(
      [{ field: 'email', message: 'email 不能为空' }],
      'email 不能为空'
    );
  }

  if (!userData.password) {
    return res.apiValidationError(
      [{ field: 'password', message: 'password 不能为空' }],
      'password 不能为空'
    );
  }

  const result = await userService.createUser(userData);

  return res.apiCreated(result, '用户创建成功');
});

/**
 * 更新用户信息
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
exports.updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userData = req.body;

  const result = await userService.updateUser(id, userData);

  return res.apiUpdated(result, '用户更新成功');
});

/**
 * 删除用户
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
exports.deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await userService.deleteUser(id);

  return res.apiDeleted('用户删除成功');
});

/**
 * 获取当前登录用户信息
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
exports.getCurrentUser = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await userService.findById(userId);
  if (!user) {
    return res.apiNotFound('用户不存在');
  }

  // 移除敏感信息
  const { password, ...userInfo } = user;

  return res.apiItem(userInfo, '获取当前用户信息成功');
});
