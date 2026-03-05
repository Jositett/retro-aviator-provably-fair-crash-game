import React, { useState, useEffect, useCallback } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { RadarCanvas } from '@/components/game/RadarCanvas';
import { CockpitControls } from '@/components/game/CockpitControls';
import { HistoryRail } from '@/components/game/HistoryRail';
import { LiveBetsTable } from '@/components/game/LiveBetsTable';
import { getMultiplierFromTime, generateRandomCrashPoint, formatMultiplier } from '@/lib/game-utils';
import { Toaster, toast } from 'sonner';
import { Sparkles, Terminal, Activity } from 'lucide-react';
type GameState = 'PREPARING' | 'FLYING' | 'CRASHED';
export function HomePage() {
  const [balance, setBalance] = useState(1000.00);
  const [gameState, setGameState] = useState<GameState>('PREPARING');
  const [history, setHistory] = useState<number[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [crashPoint, setCrashPoint] = useState(2.50);
  const [currentBet, setCurrentBet] = useState<{ amount: number; auto: number | null } | null>(null);
  const [isWaitingForBet, setIsWaitingForBet] = useState(false);
  // Simulated Game Cycle
  useEffect(() => {
    let timer: number;
    const tickRate = 16; // ~60fps
    if (gameState === 'PREPARING') {
      setElapsedMs(0);
      setCrashPoint(generateRandomCrashPoint());
      const nextRound = setTimeout(() => {
        setGameState('FLYING');
        setIsWaitingForBet(false);
      }, 5000); // 5s betting window
      return () => clearTimeout(nextRound);
    }
    if (gameState === 'FLYING') {
      timer = window.setInterval(() => {
        setElapsedMs(prev => {
          const next = prev + tickRate;
          const currentM = getMultiplierFromTime(next);
          if (currentM >= crashPoint) {
            setGameState('CRASHED');
            return next;
          }
          // Auto cashout check
          if (currentBet?.auto && currentM >= currentBet.auto) {
            handleCashout();
          }
          return next;
        });
      }, tickRate);
      return () => clearInterval(timer);
    }
    if (gameState === 'CRASHED') {
      const reset = setTimeout(() => {
        setHistory(prev => [crashPoint, ...prev].slice(0, 20));
        setGameState('PREPARING');
        setCurrentBet(null);
      }, 3000); // 3s cooldown
      return () => clearTimeout(reset);
    }
  }, [gameState, crashPoint, currentBet]);
  const handlePlaceBet = (amount: number, auto: number | null) => {
    setBalance(prev => prev - amount);
    setCurrentBet({ amount, auto });
    setIsWaitingForBet(true);
    toast.success('Bet Placed', { description: `$${amount.toFixed(2)} recorded for next flight.` });
  };
  const handleCashout = useCallback(() => {
    if (!currentBet || gameState !== 'FLYING') return;
    const mult = getMultiplierFromTime(elapsedMs);
    const win = currentBet.amount * mult;
    setBalance(prev => prev + win);
    setCurrentBet(null);
    toast.success('WINNER!', { 
      description: `Cashed out at ${mult.toFixed(2)}x for $${win.toFixed(2)}`,
      style: { backgroundColor: '#10b981', color: '#fff' }
    });
  }, [currentBet, gameState, elapsedMs]);
  const currentMultiplier = getMultiplierFromTime(elapsedMs);
  return (
    <div className="flex flex-col h-screen bg-[#020202] text-zinc-100 font-sans overflow-hidden">
      <ThemeToggle />
      <Toaster position="top-center" richColors />
      {/* Header */}
      <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-[#09090b]/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.5)]">
            <Sparkles className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest font-mono">
              Retro <span className="text-amber-500">Aviator</span>
            </h1>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-zinc-500 font-mono">RADAR ACTIVE</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Balance</span>
            <span className="text-sm font-bold font-mono text-emerald-400">${balance.toFixed(2)}</span>
          </div>
          <div className="w-px h-8 bg-zinc-800" />
          <button className="p-2 hover:bg-zinc-800 rounded-md transition-colors">
            <Terminal className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
      </header>
      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Stats Rail - Hidden on Mobile */}
        <aside className="hidden lg:block w-72 h-full overflow-hidden">
          <LiveBetsTable />
        </aside>
        {/* Center Arena */}
        <section className="flex-1 flex flex-col min-w-0">
          <HistoryRail history={history} />
          <div className="flex-1 relative p-4 lg:p-6 overflow-hidden flex flex-col">
            <div className="flex-1 relative">
              <RadarCanvas 
                elapsedMs={elapsedMs} 
                isCrashed={gameState === 'CRASHED'} 
                isFlying={gameState === 'FLYING'} 
              />
              {/* Central Display Overlay */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                {gameState === 'FLYING' && (
                  <div className="animate-in zoom-in duration-300">
                    <div className="text-8xl font-black font-mono text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                      {formatMultiplier(currentMultiplier)}
                    </div>
                  </div>
                )}
                {gameState === 'PREPARING' && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                    <div className="text-2xl font-mono font-bold text-amber-500 tracking-widest uppercase">
                      Waiting for Bets
                    </div>
                  </div>
                )}
              </div>
              {/* Background Accents */}
              <div className="absolute top-4 left-4 flex items-center gap-2 text-[10px] font-mono text-zinc-600 bg-black/40 px-2 py-1 rounded">
                <Activity className="w-3 h-3 text-amber-500" />
                <span>FLIGHT ENGINE v4.2 // SECTOR_7G</span>
              </div>
            </div>
            {/* Controls Area */}
            <div className="mt-4 lg:mt-6">
              <CockpitControls 
                balance={balance}
                gameState={gameState}
                onPlaceBet={handlePlaceBet}
                onCashout={handleCashout}
                currentMultiplier={currentMultiplier}
                hasActiveBet={!!currentBet}
                isWaiting={isWaitingForBet}
              />
            </div>
          </div>
        </section>
      </main>
      <footer className="h-8 border-t border-zinc-900 bg-black flex items-center justify-between px-6 text-[9px] font-mono text-zinc-700 uppercase tracking-widest">
        <span>Cloudflare DO Persistence Enabled</span>
        <div className="flex gap-4">
          <span>Latency: 24ms</span>
          <span>FPS: 60.0</span>
        </div>
      </footer>
    </div>
  );
}