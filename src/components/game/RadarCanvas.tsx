import React, { useEffect, useRef, useState } from 'react';
import { calculateMultiplier } from '@shared/game-logic';
import { cn } from '@/lib/utils';
interface RadarCanvasProps {
  elapsedMs: number;
  isCrashed: boolean;
  isFlying: boolean;
}
// Neon Rocket SVG as a data URI for reliability
const ROCKET_SVG = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQ4IDMyQzQ4IDI0IDI0IDggMTYgOEMxNiA4IDggMTYgOCAyNEM4IDMyIDIzLjM2IDUzLjM2IDI0IDYwQzI0LjY0IDUzLjM2IDQwIDMyIDQ4IDMyWiIgZmlsbD0id2hpdGUiIHN0cm9rZT0iI2Y1OWUwYiIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxwYXRoIGQ9Ik0xNiA4QzE2IDE2IDI0IDI0IDMyIDI0IiBzdHJva2U9IiNmNTllMGIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik04IDI0QzE2IDI0IDI0IDMyIDI0IDQwIiBzdHJva2U9IiNmNTllMGIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxyZWN0IHg9IjE0IiB5PSIzOCIgd2lkdGg9IjQiIGhlaWdodD0iOCIgZmlsbD0iI2Y1OWUwYiIvPgo8L3N2Zz4=`;
export function RadarCanvas({ elapsedMs, isCrashed, isFlying }: RadarCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const [rocketImg, setRocketImg] = useState<HTMLImageElement | null>(null);
  const starsRef = useRef<{ x: number, y: number, size: number, speed: number }[]>([]);
  // Pre-load assets and generate background
  useEffect(() => {
    const img = new Image();
    img.src = ROCKET_SVG;
    img.onload = () => setRocketImg(img);
    const stars = Array.from({ length: 100 }, () => ({
      x: Math.random() * 2000,
      y: Math.random() * 2000,
      size: Math.random() * 2,
      speed: Math.random() * 0.5 + 0.1
    }));
    starsRef.current = stars;
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const drawRocket = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, isCrashed: boolean) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 4); // Adjust for SVG orientation
      if (rocketImg) {
        ctx.shadowBlur = isCrashed ? 20 : 15;
        ctx.shadowColor = isCrashed ? '#ef4444' : '#f59e0b';
        ctx.drawImage(rocketImg, -16, -16, 32, 32);
      }
      if (!isCrashed && isFlying) {
        // Exhaust flames
        ctx.fillStyle = Math.random() > 0.5 ? '#f59e0b' : '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(-4, 16);
        ctx.lineTo(0, 24 + Math.random() * 10);
        ctx.lineTo(4, 16);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    };
    const drawExplosion = (ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) => {
      const radius = (frame % 60) * 2.5;
      const opacity = 1 - (frame % 60) / 60;
      ctx.strokeStyle = `rgba(239, 68, 68, ${opacity})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 12; i++) {
        const pAngle = (i * Math.PI * 2) / 12 + frame * 0.05;
        const pDist = radius * 1.3;
        ctx.fillStyle = `rgba(245, 158, 11, ${opacity})`;
        ctx.beginPath();
        ctx.arc(x + Math.cos(pAngle) * pDist, y + Math.sin(pAngle) * pDist, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    let explosionFrame = 0;
    const draw = (width: number, height: number) => {
      ctx.clearRect(0, 0, width, height);
      const currentM = calculateMultiplier(elapsedMs);
      const velocity = Math.log(currentM + 1) * 2;
      // Draw Parallax Stars
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      starsRef.current.forEach(star => {
        star.x -= star.speed * velocity;
        star.y += star.speed * velocity * 0.5;
        if (star.x < 0) star.x = width;
        if (star.y > height) star.y = 0;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
      // Draw Grid
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 80;
      const offset = (elapsedMs * 0.05) % gridSize;
      for (let x = -offset; x <= width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = offset; y <= height + offset; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, height - y); ctx.lineTo(width, height - y); ctx.stroke();
      }
      if (!isFlying && !isCrashed) return;
      // Viewport scaling with 20% padding
      const maxVisibleMultiplier = Math.max(2.5, currentM * 1.6);
      const timeScale = Math.max(8000, elapsedMs * 1.3);
      // Draw Path Curve - High Resolution (150 points) with smoothing
      ctx.beginPath();
      ctx.strokeStyle = isCrashed ? 'rgba(239, 68, 68, 0.5)' : '#f59e0b';
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowBlur = isCrashed ? 0 : 15;
      ctx.shadowColor = '#f59e0b';
      const pointsCount = 150;
      ctx.moveTo(0, height);
      for (let i = 1; i <= pointsCount; i++) {
        const t = (elapsedMs / pointsCount) * i;
        const m = calculateMultiplier(t);
        const px = (t / timeScale) * width;
        const py = height - ((m - 1) / (maxVisibleMultiplier - 1)) * height;
        // Use quadratic curve for sub-pixel smoothing between segments
        if (i < pointsCount) {
          const nextT = (elapsedMs / pointsCount) * (i + 1);
          const nextM = calculateMultiplier(nextT);
          const npx = (nextT / timeScale) * width;
          const npy = height - ((nextM - 1) / (maxVisibleMultiplier - 1)) * height;
          ctx.quadraticCurveTo(px, py, (px + npx) / 2, (py + npy) / 2);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Rocket Position & Rotation
      const planeX = (elapsedMs / timeScale) * width;
      const planeY = height - ((currentM - 1) / (maxVisibleMultiplier - 1)) * height;
      const prevM = calculateMultiplier(elapsedMs - 16);
      const prevX = ((elapsedMs - 16) / timeScale) * width;
      const prevY = height - ((prevM - 1) / (maxVisibleMultiplier - 1)) * height;
      const angle = Math.atan2(planeY - prevY, planeX - prevX);
      if (isCrashed) {
        drawExplosion(ctx, planeX, planeY, explosionFrame++);
        drawRocket(ctx, planeX, planeY, angle, true);
      } else {
        explosionFrame = 0;
        drawRocket(ctx, planeX, planeY, angle, false);
      }
    };
    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = parent.clientWidth * dpr;
        canvas.height = parent.clientHeight * dpr;
        ctx.scale(dpr, dpr);
      }
    };
    window.addEventListener('resize', resize);
    resize();
    const animate = () => {
      const dpr = window.devicePixelRatio || 1;
      draw(canvas.width / dpr, canvas.height / dpr);
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('resize', resize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [elapsedMs, isCrashed, isFlying, rocketImg]);
  return (
    <div className="relative w-full h-full bg-[#030303] rounded-xl border border-amber-500/20 overflow-hidden shadow-[inset_0_0_100px_rgba(0,0,0,0.9)]">
      <div className="absolute inset-0 retro-grid opacity-10" />
      <canvas ref={canvasRef} className="w-full h-full block relative z-10" />
      <div className="absolute inset-0 pointer-events-none scanlines opacity-30 z-20" />
      {isCrashed && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-950/20 backdrop-blur-[1px] z-30 animate-in fade-in duration-500">
          <div className="glitch-active">
            <span className="text-red-500 font-mono text-6xl md:text-8xl font-black italic tracking-tighter uppercase drop-shadow-[0_0_30px_rgba(239,68,68,1)]">
              LOST SIGNAL
            </span>
          </div>
        </div>
      )}
    </div>
  );
}