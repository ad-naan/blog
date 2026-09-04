const db = require('../models');
const { Note, NoteLike, User } = db;
const { Op } = require('sequelize');
const RichTextParser = require('@/utils/rich-text-parser');
const activityHelper = require('@/utils/activity');
const achievementHelper = require('@/utils/achievement');

/**
 * 手记服务层
 * 处理手记相关的业务逻辑
 */
class NoteService {
  /**
   * 创建手记
   * @param {number} userId - 用户ID
   * @param {Object} noteData - 手记数据
   * @returns {Promise<Object>} 创建的手记
   */
  async createNote(userId, noteData) {
    const { title, content, mood, weather, location, tags, isPrivate } = noteData;

    // 计算预估阅读时间（按每分钟200字计算，基于纯文本）
    const readingTime = RichTextParser.calculateReadingTime(content);

    const note = await Note.create({
      userId,
      title: title || null,
      content,
      mood,
      weather,
      location,
      tags: tags || [],
      isPrivate: isPrivate || false,
      readingTime,
    });

    // 记录活动
    await activityHelper.recordNoteCreated(userId, note);

    // 检查成就
    await achievementHelper.checkNoteAchievements(userId);

    return this.getNoteById(note.id, userId);
  }

  /**
   * 获取手记列表
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 手记列表和分页信息
   */
  async getNotesList(options = {}) {
    const {
      userId,
      isAdmin,
      onlyPublic,
      page = 1,
      limit = 10,
      mood,
      weather,
      tags,
      search,
      isPrivate,
      year,
      orderBy = 'createdAt',
      orderDirection = 'DESC',
    } = options;

    const offset = (page - 1) * limit;
    const where = {};
    // LIKE 关键词中的通配符需要转义，避免用户输入 %/_ 破坏查询语义
    const escapeLike = keyword => keyword.replace(/[%_\\]/g, '\\$&');

    // 权限控制逻辑
    if (onlyPublic) {
      // 前台公开查询：只显示公开手记
      where.isPrivate = false;
    } else if (isAdmin) {
      // 管理员查询：可以查看所有手记，不添加 userId 限制
      // 不设置 userId 条件
    } else if (userId) {
      // 普通用户查询：只能查看自己的手记（包括私密）
      where.userId = userId;
    } else {
      // 兜底：未指定任何权限时，只显示公开手记
      where.isPrivate = false;
    }

    // 心情筛选
    if (mood) {
      where.mood = mood;
    }

    // 天气筛选
    if (weather) {
      where.weather = weather;
    }

    // 私密性筛选（仅在个人中心管理时有效）
    if (!onlyPublic && isPrivate !== undefined) {
      where.isPrivate = isPrivate;
    }

    // 标签筛选（对每个标签单独匹配并转义正则元字符，避免拼接 RegExp 注入）
    if (tags && tags.length > 0) {
      const escapeRegExp = str => str.replace(/[.*+?^${}()|[\]\\"]/g, '\\$&');
      where.tags = {
        [Op.regexp]: tags.map(tag => `"${escapeRegExp(tag)}"`).join('|'),
      };
    }

    // 搜索功能（转义 LIKE 通配符）
    if (search) {
      const escaped = escapeLike(search);
      where[Op.or] = [
        { title: { [Op.like]: `%${escaped}%` } },
        { content: { [Op.like]: `%${escaped}%` } },
      ];
    }

    // 按年份筛选
    if (year) {
      const yearInt = parseInt(year);
      const startDate = new Date(yearInt, 0, 1); // 1月1日
      const endDate = new Date(yearInt + 1, 0, 1); // 下一年1月1日
      where.createdAt = {
        [Op.gte]: startDate,
        [Op.lt]: endDate,
      };
    }

    const { count, rows } = await Note.findAndCountAll({
      where,
      // 列表不返回全文 content 大字段，降低响应体积
      attributes: { exclude: ['content'] },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'fullName', 'avatar'],
        },
      ],
      limit: parseInt(limit),
      offset,
      order: [[orderBy, orderDirection.toUpperCase()]],
      distinct: true,
    });

    const totalPages = Math.ceil(count / limit);

