import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, Wallet, CheckCircle2 } from 'lucide-react';
import type { Bet } from '@shared/types';
import { cn } from '@/lib/utils';
interface LiveBetsTableProps {
  activeBets: Bet[];
}
export function LiveBetsTable({ activeBets }: LiveBetsTableProps) {
  const totalBet = activeBets.reduce((acc, b) => acc + b.amount, 0);
  return (
    <div className="flex flex-col h-full bg-zinc-950/30 border-l border-zinc-800">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/40">
        <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
          <User className="w-3 h-3 text-amber-500" /> Live Bets
        </h3>
        <span className="text-[10px] font-mono text-zinc-600">Total: {totalBet.toFixed(2)}</span>
      </div>
      <div className="flex-1 overflow-auto no-scrollbar">
        <Table>
          <TableHeader className="bg-zinc-900/20 sticky top-0 z-10 backdrop-blur-sm">
            <TableRow className="hover:bg-transparent border-zinc-800">
              <TableHead className="text-[10px] uppercase font-mono h-8 text-zinc-500">Player</TableHead>
              <TableHead className="text-[10px] uppercase font-mono h-8 text-zinc-500 text-right">Bet</TableHead>
              <TableHead className="text-[10px] uppercase font-mono h-8 text-zinc-500 text-right">Win</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeBets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-[10px] font-mono text-zinc-700 uppercase italic">
                  Waiting for players...
                </TableCell>
              </TableRow>
            ) : (
              activeBets.map((bet, i) => (
                <TableRow 
                  key={`${bet.userId}-${i}`} 
                  className={cn(
                    "border-zinc-900 transition-colors",
                    bet.cashedOut ? "bg-emerald-500/10 hover:bg-emerald-500/20" : "hover:bg-zinc-800/40"
                  )}
                >
                  <TableCell className="py-2 font-mono text-[11px] text-zinc-300 flex items-center gap-1.5">
                    {bet.userName}
                    {bet.cashedOut && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                  </TableCell>
                  <TableCell className="py-2 font-mono text-[11px] text-zinc-400 text-right">
                    {bet.amount.toFixed(2)}
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    {bet.cashedOut ? (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-emerald-500 font-bold">{bet.multiplier?.toFixed(2)}x</span>
                        <span className="text-[10px] text-zinc-400">${bet.winningAmount.toFixed(2)}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-zinc-600">---</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="p-3 border-t border-zinc-800 bg-zinc-900/40">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <Wallet className="w-3 h-3 text-amber-500/50" />
          <span className="animate-pulse">Authoritative Node Sync...</span>
        </div>
      </div>
    </div>
  );
}