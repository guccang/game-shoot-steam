// 短时阵风独立于主天气。树木、猫和水域采样同一阵风，不在各自绘制时抽签。
import { WORLD } from './coordinates.js';

// 只用游玩秒数排程。一次风过去后再抽静歇时长，暂停或连续重绘不会多抽一阵。
export class GustCycle {
  constructor(random = Math.random) {
    this.random = random;
    this.lastTime = null;
    this.nextAt = null;
    this.wave = null;
  }
  // 不补播室内或离线期间的阵风；启用、重新开局后先留短暂的安静期。
  sample(time, originX, enabled, frequent = false) {
    // 大风气候缩短静歇；天气退出后当前风自然消退。
    if(frequent&&!this.frequent)this.nextAt=time;
    this.frequent=frequent;
    if (!enabled || this.lastTime !== null && time < this.lastTime - .25) {
      this.wave = null;
      this.nextAt = null;
    }
    this.lastTime = time;
    if (!enabled) return null;
    if (this.nextAt === null) this.nextAt = time + 5 + this.random() * 9;
    if (this.wave && time >= this.wave.start + this.wave.duration + 1.4) this.wave = null;
    if (time >= this.nextAt) {
      const duration = 3 + this.random() * 2;
      this.wave = {start:time, originX, duration, peak:.55 + this.random() * .4};
      this.nextAt = time + duration + 1.4 + (frequent ? .5 + this.random() * 2 : 18 + this.random() * 24);
    }
    return this.wave;
  }
}

// 局部到达时间从右向左错开，在循环地图边界连续；正弦包络让起风和停风都平滑。
export function gustStrength(time, x, wave) {
  if (!wave) return 0;
  const delay = .5 - .5 * Math.sin((x-wave.originX) * 6 * Math.PI / WORLD.width);
  const progress = (time - wave.start - delay) / wave.duration;
  if (progress <= 0 || progress >= 1) return 0;
  return wave.peak * Math.sin(Math.PI * progress) ** 2 * (.96 + .04 * Math.cos(6*Math.PI*progress));
}
