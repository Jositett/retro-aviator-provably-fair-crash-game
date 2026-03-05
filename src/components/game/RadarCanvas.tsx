import React, { useEffect, useRef, useState } from 'react';
import { calculateMultiplier } from '@shared/game-logic';
interface RadarCanvasProps {
  elapsedMs: number;
  isCrashed: boolean;
  isFlying: boolean;
}
const ROCKET_SVG = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQ4IDMyQzQ4IDI0IDI0IDggMTYgOEMxNiA4IDggMTYgOCAyNEM4IDMyIDIzLjM2IDUzLjM2IDI0IDYwQzI0LjY0IDUzLjM2IDQwIDMyIDQ4IDMyWiIgZmlsbD0id2hpdGUiIHN0cm9rZT0iI2Y1OWUwYiIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxwYXRoIGQ9Ik0xNiA4QzE2IDE2IDI0IDI0IDMyIDI0IiBzdHJva2U9IiNmNTllMGIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik04IDI0QzE2IDI0IDI0IDMyIDI0IDQwIiBzdHJva2U9IiNmNTllMGIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxyZWN0IHg9IjE0IiB5PSIzOCIgd2lkdGg9IjQiIGhlaWdodD0iOCIgZmlsbD0iI2Y1OWUwYiIvPgo8L3N2Zz4=`;
export function RadarCanvas({ elapsedMs, isCrashed, isFlying }: RadarCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();
  const [rocketImg, setRocketImg] = useState<HTMLImageElement | null>(null);
  const starsRef = useRef<{ x: number, y: number, size: number, speed: number }[]>([]);
  // Use a ref for props to avoid expensive re-renders/effect resets 60 times per second
  const propsRef = useRef({ elapsedMs, isCrashed, isFlying });
  useEffect(() => {
    propsRef.current = { elapsedMs, isCrashed, isFlying };
  }, [elapsedMs, isCrashed, isFlying]);
  useEffect(() => {
    const img = new Image();
    img.src = ROCKET_SVG;
    img.onload = () => setRocketImg(img);
    starsRef.current = Array.from({ length: 150 }, () => ({
      x: Math.random() * 2000,
      y: Math.random() * 2000,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 0.5 + 0.1
    }));
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let explosionFrame = 0;
    const resize = () => {
      const { clientWidth, clientHeight } = container;
      if (clientWidth === 0 || clientHeight === 0) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = clientWidth * dpr;
      canvas.height = clientHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    const draw = (width: number, height: number) => {
      if (width === 0 || height === 0) return;
      const { elapsedMs: eMs, isCrashed: crashed, isFlying: flying } = propsRef.current;
      ctx.clearRect(0, 0, width, height);
      const currentM = calculateMultiplier(eMs);
      const velocity = Math.log(currentM + 1) * 2;
      // Stars Parallax
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      starsRef.current.forEach(star => {
        star.x -= star.speed * velocity;
        star.y += star.speed * velocity * 0.2;
        if (star.x < 0) star.x = width;
        if (star.y > height) star.y = 0;
        ctx.fillRect(star.x, star.y, star.size, star.size);
      });
      // Retro Grid Lines
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.05)';
      ctx.lineWidth = 1;
      const gridSize = 60;
      const xOffset = (eMs * 0.05) % gridSize;
      const yOffset = (eMs * 0.01) % gridSize;
      for (let x = -xOffset; x <= width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = -yOffset; y <= height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }
      if (!flying && !crashed) return;
      const maxVisibleMultiplier = Math.max(2.5, currentM * 1.5);
      const timeScale = Math.max(10000, eMs * 1.3);
      const safeMultiplierScale = maxVisibleMultiplier - 1 || 1;
      // Draw Flight Path
      ctx.beginPath();
      ctx.strokeStyle = crashed ? 'rgba(239, 68, 68, 0.6)' : '#f59e0b';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.moveTo(0, height);
      const steps = 60;
      for (let i = 1; i <= steps; i++) {
        const t = (eMs / steps) * i;
        const m = calculateMultiplier(t);
        const px = (t / timeScale) * width;
        const py = height - ((m - 1) / safeMultiplierScale) * height;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
      // Plane Position
      const planeX = (eMs / timeScale) * width;
      const planeY = height - ((currentM - 1) / safeMultiplierScale) * height;
      if (rocketImg) {
        ctx.save();
        ctx.translate(planeX, planeY);
        ctx.rotate(Math.PI / 8); 
        ctx.drawImage(rocketImg, -16, -16, 32, 32);
        ctx.restore();
      }
      if (crashed) {
        ctx.beginPath();
        ctx.arc(planeX, planeY, (explosionFrame % 60) * 1.5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(239, 68, 68, ${1 - (explosionFrame % 60) / 60})`;
        ctx.stroke();
        explosionFrame++;
      } else {
        explosionFrame = 0;
      }
    };
    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(container);
    resize();
    const animate = () => {
      const dpr = window.devicePixelRatio || 1;
      draw(canvas.width / dpr, canvas.height / dpr);
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      resizeObserver.disconnect();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [rocketImg]); // Only restart when rocket image is ready; keep rest in propsRef
  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#030303] rounded-xl border border-amber-500/10 overflow-hidden shadow-inner">
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="absolute inset-0 pointer-events-none scanlines opacity-30" />
    </div>
  );
}