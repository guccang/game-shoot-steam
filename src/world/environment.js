import { GAMEPLAY_TABLES } from '../config/gameplay-tables.js';
import { i18nText } from "../i18n/index.js";
import { durationFor, dayDuration, normalizeTimings } from './environment-timing.js';
import { chooseSeasonWeather } from './season-weather.js';
/* 环境阶段与锚点计算：运行时由自然时钟剔除暂停、后台和离线耗时。 */
'use strict';
import { normalizeSeason, SEASONS, differentChoice, restartSeasonCycle, advanceSeasonCycle } from './seasons.js';
export const DAY_PHASES = GAMEPLAY_TABLES.dayPhases.map(phase => ({...phase, duration: GAMEPLAY_TABLES.environmentTimings[phase.id]}));
export const TIME_NAMES = { day: i18nText("world.environment-timing.010ecccef0"), dusk: i18nText("world.environment-timing.c8923db07d"), night: i18nText("world.environment-timing.b77ea2b347") };
// 手动轮转与自动周期共用同一时段顺序，夜晚之后回到白昼。
export function nextDayPhase(time) {
  return DAY_PHASES[(DAY_PHASES.findIndex(phase => phase.id === time) + 1) % DAY_PHASES.length].id;
}
// 按当前时段而非整个昼夜周期显示圆环，关闭自动时保持完整余量。
export function dayPhaseRemaining(state, now = Date.now()) {
  if(state.calendarActive&&!state.livingPreview)return state.livingPhaseRemaining;
  const index = Math.max(0, DAY_PHASES.findIndex(phase => phase.id === state.time));
  const duration = durationFor(state,DAY_PHASES[index].id);
  if (!state.autoTime || !Number.isFinite(state.dayCycleAt)) return duration;
  const offset = DAY_PHASES.slice(0, index).reduce((sum, phase) => sum + durationFor(state,phase.id), 0);
  const elapsed = Math.max(0, now - state.dayCycleAt) % dayDuration(state);
  return Math.max(0, Math.min(duration, duration - (elapsed - offset)));
}
// 周期由各时段求和，避免配置与取模时长不一致。
export const DAY_CYCLE_DURATION = DAY_PHASES.reduce((sum, phase) => sum + phase.duration, 0);
export const WEATHER_INTERVAL = GAMEPLAY_TABLES.environmentTimings.weather;
// 天气、昼夜与晴阴光线共用十五秒缓入缓出，避免短暂切换像屏幕开关。
export const WEATHER_FADE_DURATION = 15000;
export const WEATHER_TYPES = ['sun', 'cloud', 'rain', 'thunder', 'snow', 'gust'];
// 自动天气关闭时圆环停留为完整余量，不显示一个不会触发切换的倒计时。
export function weatherRemaining(state, now = Date.now()) {
  return state.autoWeather ? Math.max(0, Math.min(durationFor(state,'weather'), durationFor(state,'weather') - (now - (state.weatherAt ?? now)))) : durationFor(state,'weather');
}
// 从选定时段重新开始计时，保留自动循环开关。
export function restartDayCycle(state, now = Date.now()) {
  const index = DAY_PHASES.findIndex((phase) => phase.id === state.time);
  state.dayCycleAt =
    now - DAY_PHASES.slice(0, Math.max(0, index)).reduce((sum, phase) => sum + durationFor(state,phase.id), 0);
}
// 为旧存档补充环境时钟，并校验天气、时段和自动开关。
export function normalizeEnvironment(state, now = Date.now()) {
  // 旧预览标记和上次地区只属会话，重新进入必须按实际位置重新抽取气候。
  state.livingPreview=false;delete state.climateCamp;
  state.timings = normalizeTimings(state.timings);
  state.forestSeason = normalizeSeason(state.forestSeason);
  if (!Number.isFinite(state.seasonAt)) restartSeasonCycle(state,state.forestSeason,now);
  if (typeof state.randomGusts !== 'boolean') state.randomGusts = true;
  if (!WEATHER_TYPES.includes(state.weather)) state.weather = 'sun';
  if (!DAY_PHASES.some((phase) => phase.id === state.time)) state.time = 'day';
  if (typeof state.autoTime !== 'boolean') state.autoTime = true;
  if (typeof state.autoWeather !== 'boolean') state.autoWeather = true;
  if (!Number.isFinite(state.dayCycleAt) || state.cycleVersion !== 3) restartDayCycle(state, now);
  state.cycleVersion = 3;
  if (!Number.isFinite(state.weatherAt)) state.weatherAt = now;
  return state;
}
// 有历法进度时延续季节，无进度时随机入场；天气按实际入场季节抽取。
export function beginEnvironmentVisit(state,now=Date.now(),random=Math.random,resumeSeason=null) {
  normalizeEnvironment(state,now);
  restartSeasonCycle(state,SEASONS.includes(resumeSeason)?resumeSeason:differentChoice(SEASONS,null,random),now);
  // 新入场从已保存的时段起点开始，不补算离线昼夜，也不将半段计作完整一段。
  restartDayCycle(state,now);
  state.weather=chooseSeasonWeather(state.forestSeason,null,random);
  state.weatherAt=now;return state;
}
// 按传入时刻定位阶段；运行时先剔除非游玩时间，随机天气排除当前类型。
export function advanceEnvironment(state, now = Date.now(), random = Math.random) {
  let changed = advanceSeasonCycle(state,now);
  // 自动天气跟随新季节重新选择一次，避免先按旧季节抽签；手动天气仍保留。
  if (changed && state.autoWeather) {
    state.weather=chooseSeasonWeather(state.forestSeason,null,random);state.weatherAt=now;
  }
  if (state.autoTime) {
    if (now < state.dayCycleAt) restartDayCycle(state, now);
    let elapsed = (now - state.dayCycleAt) % dayDuration(state);
    const phase = DAY_PHASES.find((phase) => {
      if (elapsed < durationFor(state,phase.id)) return true;
      elapsed -= durationFor(state,phase.id);
      return false;
    });
    if (state.time !== phase.id) {
      state.time = phase.id;
      changed = true;
    }
  }
  if (state.weatherAt > now) state.weatherAt = now;
  if (state.autoWeather && now - state.weatherAt >= durationFor(state,'weather')) {
    state.weather = chooseSeasonWeather(state.forestSeason, state.weather, random);
    state.weatherAt = now;
    changed = true;
  }
  return changed;
}

