/**
 * 通用管理页面组件
 * 统一处理：手记、文章、评论、收藏、点赞、用户、分类、标签等
 */
import React, { Suspense, lazy, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { Button, Modal, Input, Select, Textarea, ColorPicker, Switch } from 'adnaan-ui';
import {
  FiEdit3,
  FiTrash2,
  FiEye,
  FiHeart,
  FiCalendar,
  FiMessageSquare,
  FiFolder,
  FiCheck,
  FiAlertTriangle,
  FiGithub,
  FiTag,
  FiUser,
  FiFileText,
} from 'react-icons/fi';
import { API, formatDate } from '@/utils';
import { RichTextParser } from '@/utils/editor/parser';
// TipTap 编辑器体积较大（含 lowlight/highlight.js），仅在项目编辑弹窗打开时才加载
const RichTextEditor = lazy(() =>
  import('@/components/rich-text').then((m) => ({ default: m.RichTextEditor })),
);
import { useVirtualScroll } from '@/hooks/useVirtualScroll';
import { useModalScrollLock } from '@/hooks';
import type { UserProfile, Category, Tag, Project, GuestbookMessage, FriendLink } from '@/types';
import { ManagementLayout } from '../common/management-layout';
import {
  ItemCard,
  ItemCover,
  ItemBody,
  ItemHeader,
  ItemTitle,
  ItemActions,
  ActionButton,
  ItemContent,
  ItemMeta,
  MetaItem,
  StatusBadge,
  TagsContainer,
  Tag as TagComponent,
} from '../common/item-card';
import { useManagementPage } from '../common/management-hooks';
import GithubSyncModal from './github-sync-modal';

// 页面类型定义
type PageType =
  | 'notes'
  | 'articles'
  | 'comments'
  | 'bookmarks'
  | 'likes'
  | 'users'
  | 'categories'
  | 'tags'
  | 'projects'
  | 'guestbook'
  | 'friends';

// 页面配置接口
interface PageConfig {
  title: string;
  emptyText: string;
  searchPlaceholder: string;
  fetchFn: (params: any) => Promise<any>;
  deleteFn?: (id: number) => Promise<any>;
  getEditUrl?: (id: number) => string;
  getViewUrl?: (id: number) => string;
  customRender?: (item: any, actions: any) => React.ReactNode;
}

// 页面配置
const PAGE_CONFIG: Record<PageType, PageConfig> = {
  notes: {
    title: '手记管理',
    emptyText: '还没有创建任何手记',
    searchPlaceholder: '搜索手记...',
    fetchFn: (params: any) => {
      const { status, keyword, ...rest } = params || {};
      const apiParams: any = { ...rest, search: keyword };
      if (status === 'public') apiParams.isPrivate = false;
      else if (status === 'private') apiParams.isPrivate = true;
      return API.note.getMyNotes(apiParams);
    },
    deleteFn: (id: number) => API.note.deleteNote(id),
    getEditUrl: (id: number) => `/editor/note?id=${id}`,
    getViewUrl: (id: number) => `/notes/${id}`,
  },
  articles: {
    title: '文章管理',
    emptyText: '还没有创建任何文章',
    searchPlaceholder: '搜索文章...',
    fetchFn: (params: any) => {
      const { status, keyword, ...rest } = params || {};
      const apiParams: any = { ...rest, search: keyword };
      if (status !== undefined && status !== '') {
        const parsed = parseInt(status, 10);
        if (!Number.isNaN(parsed)) apiParams.status = parsed;
      }
      return API.article.getMyArticles(apiParams);
    },
    deleteFn: (id: number) => API.article.deleteArticle(id),
    getEditUrl: (id: number) => `/editor/article?id=${id}`,
    getViewUrl: (id: number) => `/blog/${id}`,
  },
  comments: {
    title: '评论管理',
    emptyText: '还没有任何评论',
    searchPlaceholder: '搜索评论...',
    fetchFn: (params: any) => API.comment.getUserComments(params),
    deleteFn: (id: number) => API.comment.deleteComment(id),
  },
  bookmarks: {
    title: '收藏管理',
    emptyText: '还没有收藏任何内容',
    searchPlaceholder: '搜索收藏...',
    fetchFn: (params: any) => API.article.getMyArticles({ ...params, bookmarked: true }),
    getViewUrl: (id: number) => `/blog/${id}`,
  },
  likes: {
    title: '点赞管理',
    emptyText: '还没有点赞任何内容',
    searchPlaceholder: '搜索点赞...',
    fetchFn: (params: any) => API.article.getMyArticles({ ...params, liked: true }),
    getViewUrl: (id: number) => `/blog/${id}`,
  },
  users: {
    title: '用户管理',
    emptyText: '暂无用户',
    searchPlaceholder: '搜索用户名、邮箱...',
    fetchFn: (params: any) => API.user.getAllUsers({ ...params, search: params.keyword }),
    deleteFn: (id: number) => API.user.deleteUser(id),
  },
  categories: {
    title: '分类管理',
    emptyText: '暂无分类',
    searchPlaceholder: '搜索分类...',
    fetchFn: (params: any) => API.category.getCategories({ ...params, search: params.keyword }),
    deleteFn: (id: number) => API.category.deleteCategory(id),
  },
  tags: {
    title: '标签管理',
    emptyText: '暂无标签',
    searchPlaceholder: '搜索标签...',
    fetchFn: (params: any) => API.tag.getTags({ ...params, search: params.keyword }),
    deleteFn: (id: number) => API.tag.deleteTag(id),
  },
  projects: {
    title: '项目管理',
    emptyText: '暂无项目',
    searchPlaceholder: '搜索项目名称、描述...',
    fetchFn: (params: any) => API.project.getProjects({ ...params, keyword: params.keyword, includePrivate: true }),
    deleteFn: (id: number) => API.project.deleteProject(id),
    getViewUrl: (id: number) => `/projects/${id}`,
  },
  guestbook: {
    title: '留言管理',
    emptyText: '还没有任何留言',
    searchPlaceholder: '搜索留言内容或访客昵称...',
    fetchFn: (params: any) => {
      const { status, keyword, ...rest } = params || {};
      const apiParams: any = { ...rest, status: status || undefined, keyword };
      return API.guestbook.getAdminMessages(apiParams);
    },
    deleteFn: (id: number) => API.guestbook.deleteMessage(id),
  },
  friends: {
    title: '友链管理',
    emptyText: '还没有任何友链申请',
    searchPlaceholder: '搜索站点名称或描述...',
    fetchFn: (params: any) => {
      const { status, keyword, ...rest } = params || {};
      const apiParams: any = { ...rest, status: status || undefined, search: keyword };
      return API.friends.getAdminFriends(apiParams);
    },
    deleteFn: (id: number) => API.friends.deleteFriend(id),
  },
};

interface CommonPageProps {
  type: PageType;
  initialStatusFilter?: string;
}

const EmptyContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: var(--text-secondary);
  gap: 1rem;
`;

const ScrollWrapper = styled.div`
  max-height: 640px;
  overflow-y: auto;
  overflow-x: hidden;
  -ms-overflow-style: none;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;

const ListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: 2rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1.25rem;
`;

const Label = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
`;

export const CommonPage: React.FC<CommonPageProps> = ({ type, initialStatusFilter }) => {
  const navigate = useNavigate();
  const config = PAGE_CONFIG[type];
  const configRef = React.useRef(config);
  const [hasLoaded, setHasLoaded] = React.useState(false);

  const fetchData = useCallback(
    async (params: any) => {
      const currentConfig = configRef.current;
      try {
        const response = await currentConfig.fetchFn(params);
        let data = response.data;
        let pagination = response.meta?.pagination;

        if (Array.isArray(data)) {
          // do nothing
        } else if (data && Array.isArray(data.data)) {
          pagination = data.pagination || data.meta?.pagination;
          data = data.data;
        } else if (data && Array.isArray(data.items)) {
          pagination = data.pagination || data.meta?.pagination;
          data = data.items;
        }

        if (!pagination) {
          pagination = {
            total: data.length,
            page: params.page || 1,
            limit: params.limit || 10,
            totalPages: Math.ceil(data.length / (params.limit || 10)),
          };
        }

        setHasLoaded(true);
        return {
          success: true,
          code: 200,
          message: 'success',
          data,
          meta: { pagination, timestamp: new Date().toISOString() },
        };
      } catch (error) {
        console.error(`[CommonPage ${type}] ❌ Error:`, error);
        setHasLoaded(true);
        throw error;
      }
    },
    [type],
  );

  const initialParams = useMemo(() => {
    if ((type === 'comments' || type === 'guestbook' || type === 'friends') && initialStatusFilter) {
      return { status: initialStatusFilter };
    }
    return {};
  }, [type, initialStatusFilter]);

  const { items, isLoading, hasMore, error, loadMore, reload, search, totalItems, filter } = useManagementPage({
    fetchFunction: fetchData,
    initialParams,
    limit: 10,
  });

  const supportsCreate =
    type === 'notes' || type === 'articles' || type === 'users' || type === 'categories' || type === 'tags';
  const enableFilters =
    type === 'comments' ||
    type === 'projects' ||
    type === 'notes' ||
    type === 'articles' ||
    type === 'guestbook' ||
    type === 'friends';
  const [isFilterOpen, setIsFilterOpen] = React.useState(
    (type === 'comments' || type === 'guestbook' || type === 'friends') && !!initialStatusFilter,
  );

  const filterOptions = useMemo(() => {
    if (type === 'comments')
      return [
        { key: 'approved', label: '已通过' },
        { key: 'pending', label: '待审核' },
        { key: 'spam', label: '垃圾/屏蔽' },
      ];
    if (type === 'projects')
      return [
        { key: 'active', label: '活跃' },
        { key: 'developing', label: '开发中' },
        { key: 'paused', label: '暂停' },
        { key: 'archived', label: '已归档' },
      ];
    if (type === 'notes')
      return [
        { key: 'public', label: '公开' },
        { key: 'private', label: '私密' },
      ];
    if (type === 'articles')
      return [
        { key: '0', label: '草稿' },
        { key: '1', label: '已发布' },
        { key: '2', label: '已归档' },
      ];
    if (type === 'guestbook')
      return [
        { key: 'approved', label: '已通过' },
        { key: 'pending', label: '待审核' },
        { key: 'spam', label: '垃圾/屏蔽' },
      ];
    if (type === 'friends')
      return [
        { key: 'pending', label: '待审核' },
        { key: 'approved', label: '已通过' },
        { key: 'rejected', label: '已拒绝' },
        { key: 'blocked', label: '已屏蔽' },
      ];
    return [];
  }, [type]);

  // Modals state
  const [isUserModalOpen, setIsUserModalOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<UserProfile | null>(null);
  const [userForm, setUserForm] = React.useState({
    username: '',
    email: '',
    fullName: '',
    password: '',
    role: 'user' as 'user' | 'admin',
    status: 'active' as 'active' | 'inactive' | 'banned',
  });

  const [isCategoryModalOpen, setIsCategoryModalOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = React.useState({ name: '', slug: '', description: '' });

  const [isTagModalOpen, setIsTagModalOpen] = React.useState(false);
  const [editingTag, setEditingTag] = React.useState<Tag | null>(null);
  const [tagForm, setTagForm] = React.useState({
    name: '',
    slug: '',
    color: '#3B82F6',
    description: '',
  });

  const [isProjectModalOpen, setIsProjectModalOpen] = React.useState(false);
  const [editingProject, setEditingProject] = React.useState<Project | null>(null);
  const [projectForm, setProjectForm] = React.useState({
    title: '',
    slug: '',
    description: '',
    content: '',
    status: 'developing' as Project['status'],
    visibility: 'public' as Project['visibility'],
    language: '',
    tags: '',
    techStack: '',
    githubUrl: '',
    giteeUrl: '',
    demoUrl: '',
    docsUrl: '',
    npmPackage: '',
    isFeatured: false,
    isOpenSource: true,
  });

  const [isReplyModalOpen, setIsReplyModalOpen] = React.useState(false);
  const [replyTarget, setReplyTarget] = React.useState<GuestbookMessage | null>(null);
  const [replyContent, setReplyContent] = React.useState('');

  const [isSyncModalOpen, setIsSyncModalOpen] = React.useState(false);

  useModalScrollLock(
    isUserModalOpen ||
      isCategoryModalOpen ||
      isTagModalOpen ||
      isProjectModalOpen ||
      isReplyModalOpen ||
      isSyncModalOpen,
  );

  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const {
    visibleItems,
    visibleRange,
    topSpacer,
    bottomSpacer,
    handleScroll: handleVirtualScroll,
    recordItemHeight,
  } = useVirtualScroll<any>({ items, threshold: 30, estimatedHeight: 120, overscan: 8 });

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    handleVirtualScroll(scrollTop, clientHeight);
    if (!isLoading && hasMore && scrollTop + clientHeight >= scrollHeight - 200) {
      loadMore();
    }
  }, [handleVirtualScroll, isLoading, hasMore, loadMore]);

  const handleAdd = useCallback(() => {
    if (type === 'notes') return navigate('/editor/note');
    if (type === 'articles') return navigate('/editor/article');
    if (type === 'users') {
      setEditingUser(null);
      setUserForm({
        username: '',
        email: '',
        fullName: '',
        password: '',
        role: 'user',
        status: 'active',
      });
      setIsUserModalOpen(true);
      return;
    }
    if (type === 'categories') {
      setEditingCategory(null);
      setCategoryForm({ name: '', slug: '', description: '' });
      setIsCategoryModalOpen(true);
      return;
    }
    if (type === 'tags') {
      setEditingTag(null);
      setTagForm({ name: '', slug: '', color: '#3B82F6', description: '' });
      setIsTagModalOpen(true);
      return;
    }
    if (type === 'projects') setIsSyncModalOpen(true);
  }, [navigate, type]);

  const handleEditItem = useCallback(
    (item: any) => {
      if (type === 'notes') return navigate(`/editor/note?id=${item.id}`);
      if (type === 'articles') return navigate(`/editor/article?id=${item.id}`);
      if (type === 'users') {
        const u = item as UserProfile;
        setEditingUser(u);
        setUserForm({
          username: u.username,
          email: u.email,
          fullName: u.fullName || '',
          password: '',
          role: (u.role as 'user' | 'admin') || 'user',
          status: (u.status as 'active' | 'inactive' | 'banned') || 'active',
        });
        setIsUserModalOpen(true);
        return;
      }
      if (type === 'categories') {
        const c = item as Category;
        setEditingCategory(c);
        setCategoryForm({ name: c.name, slug: c.slug, description: c.description || '' });
        setIsCategoryModalOpen(true);
        return;
      }
      if (type === 'tags') {
        const t = item as Tag;
        setEditingTag(t);
        setTagForm({
          name: t.name,
          slug: t.slug,
          color: t.color || '#3B82F6',
          description: t.description || '',
        });
        setIsTagModalOpen(true);
        return;
      }
      if (type === 'projects') {
        const p = item as Project;
        setEditingProject(p);
        setProjectForm({
          title: p.title,
          slug: p.slug,
          description: p.description || '',
          content: p.content || '',
          status: p.status,
          visibility: p.visibility,
          language: p.language || '',
          tags: (p.tags || []).join(', '),
          techStack: (p.techStack || []).join(', '),
          githubUrl: p.githubUrl || '',
          giteeUrl: p.giteeUrl || '',
          demoUrl: p.demoUrl || '',
          docsUrl: p.docsUrl || '',
          npmPackage: p.npmPackage || '',
          isFeatured: p.isFeatured,
          isOpenSource: p.isOpenSource,
        });
        setIsProjectModalOpen(true);
        return;
      }
    },
    [navigate, type],
  );

  const handleSaveUser = useCallback(async () => {
    try {
      if (editingUser) {
        await API.user.updateUser(editingUser.id, userForm);
        adnaan.toast.success('更新成功');
      } else {
        await API.user.createUser(userForm);
        adnaan.toast.success('创建成功');
      }
      setIsUserModalOpen(false);
      reload();
    } catch (error: any) {
      adnaan.toast.error(error.message || '操作失败');
    }
  }, [editingUser, userForm, reload]);

  const handleSaveCategory = useCallback(async () => {
    try {
      if (editingCategory) {
        await API.category.updateCategory(editingCategory.id, categoryForm);
        adnaan.toast.success('更新成功');
      } else {
        await API.category.createCategory(categoryForm);
        adnaan.toast.success('创建成功');
      }
      setIsCategoryModalOpen(false);
      reload();
    } catch (error: any) {
      adnaan.toast.error(error.message || '操作失败');
    }
  }, [editingCategory, categoryForm, reload]);

  const handleSaveTag = useCallback(async () => {
    try {
      if (editingTag) {
        await API.tag.updateTag(editingTag.id, tagForm);
        adnaan.toast.success('更新成功');
      } else {
        await API.tag.createTag(tagForm);
        adnaan.toast.success('创建成功');
      }
      setIsTagModalOpen(false);
      reload();
    } catch (error: any) {
      adnaan.toast.error(error.message || '操作失败');
    }
  }, [editingTag, tagForm, reload]);

  const handleSaveProject = useCallback(async () => {
    try {
      const payload: Partial<Project> = {
        title: projectForm.title.trim(),
        slug: projectForm.slug.trim(),
        description: projectForm.description?.trim() || undefined,
        content: projectForm.content?.trim() || undefined,
        status: projectForm.status,
        visibility: projectForm.visibility,
        language: projectForm.language?.trim() || undefined,
        tags: projectForm.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        techStack: projectForm.techStack
          .split(',')
          .map((tech) => tech.trim())
          .filter(Boolean),
        githubUrl: projectForm.githubUrl?.trim() || undefined,
        giteeUrl: projectForm.giteeUrl?.trim() || undefined,
        demoUrl: projectForm.demoUrl?.trim() || undefined,
        docsUrl: projectForm.docsUrl?.trim() || undefined,
        npmPackage: projectForm.npmPackage?.trim() || undefined,
        isFeatured: projectForm.isFeatured,
        isOpenSource: projectForm.isOpenSource,
      };

      if (!payload.title || !payload.slug) {
        adnaan.toast.error('请填写项目标题和 slug');
        return;
      }

      if (editingProject) {
        await API.project.updateProject(editingProject.id, payload);
        adnaan.toast.success('项目更新成功');
      } else {
        await API.project.createProject(payload);
        adnaan.toast.success('项目创建成功');
      }

      setIsProjectModalOpen(false);
      reload();
    } catch (error: any) {
      adnaan.toast.error(error.message || '操作失败');
    }
  }, [editingProject, projectForm, reload]);

  const handleSaveReply = useCallback(async () => {
    if (!replyTarget) return;
    try {
      await API.guestbook.updateMessageReply(replyTarget.id, replyContent);
      adnaan.toast.success('回复已更新');
      setIsReplyModalOpen(false);
      reload();
    } catch (error: any) {
      adnaan.toast.error(error.message || '更新回复失败');
    }
  }, [replyTarget, replyContent, reload]);

  const handleDelete = async (id: number, title: string) => {
    if (!config.deleteFn) return;
    const confirmed = await adnaan.confirm.delete(`确定要删除"${title}"吗？`, '删除确认');
    if (!confirmed) return;
    try {
      await config.deleteFn(id);
      adnaan.toast.success('删除成功');
      reload();
    } catch (error: any) {
      adnaan.toast.error(error.message || '删除失败');
    }
  };

  const renderItem = (item: any) => {
    const title = item.title || item.name || item.username || '无标题';
    const content =
      item.content || item.description
        ? RichTextParser.extractText(item.content || item.description).slice(0, 150)
        : '';
    const cover = item.cover || item.avatar;

    let statusBadge = null;
    if (type === 'articles' && item.status !== undefined) {
      const statusMap: any = { 0: 'draft', 1: 'published', 2: 'archived' };
      const statusLabel: any = { 0: '草稿', 1: '已发布', 2: '已归档' };
      statusBadge = <StatusBadge status={statusMap[item.status]}>{statusLabel[item.status]}</StatusBadge>;
    } else if ((type === 'comments' || type === 'guestbook' || type === 'friends') && item.status) {
      const statusLabel: any = { approved: '已通过', pending: '待审核', spam: '垃圾' };
      const friendStatusLabel: any = {
        pending: '待审核',
        approved: '已通过',
        rejected: '已拒绝',
        blocked: '已屏蔽',
      };

      if (type === 'friends') {
        statusBadge = <StatusBadge status={item.status}>{friendStatusLabel[item.status] || item.status}</StatusBadge>;
      } else {
        statusBadge = <StatusBadge status={item.status}>{statusLabel[item.status]}</StatusBadge>;
      }
    }

    const tags = item.tags || [];

    // 获取默认封面图标
    const getDefaultIcon = () => {
      switch (type) {
        case 'users':
          return <FiUser />;
        case 'tags':
          return <FiTag />;
        case 'categories':
          return <FiFolder />;
        case 'projects':
          return <FiGithub />;
        case 'articles':
          return <FiFileText />;
        case 'notes':
          return <FiEdit3 />;
        default:
          return <FiFolder />;
      }
    };

    if (type === 'comments') {
      const targetLabel = item.targetType === 'note' ? '手记' : item.targetType === 'project' ? '项目' : '文章';
      const targetTitle = item.targetTitle;
      const authorName = item.author?.username || item.guestName || '访客';
      const commentTitle = `${authorName} 在${targetLabel}《${targetTitle}》的评论`;

      const handleOpenTarget = () => {
        if (item.targetType === 'post') navigate(`/blog/${item.targetId}`);
        else if (item.targetType === 'note') navigate(`/notes/${item.targetId}`);
        else if (item.targetType === 'project') navigate(`/projects/${item.targetId}`);
      };

      const handleChangeStatus = async (newStatus: 'approved' | 'pending' | 'spam') => {
        try {
          await API.comment.updateCommentStatus(item.id, newStatus);
          adnaan.toast.success('评论状态更新成功');
          reload();
        } catch (error: any) {
          adnaan.toast.error(error.message || '更新评论状态失败');
        }
      };

      return (
        <ItemCard>
          <ItemCover src={item.author?.avatar}>{!item.author?.avatar && <FiMessageSquare />}</ItemCover>
          <ItemBody>
            <ItemHeader>
              <ItemTitle onClick={handleOpenTarget}>{commentTitle}</ItemTitle>
              {statusBadge}
            </ItemHeader>
            <ItemContent>{content}</ItemContent>
            <ItemMeta>
              <MetaItem>
                <FiCalendar />
                <span>{formatDate(item.createdAt)}</span>
              </MetaItem>
            </ItemMeta>
          </ItemBody>
          <ItemActions>
            {item.status === 'pending' && (
              <ActionButton onClick={() => handleChangeStatus('approved')} title="通过" style={{ color: '#22c55e' }}>
                <FiCheck />
              </ActionButton>
            )}
            {item.status !== 'spam' && (
              <ActionButton onClick={() => handleChangeStatus('spam')} title="标记垃圾" style={{ color: '#ef4444' }}>
                <FiAlertTriangle />
              </ActionButton>
            )}
            {config.deleteFn && (
              <ActionButton data-variant="delete" onClick={() => handleDelete(item.id, '评论')} title="删除">
                <FiTrash2 />
              </ActionButton>
            )}
          </ItemActions>
        </ItemCard>
      );
    }

    if (type === 'guestbook') {
      const message = item as GuestbookMessage;
      const author =
        (message.user && ((message.user as any).nickname || message.user.username)) || message.guestName || '访客';

      const handleChangeStatus = async (newStatus: GuestbookMessage['status']) => {
        try {
          await API.guestbook.updateMessageStatus(message.id, newStatus || 'pending');
          adnaan.toast.success('留言状态更新成功');
          reload();
        } catch (error: any) {
          adnaan.toast.error(error.message || '更新留言状态失败');
        }
      };

      const handleEditReply = () => {
        setReplyTarget(message);
        setReplyContent(message.replyContent || '');
        setIsReplyModalOpen(true);
      };

      return (
        <ItemCard>
          <ItemCover src={(message.user as any)?.avatar}>
            {!(message.user as any)?.avatar && <FiMessageSquare />}
          </ItemCover>
          <ItemBody>
            <ItemHeader>
              <ItemTitle>{author}</ItemTitle>
              {statusBadge}
            </ItemHeader>
            <ItemContent>{message.content}</ItemContent>
            <ItemMeta>
              <MetaItem>
                <FiCalendar />
                <span>{formatDate(message.createdAt)}</span>
              </MetaItem>
              {message.location && (
                <MetaItem>
                  <FiFolder />
                  <span>{message.location}</span>
                </MetaItem>
              )}
              {message.guestWebsite && (
                <MetaItem>
                  <FiFileText />
                  <span>{message.guestWebsite}</span>
                </MetaItem>
              )}
            </ItemMeta>
          </ItemBody>
          <ItemActions>
            {message.status === 'pending' && (
              <ActionButton onClick={() => handleChangeStatus('approved')} title="通过" style={{ color: '#22c55e' }}>
                <FiCheck />
              </ActionButton>
            )}
            {message.status !== 'spam' && (
              <ActionButton onClick={() => handleChangeStatus('spam')} title="标记垃圾" style={{ color: '#ef4444' }}>
                <FiAlertTriangle />
              </ActionButton>
            )}
            <ActionButton onClick={handleEditReply} title="编辑回复">
              <FiEdit3 />
            </ActionButton>
            {config.deleteFn && (
              <ActionButton data-variant="delete" onClick={() => handleDelete(message.id, author)} title="删除">
                <FiTrash2 />
              </ActionButton>
            )}
          </ItemActions>
        </ItemCard>
      );
    }

    if (type === 'friends') {
      const link = item as FriendLink;

      const handleChangeStatus = async (newStatus: FriendLink['status']) => {
        try {
          await API.friends.updateFriendStatus(link.id, newStatus);
          adnaan.toast.success('友链状态更新成功');
          reload();
        } catch (error: any) {
          adnaan.toast.error(error.message || '更新友链状态失败');
        }
      };

      return (
        <ItemCard>
          <ItemCover src={link.avatar}>{!link.avatar && <FiFileText />}</ItemCover>
          <ItemBody>
            <ItemHeader>
              <ItemTitle>{link.name}</ItemTitle>
              {statusBadge}
            </ItemHeader>
            <ItemContent>{link.description}</ItemContent>
            <ItemMeta>
              <MetaItem>
                <FiCalendar />
                <span>{formatDate(link.createdAt)}</span>
              </MetaItem>
              {link.url && (
                <MetaItem>
                  <FiFileText />
                  <span>{link.url}</span>
                </MetaItem>
              )}
              {link.clickCount !== undefined && (
                <MetaItem>
                  <FiEye />
                  <span>{link.clickCount}</span>
                </MetaItem>
              )}
            </ItemMeta>
          </ItemBody>
          <ItemActions>
            {link.status === 'pending' && (
              <>
                <ActionButton onClick={() => handleChangeStatus('approved')} title="通过" style={{ color: '#22c55e' }}>
                  <FiCheck />
                </ActionButton>
                <ActionButton onClick={() => handleChangeStatus('rejected')} title="拒绝" style={{ color: '#f97316' }}>
                  <FiAlertTriangle />
                </ActionButton>
              </>
            )}
            {link.status !== 'blocked' && (
              <ActionButton onClick={() => handleChangeStatus('blocked')} title="屏蔽" style={{ color: '#ef4444' }}>
                <FiAlertTriangle />
              </ActionButton>
            )}
            {config.deleteFn && (
              <ActionButton data-variant="delete" onClick={() => handleDelete(link.id, link.name)} title="删除">
                <FiTrash2 />
              </ActionButton>
            )}
          </ItemActions>
        </ItemCard>
      );
    }

    return (
      <ItemCard>
        <ItemCover src={cover}>{!cover && getDefaultIcon()}</ItemCover>

        <ItemBody>
          <ItemHeader>
            <ItemTitle onClick={() => (config.getEditUrl ? navigate(config.getEditUrl(item.id)) : undefined)}>
              {title}
            </ItemTitle>
            {statusBadge}
          </ItemHeader>

          {content && <ItemContent>{content}</ItemContent>}

          {tags.length > 0 && (
            <TagsContainer>
              {tags.map((t: any, i: number) => (
                <TagComponent key={typeof t === 'string' ? t : t?.id ?? i}>{typeof t === 'string' ? t : t.name}</TagComponent>
              ))}
            </TagsContainer>
          )}

          <ItemMeta>
            <MetaItem>
              <FiCalendar />
              <span>{formatDate(item.createdAt)}</span>
            </MetaItem>
            {item.viewCount !== undefined && (
              <MetaItem>
                <FiEye />
                <span>{item.viewCount}</span>
              </MetaItem>
            )}
            {item.likeCount !== undefined && (
              <MetaItem>
                <FiHeart />
                <span>{item.likeCount}</span>
              </MetaItem>
            )}
            {item.commentCount !== undefined && (
              <MetaItem>
                <FiMessageSquare />
                <span>{item.commentCount}</span>
              </MetaItem>
            )}
          </ItemMeta>
        </ItemBody>

        <ItemActions>
          {config.getViewUrl && (
            <ActionButton onClick={() => window.open(config.getViewUrl!(item.id), '_blank')} title="查看">
              <FiEye />
            </ActionButton>
          )}
          {(config.getEditUrl || ['users', 'categories', 'tags', 'projects'].includes(type)) && (
            <ActionButton data-variant="edit" onClick={() => handleEditItem(item)} title="编辑">
              <FiEdit3 />
            </ActionButton>
          )}
          {config.deleteFn && (
            <ActionButton data-variant="delete" onClick={() => handleDelete(item.id, title)} title="删除">
              <FiTrash2 />
            </ActionButton>
          )}
        </ItemActions>
      </ItemCard>
    );
  };

  return (
    <>
      <ManagementLayout
        title={config.title}
        icon={<FiFolder />}
        searchPlaceholder={config.searchPlaceholder}
        searchValue={search.searchQuery}
        onSearchChange={search.setSearchQuery}
        loading={isLoading}
        total={totalItems}
        showFilters={enableFilters && isFilterOpen}
        onToggleFilters={enableFilters ? () => setIsFilterOpen((prev) => !prev) : undefined}
        filterOptions={enableFilters ? filterOptions : []}
        selectedFilter={enableFilters ? filter.selectedFilter : ''}
        onFilterChange={enableFilters ? filter.handleFilterChange : undefined}
        onAdd={handleAdd}
        // 移除 showCard 属性，使用 ManagementLayout 的默认透明样式
        showCard={false}
        createButton={
          type === 'projects' ? (
            <Button variant="primary" size="small" onClick={() => setIsSyncModalOpen(true)} leftIcon={<FiGithub />}>
              同步项目
            </Button>
          ) : supportsCreate ? undefined : (
            <></>
          )
        }
        onRefresh={reload}
      >
        {error ? (
          <EmptyContainer>
            <div>加载失败: {error.message}</div>
            <Button variant="secondary" onClick={reload}>
              重试
            </Button>
          </EmptyContainer>
        ) : !hasLoaded ? (
          <EmptyContainer>
            <div>加载中...</div>
          </EmptyContainer>
        ) : items.length === 0 ? (
          <EmptyContainer>
            <div>{config.emptyText}</div>
            {supportsCreate && (
              <Button variant="primary" size="small" onClick={handleAdd} style={{ marginTop: '1rem' }}>
                立即创建
              </Button>
            )}
          </EmptyContainer>
        ) : (
          <ScrollWrapper ref={scrollRef} onScroll={handleScroll} style={{ height: '640px' }}>
            <ListContainer style={{ position: 'relative', height: totalItems * 120 + 'px' }}>
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${topSpacer}px)`,
                }}
              >
                {visibleItems.map((item) => (
                  <div
                    key={item.id}
                    ref={(el) => {
                      if (el)
                        recordItemHeight(
                          visibleRange.start + visibleItems.indexOf(item),
                          el.getBoundingClientRect().height,
                        );
                    }}
                  >
                    {renderItem(item)}
                  </div>
                ))}
              </div>
            </ListContainer>
            {isLoading && (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>加载中...</div>
            )}
          </ScrollWrapper>
        )}
      </ManagementLayout>

      {type === 'guestbook' && (
        <Modal isOpen={isReplyModalOpen} onClose={() => setIsReplyModalOpen(false)} title="编辑回复" width={600}>
          <div style={{ padding: '1.5rem' }}>
            <FormGroup>
              <Label>原始留言</Label>
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '0.75rem',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  maxHeight: '200px',
                  overflowY: 'auto',
                  wordBreak: 'break-word',
                }}
              >
                {replyTarget?.content || '暂无内容'}
              </div>
            </FormGroup>
            <FormGroup>
              <Label>回复内容</Label>
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="请输入回复内容..."
                rows={4}
              />
            </FormGroup>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <Button variant="secondary" onClick={() => setIsReplyModalOpen(false)}>
                取消
              </Button>
              <Button variant="primary" onClick={handleSaveReply} disabled={!replyTarget}>
                保存
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modals - Users */}
      {type === 'users' && (
        <Modal
          isOpen={isUserModalOpen}
          onClose={() => setIsUserModalOpen(false)}
          title={editingUser ? '编辑用户' : '添加用户'}
          width={500}
        >
          <div style={{ padding: '1.5rem' }}>
            <FormGroup>
              <Label>用户名 *</Label>
              <Input
                value={userForm.username}
                onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                placeholder="请输入用户名"
              />
            </FormGroup>
            <FormGroup>
              <Label>邮箱 *</Label>
              <Input
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                placeholder="请输入邮箱"
              />
            </FormGroup>
            <FormGroup>
              <Label>全名</Label>
              <Input
                value={userForm.fullName}
                onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                placeholder="请输入全名"
              />
            </FormGroup>
            {!editingUser && (
              <FormGroup>
                <Label>密码 *</Label>
                <Input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder="请输入密码（至少6位）"
                />
              </FormGroup>
            )}
            <FormGroup>
              <Label>角色</Label>
              <Select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}>
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
              </Select>
            </FormGroup>
            <FormGroup>
              <Label>状态</Label>
              <Select
                value={userForm.status}
                onChange={(e) => setUserForm({ ...userForm, status: e.target.value as any })}
              >
                <option value="active">正常</option>
                <option value="inactive">禁用</option>
                <option value="banned">封禁</option>
              </Select>
            </FormGroup>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <Button variant="secondary" onClick={() => setIsUserModalOpen(false)}>
                取消
              </Button>
              <Button variant="primary" onClick={handleSaveUser}>
                保存
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modals - Categories */}
      {type === 'categories' && (
        <Modal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          title={editingCategory ? '编辑分类' : '新建分类'}
          width={500}
        >
          <div style={{ padding: '1.5rem' }}>
            <FormGroup>
              <Label>名称</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="请输入分类名称"
              />
            </FormGroup>
            <FormGroup>
              <Label>Slug</Label>
              <Input
                value={categoryForm.slug}
                onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                placeholder="请输入分类 Slug"
              />
            </FormGroup>
            <FormGroup>
              <Label>描述</Label>
              <Textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="请输入分类描述"
              />
            </FormGroup>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <Button variant="secondary" onClick={() => setIsCategoryModalOpen(false)}>
                取消
              </Button>
              <Button variant="primary" onClick={handleSaveCategory}>
                保存
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modals - Tags */}
      {type === 'tags' && (
        <Modal
          isOpen={isTagModalOpen}
          onClose={() => setIsTagModalOpen(false)}
          title={editingTag ? '编辑标签' : '新建标签'}
          width={500}
        >
          <div style={{ padding: '1.5rem' }}>
            <FormGroup>
              <Label>名称</Label>
              <Input
                value={tagForm.name}
                onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
                placeholder="请输入标签名称"
              />
            </FormGroup>
            <FormGroup>
              <Label>Slug</Label>
              <Input
                value={tagForm.slug}
                onChange={(e) => setTagForm({ ...tagForm, slug: e.target.value })}
                placeholder="请输入标签 Slug"
              />
            </FormGroup>
            <FormGroup>
              <Label>颜色</Label>
              <ColorPicker value={tagForm.color} onChange={(color) => setTagForm({ ...tagForm, color })} />
            </FormGroup>
            <FormGroup>
              <Label>描述</Label>
              <Textarea
                value={tagForm.description}
                onChange={(e) => setTagForm({ ...tagForm, description: e.target.value })}
                placeholder="请输入标签描述"
              />
            </FormGroup>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <Button variant="secondary" onClick={() => setIsTagModalOpen(false)}>
                取消
              </Button>
              <Button variant="primary" onClick={handleSaveTag}>
                保存
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modals - Projects */}
      {type === 'projects' && (
        <Modal
          isOpen={isProjectModalOpen}
          onClose={() => setIsProjectModalOpen(false)}
          title={editingProject ? '编辑项目' : '新建项目'}
          width={800}
        >
          <div style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <FormGroup>
                <Label>项目名称 *</Label>
                <Input
                  value={projectForm.title}
                  onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                  placeholder="请输入项目名称"
                />
              </FormGroup>
              <FormGroup>
                <Label>Slug *</Label>
                <Input
                  value={projectForm.slug}
                  onChange={(e) => setProjectForm({ ...projectForm, slug: e.target.value })}
                  placeholder="project-slug"
                />
              </FormGroup>
            </div>

            <FormGroup>
              <Label>描述</Label>
              <Textarea
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                placeholder="简短的项目描述"
                rows={3}
              />
            </FormGroup>

            <FormGroup>
              <Label>详细内容</Label>
              <Suspense fallback={<div style={{ minHeight: 200 }}>编辑器加载中...</div>}>
                <RichTextEditor
                  content={projectForm.content}
                  onChange={(content) => setProjectForm({ ...projectForm, content })}
                  placeholder="详细的项目介绍..."
                />
              </Suspense>
            </FormGroup>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <FormGroup>
                <Label>状态</Label>
                <Select
                  value={projectForm.status}
                  onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value as any })}
                >
                  <option value="active">活跃</option>
                  <option value="developing">开发中</option>
                  <option value="paused">暂停</option>
                  <option value="archived">已归档</option>
                </Select>
              </FormGroup>
              <FormGroup>
                <Label>可见性</Label>
                <Select
                  value={projectForm.visibility}
                  onChange={(e) => setProjectForm({ ...projectForm, visibility: e.target.value as any })}
                >
                  <option value="public">公开</option>
                  <option value="private">私密</option>
                </Select>
              </FormGroup>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <FormGroup>
                <Label>主要语言</Label>
                <Input
                  value={projectForm.language}
                  onChange={(e) => setProjectForm({ ...projectForm, language: e.target.value })}
                  placeholder="e.g. TypeScript"
                />
              </FormGroup>
              <FormGroup>
                <Label>标签 (逗号分隔)</Label>
                <Input
                  value={projectForm.tags}
                  onChange={(e) => setProjectForm({ ...projectForm, tags: e.target.value })}
                  placeholder="e.g. React, Node.js"
                />
              </FormGroup>
            </div>

            <FormGroup>
              <Label>技术栈 (逗号分隔)</Label>
              <Input
                value={projectForm.techStack}
                onChange={(e) => setProjectForm({ ...projectForm, techStack: e.target.value })}
                placeholder="e.g. Next.js, Tailwind, Prisma"
              />
            </FormGroup>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <FormGroup>
                <Label>GitHub URL</Label>
                <Input
                  value={projectForm.githubUrl}
                  onChange={(e) => setProjectForm({ ...projectForm, githubUrl: e.target.value })}
                  placeholder="https://github.com/..."
                />
              </FormGroup>
              <FormGroup>
                <Label>Demo URL</Label>
                <Input
                  value={projectForm.demoUrl}
                  onChange={(e) => setProjectForm({ ...projectForm, demoUrl: e.target.value })}
                  placeholder="https://..."
                />
              </FormGroup>
            </div>

            <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
              <FormGroup style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 0 }}>
                <Switch
                  checked={projectForm.isFeatured}
                  onChange={(checked) => setProjectForm({ ...projectForm, isFeatured: checked })}
                />
                <Label style={{ marginBottom: 0 }}>精选项目</Label>
              </FormGroup>
              <FormGroup style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 0 }}>
                <Switch
                  checked={projectForm.isOpenSource}
                  onChange={(checked) => setProjectForm({ ...projectForm, isOpenSource: checked })}
                />
                <Label style={{ marginBottom: 0 }}>开源</Label>
              </FormGroup>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <Button variant="secondary" onClick={() => setIsProjectModalOpen(false)}>
                取消
              </Button>
              <Button variant="primary" onClick={handleSaveProject}>
                保存
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <GithubSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onSyncSuccess={() => {
          setIsSyncModalOpen(false);
          reload();
        }}
      />
    </>
  );
};

export default CommonPage;
