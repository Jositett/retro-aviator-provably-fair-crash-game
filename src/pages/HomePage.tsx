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
import { Sparkles, Terminal, Activity, ShieldCheck, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GameState, ApiResponse, Bet, RoundRecord } from '@shared/types';
const USER_ID = 'demo-user-' + Math.random().toString(36).slice(2, 7);
export function HomePage() {
  const [balance, setBalance] = useState(1000.00);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [interpolatedMs, setInterpolatedMs] = useState(0);
  const [isWaitingForBet, setIsWaitingForBet] = useState(false);
  const [myBet, setMyBet] = useState<Bet | null>(null);
  const [verifierOpen, setVerifierOpen] = useState(false);
  const [selectedRound, setSelectedRound] = useState<RoundRecord | null>(null);
  const serverOffsetRef = useRef<number>(0);
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/game/state');
      const json = await res.json() as ApiResponse<GameState>;
      if (json.success && json.data) {
        setGameState(json.data);
        serverOffsetRef.current = json.data.serverTime - Date.now();
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
        body: JSON.stringify({ userId: USER_ID, userName: 'Pilot_' + USER_ID.slice(-3), amount, autoCashout: auto })
      });
      const json = await res.json() as ApiResponse<Bet>;
      if (json.success && json.data) {
        setMyBet(json.data);
        setBalance(prev => prev - amount);
        toast.success('BET SECURED', { style: { backgroundColor: '#f59e0b', color: '#000' } });
      } else {
        toast.error(json.error || 'Failed to place bet');
      }
    } catch (e) {
      toast.error('Network Error');
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
        toast.success('TRANSACTION SUCCESSFUL', {
          description: `Secured ${json.data.multiplier}x payout.`,
          style: { backgroundColor: '#10b981', color: '#fff' }
        });
        setMyBet(null);
        fetchBalance();
      } else {
        toast.error(json.error || 'Cashout refused');
      }
    } catch (e) {
      toast.error('Network Error');
    }
  }, [myBet, gameState, fetchBalance]);
  useEffect(() => {
    if (gameState?.phase === 'PREPARING') setMyBet(null);
  }, [gameState?.phase]);
  const currentMultiplier = calculateMultiplier(interpolatedMs);
  const isCrashed = gameState?.phase === 'CRASHED';
  return (
    <div className="min-h-screen bg-[#020202] text-zinc-100 font-sans selection:bg-amber-500/30">
      <Toaster position="top-right" richColors theme="dark" />
      <ThemeToggle className="top-4 right-4" />
      <VerifierModal
        round={selectedRound}
        isOpen={verifierOpen}
        onOpenChange={setVerifierOpen}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12">
          {/* Header */}
          <header className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center shadow-primary transform rotate-3">
                <Sparkles className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-xl font-black uppercase tracking-tighter font-mono">
                  RETRO <span className="text-amber-500">AVIATOR</span>
                </h1>
                <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Proprietary Flight Logic v4.2</p>
              </div>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="flex-1 sm:flex-none flex flex-col items-end px-4 border-r border-zinc-800">
                <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Available Credits</span>
                <span className="text-lg font-bold font-mono text-emerald-400">${balance.toFixed(2)}</span>
              </div>
              <button
                onClick={() => setVerifierOpen(true)}
                className="flex items-center gap-2 text-[10px] font-mono text-amber-500 uppercase tracking-widest hover:bg-amber-500/10 px-4 py-2 rounded-lg border border-amber-500/20 transition-all active:scale-95"
              >
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden md:inline">Verify Fair</span>
              </button>
            </div>
          </header>
          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Sidebar - Desktop */}
            <aside className="hidden lg:block lg:col-span-3 h-[600px] rounded-xl overflow-hidden border border-zinc-800">
              <LiveBetsTable activeBets={gameState?.activeBets || []} />
            </aside>
            {/* Game Arena */}
            <section className="lg:col-span-9 flex flex-col gap-6">
              <div className="bg-zinc-900/20 rounded-xl border border-zinc-800 overflow-hidden flex flex-col min-h-[500px]">
                <HistoryRail
                  history={gameState?.history || []}
                  onSelectRound={(r) => {
                    setSelectedRound(r);
                    setVerifierOpen(true);
                  }}
                />
                <div className="flex-1 relative p-4 flex flex-col">
                  <div className="flex-1 relative min-h-[350px]">
                    <RadarCanvas
                      elapsedMs={interpolatedMs}
                      isCrashed={isCrashed}
                      isFlying={gameState?.phase === 'FLYING'}
                    />
                    {/* Multiplier Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
                      {gameState?.phase === 'FLYING' && (
                        <div className="animate-in zoom-in duration-300">
                          <div className="text-7xl md:text-9xl font-black font-mono text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] tracking-tighter">
                            {formatMultiplier(currentMultiplier)}
                          </div>
                        </div>
                      )}
                      {isCrashed && (
                        <div className="glitch-active">
                          <div className="text-7xl md:text-9xl font-black font-mono text-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,0.5)] tracking-tighter">
                            {formatMultiplier(gameState.lastCrashPoint)}
                          </div>
                        </div>
                      )}
                      {gameState?.phase === 'PREPARING' && (
                        <div className="flex flex-col items-center gap-6">
                          <div className="w-20 h-20 border-4 border-amber-500/10 border-t-amber-500 rounded-full animate-spin" />
                          <div className="text-lg font-mono font-bold text-amber-500 tracking-[0.5em] uppercase animate-pulse">
                            Link Initializing
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Stats HUD */}
                    <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end pointer-events-none z-40">
                      <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500 bg-black/80 px-3 py-2 rounded-lg border border-zinc-800">
                        <Activity className="w-3 h-3 text-emerald-500" />
                        <span className="opacity-70">TELEMETRY: ACTIVE // LATENCY: 24MS</span>
                      </div>
                      {gameState?.nextSeedHash && (
                        <div className="hidden md:flex items-center gap-3 text-[9px] font-mono text-zinc-600 bg-black/40 px-3 py-2 rounded-lg border border-zinc-800/50">
                          <Hash className="w-3 h-3 text-amber-500/50" />
                          <span className="truncate max-w-[200px]">HASH: {gameState.nextSeedHash}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Controls */}
                  <div className="mt-4">
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
          {/* Footer Metadata */}
          <footer className="mt-8 pt-8 border-t border-zinc-900 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2"><Terminal className="w-3 h-3" /> System: Authoritative Global DO</span>
              <span>•</span>
              <span>Protocol: SHA-256 Verified</span>
            </div>
            <div className="flex gap-6">
              <span className="hover:text-amber-500 transition-colors cursor-help">TOS</span>
              <span className="hover:text-amber-500 transition-colors cursor-help">Fairness Policy</span>
              <span className="text-zinc-800">BUILD_ID: RADAR_04.2.0</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}