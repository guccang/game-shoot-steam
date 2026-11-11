// 主炮射击和巡战走位使用同一套装备、秘境加成与昼夜修正。
import {vehicleWeapon} from '../config/vehicles.js';
import {realmWeapon} from '../config/realms.js';
import {surfaceWeapon} from '../world/surface-vision.js';

// 读取当前车辆实际装备的主炮，无主炮时沿用装备系统的空值。
export function mountedWeapon(game){
 const weapon=vehicleWeapon(game.loadout||game.progress,game.vehicle.weaponIndex);
 return surfaceWeapon(game,realmWeapon(weapon,game.realm?.buffs));
}
