import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Hash, Terminal, CheckCircle2, XCircle } from 'lucide-react';
import { generateProvableCrashPoint, verifyRound } from '@shared/game-logic';
import type { RoundRecord } from '@shared/types';
import { cn } from '@/lib/utils';
interface VerifierModalProps {
  round: RoundRecord | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}
export function VerifierModal({ round, isOpen, onOpenChange }: VerifierModalProps) {
  const [seed, setSeed] = useState('');
  const [hash, setHash] = useState('');
  const [result, setResult] = useState<{ crashPoint: number; isValid: boolean } | null>(null);
  useEffect(() => {
    if (round) {
      setSeed(round.serverSeed || '');
      setHash(round.seedHash || '');
    } else {
      setSeed('');
      setHash('');
      setResult(null);
    }
  }, [round, isOpen]);
  const handleVerify = async () => {
    if (!seed || !hash) return;
    try {
      const calculatedPoint = await generateProvableCrashPoint(seed);
      const isValid = await verifyRound(seed, hash);
      setResult({ crashPoint: calculatedPoint, isValid });
    } catch (e) {
      console.error("Verification failed", e);
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden shadow-2xl">
        <div className="p-6 space-y-6">
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center gap-2 text-amber-500 font-mono uppercase tracking-widest text-lg">
              <ShieldCheck className="w-6 h-6" /> Provably Fair Verifier
            </DialogTitle>
            <DialogDescription className="text-zinc-500 font-mono text-xs leading-relaxed">
              Verify the mathematical integrity of round outcomes using SHA-256. 
              The server seed reveals the pre-calculated crash point.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-mono text-zinc-500 tracking-widest">Server Seed (Revealed)</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <Input
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="Revealed seed for completed round"
                  className="bg-black/50 border-zinc-800 font-mono text-xs pl-10 focus:ring-amber-500/40 h-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-mono text-zinc-500 tracking-widest">Round Hash (Encrypted)</Label>
              <Input
                value={hash}
                onChange={(e) => setHash(e.target.value)}
                placeholder="SHA-256 hash shown before round"
                className="bg-black/50 border-zinc-800 font-mono text-xs focus:ring-amber-500/40 h-11"
              />
            </div>
            <Button
              onClick={handleVerify}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold uppercase tracking-widest h-12 transition-all active:scale-[0.98]"
            >
              Verify Integrity
            </Button>
          </div>
          {result && (
            <div className={cn(
              "p-5 rounded-lg border font-mono animate-in slide-in-from-bottom-2 duration-300",
              result.isValid ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"
            )}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase text-zinc-500 flex items-center gap-2">
                  <Terminal className="w-3 h-3" /> System Log
                </span>
                {result.isValid ? (
                  <span className="text-xs text-emerald-500 font-bold flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 rounded">
                    <CheckCircle2 className="w-3 h-3" /> VERIFIED
                  </span>
                ) : (
                  <span className="text-xs text-red-500 font-bold flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 rounded">
                    <XCircle className="w-3 h-3" /> INVALID
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-[11px] text-zinc-500 uppercase tracking-tighter">Derived Multiplier Outcome:</p>
                <div className="flex items-baseline gap-2">
                  <p className={cn(
                    "text-4xl font-black italic tracking-tighter",
                    result.isValid ? "text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" : "text-red-500"
                  )}>
                    {result.crashPoint.toFixed(2)}x
                  </p>
                </div>
                <div className="pt-2 border-t border-zinc-800/50 mt-2">
                  <p className="text-[9px] text-zinc-600 break-all leading-tight font-mono">
                    VERIFICATION_ID: {crypto.randomUUID().toUpperCase()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}