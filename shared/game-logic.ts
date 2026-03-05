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
export function hexFromBytes(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return hexFromBytes(new Uint8Array(hashBuffer));
}
/**
 * f(t) = 1.0 + 0.01 * (e^(k*t) - 1)
 * Capped at MAX_MULTIPLIER and strictly floored to 2 decimal places to ensure client/server sync.
 */
export function calculateMultiplier(elapsedMs: number): number {
  if (elapsedMs <= 0) return 1.0;
  const raw = 1.0 + 0.01 * (Math.exp(GAME_CONSTANTS.GROWTH_EXPONENT * elapsedMs) - 1);
  const multiplier = Math.min(raw, GAME_CONSTANTS.MAX_MULTIPLIER);
  // Ensure the decimal rounding is identical everywhere
  return Math.floor(multiplier * 100) / 100;
}
/**
 * Deterministically derives a crash point from a server seed using SHA-256.
 * Pattern follows standard crash industry algorithms.
 */
export async function generateProvableCrashPoint(seed: string): Promise<number> {
  try {
    const hash = await sha256(seed);
    const hex = hash.substring(0, 13);
    const r = parseInt(hex, 16);
    const e = Math.pow(2, 52);
    // House edge (approx 3%)
    if (r % 33 === 0) return 1.00;
    const multiplier = Math.floor((100 * e - r) / (e - r)) / 100;
    return Math.max(1.00, Math.min(multiplier, GAME_CONSTANTS.MAX_MULTIPLIER));
  } catch (err) {
    console.error("Crash point generation error:", err);
    return 1.00; // Fail-safe
  }
}
export async function verifyRound(seed: string, expectedHash: string): Promise<boolean> {
  const hash = await sha256(seed);
  return hash === expectedHash;
}
export async function generateSeed(): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return hexFromBytes(bytes);
}
export async function hashSeed(seed: string): Promise<string> {
  return sha256(seed);
}