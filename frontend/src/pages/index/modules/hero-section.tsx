import React, { useState, useRef, useEffect } from 'react';
import styled from '@emotion/styled';
import { Variants, motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import {
  FiGithub,
  FiMail,
  FiMapPin,
  FiLayers,
  FiActivity,
  FiArrowDown,
} from 'react-icons/fi';
import { useAnimationEngine, useSpringInteractions } from '@/utils/ui/animation';
import { LazyImage } from '@/components/common';
import { Icon } from '@/components/common/icon';
import { WaveText } from '@/components/common';
import { SiteSettings } from '@/types';
import { API } from '@/utils/api';

// ==================== Styled Components ====================

const Section = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;

  @media (max-width: 768px) {
    padding-bottom: 2rem;
    min-height: auto;
  }
`;

const HeroContainer = styled(motion.div)`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  height: calc(100vh - var(--header-height));
  max-width: var(--max-width); /* Limit width for better layout */
  margin: 0 auto; /* Center align */

  @media (max-width: 968px) {
    flex-direction: column;
    gap: 1rem;
    height: auto;
    min-height: calc(100vh - var(--header-height));
    justify-content: flex-start;
    padding-top: 2rem;
  }
`;

const HeroContent = styled(motion.div)`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  z-index: 2;

  @media (max-width: 968px) {
    order: 2;
    align-items: center;
    text-align: center;
  }
`;

// --- Right Side Visuals: Borderless Profile ---

const ProfileVisual = styled(motion.div)`
  position: relative;
  width: min(380px, 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.4rem;
  z-index: 2;

  @media (max-width: 968px) {
    width: 100%;
    max-width: 440px;
    order: 1;
    margin: 0 auto 2rem;
  }

  @media (max-width: 768px) {
    margin-top: 0.5rem;
  }
`;

const AvatarWrap = styled.div`
  position: relative;
  width: 176px;
  height: 176px;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    width: 140px;
    height: 140px;
  }
`;

const OnlineDot = styled.span`
  position: absolute;
  right: 10px;
  bottom: 10px;
  width: 16px;
  height: 16px;
  background: #27c93f;
  border-radius: 50%;
  border: 3px solid var(--bg-primary, #fff);
  z-index: 3;

  [data-theme='dark'] & {
    border-color: rgb(var(--bg-primary-rgb, 20, 20, 24));
  }
`;

const ProfileName = styled.h2`
  font-family: var(--font-heading);
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
  line-height: 1.2;
`;

const ProfileRole = styled.p`
  font-size: 0.95rem;
  color: var(--text-secondary);
  margin: 0;
  letter-spacing: 0.02em;
`;

const MetaLine = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 0.9rem;
  font-size: 0.82rem;
  color: var(--text-tertiary);
  font-weight: 500;

  svg {
    color: var(--accent-color);
    flex-shrink: 0;
    opacity: 0.85;
  }

  i {
    font-style: normal;
    opacity: 0.4;
  }
`;

const SkillLine = styled.div`
  font-family: var(--font-code);
  font-size: 0.8rem;
  color: var(--accent-color);
  margin-top: 0.9rem;
  letter-spacing: 0.02em;
  opacity: 0.9;
  max-width: 100%;
`;

const StatsRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2.2rem;
  margin-top: 1.6rem;
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;

  .label {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    font-weight: 500;
    letter-spacing: 0.08em;
  }

  .value {
    font-size: 1.35rem;
    font-weight: 800;
    color: var(--text-primary);
    font-family: var(--font-heading);
    line-height: 1.2;
  }
`;

const StatDivider = styled.div`
  width: 1px;
  height: 28px;
  background: var(--border-color, rgba(0, 0, 0, 0.08));

  [data-theme='dark'] & {
    background: rgba(255, 255, 255, 0.08);
  }
`;

const NewCardAvatar = styled.div`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  padding: 4px;
  background: conic-gradient(
    from 180deg,
    rgba(var(--accent-rgb), 0.55),
    rgba(var(--accent-rgb), 0.08) 45%,
    rgba(var(--accent-rgb), 0.55) 90%
  );
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;

  &::before {
    content: '';
    position: absolute;
    inset: 4px;
    border-radius: 50%;
    background: var(--bg-primary, #fff);
    z-index: 1;
  }

  img {
    position: relative;
    z-index: 2;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    border-radius: 50%;
  }

  [data-theme='dark'] & {
    background: conic-gradient(
      from 180deg,
      rgba(var(--accent-rgb), 0.7),
      rgba(var(--accent-rgb), 0.1) 45%,
      rgba(var(--accent-rgb), 0.7) 90%
    );
  }
`;

const CodeBadge = styled.div`
  position: absolute;
  top: -4px;
  left: -6px;
  background: var(--bg-primary, #fff);
  color: var(--accent-color);
  height: 34px;
  min-width: 34px;
  padding: 0 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 0.72rem;
  font-weight: 700;
  border-radius: 50%;
  border: 1px solid rgba(var(--accent-rgb), 0.35);
  z-index: 6;
  font-family: var(--font-code);

  @media (max-width: 768px) {
    top: -2px;
    left: -2px;
    width: 30px;
    height: 30px;
    font-size: 0.65rem;
  }

  [data-theme='dark'] & {
    background: rgb(30, 30, 35);
  }
`;


const DecorCircle = styled(motion.div)`
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, rgba(var(--accent-rgb), 0.2), transparent 70%);
  filter: blur(40px);
  opacity: 0.6;
  z-index: 0;
`;

// --------------------------------------

const Title = styled(motion.h1)`
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
  letter-spacing: -0.5px;
  line-height: 1.15;

  &:after {
    content: '';
    display: block;
    position: absolute;
    bottom: -5px;
    left: 0;
    width: 40px;
    height: 4px;
    background: var(--accent-color);
    border-radius: 2px;
    transform: translateY(20px);
    opacity: 0;

    @media (max-width: 768px) {
      left: 50%;
      transform: translateX(-50%) translateY(20px);
    }
  }

  .wave {
    display: inline-block;
    animation: wave 2.5s ease-in-out infinite;
    transform-origin: 70% 70%;
  }

  @keyframes wave {
    0% {
      transform: rotate(0deg);
    }
    10% {
      transform: rotate(14deg);
    }
    20% {
      transform: rotate(-8deg);
    }
    30% {
      transform: rotate(14deg);
    }
    40% {
      transform: rotate(-4deg);
    }
    50% {
      transform: rotate(10deg);
    }
    60% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(0deg);
    }
  }

  @media (max-width: 768px) {
    font-size: 2rem;
    justify-content: center;
    flex-wrap: wrap;
  }
`;

const Subtitle = styled(motion.h2)`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.8rem;
  line-height: 1.5;
  position: relative;

  code {
    font-family: var(--font-code);
    background: rgba(81, 131, 245, 0.08);
    padding: 0.2em 0.4em;
    border-radius: 4px;
    font-size: 0.85em;
    margin-left: 0.5em;
    border: 1px solid rgba(81, 131, 245, 0.1);
  }

  @media (max-width: 768px) {
    font-size: 1.3rem;
  }
`;

const Description = styled(motion.p)`
  font-size: 1.3rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 1.5rem;
  max-width: 90%;

  @media (max-width: 768px) {
    max-width: 100%;
  }
`;

// 胶囊标签：无图标、细描边，中间用一个小色点作为视觉锚点
const SkillTags = styled(motion.div)`
  margin-top: 0.75rem;
  margin-bottom: 0.5rem;
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    justify-content: center;
  }

  span {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 5px 14px;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 500;
    letter-spacing: 0.02em;
    color: var(--text-secondary);
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    transition:
      color 0.25s ease,
      border-color 0.25s ease,
      background-color 0.25s ease;

    &::before {
      content: '';
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--accent-color);
      opacity: 0.75;
      flex-shrink: 0;
    }

    &:hover {
      color: var(--accent-color);
      border-color: rgba(var(--accent-rgb), 0.4);
      background: rgba(var(--accent-rgb), 0.06);
    }
  }
