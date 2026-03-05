import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { RadarCanvas } from '@/components/game/RadarCanvas';
import { CockpitControls } from '@/components/game/CockpitControls';
import { HistoryRail } from '@/components/game/HistoryRail';
import { LiveBetsTable } from '@/components/game/LiveBetsTable';
import { VerifierModal } from '@/components/game/VerifierModal';
import { calculateMultiplier } from '@shared/game-logic';
import { formatMultiplier } from '@/lib/game-utils';
import { Toaster, toast } from 'sonner';
import { Zap, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GameState, ApiResponse, Bet, RoundRecord } from '@shared/types';
const getPersistentUserId = () => {
  const saved = localStorage.getItem('aviator_user_id');
  if (saved) return saved;
  const id = 'pilot-' + Math.random().toString(36).slice(2, 7);
  localStorage.setItem('aviator_user_id', id);
  return id;
};
const USER_ID = getPersistentUserId();
export function HomePage() {
  const [balance, setBalance] = useState(1000.00);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [interpolatedMs, setInterpolatedMs] = useState(0);
  const [isWaitingForBet, setIsWaitingForBet] = useState(false);
  const [myBet, setMyBet] = useState<Bet | null>(null);
  const [verifierOpen, setVerifierOpen] = useState(false);
  const [selectedRound, setSelectedRound] = useState<RoundRecord | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const serverOffsetRef = useRef<number>(0);
  const offsetBufferRef = useRef<number[]>([]);
  const fetchState = useCallback(async () => {
    try {
      const start = Date.now();
      const res = await fetch('/api/game/state');
      if (!res.ok) throw new Error('Network error');
      const json = await res.json() as ApiResponse<GameState>;
      const end = Date.now();
      const latency = (end - start) / 2;
      if (json.success && json.data) {
        setGameState(json.data);
        setIsConnected(true);
        const newOffset = json.data.serverTime - (end - latency);
        offsetBufferRef.current.push(newOffset);
        if (offsetBufferRef.current.length > 5) offsetBufferRef.current.shift();
        serverOffsetRef.current = offsetBufferRef.current.reduce((a, b) => a + b, 0) / offsetBufferRef.current.length;
      }
    } catch (netErr) {
      console.warn("Failed to sync game state:", netErr);
      setIsConnected(false);
    }
  }, []);
  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch(`/api/user/balance?userId=${USER_ID}`);
      const json = await res.json() as ApiResponse<number>;
      if (json.success && json.data !== undefined) {
        setBalance(json.data);
      }
    } catch (netErr) {
      /* Silently fail balance polling to avoid UI jitter; server state is primary source of truth */
    }
  }, []);
  useEffect(() => {
    const interval = setInterval(fetchState, 400);
    const balanceInterval = setInterval(fetchBalance, 3000);
    fetchState();
    fetchBalance();
    return () => {
      clearInterval(interval);
      clearInterval(balanceInterval);
    };
  }, [fetchState, fetchBalance]);
  useEffect(() => {
    let frame: number;
    const loop = () => {
      if (gameState) {
        const now = Date.now() + serverOffsetRef.current;
        const elapsed = gameState.phase === 'FLYING'
          ? Math.max(0, now - gameState.startTime)
          : (gameState.phase === 'CRASHED' ? (gameState.serverTime - gameState.startTime) : 0);
        setInterpolatedMs(elapsed);
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [gameState]);
  const handlePlaceBet = async (amount: number, auto: number | null) => {
    if (amount > balance) {
      toast.error("Insufficient balance");
      return;
    }
    setIsWaitingForBet(true);
    try {
      const res = await fetch('/api/game/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: USER_ID, userName: 'Pilot_' + USER_ID.slice(-3).toUpperCase(), amount, autoCashout: auto })
      });
      const json = await res.json() as ApiResponse<Bet>;
      if (json.success && json.data) {
        setMyBet(json.data);
        setBalance(prev => prev - amount);
        toast.success('TRANSACTION SECURED');
      } else {
        toast.error(json.error || 'Failed to place bet');
      }
    } catch (e) {
      toast.error('Network failure');
    } finally {
      setIsWaitingForBet(false);
    }
  };
  const handleCashout = useCallback(async () => {
    if (!myBet || !gameState || gameState.phase !== 'FLYING') return;
    try {
      const res = await fetch('/api/game/cashout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: USER_ID })
      });
      const json = await res.json() as ApiResponse<Bet>;
      if (json.success && json.data) {
        toast.success('FUNDS RETRIEVED');
        setMyBet(null);
        fetchBalance();
      } else {
        toast.error(json.error || 'Cashout refused');
      }
    } catch (e) {
      toast.error('Sync failure');
    }
  }, [myBet, gameState, fetchBalance]);
  useEffect(() => {
    if (gameState?.phase === 'PREPARING') setMyBet(null);
  }, [gameState?.phase]);
  const currentMultiplier = calculateMultiplier(interpolatedMs);
  const isCrashed = gameState?.phase === 'CRASHED';
  const flightPhase = isConnected ? (gameState?.phase || 'IDLE') : 'OFFLINE';
  return (
    <div className="h-screen bg-[#020202] text-zinc-100 font-sans selection:bg-amber-500/30 overflow-hidden flex flex-col">
      <Toaster position="top-right" richColors theme="dark" />
      <ThemeToggle className="top-4 right-4" />
      <VerifierModal round={selectedRound} isOpen={verifierOpen} onOpenChange={setVerifierOpen} />
      <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
        <header className="shrink-0 mb-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-950/80 p-4 rounded-2xl border border-zinc-800/50 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center gap-5">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.4)]">
              <Zap className="w-6 h-6 text-black fill-current" />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tighter font-mono italic">
                RETRO <span className="text-amber-500">AVIATOR</span>
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn("w-2 h-2 rounded-full", isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Node: {flightPhase}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="flex-1 sm:flex-none flex flex-col items-end px-4 border-r border-zinc-800">
              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-0.5">Credits</span>
              <span className="text-lg font-black font-mono text-emerald-400">
                ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <button onClick={() => setVerifierOpen(true)} className="flex items-center gap-2 text-[10px] font-mono text-amber-500 font-bold uppercase tracking-widest hover:bg-amber-500/10 px-4 py-2 rounded-xl border border-amber-500/30 transition-all">
              <ShieldCheck className="w-4 h-4" /> <span className="hidden md:inline">Verify</span>
            </button>
          </div>
        </header>
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="hidden lg:block lg:col-span-3 h-full rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950/50 shadow-inner">
            <LiveBetsTable activeBets={gameState?.activeBets || []} />
          </aside>
          <section className="lg:col-span-9 flex flex-col h-full gap-4">
            <div className="flex-1 flex flex-col bg-zinc-900/20 rounded-2xl border border-zinc-800/80 overflow-hidden relative backdrop-blur-sm min-h-0">
              <HistoryRail history={gameState?.history || []} onSelectRound={setSelectedRound} />
              <div className="flex-1 relative flex flex-col p-4 min-h-0">
                <div className="flex-1 relative min-h-0">
                  <RadarCanvas elapsedMs={interpolatedMs} isCrashed={isCrashed} isFlying={gameState?.phase === 'FLYING'} />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
                    {gameState?.phase === 'FLYING' && (
                      <div className="text-7xl md:text-9xl font-black font-mono text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.4)] tracking-tighter transition-transform duration-100" style={{ transform: `scale(${1 + Math.min(currentMultiplier - 1, 100) * 0.005})` }}>
                        {formatMultiplier(currentMultiplier)}
                      </div>
                    )}
                    {isCrashed && (
                      <div className="glitch-active flex flex-col items-center">
                        <div className="text-7xl md:text-9xl font-black font-mono text-red-500 drop-shadow-[0_0_50px_rgba(239,68,68,0.7)] tracking-tighter">
                          {formatMultiplier(gameState.lastCrashPoint)}
                        </div>
                        <span className="text-red-600 font-mono text-xs font-bold uppercase tracking-[0.5em] mt-2">Crashed</span>
                      </div>
                    )}
                    {gameState?.phase === 'PREPARING' && (
                      <div className="flex flex-col items-center gap-6">
                        <div className="text-lg font-mono font-black text-amber-500 tracking-[0.4em] uppercase animate-pulse">PREPARING LAUNCH</div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="shrink-0 mt-4">
                  <CockpitControls 
                    balance={balance} 
                    gameState={gameState?.phase || 'PREPARING'} 
                    onPlaceBet={handlePlaceBet} 
                    onCashout={handleCashout} 
                    currentMultiplier={currentMultiplier} 
                    hasActiveBet={!!myBet} 
                    isWaiting={isWaitingForBet} 
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}