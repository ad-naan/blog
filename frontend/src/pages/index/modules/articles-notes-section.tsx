import React from 'react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiEye, FiMessageCircle } from 'react-icons/fi';
import { getTimeAgo } from '@/utils';
import { useAnimationEngine } from '@/utils/ui/animation';
import { ArticlesSectionProps, NotesSectionProps } from './types';

// === 布局（全扁平：无卡片、无背景容器，靠字重/字号/分隔线建立层次） ===
const ContentSection = styled(motion.section)`
  margin: 0 0 4.5rem;
  overflow-x: hidden;
`;

// 标题区：左侧标题组 + 右侧序号徽标
const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1.5rem;
  flex-wrap: wrap;
  margin: 0 0 0.25rem;
`;

// 等宽注释体标题，呼应全站 // 母题
const SectionTitle = styled(motion.h2)`
  font-family: var(--font-mono);
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
  letter-spacing: 0.02em;

  &::before {
    content: '// ';
    color: var(--accent-color);
  }
`;

const SectionSubtitle = styled(motion.p)`
  font-size: 0.95rem;
  color: var(--text-secondary);
  margin: 0;
  opacity: 0.85;
  line-height: 1.6;
`;

// 右侧「还有更多」链接 + 索引编号，组成一个终端风小标签
const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-bottom: 0.35rem;
`;

const IndexTag = styled.span`
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--text-tertiary);
  letter-spacing: 0.08em;

  & b {
    color: var(--accent-color);
    font-weight: 600;
  }
`;

const MoreLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--accent-color);
  text-decoration: none;
  border-bottom: 1px dashed rgba(var(--accent-rgb), 0.4);
  padding-bottom: 1px;
  white-space: nowrap;
  transition: border-color 0.15s ease;

  &:hover {
    border-bottom-style: solid;
    border-color: var(--accent-color);
  }
`;

// 提示行：$ tail -3 ~/blog
const PromptLine = styled.div`
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-tertiary);
  padding: 0 0 0.9rem;

  .prompt {
    color: var(--accent-color);
    margin-right: 0.4rem;
  }
`;

// === 文章：首篇特写 ===
const FeaturedEntry = styled(motion.div)`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1.1rem;
  padding: 1rem 0.75rem 1.1rem;
  margin: 0 -0.75rem;
  border-top: 1px solid var(--border-color);
  position: relative;
  cursor: pointer;

  /* 左侧醒目序号列 */
  .feat-no {
    font-family: var(--font-mono);
    font-size: 2.2rem;
    font-weight: 700;
    line-height: 1;
    color: transparent;
    -webkit-text-stroke: 1px rgba(var(--accent-rgb), 0.55);
    letter-spacing: 0.02em;
    padding-top: 0.2rem;
    transition: all 0.2s ease;
  }

  .feat-title {
    font-size: 1.12rem;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.5;
    margin: 0.1rem 0 0.45rem;
    transition: color 0.15s ease;
  }

  .feat-desc {
    font-size: 0.86rem;
    color: var(--text-secondary);
    line-height: 1.7;
    margin: 0 0 0.7rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .feat-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.9rem;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--text-tertiary);

    .cat {
      color: var(--accent-color);
      border: 1px solid rgba(var(--accent-rgb), 0.35);
      border-radius: 3px;
      padding: 0.1em 0.5em;
    }

    .m {
      display: inline-flex;
      align-items: center;
      gap: 0.3em;
    }
  }

  /* hover：序号填充 + 标题着色，无卡片背景 */
  &:hover {
    .feat-no {
      color: var(--accent-color);
      -webkit-text-stroke: 1px var(--accent-color);
    }
    .feat-title {
      color: var(--accent-color);
    }
  }
`;

// === 文章：其余条目（紧凑行） ===
const EntryList = styled(motion.div)`
  display: flex;
  flex-direction: column;
  border-top: 1px dashed var(--border-color);
`;

const EntryRow = styled(motion.div)`
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  padding: 0.6rem 0;
  font-family: var(--font-mono);

  .line-no {
    color: var(--text-tertiary);
    opacity: 0.55;
    font-size: 0.7rem;
    flex-shrink: 0;
    transition: all 0.15s ease;
  }

  .entry-title {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: color 0.15s ease;
  }

  .entry-cat {
    flex-shrink: 0;
    font-size: 0.68rem;
    color: var(--text-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 3px;
    padding: 0.05em 0.45em;
    opacity: 0.8;
  }

  .leader {
    flex: 1;
    min-width: 12px;
    border-bottom: 1px dotted var(--border-color);
    opacity: 0.6;
    transform: translateY(-3px);
  }

  .time {
    color: var(--text-tertiary);
    font-size: 0.7rem;
    flex-shrink: 0;
  }

  a & {
    cursor: pointer;
  }

  &:hover {
    .entry-title {
      color: var(--accent-color);
    }
    .line-no {
      color: var(--accent-color);
      opacity: 1;
    }
  }
`;

// === 手记：情绪流 ===
const NotesList = styled(motion.div)`
  display: flex;
  flex-direction: column;
`;

const NoteRow = styled(motion.div)`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.65rem 0;
  border-bottom: 1px dashed var(--border-color);
  cursor: pointer;

  &:last-child {
    border-bottom: none;
  }

  /* 情绪竖线 */
  .mood-bar {
    flex-shrink: 0;
    width: 3px;
    align-self: stretch;
    border-radius: 2px;
    background: linear-gradient(to bottom, rgba(var(--accent-rgb), 0.7), rgba(var(--accent-rgb), 0.15));
  }

  .note-body {
    flex: 1;
    min-width: 0;
  }

  .note-text {
    font-size: 0.85rem;
    color: var(--text-secondary);
    line-height: 1.65;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: color 0.15s ease;
  }

  .note-meta {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    margin-top: 0.3rem;
    font-family: var(--font-mono);
    font-size: 0.68rem;
    color: var(--text-tertiary);

    .mood {
      color: var(--accent-color);
    }
  }

  .note-time {
    flex-shrink: 0;
    font-family: var(--font-mono);
    font-size: 0.68rem;
    color: var(--text-tertiary);
    padding-top: 0.15rem;
  }

  &:hover .note-text {
    color: var(--text-primary);
  }
`;

const EmptyHint = styled.p`
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--text-tertiary);
  padding: 1.2rem 0;
  margin: 0;

  &::before {
    content: '# ';
    color: var(--accent-color);
  }
