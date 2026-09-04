const db = require('../models');
const Post = db.Post;
const Tag = db.Tag;
const User = db.User;
const { Op } = require('sequelize');
const achievementHelper = require('@/utils/achievement');
const activityHelper = require('@/utils/activity');
const { logger } = require('@/utils/logger');

const isAdminUser = user => !!user && user.role === 'admin';

/**
 * 文章服务层
 * 处理与文章相关的业务逻辑
 */
class PostService {
  /**
   * 创建新文章
   * @param {Object} postData - 文章数据
   * @param {Array} tagIds - 标签ID数组
   * @param {Object} user - 用户对象
   * @returns {Promise<Object>} 创建的文章对象
   */
  async create(postData, tagIds = [], user = null) {
    const transaction = await db.sequelize.transaction();

    try {
      // 设置审核状态：管理员直接通过，普通用户需要审核
      const auditStatus = isAdminUser(user) ? 1 : 0;

      // 创建文章
      const post = await Post.create(
        {
          ...postData,
          auditStatus,
          publishedAt: postData.status === 1 ? new Date() : null,
        },
        { transaction }
      );

      // 如果有标签，添加关联
      if (tagIds && tagIds.length > 0) {
        await post.addTags(tagIds, { transaction });
      }

      await transaction.commit();

      // 如果是发布状态，记录活动
      if (postData.status === 1 && user) {
        await activityHelper.recordPostCreated(user.id, post);

        // 如果是管理员发布（直接通过审核），检查成就
        if (auditStatus === 1) {
          await achievementHelper.checkArticleAchievements(user.id);
        }
      }

      // 返回创建的文章（包含标签）
      return this.findById(post.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 根据ID查找文章
   * @param {number} id - 文章ID
   * @returns {Promise<Object>} 文章对象
   */
  async findById(id) {
    return await Post.findByPk(id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar'],
        },
        {
          model: Tag,
          as: 'tags',
          through: { attributes: [] }, // 不包含中间表字段
        },
      ],
    });
  }

