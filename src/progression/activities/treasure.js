// 寻宝存档只接受固定目录；线索、出土与领取分开，失败或满载不吞掉唯一奖励。
import {TREASURE_SITES,TREASURE_PARTS} from '../../config/treasure.js';
export function freshTreasure(){return {detector:false,clues:[],found:[],recovered:[],parts:{}};}
// 读档保留实物唯一位置，不从车体所有权推测或补发探索部件。
export function normalizeTreasure(raw,p){
 const t=freshTreasure(),ids=TREASURE_SITES.map(s=>s.id),list=value=>[...new Set((Array.isArray(value)?value:[]).filter(id=>ids.includes(id)))];
 t.detector=raw?.detector===true;t.clues=list(raw?.clues);t.found=list(raw?.found).filter(id=>t.clues.includes(id));t.recovered=list(raw?.recovered).filter(id=>t.found.includes(id));
 for(const part of TREASURE_PARTS){const site=TREASURE_SITES.find(s=>s.kind===part.kind&&s.index===part.index),r=raw?.parts?.[part.id],owned=t.recovered.includes(site.id);let location={place:'workshop'};
  if(owned&&['cargo','installed'].includes(r?.place)&&Number.isInteger(r.hull)&&p.vehicleHulls[r.hull])location={place:r.place,hull:r.hull};
  if(owned)t.parts[part.id]=location;
  if(part.kind==='gun'){
   p.vehicleWeapons[part.index]=owned?Math.max(1,p.vehicleWeapons[part.index]):0;
   p.vehicleLoadouts=p.vehicleLoadouts.map((gun,hull)=>gun===part.index&&(!owned||location.place!=='installed'||location.hull!==hull)?null:gun);
   if(owned&&location.place==='installed'&&p.vehicleLoadouts[location.hull]!==part.index)t.parts[part.id]={place:'workshop'};
  }else for(const [hull,b] of p.logistics.builds.entries()){
   b.engines=b.engines.filter(i=>i!==part.index);
   if(b.engine===part.index&&(!owned||location.place!=='installed'||location.hull!==hull))b.engine=0;
   if(owned&&location.place==='installed'&&location.hull===hull){if(b.engine===part.index)b.engines.push(part.index);else t.parts[part.id]={place:'workshop'};}
  }
 }
 return t;
}
// 仅在玩家实际听到对白时调用；重复听见不会新增记录。
export function learnTreasureClue(p,site){p.treasure??=freshTreasure();if(p.treasure.clues.includes(site.id))return false;p.treasure.clues.push(site.id);return true;}
// 统一统计货舱中尚未安装的部件质量。
export function treasureCargoMass(p,hull){return TREASURE_PARTS.reduce((sum,part)=>sum+(p.treasure?.parts[part.id]?.place==='cargo'&&p.treasure.parts[part.id].hull===hull?part.mass:0),0);}
