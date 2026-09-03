const db = require('../models');
const Comment = db.Comment;
const User = db.User;
const Post = db.Post;
const Note = db.Note;
const Project = db.Project;
const achievementHelper = require('@/utils/achievement');
const activityHelper = require('@/utils/activity');

/**
 * 评论服务层
 * 处理与评论相关的业务逻辑
 */
class CommentService {
  /**
   * 创建新评论
   * @param {Object} commentData - 评论数据
   * @returns {Promise<Object>} 创建的评论对象
   */
  async create(commentData) {
    const comment = await Comment.create({
      status: 'approved',
      ...commentData,
    });

    if (comment.status === 'approved' && comment.userId) {
      await achievementHelper.checkCommentAchievements(comment.userId);
      await this.recordCommentActivity(comment);
    }

    return comment;
  }

  async attachTargetTitles(comments) {
    if (!comments || comments.length === 0) return [];

    const items = comments.map(comment => (comment.toJSON ? comment.toJSON() : comment));

    const postIds = new Set();
    const noteIds = new Set();
    const projectIds = new Set();

    items.forEach(item => {
      if (!item || !item.targetType || !item.targetId) return;
      if (item.targetType === 'post') postIds.add(item.targetId);
      if (item.targetType === 'note') noteIds.add(item.targetId);
      if (item.targetType === 'project') projectIds.add(item.targetId);
    });

    const [posts, notes, projects] = await Promise.all([
      postIds.size
        ? Post.findAll({ where: { id: Array.from(postIds) }, attributes: ['id', 'title'] })
        : Promise.resolve([]),
      noteIds.size
        ? Note.findAll({ where: { id: Array.from(noteIds) }, attributes: ['id', 'title'] })
        : Promise.resolve([]),
      projectIds.size
        ? Project.findAll({ where: { id: Array.from(projectIds) }, attributes: ['id', 'title'] })
        : Promise.resolve([]),
    ]);

    const postMap = new Map(posts.map(p => [p.id, p.title]));
    const noteMap = new Map(notes.map(n => [n.id, n.title]));
    const projectMap = new Map(projects.map(p => [p.id, p.title]));

    return items.map(item => {
      let targetTitle = null;
      if (item.targetType === 'post') {
        targetTitle = postMap.get(item.targetId) || null;
      } else if (item.targetType === 'note') {
        targetTitle = noteMap.get(item.targetId) || null;
      } else if (item.targetType === 'project') {
        targetTitle = projectMap.get(item.targetId) || null;
      }

      return {
        ...item,
        targetTitle,
      };
    });
  }