    return {
      data: rows.map(note => this.formatNoteResponse(note)),
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
   * 根据ID获取手记详情
   * @param {number} noteId - 手记ID
   * @param {number} currentUserId - 当前用户ID（可选）
   * @returns {Promise<Object|null>} 手记详情
   */
  async getNoteById(noteId, currentUserId = null) {
    const note = await Note.findByPk(noteId, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'fullName', 'avatar'],
        },
        {
          model: NoteLike,
          as: 'likes',
          attributes: ['userId'],
          required: false,
        },
      ],
    });

    if (!note) {
      return null;
    }

    // 检查访问权限：如果是私密手记，只有作者可以查看
    if (note.isPrivate && currentUserId !== note.userId) {
      return null;
    }

    // 如果不是作者查看，增加查看次数
    if (currentUserId !== note.userId) {
      await note.increment('viewCount');
    }

    return this.formatNoteResponse(note, currentUserId);
  }

  /**
   * 更新手记
   * @param {number} noteId - 手记ID
   * @param {number} userId - 用户ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise<Object|null>} 更新后的手记
   */
  async updateNote(noteId, userId, updateData) {
    const note = await Note.findOne({
      where: { id: noteId, userId },
    });

    if (!note) {
      return null;
    }

    const { title, content, mood, weather, location, tags, isPrivate } = updateData;

    // 如果内容发生变化，重新计算阅读时间
    let readingTime = note.readingTime;
    if (content && content !== note.content) {
      readingTime = RichTextParser.calculateReadingTime(content);
    }

    await note.update({
      title: title !== undefined ? title : note.title,
      content: content !== undefined ? content : note.content,
      mood: mood !== undefined ? mood : note.mood,
      weather: weather !== undefined ? weather : note.weather,
      location: location !== undefined ? location : note.location,
      tags: tags !== undefined ? tags : note.tags,
      isPrivate: isPrivate !== undefined ? isPrivate : note.isPrivate,
      readingTime,
    });

    // 记录活动
    await activityHelper.recordNoteUpdated(userId, note);

    return this.getNoteById(noteId, userId);
  }

  /**
   * 删除手记
   * @param {number} noteId - 手记ID
   * @param {number} userId - 用户ID
   * @returns {Promise<boolean>} 删除结果
   */
  async deleteNote(noteId, userId) {
    const note = await Note.findOne({
      where: { id: noteId, userId },
    });

    if (!note) {
      return false;
    }

    // 记录活动
    await activityHelper.recordNoteDeleted(userId, note);

    await note.destroy();
    return true;
  }

  /**
   * 更新手记的最后阅读时间
   * @param {number} noteId - 手记ID
   * @returns {Promise<boolean>} 更新结果
   */
  async updateLastReadAt(noteId) {
    const note = await Note.findByPk(noteId);

    if (!note) {
      return false;
    }

    await note.update({ lastReadAt: new Date() });
    return true;
  }

  /**
   * 切换手记点赞状态
   * @param {number} noteId - 手记ID
   * @param {number} userId - 用户ID
   * @returns {Promise<Object>} 点赞结果
   */
  async toggleNoteLike(noteId, userId) {
    const note = await Note.findByPk(noteId);
    if (!note) {
      throw new Error('手记不存在');
    }

    // 检查是否已点赞
    const existingLike = await NoteLike.findOne({
      where: { noteId, userId },
    });

    if (existingLike) {
      // 取消点赞
      await existingLike.destroy();
      await note.decrement('likeCount');

      // 记录取消点赞活动
      await activityHelper.recordUnlike(userId, 'note', note);

      return { liked: false, likeCount: note.likeCount - 1 };
    } else {
      // 添加点赞
      await NoteLike.create({ noteId, userId });
      await note.increment('likeCount');

      // 记录点赞活动
      await activityHelper.recordLike(userId, 'note', note);

      // 通知作者收到点赞
      const user = await User.findByPk(userId, { attributes: ['id', 'username'] });
      await activityHelper.recordLikeReceived(note.userId, userId, 'note', note, user);

      return { liked: true, likeCount: note.likeCount + 1 };
    }
  }

  /**
   * 获取用户手记统计
   * @param {number} userId - 用户ID
   * @returns {Promise<Object>} 统计信息
   */
  async getUserNoteStats(userId) {
    const stats = await Note.findAll({
      where: { userId },
      attributes: [
        [Note.sequelize.fn('COUNT', '*'), 'totalNotes'],
        [Note.sequelize.fn('SUM', Note.sequelize.col('view_count')), 'totalViews'],
        [Note.sequelize.fn('SUM', Note.sequelize.col('like_count')), 'totalLikes'],
        [
          Note.sequelize.fn('COUNT', Note.sequelize.literal('CASE WHEN is_private = 1 THEN 1 END')),
          'privateNotes',
        ],
      ],
      raw: true,
    });

    const moodStats = await Note.findAll({
      where: { userId },
      attributes: ['mood', [Note.sequelize.fn('COUNT', '*'), 'count']],
      group: ['mood'],
      raw: true,
    });

    return {
      totalNotes: parseInt(stats[0].totalNotes) || 0,
      totalViews: parseInt(stats[0].totalViews) || 0,
      totalLikes: parseInt(stats[0].totalLikes) || 0,
      privateNotes: parseInt(stats[0].privateNotes) || 0,
      publicNotes: parseInt(stats[0].totalNotes) - parseInt(stats[0].privateNotes) || 0,
      moodDistribution: moodStats.reduce((acc, item) => {
        if (item.mood) {
          acc[item.mood] = parseInt(item.count);
        }
        return acc;
      }, {}),
    };
  }

  /**
   * 获取相关手记
   * @param {number} noteId - 当前手记ID
   * @param {number} limit - 返回数量限制
   * @returns {Promise<Array>} 相关手记列表
   */
  async getRelatedNotes(noteId, limit = 5) {
    const currentNote = await Note.findByPk(noteId);
    if (!currentNote) {
      return [];
    }

    const where = {
      id: { [Op.ne]: noteId },
      isPrivate: false,
    };

    // 优先查找同作者、同标签或时间相近的手记
    const relatedNotes = await Note.findAll({
      where: {
        ...where,
        [Op.or]: [
          { userId: currentNote.userId },
          ...(currentNote.tags && currentNote.tags.length > 0
            ? [
                {
                  tags: {
                    [Op.regexp]: currentNote.tags.map(tag => `"${tag}"`).join('|'),
                  },
                },
              ]
            : []),
        ],
      },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'fullName', 'avatar'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit,
    });

    return relatedNotes.map(note => this.formatNoteResponse(note));
  }

  /**
   * 格式化手记响应数据
   * @param {Object} note - 手记数据
   * @param {number} currentUserId - 当前用户ID
   * @returns {Object} 格式化后的手记数据
   */
  formatNoteResponse(note, currentUserId = null) {
    const noteData = note.toJSON ? note.toJSON() : note;

    // 检查当前用户是否已点赞
    let isLiked = false;
    if (currentUserId && noteData.likes) {
      isLiked = noteData.likes.some(like => like.userId === currentUserId);
    }

    return {
      id: noteData.id,
      title: noteData.title,
      content: noteData.content,
      mood: noteData.mood,
      weather: noteData.weather,
      location: noteData.location,
      tags: noteData.tags || [],
      isPrivate: noteData.isPrivate,
      readingTime: noteData.readingTime,
      viewCount: noteData.viewCount,
      likeCount: noteData.likeCount,
      isLiked,
      author: noteData.author
        ? {
            id: noteData.author.id,
            username: noteData.author.username,
            fullName: noteData.author.fullName,
            avatar: noteData.author.avatar,
          }
        : null,
      createdAt: noteData.createdAt,
      updatedAt: noteData.updatedAt,
      lastReadAt: noteData.lastReadAt, // 添加最后阅读时间
    };
  }

  /**
   * 获取用户手记点赞列表
   * @param {number} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 点赞列表和分页信息
   */
  async getUserNoteLikes(userId, options = {}) {
    const { page = 1, limit = 10, search } = options;
    const offset = (page - 1) * limit;

    // 构建查询条件
    const whereCondition = { userId };

    // 构建手记查询条件
    const noteWhere = {};
    if (search) {
      noteWhere[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } },
      ];
    }

    // 查询点赞记录
    const { count, rows } = await NoteLike.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: Note,
          as: 'note',
          where: noteWhere,
          required: true,
          attributes: ['id', 'title', 'content', 'mood', 'viewCount', 'likeCount', 'createdAt'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // 格式化返回数据
    const likes = rows.map(like => ({
      id: like.id,
      note_id: like.noteId,
      created_at: like.createdAt,
      note: like.note
        ? {
            id: like.note.id,
            title: like.note.title,
            content: like.note.content,
            mood: like.note.mood,
            view_count: like.note.viewCount,
            like_count: like.note.likeCount,
            created_at: like.note.createdAt,
          }
        : null,
    }));

    return {
      data: likes,
      meta: {
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalItems: count,
          totalPages: Math.ceil(count / limit),
        },
      },
    };
  }

  /**
   * 获取有手记的年份列表
   * @param {boolean} isAdmin - 是否为管理员（管理员可以看到私密手记）
   * @returns {Promise<Array>} 年份列表，包含每年的手记数量
   */
  async getYears(isAdmin = false) {
    const whereCondition = isAdmin ? {} : { isPrivate: false };

    const notes = await Note.findAll({
      attributes: [
        [Note.sequelize.fn('YEAR', Note.sequelize.col('created_at')), 'year'],
        [Note.sequelize.fn('COUNT', '*'), 'count'],
      ],
      where: whereCondition,
      group: [Note.sequelize.fn('YEAR', Note.sequelize.col('created_at'))],
      order: [[Note.sequelize.fn('YEAR', Note.sequelize.col('created_at')), 'DESC']],
      raw: true,
    });

    return notes.map(item => ({
      year: item.year,
      count: parseInt(item.count),
    }));
  }
}

module.exports = new NoteService();
