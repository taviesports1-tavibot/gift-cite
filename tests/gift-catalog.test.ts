import { describe, expect, it } from "vitest";
import { normalizeGiftCatalog } from "../apps/realtime-server/src/lib/tiktok/gift-catalog";

describe("TikTok gift catalog", () => {
  it("keeps the provider gift id, price and exact HTTPS thumbnail", () => {
    const [gift] = normalizeGiftCatalog([{ id: 5655, name: "Rose", diamond_count: 1, picture: { urlList: ["https://p16-webcast.tiktokcdn.com/rose.png"] } }], new Date("2026-09-06T00:00:00.000Z"));
    expect(gift).toMatchObject({ id: "5655", name: "Rose", coinValue: 1, image: "https://p16-webcast.tiktokcdn.com/rose.png", available: true });
  });

  it("does not expose non-HTTPS image URLs", () => {
    const [gift] = normalizeGiftCatalog([{ id: "unsafe", name: "Unsafe", picture: { url_list: ["javascript:alert(1)"] } }]);
    expect(gift?.image).toBeUndefined();
  });
});
