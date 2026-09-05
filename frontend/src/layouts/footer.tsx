import styled from '@emotion/styled';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiGithub, FiMail, FiRss } from 'react-icons/fi';
import { Fragment, useState, useRef, useEffect } from 'react';
import { useOnlineUsers } from '@/hooks/useSocket';
import { useSiteSettings } from './index';
import VisitorStatsTooltip from '@/components/common/visitor-stats-tooltip';
import { useClickOutside } from '@/hooks';

// === 样式组件 ===

const FooterContainer = styled.footer`
  width: 100%;
  /* 主题色浸染：从透明渐入极浅的主题色，跟随当前主题 */
  background-image: linear-gradient(
    to bottom,
    rgba(var(--accent-rgb), 0),
    rgba(var(--accent-rgb), 0.04) 72px,
    rgba(var(--accent-rgb), 0.07)
  );
  margin-top: 6rem;
  font-family: var(--font-sans);
  position: relative;
  z-index: 10;
  overflow: hidden;

  /* Dark mode: 半透明主背景，透出星空背景 */
  [data-theme='dark'] & {
    background-image: linear-gradient(
      to bottom,
      rgba(var(--bg-primary-rgb), 0),
      rgba(var(--bg-primary-rgb), 0.55) 72px,
      rgba(var(--bg-primary-rgb), 0.55)
    );
  }
`;

const FooterContent = styled.div`
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 4.5rem 2rem 2rem;

  @media (max-width: 768px) {
    padding: 3.5rem 1.5rem 1.5rem;
  }
`;

// === 第一层：超大字标 + 标语 + 社交图标 ===
const HeroBlock = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 2rem;
  }
`;

const Wordmark = styled(Link)`
  font-size: clamp(2.25rem, 6vw, 4.5rem);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.03em;
  color: var(--text-primary);
  display: inline-block;
  transition: color 0.3s ease;

  .dot {
    color: var(--accent-color);
    transition: display 0.3s ease;
  }

  &:hover {
    color: var(--text-primary);

    .dot {
      animation: blink 1s steps(2) infinite;
    }
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
`;

// 等宽注释式标语，呼应首屏 // 母题
const Tagline = styled.p`
  font-family: var(--font-mono);
  font-size: 0.875rem;
  line-height: 1.9;
  color: var(--text-tertiary);
  margin: 1.25rem 0 0;

  .comment {
    color: var(--accent-color);
  }

  .keyword {
    color: var(--text-secondary);
  }
`;

const HeroRight = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1.25rem;
  flex-shrink: 0;

  @media (max-width: 768px) {
    align-items: flex-start;
  }
`;

const SocialIcons = styled.div`
  display: flex;
  gap: 0.625rem;
`;

const SocialIcon = styled.a`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  background: rgba(var(--accent-rgb), 0.06);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    color: var(--accent-color);
    background: rgba(var(--accent-rgb), 0.14);
    border-color: rgba(var(--accent-rgb), 0.3);
    transform: translateY(-3px);
  }
`;

// === 第二层：一行流式链接 ===
const LinkStream = styled.nav`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0;
  margin-top: 3.5rem;
`;

const StreamLink = styled(Link)`
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-secondary);
  padding: 0.375rem 0.875rem;
  border-radius: 999px;
  transition: all 0.2s ease;

  &:hover {
    color: var(--accent-color);
    background: rgba(var(--accent-rgb), 0.08);
  }
`;

const StreamExternalLink = styled.a`
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-secondary);
  padding: 0.375rem 0.875rem;
  border-radius: 999px;
  transition: all 0.2s ease;

  &:hover {
    color: var(--accent-color);
    background: rgba(var(--accent-rgb), 0.08);
  }
`;

const StreamSeparator = styled.span`
  font-family: var(--font-mono);
  color: var(--accent-color);
  opacity: 0.45;
  user-select: none;
`;

// === 分割线：两端渐隐 ===
const FadingDivider = styled.div`
  height: 1px;
  margin: 2.25rem 0 1.5rem;
  background: linear-gradient(
    90deg,
    transparent,
    var(--border-color) 20%,
    var(--border-color) 80%,
    transparent
  );
`;

// === 第三层：底部信息行 ===
const BottomRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  font-size: 0.8125rem; /* 13px */
  color: var(--text-tertiary);

  @media (max-width: 768px) {
    flex-direction: column-reverse;
    align-items: flex-start;
    gap: 1.25rem;
  }
`;

const MetaList = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-wrap: wrap;

  .sep {
    color: var(--border-color);
  }

  a {
    color: var(--text-tertiary);
    transition: color 0.2s ease;

    &:hover {
      color: var(--text-secondary);
    }
  }
`;

const StatusInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1.25rem;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const OnlineStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: var(--text-secondary);
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #10b981;
    position: relative;

    &::after {
      content: '';
      position: absolute;
      inset: -2px;
      border-radius: 50%;
      border: 1px solid #10b981;
      opacity: 0.4;
    }
  }
