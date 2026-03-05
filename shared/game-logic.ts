/**
 * Authoritative game physics and constants shared between client and server.
 */
export const GAME_CONSTANTS = {
  PREPARATION_MS: 5000,
  COOLDOWN_MS: 3000,
  TICK_RATE_MS: 100, // Backend logic tick
  MAX_MULTIPLIER: 1000000,
  GROWTH_EXPONENT: 0.0005,
};
/**
 * f(t) = 1.0 + 0.01 * (e^(0.0005 * t) - 1)
 * @param elapsedMs Time since flight started
 */
export function calculateMultiplier(elapsedMs: number): number {
  if (elapsedMs <= 0) return 1.0;
  const multiplier = 1.0 + 0.01 * (Math.exp(GAME_CONSTANTS.GROWTH_EXPONENT * elapsedMs) - 1);
  return Math.floor(multiplier * 100) / 100;
}
/**
 * Inverse of calculateMultiplier: gets time required to reach a multiplier.
 * Used for server-side crash point calculation.
 */
export function getTimeForMultiplier(multiplier: number): number {
  if (multiplier <= 1.0) return 0;
  // m = 1 + 0.01 * (e^(k*t) - 1)
  // (m - 1) / 0.01 + 1 = e^(k*t)
  // ln((m - 1) * 100 + 1) / k = t
  return Math.log((multiplier - 1) * 100 + 1) / GAME_CONSTANTS.GROWTH_EXPONENT;
}
export function generateCrashPoint(): number {
  const e = 2 ** 32;
  const h = Math.floor(Math.random() * e);
  if (h % 33 === 0) return 1.0;
  const val = Math.floor((100 * e - h) / (e - h)) / 100;
  return Math.max(1.0, val);
}