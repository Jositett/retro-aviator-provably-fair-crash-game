import React, { useState, useEffect, useRef } from 'react';
import { GAME_CONSTANTS } from '@shared/game-logic';
import { sounds } from '@/lib/sounds';

interface PreparingCountdownProps {
  startTime: number;
  serverTime: number;
  serverOffset: number;
  preparationMs?: number;
}

export function PreparingCountdown({ startTime, serverTime, serverOffset, preparationMs }: PreparingCountdownProps) {
  const [countdown, setCountdown] = useState(0);
  const [maintenancePhase, setMaintenancePhase] = useState(0);
  const lastPhaseRef = useRef(0);
  const lastCountdownRef = useRef(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const phaseIconRef = useRef<HTMLSpanElement>(null);
  const soundPlayedRef = useRef(false);

  useEffect(() => {
    let frame: number;
    const prepDuration = Math.max(1, preparationMs ?? GAME_CONSTANTS.PREPARATION_MS);
    const update = () => {
      const now = Date.now() + serverOffset;
      const elapsed = now - startTime;
      const remaining = Math.max(0, prepDuration - elapsed);

      if (!soundPlayedRef.current && elapsed > 100) {
        sounds.prepStart();
        soundPlayedRef.current = true;
      }

      const newCountdown = Math.ceil(remaining / 1000);
      if (newCountdown !== lastCountdownRef.current) {
        if (newCountdown > 0 && newCountdown <= 3) {
          sounds.countdownTick();
        }
        setCountdown(newCountdown);
        lastCountdownRef.current = newCountdown;
      }

      const phase = Math.floor((elapsed / 1000) % 4);
      if (phase !== lastPhaseRef.current) {
        setMaintenancePhase(phase);
        lastPhaseRef.current = phase;
      }

      const progress = Math.min(1, Math.max(0, elapsed / prepDuration));
      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${progress})`;
      }

      const phaseProgress = ((elapsed / 1000) % 1);
      if (phaseIconRef.current) {
        phaseIconRef.current.style.opacity = `${0.5 + phaseProgress * 0.5}`;
        phaseIconRef.current.style.transform = `scale(${0.9 + phaseProgress * 0.1})`;
      }

      frame = requestAnimationFrame(update);
    };

    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [startTime, serverOffset, preparationMs]);

  const maintenanceTexts = ['FUELING', 'INSPECTION', 'SYSTEM CHECK', 'CLEARED'];
  const maintenanceIcons = ['⛽', '🔧', '📡', '✓'];

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-6xl md:text-8xl font-black font-mono text-amber-500 tracking-tighter drop-shadow-[0_0_30px_rgba(245,158,11,0.6)] transition-all duration-300">
        {countdown}
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="w-48 h-3 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
          <div
            ref={progressBarRef}
            className="h-full bg-gradient-to-r from-amber-600 to-amber-400 will-change-transform transition-transform duration-100"
            style={{ transform: 'scaleX(0)', transformOrigin: 'left' }}
          />
        </div>
        <div className="flex items-center gap-2 text-amber-500/80 transition-all duration-300">
          <span
            ref={phaseIconRef}
            className="text-lg transition-all duration-200"
            style={{ opacity: 0.5, transform: 'scale(0.9)' }}
          >
            {maintenanceIcons[maintenancePhase]}
          </span>
          <span className="font-mono text-xs uppercase tracking-widest font-bold text-amber-400">{maintenanceTexts[maintenancePhase]}</span>
        </div>
      </div>
    </div>
  );
}
