import CryptoJS from 'crypto-js';
/**
 * Authoritative game physics and constants shared between client and server.
 */
export const GAME_CONSTANTS = {
  PREPARATION_MS: 5000,
  COOLDOWN_MS: 3000,
  TICK_RATE_MS: 100, 
  MAX_MULTIPLIER: 1000000,
  GROWTH_EXPONENT: 0.0005,
};
/**
 * f(t) = 1.0 + 0.01 * (e^(k*t) - 1)
 */
export function calculateMultiplier(elapsedMs: number): number {
  if (elapsedMs <= 0) return 1.0;
  const multiplier = 1.0 + 0.01 * (Math.exp(GAME_CONSTANTS.GROWTH_EXPONENT * elapsedMs) - 1);
  return Math.floor(multiplier * 100) / 100;
}
/**
 * Deterministically derives a crash point from a server seed using SHA-256.
 * logic: hex -> decimal -> multiplier
 */
export function generateProvableCrashPoint(seed: string): number {
  const hash = CryptoJS.SHA256(seed).toString();
  // Take first 52 bits (13 hex chars)
  const hex = hash.substring(0, 13);
  const r = parseInt(hex, 16);
  const e = Math.pow(2, 52);
  // House edge 3% (approx 1 in 33 rounds crash at 1.00x)
  if (r % 33 === 0) return 1.00;
  const multiplier = Math.floor((100 * e - r) / (e - r)) / 100;
  return Math.max(1.00, multiplier);
}
export function verifyRound(seed: string, expectedHash: string): boolean {
  return CryptoJS.SHA256(seed).toString() === expectedHash;
}
export function generateSeed(): string {
  return CryptoJS.lib.WordArray.random(32).toString();
}
export function hashSeed(seed: string): string {
  return CryptoJS.SHA256(seed).toString();
}