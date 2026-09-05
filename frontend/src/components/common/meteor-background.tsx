import React, { useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import { useTheme } from '@/hooks/useTheme';

const Canvas = styled.canvas`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: -1;
  background: transparent;
  opacity: 0.6;
`;

// 低饱和度星光色：以白色为主，少量淡蓝/暖白点缀
const STAR_COLORS = ['#f8f7ff', '#cad7ff', '#aabfff', '#fff4ea'];

interface Star {
  x: number;
  y: number;
  radius: number;
  color: string;
  phase: number; // 呼吸相位
  speed: number; // 呼吸速度
  baseAlpha: number;
}

const MeteorBackground: React.FC = () => {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const animationFrameRef = useRef<number>(0);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    if (theme !== 'dark') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const initStars = () => {
      const stars: Star[] = [];
      const width = window.innerWidth;
      const height = window.innerHeight;
      const count = Math.floor((width * height) / 9000); // 约 180~250 颗，随屏幕面积伸缩
      const capped = Math.min(count, 260);

      for (let i = 0; i < capped; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 0.9 + 0.3,
          color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
          phase: Math.random() * Math.PI * 2,
          speed: 0.4 + Math.random() * 0.6, // 缓慢呼吸
          baseAlpha: 0.25 + Math.random() * 0.4,
        });
      }
      starsRef.current = stars;
    };

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initStars();
    };

    const animate = () => {
      if (!canvas || !ctx) return;

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      const mouse = mouseRef.current;
      const threshold = 120; // 轻柔的避让范围
      const thresholdSq = threshold * threshold;

      starsRef.current.forEach((star) => {
        // 缓慢正弦呼吸
        star.phase += 0.008 * star.speed;
        const alpha = star.baseAlpha * (0.55 + 0.45 * Math.sin(star.phase));

        let x = star.x;
        let y = star.y;

        // 鼠标经过时轻柔避让
        const dx = x - mouse.x;
        const dy = y - mouse.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < thresholdSq) {
          const dist = Math.sqrt(distSq);
          const force = (threshold - dist) / threshold;
          const power = force * force * 40;
          if (dist > 0) {
            x += (dx / dist) * power;
            y += (dy / dist) * power;
          }
        }

        ctx.globalAlpha = alpha;
        ctx.fillStyle = star.color;
        ctx.beginPath();
        ctx.arc(x, y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    resizeCanvas();
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [theme]);

  if (theme !== 'dark') return null;

  return <Canvas ref={canvasRef} />;
};

export default React.memo(MeteorBackground);
