import React from 'react';
import styled from '@emotion/styled';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiStar, FiGithub, FiCode, FiFolderPlus, FiExternalLink, FiArrowRight } from 'react-icons/fi';
import { SiGitee } from 'react-icons/si';
import { formatDate } from '@/utils';
import { useAnimationEngine, useSmartInView, useSpringInteractions } from '@/utils/ui/animation';
import { Icon } from '@/components/common/icon';
import { getLanguageIcon, calculateProjectRadarData } from '@/utils/ui/language-icons';
import { ProjectsSectionProps } from './types';

// === 布局（全扁平：无卡片、无边框、无底色容器） ===
const ProjectsWrapper = styled(motion.section)`
  margin: 0 0 4.5rem;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1.5rem;
  flex-wrap: wrap;
  margin: 0 0 2.25rem;

  @media (max-width: 968px) {
    margin: 0 0 1.75rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
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
  max-width: 480px;
`;

// 数据摘要：纯文本
const StatsRow = styled(motion.div)`
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;

  @media (max-width: 968px) {
    gap: 1.25rem;
  }
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
`;

const StatValue = styled.span`
  font-family: var(--font-mono);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent-color);
  line-height: 1.2;
`;

const StatLabel = styled.span`
  font-size: 0.8rem;
  color: var(--text-tertiary);
  letter-spacing: 0.05em;
`;

// 双栏：中间一条虚线，无任何容器盒
const FlatLayout = styled(motion.div)`
  display: grid;
  grid-template-columns: minmax(260px, 2fr) 3fr;

  @media (max-width: 968px) {
    grid-template-columns: 1fr;
  }
`;

// === 左栏：纯文本 ls 清单 ===
const ListColumn = styled.div`
  display: flex;
  flex-direction: column;
  padding-right: 2rem;
`;

const PromptLine = styled.div`
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-tertiary);
  padding: 0 0 0.75rem;

  .prompt {
    color: var(--accent-color);
    margin-right: 0.4rem;
  }
`;

const RepoList = styled.div`
  display: flex;
  flex-direction: column;
`;

// 单行仓库：纯文本行，激活仅靠颜色 + 指针符号
const RepoRow = styled.button<{ active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  color: var(--text-secondary);
  transition: color 0.15s ease;

  &:hover {
    color: var(--text-primary);
  }

  ${(props) =>
    props.active &&
    `
    color: var(--text-primary);
  `}

  .marker {
    width: 0.9rem;
    flex-shrink: 0;
    color: var(--accent-color);
    opacity: ${(props) => (props.active ? 1 : 0)};
    transition: opacity 0.15s ease;
  }

  .line-no {
    color: var(--text-tertiary);
    opacity: 0.55;
    font-size: 0.7rem;
    flex-shrink: 0;

    ${(props) =>
      props.active &&
      `
      color: var(--accent-color);
      opacity: 1;
    `}
  }

  .lang-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .repo-name {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    ${(props) =>
      props.active &&
      `
      color: var(--accent-color);
    `}
  }

  .leader {
    flex: 1;
    min-width: 12px;
    border-bottom: 1px dotted var(--border-color);
    opacity: 0.6;
    transform: translateY(-3px);
  }

  .stars {
    color: var(--text-tertiary);
    font-size: 0.7rem;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    flex-shrink: 0;
  }
`;

const CdLine = styled.div`
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-tertiary);
  padding-top: 0.75rem;
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  overflow: hidden;
  white-space: nowrap;

  .prompt {
    color: var(--accent-color);
  }

  .cmd {
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .caret {
    display: inline-block;
    width: 7px;
    height: 0.95em;
    background: var(--accent-color);
    animation: caret-blink 1.1s steps(2) infinite;
    flex-shrink: 0;
  }

  @keyframes caret-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
`;

// === 右栏：纯文本 README ===
const ReadmeColumn = styled.div`
  display: flex;
  flex-direction: column;
  padding-left: 2rem;
  border-left: 1px dashed var(--border-color);

  @media (max-width: 968px) {
    padding-left: 0;
    padding-top: 1.5rem;
    border-left: none;
    border-top: 1px dashed var(--border-color);
  }
`;

// 面包屑路径行
const Breadcrumb = styled.div`
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--text-tertiary);
  padding-bottom: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  .sep {
    margin: 0 0.35rem;
    opacity: 0.5;
  }

  .file {
    color: var(--accent-color);
  }