`;

// 入场动画：滚动进入时错落浮现
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

// 数字时钟
const DigitalClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span style={{ fontFamily: 'var(--font-mono)' }}>
      {time.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' })}
      <span style={{ marginLeft: '0.5rem', opacity: 0.8 }}>
        {time.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'short' })}
      </span>
    </span>
  );
};

const Footer = () => {
  const { onlineCount } = useOnlineUsers();
  const { siteSettings, loading } = useSiteSettings();

  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const onlineUsersRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useClickOutside(tooltipRef, () => setIsTooltipVisible(false), {
    enabled: isTooltipVisible,
    excludeRefs: onlineUsersRef,
    excludeSelectors: ['[data-tooltip-container]'],
    useCapture: true,
    delay: 100,
  });

  if (loading) return null;

  const streamLinks: { label: string; href: string; external?: boolean }[] = [
    { label: '博客文章', href: '/blog' },
    { label: '生活手记', href: '/notes' },
    { label: '我的项目', href: '/projects' },
    { label: '关于我', href: '/about-me' },
    { label: '关于本站', href: '/about-site' },
    { label: '友情链接', href: '/friends' },
    { label: '留言板', href: '/guestbook' },
    { label: '网站地图', href: '/sitemap.xml', external: true },
    { label: 'RSS', href: '/rss.xml', external: true },
  ];

  return (
    <FooterContainer>
      <FooterContent>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
        >
          {/* 第一层：超大字标 + 社交图标 */}
          <HeroBlock>
            <motion.div variants={itemVariants}>
              <Wordmark to="/">
                Turn of The Page<span className="dot">.</span>
              </Wordmark>
              <Tagline>
                <span className="comment">{'// '}</span>
                <span className="keyword">用代码丈量世界</span>，以文字记录流年。
                <br />
                <span className="comment">{'// '}</span>
                <span className="keyword">保持热爱</span>，奔赴山海。
              </Tagline>
            </motion.div>

            <motion.div variants={itemVariants}>
              <HeroRight>
                <SocialIcons>
                  <SocialIcon href={siteSettings?.socialLinks?.github} target="_blank" title="GitHub">
                    <FiGithub size={17} />
                  </SocialIcon>
                  <SocialIcon href={`mailto:${siteSettings?.socialLinks?.email}`} title="Email">
                    <FiMail size={17} />
                  </SocialIcon>
                  <SocialIcon href="/rss.xml" title="RSS">
                    <FiRss size={17} />
                  </SocialIcon>
                </SocialIcons>
              </HeroRight>
            </motion.div>
          </HeroBlock>

          {/* 第二层：一行流式链接 */}
          <motion.div variants={itemVariants}>
            <LinkStream>
              {streamLinks.map((link, index) => (
                <Fragment key={link.href}>
                  {index > 0 && <StreamSeparator>/</StreamSeparator>}
                  {link.external ? (
                    <StreamExternalLink href={link.href} target="_blank">
                      {link.label}
                    </StreamExternalLink>
                  ) : (
                    <StreamLink to={link.href}>{link.label}</StreamLink>
                  )}
                </Fragment>
              ))}
            </LinkStream>
          </motion.div>

          {/* 两端渐隐分割线 */}
          <FadingDivider />

          {/* 第三层：底部信息行 */}
          <motion.div variants={itemVariants}>
            <BottomRow>
              <MetaList>
                <span>
                  &copy; {new Date().getFullYear()} {siteSettings?.authorName || 'Adnaan'}
                </span>
                <span className="sep">·</span>
                <a href="https://beian.miit.gov.cn" target="_blank" rel="noopener noreferrer">
                  陇ICP备2025016896号
                </a>
                <span className="sep">·</span>
                <span>Designed with code &amp; love</span>
              </MetaList>

              <StatusInfo>
                <DigitalClock />

                <div style={{ position: 'relative' }}>
                  <OnlineStatus
                    ref={onlineUsersRef}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTooltipVisible((prev) => !prev);
                    }}
                  >
                    <div className="dot" />
                    <span>{onlineCount} 在线</span>
                  </OnlineStatus>

                  <div ref={tooltipRef}>
                    <VisitorStatsTooltip
                      isVisible={isTooltipVisible}
                      targetRef={onlineUsersRef}
                      onlineCount={onlineCount}
                    />
                  </div>
                </div>
              </StatusInfo>
            </BottomRow>
          </motion.div>
        </motion.div>
      </FooterContent>
    </FooterContainer>
  );
};

export default Footer;
