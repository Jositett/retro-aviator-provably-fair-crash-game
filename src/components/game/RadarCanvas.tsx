import React, { useEffect, useRef } from 'react';
import { calculateMultiplier } from '@shared/game-logic';
import { cn } from '@/lib/utils';
interface RadarCanvasProps {
  elapsedMs: number;
  isCrashed: boolean;
  isFlying: boolean;
}
export function RadarCanvas({ elapsedMs, isCrashed, isFlying }: RadarCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const drawRocket = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, isCrashed: boolean) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      // Rocket body
      ctx.fillStyle = isCrashed ? '#ef4444' : '#ffffff';
      ctx.shadowBlur = 15;
      ctx.shadowColor = isCrashed ? '#ef4444' : '#f59e0b';
      ctx.beginPath();
      // Body (pointing right)
      ctx.moveTo(12, 0); // Nose
      ctx.lineTo(-4, -5); // Top fin corner
      ctx.lineTo(-8, -8); // Top fin tip
      ctx.lineTo(-6, -3); // Body joint
      ctx.lineTo(-8, 0);  // Back center
      ctx.lineTo(-6, 3);  // Body joint
      ctx.lineTo(-8, 8);  // Bottom fin tip
      ctx.lineTo(-4, 5);  // Bottom fin corner
      ctx.closePath();
      ctx.fill();
      // Exhaust flame
      if (!isCrashed && isFlying) {
        ctx.shadowBlur = 10;
        ctx.fillStyle = Math.random() > 0.5 ? '#f59e0b' : '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(-14 - Math.random() * 6, -2);
        ctx.lineTo(-10, 0);
        ctx.lineTo(-14 - Math.random() * 6, 2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    };
    const drawExplosion = (ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) => {
      const radius = (frame % 60) * 2;
      const opacity = 1 - (frame % 60) / 60;
      ctx.strokeStyle = `rgba(239, 68, 68, ${opacity})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
      // Particles
      for (let i = 0; i < 8; i++) {
        const pAngle = (i * Math.PI * 2) / 8;
        const pDist = radius * 1.2;
        ctx.fillStyle = `rgba(245, 158, 11, ${opacity})`;
        ctx.fillRect(x + Math.cos(pAngle) * pDist, y + Math.sin(pAngle) * pDist, 3, 3);
      }
    };
    let explosionFrame = 0;
    const draw = (width: number, height: number) => {
      ctx.clearRect(0, 0, width, height);
      // Draw Grid
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.05)';
      ctx.lineWidth = 1;
      const gridSize = 60;
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }
      if (!isFlying && !isCrashed) return;
      // Draw Path Curve
      ctx.beginPath();
      ctx.strokeStyle = isCrashed ? 'rgba(239, 68, 68, 0.4)' : '#f59e0b';
      ctx.lineWidth = 3;
      ctx.shadowBlur = isCrashed ? 0 : 10;
      ctx.shadowColor = '#f59e0b';
      const points = 60;
      ctx.moveTo(0, height);
      for (let i = 0; i <= points; i++) {
        const t = (elapsedMs / points) * i;
        const m = calculateMultiplier(t);
        const px = (t / 15000) * width;
        const py = height - ((m - 1) / 5) * height;
        if (px <= width && py >= 0) ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Calculate current position and angle
      const currentM = calculateMultiplier(elapsedMs);
      const prevM = calculateMultiplier(elapsedMs - 16);
      const planeX = (elapsedMs / 15000) * width;
      const planeY = height - ((currentM - 1) / 5) * height;
      const prevX = ((elapsedMs - 16) / 15000) * width;
      const prevY = height - ((prevM - 1) / 5) * height;
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
      draw(canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('resize', resize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [elapsedMs, isCrashed, isFlying]);
  return (
    <div className="relative w-full h-full bg-[#050505] rounded-xl border border-amber-500/10 overflow-hidden shadow-[inset_0_0_80px_rgba(0,0,0,0.8)]">
      <div className="absolute inset-0 retro-grid opacity-20" />
      <canvas ref={canvasRef} className="w-full h-full block relative z-10" />
      <div className="absolute inset-0 pointer-events-none scanlines opacity-40 z-20" />
      {isCrashed && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-950/10 backdrop-blur-[2px] z-30 transition-all duration-700">
          <div className="glitch-active">
            <span className="text-red-500 font-mono text-5xl md:text-7xl font-black italic tracking-tighter uppercase drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]">
              CRASHED
            </span>
          </div>
        </div>
      )}
    </div>
  );
}