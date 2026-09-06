# Production deployment

The current frontend production URL is `https://gift-chaos-game.vercel.app`. Use that origin wherever this guide says `your-web-domain` unless a custom domain is configured later.

## 1. Create PostgreSQL

Create a managed PostgreSQL database in Neon, Supabase, Railway, or another provider. Copy its pooled TLS connection string to `DATABASE_URL`. Do not commit it.

## 2. Configure the realtime service

Create a long-running service from the repository root. Railway can use `railway.json` and `apps/realtime-server/Dockerfile`. Add:

- `DATABASE_URL`
- `WEB_ORIGIN=https://your-web-domain`
- `REALTIME_ADMIN_TOKEN=<long random value>`
- `TIKTOK_PROVIDER=demo` for initial deployment
- `TIKTOK_SESSION_ID` only if the webcast provider requires it
- `TIKTOK_TT_TARGET_IDC` only if required
- `PORT` is normally supplied by the host

Run `npm run db:migrate` as the release/pre-deploy command. The health check is `GET /health`. Confirm it returns `server: online`, `websocket: online`, and `database.ok: true`.

The service must allow WebSocket upgrades and remain running. Do not deploy this process as a Vercel Function.

## 3. Deploy the web app to Vercel

Import the repository and set Root Directory to `apps/web`. Because this is an npm workspace monorepo, keep Install Command as `cd ../.. && npm ci` and Build Command as `cd ../.. && npm run build -w @gift-chaos/shared && npm run build -w @gift-chaos/web` if Vercel does not detect the workspace automatically.

Add:

- `NEXT_PUBLIC_APP_NAME=ХАОС ПОДАРКОВ`
- `NEXT_PUBLIC_APP_URL=https://your-web-domain`
- `NEXT_PUBLIC_REALTIME_URL=https://your-realtime-domain`
- `REALTIME_SERVER_URL=https://your-realtime-domain`
- `REALTIME_ADMIN_TOKEN=<same service token as backend>`
- `ADMIN_PASSWORD=<strong unique password>`
- `AUTH_SECRET=<at least 32 random bytes>`

Redeploy after changing any `NEXT_PUBLIC_*` value because it is embedded in the browser bundle.

## 4. CORS and WebSocket

Set backend `WEB_ORIGIN` to the exact production web origin. Multiple origins may be comma-separated. Use HTTPS/WSS in production. The Socket.IO client automatically reconnects and requests the current `GameState` on every connection.

## 5. TikTok connection

First verify `/demo`, HP damage, overlay animation, leaderboard and persistence. Then change `TIKTOK_PROVIDER=webcast`, redeploy only the realtime service, start a real TikTok LIVE, open `/admin`, enter the username and press CONNECT.

If the provider receives a verification/region error, place the required TikTok session value only in the realtime host’s secret manager. It is an unofficial integration and requires a real LIVE smoke test after TikTok/provider updates.

## 6. Domain and launch checklist

1. Assign stable HTTPS domains to web and realtime services.
2. Update `WEB_ORIGIN`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_REALTIME_URL`, and `REALTIME_SERVER_URL`.
3. Confirm `/health` and PostgreSQL connectivity.
4. Confirm admin login rejects a wrong password.
5. Run Demo Gifts and destroy the boss.
6. Refresh overlay and confirm HP/leaderboard recovery.
7. Start a private TikTok LIVE and verify one low-cost and one streak gift.
8. Add `/overlay` as a 1080×1920 Link/browser source.
9. Switch the session to running and begin the public LIVE.

After these deployments, only TikTok LIVE Studio runs on the streamer’s PC. Closing `/admin` or rebooting the PC does not stop the cloud connector, database, game state, or WebSocket service.