// 沿用源项目缓动曲线，昼夜与天气统一十五秒，快速连续切换从当前颜色继续，避免闪回。
export class EnvironmentTransition {
  // 每个权重独立记录起点，天气切换不会重启正在进行的昼夜过渡。
  constructor(state, now = 0) {
    this.target = this.values(state);
    this.from = { ...this.target };
    this.started = { night: now, dusk: now, rain: now, storm: now, snow: now };
  }
  // 时段与天气独立权重，阴雨不会覆盖夜间环境色。
  values(state) {
    return {
      night: Number(state.time === 'night'),
      dusk: Number(state.time === 'dusk'),
      rain: Number(state.weather === 'rain' || state.weather === 'thunder'),
      storm: Number(state.weather === 'thunder'),
      snow: Number(state.weather === 'snow'),
    };
  }
  // 对应 CSS cubic-bezier(.4,0,.2,1)，用二分求解共享的缓入缓出曲线。
  ease(progress) {
    let low = 0,
      high = 1,
      t = progress;
    for (let i = 0; i < 14; i++) {
      t = (low + high) / 2;
      const x = 3 * (1 - t) ** 2 * t * 0.4 + 3 * (1 - t) * t * t * 0.2 + t ** 3;
      if (x < progress) low = t;
      else high = t;
    }
    return 3 * (1 - t) * t * t + t ** 3;
  }
  // 减少动态模式立即切换光照，仍能辨认当前环境状态。
  sample(now, reduced = false) {
    const result = {};
    for (const key of Object.keys(this.target)) {
      const progress = Math.max(
        0,
        Math.min(1, (now - this.started[key]) / WEATHER_FADE_DURATION),
      );
      const weight = reduced || progress >= 1 ? 1 : progress <= 0 ? 0 : this.ease(progress);
      result[key] = this.from[key] + (this.target[key] - this.from[key]) * weight;
    }
    return result;
  }
  // 只在环境目标改变时重新计时，常规 HUD 更新不影响过渡。
  set(state, now) {
    const next = this.values(state);
    if (Object.keys(next).every((key) => next[key] === this.target[key])) return;
    const current = this.sample(now);
    for (const key of Object.keys(next))
      if (next[key] !== this.target[key]) {
        this.from[key] = current[key];
        this.target[key] = next[key];
        this.started[key] = now;
      }
  }
}
