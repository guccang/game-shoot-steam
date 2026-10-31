import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
import { GAMEPLAY_TABLES } from '../config/gameplay-tables.js';
import { i18nText } from "../i18n/index.js";
// 环境时长统一配置，单位毫秒；主界面圆环和设置读同一份数值。
export const DEFAULT_TIMINGS = Object.freeze(GAMEPLAY_TABLES.environmentTimings);
export const TIMING_NAMES = Object.freeze({ season:i18nText("world.environment-timing.f781245dee"), day:i18nText("world.environment-timing.010ecccef0"), dusk:i18nText("world.environment-timing.c8923db07d"), night:i18nText("world.environment-timing.b77ea2b347"), weather:i18nText("world.environment-timing.4d94732547") });
// 白名单迁移旧档与损坏数值，限制半分钟到一小时，避免无效周期与高频闪换。
export function normalizeTimings(raw) {
  return Object.fromEntries(Object.entries(DEFAULT_TIMINGS).map(([key,fallback])=>
    [key,Number.isFinite(raw?.[key]) ? Math.min(GAMEPLAY_VALUES.environment.maxTimingMs,Math.max(GAMEPLAY_VALUES.environment.timingStepMs,Math.round(raw[key]/GAMEPLAY_VALUES.environment.timingStepMs)*GAMEPLAY_VALUES.environment.timingStepMs)) : fallback]));
}
// 未迁移状态也可安全读取默认值，供纯逻辑测试和旧存档调用。
export function durationFor(state,key) {
  if(state.calendarActive&&!state.livingPreview&&key!=='weather')return GAMEPLAY_TABLES.calendarTimings[key];
  const value=state?.timings?.[key];
  return Number.isFinite(value)?Math.min(GAMEPLAY_VALUES.environment.maxTimingMs,Math.max(GAMEPLAY_VALUES.environment.timingStepMs,Math.round(value/GAMEPLAY_VALUES.environment.timingStepMs)*GAMEPLAY_VALUES.environment.timingStepMs)):DEFAULT_TIMINGS[key];
}
// 一个游戏日沿用完整白昼、黄昏与夜晚之和。
export function dayDuration(state) { return ['day','dusk','night'].reduce((sum,key)=>sum+durationFor(state,key),0); }
