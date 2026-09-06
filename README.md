# ХАОС ПОДАРКОВ

Production-oriented realtime web game for TikTok LIVE. A cloud connector normalizes LIVE events, the authoritative game engine calculates damage and rankings, Socket.IO sends state/effects to the browser, and TikTok LIVE Studio displays `/overlay` as a Link/browser source.

The project is a web application. It does **not** require a desktop game, a local Node.js process, Docker, or a connector running on the streamer’s PC after cloud deployment.

## Current web deployment

- Website: https://gift-chaos-game.vercel.app
- Overlay: https://gift-chaos-game.vercel.app/overlay
- Admin login: https://gift-chaos-game.vercel.app/admin
- Demo: https://gift-chaos-game.vercel.app/demo
- Stats: https://gift-chaos-game.vercel.app/stats

The Next.js frontend is deployed. The interactive cloud pipeline becomes live after a persistent realtime host and managed PostgreSQL are connected and the documented server-side environment variables are added. Until then, public pages render but show the realtime service as disconnected.

## Applications

- `/` — launcher
- `/overlay` — read-only 9:16 game scene
- `/admin` — authenticated responsive Control Center
- `/admin/dev` — protected developer controls
- `/demo` — real pipeline testing without an active TikTok LIVE
- `/stats` — public live-session statistics
- `apps/realtime-server` — persistent Node.js + Socket.IO + TikTok connector process

## Architecture

```mermaid
flowchart TD
  T[TikTok LIVE] --> P[Replaceable provider]
  D[Demo Provider] --> E[Event normalizer]
  P --> E
  E --> G[Authoritative game engine]
  G --> DB[(PostgreSQL)]
  G --> Q[Visual effect queue]
  Q --> WS[Socket.IO]
  WS --> O[/overlay]
  WS --> A[/admin]
  WS --> S[/stats]
```

The web app is ideal for Vercel. The realtime app must run on a long-running container host such as Railway, Render, or Fly.io; Vercel Functions are not used for the persistent TikTok connection or Socket.IO server.

## Project structure

```text
apps/web                 Next.js 16 App Router UI
apps/realtime-server     Express + Socket.IO + provider adapters
packages/game-engine     Pure damage, combo, round and leaderboard logic
packages/shared          Shared contracts and configuration
packages/database        Prisma client and PostgreSQL schema
tests                    Engine and normalizer tests
```

## Local development

Local development is optional and is never needed during a production stream.

1. Copy `.env.example` to `.env` and fill development values.
2. Run `npm install`.
3. Run `npm run db:generate` and `npm run db:migrate`.
4. Run `npm run dev:server` in one terminal.
5. Run `npm run dev` in another terminal.
6. Open `http://localhost:3000/demo`.

Set `TIKTOK_PROVIDER=demo` until the full demo pipeline works. Switch to `webcast` only for a real LIVE test.

## Game pipeline

Every provider outputs `NormalizedTikTokEvent`. The same pipeline handles Demo and live TikTok events. The server immediately calculates damage, coins, stats, combo and leaderboard. Visual events go into a bounded queue. Repeated low-value gifts become rain/storm effects when appropriate, while every gift remains counted in the authoritative state.

Overlay refreshes and WebSocket reconnects recover the latest complete state. PostgreSQL snapshots allow recovery after process restarts. The overlay cannot send admin commands.

## TikTok provider

`TIKTOK_PROVIDER=webcast` uses the open-source `tiktok-live-connector` package. It consumes TikTok’s webcast stream through an **unofficial** protocol; this is not presented as an official TikTok LIVE Gifts API. TikTok may change or restrict the protocol. The adapter is isolated under `apps/realtime-server/src/lib/tiktok`, so another provider can replace it without changing the engine.

Some accounts/regions can connect using only the public username. If TikTok requires verification, set server-side `TIKTOK_SESSION_ID` and optionally `TIKTOK_TT_TARGET_IDC`. Never expose those values to the web app or commit them. Validate live gift names, IDs, repeat behavior and catalog values during a real private test LIVE before production.

## Security

- `/admin` and `/admin/dev` are protected by a secure HttpOnly, SameSite cookie.
- The web server proxies admin commands using a separate server-only service token.
- Socket clients receive read-only state/effects; they cannot mutate the game.
- Zod validation, CORS allowlist, JSON size limits and endpoint rate limits are enabled.
- Sensitive headers are redacted from structured logs.
- Use long random values for `AUTH_SECRET`, `ADMIN_PASSWORD`, and `REALTIME_ADMIN_TOKEN`.

## Commands

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run db:generate`
- `npm run db:migrate`

See [DEPLOYMENT.md](DEPLOYMENT.md) and [SETUP_TIKTOK_LIVE.md](SETUP_TIKTOK_LIVE.md).
