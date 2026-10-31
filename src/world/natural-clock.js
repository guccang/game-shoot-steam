// 自然时钟与顶部圆环共用环境锚点，只接受可见游玩产生的时间增量。
import { advanceEnvironment, dayPhaseRemaining, restartDayCycle } from './environment.js';
import { seasonRemaining, restartSeasonCycle } from './seasons.js';
import { durationFor } from './environment-timing.js';
import { recordPlayTime, normalizeChronicle } from './play-chronicle.js';

// 任意入场季节/时段均可作为一轮起点，完整走过四季/三个时段后才入账。
export function createNaturalClock(environment, record, now = Date.now()) {
  // 恢复已自然经过的阶段及阶段内进度，锚点重建到现在，绝不补算离线。
  const saved=normalizeChronicle(record).cycles;
  if(saved.season)environment.forestSeason=saved.season.phase;
  if(saved.day)environment.time=saved.day.phase;
  restartSeasonCycle(environment,environment.forestSeason,now);
  restartDayCycle(environment,now);
  if(saved.season)environment.seasonAt-=saved.season.elapsed/saved.season.duration*durationFor(environment,'season');
  if(saved.day)environment.dayCycleAt-=saved.day.elapsed/saved.day.duration*durationFor(environment,environment.time);
  environment.weatherAt=now;
  let wallAt=now, seasonSteps=saved.season?.steps??0, daySteps=saved.day?.steps??0;
  record.cycles={};
  // 与累计数放在同一份档案原子保存，避免退出时阶段和计数来自不同帧。
  function capture(now) {
    const seasonDuration=durationFor(environment,'season'),dayDuration=durationFor(environment,environment.time);
    record.cycles.season={phase:environment.forestSeason,steps:seasonSteps,elapsed:seasonDuration-seasonRemaining(environment,now),duration:seasonDuration};
    record.cycles.day={phase:environment.time,steps:daySteps,elapsed:dayDuration-dayPhaseRemaining(environment,now),duration:dayDuration};
  }
  capture(now);
  // 手动跳转或修改周期只清除对应未完成的一轮，绝不改变历史累计。
  function restart(kind) {
    if(kind==='season')seasonSteps=0;
    if(kind==='day')daySteps=0;
    if(kind==='season'||kind==='day')record.cycles[kind]={phase:kind==='season'?environment.forestSeason:environment.time,
      steps:0,elapsed:0,duration:durationFor(environment,kind==='season'?'season':environment.time)};
  }
  // 平移非游玩时间，让暂停、后台及系统时钟调整不推进图标或历法。
  function advance(milliseconds, now = Date.now(), random = Math.random) {
    const elapsed=Number.isFinite(milliseconds)?Math.max(0,milliseconds):0;
    const shift=now-wallAt-elapsed;
    for(const key of ['seasonAt','dayCycleAt','weatherAt'])environment[key]+=shift;
    wallAt=now;
    let cursor=now-elapsed, remaining=elapsed, changed=false;
    // 在每个边界分段，长帧跨越多季/多天时仍只统计自然经过的阶段和天气。
    while(remaining>0) {
      const seasonLeft=seasonRemaining(environment,cursor);
      const dayLeft=environment.autoTime?dayPhaseRemaining(environment,cursor):Infinity;
      const weatherLeft=environment.autoWeather?Math.max(0,durationFor(environment,'weather')-(cursor-environment.weatherAt)):Infinity;
      const step=Math.min(remaining,seasonLeft,dayLeft,weatherLeft);
      recordPlayTime(record,step,environment);
      cursor+=step;remaining-=step;
      if(step===seasonLeft&&++seasonSteps===4){record.years++;seasonSteps=0;}
      if(step===dayLeft&&++daySteps===3){record.days++;daySteps=0;}
      changed=advanceEnvironment(environment,cursor,random)||changed;
    }
    if(elapsed>0)capture(now);
    return changed;
  }
  return {advance,restart};
}
