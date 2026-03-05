export type GamePhase = 'PREPARING' | 'FLYING' | 'CRASHED';
export interface RoundRecord {
  id: string;
  crashPoint: number;
  serverSeed: string; // Revealed after round
  seedHash: string;   // Shown during/before round
  timestamp: number;
}
export interface Bet {
  userId: string;
  userName: string;
  amount: number;
  multiplier: number | null;
  autoCashout: number | null;
  payout: number | null;
  timestamp: number;
  cashedOut: boolean;
  winningAmount: number;
}
export interface GameState {
  phase: GamePhase;
  startTime: number; 
  serverTime: number; 
  lastCrashPoint: number;
  history: RoundRecord[];
  activeBets: Bet[];
  currentMultiplier: number;
  nextSeedHash: string;
}
export interface UserBalance {
  balance: number;
  userId: string;
}
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
export interface DemoItem {
  id: string;
  name: string;
  value: number;
}