  async listForProfile({ page = 1, limit = 10, status, isAdmin, userId, scope }) {
    if (isAdmin && status === 'pending') {
      const pendingResult = await this.getPendingComments({ page, limit });
      const data = await this.attachTargetTitles(pendingResult.comments);

      return {
        data,
        pagination: {
          page: pendingResult.currentPage,
          limit,
          total: pendingResult.total,
          totalPages: pendingResult.totalPages,
          hasNext: pendingResult.currentPage < pendingResult.totalPages,
          hasPrev: pendingResult.currentPage > 1,
        },
      };
    }

    if (isAdmin && status === 'spam') {
      const { count, rows } = await Comment.findAndCountAll({
        where: { status: 'spam' },
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'avatar', 'role'],
          },
        ],
        order: [['createdAt', 'DESC']],
        offset: (page - 1) * limit,
        limit,
      });

      const totalPages = Math.ceil(count / limit);
      const data = await this.attachTargetTitles(rows);

      return {
        data,
        pagination: {
          page,
          limit,
          total: count,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    }

    if (isAdmin && scope === 'all-comments') {
      const where = { parentId: null };
      if (status) {
        where.status = status;
      }

      const { count, rows } = await Comment.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'avatar', 'role'],
          },
          {
            model: Comment,
            as: 'replies',
            where: status ? { status } : undefined,
            required: false,
            include: [
              {
                model: User,
                as: 'author',
                attributes: ['id', 'username', 'avatar', 'role'],
              },
            ],
          },
        ],
        order: [['createdAt', 'DESC']],
        offset: (page - 1) * limit,
        limit,
      });

      const totalPages = Math.ceil(count / limit);
      const data = await this.attachTargetTitles(rows);

      return {
        data,
        pagination: {
          page,
          limit,
          total: count,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    }

    const options = { page, limit };
    if (status) options.status = status;

    const result = await this.findByUserId(userId, options);
    const data = await this.attachTargetTitles(result.data);

    return {
      data,
      pagination: result.pagination,
    };
  }

  /**
   * 根据目标类型和ID获取评论列表
   * @param {string} targetType - 目标类型：post/note/project
   * @param {number|string} targetId - 目标ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 包含评论列表和总数的对象
   */
  async findByTarget(targetType, targetId, options = {}) {
    const { page = 1, limit = 10, status } = options;

    const query = {
      where: {
        targetType,
        targetId,
        parentId: null,
      },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar', 'role'],
        },
        {
          model: Comment,
          as: 'replies',
          where: status ? { status } : { status: 'approved' },
          required: false,
          include: [
            {
              model: User,
              as: 'author',
              attributes: ['id', 'username', 'avatar', 'role'],
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
      offset: (page - 1) * limit,
      limit: parseInt(limit),
    };

    if (status) {
      query.where.status = status;
    } else {
      query.where.status = 'approved';
    }

    const { count, rows } = await Comment.findAndCountAll(query);

    const totalPages = Math.ceil(count / limit);

    return {
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * 根据ID查找评论
   * @param {number} id - 评论ID
   * @returns {Promise<Object>} 评论对象
   */
  async findById(id) {
    return await Comment.findByPk(id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar', 'role'],
        },
        {
          model: Comment,
          as: 'replies',
          include: [
            {
              model: User,
              as: 'author',
              attributes: ['id', 'username', 'avatar', 'role'],
            },
          ],
        },
      ],
    });
  }

  /**
   * 获取文章的评论列表
   * @param {number} postId - 文章ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 包含评论列表和总数的对象
   */
  async findByPostId(postId, options = {}) {
    return this.findByTarget('post', postId, options);
  }

  /**
   * 获取用户的评论列表
   * @param {number} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 包含评论列表和总数的对象
   */
  async findByUserId(userId, options = {}) {
    const { page = 1, limit = 10, status } = options;

    const query = {
      where: { userId },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar', 'role'],
        },
      ],
      order: [['createdAt', 'DESC']],
      offset: (page - 1) * limit,
      limit: parseInt(limit),
    };

    // 根据状态筛选
    if (status) {
      query.where.status = status;
    }

    // 获取总数和数据
    const { count, rows } = await Comment.findAndCountAll(query);

    const totalPages = Math.ceil(count / limit);

    return {
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * 更新评论
   * @param {number} id - 评论ID
   * @param {Object} commentData - 更新的评论数据
   * @returns {Promise<Object>} 更新结果
   */
  async update(id, commentData) {
    await Comment.update(commentData, {
      where: { id },
    });

    return this.findById(id);
  }

  /**
   * 删除评论（软删除）
   * @param {number} id - 评论ID
   * @returns {Promise<number>} 删除的记录数
   */
  async delete(id) {
    return await Comment.destroy({
      where: { id },
    });
  }

  /**
   * 更新评论状态
   * @param {number} id - 评论ID
   * @param {string} status - 新状态
   * @returns {Promise<Object>} 更新结果
   */
  async updateStatus(id, status) {
    const comment = await Comment.findByPk(id);

    if (!comment) {
      throw new Error('评论不存在');
    }

    const previousStatus = comment.status;

    // 更新状态
    await comment.update({ status });

    // 审核通过后检查成就
    if (status === 'approved') {
      await achievementHelper.checkCommentAchievements(comment.userId);

      // 从非通过状态切换为通过时，记录评论相关活动
      if (previousStatus !== 'approved') {
        await this.recordCommentActivity(comment);
      }
    }

    return comment;
  }

  /**
   * 记录评论相关活动
   * - 登录用户发表评论：记录 comment_created（公开动态）
   * - 文章作者收到评论：记录 comment_received（作者通知）
   * - 目前仅对文章(post)目标启用，手记/项目暂不记录到活动流
   *
   * @param {Object} comment - 评论实例（Sequelize 实例）
   */
  async recordCommentActivity(comment) {
    if (!comment) return;

    // 目前仅对文章评论记录活动，避免错误拼接链接
    if (comment.targetType !== 'post') {
      return;
    }

    // 加载文章信息
    const post = await Post.findByPk(comment.targetId);
    if (!post) {
      return;
    }

    // 1) 记录“我评论了文章”的公开动态（仅登录用户）
    if (comment.userId) {
      await activityHelper.recordCommentCreated(comment.userId, comment, post, undefined);
    }

    // 2) 记录“作者收到评论”的通知（作者为活动所属用户）
    if (post.userId) {
      let user = null;
      if (comment.userId) {
        user = await User.findByPk(comment.userId, { attributes: ['id', 'username', 'avatar'] });
      }

      await activityHelper.recordCommentReceived(
        post.userId,
        comment.userId || null,
        comment,
        post,
        user
      );
    }
  }

  /**
   * 获取待审核的评论列表
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 包含评论列表和总数的对象
   */
  async getPendingComments(options = {}) {
    const { page = 1, limit = 10 } = options;

    const query = {
      where: { status: 'pending' },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar', 'role'],
        },
      ],
      order: [['createdAt', 'ASC']],
      offset: (page - 1) * limit,
      limit: parseInt(limit),
    };

    // 获取总数和数据
    const { count, rows } = await Comment.findAndCountAll(query);

    return {
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      comments: rows,
    };
  }
}

module.exports = new CommentService();
