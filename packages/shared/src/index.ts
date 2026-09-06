export type ConnectionStatus = "connected" | "reconnecting" | "disconnected";
export type GameStatus = "idle" | "running" | "paused" | "ended";
export type BossReaction = "idle" | "hit" | "angry" | "stunned" | "wet" | "burned" | "shocked" | "defeated" | "rage";
export type EffectType = "projectile" | "drop" | "splash" | "explosion" | "particleBurst" | "rain" | "screenEffect" | "environmentEffect" | "ultimate";
export type EffectId = "egg" | "tomato" | "donut" | "shoe" | "brick" | "bucket" | "toilet" | "bomb" | "meteor";

export interface ViewerIdentity { id: string; username: string; avatar?: string }
export interface GiftCatalogItem { id: string; name: string; image?: string; coinValue: number; available: boolean; updatedAt: string }
export interface GiftMapping {
  giftId: string; giftName: string; giftImage?: string; coinValue: number; effect: EffectId; effectType: EffectType;
  damage: number; multiplier: number; cooldownMs: number; intensity: number; speed: number;
  scale: number; particles: number; screenShake: number; sound: string; enabled: boolean;
}
export interface NormalizedTikTokEvent {
  id: string; kind: "gift" | "like" | "follow" | "share" | "comment" | "join";
  viewer: ViewerIdentity; occurredAt: string; giftId?: string; giftName?: string;
  coinValue?: number; repeatCount?: number; streakId?: string; streakFinished?: boolean;
  likeCount?: number; comment?: string;
}
export interface VisualEffectEvent {
  id: string; type: EffectType; asset: EffectId; origin: "left" | "right" | "top";
  target: "bossHead" | "bossBody" | "stage"; impact: string; damage: number;
  repeatCount: number; intensity: number; username: string; reaction: BossReaction; critical: boolean;
}
export interface LeaderboardRow { viewerId: string; username: string; avatar?: string; coins: number; damage: number; gifts: number }
export interface FeedItem { id: string; kind: NormalizedTikTokEvent["kind"]; text: string; createdAt: string }
export interface GameSettings {
  appName: string; bossMaxHp: number; roundResetDelayMs: number; likeGoal: number;
  maxConcurrentEffects: number; comboWindowMs: number; commentsEnabled: boolean;
  leaderboardEnabled: boolean; soundEnabled: boolean; masterVolume: number; effectsVolume: number; autoNewRound: boolean;
  safeZones: { top: number; right: number; bottom: number; left: number };
}
export interface GameStats {
  totalViewers: number; totalGifts: number; totalCoins: number; totalLikes: number;
  newFollowers: number; shares: number; totalDamage: number; bossesDefeated: number;
  roundsCompleted: number; mostPopularGift?: string; largestGift?: string; longestCombo: number;
}
export interface GameState {
  sessionId: string; status: GameStatus; connection: ConnectionStatus; tiktokUsername?: string;
  hp: number; maxHp: number; round: number; combo: number; likeProgress: number;
  startedAt?: string; lastUpdatedAt: string; leaderboard: LeaderboardRow[]; feed: FeedItem[];
  stats: GameStats; settings: GameSettings; overlayClients: number; currentEvent?: string;
}

export const DEFAULT_SETTINGS: GameSettings = {
  appName: "ХАОС ПОДАРКОВ", bossMaxHp: 10_000, roundResetDelayMs: 10_000, likeGoal: 10_000,
  maxConcurrentEffects: 6, comboWindowMs: 3_500, commentsEnabled: true,
  leaderboardEnabled: true, soundEnabled: true, masterVolume: .7, effectsVolume: .85, autoNewRound: true,
  safeZones: { top: 5, right: 13, bottom: 18, left: 4 }
};

export const DEFAULT_MAPPINGS: GiftMapping[] = [
  { giftId: "rose", giftName: "Rose", giftImage: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/eba3a9bb85c33e017f3648eaf88d7189~tplv-obj.webp", coinValue: 1, effect: "egg", effectType: "projectile", damage: 5, multiplier: 1, cooldownMs: 80, intensity: 1, speed: 1, scale: 1, particles: 16, screenShake: 1, sound: "egg-impact", enabled: true },
  { giftId: "finger-heart", giftName: "Finger Heart", giftImage: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/a4c4dc437fd3a6632aba149769491f49.png~tplv-obj.webp", coinValue: 5, effect: "tomato", effectType: "projectile", damage: 30, multiplier: 1, cooldownMs: 100, intensity: 1, speed: 1.1, scale: 1, particles: 20, screenShake: 2, sound: "tomato-splat", enabled: true },
  { giftId: "doughnut", giftName: "Doughnut", giftImage: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/4e7ad6bdf0a1d860c538f38026d4e812~tplv-obj.webp", coinValue: 30, effect: "donut", effectType: "projectile", damage: 100, multiplier: 1, cooldownMs: 150, intensity: 1.2, speed: 1.1, scale: 1.05, particles: 24, screenShake: 3, sound: "donut-hit", enabled: true },
  { giftId: "hat-and-mustache", giftName: "Hat and Mustache", giftImage: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/2f1e4f3f5c728ffbfa35705b480fdc92~tplv-obj.webp", coinValue: 99, effect: "brick", effectType: "projectile", damage: 500, multiplier: 1, cooldownMs: 250, intensity: 1.5, speed: 1.4, scale: 1.1, particles: 32, screenShake: 6, sound: "brick-impact", enabled: true },
  { giftId: "galaxy", giftName: "Galaxy", giftImage: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/79a02148079526539f7599150da9fd28.png~tplv-obj.webp", coinValue: 1000, effect: "meteor", effectType: "ultimate", damage: 3000, multiplier: 1, cooldownMs: 700, intensity: 3, speed: 0.8, scale: 1.6, particles: 80, screenShake: 10, sound: "meteor", enabled: true }
];
