# TikTok LIVE Studio setup

Current overlay URL: `https://gift-chaos-game.vercel.app/overlay`.

## Preferred: Link source in LIVE Studio

Current LIVE Studio builds may expose a web overlay as **Add source → Link** (wording and availability can vary by account/version).

1. Open TikTok LIVE Studio.
2. Create/select a vertical scene.
3. Set the canvas/reference composition to 1080 × 1920 (9:16).
4. Choose **Add source → Link**.
5. Paste `https://gift-chaos-game.vercel.app/overlay` (or your later custom-domain equivalent).
6. Set the source to fill the 1080 × 1920 scene.
7. Preview the scene and check that the right and bottom TikTok controls do not cover HP or the boss.
8. Open `/admin`, connect the LIVE username, and press START GAME.

The overlay scales responsively; 1080 × 1920 is the reference size, not a hardcoded viewport.

## Fallback when Link is unavailable or broken

Do not look for a fictional Browser Source option. Use OBS as the web renderer:

1. In OBS, set Base and Output resolution to 1080 × 1920.
2. Add **Browser Source**, URL `https://gift-chaos-game.vercel.app/overlay`, width `1080`, height `1920`.
3. Put any camera/game sources under the browser source in OBS.
4. Start **OBS Virtual Camera**.
5. In TikTok LIVE Studio add that virtual camera/video capture as the scene source.

Virtual camera frames do not preserve transparency. Compose the complete final scene (including camera) in OBS before sending it to LIVE Studio.

## Audio

Game audio is generated in the overlay and a browser source may require explicit audio capture. In OBS enable **Control audio via OBS** for the Browser Source. In LIVE Studio’s Link source, select its available source-audio option if present. Test levels before going live.

## Safe areas

The overlay reserves larger bottom and right safe zones for TikTok UI. Adjust `safeZones` in server settings if your current LIVE Studio/player layout differs.

## Real connector checklist

- Start the TikTok LIVE before pressing CONNECT.
- Use the username without `@`.
- Verify CONNECTED state in `/admin`.
- Send a test Rose and confirm HP, effect, feed and leaderboard.
- Test a streak gift and confirm it is counted once per increment.
- If TikTok rejects the anonymous connection, configure `TIKTOK_SESSION_ID` on the cloud backend only and restart that service.

No Node.js, terminal, connector program, Docker container, or local backend must run on your PC after production deployment.
