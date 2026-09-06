import type { GiftCatalogItem, NormalizedTikTokEvent } from "@gift-chaos/shared";
import { ControlEvent, TikTokLiveConnection, WebcastEvent } from "tiktok-live-connector";
import { TikTokEventNormalizer } from "./event-normalizer.js";
import { normalizeGiftCatalog, type RawWebcastGift } from "./gift-catalog.js";
import type { ProviderStatus, TikTokLiveProvider } from "./types.js";

export class WebcastTikTokProvider implements TikTokLiveProvider {
  readonly name = "tiktok-live-connector";
  private connection?: TikTokLiveConnection;
  private username = "";
  private events = new Set<(event: NormalizedTikTokEvent) => void>();
  private statuses = new Set<(status: ProviderStatus) => void>();
  private normalizer = new TikTokEventNormalizer();
  private reconnectAttempt = 0;
  private catalog: GiftCatalogItem[] = [];
  private manualDisconnect = false;

  async connect(username: string): Promise<ProviderStatus> {
    this.username = username.replace(/^@/, "").trim();
    await this.disconnect();
    this.manualDisconnect = false;
    const options: Record<string, unknown> = { enableExtendedGiftInfo: true };
    if (process.env.TIKTOK_SESSION_ID && process.env.TIKTOK_TT_TARGET_IDC) options.session = { cookie: { type: "cookie", value: { sessionId: process.env.TIKTOK_SESSION_ID, ttTargetIdc: process.env.TIKTOK_TT_TARGET_IDC } } };
    const connection = new TikTokLiveConnection(this.username, options);
    this.connection = connection;
    const events = connection as unknown as { on: (name: string, handler: (raw: any) => void) => void };
    const flatten = (raw: any) => ({ ...raw?.user, ...raw, giftType: raw?.giftDetails?.giftType, giftName: raw?.giftDetails?.giftName ?? raw?.extendedGiftInfo?.name, diamondCount: raw?.extendedGiftInfo?.diamond_count ?? raw?.extendedGiftInfo?.diamondCount });
    events.on(WebcastEvent.GIFT, raw => { const event = this.normalizer.gift(flatten(raw)); if (event) this.emit(event); });
    events.on(WebcastEvent.CHAT, raw => this.emit(this.normalizer.simple("comment", flatten(raw))));
    events.on(WebcastEvent.LIKE, raw => this.emit(this.normalizer.simple("like", flatten(raw))));
    events.on(WebcastEvent.FOLLOW, raw => this.emit(this.normalizer.simple("follow", flatten(raw))));
    events.on(WebcastEvent.SHARE, raw => this.emit(this.normalizer.simple("share", flatten(raw))));
    events.on(WebcastEvent.MEMBER, raw => this.emit(this.normalizer.simple("join", flatten(raw))));
    events.on(ControlEvent.DISCONNECTED, () => this.scheduleReconnect());
    events.on(ControlEvent.ERROR, () => this.scheduleReconnect());
    this.emitStatus({ state: "reconnecting", username: this.username });
    const result = await connection.connect();
    this.reconnectAttempt = 0;
    this.catalog = normalizeGiftCatalog((connection.availableGifts ?? []) as RawWebcastGift[]);
    const status: ProviderStatus = { state: "connected", username: this.username, roomId: String(result.roomId) };
    this.emitStatus(status);
    return status;
  }
  async disconnect() { this.manualDisconnect = true; const current = this.connection; this.connection = undefined; if (current) await current.disconnect(); this.emitStatus({ state: "disconnected", username: this.username }); }
  async reconnect() { return this.connect(this.username); }
  async getGiftCatalog(): Promise<GiftCatalogItem[]> { return this.catalog; }
  onEvent(handler: (event: NormalizedTikTokEvent) => void) { this.events.add(handler); return () => this.events.delete(handler); }
  onStatus(handler: (status: ProviderStatus) => void) { this.statuses.add(handler); return () => this.statuses.delete(handler); }
  private emit(event: NormalizedTikTokEvent) { for (const handler of this.events) handler(event); }
  private emitStatus(status: ProviderStatus) { for (const handler of this.statuses) handler(status); }
  private scheduleReconnect() {
    if (this.manualDisconnect || !this.connection || !this.username) return;
    this.emitStatus({ state: "reconnecting", username: this.username });
    const delay = Math.min(30_000, 1_000 * 2 ** this.reconnectAttempt++) + Math.random() * 500;
    setTimeout(() => this.reconnect().catch(() => this.scheduleReconnect()), delay).unref();
  }
}
