export type GamePhase = 'PREPARING' | 'FLYING' | 'CRASHED';
export interface Bet {
  userId: string;
  userName: string;
  amount: number;
  multiplier: number | null;
  autoCashout: number | null;
  payout: number | null;
  timestamp: number;
}
export interface GameState {
  phase: GamePhase;
  startTime: number; // Server timestamp when current phase started
  serverTime: number; // Current server timestamp
  lastCrashPoint: number;
  history: number[];
  activeBets: Bet[];
  currentMultiplier: number;
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