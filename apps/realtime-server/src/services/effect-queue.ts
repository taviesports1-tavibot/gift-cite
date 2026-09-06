import type { VisualEffectEvent } from "@gift-chaos/shared";

export class EffectQueue {
  private queue: VisualEffectEvent[] = [];
  private timer?: NodeJS.Timeout;
  constructor(private emit: (effect: VisualEffectEvent) => void) {}
  push(effect: VisualEffectEvent) {
    if (this.queue.length > 30) {
      const existing = this.queue.find(item => item.asset === effect.asset && item.username === effect.username);
      if (existing) { existing.repeatCount += effect.repeatCount; existing.damage += effect.damage; existing.type = "rain"; return; }
    }
    this.queue.push(effect);
    this.start();
  }
  clear() { this.queue = []; }
  size() { return this.queue.length; }
  private start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      const next = this.queue.shift();
      if (next) this.emit(next);
      if (!this.queue.length && this.timer) { clearInterval(this.timer); this.timer = undefined; }
    }, 90);
    this.timer.unref();
  }
}
