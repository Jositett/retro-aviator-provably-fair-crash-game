import { Hono } from "hono";
import { Env } from './core-utils';
import type { ApiResponse, GameState, Bet, UserStats } from '../shared/types';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const withDurableObjectRetry = async <T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            const message = error instanceof Error ? error.message : String(error);
            const isTransient = message.includes('internal error') || message.includes('reference =');

            if (!isTransient || attempt === maxAttempts) {
                throw error;
            }

            // Brief backoff for occasional DO RPC transient failures.
            await sleep(40 * attempt);
        }
    }

    throw lastError;
};

export function userRoutes(app: Hono<{ Bindings: Env }>) {
    const getDO = (c: any) => c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));

    app.get('/api/game/state', async (c) => {
        try {
            const stub = getDO(c);
            const state = await withDurableObjectRetry(() => stub.getGameState());
            return c.json({ success: true, data: state } satisfies ApiResponse<GameState>);
        } catch (error) {
            console.error('[ROUTE ERROR] /api/game/state', error);
            return c.json({ success: false, error: 'Temporary backend sync issue' } satisfies ApiResponse<GameState>, 503);
        }
    });

    app.get('/api/user/balance', async (c) => {
        const userId = c.req.query('userId') || 'demo-user';

        try {
            const stub = getDO(c);
            const balance = await withDurableObjectRetry(() => stub.getBalance(userId));
            return c.json({ success: true, data: balance } satisfies ApiResponse<number>);
        } catch (error) {
            console.error('[ROUTE ERROR] /api/user/balance', error);
            return c.json({ success: false, error: 'Temporary backend sync issue' } satisfies ApiResponse<number>, 503);
        }
    });

    app.post('/api/game/bet', async (c) => {
        const body = await c.req.json() as { userId: string, userName: string, amount: number, autoCashout: number | null };
        const stub = getDO(c);
        try {
            const bet = await withDurableObjectRetry(() => stub.placeBet(body.userId, body.userName, body.amount, body.autoCashout));
            return c.json({ success: true, data: bet } satisfies ApiResponse<Bet>);
        } catch (e: any) {
            const message = e instanceof Error ? e.message : String(e);
            const status = message.includes('internal error') ? 503 : 400;
            return c.json({ success: false, error: message } satisfies ApiResponse<Bet>, status);
        }
    });

    app.post('/api/game/cashout', async (c) => {
        const body = await c.req.json() as { userId: string };
        const stub = getDO(c);
        try {
            const bet = await withDurableObjectRetry(() => stub.processCashout(body.userId));
            return c.json({ success: true, data: bet } satisfies ApiResponse<Bet>);
        } catch (e: any) {
            const message = e instanceof Error ? e.message : String(e);
            const status = message.includes('internal error') ? 503 : 400;
            return c.json({ success: false, error: message } satisfies ApiResponse<Bet>, status);
        }
    });

    app.get('/api/leaderboard', async (c) => {
        try {
            const stub = getDO(c);
            const stats = await withDurableObjectRetry(() => stub.getLeaderboard());
            return c.json({ success: true, data: stats } satisfies ApiResponse<UserStats[]>);
        } catch (error) {
            console.error('[ROUTE ERROR] /api/leaderboard', error);
            return c.json({ success: false, error: 'Temporary backend sync issue' } satisfies ApiResponse<UserStats[]>, 503);
        }
    });
}