import React, { useState, useEffect, useRef } from 'react';
import { GAME_CONSTANTS } from '@shared/game-logic';
import { formatMultiplier } from '@/lib/game-utils';

interface CrashDisplayProps {
  crashPoint: number;
  startTime: number;
  serverTime: number;
  serverOffset: number;
}

export function CrashDisplay({ crashPoint, startTime, serverTime, serverOffset }: CrashDisplayProps) {
  const [cooldown, setCooldown] = useState(0);
  const [showNextRound, setShowNextRound] = useState(false);
  const [showCrashText, setShowCrashText] = useState(false);
  const lastCooldownRef = useRef(-1);
  const lastShowNextRoundRef = useRef(false);
  const lastShowCrashTextRef = useRef(false);

  useEffect(() => {
    const revealDelayMs = 350;
    let timer: number;

    const update = () => {
      const now = Date.now() + serverOffset;
      const elapsed = now - startTime;
      const remaining = Math.max(0, GAME_CONSTANTS.COOLDOWN_MS - elapsed);

      const nextCooldown = Math.ceil(remaining / 1000);
      if (nextCooldown !== lastCooldownRef.current) {
        setCooldown(nextCooldown);
        lastCooldownRef.current = nextCooldown;
      }

      const nextShowNextRound = remaining < 2000;
      if (nextShowNextRound !== lastShowNextRoundRef.current) {
        setShowNextRound(nextShowNextRound);
        lastShowNextRoundRef.current = nextShowNextRound;
      }

      const nextShowCrashText = elapsed >= revealDelayMs;
      if (nextShowCrashText !== lastShowCrashTextRef.current) {
        setShowCrashText(nextShowCrashText);
        lastShowCrashTextRef.current = nextShowCrashText;
      }
    };

    update();
    timer = window.setInterval(update, 100);
    return () => window.clearInterval(timer);
  }, [startTime, serverOffset]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-7xl md:text-9xl font-black font-mono text-red-500 drop-shadow-[0_0_50px_rgba(239,68,68,0.7)] tracking-tighter transition-all duration-300 animate-[pulse_1.2s_ease-out_1]">
        {formatMultiplier(crashPoint)}
      </div>
      <div className="flex flex-col items-center gap-2">
        {showCrashText ? (
          <span className="text-red-600 font-mono text-sm font-bold uppercase tracking-[0.5em] animate-pulse">🔥 Crashed 🔥</span>
        ) : (
          <span className="text-amber-500/90 font-mono text-sm font-bold uppercase tracking-[0.3em] animate-pulse">Incoming object...</span>
        )}
        {!showNextRound && cooldown > 0 && (
          <div className="flex items-center gap-2 text-zinc-500 animate-pulse transition-all">
            <span className="font-mono text-xs">Next round in</span>
            <span className="font-mono text-xs text-amber-500 font-bold">{cooldown}s</span>
          </div>
        )}
        {showNextRound && (
          <span className="font-mono text-xs text-emerald-500 animate-bounce uppercase tracking-widest font-bold">🚀 Starting new round...</span>
        )}
      </div>
    </div>
  );
}
