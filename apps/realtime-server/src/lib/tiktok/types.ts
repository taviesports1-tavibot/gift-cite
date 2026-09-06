import type { GiftCatalogItem, NormalizedTikTokEvent } from "@gift-chaos/shared";
export interface ProviderStatus { state: "connected" | "reconnecting" | "disconnected"; username?: string; roomId?: string; message?: string }
export interface TikTokLiveProvider {
  readonly name: string;
  connect(username: string): Promise<ProviderStatus>;
  disconnect(): Promise<void>;
  reconnect(): Promise<ProviderStatus>;
  getGiftCatalog(): Promise<GiftCatalogItem[]>;
  onEvent(handler: (event: NormalizedTikTokEvent) => void): () => void;
  onStatus(handler: (status: ProviderStatus) => void): () => void;
}
