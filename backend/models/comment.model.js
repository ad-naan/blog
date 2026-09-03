const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const Comment = sequelize.define(
    'comment',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true, // 改为可选，支持访客评论
        field: 'user_id', // 数据库字段名为下划线
        references: {
          model: 'users',
          key: 'id',
        },
      },
      // 访客评论字段
      guestName: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'guest_name', // 数据库字段名为下划线
        comment: '访客姓名（未登录用户）',
      },
      guestEmail: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'guest_email', // 数据库字段名为下划线
        validate: {
          isEmail: true,
        },
        comment: '访客邮箱（未登录用户）',
      },
      guestWebsite: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'guest_website', // 数据库字段名为下划线
        comment: '访客网站（未登录用户，可选）',
      },
      isGuest: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_guest', // 数据库字段名为下划线
        comment: '是否为访客评论',
      },
      // 通用评论目标：支持文章、手记、项目等
      targetType: {
        type: DataTypes.ENUM('post', 'note', 'project'),
        allowNull: false,
        defaultValue: 'post',
        field: 'target_type',
        comment: '评论目标类型（post-文章/note-手记/project-项目）',
      },
      targetId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'target_id',
        comment: '评论目标ID（与 target_type 联合使用）',
      },
      parentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'parent_id', // 数据库字段名为下划线
        references: {
          model: 'comments',
          key: 'id',
        },
      },
      status: {
        type: DataTypes.ENUM('approved', 'pending', 'spam'),
        defaultValue: 'approved',
      },
      // 访客信息字段
      ip: {
        type: DataTypes.STRING(45),
        allowNull: true,
        field: 'ip', // 数据库字段名保持一致
        comment: '评论者IP地址（支持IPv4和IPv6）',
      },
      userAgent: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'user_agent', // 数据库字段名为下划线
        comment: '浏览器User-Agent信息',
      },
      location: {
        type: DataTypes.STRING(200),
        allowNull: true,
        field: 'location', // 数据库字段名保持一致
        comment: '地理位置（国家、省市）',
      },
      browser: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'browser', // 数据库字段名保持一致
        comment: '浏览器类型和版本',
      },
      os: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'os', // 数据库字段名保持一致
        comment: '操作系统类型和版本',
      },
      device: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'device', // 数据库字段名保持一致
        comment: '设备类型（Desktop、Mobile、Tablet）',
      },
    },
    {
      tableName: 'comments', // 明确指定表名
      timestamps: true,
      paranoid: false, // 禁用软删除
      indexes: [
        {
          fields: ['userId'],
        },
        {
          fields: ['targetType', 'targetId'],
        },
        {
          fields: ['parentId'],
        },
      ],
    }
  );

  return Comment;
};
