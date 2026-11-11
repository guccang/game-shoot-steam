import {INDUSTRY_GOODS} from '../../config/industry.js';
import {industryStore,industryHomeCapacity} from '../industry/industry.js';
import {TOWN_RESTORATIONS,facilityOpen} from '../../config/town-restoration.js';
import {FARM_CROPS} from '../../config/farm.js';
import {equipmentParts,partLevel} from '../../config/equipment-parts.js';
import {WEAPONS} from '../../config/weapons.js';
import {VEHICLE_WEAPONS,nativeVehicleWeapon} from '../../config/vehicle-armaments.js';
import {storeDebugWeaponOverflow} from '../inventory/debug-storage.js';
import {parkNewVehicle} from '../vehicles/camp-parking.js';
import {parkingSpotsFor} from '../../config/parking.js';
import {parkingRecordOccupies} from '../vehicles/roadside-parking.js';
import {TREASURE_SITES} from '../../config/treasure.js';
import { RESOURCE_CAP } from '../../config/resource-limits.js';
import { i18nText } from "../../i18n/index.js";
// 调试奖励生成独立候选存档，不直接改战斗对象；由应用确认写入后提交。
import { validateProgress } from '../progress.js';
import { COLLECTED_VEHICLES } from '../../config/vehicles.js';
import { MATERIAL_KEYS, MATERIAL_CAP } from '../../config/materials.js';
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
export function debugGrantProgress(progress,kind,game=null) {
  const next=validateProgress(progress);
  // 只开放商店购买，不赠送种子、不改变清缴轮数或战斗掉落阶段。
  if(kind==='seed-purchases'){next.farm.unlocked=FARM_CROPS.map(()=>true);return next;}
  if(kind==='vehicles'||kind==='max-vehicles')grantDebugVehicles(next,progress,game);
  if(maxGroups[kind]){
    for(const [type,levels,parts,items] of maxGroups[kind])items.forEach((_,i)=>{
      for(const part of equipmentParts(type,i)){if(['damage','armor'].includes(part.key))next[levels][i]=part.max;else next[parts][i][part.key]=part.max;}
    });
    if(kind==='max-vehicles')for(const site of TREASURE_SITES.filter(s=>s.kind==='gun')){
      for(const key of ['clues','found','recovered'])if(!next.treasure[key].includes(site.id))next.treasure[key].push(site.id);
      next.treasure.parts['gun:'+site.index]??={place:'workshop'};
    }
    const result=validateProgress(next);
    return kind==='max-weapons'?storeDebugWeaponOverflow(progress,result,game):result;
  }
  if(kind==='buildings'){
    next.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);next.restoration.build=null;
    // 武器工坊属于入职流程，调试解锁直接结束该引导，不扣材料或补领任何奖励。
    if(next.arrival){next.arrival.phase='complete';next.arrival.elapsed=0;delete next.arrival.workWood;}
    return validateProgress(next);
  }
  if(kind==='vehicles')return validateProgress(next);
  else if(kind==='resources') {
    for(const key of ['coins','wood'])next[key]=Math.min(RESOURCE_CAP,next[key]+9999);
    for(const key of MATERIAL_KEYS)next.materials[key]=Math.min(MATERIAL_CAP,next.materials[key]+9999);
    // 原矿、精炼块和加工制品按正式目录入库；木材已发放，避免重复或塞满背包。
    for(const key of Object.keys(INDUSTRY_GOODS)){
      if(key==='wood')continue;
      const [stock,id]=industryStore(next,key,'home');
      stock[id]=Math.min(industryHomeCapacity(key),(stock[id]||0)+9999);
    }
  } else throw new Error(i18nText("progression.debug-grants.b09ba06570"));
  return next;
}

// Debug 显式授予车体与原生主炮；保留已有换装，不依赖读档校验补发。
function grantDebugVehicles(next,previous,game){
 // 优先给当前车预留常规泊位，驾驶中批量领取后仍能停下旧车并换乘。
 const order=[previous.vehicleIndex,...COLLECTED_VEHICLES.map((_,i)=>i).filter(i=>i!==previous.vehicleIndex)];
 for(const i of order){
  next.vehicleHulls[i]=Math.max(1,next.vehicleHulls[i]);
  const gun=nativeVehicleWeapon(i);
  if(gun&&!next.vehicleWeapons[gun.weaponIndex]){
   next.vehicleWeapons[gun.weaponIndex]=1;
   if(next.vehicleLoadouts[i]===null&&!next.vehicleLoadouts.includes(gun.weaponIndex))next.vehicleLoadouts[i]=gun.weaponIndex;
  }
  if(next.vehicleService[i]?.phase||i===4&&next.fireDispatch.garage?.parked)continue;
  if(!parkNewVehicle(next,i)){
   // 批量领取超过北场容量时使用其余真实泊位，禁止多辆车叠在同一位置。
   const spot=parkingSpotsFor(next).find(s=>!Object.values(next.campParking.preferred||{}).includes(s.id)&&!next.campParking.owned.some(r=>parkingRecordOccupies(r,s)));
   if(spot)next.campParking.owned.push({hull:i,spot:spot.id,hp:1,ammo:0,reload:0,wheel:0,track:0});
  }
 }
 // 当前驾驶车辆保留随行状态，刚分配的空位留给之后换乘时停放旧车。
 if(game?.vehicle.active)next.campParking.owned=next.campParking.owned.filter(r=>r.hull!==game.vehicle.index);
 // 寻宝车体已由调试领取，关闭对应唯一奖励，避免再次挖掘复制车辆。
 for(const site of TREASURE_SITES.filter(s=>s.kind==='vehicle'))for(const key of ['clues','found','recovered'])if(!next.treasure[key].includes(site.id))next.treasure[key].push(site.id);
}
// 一级领取完成包含配套主炮，历史缺炮状态仍可点击修复。
export function debugVehiclesUnlocked(progress){return COLLECTED_VEHICLES.every((_,i)=>progress.vehicleHulls[i]>0&&(!nativeVehicleWeapon(i)||progress.vehicleWeapons[nativeVehicleWeapon(i).weaponIndex]>0)&&(i===progress.vehicleIndex||progress.campParking.owned.some(r=>r.hull===i)||progress.vehicleService[i]?.phase||i===4&&progress.fireDispatch.garage?.parked));}
