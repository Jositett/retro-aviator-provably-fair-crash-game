/**
 * Utility functions for the Retro Aviator game engine.
 */
export const GAME_SETTINGS = {
  PREPARATION_TIME: 5000, // 5 seconds to bet
  MAX_MULTIPLIER: 1000,
  TICK_RATE: 16, // ~60fps
  CURVE_STEEPNESS: 0.0001,
};
/**
 * Calculates the current multiplier based on elapsed flight time (ms)
 * Uses an exponential growth formula similar to real crash games.
 * f(t) = 1.0 + 0.01 * e^(0.0006 * t) - where t is ms
 */
export function getMultiplierFromTime(elapsedMs: number): number {
  if (elapsedMs <= 0) return 1.0;
  // This formula provides a nice curve that starts slow and accelerates
  const multiplier = 1.0 + 0.01 * (Math.exp(0.0005 * elapsedMs) - 1);
  return Math.floor(multiplier * 100) / 100;
}
/**
 * Formats a number to 2 decimal places with 'x' suffix
 */
export function formatMultiplier(val: number): string {
  return val.toFixed(2) + 'x';
}
/**
 * Generates a random crash point for simulation.
 * In a real game, this would be determined by the server using SHA-256.
 */
export function generateRandomCrashPoint(): number {
  const e = 2 ** 32;
  const h = Math.floor(Math.random() * e);
  if (h % 33 === 0) return 1.0;
  return Math.floor((100 * e - h) / (e - h)) / 100;
}
/**
 * Maps a multiplier value to a color category
 */
export function getMultiplierColor(val: number): string {
  if (val < 1.2) return 'text-slate-400';
  if (val < 2.0) return 'text-blue-400';
  if (val < 10.0) return 'text-emerald-400';
  return 'text-amber-400';
}