`;

// === 文章区域 ===
export const ArticlesSection: React.FC<ArticlesSectionProps> = ({ articles, loading }) => {
  const { variants } = useAnimationEngine();

  if (loading) return null;

  const [featured, ...rest] = articles.slice(0, 3);

  return (
    <ContentSection
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.12, margin: '0px 0px -5% 0px' }}
      variants={variants.stagger}
    >
      <SectionHeader>
        <div>
          <SectionTitle variants={variants.fadeIn}>技术文思的「新地球」</SectionTitle>
          <SectionSubtitle variants={variants.fadeIn}>
            长文是思想的完整编译输出
          </SectionSubtitle>
        </div>
        <HeaderRight>
          <IndexTag>
            ARTICLES · <b>0{articles.length}</b>
          </IndexTag>
          <MoreLink to="/blog">
            还有更多 <FiArrowRight size={12} />
          </MoreLink>
        </HeaderRight>
      </SectionHeader>

      <PromptLine>
        <span className="prompt">$</span>tail -3 ~/blog
      </PromptLine>

      {articles.length === 0 ? (
        <EmptyHint>目录还是空的，第一篇长文正在路上</EmptyHint>
      ) : (
        <>
          {/* 首篇特写 */}
          {featured && (
            <Link key={featured.id} to={`/blog/${featured.id}`} style={{ textDecoration: 'none' }}>
              <FeaturedEntry variants={variants.listItem}>
                <span className="feat-no">01</span>
                <div>
                  <h3 className="feat-title">{featured.title}</h3>
                  {featured.description && <p className="feat-desc">{featured.description}</p>}
                  <div className="feat-meta">
                    {featured.category?.name && <span className="cat">{featured.category.name}</span>}
                    <span className="m">
                      <FiEye size={11} /> {featured.viewCount ?? 0}
                    </span>
                    <span className="m">
                      <FiMessageCircle size={11} /> {featured.commentCount ?? 0}
                    </span>
                    <span>{getTimeAgo(featured.publishedAt)}</span>
                  </div>
                </div>
              </FeaturedEntry>
            </Link>
          )}

          {/* 其余条目 */}
          {rest.length > 0 && (
            <EntryList initial="hidden" animate="visible" variants={variants.stagger}>
              {rest.map((article, index) => (
                <Link key={article.id} to={`/blog/${article.id}`} style={{ textDecoration: 'none' }}>
                  <EntryRow variants={variants.listItem} custom={index}>
                    <span className="line-no">{String(index + 2).padStart(2, '0')}</span>
                    <span className="entry-title">{article.title}</span>
                    {article.category?.name && <span className="entry-cat">{article.category.name}</span>}
                    <span className="leader" />
                    <span className="time">{getTimeAgo(article.publishedAt)}</span>
                  </EntryRow>
                </Link>
              ))}
            </EntryList>
          )}
        </>
      )}
    </ContentSection>
  );
};

// === 手记区域 ===
export const NotesSection: React.FC<NotesSectionProps> = ({ notes, loading }) => {
  const { variants } = useAnimationEngine();

  if (loading) return null;

  return (
    <ContentSection
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.12, margin: '0px 0px -5% 0px' }}
      variants={variants.stagger}
    >
      <SectionHeader>
        <div>
          <SectionTitle variants={variants.fadeIn}>思想的「裂缝中的阳光」</SectionTitle>
          <SectionSubtitle variants={variants.fadeIn}>
            手记是从裂缝里漏出来的片段
          </SectionSubtitle>
        </div>
        <HeaderRight>
          <IndexTag>
            NOTES · <b>0{notes.length}</b>
          </IndexTag>
          <MoreLink to="/notes">
            还有更多 <FiArrowRight size={12} />
          </MoreLink>
        </HeaderRight>
      </SectionHeader>

      <PromptLine>
        <span className="prompt">$</span>tail -5 ~/notes
      </PromptLine>

      {notes.length === 0 ? (
        <EmptyHint>裂缝里暂时没有漏出光</EmptyHint>
      ) : (
        <NotesList initial="hidden" animate="visible" variants={variants.stagger}>
          {notes.slice(0, 5).map((note, index) => (
            <Link key={note.id} to={`/notes/${note.id}`} style={{ textDecoration: 'none' }}>
              <NoteRow variants={variants.listItem} custom={index}>
                <span className="mood-bar" />
                <div className="note-body">
                  <p className="note-text" style={{ margin: 0 }}>
                    {note.title || note.content || '无标题手记'}
                  </p>
                  <div className="note-meta">
                    {note.mood && <span className="mood">{note.mood}</span>}
                    <span>{getTimeAgo(note.createdAt)}</span>
                  </div>
                </div>
              </NoteRow>
            </Link>
          ))}
        </NotesList>
      )}
    </ContentSection>
  );
};

export default { ArticlesSection, NotesSection };
