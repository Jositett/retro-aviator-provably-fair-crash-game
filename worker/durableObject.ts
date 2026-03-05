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
  private currentCrashPoint: number = 1.0;
  private initialized = false;

  constructor(state: DurableObjectState, env: any) {
    super(state, env);
    state.blockConcurrencyWhile(async () => {
      const saved = await state.storage.get<GameState>("game_state");
      const seeds = await state.storage.get<{current: string, next: string}>("seeds");
      
      if (saved) {
        this.state = saved;
        // Sanitize history records to ensure valid crashPoint and limit to 30 items
        this.state.history = this.state.history.map((record: any) => ({
          ...record,
          crashPoint: (record.crashPoint ?? 1.00)
        })) as RoundRecord[];
        this.state.history = this.state.history.slice(0, 30);
        // On restart, if it was flying, we treat it as a fresh start to prevent ghost states
        this.state.phase = 'PREPARING';
        this.state.startTime = Date.now();
        this.state.activeBets = [];
        await state.storage.put("game_state", this.state);
      }
      
      if(seeds){
        this.currentServerSeed = seeds.current;
        this.nextServerSeed = seeds.next;
      } else {
        this.currentServerSeed = await generateSeed();
        this.nextServerSeed = await generateSeed();
        await state.storage.put('seeds', {current: this.currentServerSeed, next: this.nextServerSeed});
      }
      
      this.state.nextSeedHash = await hashSeed(this.nextServerSeed);
      this.initialized = true;
    });
    
    this.runLoop();
  }

  private async runLoop() {
    while (true) {
      await this.ctx.blockConcurrencyWhile(async () => {
        const now = Date.now();
        this.state.serverTime = now;
        const elapsed = now - this.state.startTime;
        
        if (this.state.phase === 'PREPARING') {
          if(elapsed >= GAME_CONSTANTS.PREPARATION_MS){
            this.currentCrashPoint = await generateProvableCrashPoint(this.currentServerSeed);
            this.state.phase = 'FLYING';
            this.state.startTime = now;
            this.state.currentMultiplier = 1.0;
            await this.ctx.storage.put("game_state", this.state);
          }
        } else if (this.state.phase === 'FLYING') {
          this.state.currentMultiplier = calculateMultiplier(elapsed);
          let stateChanged = false;
          const betsCopy = [...this.state.activeBets];
          for(const bet of betsCopy){
            if(!bet.cashedOut && bet.autoCashout && this.state.currentMultiplier >= bet.autoCashout){
              await this.processCashout(bet.userId, bet.autoCashout);
              stateChanged = true;
            }
          }
          if(this.state.currentMultiplier >= this.currentCrashPoint){
            this.state.phase = 'CRASHED';
            this.state.startTime = now;
            this.state.lastCrashPoint = this.currentCrashPoint;
            const record: RoundRecord = {
              id: crypto.randomUUID(),
              crashPoint: this.currentCrashPoint,
              serverSeed: this.currentServerSeed,
              seedHash: await hashSeed(this.currentServerSeed),
              timestamp: now
            };
            this.state.history = [record, ...this.state.history].slice(0, 30);
            const newSeed = await generateSeed();
            this.currentServerSeed = this.nextServerSeed;
            this.nextServerSeed = newSeed;
            this.state.nextSeedHash = await hashSeed(this.nextServerSeed);
            await this.ctx.storage.put('game_state', this.state);
            await this.ctx.storage.put('seeds', { current: this.currentServerSeed, next: this.nextServerSeed });
            stateChanged = true;
          }
          // Periodic sync of state during flight to ensure activeBets persistence
          if (!stateChanged && Math.random() < 0.1) {
            await this.ctx.storage.put("game_state", this.state);
          }
        } else if (this.state.phase === 'CRASHED') {
          if(elapsed >= GAME_CONSTANTS.COOLDOWN_MS){
            this.state.phase = 'PREPARING';
            this.state.startTime = now;
            this.state.activeBets = [];
            this.state.currentMultiplier = 1.0;
            await this.ctx.storage.put("game_state", this.state);
          }
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, GAME_CONSTANTS.TICK_RATE_MS));
    }
  }

  async getGameState(): Promise<GameState> {
    return { ...this.state, serverTime: Date.now() };
  }

  async getBalance(userId: string): Promise<number> {
    return (await this.ctx.storage.get<number>(`balance_${userId}`)) ?? 10000.00;
  }

  async placeBet(userId: string, userName: string, amount: number, autoCashout: number | null): Promise<Bet> {
    await this.ctx.blockConcurrencyWhile(async () => {
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
      await this.ctx.storage.put("game_state", this.state);
    });
    return this.state.activeBets.find(b => b.userId === userId && !b.cashedOut)!;
  }

  async processCashout(userId: string, targetMultiplier?: number): Promise<Bet> {
    await this.ctx.blockConcurrencyWhile(async () => {
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
      await this.ctx.storage.put("game_state", this.state);
    });
    return this.state.activeBets.find(b => b.userId === userId)!;
  }

  async fetch(request: Request): Promise<Response> {
    return new Response('Method Not Allowed', { status: 405 });
  }
}
//