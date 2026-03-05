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
      setSeed(round.serverSeed);
      setHash(round.seedHash);
    }
  }, [round]);
  const handleVerify = () => {
    if (!seed || !hash) return;
    const calculatedPoint = generateProvableCrashPoint(seed);
    const isValid = verifyRound(seed, hash);
    setResult({ crashPoint: calculatedPoint, isValid });
  };
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-zinc-950 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-500 font-mono uppercase tracking-widest">
            <ShieldCheck className="w-5 h-5" /> Provably Fair Verifier
          </DialogTitle>
          <DialogDescription className="text-zinc-500 font-mono text-xs">
            Verify the mathematical integrity of round outcomes using SHA-256.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-mono text-zinc-500">Server Seed (Revealed)</Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <Input 
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                placeholder="Enter Server Seed"
                className="bg-black/50 border-zinc-800 font-mono text-xs pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-mono text-zinc-500">Round Hash (Salt)</Label>
            <Input 
              value={hash}
              onChange={(e) => setHash(e.target.value)}
              placeholder="Enter Round Hash"
              className="bg-black/50 border-zinc-800 font-mono text-xs"
            />
          </div>
          <Button 
            onClick={handleVerify}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold uppercase tracking-widest h-12"
          >
            Verify Outcome
          </Button>
          {result && (
            <div className={cn(
              "p-4 rounded border font-mono animate-in zoom-in duration-300",
              result.isValid ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"
            )}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase text-zinc-500 flex items-center gap-2">
                  <Terminal className="w-3 h-3" /> Verification Log
                </span>
                {result.isValid ? (
                  <span className="text-xs text-emerald-500 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> VERIFIED
                  </span>
                ) : (
                  <span className="text-xs text-red-500 flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> INVALID SEED
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-zinc-400 italic">Resulting Crash Point:</p>
                <p className={cn(
                  "text-3xl font-black italic",
                  result.isValid ? "text-white" : "text-red-500"
                )}>
                  {result.crashPoint.toFixed(2)}x
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}