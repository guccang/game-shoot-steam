// 休息弹窗的钟点与时长文案，仅投影正式历法，不驱动时间推进。
import {calendarView,livingClockMinutes} from '../world/living-calendar.js';
import {cottageSleepTarget} from '../core/cottage.js';

// 使用24小时制，午夜后的连续分钟折回钟面。
function clockText(minutes){const value=minutes%1440;return String(Math.floor(value/60)).padStart(2,'0')+':'+String(value%60).padStart(2,'0');}
// 时长与屏幕上可见的分钟对齐，不出现零分钟但钟点不同的预告。
function durationText(minutes){const hours=Math.floor(minutes/60),rest=minutes%60;return (hours?hours+'小时':'')+(rest?rest+'分':'');}
// 两个选项使用同一时刻快照，夜晚选下一时段与明早显示相同的实际结果。
export function cottageRestTimeView(calendar){
 const current=livingClockMinutes(calendar),view={current:clockText(current)+' · '+calendarView(calendar).name};
 for(const mode of ['phase','morning']){
  const target=cottageSleepTarget(calendar,mode),minute=livingClockMinutes(target);
  const duration=minute-current+(target.elapsed<=calendar.elapsed?1440:0);
  view[mode]=clockText(minute)+' · 跳过'+durationText(duration);
 }
 return view;
}
