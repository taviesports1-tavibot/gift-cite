import type { GiftCatalogItem, NormalizedTikTokEvent } from "@gift-chaos/shared";
import { DEFAULT_MAPPINGS } from "@gift-chaos/shared";
import type { ProviderStatus, TikTokLiveProvider } from "./types.js";

export class DemoTikTokProvider implements TikTokLiveProvider {
  readonly name = "demo";
  private username = "demo_live";
  private events = new Set<(event: NormalizedTikTokEvent) => void>();
  private statuses = new Set<(status: ProviderStatus) => void>();
  async connect(username: string) { this.username = username; const status: ProviderStatus = { state: "connected", username, roomId: "demo-room" }; this.emitStatus(status); return status; }
  async disconnect() { this.emitStatus({ state: "disconnected", username: this.username }); }
  async reconnect() { return this.connect(this.username); }
  async getGiftCatalog(): Promise<GiftCatalogItem[]> { return DEFAULT_MAPPINGS.map(item => ({ id: item.giftId, name: item.giftName, coinValue: item.coinValue, available: true, updatedAt: new Date().toISOString() })); }
  onEvent(handler: (event: NormalizedTikTokEvent) => void) { this.events.add(handler); return () => this.events.delete(handler); }
  onStatus(handler: (status: ProviderStatus) => void) { this.statuses.add(handler); return () => this.statuses.delete(handler); }
  emit(event: NormalizedTikTokEvent) { for (const handler of this.events) handler(event); }
  private emitStatus(status: ProviderStatus) { for (const handler of this.statuses) handler(status); }
}
