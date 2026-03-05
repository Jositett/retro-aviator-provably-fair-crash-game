import { Hono } from "hono";
import { Env } from './core-utils';
import type { ApiResponse, GameState, Bet } from '@shared/types';
export function userRoutes(app: Hono<{ Bindings: Env }>) {
    const getDO = (c: any) => c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
    app.get('/api/game/state', async (c) => {
        const stub = getDO(c);
        const state = await stub.getGameState();
        return c.json({ success: true, data: state } satisfies ApiResponse<GameState>);
    });
    app.get('/api/user/balance', async (c) => {
        const userId = c.req.query('userId') || 'demo-user';
        const stub = getDO(c);
        const balance = await stub.getBalance(userId);
        return c.json({ success: true, data: balance } satisfies ApiResponse<number>);
    });
    app.post('/api/game/bet', async (c) => {
        const body = await c.req.json() as { userId: string, userName: string, amount: number, autoCashout: number | null };
        const stub = getDO(c);
        try {
            const bet = await stub.placeBet(body.userId, body.userName, body.amount, body.autoCashout);
            return c.json({ success: true, data: bet } satisfies ApiResponse<Bet>);
        } catch (e: any) {
            return c.json({ success: false, error: e.message }, 400);
        }
    });
    app.post('/api/game/cashout', async (c) => {
        const body = await c.req.json() as { userId: string };
        const stub = getDO(c);
        try {
            const bet = await stub.processCashout(body.userId);
            return c.json({ success: true, data: bet } satisfies ApiResponse<Bet>);
        } catch (e: any) {
            return c.json({ success: false, error: e.message }, 400);
        }
    });
}