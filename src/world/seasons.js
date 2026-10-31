import { i18nText } from "../i18n/index.js";
import { durationFor } from './environment-timing.js';
// 四境森林四季配置：只影响物候与图像，保持地图碰撞和资源身份不变。
export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
export const SEASON_NAMES = { spring: i18nText("world.seasons.b3c33b7aba"), summer: i18nText("world.seasons.8482432c02"), autumn: i18nText("world.seasons.5a2e5e4b12"), winter: i18nText("world.seasons.0868fbc8c0") };
// 手动与自动轮转共用自然顺序，不抽取随机季节。
export function nextSeason(season) {
  return SEASONS[(SEASONS.indexOf(normalizeSeason(season)) + 1) % SEASONS.length];
}
// 兼容之前保存的原景色；无效存档仍回到用户已确认的冬景。
export function normalizeSeason(value) {
  return value === 'green' ? 'summer' : SEASONS.includes(value) ? value : 'winter';
}
// 排除当前选项再抽取，防止点击后看起来没有变化；不消费战斗随机数。
export function differentChoice(values, current, random = Math.random) {
  const choices = values.filter(value => value !== current);
  const roll = Math.max(0, Math.min(.999999, Number(random()) || 0));
  return choices[Math.floor(roll * choices.length)] || current;
}

// 每季五分钟，一轮二十分钟；独立于昼夜和天气时钟。
export const SEASON_DURATION = 5 * 60 * 1000;
export const SEASON_CYCLE_DURATION = SEASONS.length * SEASON_DURATION;
// 手动选择后从该季节重新计时，不改变战斗或天气偏好。
export function restartSeasonCycle(state,season=state.forestSeason,now=Date.now()) {
  state.forestSeason=normalizeSeason(season);state.seasonAt=now;
}
// 后台跳时按整季直接前进，避免补播或每帧重复换季；回拨时重建锚点。
export function advanceSeasonCycle(state,now=Date.now()) {
  if(!Number.isFinite(state.seasonAt)||now<state.seasonAt){state.seasonAt=now;return false;}
  const steps=Math.floor((now-state.seasonAt)/durationFor(state,'season'));
  if(steps<1)return false;
  state.forestSeason=SEASONS[(SEASONS.indexOf(normalizeSeason(state.forestSeason))+steps%SEASONS.length)%SEASONS.length];
  state.seasonAt+=steps*durationFor(state,'season');return true;
}
// 剩余时间只供界面显示，不写存档也不消费随机数。
export function seasonRemaining(state,now=Date.now()) {
  if(state.calendarActive&&!state.livingPreview)return state.livingSeasonRemaining;
  return Math.max(0,Math.min(durationFor(state,'season'),durationFor(state,'season')-(now-(state.seasonAt??now))));
}