`;

const SocialLinks = styled(motion.div)`
  display: flex;
  gap: 0.85rem;
  margin-top: 5rem;
  position: relative;

  &:before {
    content: '';
    position: absolute;
    top: -1rem;
    left: 0;
    width: 3rem;
    height: 1px;
    background: var(--border-color);

    @media (max-width: 768px) {
      left: 50%;
      transform: translateX(-50%);
    }
  }

  @media (max-width: 768px) {
    justify-content: center;
    margin-top: 3rem;
  }
`;

const SocialLink = styled(motion.a)`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    color: var(--accent-color);
    background-color: rgba(81, 131, 245, 0.06);
    box-shadow: inset 0 0 0 1px rgba(81, 131, 245, 0.1);
    transform: translateY(-2px);
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const QuoteContainer = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding: 1rem 2rem;
  margin-bottom: 1rem;
  position: relative;
  cursor: pointer;

  @media (max-width: 768px) {
    order: 3; /* Ensure it's at the bottom */
    flex-direction: column;
    gap: 0.8rem;
    justify-content: center;
    align-items: center;
    padding: 1rem;
    margin-bottom: 1rem;
    width: 100%;
  }
`;

const AudioVisualizer = styled.div`
  display: flex;
  align-items: center;
  gap: 3px;
  height: 24px;

  span {
    width: 3px;
    background: var(--accent-color);
    border-radius: 2px;
    display: block;
    animation: visualize 1s ease-in-out infinite;
  }

  span:nth-of-type(1) {
    height: 12px;
    animation-duration: 0.8s;
  }
  span:nth-of-type(2) {
    height: 20px;
    animation-duration: 1.1s;
  }
  span:nth-of-type(3) {
    height: 16px;
    animation-duration: 0.9s;
  }
  span:nth-of-type(4) {
    height: 8px;
    animation-duration: 1.2s;
  }

  @keyframes visualize {
    0%,
    100% {
      transform: scaleY(1);
      opacity: 0.8;
    }
    50% {
      transform: scaleY(0.5);
      opacity: 0.4;
    }
  }
