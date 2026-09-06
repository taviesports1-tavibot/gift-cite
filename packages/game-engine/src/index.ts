import { DEFAULT_MAPPINGS, DEFAULT_SETTINGS, type BossReaction, type FeedItem, type GameSettings, type GameState, type GiftMapping, type LeaderboardRow, type NormalizedTikTokEvent, type VisualEffectEvent } from "@gift-chaos/shared";

export interface ProcessResult { state: GameState; visual?: VisualEffectEvent; roundCompleted: boolean; duplicate: boolean }

export function createInitialState(sessionId = "live", settings: Partial<GameSettings> = {}): GameState {
  const merged = { ...DEFAULT_SETTINGS, ...settings, safeZones: { ...DEFAULT_SETTINGS.safeZones, ...settings.safeZones } };
  return {
    sessionId, status: "idle", connection: "disconnected", hp: merged.bossMaxHp,
    maxHp: merged.bossMaxHp, round: 1, combo: 0, likeProgress: 0,
    lastUpdatedAt: new Date().toISOString(), leaderboard: [], feed: [],
    stats: { totalViewers: 0, totalGifts: 0, totalCoins: 0, totalLikes: 0, newFollowers: 0, shares: 0, totalDamage: 0, bossesDefeated: 0, roundsCompleted: 0, longestCombo: 0 },
    settings: merged, overlayClients: 0
  };
}

export function calculateDamage(mapping: GiftMapping, repeatCount = 1, activeMultiplier = 1): number {
  const repeats = Math.max(1, Math.floor(repeatCount));
  return Math.max(0, Math.round(mapping.damage * mapping.multiplier * repeats * activeMultiplier));
}

export function reactionFor(effect: GiftMapping["effect"]): BossReaction {
  if (effect === "bucket") return "wet";
  if (effect === "bomb" || effect === "meteor") return "burned";
  if (effect === "toilet" || effect === "brick") return "stunned";
  return "hit";
}

export function aggregateRepeatVisual(repeats: number, mapping: GiftMapping): Pick<VisualEffectEvent, "type" | "repeatCount" | "intensity"> {
  if (repeats >= 8 && mapping.effect === "egg") return { type: "rain", repeatCount: repeats, intensity: Math.min(3, 1 + Math.log10(repeats)) };
  if (repeats >= 8 && mapping.effect === "tomato") return { type: "rain", repeatCount: repeats, intensity: Math.min(3, 1 + Math.log10(repeats)) };
  return { type: mapping.effectType, repeatCount: repeats, intensity: Math.min(3, mapping.intensity + Math.log10(repeats) * .35) };
}

export function updateLeaderboard(rows: LeaderboardRow[], event: NormalizedTikTokEvent, damage: number): LeaderboardRow[] {
  const repeat = Math.max(1, event.repeatCount ?? 1);
  const coins = Math.max(0, (event.coinValue ?? 0) * repeat);
  const existing = rows.find(row => row.viewerId === event.viewer.id);
  const next = existing
    ? rows.map(row => row.viewerId === existing.viewerId ? { ...row, username: event.viewer.username, avatar: event.viewer.avatar, coins: row.coins + coins, damage: row.damage + damage, gifts: row.gifts + repeat } : row)
    : [...rows, { viewerId: event.viewer.id, username: event.viewer.username, avatar: event.viewer.avatar, coins, damage, gifts: repeat }];
  return next.sort((a, b) => b.coins - a.coins || b.damage - a.damage).slice(0, 50);
}

function feedItem(event: NormalizedTikTokEvent, effect?: string): FeedItem {
  const name = `@${event.viewer.username}`;
  const text = event.kind === "gift" ? `${name} unleashed ${effect?.toUpperCase() ?? "CHAOS"}${(event.repeatCount ?? 1) > 1 ? ` ×${event.repeatCount}` : ""}`
    : event.kind === "comment" ? `${name}: ${event.comment ?? ""}`
    : event.kind === "like" ? `${name} sent ❤️`
    : event.kind === "follow" ? `${name} followed the LIVE`
    : event.kind === "share" ? `${name} shared the LIVE` : `${name} joined`;
  return { id: event.id, kind: event.kind, text, createdAt: event.occurredAt };
}

export class GameEngine {
  private processed = new Set<string>();
  private lastGiftAt = 0;
  constructor(public state: GameState, public mappings: GiftMapping[] = DEFAULT_MAPPINGS) {}

  setMappings(mappings: GiftMapping[]) { this.mappings = mappings; }

