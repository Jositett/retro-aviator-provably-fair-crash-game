import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Coins, Zap, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sounds';
interface CockpitControlsProps {
  balance: number;
  gameState: 'PREPARING' | 'FLYING' | 'CRASHED';
  onPlaceBet: (amount: number, autoCashout: number | null) => void;
  onCashout: () => void;
  currentMultiplier: number;
  hasActiveBet: boolean;
  isWaiting: boolean;
  isCashingOut?: boolean;
}
export function CockpitControls({
  balance,
  gameState,
  onPlaceBet,
  onCashout,
  currentMultiplier,
  hasActiveBet,
  isWaiting,
  isCashingOut = false
}: CockpitControlsProps) {
  const [amount, setAmount] = useState<string>('10.00');
  const [autoCashout, setAutoCashout] = useState<string>('2.00');
  const [useAuto, setUseAuto] = useState(false);
  const handleBet = () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0 || val > balance) return;
    sounds.placeBet();
    onPlaceBet(val, useAuto ? parseFloat(autoCashout) : null);
  };
  const isPreparing = gameState === 'PREPARING';
  const isFlying = gameState === 'FLYING';
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl backdrop-blur-md">
      <div className="flex flex-col gap-4">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-1.5">
            <Coins className="w-3 h-3" /> Bet Amount
          </Label>
          <div className="relative">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={!isPreparing || isWaiting}
              className="bg-black/50 border-zinc-700 text-amber-500 font-mono font-bold h-10 text-base focus:ring-amber-500/50"
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
              {[10, 50, 100].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(v.toFixed(2))}
                  disabled={!isPreparing || isWaiting}
                  className="px-1.5 py-0.5 text-[9px] bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400 transition-colors uppercase font-mono"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <Label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-1.5">
              <Zap className="w-3 h-3" /> Auto Cashout
            </Label>
            <input
              type="checkbox"
              checked={useAuto}
              onChange={(e) => setUseAuto(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-800 text-amber-500 focus:ring-amber-500"
            />
          </div>
          <Input
            type="number"
            value={autoCashout}
            onChange={(e) => setAutoCashout(e.target.value)}
            disabled={!useAuto || !isPreparing || isWaiting}
            className={cn(
              "bg-black/50 border-zinc-700 text-amber-500 font-mono h-10 text-base transition-opacity",
              !useAuto && "opacity-30"
            )}
            placeholder="2.00"
          />
        </div>
      </div>
      <div className="flex flex-col">
        <div className="flex-1 flex items-stretch">
          {!hasActiveBet ? (
            <Button
              disabled={!isPreparing || isWaiting || parseFloat(amount) > balance}
              onClick={handleBet}
              className={cn(
                "flex-1 text-lg font-black uppercase tracking-tighter h-full min-h-[100px] transition-all duration-300",
                isPreparing
                  ? "bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                  : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
              )}
            >
              {isWaiting ? "SECURE_CONN..." : isPreparing ? "Place Bet" : "AWAIT_NODE"}
            </Button>
          ) : (
            <Button
              disabled={!isFlying || isCashingOut}
              onClick={() => { sounds.cashout(); onCashout(); }}
              className={cn(
                "flex-1 text-lg font-black uppercase tracking-tighter h-full min-h-[100px] transition-all duration-300",
                isFlying
                  ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                  : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
              )}
            >
              <div className="flex flex-col items-center">
                <span className="text-xs">{isCashingOut ? 'Securing...' : 'Take Profit'}</span>
                <span className="text-2xl font-mono">${(parseFloat(amount) * currentMultiplier).toFixed(2)}</span>
              </div>
            </Button>
          )}
        </div>
        <div className="mt-2 flex items-center justify-center gap-2 text-[9px] text-zinc-600 uppercase tracking-widest font-mono">
          <ShieldCheck className="w-3 h-3 text-emerald-500/30" /> Provably Fair Protocol v1.0.4
        </div>
      </div>
    </div>
  );
}