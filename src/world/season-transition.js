// 季节外观独立于五分钟逻辑时钟，重定向时从当前混合状态继续。
import { SEASONS, normalizeSeason } from './seasons.js';
// 外观渐变用十五秒完成，独立于每季持续时间及天气、昼夜过渡。
export const SEASON_FADE_DURATION = 15000;
export class SeasonTransition {
  // 首次进入直接显示随机季节，不从无关季节淡入。
  constructor(season, now = 0) { this.reset(season, now); }
  // 地图预览可明确定位到某季，不消费随机数或改变环境设置。
  reset(season, now = 0) {
    this.target = normalizeSeason(season); this.from = { [this.target]: 1 };
    this.started = now - SEASON_FADE_DURATION; this.revision = (this.revision || 0) + 1;
  }
  // 连续点击时保留当前叶色与雪量，避免回跳到上一季的完整外观。
  set(season, now) {
    const next = normalizeSeason(season);
    if (next === this.target) return;
    this.from = this.sample(now).weights; this.target = next; this.started = now; this.revision++;
  }
  // 缓入缓出仅改变材质权重，锚点、碰撞、风摆和战斗时钟保持不变。
  sample(now) {
    const t = Math.max(0, Math.min(1, (now - this.started) / SEASON_FADE_DURATION));
    const progress = t * t * (3 - 2 * t), weights = {};
    for (const season of SEASONS) {
      weights[season] = (this.from[season] || 0) * (1 - progress) + (season === this.target ? progress : 0);
    }
    return { target: this.target, from: this.from, progress, weights, active: t < 1, revision: this.revision };
  }
}
