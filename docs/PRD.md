# Retro Aviator - Product Requirements Document (PRD)

## 1. Project Overview

**Project Name:** Retro Aviator  
**Type:** Real-time multiplayer crash gambling game (provably fair)  
**Core Functionality:** Players bet on a multiplier that increases exponentially until it crashes. Cash out before crash to win; otherwise lose the bet.  
**Target Users:** Crypto/casino game enthusiasts, players seeking provably fair gambling experiences

---

## 2. Game Mechanics

### 2.1 Core Gameplay Loop

| Phase | Duration | Description |
|-------|----------|-------------|
| PREPARING | 5 seconds | New round starting, bets accepted |
| FLYING | Variable | Multiplier growing, betting closed |
| CRASHED | 3 seconds | Round ended, cooldown before next |

### 2.2 Multiplier Growth

```
f(t) = 1.0 + 0.01 * (e^(k*t) - 1)
```

- `k = 0.0005` (growth exponent)
- Multiplier capped at 1,000,000x
- Rounded to 2 decimal places for client/server sync

### 2.3 Provably Fair Crash Points

- Uses SHA-256 hash of server seed
- Algorithm: `multiplier = floor((2^52 * e - r) / (2^52 - r)) / 100`
- House edge: ~3% (when `hash % 33 == 0`, crash at 1.00x)
- Server seed revealed after round for verification

### 2.4 Betting Rules

- Minimum bet: Not explicitly enforced (default balance: 1000 credits)
- Maximum multiplier: 1000x
- Auto-cashout: Optional, user-specified multiplier threshold
- One active bet per user per round

---

## 3. User Features

### 3.1 Player Actions

| Action | Timing | Result |
|--------|--------|--------|
| Place Bet | PREPARING phase | Deducted from balance |
| Cash Out | FLYING phase | Lock in current multiplier |
| Auto Cashout | FLYING (at threshold) | Automatic at specified multiplier |
| View History | Always | Last 30 rounds with crash points |
| Verify Round | Always | Check seed hash against revealed seed |

### 3.2 User Interface Components

1. **Header** - Game title, connection status, balance, verify button
2. **History Rail** - Recent crash points (last 30 rounds)
3. **Radar Canvas** - Animated plane/radar visualization
4. **Cockpit Controls** - Bet amount input, place bet button, cashout button
5. **Live Bets Table** - All active bets in current round
6. **Verifier Modal** - Provably fair verification tool

### 3.3 Account System

- Auto-generated user ID stored in localStorage
- Default balance: 1000 demo credits
- Balance persisted per user in Durable Object storage

---

## 4. Technical Architecture

### 4.1 Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| UI Components | shadcn/ui, Radix UI, Framer Motion |
| State | Zustand, React Query |
| Backend | Cloudflare Workers, Hono |
| Storage | Durable Objects (SQLite-backed) |
| API | RESTful via Hono |

### 4.2 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/game/state` | GET | Current game state |
| `/api/game/bet` | POST | Place a bet |
| `/api/game/cashout` | POST | Cash out current bet |
| `/api/user/balance` | GET | Get user balance |
| `/api/health` | GET | Health check |

### 4.3 Key Files

```
├── src/                      # React frontend
│   ├── pages/HomePage.tsx   # Main game UI
│   ├── components/game/     # Game components
│   └── lib/game-utils.ts    # Client game helpers
├── worker/                   # Cloudflare Worker
│   ├── index.ts             # Worker entry point
│   ├── userRoutes.ts        # API routes
│   └── durableObject.ts     # Game state DO
├── shared/                  # Shared code
│   ├── types.ts             # TypeScript types
│   └── game-logic.ts        # Authoritative game math
└── wrangler.jsonc           # Worker configuration
```

---

## 5. Functional Requirements

### 5.1 Game State Management

- [x] Round phase management (PREPARING → FLYING → CRASHED)
- [x] Real-time multiplier calculation
- [x] Game loop with 100ms tick rate
- [x] Active bet tracking
- [x] Round history (last 30 rounds)
- [x] Server time synchronization

### 5.2 Betting System

- [x] Place bet during PREPARING phase
- [x] Validate sufficient balance
- [x] Auto-cashout functionality
- [x] Manual cashout during FLYING
- [x] Payout calculation and balance update

### 5.3 Provably Fair

- [x] Server seed generation (cryptographically secure)
- [x] Seed hash shown before round
- [x] Seed revealed after round
- [x] Client-side verification

### 5.4 UI/UX

- [x] Responsive design (mobile-first)
- [x] Dark theme with retro aesthetic
- [x] Real-time connection status
- [x] Toast notifications
- [x] Loading/error states

---

## 6. Future Enhancements (Out of Scope)

- User authentication (real accounts)
- Persistent leaderboards
- Multiple rooms/tables
- Betting limits configuration
- Admin panel
- Detailed statistics dashboard
- Sound effects
- Social features (chat)

---

## 7. Success Metrics

- Game round plays without errors
- Multiplier calculation matches on client/server
- Provably fair verification passes
- Responsive on mobile devices
- Connection recovery on network issues
