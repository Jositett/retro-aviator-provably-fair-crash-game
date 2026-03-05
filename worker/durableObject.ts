import { DurableObject } from "cloudflare:workers";
import type { GameState, Bet, RoundRecord } from '@shared/types';
import { GAME_CONSTANTS, calculateMultiplier, generateProvableCrashPoint, generateSeed, hashSeed } from '@shared/game-logic';
export class GlobalDurableObject extends DurableObject {
  private state: GameState = {
    phase: 'PREPARING',
    startTime: Date.now(),
    serverTime: Date.now(),
    lastCrashPoint: 0,
    history: [],
    activeBets: [],
    currentMultiplier: 1.0,
    nextSeedHash: '',
  };
  private currentServerSeed: string = '';
  private nextServerSeed: string = '';
  private initialized = false;
  constructor(ctx: DurableObjectState, env: any) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      const saved = await this.ctx.storage.get<GameState>("game_state");
      const seeds = await this.ctx.storage.get<{current: string, next: string}>("seeds");
      if (saved) {
        this.state = saved;
        this.state.phase = 'PREPARING';
        this.state.startTime = Date.now();
        this.state.activeBets = [];
      }
      if (seeds) {
        this.currentServerSeed = seeds.current;
        this.nextServerSeed = seeds.next;
      } else {
        this.currentServerSeed = generateSeed();
        this.nextServerSeed = generateSeed();
        await this.ctx.storage.put("seeds", { current: this.currentServerSeed, next: this.nextServerSeed });
      }
      this.state.nextSeedHash = hashSeed(this.nextServerSeed);
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
          this.state.currentMultiplier = 1.0;
        }
      } else if (this.state.phase === 'FLYING') {
        const crashPoint = generateProvableCrashPoint(this.currentServerSeed);
        this.state.currentMultiplier = calculateMultiplier(elapsed);
        // Auto-Cashouts
        for (const bet of this.state.activeBets) {
          if (!bet.cashedOut && bet.autoCashout && this.state.currentMultiplier >= bet.autoCashout) {
            await this.processCashout(bet.userId, bet.autoCashout);
          }
        }
        if (this.state.currentMultiplier >= crashPoint) {
          this.state.phase = 'CRASHED';
          this.state.startTime = now;
          this.state.lastCrashPoint = crashPoint;
          const record: RoundRecord = {
            id: crypto.randomUUID(),
            crashPoint: crashPoint,
            serverSeed: this.currentServerSeed,
            seedHash: hashSeed(this.currentServerSeed),
            timestamp: now
          };
          this.state.history = [record, ...this.state.history].slice(0, 30);
          // Rotate Seeds
          this.currentServerSeed = this.nextServerSeed;
          this.nextServerSeed = generateSeed();
          this.state.nextSeedHash = hashSeed(this.nextServerSeed);
          await this.ctx.storage.put("game_state", this.state);
          await this.ctx.storage.put("seeds", { current: this.currentServerSeed, next: this.nextServerSeed });
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
    return { ...this.state, serverTime: Date.now() };
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
      timestamp: Date.now(),
      cashedOut: false,
      winningAmount: 0
    };
    this.state.activeBets.push(bet);
    return bet;
  }
  async processCashout(userId: string, targetMultiplier?: number): Promise<Bet> {
    if (this.state.phase !== 'FLYING') throw new Error("Game not in flight");
    const bet = this.state.activeBets.find(b => b.userId === userId && !b.cashedOut);
    if (!bet) throw new Error("No active bet found");
    const multiplier = targetMultiplier ?? this.state.currentMultiplier;
    const payout = bet.amount * multiplier;
    bet.multiplier = multiplier;
    bet.payout = payout;
    bet.cashedOut = true;
    bet.winningAmount = payout;
    let balance = await this.getBalance(userId);
    balance += payout;
    await this.ctx.storage.put(`balance_${userId}`, balance);
    return bet;
  }
  async getDemoItems() { return []; }
  async increment() { return 0; }
}