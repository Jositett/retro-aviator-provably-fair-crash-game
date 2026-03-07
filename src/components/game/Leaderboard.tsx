import React, { useState, useEffect } from 'react';
import { Trophy, X, TrendingUp, Award } from 'lucide-react';
import { ApiResponse, type UserStats } from '@shared/types';
import { cn } from '@/lib/utils';

interface LeaderboardProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function Leaderboard({ isOpen, onOpenChange }: LeaderboardProps) {
  const [stats, setStats] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard();
    }
  }, [isOpen]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leaderboard');
      const json = await res.json() as ApiResponse<UserStats[]>;
      if (json.success && json.data) {
        setStats(json.data);
      }
    } catch (e) {
      console.error('Failed to fetch leaderboard:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-wider font-mono">Leaderboard</h2>
              <p className="text-[10px] text-zinc-500 font-mono uppercase">Top Players</p>
            </div>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
            </div>
          ) : stats.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <Award className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="font-mono text-sm">No players yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.map((user, index) => (
                <div key={user.userId} className={cn(
                  "flex items-center gap-4 p-3 rounded-xl border",
                  index === 0 ? "bg-amber-500/10 border-amber-500/30" :
                  index === 1 ? "bg-zinc-400/10 border-zinc-400/30" :
                  index === 2 ? "bg-orange-700/10 border-orange-700/30" :
                  "bg-zinc-800/30 border-zinc-700/50"
                )}>
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center font-black font-mono text-sm",
                    index === 0 ? "bg-amber-500 text-black" :
                    index === 1 ? "bg-zinc-400 text-black" :
                    index === 2 ? "bg-orange-700 text-white" :
                    "bg-zinc-700 text-zinc-300"
                  )}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-mono text-sm font-bold text-white">{user.userName}</p>
                    <p className="text-[10px] text-zinc-500 font-mono">{user.totalBets} bets</p>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "font-black font-mono",
                      user.totalWinnings >= 0 ? "text-emerald-400" : "text-red-400"
                    )}>
                      {user.totalWinnings >= 0 ? '+' : ''}${Math.abs(user.totalWinnings).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-zinc-500 font-mono flex items-center gap-1 justify-end">
                      <TrendingUp className="w-3 h-3" />
                      {user.highestMultiplier.toFixed(2)}x
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
