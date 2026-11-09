// 图鉴只读统计视图：历史次数与当前持有分开，不修改存档或发放奖励。
import {WORLD_CODEX} from '../../config/world-codex.js';
// 全部计数只展示已记录值；持有状态不反推历史次数。
export function codexRecord(progress,e){
 if(e.category==='fish')return {count:progress.outdoors.collection[e.id]?.count||0,best:progress.outdoors.collection[e.id]?.best||0,owned:progress.outdoors.fish[e.id]||0};
 if(e.category==='monster')return {kills:progress.statistics.codex?.monsters[e.key]||0};
 if(e.category==='crop'){const r=progress.statistics.codex?.crops[e.id];return {planted:r?.planted||0,harvested:r?.harvested||0,seeds:progress.farm.seeds[e.index]||0,owned:!!progress.farm.unlocked[e.index]};}
 const vehicle=e.category==='vehicle',r=progress.statistics.equipment?.[vehicle?'vehicles':'weapons']?.[e.id];
 return {kills:r?.kills||0,trees:r?.trees||0,owned:!!(vehicle?progress.vehicleHulls[e.index]:e.portrait==='armament'?progress.vehicleWeapons[e.index]:progress.weapons[e.index])};
}
// 汇总值沿用原始历史，鱼条数以入护记录为准，放流不算收集。
export function codexTotals(p){return {kills:p.statistics.kills,trees:p.statistics.trees,fish:Math.max(p.outdoors.caught,Object.values(p.outdoors.collection).reduce((n,r)=>n+r.count,0)),fishKinds:Object.values(p.outdoors.collection).filter(r=>r.count>0).length,planted:p.farm.planted,harvested:p.farm.harvested,watered:p.farm.watered,dug:p.farm.dug,weapons:WORLD_CODEX.filter(e=>e.category==='weapon'&&codexRecord(p,e).owned).length,vehicles:p.vehicleHulls.filter(n=>n>0).length};}
