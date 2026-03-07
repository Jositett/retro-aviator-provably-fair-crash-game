import React, { useEffect, useRef, useState, useMemo } from 'react';
import { calculateMultiplier } from '@shared/game-logic';
import { usePlaneStore, PLANES, type PlaneType } from '@/hooks/use-plane-selection';

interface RadarCanvasProps {
  elapsedMs: number;
  isCrashed: boolean;
  isFlying: boolean;
  crashPoint?: number;
}

export function RadarCanvas({ elapsedMs, isCrashed, isFlying, crashPoint }: RadarCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();
  const [rocketImg, setRocketImg] = useState<HTMLImageElement | null>(null);
  const starsRef = useRef<{ x: number, y: number, size: number, speed: number }[]>([]);
  const flamePhaseRef = useRef(0);
  const selectedPlane = usePlaneStore((state) => state.selectedPlane);
  const lastTimeRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);
  const flameGradientsRef = useRef<{ outer: CanvasGradient | null, inner: CanvasGradient | null }>({ outer: null, inner: null });
  const lastDrawTimeRef = useRef<number>(0);
  const wasCrashedRef = useRef(false);
  const crashAnchorRef = useRef<{ x: number; y: number } | null>(null);
  const meteorDirectionRef = useRef<{ x: number; y: number }>({ x: 0.8, y: -0.6 });
  
  const propsRef = useRef({ elapsedMs, isCrashed, isFlying, crashPoint });
  useEffect(() => {
    propsRef.current = { elapsedMs, isCrashed, isFlying, crashPoint };
  }, [elapsedMs, isCrashed, isFlying, crashPoint]);
  
  useEffect(() => {
    const plane = PLANES.find((p) => p.id === selectedPlane) || PLANES[0];
    const img = new Image();
    img.src = plane.svg;
    if (img.complete) {
      setRocketImg(img);
    } else {
      img.onload = () => setRocketImg(img);
      img.onerror = () => {
        const fallback = new Image();
        fallback.src = PLANES[0].svg;
        setRocketImg(fallback);
      };
    }
    starsRef.current = Array.from({ length: 110 }, () => ({
      x: Math.random() * 2000,
      y: Math.random() * 2000,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 0.5 + 0.1
    }));
  }, [selectedPlane]);

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
      // Reset transform before applying DPR scale to avoid cumulative scaling.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawFlame = (x: number, y: number, intensity: number, time: number, angle: number) => {
      const flameLength = 15 + intensity * 20 + Math.sin(time * 0.5) * 5;
      const flameWidth = 6 + intensity * 4;
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      
      // Create or reuse cached gradients
      if (!flameGradientsRef.current.outer) {
        const gradient = ctx.createLinearGradient(0, 16, 0, 16 + 35);
        gradient.addColorStop(0, 'rgba(255, 200, 50, 0.9)');
        gradient.addColorStop(0.3, 'rgba(255, 150, 0, 0.8)');
        gradient.addColorStop(0.6, 'rgba(255, 80, 0, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
        flameGradientsRef.current.outer = gradient;
      }
      
      if (!flameGradientsRef.current.inner) {
        const innerGradient = ctx.createLinearGradient(0, 16, 0, 16 + 21);
        innerGradient.addColorStop(0, 'rgba(255, 255, 200, 0.9)');
        innerGradient.addColorStop(0.5, 'rgba(255, 200, 100, 0.6)');
        innerGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
        flameGradientsRef.current.inner = innerGradient;
      }
      
      ctx.beginPath();
      ctx.moveTo(-flameWidth / 2, 16);
      
      const wobble1 = Math.sin(time * 2) * 3;
      const wobble2 = Math.sin(time * 3 + 1) * 2;
      
      ctx.quadraticCurveTo(
        -flameWidth / 2 + wobble1, 16 + flameLength * 0.5,
        0, 16 + flameLength
      );
      ctx.quadraticCurveTo(
        flameWidth / 2 + wobble2, 16 + flameLength * 0.5,
        flameWidth / 2, 16
      );
      ctx.closePath();
      ctx.fillStyle = flameGradientsRef.current.outer!;
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(-flameWidth / 4, 16);
      ctx.quadraticCurveTo(
        -flameWidth / 4, 16 + flameLength * 0.4,
        0, 16 + flameLength * 0.5
      );
      ctx.quadraticCurveTo(
        flameWidth / 4, 16 + flameLength * 0.4,
        flameWidth / 4, 16
      );
      ctx.closePath();
      ctx.fillStyle = flameGradientsRef.current.inner!;
      ctx.fill();
      
      ctx.restore();
    };

    const draw = (width: number, height: number, timestamp: number) => {
      if (width === 0 || height === 0) return;
      
      // Throttle to 30fps for better performance (33ms frame time)
      if (timestamp - lastDrawTimeRef.current < 33) return;
      lastDrawTimeRef.current = timestamp;
      
      const { elapsedMs: eMs, isCrashed: crashed, isFlying: flying, crashPoint: crashPointProp } = propsRef.current;
      const safeElapsedMs = Number.isFinite(eMs) && eMs > 0 ? eMs : 0;
      const safeCrashPoint = Number.isFinite(crashPointProp) && (crashPointProp ?? 0) > 1
        ? Number(crashPointProp)
        : null;

      const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
      const drawSafeArc = (x: number, y: number, radius: number): boolean => {
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(radius) || radius <= 0) {
          return false;
        }
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        return true;
      };

      flamePhaseRef.current += 0.1;

      ctx.clearRect(0, 0, width, height);
      const currentM = calculateMultiplier(safeElapsedMs);
      if (!Number.isFinite(currentM)) return;
      const velocity = Math.log(currentM + 1) * 2;
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      starsRef.current.forEach(star => {
        star.x -= star.speed * velocity;
        star.y += star.speed * velocity * 0.2;
        if (star.x < 0) star.x = width;
        if (star.y > height) star.y = 0;
        ctx.fillRect(star.x, star.y, star.size, star.size);
      });
      
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.05)';
      ctx.lineWidth = 1;
      const gridSize = 60;
      const xOffset = (safeElapsedMs * 0.05) % gridSize;
      const yOffset = (safeElapsedMs * 0.01) % gridSize;
      for (let x = -xOffset; x <= width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = -yOffset; y <= height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }
      
      if (!flying && !crashed) {
        // Still render background during PREPARING phase for visual continuity
        return;
      }
      const renderMultiplier = crashed && safeCrashPoint ? safeCrashPoint : currentM;
      const maxVisibleMultiplier = Math.max(2.5, renderMultiplier * 1.5);
      const timeScale = Math.max(10000, safeElapsedMs * 1.3);
      const safeMultiplierScale = maxVisibleMultiplier - 1 || 1;
      
      ctx.beginPath();
      ctx.strokeStyle = crashed ? 'rgba(239, 68, 68, 0.6)' : '#f59e0b';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.moveTo(0, height);
      const steps = 60;
      for (let i = 1; i <= steps; i++) {
        const t = (safeElapsedMs / steps) * i;
        const m = calculateMultiplier(t);
        const px = (t / timeScale) * width;
        const py = height - ((m - 1) / safeMultiplierScale) * height;
        if (Number.isFinite(px) && Number.isFinite(py)) {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
      
      const planeX = clamp((safeElapsedMs / timeScale) * width, 0, width);
      const planeY = clamp(height - ((renderMultiplier - 1) / safeMultiplierScale) * height, 0, height);
      const rocketAngle = Math.PI / 6;

      if (crashed && !wasCrashedRef.current) {
        explosionFrame = 0;
        crashAnchorRef.current = { x: planeX, y: planeY };
        const seed = safeCrashPoint ?? currentM;
        const angle = ((seed * 97.13) % 1) * Math.PI * 2;
        meteorDirectionRef.current = { x: Math.cos(angle), y: Math.sin(angle) };
      }
      if (!crashed) {
        crashAnchorRef.current = null;
      }
      wasCrashedRef.current = crashed;

      const impactX = crashAnchorRef.current?.x ?? planeX;
      const impactY = crashAnchorRef.current?.y ?? planeY;
      
      if (flying && !crashed) {
        drawFlame(planeX, planeY, Math.min(1, (currentM - 1) / 10), flamePhaseRef.current, rocketAngle);
      }
      
      if (rocketImg && (!crashed || explosionFrame < 18)) {
        ctx.save();
        ctx.translate(impactX, impactY);
        ctx.rotate(rocketAngle);
        ctx.drawImage(rocketImg, -16, -16, 32, 32);
        ctx.restore();
      }
      
      if (crashed) {
        const meteorLeadFrames = 18;
        // Draw loop is throttled to ~30fps, so 120 frames is roughly 4 seconds.
        const explosionDuration = 120;
        const displayExplosion = explosionFrame < explosionDuration;
        
        if (displayExplosion) {
          const decayIntensity = Math.max(0, 1 - explosionFrame / explosionDuration);
          const shakeX = (Math.random() - 0.5) * 30 * decayIntensity;
          const shakeY = (Math.random() - 0.5) * 30 * decayIntensity;
          const isMeteorLeadIn = explosionFrame < meteorLeadFrames;

          // Meteor lead-in first, then impact effects.
          if (isMeteorLeadIn) {
            const meteorTravel = 1 - explosionFrame / meteorLeadFrames;
            const meteorDistance = 260 * meteorTravel;
            const meteorX = impactX - meteorDirectionRef.current.x * meteorDistance;
            const meteorY = impactY - meteorDirectionRef.current.y * meteorDistance;
            const meteorSize = Math.max(4, 16 - explosionFrame * 0.4);
            const trailLength = Math.max(20, 110 * meteorTravel);

            ctx.save();
            ctx.strokeStyle = `rgba(255, 180, 60, ${Math.max(0.2, 1 - explosionFrame / meteorLeadFrames)})`;
            ctx.lineWidth = Math.max(2, meteorSize * 0.35);
            ctx.beginPath();
            ctx.moveTo(meteorX, meteorY);
            ctx.lineTo(
              meteorX - meteorDirectionRef.current.x * trailLength,
              meteorY - meteorDirectionRef.current.y * trailLength
            );
            ctx.stroke();

            if (drawSafeArc(meteorX, meteorY, meteorSize)) {
              const meteorGradient = ctx.createRadialGradient(meteorX, meteorY, 0, meteorX, meteorY, meteorSize);
              meteorGradient.addColorStop(0, 'rgba(255, 240, 180, 1)');
              meteorGradient.addColorStop(0.4, 'rgba(255, 160, 40, 0.95)');
              meteorGradient.addColorStop(1, 'rgba(255, 80, 0, 0.15)');
              ctx.fillStyle = meteorGradient;
              ctx.fill();
            }
            ctx.restore();
          }

          if (!isMeteorLeadIn) {
            ctx.save();
            ctx.translate(shakeX, shakeY);
            
            // Particles
            for (let i = 0; i < 36; i++) {
              const angle = (i / 36) * Math.PI * 2 + explosionFrame * 0.2;
              const dist = (explosionFrame % 100) * 2.2 + Math.random() * 30;
              const ex = impactX + Math.cos(angle) * dist;
              const ey = impactY + Math.sin(angle) * dist;
              const size = 3 + Math.random() * 8 * decayIntensity;
              
              if (drawSafeArc(ex, ey, size)) {
                const alpha = decayIntensity * (1 - (explosionFrame % 100) / 100);
                const red = 255;
                const green = Math.floor(50 + Math.random() * 180 * decayIntensity);
                ctx.fillStyle = `rgba(${red}, ${green}, 0, ${alpha})`;
                ctx.fill();
              }
            }

            // Expanding ring
            const ringRadius = Math.max(0, (explosionFrame % 100) * 4.2);
            if (drawSafeArc(impactX, impactY, ringRadius)) {
              const gradient = ctx.createRadialGradient(impactX, impactY, 0, impactX, impactY, ringRadius);
              gradient.addColorStop(0, `rgba(255, 220, 100, ${1 * decayIntensity})`);
              gradient.addColorStop(0.4, `rgba(255, 150, 0, ${0.8 * decayIntensity})`);
              gradient.addColorStop(0.7, `rgba(255, 50, 0, ${0.4 * decayIntensity})`);
              gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
              ctx.fillStyle = gradient;
              ctx.fill();
            }

            // Shock waves
            for (let w = 0; w < 2; w++) {
              const waveTime = Math.max(0, explosionFrame - meteorLeadFrames - w * 20);
              const waveRadius = Math.max(0, (waveTime % 80) * 2.3);
              const waveAlpha = Math.max(0, 1 - (waveTime / 80));
              if (waveAlpha > 0 && drawSafeArc(impactX, impactY, waveRadius)) {
                ctx.strokeStyle = `rgba(255, 150, 0, ${waveAlpha * decayIntensity})`;
                ctx.lineWidth = 4;
                ctx.stroke();
              }
            }

            ctx.restore();
          }

          explosionFrame++;
        } else {
          // Keep explosionFrame at max to prevent re-incrementing
          explosionFrame = explosionDuration;
        }
      } else {
        explosionFrame = 0;
      }
    };
    
    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(container);
    resize();
    
    const animate = (timestamp: number) => {
      const dpr = window.devicePixelRatio || 1;
      draw(canvas.width / dpr, canvas.height / dpr, timestamp);
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    
    return () => {
      resizeObserver.disconnect();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [rocketImg]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#030303] rounded-xl border border-amber-500/10 overflow-hidden shadow-inner">
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="absolute inset-0 pointer-events-none scanlines opacity-30" />
    </div>
  );
}
