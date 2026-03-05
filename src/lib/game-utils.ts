import { calculateMultiplier, generateCrashPoint } from '@shared/game-logic';
export const GAME_SETTINGS = {
  PREPARATION_TIME: 5000,
  MAX_MULTIPLIER: 1000,
  TICK_RATE: 16,
};
export function getMultiplierFromTime(elapsedMs: number): number {
  return calculateMultiplier(elapsedMs);
}
export function formatMultiplier(val: number): string {
  return val.toFixed(2) + 'x';
}
export function generateRandomCrashPoint(): number {
  return generateCrashPoint();
}
export function getMultiplierColor(val: number): string {
  if (val < 1.2) return 'text-slate-400';
  if (val < 2.0) return 'text-blue-400';
  if (val < 10.0) return 'text-emerald-400';
  return 'text-amber-400';
}