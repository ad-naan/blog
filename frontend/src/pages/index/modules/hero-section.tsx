import React, { useState, useRef, useEffect } from 'react';
import styled from '@emotion/styled';
import { Variants, motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import {
  FiCode,
  FiGithub,
  FiMail,
  FiMapPin,
  FiTwitter,
  FiCpu,
  FiLayers,
  FiActivity,
  FiTerminal,
  FiHash,
  FiArrowDown,
} from 'react-icons/fi';
import { useAnimationEngine, useSpringInteractions } from '@/utils/ui/animation';
import { LazyImage } from '@/components/common';
import { Icon } from '@/components/common/icon';
import { WaveText } from '@/components/common';
import { SiteSettings } from '@/types';

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
    justify-content: center;
  }
`;

const HeroContent = styled(motion.div)`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  z-index: 2;

  @media (max-width: 968px) {
    display: none; /* Hide on mobile as requested */
  }
`;

// --- New Right Side Visuals: Layered Card Stack ---

const CardStackContainer = styled(motion.div)`
  position: relative;
  width: 420px;
  max-width: 100%;
  height: 520px;
  perspective: 1000px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  overflow: hidden;

  @media (max-width: 968px) {
    width: 100%;
    height: 400px; /* Slightly increased for visibility */
    order: 1;
    margin-bottom: 2rem; /* More space between card and footer */
    transform: scale(0.95);
  }

  @media (max-width: 768px) {
    height: 340px;
    transform: scale(0.85);
    margin-top: 0.5rem;
  }
`;


const CodeWindow = styled(motion.div)`
  position: absolute;
  width: 340px;
  height: 220px;
  background: #1e1e1e;
  border-radius: 12px;
  top: 0;
  right: 0;
  box-shadow:
    0 20px 50px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.05);
  padding: 1.5rem;
  font-family: 'Fira Code', monospace;
  overflow: hidden;
  z-index: 1;
  transform-origin: center center;

  /* Window Controls */
  &::before {
    content: '';
    position: absolute;
    top: 16px;
    left: 16px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #ff5f56;
    box-shadow:
      20px 0 0 #ffbd2e,
      40px 0 0 #27c93f;
  }

  @media (max-width: 768px) {
    left: 50%;
    right: auto;
    margin-left: -170px;
    top: 0; /* Move to top */
  }

  [data-theme='light'] & {
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.05);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
  }
`;

const CodeContent = styled.div`
  margin-top: 1.5rem;
  font-size: 0.75rem;
  line-height: 1.6;
  color: #a9b7c6;

  [data-theme='light'] & {
    color: #5c6c7f;
  }

  .k {
    color: #cc7832;
  } /* keyword */
  .s {
    color: #6a8759;
  } /* string */
  .f {
    color: #ffc66d;
  } /* function */
  .c {
    color: #808080;
  } /* comment */

  [data-theme='light'] & {
    .k {
      color: #d73a49;
    }
    .s {
      color: #032f62;
    }
    .f {
      color: #6f42c1;
    }
    .c {
      color: #6a737d;
    }
  }
`;

const ProfileGlassCard = styled(motion.div)`
  position: absolute;
  width: 300px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow:
    0 20px 40px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(255, 255, 255, 0.4),
    inset 0 0 0 1px rgba(255, 255, 255, 0.2);
  z-index: 2;
  top: 20%;
  left: 5%;

  @media (max-width: 768px) {
    left: 50%;
    margin-left: -150px;
    top: 20%; /* Adjusted for new height */
  }

  [data-theme='dark'] & {
    background: rgba(30, 30, 35, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  }
`;

const CardAvatar = styled.div`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  margin-bottom: 1.5rem;
  position: relative;
  padding: 4px;
  background: var(--bg-primary);
  box-shadow: 0 10px 25px rgba(var(--accent-rgb), 0.2);

  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }

  /* Status Dot */
  &::after {
    content: '';
    position: absolute;
    bottom: 5px;
    right: 5px;
    width: 16px;
    height: 16px;
    background: #27c93f;
    border: 3px solid var(--bg-primary);
    border-radius: 50%;
  }
`;

const InfoGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  width: 100%;
  margin-bottom: 1.5rem;
`;

const InfoRow = styled.div`
  display: flex;
  gap: 0.8rem;
  width: 100%;
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.8rem;
  background: rgba(var(--accent-rgb), 0.05);
  border-radius: 12px;
  font-size: 0.75rem;
  color: var(--text-primary);
  font-weight: 500;
  flex: 1;
  justify-content: center;

  svg {
    color: var(--accent-color);
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }

  span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const SkillPillsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  width: 100%;
  padding-top: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  justify-content: center;

  [data-theme='dark'] & {
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }
`;

