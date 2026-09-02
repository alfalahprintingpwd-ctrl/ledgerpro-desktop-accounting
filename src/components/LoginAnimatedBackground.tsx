import React, { useEffect, useRef } from 'react';

interface LoginAnimatedBackgroundProps {
  isFadingOut?: boolean;
}

export const LoginAnimatedBackground: React.FC<LoginAnimatedBackgroundProps> = ({
  isFadingOut = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let isReducedMotion = mediaQuery.matches;

    const handleMotionChange = (e: MediaQueryListEvent) => {
      isReducedMotion = e.matches;
    };
    mediaQuery.addEventListener?.('change', handleMotionChange);

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initNodes();
    };

    window.addEventListener('resize', handleResize);

    // Financial Data Nodes & Floating Particles
    interface Node {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      alpha: number;
      pulseSpeed: number;
      pulseOffset: number;
    }

    let nodes: Node[] = [];
    const nodeCount = Math.min(Math.floor((width * height) / 28000), 32);

    const initNodes = () => {
      nodes = [];
      for (let i = 0; i < nodeCount; i++) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          radius: Math.random() * 2 + 1.2,
          alpha: Math.random() * 0.4 + 0.2,
          pulseSpeed: 0.001 + Math.random() * 0.002,
          pulseOffset: Math.random() * Math.PI * 2,
        });
      }
    };

    initNodes();

    let time = 0;

    // Main Draw Function
    const render = () => {
      time += 0.008; // Smooth 15-20 second cycle pace

      ctx.clearRect(0, 0, width, height);

      // 1. Deep Financial Dark Gradient Base
      const bgGradient = ctx.createLinearGradient(0, 0, width, height);
      bgGradient.addColorStop(0, '#090d16'); // Deep Navy
      bgGradient.addColorStop(0.5, '#0e1726'); // Slate Indigo
      bgGradient.addColorStop(1, '#070a12'); // Rich Obsidian
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // 2. Soft Ambient Radial Glows
      const glow1X = width * 0.2 + Math.sin(time * 0.5) * 80;
      const glow1Y = height * 0.3 + Math.cos(time * 0.4) * 60;
      const radGlow1 = ctx.createRadialGradient(glow1X, glow1Y, 0, glow1X, glow1Y, width * 0.45);
      radGlow1.addColorStop(0, 'rgba(37, 99, 235, 0.12)'); // Sapphire Blue
      radGlow1.addColorStop(1, 'rgba(37, 99, 235, 0)');
      ctx.fillStyle = radGlow1;
      ctx.fillRect(0, 0, width, height);

      const glow2X = width * 0.8 - Math.cos(time * 0.6) * 90;
      const glow2Y = height * 0.7 - Math.sin(time * 0.5) * 70;
      const radGlow2 = ctx.createRadialGradient(glow2X, glow2Y, 0, glow2X, glow2Y, width * 0.4);
      radGlow2.addColorStop(0, 'rgba(16, 185, 129, 0.08)'); // Emerald Accent
      radGlow2.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.fillStyle = radGlow2;
      ctx.fillRect(0, 0, width, height);

      // 3. Subtle Ledger Grid Lines (Accounting Grid)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
      ctx.lineWidth = 1;
      const gridSize = 60;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 4. Financial Chart Waves (Sine & Bezier Curves)
      const drawFinancialWave = (
        amplitude: number,
        frequency: number,
        speedMultiplier: number,
        yOffsetFraction: number,
        color: string,
        lineWidth: number
      ) => {
        ctx.beginPath();
        const baseOffset = height * yOffsetFraction;
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = color;

        for (let x = 0; x <= width; x += 10) {
          const wave1 = Math.sin(x * frequency + time * speedMultiplier) * amplitude;
          const wave2 = Math.cos(x * (frequency * 0.5) + time * (speedMultiplier * 0.7)) * (amplitude * 0.5);
          const y = baseOffset + wave1 + wave2;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      };

      // Wave 1: Primary Blue Financial Growth Trend
      drawFinancialWave(35, 0.003, 1.2, 0.55, 'rgba(59, 130, 246, 0.15)', 2);

      // Wave 2: Secondary Soft Emerald Balance Wave
      drawFinancialWave(25, 0.004, -0.9, 0.62, 'rgba(16, 185, 129, 0.12)', 1.5);

      // Wave 3: Top Ambient Indigo Curve
      drawFinancialWave(45, 0.002, 0.8, 0.35, 'rgba(99, 102, 241, 0.08)', 1.5);

      // 5. Data Mesh Nodes & Connections
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        if (!isReducedMotion) {
          node.x += node.vx;
          node.y += node.vy;

          if (node.x < 0 || node.x > width) node.vx *= -1;
          if (node.y < 0 || node.y > height) node.vy *= -1;
        }

        const currentPulse = Math.sin(time * 2 + node.pulseOffset) * 0.2 + 0.8;
        const currentAlpha = node.alpha * currentPulse;

        // Draw Node
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(147, 197, 253, ${currentAlpha})`;
        ctx.fill();

        // Connect nearby nodes with delicate lines
        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j];
          const dx = other.x - node.x;
          const dy = other.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 160;

          if (dist < maxDist) {
            const lineAlpha = (1 - dist / maxDist) * 0.08;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(147, 197, 253, ${lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      if (!isReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    // Handle Tab Visibility Changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId);
      } else if (!isReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial trigger
    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMotionChange);
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-0 w-full h-full transition-all duration-700 ease-out animate-fade-in ${
        isFadingOut ? 'opacity-0 scale-105 filter blur-xs' : 'opacity-100 scale-100'
      }`}
      aria-hidden="true"
    />
  );
};
