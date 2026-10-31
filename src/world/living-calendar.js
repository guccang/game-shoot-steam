// 生活历法只接收有效游玩增量；不读取设备时间，不补算离线。
import {LIVING_DAY_MS,LIVING_PHASES,LIVING_SEASONS,LIVING_SEASON_NAMES,LIVING_CLOCK_HOURS} from '../config/living-world.js';
import { GAMEPLAY_TABLES } from '../config/gameplay-tables.js';
// 季长由正式时长表折算，日历、季节圆环和日期文案使用相同天数。
export function livingSeasonDays(){return GAMEPLAY_TABLES.calendarTimings.season/LIVING_DAY_MS;}
// 把时段进度投影为游戏分钟；午夜后保留大于1440的分钟数，便于计算跨夜休息。
export function livingClockMinutes(calendar){
  const phase=calendarView(calendar),index=LIVING_PHASES.findIndex(p=>p.id===phase.id);
  const start=LIVING_CLOCK_HOURS[phase.id]*60,next=LIVING_PHASES[index+1];
  const end=next?LIVING_CLOCK_HOURS[next.id]*60:LIVING_CLOCK_HOURS.day*60+1440;
  return Math.floor(start+(calendar.elapsed-phase.start)/phase.duration*(end-start));
}
// 日期单独版本化，不把旧的四季累计误算成新年份。
export function normalizeLivingCalendar(raw){
  return {day:Number.isSafeInteger(raw?.day)&&raw.day>=0?Math.min(raw.day,999999):0,
    elapsed:Number.isFinite(raw?.elapsed)&&raw.elapsed>=0&&raw.elapsed<LIVING_DAY_MS?raw.elapsed:0};
}
// 时段、季节和活动周期都由同一绝对游戏日期派生。
export function calendarView(calendar){
  const days=livingSeasonDays(),yearDays=days*LIVING_SEASONS.length;
  const phase=LIVING_PHASES.findLast(p=>calendar.elapsed>=p.start),seasonIndex=Math.floor(calendar.day/days)%LIVING_SEASONS.length;
  return {...phase,remaining:phase.start+phase.duration-calendar.elapsed,season:LIVING_SEASONS[seasonIndex],seasonIndex,
    seasonDay:calendar.day%days+1,year:Math.floor(calendar.day/yearDays)+1,market:calendar.day%days===days-1,
    label:`第${Math.floor(calendar.day/yearDays)+1}年 · ${LIVING_SEASON_NAMES[seasonIndex]}${calendar.day%days+1}日 · ${phase.name}`};
}
// 休息和自然推进走相同进位规则，不产生货币、物资或重复奖励。
export function advanceLivingCalendar(calendar,milliseconds){
  if(!Number.isFinite(milliseconds)||milliseconds<=0)return false;
  const previous=calendarView(calendar),total=calendar.elapsed+milliseconds;
  calendar.day=Math.min(999999,calendar.day+Math.floor(total/LIVING_DAY_MS));calendar.elapsed=total%LIVING_DAY_MS;
  const next=calendarView(calendar);return previous.id!==next.id||previous.seasonDay!==next.seasonDay||previous.year!==next.year||previous.season!==next.season;
}
// 环境只接收日历投影；预览不回写日期，退出预览时恢复正式时段。
export function projectLivingCalendar(environment,calendar,now=Date.now()){
  const view=calendarView(calendar);environment.calendarActive=true;environment.livingPhaseRemaining=view.remaining;
  const days=livingSeasonDays();environment.livingSeasonRemaining=(days-calendar.day%days)*LIVING_DAY_MS-calendar.elapsed;
  if(environment.livingPreview)return false;
  const changed=environment.time!==view.id||environment.forestSeason!==view.season;
  environment.time=view.id;environment.forestSeason=view.season;environment.dayCycleAt=now-calendar.elapsed;
  return changed;
}
