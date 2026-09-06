import type { GameState, GiftCatalogItem, GiftMapping, NormalizedTikTokEvent } from "@gift-chaos/shared";
import { getPrisma } from "@gift-chaos/database";
type MappingRow = { giftId: string; effect: string; effectType: string; damage: number; multiplier: number; cooldownMs: number; intensity: number; speed: number; scale: number; particles: number; screenShake: number; sound: string; enabled: boolean; gift: { name: string; image: string | null; coinValue: number } };

export async function loadSnapshot(sessionId: string): Promise<GameState | null> {
  if (!process.env.DATABASE_URL) return null;
  const prisma = getPrisma();
  const snapshot = await prisma.gameSnapshot.findUnique({ where: { sessionId } });
  return snapshot?.state as unknown as GameState | null;
}

export async function saveSnapshot(state: GameState): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  const prisma = getPrisma();
  await prisma.streamSession.upsert({
    where: { id: state.sessionId },
    create: { id: state.sessionId, status: state.status, currentHp: state.hp, tiktokUsername: state.tiktokUsername },
    update: { status: state.status, currentHp: state.hp, totalLikes: state.stats.totalLikes, totalGifts: state.stats.totalGifts, totalCoins: state.stats.totalCoins, totalDamage: state.stats.totalDamage, tiktokUsername: state.tiktokUsername }
  });
  await prisma.gameSnapshot.upsert({ where: { sessionId: state.sessionId }, create: { sessionId: state.sessionId, state: state as never }, update: { state: state as never } });
}

export async function loadMappings(): Promise<GiftMapping[]> {
  if (!process.env.DATABASE_URL) return [];
  const prisma = getPrisma();
  const rows = await prisma.giftMapping.findMany({ include: { gift: true }, orderBy: { gift: { coinValue: "asc" } } });
  return (rows as MappingRow[]).map(row => ({ giftId: row.giftId, giftName: row.gift.name, giftImage: row.gift.image ?? undefined, coinValue: row.gift.coinValue, effect: row.effect as GiftMapping["effect"], effectType: row.effectType as GiftMapping["effectType"], damage: row.damage, multiplier: row.multiplier, cooldownMs: row.cooldownMs, intensity: row.intensity, speed: row.speed, scale: row.scale, particles: row.particles, screenShake: row.screenShake, sound: row.sound, enabled: row.enabled }));
}

export async function loadCatalog(): Promise<GiftCatalogItem[]> {
  if (!process.env.DATABASE_URL) return [];
  const prisma = getPrisma();
  const rows = await prisma.giftCatalog.findMany({ orderBy: { coinValue: "asc" } });
  return rows.map((item: { id: string; name: string; image: string | null; coinValue: number; available: boolean; updatedAt: Date }) => ({ id: item.id, name: item.name, image: item.image ?? undefined, coinValue: item.coinValue, available: item.available, updatedAt: item.updatedAt.toISOString() }));
}

export async function saveMapping(mapping: GiftMapping, previousGiftId?: string) {
  if (!process.env.DATABASE_URL) return;
  const prisma = getPrisma();
  if (previousGiftId && previousGiftId !== mapping.giftId) await prisma.giftMapping.deleteMany({ where: { giftId: previousGiftId } });
  await prisma.giftCatalog.upsert({ where: { id: mapping.giftId }, create: { id: mapping.giftId, name: mapping.giftName, image: mapping.giftImage, coinValue: mapping.coinValue }, update: { name: mapping.giftName, image: mapping.giftImage, coinValue: mapping.coinValue } });
  await prisma.giftMapping.upsert({ where: { giftId: mapping.giftId }, create: { giftId: mapping.giftId, effect: mapping.effect, effectType: mapping.effectType, damage: mapping.damage, multiplier: mapping.multiplier, cooldownMs: mapping.cooldownMs, intensity: mapping.intensity, speed: mapping.speed, scale: mapping.scale, particles: mapping.particles, screenShake: mapping.screenShake, sound: mapping.sound, enabled: mapping.enabled }, update: { effect: mapping.effect, effectType: mapping.effectType, damage: mapping.damage, multiplier: mapping.multiplier, cooldownMs: mapping.cooldownMs, intensity: mapping.intensity, speed: mapping.speed, scale: mapping.scale, particles: mapping.particles, screenShake: mapping.screenShake, sound: mapping.sound, enabled: mapping.enabled } });
}

export async function saveCatalog(items: GiftCatalogItem[]) {
  if (!process.env.DATABASE_URL || !items.length) return;
  const prisma = getPrisma();
  await prisma.$transaction(items.map(item => prisma.giftCatalog.upsert({ where: { id: item.id }, create: { id: item.id, name: item.name, image: item.image, coinValue: item.coinValue, available: item.available }, update: { name: item.name, image: item.image, coinValue: item.coinValue, available: item.available } })));
}

export async function recordEvent(event: NormalizedTikTokEvent, state: GameState, damage: number) {
  if (!process.env.DATABASE_URL) return;
  const prisma = getPrisma();
  await prisma.viewer.upsert({ where: { id: event.viewer.id }, create: { id: event.viewer.id, username: event.viewer.username, avatar: event.viewer.avatar }, update: { username: event.viewer.username, avatar: event.viewer.avatar } });
  await prisma.gameEvent.upsert({ where: { id: event.id }, create: { id: event.id, sessionId: state.sessionId, kind: event.kind, payload: event as never, occurredAt: new Date(event.occurredAt) }, update: {} });
  await prisma.round.upsert({ where: { sessionId_number: { sessionId: state.sessionId, number: state.round } }, create: { sessionId: state.sessionId, number: state.round, damage, giftEvents: event.kind === "gift" ? Math.max(1, event.repeatCount ?? 1) : 0 }, update: { damage: { increment: damage }, giftEvents: { increment: event.kind === "gift" ? Math.max(1, event.repeatCount ?? 1) : 0 }, endTime: state.hp <= 0 ? new Date(event.occurredAt) : undefined, winnerId: state.hp <= 0 ? event.viewer.id : undefined, winnerUsername: state.hp <= 0 ? event.viewer.username : undefined } });
  if (event.kind !== "gift" || !event.giftId) return;
  const repeat = Math.max(1, event.repeatCount ?? 1); const coins = Math.max(0, event.coinValue ?? 0) * repeat;
  await prisma.giftCatalog.upsert({ where: { id: event.giftId }, create: { id: event.giftId, name: event.giftName ?? event.giftId, coinValue: event.coinValue ?? 0 }, update: { name: event.giftName ?? event.giftId, coinValue: event.coinValue ?? 0 } });
  await prisma.giftEvent.upsert({ where: { id: event.id }, create: { id: event.id, sessionId: state.sessionId, viewerId: event.viewer.id, giftId: event.giftId, giftName: event.giftName ?? event.giftId, coinValue: event.coinValue ?? 0, repeatCount: repeat, streakId: event.streakId, damage, occurredAt: new Date(event.occurredAt) }, update: {} });
  await prisma.leaderboardEntry.upsert({ where: { sessionId_viewerId: { sessionId: state.sessionId, viewerId: event.viewer.id } }, create: { sessionId: state.sessionId, viewerId: event.viewer.id, coins, damage, gifts: repeat }, update: { coins: { increment: coins }, damage: { increment: damage }, gifts: { increment: repeat } } });
}
