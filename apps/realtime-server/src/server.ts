import "dotenv/config";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import pino from "pino";
import { pinoHttp } from "pino-http";
import { Server } from "socket.io";
import { z } from "zod";
import { GameEngine, createInitialState } from "@gift-chaos/game-engine";
import { DEFAULT_MAPPINGS, type GiftCatalogItem, type GiftMapping, type NormalizedTikTokEvent, type VisualEffectEvent } from "@gift-chaos/shared";
import { databaseHealth } from "@gift-chaos/database";
import { DemoTikTokProvider } from "./lib/tiktok/demo-provider.js";
import { createTikTokProvider } from "./lib/tiktok/provider.js";
import { EffectQueue } from "./services/effect-queue.js";
import { loadCatalog, loadMappings, loadSnapshot, recordEvent, saveCatalog, saveMapping, saveSnapshot } from "./services/state-store.js";

const log = pino({ level: process.env.LOG_LEVEL ?? "info", redact: ["req.headers.authorization", "password", "token", "sessionId"] });
const app = express();
const server = createServer(app);
const allowedOrigins = (process.env.WEB_ORIGIN ?? "http://localhost:3000").split(",").map(value => value.trim());
const io = new Server(server, { cors: { origin: allowedOrigins, methods: ["GET", "POST"] }, transports: ["websocket", "polling"], maxHttpBufferSize: 100_000 });
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "32kb" }));
app.use(pinoHttp({ logger: log }));

const engines = new Map<string, GameEngine>();
const locks = new Map<string, Promise<void>>();
const provider = createTikTokProvider();
const queues = new Map<string, EffectQueue>();
let providerUsername = "";
let giftCatalog: GiftCatalogItem[] = [];

function normalizedGiftName(value: string) { return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ""); }
function enrichMappings(mappings: GiftMapping[]) {
  return mappings.map(mapping => {
    const catalogGift = giftCatalog.find(gift => gift.id === mapping.giftId) ?? giftCatalog.find(gift => normalizedGiftName(gift.name) === normalizedGiftName(mapping.giftName));
    return catalogGift ? { ...mapping, giftName: catalogGift.name, giftImage: catalogGift.image, coinValue: catalogGift.coinValue } : mapping;
  });
}
function publishMappings() {
  for (const [sessionId, engine] of engines) {
    engine.setMappings(enrichMappings(engine.mappings));
    io.to(sessionId).emit("game:mappings", engine.mappings);
  }
}
async function refreshGiftCatalog() {
  const current = await provider.getGiftCatalog();
  if (current.length) giftCatalog = current;
  await saveCatalog(giftCatalog);
  publishMappings();
  return giftCatalog;
}

function engineFor(sessionId: string) {
  let engine = engines.get(sessionId);
  if (!engine) { const initial = createInitialState(sessionId); if (sessionId === "demo") initial.status = "running"; engine = new GameEngine(initial); engines.set(sessionId, engine); }
  return engine;
}
function queueFor(sessionId: string) {
  let queue = queues.get(sessionId);
  if (!queue) { queue = new EffectQueue(effect => io.to(sessionId).emit("game:effect", effect)); queues.set(sessionId, queue); }
  return queue;
}
async function hydrate(sessionId: string) {
  const [existing, mappings, catalog] = await Promise.all([
    loadSnapshot(sessionId).catch(error => { log.warn({ error }, "snapshot load failed"); return null; }),
    loadMappings().catch(error => { log.warn({ error }, "mapping load failed"); return []; }),
    loadCatalog().catch(error => { log.warn({ error }, "gift catalog load failed"); return []; })
  ]);
  if (catalog.length) giftCatalog = catalog;
  const hydratedMappings = enrichMappings(mappings.length ? mappings : DEFAULT_MAPPINGS);
  if (existing) engines.set(sessionId, new GameEngine(existing, hydratedMappings));
  else engineFor(sessionId).setMappings(hydratedMappings);
}
async function processEvent(sessionId: string, event: NormalizedTikTokEvent) {
  const prior = locks.get(sessionId) ?? Promise.resolve();
  const next = prior.then(async () => {
    const engine = engineFor(sessionId);
    const result = engine.process(event);
    if (result.duplicate) return;
    io.to(sessionId).emit("game:state", result.state);
    if (result.visual) queueFor(sessionId).push(result.visual);
    await saveSnapshot(result.state).catch(error => log.error({ error, eventId: event.id }, "snapshot save failed"));
    await recordEvent(event, result.state, result.visual?.damage ?? 0).catch(error => log.error({ error, eventId: event.id }, "event persistence failed"));
    if (result.roundCompleted) {
      io.to(sessionId).emit("game:defeated", { winner: event.viewer.username, round: result.state.round });
      if (result.state.settings.autoNewRound) setTimeout(() => { const state = engine.command("resetRound"); io.to(sessionId).emit("game:state", state); void saveSnapshot(state); }, result.state.settings.roundResetDelayMs).unref();
    }
  }).finally(() => { if (locks.get(sessionId) === next) locks.delete(sessionId); });
  locks.set(sessionId, next);
  return next;
}

