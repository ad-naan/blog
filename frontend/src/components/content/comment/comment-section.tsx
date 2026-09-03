import React, { useState, useEffect, useMemo, useRef } from 'react';
import styled from '@emotion/styled';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiMessageSquare,
  FiSend,
  FiCornerDownRight,
  FiTrash2,
  FiLoader,
  FiMapPin,
  FiClock,
  FiGithub,
  FiMail,
} from 'react-icons/fi';
import { Button, Input, Textarea, InfiniteScroll } from 'adnaan-ui';
import { CommentAvatar } from '@/components/common';
import { API } from '@/utils/api';
import type { Comment as CommentType } from '@/types';
import { storage } from '@/utils';
import { formatDate, getTimeAgo } from '@/utils';
import { useAnimationEngine } from '@/utils/ui/animation';
import { CommentSkeleton } from '@/components/common';

// 评论区容器
const CommentSectionContainer = styled(motion.div)`
  margin-top: 3rem;
`;

// 评论区标题
const CommentHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(var(--border-rgb, 229, 231, 235), 0.6);
`;

const CommentTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-primary);
  margin: 0;

  svg {
    color: var(--accent-color);
  }
`;

const CommentCount = styled.span`
  color: var(--text-tertiary);
  font-size: 0.8rem;
  font-weight: 400;
  opacity: 0.7;
`;

// 评论表单
const CommentForm = styled.form`
  margin-bottom: 1.5rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s ease;

  &:focus-within {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.1);
  }
`;

// 表单底部
const FormFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
  margin-top: 0.75rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const FormInfo = styled.div`
  font-size: 0.75rem;
  color: var(--text-tertiary);
  opacity: 0.6;
`;

// 操作按钮容器
const ActionButtonContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

// 评论列表 - 扁平化
const CommentList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

// 评论项容器
const CommentItemWrapper = styled(motion.li)<{ depth?: number }>`
  position: relative;
  margin-left: ${(props) => (props.depth || 0) * 2.25}rem;

  @media (max-width: 768px) {
    margin-left: ${(props) => (props.depth || 0) * 1.5}rem;
  }
`;

// 评论项
const CommentItem = styled.div`
  display: flex;
  gap: 0.625rem;
  padding: 0.625rem 0;

  &:hover {
    .comment-actions {
      opacity: 1;
    }
  }
`;

// 头像容器
const AvatarContainer = styled.div`
  position: relative;
  flex-shrink: 0;
`;

// 头像
const Avatar = styled.div<{ hasImage?: boolean }>`
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  background: ${(props) =>
    props.hasImage ? 'transparent' : 'linear-gradient(135deg, var(--accent-color), var(--accent-color-hover))'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

// 评论内容区
const CommentContent = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

// 评论头部 - 紧凑显示所有信息
const CommentContentHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.375rem;
  flex-wrap: wrap;
  font-size: 0.8125rem;
`;

// 评论者名字
const CommentAuthor = styled.span`
  font-weight: 600;
  color: var(--text-primary);
  flex-shrink: 0;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.875rem;
`;

// 次要信息容器
const CommentMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
  font-size: 0.6875rem;
  color: var(--text-tertiary);
  opacity: 0.6;
  flex-shrink: 1;
  min-width: 0;

  @media (max-width: 768px) {
    width: 100%;
    margin-top: -0.125rem;
  }
`;

const MetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.1875rem;
  flex-shrink: 0;

  svg {
    font-size: 0.625rem;
  }

  &.location {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 120px;
  }
`;

// 管理员标签样式
const AdminBadge = styled.span`
  padding: 0.0625rem 0.3125rem;
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent-color);
  border-radius: 3px;
  font-size: 0.625rem;
  font-weight: 500;
  flex-shrink: 0;
  line-height: 1.2;
`;

// 评论文本 - 气泡样式
const CommentBubble = styled.div`
  position: relative;
  display: inline-block;
  max-width: 100%;
  padding: 0.625rem 0.875rem;
  background: rgba(var(--text-primary-rgb, 0, 0, 0), 0.04);
  border-radius: 12px;
  border-top-left-radius: 4px;
  line-height: 1.6;
  color: var(--text-secondary);
  word-wrap: break-word;
  white-space: pre-wrap;
  font-size: 0.875rem;

  @media (min-width: 768px) {
    border-top-left-radius: 12px;
    border-bottom-left-radius: 4px;
  }

  .dark & {
    background: rgba(255, 255, 255, 0.06);
  }
`;