const SkillPill = styled.span`
  font-size: 0.7rem;
  padding: 4px 10px;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-weight: 500;
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(var(--accent-rgb), 0.05);
    color: var(--accent-color);
    border-color: var(--accent-color);
    transform: translateY(-1px);
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
  font-size: 2.4rem;
  font-weight: 800;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 10px;
  letter-spacing: -0.5px;
  line-height: 1.1;

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
  margin-bottom: 1.2rem;
  line-height: 1.3;
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
  font-size: 1.1rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 1.5rem;
  max-width: 90%;

  @media (max-width: 768px) {
    max-width: 100%;
  }
`;

const SkillTags = styled(motion.div)`
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
  display: flex;
  gap: 0.8rem;
  opacity: 0.85;

  @media (max-width: 768px) {
    justify-content: center;
    flex-wrap: wrap;
  }

  span {
    display: flex;
    align-items: center;
    gap: 4px;
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
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // --- Animation Variants for Shuffle Effect ---
  // Defined inside component to access isMobile
  const frontCardVariants: Variants = {
    normal: {
      scale: 1,
      opacity: 1,
      filter: 'blur(0px)',
      zIndex: 2,
      y: 0,
      transition: {
        duration: 0.5,
        ease: 'circOut',
      },
    },
    flipped: {
      scale: isMobile ? 0.9 : 0.85,
      opacity: 0.4,
      filter: 'blur(3px)',
      zIndex: 1,
      y: isMobile ? -76 : -30, // Move up more on mobile to swap with window
      transition: { duration: 0.5, ease: 'easeInOut' },
    },
  };

  const backWindowVariants: Variants = {
    normal: {
      scale: isMobile ? 1.08 : 0.92,
      opacity: 0.8,
      filter: 'blur(0.5px)',
      zIndex: 1,
      y: 0,
      x: 0,
      transition: { duration: 0.5, ease: 'easeInOut' },
    },
    flipped: {
      scale: 1.1,
      opacity: 1,
      filter: 'blur(0px)',
      zIndex: 2,
      y: isMobile ? 76 : 20, // Move down more on mobile to swap with card
      x: isMobile ? 0 : -20, // No horizontal shift on mobile
      transition: {
        duration: 0.5,
        ease: 'circOut',
      },
    },
  };

  // 3D Tilt Effect Logic
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseX = useSpring(x, { stiffness: 150, damping: 15 });
  const mouseY = useSpring(y, { stiffness: 150, damping: 15 });

  const rotateX = useTransform(mouseY, [-0.5, 0.5], [10, -10]); // Slightly more tilt
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-10, 10]);

  // Parallax for layers
  const codeWindowX = useTransform(mouseX, [-0.5, 0.5], [-10, 10]);
  const codeWindowY = useTransform(mouseY, [-0.5, 0.5], [10, -10]);

  const cardX = useTransform(mouseX, [-0.5, 0.5], [15, -15]); // Moves opposite/more for depth
  const cardY = useTransform(mouseY, [-0.5, 0.5], [-15, 15]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseXVal = e.clientX - rect.left;
    const mouseYVal = e.clientY - rect.top;
    const xPct = mouseXVal / width - 0.5;
    const yPct = mouseYVal / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

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
  const [isFlipped, setIsFlipped] = useState(false);

  const handleCardFlip = () => {
    setIsFlipped(!isFlipped);
  };

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
          {/* 第1行 */}
          <Title>
            <motion.span
              variants={variants.waveContainer}
              initial="hidden"
              animate={showLine1 ? 'visible' : 'hidden'}
              style={{ display: 'inline-block' }}
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
              ))}{' '}
              <span style={{ color: 'var(--accent-color)' }}>
                {'奇幻宇宙'.split('').map((char, index) => (
                  <AnimatedChar key={`highlight-${index}`} variants={variants.waveChar}>
                    {char}
                  </AnimatedChar>
                ))}
              </span>
            </motion.span>
            <motion.span
              className="wave"
              initial={{ opacity: 0, scale: 0 }}
              animate={showLine1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
              transition={{ delay: showLine1 ? 0.5 : 0, ...springPresets.snappy }}
              style={{
                display: 'inline-block',
                fontSize: '0.8em',
              }}
            >
              🌌
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
            <motion.span variants={variants.listItem}>
              <FiCode size={14} /> 开发者
            </motion.span>
            <motion.span variants={variants.listItem}>
              <Icon name="helpCircle" size={14} /> 设计爱好者
            </motion.span>
            <motion.span variants={variants.listItem}>
              <Icon name="share" size={14} /> 终身学习者
            </motion.span>
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

        {/* Right Column: Layered Card Stack */}
        <CardStackContainer
          ref={containerRef}
          onMouseMove={!isMobile ? handleMouseMove : undefined}
          onMouseLeave={handleMouseLeave}
          onClick={handleCardFlip}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'backOut', delay: 0.2 }}
        >
          <motion.div
            style={{
              rotateX: isMobile ? 0 : rotateX,
              rotateY: isMobile ? 0 : rotateY,
              transformStyle: 'preserve-3d',
              width: '100%',
              height: '100%',
              position: 'relative',
            }}
          >
            {/* Layer 0: Decorative Background */}
            <DecorCircle
              style={{
                width: 400,
                height: 400,
                top: '50%',
                left: '50%',
                x: '-50%',
                y: '-50%',
              }}
              animate={{
                scale: isFlipped ? [1.1, 1.2, 1.1] : [1, 1.1, 1],
                opacity: [0.4, 0.6, 0.4],
                filter: isFlipped ? 'blur(50px) hue-rotate(90deg)' : 'blur(40px) hue-rotate(0deg)',
              }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Layer 1: Code Window (Background -> Foreground) */}
            <CodeWindow
              style={{ x: isMobile ? 0 : codeWindowX, y: isMobile ? 0 : codeWindowY }}
              variants={backWindowVariants}
              initial="normal"
              animate={isFlipped ? 'flipped' : 'normal'}
            >
              <CodeContent>
                <span className="k">const</span> <span className="f">Developer</span> = {'{'}
                <br />
                &nbsp;&nbsp;<span className="k">name</span>:{' '}
                <span className="s">"{siteSettings?.authorName || 'Adnaan'}"</span>,
                <br />
                &nbsp;&nbsp;<span className="k">skills</span>: [<span className="s">"React"</span>,{' '}
                <span className="s">"Node"</span>, <span className="s">"Design"</span>],
                <br />
                &nbsp;&nbsp;<span className="k">status</span>:{' '}
                <span className="s">"{isFlipped ? 'Ready to Code' : 'Sleeping'}"</span>,
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={isFlipped ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  &nbsp;&nbsp;<span className="c">// Click to toggle view</span>
                  <br />
                  &nbsp;&nbsp;<span className="f">contact</span>: () ={'>'} <span className="s">"Hire Me!"</span>,
                  <br />
                  &nbsp;&nbsp;<span className="k">location</span>:{' '}
                  <span className="s">"{siteSettings?.location || 'Digital World'}"</span>
                </motion.div>
                <br />
                {'}'};
              </CodeContent>
            </CodeWindow>

            {/* Layer 2: Glass Profile Card (Foreground -> Background) */}
            <ProfileGlassCard
              style={{ x: isMobile ? 0 : cardX, y: isMobile ? 0 : cardY }}
              variants={frontCardVariants}
              initial="normal"
              animate={isFlipped ? 'flipped' : 'normal'}
            >
              <CardAvatar>
                <LazyImage
                  src={
                    siteSettings?.avatar ||
                    'https://foruda.gitee.com/avatar/1745582574310382271/5352827_adnaan_1745582574.png!avatar100'
                  }
                  alt={siteSettings?.authorName || '头像'}
                />
              </CardAvatar>

              <InfoGrid>
                <InfoRow>
                  {siteSettings?.location && (
                    <InfoItem>
                      <FiMapPin /> <span>{siteSettings.location}</span>
                    </InfoItem>
                  )}
                  {siteSettings?.mbti && (
                    <InfoItem>
                      <FiActivity /> <span>{siteSettings.mbti}</span>
                    </InfoItem>
                  )}
                </InfoRow>
                {siteSettings?.occupation && (
                  <InfoItem style={{ width: '100%' }}>
                    <FiLayers /> <span>{siteSettings.occupation.split(' ')[0]}</span>
                  </InfoItem>
                )}
              </InfoGrid>

              {siteSettings?.skills && siteSettings.skills.length > 0 && (
                <SkillPillsContainer>
                  {siteSettings.skills.slice(0, 6).map((skill, index) => (
                    <SkillPill key={index}>{skill}</SkillPill>
                  ))}
                </SkillPillsContainer>
              )}
            </ProfileGlassCard>
          </motion.div>
        </CardStackContainer>

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
