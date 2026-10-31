// 电动车只增强乘员供给，倍率在部件和秘境加成之后应用，不写回永久武器目录。
import {vehicleCapacity} from './vehicle-capacity.js';
export const SCOOTER_AMMO_MULTIPLIER=1.3;
// 单发武器至少保留一发；与既有载具供弹一致向下取整。
export function scooterCapacity(weapon,game){
 if(weapon.attackKind==='defense')return weapon;
 return game.vehicle?.active&&game.vehicle.index===5&&!game.vehicleAmmoBonus?vehicleCapacity(weapon,SCOOTER_AMMO_MULTIPLIER):weapon;
}
