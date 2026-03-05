import { DurableObject } from "cloudflare:workers";
import type { GameState, GamePhase, Bet, UserBalance } from '@shared/types';
import { GAME_CONSTANTS, calculateMultiplier, generateCrashPoint, getTimeForMultiplier } from '@shared/game-logic';
export class GlobalDurableObject extends DurableObject {
  private state: GameState = {
    phase: 'PREPARING',
    startTime: Date.now(),
    serverTime: Date.now(),
    lastCrashPoint: 0,
    history: [],
    activeBets: [],
    currentMultiplier: 1.0,
  };
  private crashPoint: number = 2.0;
  private initialized = false;
  constructor(ctx: DurableObjectState, env: any) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      const saved = await this.ctx.storage.get<GameState>("game_state");
      if (saved) {
        this.state = saved;
        // Reset to preparing on restart for safety
        this.state.phase = 'PREPARING';
        this.state.startTime = Date.now();
      }
      this.initialized = true;
      this.runLoop();
    });
  }
  private async runLoop() {
    while (true) {
      const now = Date.now();
      this.state.serverTime = now;
      const elapsed = now - this.state.startTime;
      if (this.state.phase === 'PREPARING') {
        if (elapsed >= GAME_CONSTANTS.PREPARATION_MS) {
          this.state.phase = 'FLYING';
          this.state.startTime = now;
          this.crashPoint = generateCrashPoint();
          this.state.currentMultiplier = 1.0;
        }
      } else if (this.state.phase === 'FLYING') {
        this.state.currentMultiplier = calculateMultiplier(elapsed);
        // Check for Auto-Cashouts
        for (const bet of this.state.activeBets) {
          if (!bet.payout && bet.autoCashout && this.state.currentMultiplier >= bet.autoCashout) {
            await this.processCashout(bet.userId, bet.autoCashout);
          }
        }
        if (this.state.currentMultiplier >= this.crashPoint) {
          this.state.phase = 'CRASHED';
          this.state.startTime = now;
          this.state.lastCrashPoint = this.crashPoint;
          this.state.history = [this.crashPoint, ...this.state.history].slice(0, 50);
          this.state.activeBets = []; // Reset active bets (lost)
          await this.ctx.storage.put("game_state", this.state);
        }
      } else if (this.state.phase === 'CRASHED') {
        if (elapsed >= GAME_CONSTANTS.COOLDOWN_MS) {
          this.state.phase = 'PREPARING';
          this.state.startTime = now;
          this.state.activeBets = [];
          this.state.currentMultiplier = 1.0;
        }
      }
      await new Promise(resolve => setTimeout(resolve, GAME_CONSTANTS.TICK_RATE_MS));
    }
  }
  async getGameState(): Promise<GameState> {
    this.state.serverTime = Date.now();
    return this.state;
  }
  async getBalance(userId: string): Promise<number> {
    return (await this.ctx.storage.get<number>(`balance_${userId}`)) ?? 1000.00;
  }
  async placeBet(userId: string, userName: string, amount: number, autoCashout: number | null): Promise<Bet> {
    if (this.state.phase !== 'PREPARING') throw new Error("Betting closed");
    let balance = await this.getBalance(userId);
    if (balance < amount) throw new Error("Insufficient balance");
    balance -= amount;
    await this.ctx.storage.put(`balance_${userId}`, balance);
    const bet: Bet = {
      userId,
      userName,
      amount,
      autoCashout,
      multiplier: null,
      payout: null,
      timestamp: Date.now()
    };
    this.state.activeBets.push(bet);
    return bet;
  }
  async processCashout(userId: string, targetMultiplier?: number): Promise<Bet> {
    if (this.state.phase !== 'FLYING') throw new Error("Game not in flight");
    const betIndex = this.state.activeBets.findIndex(b => b.userId === userId && !b.payout);
    if (betIndex === -1) throw new Error("No active bet found");
    const bet = this.state.activeBets[betIndex];
    const multiplier = targetMultiplier ?? this.state.currentMultiplier;
    // Safety check: Cannot cashout above current server multiplier (unless auto-cashout triggered)
    if (!targetMultiplier && multiplier > this.state.currentMultiplier) {
        throw new Error("Invalid cashout multiplier");
    }
    const payout = bet.amount * multiplier;
    bet.multiplier = multiplier;
    bet.payout = payout;
    let balance = await this.getBalance(userId);
    balance += payout;
    await this.ctx.storage.put(`balance_${userId}`, balance);
    return bet;
  }
  // Fallback for demo items from template
  async getDemoItems() { return []; }
  async increment() { return 0; }
}