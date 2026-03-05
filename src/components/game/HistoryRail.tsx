import React from 'react';
import { cn } from '@/lib/utils';
import { getMultiplierColor } from '@/lib/game-utils';
import { ShieldCheck, Info } from 'lucide-react';
import type { RoundRecord } from '@shared/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
interface HistoryRailProps {
  history: RoundRecord[];
  onSelectRound?: (round: RoundRecord) => void;
}
export function HistoryRail({ history, onSelectRound }: HistoryRailProps) {
  return (
    <TooltipProvider>
      <div className="w-full h-11 bg-zinc-950/80 border-b border-zinc-800 flex items-center px-4 gap-2 overflow-x-auto no-scrollbar scroll-smooth">
        <div className="flex items-center gap-2 mr-4">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest whitespace-nowrap">
            Last Rounds:
          </span>
          <Info className="w-3 h-3 text-zinc-700" />
        </div>
        {history.length === 0 && (
          <span className="text-[10px] font-mono text-zinc-700 uppercase italic">Awaiting network results...</span>
        )}
        {history.map((record, i) => (
          <Tooltip key={record.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onSelectRound?.(record)}
                className={cn(
                  "group px-2.5 py-1 rounded-md bg-zinc-900/50 border border-zinc-800 text-[11px] font-mono font-bold whitespace-nowrap transition-all hover:bg-zinc-800 hover:border-zinc-700 active:scale-95 flex items-center gap-1.5",
                  getMultiplierColor(record.crashPoint)
                )}
              >
                {record.crashPoint.toFixed(2)}x
                <ShieldCheck className="w-3 h-3 text-zinc-600 group-hover:text-amber-500/50 transition-colors" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-zinc-900 border-zinc-800 text-[10px] font-mono text-zinc-400">
              Click to verify SHA-256
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}