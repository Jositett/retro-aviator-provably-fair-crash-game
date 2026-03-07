import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useZoom } from '@/hooks/use-zoom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { RadarCanvas } from '@/components/game/RadarCanvas';
import { CockpitControls } from '@/components/game/CockpitControls';
import { HistoryRail } from '@/components/game/HistoryRail';
import { LiveBetsTable } from '@/components/game/LiveBetsTable';
import { VerifierModal } from '@/components/game/VerifierModal';
import { Leaderboard } from '@/components/game/Leaderboard';
import { PlaneSelector } from '@/components/game/PlaneSelector';
import { PreparingCountdown } from '@/components/game/PreparingCountdown';
import { CrashDisplay } from '@/components/game/CrashDisplay';
import { calculateMultiplier } from '@shared/game-logic';
import { formatMultiplier } from '@/lib/game-utils';
import { sounds } from '@/lib/sounds';
import { Toaster, toast } from 'sonner';
import { Zap, ShieldCheck, Trophy } from 'lucide-react';
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
  const zoom = useZoom();
  const scale = 1 / zoom;

  const [balance, setBalance] = useState(1000.00);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isWaitingForBet, setIsWaitingForBet] = useState(false);
  const [myBet, setMyBet] = useState<Bet | null>(null);
  const [verifierOpen, setVerifierOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [planeSelectorOpen, setPlaneSelectorOpen] = useState(false);
  const [selectedRound, setSelectedRound] = useState<RoundRecord | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [displayedMultiplier, setDisplayedMultiplier] = useState(1.0);
  const [isCashingOut, setIsCashingOut] = useState(false);
  const serverOffsetRef = useRef<number>(0);
  const offsetBufferRef = useRef<number[]>([]);
  const pollDelayRef = useRef(1000);
  const consecFailsRef = useRef(0);
  const timeoutRef = useRef<number | undefined>();
  const gameStateRef = useRef<GameState | null>(null);
  const interpolatedMsRef = useRef(0);
  const multiplierDisplayRef = useRef<HTMLDivElement>(null);
  const lastMultiplierUpdateRef = useRef(0);
  const lastDomMultiplierUpdateRef = useRef(0);
  const fetchStateQueueRef = useRef(false);
  const lastFetchedPhaseRef = useRef<string>('IDLE');
  const lastPhaseRef = useRef<string>('IDLE');
  const fetchState = useCallback(async () => {
    // Skip if already fetching to prevent queue backup
    if (fetchStateQueueRef.current) return;
    fetchStateQueueRef.current = true;

    try {
      const start = Date.now();
      const res = await fetch('/api/game/state', {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 100)}`);
      }
      const end = Date.now();
      const latency = (end - start) / 2;
      const json = await res.json() as ApiResponse<GameState>;
      if (!json.success || !json.data) {
        throw new Error(json.error || 'Invalid API response');
      }
      
      // Only update state if phase changed (reduces re-renders)
      if (json.data.phase !== lastFetchedPhaseRef.current) {
        lastFetchedPhaseRef.current = json.data.phase;
        if (json.data.phase === 'FLYING' && lastPhaseRef.current !== 'FLYING') {
          sounds.flightStart();
        }
        if (json.data.phase === 'CRASHED' && lastPhaseRef.current !== 'CRASHED') {
          sounds.crash();
        }
        lastPhaseRef.current = json.data.phase;
        setGameState(json.data);
      } else {
        // Update ref directly to avoid state update
        gameStateRef.current = json.data;
      }
      
      setIsConnected(true);
      consecFailsRef.current = 0;
      pollDelayRef.current = 800;
      
      if (json.data.serverTime) {
        const newOffset = json.data.serverTime - (end - latency);
        offsetBufferRef.current.push(newOffset);
        if (offsetBufferRef.current.length > 5) offsetBufferRef.current.shift();
        serverOffsetRef.current = offsetBufferRef.current.reduce((a, b) => a + b, 0) / offsetBufferRef.current.length;
      }
    } catch (err) {
      console.error("[SYNC ERROR]", err instanceof Error ? err.message : String(err), err);
      setIsConnected(false);
      consecFailsRef.current++;
      pollDelayRef.current = Math.min(10000, 1000 * Math.pow(1.5, consecFailsRef.current));
    } finally {
      fetchStateQueueRef.current = false;
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
      // Background balance fetch failures are non-critical
    }
  }, []);
  useEffect(() => {
    let isActive = true;
    const tick = async () => {
      if (!isActive) return;
      await fetchState();
      timeoutRef.current = setTimeout(tick, pollDelayRef.current);
    };
    tick();
    const balanceInterval = setInterval(fetchBalance, 5000);
    fetchBalance();
    return () => {
      isActive = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      clearInterval(balanceInterval);
    };
  }, [fetchState, fetchBalance]);
  
  useEffect(() => {
    if (!gameState) return;
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    let frame: number;
    const loop = (timestamp: number) => {
      const gs = gameStateRef.current;
      if (gs) {
        const now = Date.now() + serverOffsetRef.current;
        const elapsed = gs.phase === 'FLYING'
          ? Math.max(0, now - gs.startTime)
          : (gs.phase === 'CRASHED' ? (gs.serverTime - gs.startTime) : 0);
        
        interpolatedMsRef.current = elapsed;
        
        const currentM = calculateMultiplier(elapsed);
        const displayM = gs.phase === 'CRASHED'
          ? gs.lastCrashPoint
          : gs.phase === 'FLYING' && gs.currentMultiplier > 1
            ? gs.currentMultiplier
            : currentM;
        
        // Keep DOM writes to ~30fps to reduce layout/reflow pressure.
        if (multiplierDisplayRef.current && gs.phase === 'FLYING' && timestamp - lastDomMultiplierUpdateRef.current > 33) {
          multiplierDisplayRef.current.textContent = formatMultiplier(displayM);
          const scale = 1 + Math.min(displayM - 1, 100) * 0.005;
          multiplierDisplayRef.current.style.transform = `scale(${scale})`;
          lastDomMultiplierUpdateRef.current = timestamp;
        }
        
        // Throttle React state updates to ~10fps for CockpitControls
        if (timestamp - lastMultiplierUpdateRef.current > 100) {
          setDisplayedMultiplier(displayM);
          lastMultiplierUpdateRef.current = timestamp;
        }
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);
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
    if (!myBet || !gameState || gameState.phase !== 'FLYING' || isCashingOut) return;
    setIsCashingOut(true);
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
    } finally {
      setIsCashingOut(false);
    }
  }, [myBet, gameState, fetchBalance, isCashingOut]);
  useEffect(() => {
    if (gameState?.phase === 'PREPARING') setMyBet(null);
  }, [gameState?.phase]);
  const isCrashed = gameState?.phase === 'CRASHED';
  const flightPhase = isConnected ? (gameState?.phase || 'IDLE') : 'OFFLINE';
  return (
    <div
      className="h-screen bg-[#020202] text-zinc-100 font-sans selection:bg-amber-500/30 overflow-hidden flex flex-col"
      style={{
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        width: `${zoom * 100}%`,
        height: `${zoom * 100}%`,
      }}
    >
      <Toaster position="top-right" richColors theme="dark" />
      <ThemeToggle className="top-4 right-4" />
      <VerifierModal round={selectedRound} isOpen={verifierOpen} onOpenChange={setVerifierOpen} />
      <Leaderboard isOpen={leaderboardOpen} onOpenChange={setLeaderboardOpen} />
      <PlaneSelector isOpen={planeSelectorOpen} onOpenChange={setPlaneSelectorOpen} />
      <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
        <header className="shrink-0 mb-4 flex flex-col sm:flex-row flex-wrap items-center justify-between gap-4 bg-zinc-950/80 p-4 rounded-2xl border border-zinc-800/50 backdrop-blur-xl shadow-2xl">
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
          <div className="flex items-center gap-4 flex-wrap w-full sm:w-auto">
            <button onClick={() => setPlaneSelectorOpen(true)} className="flex items-center gap-2 text-[10px] font-mono text-amber-500 font-bold uppercase tracking-widest hover:bg-amber-500/10 px-4 py-2 rounded-xl border border-amber-500/30 transition-all">
              <Zap className="w-4 h-4" /> <span className="hidden md:inline">Plane</span>
            </button>
            <button onClick={() => setLeaderboardOpen(true)} className="flex items-center gap-2 text-[10px] font-mono text-amber-500 font-bold uppercase tracking-widest hover:bg-amber-500/10 px-4 py-2 rounded-xl border border-amber-500/30 transition-all">
              <Trophy className="w-4 h-4" /> <span className="hidden md:inline">Rank</span>
            </button>
            <div className="flex-1 sm:flex-none flex flex-col items-end px-4 border-b sm:border-b-0 sm:border-r border-zinc-800">
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
          <aside className="hidden lg:block lg:col-span-3 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950/50 shadow-inner">
            <LiveBetsTable activeBets={gameState?.activeBets || []} />
          </aside>
          <section className="lg:col-span-9 flex flex-col gap-4">
            <div className="flex-1 flex flex-col bg-zinc-900/20 rounded-2xl border border-zinc-800/80 overflow-hidden relative backdrop-blur-sm min-h-0">
              <HistoryRail history={gameState?.history || []} onSelectRound={setSelectedRound} />
              <div className="flex-1 relative flex flex-col p-4 min-h-0">
                <div className="flex-1 relative min-h-0">
                  <RadarCanvas
                    elapsedMs={interpolatedMsRef.current}
                    isCrashed={isCrashed}
                    isFlying={gameState?.phase === 'FLYING'}
                    crashPoint={gameState?.lastCrashPoint}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
                    {gameState?.phase === 'FLYING' && (
                      <div 
                        ref={multiplierDisplayRef}
                        className="text-7xl md:text-9xl font-black font-mono text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.4)] tracking-tighter will-change-transform"
                        style={{ backfaceVisibility: 'hidden', perspective: '1000px' }}
                      >
                        {formatMultiplier(displayedMultiplier)}
                      </div>
                    )}
                    {isCrashed && (
                      <CrashDisplay 
                        crashPoint={gameState.lastCrashPoint}
                        startTime={gameState.startTime}
                        serverTime={gameState.serverTime}
                        serverOffset={serverOffsetRef.current}
                      />
                    )}
                    {gameState?.phase === 'PREPARING' && (
                      <PreparingCountdown 
                        startTime={gameState.startTime} 
                        serverTime={gameState.serverTime} 
                        serverOffset={serverOffsetRef.current}
                        preparationMs={gameState.preparationMs}
                      />
                    )}
                    {!isConnected && (
                      <div className="bg-black/80 px-4 py-2 rounded border border-red-500 text-red-500 font-mono text-xs uppercase animate-pulse">
                        Synchronizing with network node...
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
                    currentMultiplier={displayedMultiplier}
                    hasActiveBet={!!myBet}
                    isWaiting={isWaitingForBet}
                    isCashingOut={isCashingOut}
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