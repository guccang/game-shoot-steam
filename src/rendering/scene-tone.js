// 环境色在游戏画布内用少量色块合成，移除浏览器逐帧全屏 CSS 滤镜和混色图层。
import { EnvironmentTransition, WEATHER_FADE_DURATION } from '../world/environment.js';

// 阴雨主要改变明暗；限制去色和夜间二次压暗，保持角色、木色与植被的色彩区分。
export function toneValues(state) {
  const night = state.time === 'night' ? 1 : 0, dusk = state.time === 'dusk' ? 1 : 0;
  const weather = { sun: [1, 1], cloud: [0.98, 0.99], rain: [0.97, 0.985], thunder: [0.94, 0.97], snow: [0.99, 0.99] }[state.weather] || [1, 1];
  return { brightness: (night ? 0.88 : dusk ? 0.99 : 1) * weather[0],
    desaturate: 1 - weather[1], night, dusk };
}

export class SceneTone {
  // 十五秒权重与降水渐变同步，快速切换从当前亮度与颜色继续。
  constructor(state, now = 0) {
    this.target = toneValues(state);
    this.from = { ...this.target };
    this.started = Object.fromEntries(Object.keys(this.target).map(key => [key, now]));
    this.curve = new EnvironmentTransition(state, now);
  }
  // 停止动态时直接显示目标色，其余情况使用原十五秒缓入缓出曲线。
  sample(now, reduced = false) {
    return Object.fromEntries(Object.keys(this.target).map(key => {
      const progress = Math.max(0, Math.min(1, (now - this.started[key]) / WEATHER_FADE_DURATION));
      const weight = reduced || progress >= 1 ? 1 : progress <= 0 ? 0 : this.curve.ease(progress);
      return [key, this.from[key] + (this.target[key] - this.from[key]) * weight];
    }));
  }
  // 每个分量独立更新，切天气不会使正在进行的昼夜过渡闪回。
  set(state, now) {
    const next = toneValues(state), current = this.sample(now);
    for (const key of Object.keys(next))
      if (next[key] !== this.target[key]) {
        this.from[key] = current[key]; this.target[key] = next[key]; this.started[key] = now;
      }
  }
  // 在已有 Canvas 上完成明暗与暖冷合成，不读回整屏像素、不生成第二份全屏纹理。
  draw(c, width, height, state, now, reduced) {
    this.set(state, now);
    const value = this.sample(now, reduced);
    if (value.brightness === 1 && !value.desaturate && !value.night && !value.dusk) return;
    c.save();
    if (value.desaturate > 0.001) {
      c.globalCompositeOperation = 'saturation';
      c.globalAlpha = value.desaturate;
      c.fillStyle = '#808080'; c.fillRect(0, 0, width, height);
    }
    if (value.dusk > 0.001) {
      c.globalCompositeOperation = 'soft-light';
      // 暖橙只轻染亮面，避免旧黄绿叠层把整片草地抹成朦胧的黄色。
      c.globalAlpha = value.dusk * 0.18;
      c.fillStyle = '#f6ad67'; c.fillRect(0, 0, width, height);
    }
    // 原 multiply 叠层折叠进同一个 RGB 乘色，保留黄昏暖色和夜晚蓝色。
    const dusk = value.dusk * 0.32, night = value.night * (32 / 255);
    const tint = [0, 1, 2].map(index => {
      const warm = [255, 194, 139][index], cool = [182, 207, 239][index];
      return Math.round(255 * value.brightness * (1 - dusk + dusk * warm / 255) *
        (1 - night + night * cool / 255));
    });
    c.globalCompositeOperation = 'multiply'; c.globalAlpha = 1;
    c.fillStyle = `rgb(${tint.join(',')})`; c.fillRect(0, 0, width, height);
    c.restore();
  }
}