  process(event: NormalizedTikTokEvent): ProcessResult {
    if (this.processed.has(event.id)) return { state: this.state, roundCompleted: false, duplicate: true };
    this.processed.add(event.id);
    if (this.processed.size > 20_000) this.processed = new Set([...this.processed].slice(-10_000));
    const now = Date.parse(event.occurredAt) || Date.now();
    let state = { ...this.state, stats: { ...this.state.stats }, lastUpdatedAt: new Date(now).toISOString() };
    let visual: VisualEffectEvent | undefined;
    let roundCompleted = false;

    if (event.kind === "gift" && state.status !== "running") {
      this.state = state;
      return { state, roundCompleted: false, duplicate: false };
    }

    if (event.kind === "gift") {
      const mapping = this.mappings.find(item => item.enabled && (item.giftId === event.giftId || item.giftName.toLowerCase() === event.giftName?.toLowerCase()));
      if (mapping) {
        const repeat = Math.max(1, event.repeatCount ?? 1);
        const damage = calculateDamage(mapping, repeat);
        state.combo = now - this.lastGiftAt <= state.settings.comboWindowMs ? state.combo + repeat : repeat;
        this.lastGiftAt = now;
        state.hp = Math.max(0, state.hp - damage);
        state.leaderboard = updateLeaderboard(state.leaderboard, event, damage);
        state.stats.totalGifts += repeat;
        state.stats.totalCoins += (event.coinValue ?? mapping.coinValue) * repeat;
        state.stats.totalDamage += damage;
        state.stats.longestCombo = Math.max(state.stats.longestCombo, state.combo);
        state.stats.mostPopularGift = event.giftName ?? mapping.giftName;
        if ((event.coinValue ?? mapping.coinValue) >= 100) state.stats.largestGift = event.giftName ?? mapping.giftName;
        const aggregated = aggregateRepeatVisual(repeat, mapping);
        visual = { id: event.id, ...aggregated, asset: mapping.effect, origin: mapping.effectType === "drop" || mapping.effectType === "ultimate" ? "top" : Math.random() > .5 ? "left" : "right", target: mapping.effect === "meteor" ? "stage" : "bossHead", impact: `${mapping.effect}-impact`, damage, username: event.viewer.username, reaction: reactionFor(mapping.effect), critical: damage >= state.maxHp * .1 };
        state.feed = [feedItem(event, mapping.effect), ...state.feed].slice(0, 6);
        if (state.hp <= 0) {
          roundCompleted = true;
          state.stats.bossesDefeated += 1;
          state.stats.roundsCompleted += 1;
          state.currentEvent = `@${event.viewer.username} DESTROYED THE BOSS!`;
        }
      }
    } else {
      state.feed = [feedItem(event), ...state.feed].slice(0, 6);
      if (event.kind === "like") {
        const added = Math.max(1, event.likeCount ?? 1);
        state.likeProgress += added; state.stats.totalLikes += added;
        if (state.likeProgress >= state.settings.likeGoal) {
          state.likeProgress %= state.settings.likeGoal;
          state.currentEvent = "LIKE GOAL — EGG RAIN!";
          visual = { id: event.id, type: "rain", asset: "egg", origin: "top", target: "stage", impact: "egg-impact", damage: 0, repeatCount: 24, intensity: 2.5, username: event.viewer.username, reaction: "angry", critical: false };
        }
      }
      if (event.kind === "follow") state.stats.newFollowers += 1;
      if (event.kind === "share") state.stats.shares += 1;
      if (event.kind === "join") state.stats.totalViewers += 1;
    }
    this.state = state;
    return { state, visual, roundCompleted, duplicate: false };
  }

  command(command: string, value?: unknown): GameState {
    const now = new Date().toISOString();
    if (command === "start" || command === "resume") this.state = { ...this.state, status: "running", startedAt: this.state.startedAt ?? now };
    if (command === "pause") this.state = { ...this.state, status: "paused" };
    if (command === "end") this.state = { ...this.state, status: "ended" };
    if (command === "resetHp") this.state = { ...this.state, hp: this.state.maxHp, currentEvent: undefined };
    if (command === "resetRound") this.state = { ...this.state, hp: this.state.maxHp, round: this.state.round + 1, combo: 0, currentEvent: undefined };
    if (command === "setHp" && typeof value === "number") this.state = { ...this.state, hp: Math.max(0, Math.min(this.state.maxHp, value)) };
    if (command === "setConnection" && typeof value === "string") this.state = { ...this.state, connection: value as GameState["connection"] };
    this.state.lastUpdatedAt = now;
    return this.state;
  }
}
