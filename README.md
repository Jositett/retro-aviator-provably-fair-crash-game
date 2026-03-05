# Retro Aviator Crash

[![Deploy to Cloudflare][cloudflarebutton]]

A thrilling retro-styled crash game built on Cloudflare Workers. Bet on a multiplier that increases until it crashes—cash out before it's too late! Features real-time gameplay, persistent state via Durable Objects, and a responsive UI with modern animations.

## Features

- **Real-time Crash Mechanics**: Multiplier grows dynamically; cash out at your risk.
- **Durable Object Storage**: Server-side state management for counters, bets, and game history.
- **Responsive Design**: Mobile-first UI with Tailwind CSS and shadcn/ui components.
- **Dark/Light Theme**: Automatic theme detection with toggle.
- **API-Driven Backend**: Hono-powered endpoints for game logic, integrated with React Query.
- **Error Handling & Logging**: Client and server-side error reporting.
- **Production-Ready**: Type-safe TypeScript, optimized builds, Cloudflare observability.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Lucide React, Framer Motion, Tanstack Query, React Router
- **Backend**: Cloudflare Workers, Hono, Durable Objects
- **State & Data**: Zustand, Immer, Zod validation
- **UI/UX**: Radix UI primitives, Sonner toasts, Sidebar layout
- **Dev Tools**: Bun, Wrangler, ESLint, TypeScript ESLint

## Quick Start

1. **Prerequisites**:
   - [Bun](https://bun.sh/) installed
   - [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install/) (`bunx wrangler@latest login`)

2. **Clone & Install**:
   ```bash
   git clone <your-repo-url>
   cd retro-aviator-crash-dj7m43gwepywawynozczx
   bun install
   ```

3. **Development**:
   ```bash
   bun dev
   ```
   Open [http://localhost:3000](http://localhost:3000) (or `${PORT:-3000}`).

4. **Build**:
   ```bash
   bun build
   ```

## Development

- **Hot Reload**: `bun dev` for frontend dev server with Worker proxy.
- **Type Generation**: `bun cf-typegen` to update Worker types.
- **Linting**: `bun lint`
- **Preview**: `bun preview`
- **API Testing**: Endpoints available at `/api/*` (e.g., `/api/health`, `/api/counter`).
- **Custom Routes**: Extend `worker/userRoutes.ts` without touching core files.
- **Shared Types**: Edit `shared/types.ts` and `shared/mock-data.ts` for data models.

Access Durable Object demo features:
- GET `/api/demo` – Fetch items
- POST `/api/demo` – Add item
- GET/POST `/api/counter` – Counter operations

## Deployment

Deploy to Cloudflare Workers with Pages integration:

1. **Configure**:
   ```bash
   bunx wrangler@latest login
   bunx wrangler@latest deploy --dry-run  # Verify config
   ```

2. **Deploy**:
   ```bash
   bun deploy
   ```
   Or one-click:

   [cloudflarebutton]

Custom domain and bindings configured in `wrangler.jsonc`. Assets served as SPA. Durable Objects auto-migrate.

## Scripts

| Script | Description |
|--------|-------------|
| `bun dev` | Start dev server |
| `bun build` | Production build |
| `bun lint` | Lint codebase |
| `bun preview` | Preview production build |
| `bun deploy` | Build + deploy to Cloudflare |
| `bun cf-typegen` | Generate Worker types |

## Project Structure

```
├── src/              # React app
├── worker/           # Cloudflare Worker (Hono + DO)
├── shared/           # Shared types & mocks
├── public/           # Static assets
└── wrangler.jsonc    # Worker config
```

## Contributing

1. Fork & clone
2. `bun install`
3. Create feature branch
4. `bun dev` & test
5. PR to `main`

Follow TypeScript best practices. Update types in `shared/`.

## License

MIT – see [LICENSE](LICENSE) (add if needed).