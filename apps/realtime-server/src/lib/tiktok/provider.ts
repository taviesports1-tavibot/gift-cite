import { DemoTikTokProvider } from "./demo-provider.js";
import { WebcastTikTokProvider } from "./webcast-provider.js";
import type { TikTokLiveProvider } from "./types.js";
export function createTikTokProvider(): TikTokLiveProvider {
  return process.env.TIKTOK_PROVIDER === "webcast" ? new WebcastTikTokProvider() : new DemoTikTokProvider();
}
