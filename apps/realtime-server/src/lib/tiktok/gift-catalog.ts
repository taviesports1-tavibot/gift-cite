import type { GiftCatalogItem } from "@gift-chaos/shared";

export interface RawWebcastGift {
  id?: string | number;
  name?: string;
  diamond_count?: number;
  diamondCount?: number;
  picture?: { url_list?: string[]; urlList?: string[] };
  icon?: { url_list?: string[]; urlList?: string[] };
  image?: { url_list?: string[]; urlList?: string[] };
}

export function normalizeGiftCatalog(gifts: RawWebcastGift[], now = new Date()): GiftCatalogItem[] {
  return gifts.map(gift => {
    const image = gift.picture?.url_list?.[0] ?? gift.picture?.urlList?.[0] ?? gift.icon?.url_list?.[0] ?? gift.icon?.urlList?.[0] ?? gift.image?.url_list?.[0] ?? gift.image?.urlList?.[0];
    return {
      id: String(gift.id ?? gift.name),
      name: gift.name ?? "Gift",
      coinValue: gift.diamond_count ?? gift.diamondCount ?? 0,
      image: image?.startsWith("https://") ? image : undefined,
      available: true,
      updatedAt: now.toISOString(),
    };
  });
}
