import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, Wallet } from 'lucide-react';
interface BetRecord {
  user: string;
  amount: number;
  multiplier: number | null;
  payout: number | null;
}
const MOCK_BETS: BetRecord[] = [
  { user: 'CyberPunt', amount: 45.0, multiplier: null, payout: null },
  { user: 'NeonRider', amount: 120.0, multiplier: 2.45, payout: 294.0 },
  { user: 'BitWizard', amount: 10.0, multiplier: null, payout: null },
  { user: 'VoltHunter', amount: 250.0, multiplier: 1.15, payout: 287.5 },
  { user: 'RetroGamer', amount: 5.0, multiplier: null, payout: null },
];
export function LiveBetsTable() {
  return (
    <div className="flex flex-col h-full bg-zinc-950/30 border-l border-zinc-800">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/40">
        <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
          <User className="w-3 h-3 text-amber-500" /> Live Bets
        </h3>
        <span className="text-[10px] font-mono text-zinc-600">Total: 1,420.50</span>
      </div>
      <div className="flex-1 overflow-auto no-scrollbar">
        <Table>
          <TableHeader className="bg-zinc-900/20">
            <TableRow className="hover:bg-transparent border-zinc-800">
              <TableHead className="text-[10px] uppercase font-mono h-8 text-zinc-500">Player</TableHead>
              <TableHead className="text-[10px] uppercase font-mono h-8 text-zinc-500 text-right">Bet</TableHead>
              <TableHead className="text-[10px] uppercase font-mono h-8 text-zinc-500 text-right">Win</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_BETS.map((bet, i) => (
              <TableRow key={i} className="border-zinc-900 hover:bg-zinc-800/40 transition-colors">
                <TableCell className="py-2 font-mono text-[11px] text-zinc-300">
                  {bet.user}
                </TableCell>
                <TableCell className="py-2 font-mono text-[11px] text-zinc-400 text-right">
                  {bet.amount.toFixed(2)}
                </TableCell>
                <TableCell className="py-2 text-right">
                  {bet.multiplier ? (
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-emerald-500 font-bold">{bet.multiplier}x</span>
                      <span className="text-[10px] text-zinc-400">{bet.payout?.toFixed(2)}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-zinc-600">--</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="p-3 border-t border-zinc-800 bg-zinc-900/40">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <Wallet className="w-3 h-3" />
          <span>Syncing with Node...</span>
        </div>
      </div>
    </div>
  );
}