// 雪量是独立于季节的连续状态；只接收有效游玩时间，暂停和离线不补算。
import {SNOW_BUILD_MS,SNOW_MELT_MS} from '../config/camp-climate.js';
export {SNOW_BUILD_MS,SNOW_MELT_MS};
// 阴天保留积雪，晴天和降雨渐融；大雪逐渐覆盖原有树冠、屋顶与地面雪坡。
export function advanceSnowCover(cover, weather, milliseconds) {
  const value = Math.max(0, Math.min(1, Number(cover) || 0));
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return value;
  const rate = weather === 'snow' ? 1 / SNOW_BUILD_MS : weather === 'sun' ? -1 / SNOW_MELT_MS : ['rain','thunder'].includes(weather) ? -1 / (SNOW_MELT_MS * 1.5) : 0;
  return Math.max(0, Math.min(1, value + milliseconds * rate));
}
