import {carriedWeapon} from '../progression/inventory/weapon-storage.js';
// 蜘蛛单枪架仅接收已拥有的远程枪；空槽表示自带脉冲炮，旧档始终可用。
import { WEAPONS, WEAPON_DISPLAY_ORDER } from './weapons.js';
import { effectiveWeapon, weaponDamage } from './weapon-mods.js';
import { SPIDER_GUN_MULTIPLIER } from './spider.js';

// 不允许控制器嵌套或近战枪，避免递归召唤与无效枪口。
export function canMountSpider(progress,index) {
  return index===null||Number.isInteger(index)&&!!WEAPONS[index]&&!WEAPONS[index].controller&&!['melee','defense'].includes(WEAPONS[index].attackKind)&&carriedWeapon(progress,index);
}
// 非法值和缺失字段回到原生炮，不购买装备或复制其他配置。
export function validateSpiderLoadout(progress,value){return canMountSpider(progress,value)?value:null;}
// 配置卡按正式装备解锁顺序排列。
export function spiderChoices(progress){return [null,...WEAPON_DISPLAY_ORDER.filter(i=>canMountSpider(progress,i))];}
// 原生炮随母巢成长；外接枪只继承对应手持枪成长，不叠加两套伤害等级。
export function spiderGunWeapon(progress,core){
  const index=validateSpiderLoadout(progress,progress.spiderLoadout);
  return index===null?{...core,id:'pulse',controller:undefined,weaponIndex:9,modChoice:core.modChoice===1?2:0}:effectiveWeapon(progress,index);
}
// 最终伤害只乘一次1.5，核心伤害已由调用者处理手持/车载/秘境来源。
export function spiderGunDamage(progress,coreDamage,power=0){
  const index=validateSpiderLoadout(progress,progress.spiderLoadout);
  return Math.round((index===null?coreDamage:weaponDamage(progress,index,power))*SPIDER_GUN_MULTIPLIER);
}