`;

const QuoteContent = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;

  @media (max-width: 768px) {
    align-items: center;
    text-align: center;
    width: 100%;
    align-items: center !important;
  }
`;

const QuoteText = styled.p`
  font-size: 1.1rem;
  color: var(--text-primary);
  font-weight: 500;
  margin: 0;
  line-height: 1.4;

  /* Typewriter effect cursor */
  &::after {
    content: '|';
    margin-left: 4px;
    color: var(--accent-color);
    animation: blink 1s step-end infinite;
  }

  @keyframes blink {
    50% {
      opacity: 0;
    }
  }

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const QuoteAuthor = styled.span`
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-style: italic;
  opacity: 0.8;
  display: flex;
  align-items: center;
  gap: 6px;

  &::before {
    content: '';
    width: 20px;
    height: 1px;
    background: var(--border-color);
  }
`;

const MagneticScroll = styled(motion.div)`
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  z-index: 10;

  .magnetic-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 0.8rem 1.2rem;
    border-radius: 2rem;
    border: 1px solid var(--border-color);
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
  }

  [data-theme='dark'] & .magnetic-content {
    background: rgba(0, 0, 0, 0.2);
  }

  &:hover .magnetic-content {
    border-color: var(--accent-color);
    background: rgba(var(--accent-rgb), 0.1);
    transform: translateY(-2px);
  }

  span {
    font-size: 0.75rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text-secondary);
    font-weight: 500;
  }

  svg {
    color: var(--text-secondary);
    width: 20px;
    height: 20px;
  }

  &:hover span,
  &:hover svg {
    color: var(--accent-color);
  }
`;

const AnimatedChar = styled(motion.span)`
  display: inline-block;
