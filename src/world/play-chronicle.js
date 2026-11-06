import { i18nText } from "../i18n/index.js";
// 游玩档案独立于成长和环境锚点，累计实际游玩而不补算离线时间。
import { SEASONS } from './seasons.js';
// 存档只保留阶段内已游玩时长，不保存可用于补算离线的设备时间。
function normalizeCycle(raw, phases) {
  if(!raw||!phases.includes(raw.phase)||!Number.isInteger(raw.steps)||raw.steps<0||raw.steps>=phases.length
    ||!Number.isFinite(raw.duration)||raw.duration<30000||raw.duration>3600000
    ||!Number.isFinite(raw.elapsed)||raw.elapsed<0||raw.elapsed>=raw.duration)return null;
  return {phase:raw.phase,steps:raw.steps,elapsed:raw.elapsed,duration:raw.duration};
}
export const CHRONICLE_WEATHERS = ['sun','cloud','rain','thunder','snow','gust'];
export const WEATHER_NAMES = { gust:"阵风", sun:i18nText("ui.panels.environment.749c359ed0"), cloud:i18nText("ui.panels.environment.30c379777e"), rain:i18nText("ui.panels.environment.570764f969"), thunder:i18nText("ui.panels.environment.9ddc77d893"), snow:i18nText("ui.panels.environment.bc4e5aec66") };
// 只接收有限非负数，未知天气与无效字段不进入持久化统计。
export function normalizeChronicle(raw) {
  const safe=value=>Number.isFinite(value)&&value>=0?Math.min(value,Number.MAX_SAFE_INTEGER):0;
  // 旧版折算值无法还原真实轮转，保留天气时长，历法从新规则启用后记录。
  return {version:2,years:raw?.version===2?Math.floor(safe(raw.years)):0,
    days:raw?.version===2?Math.floor(safe(raw.days)):0,
    cycles:{season:normalizeCycle(raw?.cycles?.season,SEASONS),day:normalizeCycle(raw?.cycles?.day,['day','dusk','night'])},
    weatherMs:Object.fromEntries(CHRONICLE_WEATHERS.map(key=>[key,safe(raw?.weatherMs?.[key])]))};
}
// 只记录实际天气时长；历法只能由环境的完整自然轮转增加。
export function recordPlayTime(record,milliseconds,environment) {
  if(!Number.isFinite(milliseconds)||milliseconds<=0||!CHRONICLE_WEATHERS.includes(environment.weather))return;
  record.weatherMs[environment.weather]+=milliseconds;
}
// 年和天是两种独立自然周期的累计次数，不再使用现实世界的365天换算。
export function chronicleSummary(record) {
  const totalMs=Object.values(record.weatherMs).reduce((sum,value)=>sum+value,0),days=Math.floor(record.days);
  return {totalMs,totalDays:days,years:record.years,days,
    // 新的阵风与主天气共用游玩时间；仅为确有历史时长的旧档显示独占阵风记录。
    weather:CHRONICLE_WEATHERS.filter(key=>key!=='gust'||record.weatherMs.gust>0)
      .map(key=>({key,name:WEATHER_NAMES[key],ms:record.weatherMs[key],percent:totalMs?record.weatherMs[key]/totalMs*100:0}))};
}