  /**
   * 根据slug查找文章
   * @param {string} slug - 文章slug
   * @returns {Promise<Object>} 文章对象
   */
  async findBySlug(slug) {
    return await Post.findOne({
      where: { slug },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar'],
        },
        {
          model: Tag,
          as: 'tags',
          through: { attributes: [] },
        },
      ],
    });
  }

  /**
   * 获取文章列表
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 包含文章列表和总数的对象
   */
  async findAll(options = {}) {
    const { page = 1, limit = 10, status, userId, tagId, search, year, isAdmin = false } = options;

    // LIKE 关键词中的通配符需要转义，避免用户输入 %/_ 破坏查询语义
    const escapeLike = keyword => keyword.replace(/[%_\\]/g, '\\$&');

    const query = {
      where: {},
      // 列表不返回全文 content 大字段，显著降低响应体积与内存占用
      attributes: { exclude: ['content'] },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar'],
        },
        {
          model: Tag,
          as: 'tags',
          through: { attributes: [] },
        },
      ],
      order: [['createdAt', 'DESC']],
      offset: (page - 1) * limit,
      limit: parseInt(limit),
    };

    // 前端查询：只显示已发布且审核通过的文章
    // 管理员后台：可以查看所有状态
    if (!isAdmin) {
      query.where.status = 1; // 已发布
      query.where.auditStatus = 1; // 审核通过
    }

    // 根据状态筛选（管理员使用）
    if (status !== undefined && isAdmin) {
      query.where.status = status;
    }

    // 根据用户ID筛选
    if (userId) {
      query.where.userId = userId;
    }

    // 根据标签ID筛选
    if (tagId) {
      query.include[1].where = { id: tagId };
    }

    // 搜索功能（转义 LIKE 通配符；content 全表扫描代价高，仅匹配标题 + 摘要）
    if (search) {
      const escaped = escapeLike(search);
      query.where[Op.or] = [
        { title: { [Op.like]: `%${escaped}%` } },
        { summary: { [Op.like]: `%${escaped}%` } },
      ];
    }

    // 按年份筛选
    if (year) {
      const yearInt = parseInt(year);
      const startDate = new Date(yearInt, 0, 1); // 1月1日
      const endDate = new Date(yearInt + 1, 0, 1); // 下一年1月1日
      query.where.publishedAt = {
        [Op.gte]: startDate,
        [Op.lt]: endDate,
      };
    }

    // 获取总数和数据
    const { count, rows } = await Post.findAndCountAll(query);

    return {
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      posts: rows,
    };
  }

  /**
   * 获取所有年份列表（包含文章数量）
   * @param {boolean} isAdmin - 是否是管理员
   * @returns {Promise<Array>} 年份列表，按年份降序
   */
  async getYears(isAdmin = false) {
    const whereCondition = isAdmin ? {} : { status: 1, auditStatus: 1 };

    const posts = await Post.findAll({
      attributes: [
        [db.sequelize.fn('YEAR', db.sequelize.col('published_at')), 'year'],
        [db.sequelize.fn('COUNT', '*'), 'count'],
      ],
      where: whereCondition,
      group: [db.sequelize.fn('YEAR', db.sequelize.col('published_at'))],
      order: [[db.sequelize.fn('YEAR', db.sequelize.col('published_at')), 'DESC']],
      raw: true,
    });

    return posts.map(item => ({
      year: item.year,
      count: parseInt(item.count),
    }));
  }

  /**
   * 更新文章
   * @param {number} id - 文章ID
   * @param {Object} postData - 更新的文章数据
   * @param {Array} tagIds - 标签ID数组
   * @param {Object} user - 用户对象
   * @returns {Promise<Object>} 更新后的文章对象
   */
  async update(id, postData, tagIds, user = null) {
    const transaction = await db.sequelize.transaction();

    try {
      const post = await Post.findByPk(id, { transaction });

      if (!post) {
        throw new Error('文章不存在');
      }

      // 如果普通用户修改已发布且审核通过的文章，重新进入待审核
      let updateData = { ...postData };
      if (user && !isAdminUser(user) && postData.status === 1 && post.auditStatus === 1) {
        updateData.auditStatus = 0; // 重新审核
      }

      // 更新文章基本信息
      await Post.update(updateData, {
        where: { id },
        transaction,
      });

      // 如果提供了标签，更新标签关联
      if (tagIds !== undefined) {
        // 清除现有标签关联并添加新的关联
        await post.setTags(tagIds || [], { transaction });
      }

      await transaction.commit();

      // 重新加载文章以获取最新状态
      const updatedPost = await this.findById(id);

      // 记录活动
      if (user) {
        await activityHelper.recordPostUpdated(user.id, updatedPost);
      }

      // 如果文章状态变为已发布且审核通过，检查成就
      // 场景：1. 从草稿变为发布 2. 审核状态从待审核变为通过
      const wasDraftOrPending = post.status !== 1 || post.auditStatus !== 1;
      const isNowPublishedAndApproved = updatedPost.status === 1 && updatedPost.auditStatus === 1;

      if (wasDraftOrPending && isNowPublishedAndApproved && user) {
        await achievementHelper.checkArticleAchievements(user.id);
      }

      // 返回更新后的文章
      return updatedPost;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 删除文章
   * @param {number} id - 文章ID
   * @param {Object} user - 用户对象
   * @returns {Promise<number>} 删除的记录数
   */
  async delete(id, user = null) {
    // 获取文章信息用于记录活动
    const post = await Post.findByPk(id);

    const result = await Post.destroy({
      where: { id },
    });

    // 记录删除活动
    if (post && user) {
      await activityHelper.recordPostDeleted(user.id, post);
    }

    return result;
  }

  /**
   * 增加文章浏览量
   * @param {number} id - 文章ID
   * @returns {Promise<Object>} 更新结果
   */
  async incrementViewCount(id) {
    const result = await Post.increment('viewCount', {
      by: 1,
      where: { id },
    });

    // 检查作者的阅读数成就（异步执行，不阻塞响应）
    Post.findByPk(id)
      .then(post => {
        if (post && post.auditStatus === 1 && post.userId) {
          achievementHelper.checkArticleAchievements(post.userId).catch(err => {
            logger.error('检查阅读数成就失败:', err);
          });
        }
      })
      .catch(err => {
        logger.error('获取文章信息失败:', err);
      });

    return result;
  }

  /**
   * 获取热门文章
   * @param {number} limit - 限制数量
   * @returns {Promise<Array>} 热门文章列表
   */
  async getPopularPosts(limit = 5) {
    return await Post.findAll({
      where: {
        status: 1, // 已发布
        auditStatus: 1, // 审核通过
      },
      order: [['viewCount', 'DESC']],
      limit,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar'],
        },
      ],
    });
  }

  /**
   * 审核文章（管理员）
   * @param {number} id - 文章ID
   * @param {number} auditStatus - 审核状态 (1=通过, 2=驳回)
   * @param {number} adminId - 管理员ID
   * @returns {Promise<Object>} 更新后的文章
   */
  async auditPost(id, auditStatus, adminId) {
    const post = await Post.findByPk(id);

    if (!post) {
      throw new Error('文章不存在');
    }

    if (![1, 2].includes(auditStatus)) {
      throw new Error('审核状态无效');
    }

    // 更新审核状态
    await post.update({ auditStatus });

    // 审核通过后检查成就并记录活动
    if (auditStatus === 1) {
      await achievementHelper.checkArticleAchievements(post.userId);
      await activityHelper.recordPostApproved(post.userId, post);
    } else if (auditStatus === 2) {
      // 记录审核驳回活动（可以从请求中传入reason）
      await activityHelper.recordPostRejected(post.userId, post, '内容不符合规范');
    }

    return post;
  }
}

module.exports = new PostService();
