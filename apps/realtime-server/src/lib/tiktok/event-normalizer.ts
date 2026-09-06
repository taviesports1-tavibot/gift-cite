import { randomUUID } from "node:crypto";
import type { NormalizedTikTokEvent, ViewerIdentity } from "@gift-chaos/shared";

type RawUser = { userId?: string; uniqueId?: string; nickname?: string; profilePictureUrl?: string };
type RawGift = RawUser & { msgId?: string; giftId?: string | number; giftName?: string; diamondCount?: number; repeatCount?: number; repeatEnd?: boolean; giftType?: number };

export class TikTokEventNormalizer {
  private streakCounts = new Map<string, number>();
  private viewer(raw: RawUser): ViewerIdentity {
    return { id: String(raw.userId ?? raw.uniqueId ?? "unknown"), username: raw.uniqueId ?? raw.nickname ?? "viewer", avatar: raw.profilePictureUrl };
  }
  gift(raw: RawGift): NormalizedTikTokEvent | null {
    const streakId = String(raw.msgId ?? `${raw.userId}:${raw.giftId}`);
    const total = Math.max(1, raw.repeatCount ?? 1);
    const previous = this.streakCounts.get(streakId) ?? 0;
    const delta = Math.max(0, total - previous);
    if (raw.giftType === 1 && !raw.repeatEnd) {
      this.streakCounts.set(streakId, total);
      return delta === 0 ? null : this.makeGift(raw, streakId, delta, false);
    }
    this.streakCounts.delete(streakId);
    if (raw.giftType === 1 && delta === 0) return null;
    return this.makeGift(raw, streakId, Math.max(1, delta), true);
  }
  private makeGift(raw: RawGift, streakId: string, repeatCount: number, streakFinished: boolean): NormalizedTikTokEvent {
    return { id: `${streakId}:${raw.repeatCount ?? 1}`, kind: "gift", viewer: this.viewer(raw), occurredAt: new Date().toISOString(), giftId: String(raw.giftId ?? raw.giftName ?? "unknown"), giftName: raw.giftName ?? "Unknown Gift", coinValue: Math.max(0, raw.diamondCount ?? 0), repeatCount, streakId, streakFinished };
  }
  simple(kind: "like" | "follow" | "share" | "comment" | "join", raw: RawUser & { comment?: string; likeCount?: number; totalLikeCount?: number }): NormalizedTikTokEvent {
    return { id: randomUUID(), kind, viewer: this.viewer(raw), occurredAt: new Date().toISOString(), comment: raw.comment, likeCount: raw.likeCount ?? 1 };
  }
}
