// 雨滴采用固定世界落点和独立哈希时钟，镜头移动或战斗随机数不会重排雨场。
import { WORLD } from './coordinates.js';
export const RAIN_CELL = { width: 60, height: 70 };

// 稳定随机值仅用于天气外观，不消费游戏与音频的随机序列。
export function weatherNoise(seed) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return value - Math.floor(value);
}
// 固定粒子先后渐入；阈值附近平滑变化，强度改变不影响位置或下落相位。
export function precipitationPresence(intensity, seed) {
  const start = weatherNoise(seed + 411) * .72;
  const t = Math.max(0, Math.min(1, (intensity - start) / .28));
  return t * t * (3 - 2 * t);
}

// 降水在角色附近减淡，保护敌人、枪口与攻击提示，不添加全屏遮罩。
export function rainVisibility(x, y, focus) {
  if (!focus) return 1;
  return .3 + .7 * Math.max(0, Math.min(1, (Math.hypot(x-focus.x, y-focus.y) - 45) / 110));
}

// 单个世界网格负责一滴雨的下落、水花和消退，地图接缝两侧共享相位。
export function rainSample(column, row, time, storm = 0) {
  const columns = WORLD.width / RAIN_CELL.width,
    rows = WORLD.height / RAIN_CELL.height;
  const cx = ((column % columns) + columns) % columns;
  const cy = ((row % rows) + rows) % rows;
  const seed = cx * 37 + cy * 7919;
  const n = weatherNoise(seed),
    height = 180 + weatherNoise(seed + 1) * 180;
  const fallDuration = 0.38 + n * 0.22,
    splashDuration = 0.32;
  // 暴雨通过密度、雨丝和风表现，周期固定以免强度渐变时落点来回跳动。
  const duration = fallDuration + splashDuration + 0.7;
  const phase = (((time + weatherNoise(seed + 2) * 5) % duration) + duration) % duration;
  const falling = phase < fallDuration;
  const fall = Math.min(1, phase / fallDuration);
  const splash = (phase - fallDuration) / splashDuration;
  const wind = 0.17 + storm * 0.12 + Math.sin(time * 0.75) * 0.045;
  const x = column * RAIN_CELL.width + 8 + n * 44;
  const y = row * RAIN_CELL.height + 9 + weatherNoise(seed + 3) * 52;
  return {
    seed,
    x,
    y,
    n,
    falling,
    splash,
    wind,
    dropX: x + height * (1 - fall) * wind,
    dropY: y - height * (1 - fall),
    length: 10 + weatherNoise(seed + 4) * 16 + storm * 9,
    width: 0.65 + weatherNoise(seed + 5) * 0.8,
  };
}