`;

const mouseScrollVariants: Variants = {
  initial: { opacity: 0.5, y: 0 },
  animate: {
    opacity: [0.5, 1, 0.5],
    y: [0, 5, 0],
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

const scrollWheelVariants: Variants = {
  initial: { opacity: 0.5, scaleY: 1 },
  animate: {
    opacity: [0.5, 1, 0.5],
    scaleY: [1, 0.7, 1],
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: [0.4, 0, 0.2, 1],
      delay: 0.2,
    },
  },
};

// ==================== Component ====================

interface HeroSectionProps {
  siteSettings?: SiteSettings | null;
  loading?: boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ siteSettings }) => {
  const { variants, springPresets } = useAnimationEngine();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 968);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // --- Animation Variants for Shuffle Effect ---
  // Defined inside component to access isMobile


  // 3D Tilt Effect Logic removed for static card

  const socialInteractions = useSpringInteractions({
    hoverScale: 1.1,
    hoverY: -3,
    tapScale: 0.95,
    stiffness: 260,
    damping: 12,
  });

  // 按行显示控制
  const [showLine1, setShowLine1] = useState(true);
  const [showLine2, setShowLine2] = useState(false);
  const [showLine3, setShowLine3] = useState(false);
  const [showLine4, setShowLine4] = useState(false);
  const [showRest, setShowRest] = useState(false);

  // 真实统计数据
  const [articleCount, setArticleCount] = useState<number | null>(null);
  const [projectCount, setProjectCount] = useState<number | null>(null);
  const [noteCount, setNoteCount] = useState<number | null>(null);

  useEffect(() => {
    API.article.getArticles({ page: 1, limit: 1 })
      .then(res => {
        const total = res?.meta?.pagination?.total;
        if (total !== undefined) setArticleCount(total);
      })
      .catch(() => {});

    API.project.getProjectStats()
      .then(res => {
        const total = res?.data?.total;
        if (total !== undefined) setProjectCount(total);
      })
      .catch(() => {});

    API.note.getNotes({ page: 1, limit: 1 })
      .then(res => {
        const total = res?.meta?.pagination?.total;
        if (total !== undefined) setNoteCount(total);
      })
      .catch(() => {});
  }, []);
  // Quote Logic
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [currentQuote, setCurrentQuote] = useState({
    text: siteSettings?.quote || '每一行代码都有诗意，每一个像素都有故事',
    author: siteSettings?.quoteAuthor || 'adnaan',
  });

  // Update quote when siteSettings loads (if it wasn't available initially)
  useEffect(() => {
    if (siteSettings?.quote) {
      setCurrentQuote({
        text: siteSettings.quote,
        author: siteSettings.quoteAuthor || 'Unknown',
      });
    }
  }, [siteSettings?.quote, siteSettings?.quoteAuthor]);

  const fetchHitokoto = async () => {
    if (isLoadingQuote) return;
    setIsLoadingQuote(true);
    try {
      // c=d: 文学, c=i: 诗词, c=k: 哲学
      const res = await fetch('https://v1.hitokoto.cn?c=d&c=i&c=k');
      const data = await res.json();
      setCurrentQuote({
        text: data.hitokoto,
        author: data.from_who || data.from || 'Hitokoto',
      });
    } catch (error) {
      console.error('Hitokoto fetch failed', error);
      // Fallback to random local quote
      setCurrentQuote({
        text: '每一行代码都有诗意，每一个像素都有故事',
        author: 'Adnaan',
      });
    } finally {
      setIsLoadingQuote(false);
    }
  };

  const handleQuoteClick = () => {
    fetchHitokoto();
  };

  // Scroll Hint Logic
  const [scrollHintIndex, setScrollHintIndex] = useState(0);
  const scrollHints = ['探索更多', '向下滑动', '更多精彩', '继续阅读', '发现惊喜', '深入了解'];

  useEffect(() => {
    const interval = setInterval(() => {
      setScrollHintIndex((prev) => (prev + 1) % scrollHints.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Section>
      <HeroContainer>
        <HeroContent>
          {/* Category Tag */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--accent-color)',
              background: 'rgba(81, 131, 245, 0.08)',
              border: '1px solid rgba(81, 131, 245, 0.12)',
              padding: '3px 10px',
              borderRadius: '20px',
              letterSpacing: '0.5px',
              width: 'fit-content',
            }}
          >
            // 代码 · 设计 · 创意
          </motion.div>

          <Title>
            {/* Line 1: 欢迎踏入代码与创意交织的 */}
            <motion.span
              variants={variants.waveContainer}
              initial="hidden"
              animate={showLine1 ? 'visible' : 'hidden'}
              style={{ display: 'block' }}
              onAnimationComplete={(definition: any) => {
                if (definition === 'visible' && showLine1) {
                  setShowLine2(true);
                }
              }}
            >
              {'欢迎踏入代码与创意交织的'.split('').map((char, index) => (
                <AnimatedChar key={index} variants={variants.waveChar}>
                  {char}
                </AnimatedChar>
              ))}
            </motion.span>
            {/* Line 2: 奇幻宇宙 + emoji */}
            <motion.span
              initial={{ opacity: 0 }}
              animate={showLine1 ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--accent-color)',
              }}
            >
              {'奇幻宇宙'.split('').map((char, index) => (
                <AnimatedChar key={`highlight-${index}`} variants={variants.waveChar}>
                  {char}
                </AnimatedChar>
              ))}
              <motion.span
                className="wave"
                initial={{ opacity: 0, scale: 0 }}
                animate={showLine1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
                transition={{ delay: 0.5, ...springPresets.snappy }}
                style={{ display: 'inline-block', fontSize: '0.8em' }}
              >
                🌌
              </motion.span>
            </motion.span>
          </Title>

          {/* 第2行 */}
          <Subtitle initial={{ opacity: 0 }} animate={showLine2 ? { opacity: 1 } : { opacity: 0 }}>
            <motion.span
              variants={variants.waveContainer}
              initial="hidden"
              animate={showLine2 ? 'visible' : 'hidden'}
              style={{ display: 'inline-block' }}
              onAnimationComplete={(definition: any) => {
                if (definition === 'visible' && showLine2) {
                  setShowLine3(true);
                }
              }}
            >
              {'在代码与设计的交界，创造数字诗篇'.split('').map((char, index) => (
                <AnimatedChar
                  key={index}
                  variants={variants.waveChar}
                  style={{
                    background: 'linear-gradient(90deg, rgb(var(--gradient-from)), rgb(var(--gradient-to)))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {char}
                </AnimatedChar>
              ))}
              <AnimatedChar variants={variants.waveChar}> </AnimatedChar>
              <motion.code
                variants={variants.waveChar}
                style={{
                  display: 'inline-block',
                  color: 'var(--accent-color)',
                  fontFamily: 'var(--font-code)',
                  background: 'rgba(81, 131, 245, 0.08)',
                  padding: '0.2em 0.4em',
                  borderRadius: '4px',
                  fontSize: '0.85em',
                  marginLeft: '0.5em',
                  border: '1px solid rgba(81, 131, 245, 0.1)',
                }}
              >
                @adnaan
              </motion.code>
            </motion.span>
          </Subtitle>

          {/* 第3行 */}
          <Description initial={{ opacity: 0 }} animate={showLine3 ? { opacity: 1 } : { opacity: 0 }}>
            <motion.span
              variants={variants.waveContainer}
              initial="hidden"
              animate={showLine3 ? 'visible' : 'hidden'}
              style={{ display: 'inline' }}
              onAnimationComplete={(definition: any) => {
                if (definition === 'visible' && showLine3) {
                  setShowLine4(true);
                }
              }}
            >
              {'我是'.split('').map((char, i) => (
                <AnimatedChar key={i} variants={variants.waveChar}>
                  {char}
                </AnimatedChar>
              ))}{' '}
              <strong style={{ color: 'var(--accent-color)' }}>
                {'全栈工程师'.split('').map((char, i) => (
                  <AnimatedChar key={`s1-${i}`} variants={variants.waveChar}>
                    {char}
                  </AnimatedChar>
                ))}
              </strong>
              {'与'.split('').map((char, i) => (
                <AnimatedChar key={`and-${i}`} variants={variants.waveChar}>
                  {char}
                </AnimatedChar>
              ))}{' '}
              <strong style={{ color: 'var(--accent-color)' }}>
                {'UI/UX爱好者'.split('').map((char, i) => (
                  <AnimatedChar key={`s2-${i}`} variants={variants.waveChar}>
                    {char}
                  </AnimatedChar>
                ))}
              </strong>
              {'，专注于构建美观且高性能的Web体验。'.split('').map((char, i) => (
                <AnimatedChar key={`end-${i}`} variants={variants.waveChar}>
                  {char}
                </AnimatedChar>
              ))}
            </motion.span>
            <br />
            {/* 第4行 */}
            <motion.span
              initial={{ opacity: 0 }}
              animate={showLine4 ? { opacity: 1 } : { opacity: 0 }}
              style={{
                fontSize: '0.9em',
                opacity: 0.9,
                display: 'inline-block',
                position: 'relative',
                paddingBottom: '0.25rem',
              }}
            >
              <WaveText show={showLine4} onComplete={() => setShowRest(true)}>
                「每一行代码都有诗意，每一个像素都有故事」
              </WaveText>
              <motion.span
                animate={showLine4 ? { opacity: 0.3, scaleX: 1 } : { opacity: 0, scaleX: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: '100%',
                  height: '2px',
                  background: 'linear-gradient(90deg, var(--accent-color), transparent)',
                  transformOrigin: 'left',
                }}
              />
            </motion.span>
          </Description>

          <SkillTags initial="hidden" animate={showRest ? 'visible' : 'hidden'} variants={variants.stagger}>
            <motion.span variants={variants.listItem}>开发者</motion.span>
            <motion.span variants={variants.listItem}>设计爱好者</motion.span>
            <motion.span variants={variants.listItem}>终身学习者</motion.span>
          </SkillTags>

          <SocialLinks
            initial={{ opacity: 0, y: 10 }}
            animate={showRest ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ ...springPresets.gentle, delay: 0.2 }}
          >
            <SocialLink
              href={siteSettings?.socialLinks?.email ? `mailto:${siteSettings.socialLinks.email}` : undefined}
              aria-label="Email"
              initial={{ opacity: 1, scale: 1 }}
              {...socialInteractions}
            >
              <FiMail />
            </SocialLink>
            <SocialLink
              href={siteSettings?.socialLinks?.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              initial={{ opacity: 1, scale: 1 }}
              {...socialInteractions}
            >
              <FiGithub />
            </SocialLink>
            <SocialLink
              href={siteSettings?.socialLinks?.bilibili}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Bilibili"
              initial={{ opacity: 1, scale: 1 }}
              {...socialInteractions}
              style={{
                background: 'linear-gradient(135deg, rgba(var(--gradient-from), 0.08), rgba(var(--gradient-to), 0.08))',
              }}
            >
              <Icon name="bilibili" size={18} />
            </SocialLink>
            <SocialLink
              href={siteSettings?.socialLinks?.twitter}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter"
              initial={{ opacity: 1, scale: 1 }}
              {...socialInteractions}
            >
              <Icon name="telegram" size={18} />
            </SocialLink>
            <SocialLink
              href={siteSettings?.socialLinks?.rss}
              aria-label="RSS Feed"
              initial={{ opacity: 1, scale: 1 }}
              {...socialInteractions}
            >
              <Icon name="rss" size={18} />
            </SocialLink>
          </SocialLinks>
        </HeroContent>

        {/* Right Column: Borderless Profile */}
        <ProfileVisual
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'backOut', delay: 0.2 }}
        >
          {/* Layer 0: Decorative Background */}
          <DecorCircle
            style={{
              width: 420,
              height: 420,
              top: '3.5rem',
              left: '50%',
              marginLeft: -210,
            }}
          />

          <AvatarWrap>
            <NewCardAvatar>
              <img
                src={
                  siteSettings?.avatar ||
                  'https://foruda.gitee.com/avatar/1745582574310382271/5352827_adnaan_1745582574.png!avatar100'
                }
                alt={siteSettings?.authorName || 'Avatar'}
              />
            </NewCardAvatar>
            <CodeBadge>{'</>'}</CodeBadge>
            <OnlineDot aria-label="在线" />
          </AvatarWrap>

          <ProfileName>{siteSettings?.authorName || 'adnaan'}</ProfileName>
          <ProfileRole>{siteSettings?.authorTitle || '全栈开发者 · 创造者 · 学习者'}</ProfileRole>

          <MetaLine>
            <FiMapPin size={13} />
            <span>{siteSettings?.location || '上海, 中国'}</span>
            <i>·</i>
            <FiActivity size={13} />
            <span>{siteSettings?.mbti || 'INFJ-T'}</span>
            <i>·</i>
            <FiLayers size={13} />
            <span>{siteSettings?.occupation?.split(' ')[0] || '全栈开发者'}</span>
          </MetaLine>

          <SkillLine>
            {(siteSettings?.skills?.length ? siteSettings.skills : ['Vue', 'React', 'Node.js', 'Python', 'Java', 'Electron'])
              .slice(0, 6)
              .join(' / ')}
          </SkillLine>

          <StatsRow>
            <StatItem>
              <div className="value">{articleCount !== null ? `${articleCount}+` : '…'}</div>
              <div className="label">文章</div>
            </StatItem>
            <StatDivider />
            <StatItem>
              <div className="value">{projectCount !== null ? `${projectCount}+` : '…'}</div>
              <div className="label">项目</div>
            </StatItem>
            <StatDivider />
            <StatItem>
              <div className="value">{noteCount !== null ? `${noteCount}+` : '…'}</div>
              <div className="label">手记</div>
            </StatItem>
          </StatsRow>
        </ProfileVisual>

        {/* Quote Footer - Full Width, Bottom Aligned */}
        <QuoteContainer
          onClick={handleQuoteClick}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
          whileHover={{ scale: 1.01 }}
          style={{
            position: isMobile ? 'relative' : 'absolute',
            bottom: isMobile ? 'auto' : 0,
            left: isMobile ? 'auto' : 0,
            width: '100%',
            padding: isMobile ? '2rem 0 1rem 0' : '1.5rem 0',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: isMobile ? '1rem' : '3rem',
            marginTop: isMobile ? '2rem' : 0, // Add space on mobile
            cursor: isLoadingQuote ? 'wait' : 'pointer', // Show wait cursor when loading
          }}
        >
          {/* Left: Audio Visualizer & Quote */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '1rem' : '1.5rem',
              flexDirection: isMobile ? 'column' : 'row', // Stack on mobile
              width: isMobile ? '100%' : 'auto',
            }}
          >
            <AudioVisualizer style={{ opacity: isLoadingQuote ? 0.5 : 1 }}>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </AudioVisualizer>

            <div
              style={{
                position: 'relative',
                height: '1.5em',
                minWidth: isMobile ? '100%' : '300px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AnimatePresence mode="wait">
                <QuoteContent
                  key={currentQuote.text}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: isLoadingQuote ? 0.5 : 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    width: '100%',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      height: '100%',
                      flexDirection: isMobile ? 'column' : 'row',
                      textAlign: 'center',
                    }}
                  >
                    <QuoteText style={{ fontSize: '0.95rem', lineHeight: 1.4 }}>
                      {isLoadingQuote ? '获取灵感中...' : currentQuote.text}
                    </QuoteText>
                    {!isLoadingQuote && (
                      <QuoteAuthor style={{ lineHeight: 1.4, fontSize: '0.8rem' }}>{currentQuote.author}</QuoteAuthor>
                    )}
                  </div>
                </QuoteContent>
              </AnimatePresence>
            </div>
          </div>

          {/* Right: Scroll Hint (Desktop & Mobile) */}
          <motion.div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: 0.6,
              cursor: 'pointer',
              // Mobile styles
              marginTop: isMobile ? '0.5rem' : '0',
            }}
            animate={{ y: [0, 3, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            {!isMobile && (
              <div
                style={{ width: '1px', height: '16px', background: 'var(--border-color)', marginRight: '1rem' }}
              ></div>
            )}
            <span style={{ fontSize: '0.85rem', letterSpacing: '1px', fontWeight: 500 }}>
              {scrollHints[scrollHintIndex]}
            </span>
            <FiArrowDown size={16} />
          </motion.div>
        </QuoteContainer>
      </HeroContainer>
    </Section>
  );
};
