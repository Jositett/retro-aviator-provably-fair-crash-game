import React, { useEffect, useRef } from 'react';
import { calculateMultiplier } from '@shared/game-logic';
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
    const draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      ctx.clearRect(0, 0, width, height);
      // Draw Grid
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.1)';
      ctx.lineWidth = 1;
      const gridSize = 50;
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      if (!isFlying && !isCrashed) return;
      // Draw Curve
      ctx.beginPath();
      ctx.strokeStyle = isCrashed ? '#ef4444' : '#f59e0b';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 15;
      ctx.shadowColor = isCrashed ? '#ef4444' : '#f59e0b';
      const points = 100;
      ctx.moveTo(0, height);
      for (let i = 0; i <= points; i++) {
        const t = (elapsedMs / points) * i;
        const m = calculateMultiplier(t);
        const x = (t / 15000) * width; 
        const y = height - ((m - 1) / 5) * height; 
        if (x <= width && y >= 0) {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Draw Plane
      const currentM = calculateMultiplier(elapsedMs);
      const planeX = (elapsedMs / 15000) * width;
      const planeY = height - ((currentM - 1) / 5) * height;
      if (planeX <= width && planeY >= 0) {
        ctx.fillStyle = isCrashed ? '#ef4444' : '#fff';
        ctx.beginPath();
        ctx.arc(planeX, planeY, 6, 0, Math.PI * 2);
        ctx.fill();
        if (!isCrashed) {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(planeX, planeY, 10, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    };
    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    window.addEventListener('resize', resize);
    resize();
    const animate = () => {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        draw(ctx, canvas.width, canvas.height);
      }
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('resize', resize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [elapsedMs, isCrashed, isFlying]);
  return (
    <div className="relative w-full h-full bg-[#09090b] rounded-lg border border-amber-500/20 overflow-hidden shadow-[inset_0_0_50px_rgba(245,158,11,0.1)]">
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="absolute inset-0 pointer-events-none scanlines opacity-30" />
      {isCrashed && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-950/20 backdrop-blur-[1px] animate-in fade-in duration-300">
          <span className="text-red-500 font-mono text-6xl font-black italic tracking-tighter uppercase drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse">
            CRASHED
          </span>
        </div>
      )}
    </div>
  );
}