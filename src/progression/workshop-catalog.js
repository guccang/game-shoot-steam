// 武器货架按实际拥有状态分区，赠送和奖励武器同样计为已拥有；载具遵循相同分区。
import {WEAPONS,WEAPON_DISPLAY_ORDER} from '../config/weapons.js';
import {VEHICLE_DISPLAY_ORDER} from '../config/vehicles.js';

// 只过滤展示顺序，不修改装备等级、出战选择或购买资格。
export function workshopCatalog(progress,kind,page){
 const order=kind==='vehicle'?VEHICLE_DISPLAY_ORDER:WEAPON_DISPLAY_ORDER,levels=kind==='vehicle'?progress.vehicleHulls:progress.weapons;
 return order.filter(i=>(levels[i]>0)===(page!=='buy')&&!(kind==='weapons'&&page==='modify'&&WEAPONS[i].attackKind==='defense'));
}
