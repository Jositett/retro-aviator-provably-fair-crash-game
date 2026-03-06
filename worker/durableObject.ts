import { DurableObject } from "cloudflare:workers";
import type { GameState, Bet, RoundRecord } from '../shared/types';
import { GAME_CONSTANTS, calculateMultiplier, generateProvableCrashPoint, generateSeed, hashSeed } from '../shared/game-logic';
export class GlobalDurableObject extends DurableObject {
  state!: any;
  env: any;
  
  private gameState: GameState = {
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
  private currentCrashPoint: number = 1.0;
  private initialized = false;
  constructor(state: any, env: any) {
    super(state, env);
    this.state = state;
    this.env = env;
    state.blockConcurrencyWhile(async () => {
      try {
        const saved = await this.state.storage.get<GameState>("game_state");
        const seeds = await this.state.storage.get<{current: string, next: string}>("seeds");
        if (saved) {
          this.gameState = saved;
          this.gameState.history = Array.isArray(this.gameState.history) ? this.gameState.history.slice(0, 30) : [];
          this.gameState.phase = 'PREPARING';
          this.gameState.startTime = Date.now();
          this.gameState.activeBets = [];
        }
        if (seeds) {
          this.currentServerSeed = seeds.current;
          this.nextServerSeed = seeds.next;
        } else {
          this.currentServerSeed = await generateSeed();
          this.nextServerSeed = await generateSeed();
          await this.state.storage.put('seeds', { current: this.currentServerSeed, next: this.nextServerSeed });
        }
        this.gameState.nextSeedHash = await hashSeed(this.nextServerSeed);
        this.initialized = true;
      } catch (err) {
        console.error("DO Initialization Error:", err);
      }
    });
    this.runLoop();
  }
  private async runLoop() {
    while (true) {
      try {
        if (!this.initialized) {
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        const now = Date.now();
        this.gameState.serverTime = now;
        const elapsed = now - this.gameState.startTime;
        if (this.gameState.phase === 'PREPARING') {
          if (elapsed >= GAME_CONSTANTS.PREPARATION_MS) {
            this.currentCrashPoint = await generateProvableCrashPoint(this.currentServerSeed);
            this.gameState.phase = 'FLYING';
            this.gameState.startTime = now;
            this.gameState.currentMultiplier = 1.0;
            await this.state.storage.put("game_state", this.gameState);
          }
        } else if (this.gameState.phase === 'FLYING') {
          this.gameState.currentMultiplier = calculateMultiplier(elapsed);
          let betChanged = false;
          for (const bet of this.gameState.activeBets) {
            if (!bet.cashedOut && bet.autoCashout && this.gameState.currentMultiplier >= bet.autoCashout) {
              await this.internalProcessCashout(bet.userId, bet.autoCashout);
              betChanged = true;
            }
          }
          if (this.gameState.currentMultiplier >= this.currentCrashPoint) {
            this.gameState.phase = 'CRASHED';
            this.gameState.startTime = now;
            this.gameState.lastCrashPoint = this.currentCrashPoint;
            const record: RoundRecord = {
              id: crypto.randomUUID(),
              crashPoint: this.currentCrashPoint,
              serverSeed: this.currentServerSeed,
              seedHash: await hashSeed(this.currentServerSeed),
              timestamp: now
            };
            this.gameState.history = [record, ...this.gameState.history].slice(0, 30);
            this.currentServerSeed = this.nextServerSeed;
            this.nextServerSeed = await generateSeed();
            this.gameState.nextSeedHash = await hashSeed(this.nextServerSeed);
            await this.state.storage.put("game_state", this.gameState);
            await this.state.storage.put('seeds', { current: this.currentServerSeed, next: this.nextServerSeed });
          } else if (betChanged || Math.random() < 0.05) {
            await this.state.storage.put("game_state", this.gameState);
          }
        } else if (this.gameState.phase === 'CRASHED') {
          if (elapsed >= GAME_CONSTANTS.COOLDOWN_MS) {
            this.gameState.phase = 'PREPARING';
            this.gameState.startTime = now;
            this.gameState.activeBets = [];
            this.gameState.currentMultiplier = 1.0;
            await this.state.storage.put("game_state", this.gameState);
          }
        }
      } catch (err) {
        console.error("Game Loop Error:", err);
      }
      await new Promise(resolve => setTimeout(resolve, GAME_CONSTANTS.TICK_RATE_MS));
    }
  }
  private async internalProcessCashout(userId: string, multiplier: number) {
    const bet = this.gameState.activeBets.find(b => b.userId === userId && !b.cashedOut);
    if (!bet) return;
    const payout = Math.floor(bet.amount * multiplier * 100) / 100;
    bet.multiplier = multiplier;
    bet.payout = payout;
    bet.cashedOut = true;
    bet.winningAmount = payout;
    let balance = (await this.state.storage.get<number>(`balance_${userId}`)) ?? 1000.00;
    balance += payout;
    await this.state.storage.put(`balance_${userId}`, balance);
  }
  async getGameState(): Promise<GameState> {
    return { 
      ...this.gameState, 
      serverTime: Date.now(),
      history: Array.isArray(this.gameState.history) ? this.gameState.history.slice(0, 30) : [],
      activeBets: Array.isArray(this.gameState.activeBets) ? this.gameState.activeBets : []
    };
  }
  async getBalance(userId: string): Promise<number> {
    return (await this.state.storage.get<number>(`balance_${userId}`)) ?? 1000.00;
  }
  async placeBet(userId: string, userName: string, amount: number, autoCashout: number | null): Promise<Bet> {
    if (this.gameState.phase !== 'PREPARING') throw new Error("Betting closed");
    let balance = await this.getBalance(userId);
    if (balance < amount) throw new Error("Insufficient balance");
    balance -= amount;
    await this.state.storage.put(`balance_${userId}`, balance);
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
    this.gameState.activeBets.push(bet);
    await this.state.storage.put("game_state", this.gameState);
    return bet;
  }
  async processCashout(userId: string): Promise<Bet> {
    if (this.gameState.phase !== 'FLYING') throw new Error("Game not in flight");
    const bet = this.gameState.activeBets.find(b => b.userId === userId && !b.cashedOut);
    if (!bet) throw new Error("No active bet");
    await this.internalProcessCashout(userId, this.gameState.currentMultiplier);
    await this.state.storage.put("game_state", this.gameState);
    return this.gameState.activeBets.find(b => b.userId === userId)!;
  }
}