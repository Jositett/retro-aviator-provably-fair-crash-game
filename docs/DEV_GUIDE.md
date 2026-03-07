# Developer Guide - Retro Aviator

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Bun | Latest | `curl -fsSL https://bun.sh/install | bash` |
| Node.js | 18+ | Via bun or nvm |
| Wrangler | Latest | `bunx wrangler@latest login` |

## Quick Start

```bash
# Install dependencies
bun install

# Start development server
bun dev
```

Open http://localhost:3000 in your browser.

## Project Structure

```
├── src/                    # React frontend (Vite)
│   ├── pages/              # Route pages
│   ├── components/         # UI components
│   │   └── game/           # Game-specific components
│   ├── hooks/              # Custom React hooks
│   └── lib/                # Utilities
├── worker/                 # Cloudflare Worker
│   ├── index.ts            # Worker entry (DO NOT EDIT)
│   ├── userRoutes.ts       # API route definitions
│   ├── durableObject.ts   # Durable Object class
│   ├── core-utils.ts      # Worker utilities
│   └── types.ts            # Worker types
├── shared/                 # Shared between client/worker
│   ├── types.ts            # TypeScript interfaces
│   ├── game-logic.ts       # Authoritative game math
│   └── mock-data.ts        # Demo data
├── public/                 # Static assets
├── docs/                   # Documentation
├── wrangler.jsonc          # Cloudflare config
└── vite.config.ts          # Vite config
```

## Development Commands

| Command | Description |
|---------|-------------|
| `bun dev` | Start dev server with HMR |
| `bun build` | Production build |
| `bun preview` | Preview production build |
| `bun deploy` | Build + deploy to Cloudflare |
| `bun lint` | Run ESLint |
| `bun cf-typegen` | Generate Worker types |

## Architecture Overview

### Frontend (React + Vite)

The frontend polls the backend for game state and renders the UI:

1. **HomePage.tsx** - Main container, orchestrates game loop
2. **Server sync** - Polls `/api/game/state` every 400ms
3. **Time sync** - Calculates server offset for smooth multiplier animation
4. **Client-side multiplier** - Uses same formula as server for instant feedback

### Backend (Cloudflare Workers + Hono)

1. **worker/index.ts** - Entry point, loads user routes dynamically
2. **userRoutes.ts** - API endpoints (GET /api/game/state, POST /api/game/bet, etc.)
3. **durableObject.ts** - Game state management, game loop

### Game Logic (shared/game-logic.ts)

- **calculateMultiplier()** - Exponential growth formula
- **generateProvablyCrashPoint()** - SHA-256 based crash point
- **verifyRound()** - Client can verify seed hash

## Adding New API Routes

Edit `worker/userRoutes.ts`:

```typescript
import { Hono } from "hono";
import { Env } from './core-utils';

export function userRoutes(app: Hono<{ Bindings: Env }>) {
    const getDO = (c: any) => c.env.GlobalDurableObject.get(
        c.env.GlobalDurableObject.idFromName("global")
    );

    // Example: GET /api/custom
    app.get('/api/custom', async (c) => {
        const stub = getDO(c);
        // Use stub methods...
        return c.json({ success: true, data: {...} });
    });
}
```

## Modifying Game Logic

### Changing Multiplier Growth

Edit `shared/game-logic.ts`:

```typescript
export const GAME_CONSTANTS = {
    PREPARATION_MS: 5000,
    COOLDOWN_MS: 3000,
    TICK_RATE_MS: 100,
    MAX_MULTIPLIER: 1000000,
    GROWTH_EXPONENT: 0.0005,  // Change this
};
```

### Changing Crash Algorithm

Edit `generateProvablyCrashPoint()` in `shared/game-logic.ts`.

## Game Phases

```
PREPARING (5s) → FLYING (variable) → CRASHED (3s) → PREPARING...
```

- **PREPARING**: Bets accepted, plane hidden
- **FLYING**: Multiplier increasing, betting closed, cashouts allowed
- **CRASHED**: Round ended, showing final multiplier, cleanup

## Debugging

### Check Worker Logs

```bash
# In Cloudflare Dashboard
# Workers & Pages → Your Worker → Logs
```

### Test API Directly

```bash
# Health check
curl http://localhost:8787/api/health

# Get game state
curl http://localhost:8787/api/game/state
```

### Verify Provably Fair

1. Click "Verify" button in UI
2. Select a round from history
3. System shows: seed, hash, crash point
4. Client can recalculate hash from seed to verify

## Deployment

```bash
# Login to Cloudflare
bunx wrangler@latest login

# Deploy (includes build)
bun deploy

# Or dry-run first
bunx wrangler@latest deploy --dry-run
```

## Environment Variables

Configure in `wrangler.jsonc`:

```jsonc
{
    "vars": {
        // Your environment variables
    }
}
```

## Common Issues

### "Worker routes failed to load"

- Check `worker/userRoutes.ts` for syntax errors
- Restart dev server

### Client/Server multiplier mismatch

- Check `calculateMultiplier()` is identical in both
- Ensure server time sync is working (check offset in DevTools)

### Durable Object errors

- Check `wrangler.jsonc` migrations config
- Ensure compatibility_date is set

## Code Style

- TypeScript strict mode
- Use shadcn/ui components from `src/components/ui/`
- Use Zustand for client state
- Use React Query for server state
- Follow existing patterns in `userRoutes.ts`

## Testing

No formal test suite yet. Manual testing:

1. Open two browser tabs
2. Place bets in both
3. Verify bets appear in Live Bets
4. Cash out in one, let other crash
5. Check balance updates correctly

## Further Reading

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Hono Framework](https://hono.dev/)
- [Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [shadcn/ui](https://ui.shadcn.com/)