// 评论操作栏 - 悬停显示
const CommentActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.375rem;
  opacity: 0;
  transition: opacity 0.2s ease;

  @media (max-width: 768px) {
    opacity: 0.7;
  }
`;

// 回复表单容器
const ReplyFormContainer = styled(motion.div)`
  margin-top: 0.75rem;
  margin-left: 2.75rem;

  @media (max-width: 768px) {
    margin-left: 0;
  }
`;

// 空状态
const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1.5rem;
  color: var(--text-tertiary);
  opacity: 0.6;

  svg {
    font-size: 2.5rem;
    margin-bottom: 0.75rem;
    opacity: 0.4;
  }

  p {
    margin: 0;
    font-size: 0.875rem;
  }
`;

// 加载状态
const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  padding: 2rem;
  color: var(--accent-color);

  svg {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

type CommentTargetType = 'post' | 'note' | 'project';

interface CommentSectionProps {
  targetId: number;
  targetType: CommentTargetType;
}

// 用户头像：图片正常时不渲染兜底头像，仅加载失败时切换，避免兜底头像溢出叠加
const UserCommentAvatar: React.FC<{ src: string; seed: string }> = ({ src, seed }) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <CommentAvatar seed={seed} />;
  }

  return (
    <Avatar hasImage={true}>
      <img
        src={src}
        alt={seed}
        onError={() => setFailed(true)}
      />
    </Avatar>
  );
};

// 扁平化评论树的辅助函数
const flattenComments = (comments: CommentType[], depth = 0): Array<CommentType & { depth: number }> => {
  const result: Array<CommentType & { depth: number }> = [];

  comments.forEach((comment) => {
    result.push({ ...comment, depth });
    if (comment.replies && comment.replies.length > 0) {
      result.push(...flattenComments(comment.replies, depth + 1));
    }
  });

  return result;
};

