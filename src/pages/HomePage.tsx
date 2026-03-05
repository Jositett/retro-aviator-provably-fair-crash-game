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
import { Sparkles, Terminal, Activity, ShieldCheck, Hash, Users, Zap } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { GameState, ApiResponse, Bet, RoundRecord } from '@shared/types';
const USER_ID = 'pilot-' + Math.random().toString(36).slice(2, 7);
export function HomePage() {
  const [balance, setBalance] = useState(1000.00);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [interpolatedMs, setInterpolatedMs] = useState(0);
  const [isWaitingForBet, setIsWaitingForBet] = useState(false);
  const [myBet, setMyBet] = useState<Bet | null>(null);
  const [verifierOpen, setVerifierOpen] = useState(false);
  const [selectedRound, setSelectedRound] = useState<RoundRecord | null>(null);
  const serverOffsetRef = useRef<number>(0);
  const offsetBufferRef = useRef<number[]>([]);
  const fetchState = useCallback(async () => {
    try {
      const start = Date.now();
      const res = await fetch('/api/game/state');
      const json = await res.json() as ApiResponse<GameState>;
      const end = Date.now();
      const latency = (end - start) / 2;
      if (json.success && json.data) {
        setGameState(json.data);
        // Moving average for offset stabilization
        const newOffset = json.data.serverTime - (end - latency);
        offsetBufferRef.current.push(newOffset);
        if (offsetBufferRef.current.length > 5) offsetBufferRef.current.shift();
        serverOffsetRef.current = offsetBufferRef.current.reduce((a, b) => a + b, 0) / offsetBufferRef.current.length;
      }
    } catch (e) {
      console.error("Sync error", e);
    }
  }, []);
  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch(`/api/user/balance?userId=${USER_ID}`);
      const json = await res.json() as ApiResponse<number>;
      if (json.success && json.data !== undefined) {
        setBalance(json.data);
      }
    } catch (e) {
      console.error("Balance sync error", e);
    }
  }, []);
  useEffect(() => {
    const interval = setInterval(fetchState, 300);
    const balanceInterval = setInterval(fetchBalance, 2000);
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
        toast.success('TRANSACTION SECURED', { 
          description: `Bet of $${amount.toFixed(2)} placed.`,
          style: { backgroundColor: '#f59e0b', color: '#000', border: 'none' } 
        });
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
        toast.success('FUNDS RETRIEVED', {
          description: `Multiplier: ${json.data.multiplier}x | Profit: $${(json.data.winningAmount - json.data.amount).toFixed(2)}`,
          style: { backgroundColor: '#10b981', color: '#fff', border: 'none' }
        });
        setMyBet(null);
        fetchBalance();
      } else {
        toast.error(json.error || 'Cashout refused by node');
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
  const flightPhase = gameState?.phase || 'IDLE';
  return (
    <div className="min-h-screen bg-[#020202] text-zinc-100 font-sans selection:bg-amber-500/30 overflow-x-hidden">
      <Toaster position="top-right" richColors theme="dark" />
      <ThemeToggle className="top-4 right-4" />
      <VerifierModal
        round={selectedRound}
        isOpen={verifierOpen}
        onOpenChange={setVerifierOpen}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12">
          {/* Header HUD */}
          <header className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-950/80 p-5 rounded-2xl border border-zinc-800/50 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.4)] transform hover:rotate-6 transition-transform">
                <Zap className="w-7 h-7 text-black fill-current" />
              </div>
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tighter font-mono italic">
                  RETRO <span className="text-amber-500">AVIATOR</span>
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Authoritative Node: Active</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="lg:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 h-11 w-11">
                      <Users className="w-5 h-5 text-amber-500" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[320px] p-0 bg-zinc-950 border-zinc-800">
                    <SheetHeader className="p-4 border-b border-zinc-800 bg-zinc-900/40">
                      <SheetTitle className="text-zinc-400 font-mono uppercase text-xs tracking-widest flex items-center gap-2">
                        <Activity className="w-4 h-4 text-amber-500" /> Global Telemetry
                      </SheetTitle>
                    </SheetHeader>
                    <LiveBetsTable activeBets={gameState?.activeBets || []} />
                  </SheetContent>
                </Sheet>
              </div>
              <div className="flex-1 sm:flex-none flex flex-col items-end px-5 border-r border-zinc-800">
                <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-0.5">Digital Credits</span>
                <span className="text-xl font-black font-mono text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                  ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <button
                onClick={() => setVerifierOpen(true)}
                className="flex items-center gap-2 text-[11px] font-mono text-amber-500 font-bold uppercase tracking-widest hover:bg-amber-500/10 px-5 py-2.5 rounded-xl border border-amber-500/30 transition-all active:scale-95 bg-amber-500/5 shadow-inner"
              >
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden md:inline">Verify Fair</span>
              </button>
            </div>
          </header>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Desktop Activity Rail */}
            <aside className="hidden lg:block lg:col-span-3 h-[650px] rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950/50 shadow-inner">
              <LiveBetsTable activeBets={gameState?.activeBets || []} />
            </aside>
            {/* Core Game Arena */}
            <section className="lg:col-span-9 flex flex-col gap-6">
              <div className="bg-zinc-900/20 rounded-2xl border border-zinc-800/80 overflow-hidden flex flex-col min-h-[550px] shadow-2xl relative backdrop-blur-sm">
                <HistoryRail
                  history={gameState?.history || []}
                  onSelectRound={(r) => {
                    setSelectedRound(r);
                    setVerifierOpen(true);
                  }}
                />
                <div className="flex-1 relative p-5 flex flex-col">
                  <div className="flex-1 relative min-h-[380px]">
                    <RadarCanvas
                      elapsedMs={interpolatedMs}
                      isCrashed={isCrashed}
                      isFlying={gameState?.phase === 'FLYING'}
                    />
                    {/* Multiplier Overlay with Dynamic Pulse */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
                      {gameState?.phase === 'FLYING' && (
                        <div className="animate-in zoom-in duration-300">
                          <div 
                            className="text-8xl md:text-9xl font-black font-mono text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.4)] tracking-tighter"
                            style={{ 
                              transform: `scale(${1 + (currentMultiplier - 1) * 0.01})`,
                              transition: 'transform 0.1s linear'
                            }}
                          >
                            {formatMultiplier(currentMultiplier)}
                          </div>
                        </div>
                      )}
                      {isCrashed && (
                        <div className="glitch-active flex flex-col items-center">
                          <div className="text-8xl md:text-9xl font-black font-mono text-red-500 drop-shadow-[0_0_50px_rgba(239,68,68,0.7)] tracking-tighter">
                            {formatMultiplier(gameState.lastCrashPoint)}
                          </div>
                          <span className="text-red-600 font-mono text-xs font-bold uppercase tracking-[0.5em] mt-2">Crashed</span>
                        </div>
                      )}
                      {gameState?.phase === 'PREPARING' && (
                        <div className="flex flex-col items-center gap-6">
                          <div className="relative w-24 h-24">
                            <div className="absolute inset-0 border-4 border-amber-500/10 rounded-full" />
                            <div className="absolute inset-0 border-4 border-t-amber-500 rounded-full animate-spin" />
                            <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-amber-500 animate-pulse" />
                          </div>
                          <div className="text-xl font-mono font-black text-amber-500 tracking-[0.4em] uppercase animate-pulse drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                            PREPARING LAUNCH
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Immersive HUD Metadata */}
                    <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row justify-between items-end gap-3 pointer-events-none z-40">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-400 bg-black/80 px-4 py-2 rounded-xl border border-zinc-800 shadow-xl">
                          <Activity className="w-3 h-3 text-emerald-500" />
                          <span className="opacity-90">STABILITY: {flightPhase} // LATENCY: 24MS</span>
                        </div>
                      </div>
                      {gameState?.nextSeedHash && (
                        <div className="hidden md:flex items-center gap-3 text-[9px] font-mono text-zinc-500 bg-black/60 px-4 py-2 rounded-xl border border-zinc-800/50 backdrop-blur-md">
                          <Hash className="w-3 h-3 text-amber-500/40" />
                          <span className="truncate max-w-[240px] opacity-70">CURRENT_BLOCK_HASH: {gameState.nextSeedHash}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-6">
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
          <footer className="mt-12 pt-8 border-t border-zinc-900 flex flex-col md:flex-row items-center justify-between gap-6 text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
            <div className="flex flex-wrap justify-center items-center gap-6">
              <span className="flex items-center gap-2"><Terminal className="w-4 h-4" /> ENGINE: DURABLE_SYNC_V4</span>
              <span className="hidden sm:inline opacity-30">|</span>
              <span className="flex items-center gap-2 text-zinc-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/50" /> SHA-256 PROVABLY FAIR
              </span>
            </div>
            <div className="flex gap-8 items-center">
              <a href="#" className="hover:text-amber-500 transition-colors">Documentation</a>
              <a href="#" className="hover:text-amber-500 transition-colors">Privacy</a>
              <span className="bg-zinc-900 px-3 py-1 rounded text-zinc-700 border border-zinc-800 font-bold">REV_09.2.25</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}