`;

const ReadmeBody = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  cursor: ew-resize;
  flex: 1;

  @media (max-width: 968px) {
    touch-action: pan-y pinch-zoom;
    cursor: default;
  }
`;

// 标题行：裸语言图标 + 标题（无图标底盒）
const ReadmeHeader = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.7rem;
  flex-wrap: wrap;

  .lang-icon {
    display: inline-flex;
    align-items: center;
    transform: translateY(2px);
  }
`;

const ReadmeTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
  line-height: 1.3;
  word-break: break-word;
`;

const ViewDetailLink = styled(Link)`
  font-size: 0.78rem;
  color: var(--accent-color);
  text-decoration: none;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  white-space: nowrap;
  border-bottom: 1px dashed rgba(var(--accent-rgb), 0.45);
  padding-bottom: 1px;

  &:hover {
    border-bottom-style: solid;
  }
`;

const ReadmeDescription = styled.p`
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.7;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

// 关键词：纯文本 #tag，无标签底
const KeywordFlow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.9rem;
`;

const KeywordTag = styled.span`
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--accent-color);
  opacity: 0.85;
`;

// 元信息：一行纯文本键值
const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1.5rem;
  font-family: var(--font-mono);
`;

const MetaItem = styled.div`
  display: inline-flex;
  align-items: baseline;
  gap: 0.45rem;
  font-size: 0.75rem;

  .k {
    color: var(--text-tertiary);
    font-size: 0.65rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .v {
    color: var(--text-primary);
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }
`;

const LangName = styled.span<{ color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;

  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${(props) => props.color};
  }
`;

// 底部：指标条 + 文本链接，一条虚线分隔
const ReadmeFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  margin-top: 0.5rem;
  padding-top: 1.25rem;
  border-top: 1px dashed var(--border-color);
  flex-wrap: wrap;
`;

// 终端式指标条：metrics --enable-hot-tracker ▓▓▓░░ 62
const MetricsBars = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.45rem 2rem;
  flex: 1;
  min-width: 260px;
`;

const MetricBar = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  white-space: nowrap;

  .label {
    color: var(--text-tertiary);
    width: 2.5em;
    flex-shrink: 0;
  }

  .track {
    color: var(--accent-color);
    letter-spacing: -0.5px; /* 让 ▓ 字符更紧凑 */
    opacity: 0.9;
  }

  .track .off {
    color: var(--border-color);
  }

  .value {
    color: var(--text-primary);
    font-weight: 600;
    font-size: 0.7rem;
  }
`;

const ProjectLinks = styled.div`
  display: flex;
  gap: 1.1rem;
  flex-wrap: wrap;
`;

// 文本链接：无按钮底，只有虚线下划线
const FlatLink = styled(motion.a)`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-family: var(--font-mono);
  font-size: 0.74rem;
  color: var(--accent-color);
  text-decoration: none;
  border-bottom: 1px dashed rgba(var(--accent-rgb), 0.4);
  padding-bottom: 1px;

  &:hover {
    border-bottom-style: solid;
  }

  svg {
    width: 13px;
    height: 13px;
  }
`;

// 移动端指示点
const MobileIndicator = styled.div`
  display: none;

  @media (max-width: 968px) {
    display: flex;
    justify-content: center;
    gap: 0.4rem;
    padding-top: 1.25rem;
  }
`;

const Dot = styled.div<{ active?: boolean }>`
  width: ${(props) => (props.active ? '20px' : '6px')};
  height: 6px;
  border-radius: 3px;
  background: ${(props) => (props.active ? 'var(--accent-color)' : 'var(--border-color)')};
  transition: all 0.3s ease;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 3rem 0;
  color: var(--text-secondary);

  svg {
    width: 40px;
    height: 40px;
    opacity: 0.4;
  }

  p {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    margin: 0;
    opacity: 0.7;
  }
`;

// === 主组件 ===
export const ProjectsSection: React.FC<ProjectsSectionProps> = ({
  projects,
  selectedProjectIndex,
  onProjectChange,
}) => {
  const { variants } = useAnimationEngine();
  const springInteractions = useSpringInteractions();
  const containerView = useSmartInView({ amount: 0.2, lcpOptimization: true });

  const handlePrevProject = () => {
    if (selectedProjectIndex > 0) onProjectChange(selectedProjectIndex - 1);
  };

  const handleNextProject = () => {
    if (selectedProjectIndex < projects.length - 1) onProjectChange(selectedProjectIndex + 1);
  };

  const project = projects[selectedProjectIndex];

  const totalStars = projects.reduce((sum, p) => sum + (p.stars || 0), 0);
  const totalForks = projects.reduce((sum, p) => sum + (p.forks || 0), 0);

  return (
    <ProjectsWrapper
      ref={containerView.ref as React.RefObject<HTMLElement>}
      initial="hidden"
      animate={containerView.isInView ? 'visible' : 'hidden'}
      variants={variants.stagger}
    >
      <SectionHeader>
        <div>
          <SectionTitle variants={variants.fadeIn}>开源 “关键词”</SectionTitle>
          <SectionSubtitle variants={variants.fadeIn}>
            每个仓库都是一个关键词，串起来就是我的开发词典
          </SectionSubtitle>
        </div>

        <StatsRow variants={variants.fadeIn}>
          <StatItem>
            <StatValue>{projects.length}</StatValue>
            <StatLabel>仓库</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{totalStars}</StatValue>
            <StatLabel>总 Stars</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{totalForks}</StatValue>
            <StatLabel>总 Forks</StatLabel>
          </StatItem>
        </StatsRow>
      </SectionHeader>

      {projects.length === 0 ? (
        <EmptyState>
          <FiFolderPlus />
          <p>$ ls ~/repositories → empty</p>
        </EmptyState>
      ) : (
        <FlatLayout variants={variants.fadeIn}>
          {/* 左栏：ls 清单 */}
          <ListColumn>
            <PromptLine>
              <span className="prompt">$</span>ls -1 ~/repositories
            </PromptLine>

            <RepoList>
              {projects.map((p, index) => (
                <RepoRow
                  key={p.id}
                  active={index === selectedProjectIndex}
                  onClick={() => onProjectChange(index)}
                  title={p.description}
                >
                  <span className="marker">▸</span>
                  <span className="line-no">{String(index + 1).padStart(2, '0')}</span>
                  <span
                    className="lang-dot"
                    style={{ background: getLanguageIcon(p.language).color }}
                  />
                  <span className="repo-name">{p.title}</span>
                  <span className="leader" />
                  <span className="stars">
                    <FiStar size={10} />
                    {p.stars || 0}
                  </span>
                </RepoRow>
              ))}
            </RepoList>

            <CdLine>
              <span className="prompt">$</span>
              <span className="cmd">cd {project?.title || '...'}</span>
              <span className="caret" />
            </CdLine>
          </ListColumn>

          {/* 右栏：纯文本 README */}
          <ReadmeColumn>
            <Breadcrumb>
              ~<span className="sep">/</span>repositories
              <span className="sep">/</span>
              {project?.slug || '...'}
              <span className="sep">/</span>
              <span className="file">README.md</span>
            </Breadcrumb>

            <AnimatePresence mode="wait">
              {project ? (
                <ReadmeBody
                  key={project.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(_, { offset, velocity }) => {
                    const swipe = Math.abs(offset.x) * velocity.x;
                    if (swipe < -500) handleNextProject();
                    else if (swipe > 500) handlePrevProject();
                  }}
                >
                  <ReadmeHeader>
                    <span className="lang-icon">
                      {getLanguageIcon(project.language).icon === 'code' ? (
                        <FiCode size={18} />
                      ) : (
                        <Icon
                          name={getLanguageIcon(project.language).icon}
                          size={18}
                          color={getLanguageIcon(project.language).color}
                        />
                      )}
                    </span>
                    <ReadmeTitle>{project.title}</ReadmeTitle>
                    <ViewDetailLink to={`/projects/${project.slug}`}>
                      查看详情
                      <FiArrowRight size={12} />
                    </ViewDetailLink>
                  </ReadmeHeader>

                  <ReadmeDescription>{project.description}</ReadmeDescription>

                  {/* 关键词：纯文本 #tag */}
                  {(project as any).tags?.length > 0 && (
                    <KeywordFlow>
                      {(project as any).tags.slice(0, 8).map((tag: string) => (
                        <KeywordTag key={tag}>#{tag}</KeywordTag>
                      ))}
                    </KeywordFlow>
                  )}

                  {/* 元信息：单行键值 */}
                  <MetaRow>
                    <MetaItem>
                      <span className="k">stars</span>
                      <span className="v">{project.stars || 0}</span>
                    </MetaItem>
                    <MetaItem>
                      <span className="k">forks</span>
                      <span className="v">{project.forks || 0}</span>
                    </MetaItem>
                    <MetaItem>
                      <span className="k">lang</span>
                      <span className="v">
                        <LangName color={getLanguageIcon(project.language).color}>
                          {project.language || 'N/A'}
                        </LangName>
                      </span>
                    </MetaItem>
                    <MetaItem>
                      <span className="k">updated</span>
                      <span className="v">
                        {project.updatedAt ? formatDate(project.updatedAt, 'MM-DD') : '最近'}
                      </span>
                    </MetaItem>
                  </MetaRow>

                  {/* 指标条 + 文本链接 */}
                  <ReadmeFooter>
                    <MetricsBars>
                      {calculateProjectRadarData(project, projects).map((metric) => (
                        <MetricBar key={metric.label}>
                          <span className="label">{metric.label}</span>
                          <span className="track">
                            {'▓'.repeat(Math.round((metric.value / metric.max) * 5))}
                            <span className="off">
                              {'░'.repeat(5 - Math.round((metric.value / metric.max) * 5))}
                            </span>
                          </span>
                          <span className="value">{metric.value}</span>
                        </MetricBar>
                      ))}
                    </MetricsBars>

                    <ProjectLinks>
                      {project.githubUrl && (
                        <FlatLink
                          href={project.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          {...springInteractions}
                        >
                          <FiGithub />
                          GitHub
                        </FlatLink>
                      )}
                      {project.giteeUrl && (
                        <FlatLink
                          href={project.giteeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          {...springInteractions}
                        >
                          <SiGitee />
                          Gitee
                        </FlatLink>
                      )}
                      {project.demoUrl && (
                        <FlatLink
                          href={project.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          {...springInteractions}
                        >
                          <FiExternalLink />
                          Demo
                        </FlatLink>
                      )}
                    </ProjectLinks>
                  </ReadmeFooter>

                  <MobileIndicator>
                    {projects.map((_, index) => (
                      <Dot key={index} active={index === selectedProjectIndex} />
                    ))}
                  </MobileIndicator>
                </ReadmeBody>
              ) : null}
            </AnimatePresence>
          </ReadmeColumn>
        </FlatLayout>
      )}
    </ProjectsWrapper>
  );
};

export default ProjectsSection;
