import {TOWN_RESTORATIONS,facilityOpen} from '../config/town-restoration.js';
import {FARM_CROPS} from '../config/farm.js';
import {equipmentParts,partLevel} from '../config/equipment-parts.js';
import {WEAPONS} from '../config/weapons.js';
import {VEHICLE_WEAPONS} from '../config/vehicle-armaments.js';
import { RESOURCE_CAP } from '../config/resource-limits.js';
import { i18nText } from "../i18n/index.js";
// 调试奖励生成独立候选存档，不直接改战斗对象；由应用确认写入后提交。
import { validateProgress } from './progress.js';
import { COLLECTED_VEHICLES } from '../config/vehicles.js';
import { MATERIAL_KEYS, MATERIAL_CAP } from '../config/materials.js';
// 满级范围按目录分组，车载炮塔与手持武器继续独立。
const maxGroups={
  'max-weapons':[['weapons','weapons','weaponParts',WEAPONS]],
  'max-vehicles':[['vehicle','vehicleHulls','vehicleParts',COLLECTED_VEHICLES],['turret','vehicleWeapons','turretParts',VEHICLE_WEAPONS]],
};
// 满级判断读取各部件的正式上限，兼容机械协同等不同等级范围。
export function debugEquipmentMaxed(progress,kind){
  return !!maxGroups[kind]&&maxGroups[kind].every(([type,levels,,items])=>items.every((_,i)=>progress[levels][i]>0&&equipmentParts(type,i).every(part=>partLevel(progress,type,i,part.key)===part.max)));
}
// 所有建筑包括入职修复的武器工坊，已解锁时不重复执行。
export function debugBuildingsUnlocked(progress){return facilityOpen(progress,'weapons')&&TOWN_RESTORATIONS.every(f=>facilityOpen(progress,f.id));}
// 按正式种子目录检查购买资格，新增加的品种也必须显式解锁。
export function debugSeedsUnlocked(progress){return FARM_CROPS.every((_,i)=>progress.farm?.unlocked?.[i]===true);}
// 资源与一级解锁保持原行为；满级同时补齐所有权及可升级部件，返回合法独立快照。
export function debugGrantProgress(progress,kind) {
  const next=validateProgress(progress);
  // 只开放商店购买，不赠送种子、不改变清缴轮数或战斗掉落阶段。
  if(kind==='seed-purchases'){next.farm.unlocked=FARM_CROPS.map(()=>true);return next;}
  if(maxGroups[kind]){
    for(const [type,levels,parts,items] of maxGroups[kind])items.forEach((_,i)=>{
      for(const part of equipmentParts(type,i)){if(['damage','armor'].includes(part.key))next[levels][i]=part.max;else next[parts][i][part.key]=part.max;}
    });
    return validateProgress(next);
  }
  if(kind==='buildings'){
    next.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);next.restoration.build=null;
    // 武器工坊属于入职流程，调试解锁直接结束该引导，不扣材料或补领任何奖励。
    if(next.arrival){next.arrival.phase='complete';next.arrival.elapsed=0;delete next.arrival.workWood;}
    return validateProgress(next);
  }
  if(kind==='vehicles'){
    next.vehicleHulls=COLLECTED_VEHICLES.map((_,i)=>Math.max(1,next.vehicleHulls[i]));
    // 车体所有权更新后立即补齐配套主炮与合法挂载，与重新读档的结果保持一致。
    return validateProgress(next);
  }
  else if(kind==='resources') {
    for(const key of ['coins','wood'])next[key]=Math.min(RESOURCE_CAP,next[key]+9999);
    for(const key of MATERIAL_KEYS)next.materials[key]=Math.min(MATERIAL_CAP,next.materials[key]+9999);
  } else throw new Error(i18nText("progression.debug-grants.b09ba06570"));
  return next;
}