provider.onEvent(event => void processEvent("live", event));
provider.onStatus(status => {
  const engine = engineFor("live");
  engine.state = { ...engine.state, connection: status.state, tiktokUsername: status.username };
  io.to("live").emit("game:state", engine.state);
  if (status.state === "connected") void refreshGiftCatalog().catch(error => log.warn({ error }, "gift catalog refresh failed"));
  log.info({ provider: provider.name, state: status.state, username: status.username }, "TikTok provider status");
});

io.use((socket, next) => {
  const sessionId = String(socket.handshake.auth.sessionId ?? socket.handshake.query.sessionId ?? "live");
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(sessionId)) return next(new Error("invalid session"));
  socket.data.sessionId = sessionId;
  next();
});
io.on("connection", socket => {
  const sessionId = socket.data.sessionId as string;
  socket.join(sessionId);
  const engine = engineFor(sessionId);
  engine.state.overlayClients += 1;
  socket.emit("game:state", engine.state);
  socket.emit("game:mappings", engine.mappings);
  socket.on("disconnect", () => { engine.state.overlayClients = Math.max(0, engine.state.overlayClients - 1); });
});

const adminOnly: express.RequestHandler = (req, res, next) => {
  const expected = process.env.REALTIME_ADMIN_TOKEN;
  if (!expected || req.headers.authorization !== `Bearer ${expected}`) { res.status(401).json({ error: "unauthorized" }); return; }
  next();
};

app.get("/health", async (_req, res) => {
  const db = process.env.DATABASE_URL ? await databaseHealth().catch(() => ({ ok: false, latencyMs: -1 })) : { ok: false, latencyMs: -1, mode: "memory" };
  res.json({ ok: true, server: "online", database: db, tiktok: engineFor("live").state.connection, websocket: "online", uptimeSeconds: Math.floor(process.uptime()), provider: provider.name, timestamp: new Date().toISOString() });
});
app.get("/api/state", (req, res) => res.json(engineFor(String(req.query.sessionId ?? "live")).state));
app.get("/api/mappings", (_req, res) => res.json(engineFor("live").mappings));
app.get("/api/catalog", (_req, res) => res.json(giftCatalog));

