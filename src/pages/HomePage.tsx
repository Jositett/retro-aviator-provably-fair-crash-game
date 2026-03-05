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
import { Sparkles, Terminal, Activity, ShieldCheck } from 'lucide-react';
import type { GameState, ApiResponse, Bet, RoundRecord } from '@shared/types';
const USER_ID = 'demo-user-' + Math.random().toString(36).slice(2, 7);
export function HomePage() {
  const [balance, setBalance] = useState(1000.00);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [interpolatedMs, setInterpolatedMs] = useState(0);
  const [isWaitingForBet, setIsWaitingForBet] = useState(false);
  const [myBet, setMyBet] = useState<Bet | null>(null);
  // Verifier Modal
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
        const elapsed = Math.max(0, now - gameState.startTime);
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
        toast.success('Bet Committed to Ledger');
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
        const win = json.data.winningAmount || 0;
        toast.success('TRANSACTION SUCCESSFUL', {
          description: `Secured ${json.data.multiplier}x multiplier. Payout: $${win.toFixed(2)}`,
          style: { backgroundColor: '#10b981', color: '#fff' }
        });
        setMyBet(null);
        fetchBalance();
      } else {
        toast.error(json.error || 'Cashout refused by engine');
      }
    } catch (e) {
      toast.error('Network Error');
    }
  }, [myBet, gameState, fetchBalance]);
  useEffect(() => {
    if (gameState?.phase === 'PREPARING') {
      setMyBet(null);
    }
  }, [gameState?.phase]);
  const currentMultiplier = calculateMultiplier(interpolatedMs);
  return (
    <div className="flex flex-col h-screen bg-[#020202] text-zinc-100 font-sans overflow-hidden">
      <ThemeToggle />
      <Toaster position="top-center" richColors />
      <VerifierModal 
        round={selectedRound} 
        isOpen={verifierOpen} 
        onOpenChange={setVerifierOpen} 
      />
      <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-[#09090b]/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.5)]">
            <Sparkles className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest font-mono">
              Retro <span className="text-amber-500">Aviator</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Balance</span>
            <span className="text-sm font-bold font-mono text-emerald-400">${balance.toFixed(2)}</span>
          </div>
          <div className="w-px h-8 bg-zinc-800" />
          <button 
            onClick={() => setVerifierOpen(true)}
            className="flex items-center gap-2 text-[10px] font-mono text-amber-500/80 hover:text-amber-500 transition-colors bg-amber-500/10 px-3 py-1.5 rounded border border-amber-500/20"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Verify Fairness</span>
          </button>
        </div>
      </header>
      <main className="flex-1 flex overflow-hidden max-w-7xl mx-auto w-full px-0 sm:px-4 lg:px-6 py-0 md:py-4 lg:py-6">
        <aside className="hidden xl:block w-72 h-full overflow-hidden rounded-l-xl border-l border-t border-b border-zinc-800">
          <LiveBetsTable activeBets={gameState?.activeBets || []} />
        </aside>
        <section className="flex-1 flex flex-col min-w-0 bg-zinc-900/20 border border-zinc-800 xl:rounded-r-xl">
          <HistoryRail 
            history={gameState?.history || []} 
            onSelectRound={(r) => {
              setSelectedRound(r);
              setVerifierOpen(true);
            }}
          />
          <div className="flex-1 relative p-4 lg:p-6 overflow-hidden flex flex-col">
            <div className="flex-1 relative">
              <RadarCanvas
                elapsedMs={interpolatedMs}
                isCrashed={gameState?.phase === 'CRASHED'}
                isFlying={gameState?.phase === 'FLYING'}
              />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                {gameState?.phase === 'FLYING' && (
                  <div className="animate-in zoom-in duration-300">
                    <div className="text-7xl md:text-8xl lg:text-9xl font-black font-mono text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] tracking-tighter">
                      {formatMultiplier(currentMultiplier)}
                    </div>
                  </div>
                )}
                {gameState?.phase === 'PREPARING' && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-amber-500/10 border-t-amber-500 rounded-full animate-spin" />
                    <div className="text-xl font-mono font-bold text-amber-500 tracking-[0.3em] uppercase animate-pulse">
                      Establishing Link
                    </div>
                  </div>
                )}
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end pointer-events-none">
                <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-600 bg-black/60 px-2 py-1.5 rounded border border-zinc-800/50">
                  <Activity className="w-3 h-3 text-amber-500" />
                  <span>NODE: DO_GLOBAL_01 // TPS: 60.00</span>
                </div>
                {gameState?.nextSeedHash && (
                  <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-700 max-w-[120px] md:max-w-none">
                    <Hash className="w-3 h-3" />
                    <span className="truncate">NEXT_HASH: {gameState.nextSeedHash}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 lg:mt-6">
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
        </section>
      </main>
      <footer className="h-8 border-t border-zinc-900 bg-black flex items-center justify-between px-6 text-[9px] font-mono text-zinc-700 uppercase tracking-widest">
        <span>Cloudflare DO Authoritative Logic v4.2.0</span>
        <div className="flex gap-4">
          <span className="flex items-center gap-1"><Terminal className="w-2 h-2" /> Sync Mode: Authoritative</span>
          <span>FPS: 60.0</span>
        </div>
      </footer>
    </div>
  );
}
function Hash(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" x2="20" y1="9" y2="9" />
      <line x1="4" x2="20" y1="15" y2="15" />
      <line x1="10" x2="8" y1="3" y2="21" />
      <line x1="16" x2="14" y1="3" y2="21" />
    </svg>
  );
}