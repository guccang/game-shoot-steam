// 雷阵雨节奏使用环境时钟，不参与战斗随机数；进入天气后重新计时。
export const LIGHTNING_CLIP = { fps: 24, frames: 18, duration: 18 / 24 };

// 非循环序列帧在结束后返回空帧，避免闪电停留在屏幕或反复闪回。
export function lightningFrame(age) {
  if (age < 0 || age >= LIGHTNING_CLIP.duration) return -1;
  return Math.min(LIGHTNING_CLIP.frames - 1, Math.floor(age * LIGHTNING_CLIP.fps));
}

export class StormCycle {
  // 闪电每十一秒出现一次，雷声滞后，切换天气后不补播积压音效。
  constructor() {
    this.started = null;
    this.sounded = -1;
  }
  // 返回本帧环境表现；减少动态时完全关闭闪光与闪电，保留雨天氛围。
  sample(now, enabled, reduced = false) {
    if (!enabled) {
      this.started = null;
      this.sounded = -1;
      return { flash: 0, thunder: false, cycle: 0, frame: -1, age: -1 };
    }
    this.started ??= now;
    const elapsed = Math.max(0, (now - this.started) / 1000);
    const cycle = Math.floor(elapsed / 11),
      phase = elapsed % 11;
    const age = phase - 2;
    const frame = reduced ? -1 : lightningFrame(age);
    const flash = frame >= 0 ? Math.sin((age / LIGHTNING_CLIP.duration) * Math.PI) : 0;
    const thunder = phase >= 3 && phase < 4 && this.sounded !== cycle;
    if (thunder) this.sounded = cycle;
    return { flash, thunder, cycle, frame, age };
  }
}