const commandSchema = z.object({ command: z.enum(["start", "pause", "resume", "resetRound", "resetHp", "end", "clearQueue", "connect", "disconnect", "reconnect", "effect", "setHp", "updateMapping", "updateSettings", "refreshCatalog"]), value: z.unknown().optional(), username: z.string().trim().min(1).max(64).optional(), sessionId: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/).default("live") });
app.post("/api/admin/command", adminOnly, async (req, res) => {
  const parsed = commandSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "invalid command", details: parsed.error.flatten() }); return; }
  const { command, value, username, sessionId } = parsed.data;
  const engine = engineFor(sessionId);
  try {
    if (command === "connect") { if (!username) throw new Error("username required"); providerUsername = username; await provider.connect(username); }
    else if (command === "disconnect") await provider.disconnect();
    else if (command === "reconnect") await (providerUsername ? provider.connect(providerUsername) : provider.reconnect());
    else if (command === "refreshCatalog") await refreshGiftCatalog();
    else if (command === "clearQueue") queueFor(sessionId).clear();
    else if (command === "updateMapping") {
      const input = value as { mapping?: GiftMapping; previousGiftId?: string } | GiftMapping;
      const mapping = "mapping" in input && input.mapping ? input.mapping : input as GiftMapping;
      const previousGiftId = "previousGiftId" in input ? input.previousGiftId : mapping.giftId;
      const next = engine.mappings.filter(item => item.giftId !== previousGiftId && item.giftId !== mapping.giftId);
      engine.setMappings([...next, mapping].sort((a, b) => a.coinValue - b.coinValue));
      await saveMapping(mapping, previousGiftId);
      io.to(sessionId).emit("game:mappings", engine.mappings);
    } else if (command === "updateSettings") {
      const update = z.object({ bossMaxHp: z.number().int().min(100).max(10_000_000).optional(), roundResetDelayMs: z.number().int().min(1000).max(120_000).optional(), likeGoal: z.number().int().min(100).max(100_000_000).optional(), maxConcurrentEffects: z.number().int().min(1).max(12).optional(), comboWindowMs: z.number().int().min(500).max(30_000).optional(), commentsEnabled: z.boolean().optional(), leaderboardEnabled: z.boolean().optional(), soundEnabled: z.boolean().optional(), masterVolume: z.number().min(0).max(1).optional(), effectsVolume: z.number().min(0).max(1).optional(), autoNewRound: z.boolean().optional() }).parse(value);
      engine.state.settings = { ...engine.state.settings, ...update };
      if (update.bossMaxHp) { const ratio = engine.state.hp / engine.state.maxHp; engine.state.maxHp = update.bossMaxHp; engine.state.hp = Math.round(update.bossMaxHp * ratio); }
    } else if (command === "effect") {
      const effect = value as VisualEffectEvent;
      queueFor(sessionId).push({ ...effect, id: effect.id ?? randomUUID() });
    } else engine.command(command, value);
    io.to(sessionId).emit("game:state", engine.state);
    await saveSnapshot(engine.state);
    res.json({ ok: true, state: engine.state, queue: queueFor(sessionId).size() });
  } catch (error) { log.error({ error, command }, "admin command failed"); res.status(500).json({ error: error instanceof Error ? error.message : "command failed" }); }
});

const demoLimiter = rateLimit({ windowMs: 10_000, limit: 120, standardHeaders: true, legacyHeaders: false });
const demoSchema = z.object({ kind: z.enum(["gift", "like", "follow", "share", "comment", "join"]), giftId: z.string().max(100).optional(), giftName: z.string().max(100).optional(), coinValue: z.number().int().min(0).max(1_000_000).optional(), repeatCount: z.number().int().min(1).max(500).optional(), comment: z.string().max(180).optional(), username: z.string().trim().min(1).max(40).default("TestViewer123") });
app.post("/api/demo/event", demoLimiter, async (req, res) => {
  const parsed = demoSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "invalid event" }); return; }
  const body = parsed.data;
  const event: NormalizedTikTokEvent = { id: randomUUID(), kind: body.kind, viewer: { id: `demo:${body.username}`, username: body.username }, occurredAt: new Date().toISOString(), giftId: body.giftId, giftName: body.giftName, coinValue: body.coinValue, repeatCount: body.repeatCount, comment: body.comment, likeCount: body.kind === "like" ? 100 : undefined };
  await processEvent("demo", event);
  res.json({ ok: true, state: engineFor("demo").state });
});
app.post("/api/demo/busy", demoLimiter, async (req, res) => {
  const count = Math.min(500, Math.max(1, Number(req.body?.count ?? 100)));
  const gifts = DEFAULT_MAPPINGS;
  for (let i = 0; i < count; i++) { const gift = gifts[i % gifts.length]!; void processEvent("demo", { id: randomUUID(), kind: "gift", viewer: { id: `crowd-${i % 50}`, username: `Viewer${i % 50}` }, occurredAt: new Date().toISOString(), giftId: gift.giftId, giftName: gift.giftName, coinValue: gift.coinValue, repeatCount: 1 }); }
  res.status(202).json({ ok: true, queued: count });
});

app.use((_req, res) => res.status(404).json({ error: "not found" }));
const port = Number(process.env.PORT ?? 8080);
Promise.all([hydrate("live"), hydrate("demo")]).finally(() => server.listen(port, "0.0.0.0", () => log.info({ port }, "Gift Chaos realtime server started")));

export { app, server, processEvent, engineFor };
