import React from 'react';
import { cn } from '@/lib/utils';
import { getMultiplierColor } from '@/lib/game-utils';
interface HistoryRailProps {
  history: number[];
}
export function HistoryRail({ history }: HistoryRailProps) {
  return (
    <div className="w-full h-10 bg-zinc-950/50 border-y border-zinc-800 flex items-center px-4 gap-2 overflow-x-auto no-scrollbar">
      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mr-2 whitespace-nowrap">
        History:
      </span>
      {history.length === 0 && (
        <span className="text-[10px] font-mono text-zinc-700 uppercase italic">No data recorded...</span>
      )}
      {history.map((val, i) => (
        <div
          key={i}
          className={cn(
            "px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-mono font-bold whitespace-nowrap",
            getMultiplierColor(val)
          )}
        >
          {val.toFixed(2)}x
        </div>
      ))}
    </div>
  );
}