import {normalizeClearingSite,validWorldPosition} from './clearing-site.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
// 常驻世界状态白名单；邻里请求只读取当前委托账本。
import {LIVING_REQUESTS,RESIDENTS} from '../config/living-world.js';
import {normalizeLivingCalendar} from '../world/living-calendar.js';
// 仅恢复合法任务阶段和坐标，防止损坏存档把人物放入未知世界。
export function normalizeLivingWorld(raw){
  const calendar=normalizeLivingCalendar(raw?.calendar),requests={};
  for(const spec of LIVING_REQUESTS){
    const old=raw?.requests?.[spec.id];
    const stage=Number.isInteger(old?.stage)?Math.max(-1,Math.min(spec.steps.length,old.stage)):-1;
    requests[spec.id]={stage,completed:old?.completed===true||stage===spec.steps.length,battleKills:Number.isInteger(old?.battleKills)?Math.max(0,Math.min(GAMEPLAY_VALUES.living.battleKills,old.battleKills)):0,
      completedDay:Number.isSafeInteger(old?.completedDay)?Math.max(0,old.completedDay):null};
    if(requests[spec.id].completed)requests[spec.id].stage=spec.steps.length;
  }
  const residents={};
  for(const spec of RESIDENTS){const p=raw?.residents?.[spec.id];if(validWorldPosition(p))residents[spec.id]={x:p.x,y:p.y};}
  const position=raw?.position;
  return {version:1,calendar,requests,residents,position:validWorldPosition(position)?{x:position.x,y:position.y}:null,patrolActive:raw?.patrolActive===true,clearingSite:normalizeClearingSite(raw?.clearingSite),
    journal:Array.isArray(raw?.journal)?raw.journal.filter(t=>typeof t==='string').slice(-GAMEPLAY_VALUES.living.journalLimit).map(t=>t.slice(0,300)):[]};
}
