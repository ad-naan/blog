/**
 * 关于我 - Mock 数据
 */

import type { TimelineItem } from '@/utils/helpers/timeline';

// 个人信息
export const personalInfo = {
  name: 'adnaan',
  title: '全栈开发工程师',
  avatar: 'http://www.adnaan.site/uploads/avatars/2026/03/22dfeec277d155c89d46b9a80b82bb54.jpeg',
  slogan: '道虽迩，不行不至；事虽小，不为不成。',
  github: 'https://github.com/adnaan-worker',
  email: 'adnaan.worker@gmail.com',
  website: 'http://www.adnaan.site',
  bio: '专注于构建美观且高性能的Web体验。让每一行代码都有诗意，每一个像素都有故事。',
};

// 技能标签
export const skillTags = [
  { name: 'React', level: 'expert' as const },
  { name: 'Vue', level: 'expert' as const },
  { name: 'Node.js', level: 'advanced' as const },
  { name: 'Java', level: 'advanced' as const },
  { name: 'PHP', level: 'advanced' as const },
  { name: 'Python', level: 'intermediate' as const },
  { name: 'TypeScript', level: 'expert' as const },
  { name: 'Electron', level: 'advanced' as const },
  { name: 'AI/ML', level: 'intermediate' as const },
  { name: 'Tailwind CSS', level: 'advanced' as const },
  { name: 'Git', level: 'expert' as const },
];

// 工作/学习经历
export interface ExperienceItem extends TimelineItem {
  company?: string;
  position?: string;
  institution?: string;
  degree?: string;
  description: string;
  achievements?: string[];
  tags?: string[];
  type: 'work' | 'education' | 'project';
}

export const experiences: ExperienceItem[] = [
  {
    id: 'exp-1',
    type: 'work',
    company: '苏州某软件开发公司',
    position: 'AI全栈开发工程师',
    description: '负责公司AI产品的开发与维护，主导多个重要项目的技术选型和架构设计',
    date: '2025-08-01T00:00:00.000Z',
    createdAt: '2025-08-01T00:00:00.000Z',
    achievements: [
      '参与AI功能模块的开发与优化',
      '负责前后端架构设计与实现',
      '推动工程化体系建设，提升开发效率',
    ],
    tags: ['React', 'Node.js', 'AI', 'Java','Python'],
  },
  {
    id: 'exp-2',
    type: 'work',
    company: '大连某互联网公司',
    position: '软件开发工程师（见习）',
    description: '参与公司产品的功能开发与维护，学习企业级开发流程',
    date: '2025-04-01T00:00:00.000Z',
    createdAt: '2025-04-01T00:00:00.000Z',
    endDate: '2025-06-30T00:00:00.000Z',
    achievements: [
      '参与核心功能模块的开发',
      '学习并实践敏捷开发流程',
      '与团队协作完成多个迭代任务',
    ],
    tags: ['Vue', 'Java', 'MySQL'],
  },
  {
    id: 'exp-3',
    type: 'work',
    company: '上海某软件公司',
    position: '前端开发（实习）',
    description: '负责前端页面开发与功能实现，学习企业级前端开发规范',
    date: '2024-08-01T00:00:00.000Z',
    createdAt: '2024-08-01T00:00:00.000Z',
    endDate: '2025-01-31T00:00:00.000Z',
    achievements: [
      '独立完成多个前端页面开发',
      '学习并掌握React/Vue等主流框架',
      '参与前端性能优化工作',
    ],
    tags: ['React', 'Vue', 'JavaScript'],
  },
  {
    id: 'exp-4',
    type: 'project',
    company: '独立开发',
    position: '全栈开发者',
    description: '九年软件开发爱好者经历，利用ThinkPHP等技术栈学余接单，积累丰富的项目经验',
    date: '2015-01-01T00:00:00.000Z',
    createdAt: '2015-01-01T00:00:00.000Z',
    endDate: '2024-12-31T00:00:00.000Z',
    achievements: [
      '独立完成多个商业项目交付',
      '掌握全栈开发技能，从前端到后端',
      '培养自主学习和问题解决能力',
    ],
    tags: ['PHP', 'ThinkPHP', 'MySQL', 'JavaScript'],
  },
];

// 项目作品集
export const projects = [
  {
    id: '1',
    title: 'Adnify',
    description: '轻量级、高定制化 AI Agent 编辑器 —— 将AI能力深度集成到代码编辑器中',
    image: '/image1.png',
    tags: ['Electron', 'React', 'TypeScript', 'AI', 'Monaco Editor'],
    link: 'http://www.adnaan.site',
    github: 'https://github.com/adnaan-worker/Adnify',
    featured: true,
  },
  {
    id: '2',
    title: '光阴副本博客系统',
    description: '现代化的全栈博客系统，支持 Markdown 编辑、AI 功能、实时通信',
    image: '/image2.png',
    tags: ['React', 'Node.js', 'Socket.IO', 'AI'],
    link: 'http://www.adnaan.site',
    github: 'https://github.com/adnaan-worker/blog',
    featured: true,
  },
];

// 联系方式
export const contactInfo = [
  {
    id: '1',
    label: 'Email',
    value: 'adnaan.worker@gmail.com',
  },
  {
    id: '2',
    label: 'GitHub',
    value: '@adnaan-worker',
  },
  {
    id: '3',
    label: 'WeChat',
    value: 'adnaan_worker',
  },
  {
    id: '4',
    label: 'Location',
    value: '苏州',
  },
];