const CommentSection: React.FC<CommentSectionProps> = ({ targetId, targetType }) => {
  const { variants } = useAnimationEngine();
  const [comments, setComments] = useState<CommentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');

  // 主表单访客信息
  const [guestName, setGuestName] = useState<string>(() => storage.local.get<string>('guest_name') || '');
  const [guestEmail, setGuestEmail] = useState<string>(() => storage.local.get<string>('guest_email') || '');
  const [guestWebsite, setGuestWebsite] = useState<string>(() => storage.local.get<string>('guest_website') || '');

  // 回复表单访客信息（独立状态，避免冲突）
  const [replyGuestName, setReplyGuestName] = useState<string>(() => storage.local.get<string>('guest_name') || '');
  const [replyGuestEmail, setReplyGuestEmail] = useState<string>(() => storage.local.get<string>('guest_email') || '');
  const [replyGuestWebsite, setReplyGuestWebsite] = useState<string>(
    () => storage.local.get<string>('guest_website') || '',
  );

  const user = storage.local.get('user');
  const token = storage.local.get('token');
  const isLoggedIn = !!token;

  // 扁平化的评论列表
  const flatComments = useMemo(() => flattenComments(comments), [comments]);

  // 获取评论列表（初始加载）
  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await API.comment.getCommentsByTarget(targetType, targetId, { page: 1, limit: 20 });
      if (response.code === 200 && response.data) {
        setComments(response.data || []);
        setTotal(response.meta?.pagination?.total ?? 0);
        setHasMore((response.data || []).length < (response.meta?.pagination?.total ?? 0));
        setPage(1);
      }
    } catch (error) {
      console.error('获取评论失败:', error);
      adnaan?.toast?.error('获取评论失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载更多评论
  const loadMoreComments = async () => {
    if (isLoadingMore || !hasMore) return;

    try {
      setIsLoadingMore(true);
      const nextPage = page + 1;
      const response = await API.comment.getCommentsByTarget(targetType, targetId, {
        page: nextPage,
        limit: 20,
      });

      if (response.code === 200 && response.data) {
        const newComments = response.data || [];
        setComments((prev) => [...prev, ...newComments]);
        setPage(nextPage);
        setHasMore(comments.length + newComments.length < (response.meta?.pagination?.total ?? 0));
      }
    } catch (error) {
      console.error('加载更多评论失败:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (targetId && targetType) {
      fetchComments();
    }
  }, [targetId, targetType]);

  // 使用 ref 存储主表单的访客信息，避免在 useEffect 依赖中触发
  const guestInfoRef = useRef({ guestName, guestEmail, guestWebsite });
  useEffect(() => {
    guestInfoRef.current = { guestName, guestEmail, guestWebsite };
  }, [guestName, guestEmail, guestWebsite]);

  // 当打开回复表单时，同步回复表单的访客信息（从主表单或本地存储）
  // 只在 replyingTo 改变时同步，避免在输入时被重置
  useEffect(() => {
    if (replyingTo !== null) {
      // 优先使用主表单的值，如果没有则使用本地存储
      const { guestName: name, guestEmail: email, guestWebsite: website } = guestInfoRef.current;
      const finalName = name || storage.local.get<string>('guest_name') || '';
      const finalEmail = email || storage.local.get<string>('guest_email') || '';
      const finalWebsite = website || storage.local.get<string>('guest_website') || '';
      setReplyGuestName(finalName);
      setReplyGuestEmail(finalEmail);
      setReplyGuestWebsite(finalWebsite);
    } else {
      // 关闭回复表单时，清空回复表单的状态
      setReplyText('');
    }
  }, [replyingTo]);

  // 提交评论
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // 阻止事件冒泡
    if (!commentText.trim()) return;

    // 访客评论验证
    if (!isLoggedIn) {
      if (!guestName.trim()) {
        adnaan?.toast?.error('请填写您的姓名');
        return;
      }
      if (!guestEmail.trim()) {
        adnaan?.toast?.error('请填写您的邮箱');
        return;
      }
      // 简单的邮箱格式验证
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(guestEmail)) {
        adnaan?.toast?.error('邮箱格式不正确');
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const commentData: any = {
        content: commentText,
        targetType,
        targetId,
      };

      // 如果是访客，添加访客信息
      if (!isLoggedIn) {
        commentData.guestName = guestName.trim();
        commentData.guestEmail = guestEmail.trim();
        commentData.guestWebsite = guestWebsite.trim() || undefined;

        // 保存访客信息到本地存储（下次使用）
        storage.local.set('guest_name', guestName.trim());
        storage.local.set('guest_email', guestEmail.trim());
        storage.local.set('guest_website', guestWebsite.trim());
      }

      await API.comment.createComment(commentData);

      adnaan?.toast?.success('评论发布成功');
      setCommentText('');
      await fetchComments();
    } catch (error: any) {
      adnaan?.toast?.error(error.message || '评论发布失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 提交回复
  const handleReply = async (parentId: number) => {
    if (!replyText.trim()) return;

    // 访客回复验证
    if (!isLoggedIn) {
      if (!replyGuestName.trim()) {
        adnaan?.toast?.error('请填写您的姓名');
        return;
      }
      if (!replyGuestEmail.trim()) {
        adnaan?.toast?.error('请填写您的邮箱');
        return;
      }
      // 简单的邮箱格式验证
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(replyGuestEmail)) {
        adnaan?.toast?.error('邮箱格式不正确');
        return;
      }
    }

    try {
      const replyData: any = {
        content: replyText,
        targetType,
        targetId,
        parentId,
      };

      // 如果是访客，添加访客信息
      if (!isLoggedIn) {
        replyData.guestName = replyGuestName.trim();
        replyData.guestEmail = replyGuestEmail.trim();
        replyData.guestWebsite = replyGuestWebsite.trim() || undefined;

        // 保存访客信息到本地存储（下次使用）
        storage.local.set('guest_name', replyGuestName.trim());
        storage.local.set('guest_email', replyGuestEmail.trim());
        storage.local.set('guest_website', replyGuestWebsite.trim());
      }

      await API.comment.createComment(replyData);

      adnaan?.toast?.success('回复发布成功');
      setReplyText('');
      setReplyingTo(null);
      await fetchComments();
    } catch (error: any) {
      adnaan?.toast?.error(error.message || '回复发布失败');
    }
  };

  // 删除评论
  const handleDelete = async (id: number) => {
    const confirmed = adnaan?.confirm?.delete
      ? await adnaan.confirm.delete('确定要删除这条评论吗？', '确认删除')
      : window.confirm('确定要删除这条评论吗？');

    if (!confirmed) return;

    try {
      await API.comment.deleteComment(id);
      adnaan?.toast?.success('评论已删除');
      await fetchComments();
    } catch (error: any) {
      adnaan?.toast?.error(error.message || '删除失败');
    }
  };

  // 渲染单个评论（扁平化版本）
  const renderComment = (comment: CommentType & { depth: number }) => {
    // 判断是访客评论还是用户评论
    const isGuestComment = comment.isGuest || !comment.userId;
    const author = isGuestComment
      ? comment.guestName || '访客'
      : comment.author?.username || comment.author?.fullName || '用户';
    const authorInitial = author ? author[0]?.toUpperCase() || '?' : '?';

    // 权限和角色判断
    const isAdmin = comment.author?.role === 'admin';
    const isOwner = isLoggedIn && typeof user === 'object' && user && 'id' in user && user.id === comment.userId;

    // 时间处理
    const relativeTime = comment.createdAt ? getTimeAgo(comment.createdAt) : '';
    const fullDate = comment.createdAt ? formatDate(comment.createdAt, 'YYYY-MM-DD HH:mm:ss') : '';

    // 访客信息
    const location = comment.location;
    const browser = comment.browser;
    const os = comment.os;
    const device = comment.device;

    // 获取头像URL（访客没有头像）
    const avatarUrl = isGuestComment ? null : comment.author?.avatar;

    return (
      <CommentItemWrapper
        key={`comment-${comment.id}-depth-${comment.depth}`}
        depth={comment.depth}
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      >
        <CommentItem>
          <AvatarContainer>
            {avatarUrl && avatarUrl.trim() ? (
              <UserCommentAvatar src={avatarUrl} seed={author} />
            ) : (
              <CommentAvatar seed={author} />
            )}
          </AvatarContainer>

          <CommentContent>
            {/* 头部信息 - 紧凑显示 */}
            <CommentContentHeader>
              <CommentAuthor title={author}>{author}</CommentAuthor>
              {isAdmin && <AdminBadge>博主</AdminBadge>}
              <CommentMeta>
                <MetaItem title={fullDate}>
                  <FiClock />
                  {relativeTime}
                </MetaItem>
                <MetaItem>#{String(comment.id).slice(0, 8)}</MetaItem>
                {location && location !== '未知' && (
                  <MetaItem className="location" title={`来自 ${location}`}>
                    <FiMapPin />
                    {location}
                  </MetaItem>
                )}
                {browser && (
                  <MetaItem title={`浏览器: ${browser}${os ? ' · 系统: ' + os : ''}`}>
                    {device === 'Mobile' ? '📱' : device === 'Tablet' ? '📟' : '💻'}
                  </MetaItem>
                )}
                {(comment.author?.email || comment.guestEmail) && (
                  <MetaItem title="已验证邮箱">
                    <FiMail />
                  </MetaItem>
                )}
              </CommentMeta>
            </CommentContentHeader>

            {/* 评论内容气泡 */}
            <CommentBubble>{comment.content}</CommentBubble>

            {/* 操作按钮 */}
            <CommentActions className="comment-actions">
              <Button
                variant="ghost"
                size="small"
                onClick={() => setReplyingTo(replyingTo === Number(comment.id) ? null : Number(comment.id))}
                title="回复"
                style={{ padding: '0.1875rem 0.4375rem', fontSize: '0.6875rem', minHeight: 'auto' }}
              >
                <FiCornerDownRight />
                回复
              </Button>
              {isOwner && (
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => handleDelete(Number(comment.id))}
                  title="删除"
                  style={{ padding: '0.1875rem 0.4375rem', fontSize: '0.6875rem', minHeight: 'auto' }}
                >
                  <FiTrash2 />
                  删除
                </Button>
              )}
            </CommentActions>

            {/* 回复表单 */}
            <AnimatePresence>
              {replyingTo === comment.id && (
                <ReplyFormContainer
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <CommentForm
                    onSubmit={(e) => {
                      e.preventDefault();
                      e.stopPropagation(); // 阻止事件冒泡
                      handleReply(Number(comment.id));
                    }}
                    onClick={(e) => e.stopPropagation()} // 阻止点击事件冒泡
                  >
                    {/* 访客信息输入（仅未登录时显示） */}
                    {!isLoggedIn && (
                      <div
                        style={{
                          display: 'grid',
                          gap: '0.5rem',
                          gridTemplateColumns: '1fr 1fr',
                          marginBottom: '0.5rem',
                        }}
                        onClick={(e) => e.stopPropagation()} // 阻止事件冒泡
                      >
                        <Input
                          placeholder="姓名 *"
                          value={replyGuestName}
                          onChange={(e) => {
                            e.stopPropagation();
                            setReplyGuestName(e.target.value);
                          }}
                          size="small"
                          required
                          style={{ width: '100%' }}
                          onClick={(e) => e.stopPropagation()} // 阻止事件冒泡
                        />
                        <Input
                          type="email"
                          placeholder="邮箱 *"
                          value={replyGuestEmail}
                          onChange={(e) => {
                            e.stopPropagation();
                            setReplyGuestEmail(e.target.value);
                          }}
                          size="small"
                          required
                          style={{ width: '100%' }}
                          onClick={(e) => e.stopPropagation()} // 阻止事件冒泡
                        />
                      </div>
                    )}

                    <Textarea
                      placeholder={`回复 ${author}...`}
                      value={replyText}
                      onChange={(e) => {
                        e.stopPropagation();
                        setReplyText(e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()} // 阻止事件冒泡
                      size="small"
                      fullWidth
                    />
                    <FormFooter onClick={(e) => e.stopPropagation()}>
                      <FormInfo>Ctrl + Enter 快速发送</FormInfo>
                      <ActionButtonContainer>
                        <Button
                          type="button"
                          variant="ghost"
                          size="small"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setReplyingTo(null);
                          }}
                        >
                          取消
                        </Button>
                        <Button
                          type="submit"
                          size="small"
                          disabled={!replyText.trim()}
                          variant="primary"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FiSend size={14} />
                          发送
                        </Button>
                      </ActionButtonContainer>
                    </FormFooter>
                  </CommentForm>
                </ReplyFormContainer>
              )}
            </AnimatePresence>
          </CommentContent>
        </CommentItem>
      </CommentItemWrapper>
    );
  };

  return (
    <CommentSectionContainer initial="hidden" animate="visible" variants={variants.fadeIn}>
      <CommentHeader>
        <CommentTitle>
          <FiMessageSquare size={18} />
          评论 <CommentCount>{total} 条</CommentCount>
        </CommentTitle>
      </CommentHeader>

      {/* 评论表单 */}
      <CommentForm onSubmit={handleSubmit}>
        {/* 访客信息输入（仅未登录时显示） */}
        {!isLoggedIn && (
          <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: '1fr 1fr', marginBottom: '0.75rem' }}>
            <Input
              placeholder="姓名 *"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              size="small"
              required
              style={{ width: '100%' }}
            />
            <Input
              type="email"
              placeholder="邮箱 *"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              size="small"
              required
              style={{ width: '100%' }}
            />
            <Input
              placeholder="网站（可选）"
              value={guestWebsite}
              onChange={(e) => setGuestWebsite(e.target.value)}
              size="small"
              style={{ gridColumn: '1 / -1', width: '100%' }}
            />
          </div>
        )}

        <Textarea
          placeholder={isLoggedIn ? '写下你的评论...' : '写下你的评论...'}
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          size="small"
          fullWidth
        />
        <FormFooter>
          <FormInfo>
            {'支持 Markdown 语法 · Ctrl + Enter 快速发送'}
          </FormInfo>
          <Button
            type="submit"
            size="small"
            disabled={!commentText.trim() || isSubmitting}
            isLoading={isSubmitting}
            variant="primary"
          >
            {isSubmitting ? '发送中...' : '发送评论'}
          </Button>
        </FormFooter>
      </CommentForm>

      {/* 评论列表 - 扁平化显示 + 无限滚动 */}
      {loading ? (
        <CommentSkeleton count={3} />
      ) : flatComments.length > 0 ? (
        <>
          <CommentList>{flatComments.map((comment) => renderComment(comment))}</CommentList>
          <InfiniteScroll
            hasMore={hasMore}
            itemCount={flatComments.length}
            loading={isLoadingMore}
            onLoadMore={loadMoreComments}
            threshold={200}
          >
            {isLoadingMore && <CommentSkeleton count={2} />}
          </InfiniteScroll>
        </>
      ) : (
        <EmptyState>
          <FiMessageSquare />
          <p>还没有评论，快来抢沙发吧！</p>
        </EmptyState>
      )}
    </CommentSectionContainer>
  );
};

export default CommentSection;
