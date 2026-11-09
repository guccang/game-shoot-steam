import {carriedWeapon} from '../progression/inventory/weapon-storage.js';
// 前三只共用一个远程枪型，其余重装近战；空槽全队重装，禁止递归召唤及电锯。
import { WEAPONS, WEAPON_DISPLAY_ORDER } from './weapons.js';
export const MECHANICAL_HP = 60;
export const MECHANICAL_ARMORED_HP = 300;
export const MECHANICAL_GUN_LIMIT = 3;
// 驾驶时给车壳留出额外空隙；步行和蜘蛛自身护卫圈保持原样。
export const MECHANICAL_VEHICLE_SPACING = { padding: 44, spawnRadius: 88, clearance: 68 };
// 重装是原生近战配置；返回远程时移除重甲，不改写已保存枪械槽。
export function applyMechanicalArmor(weapon, progress) {
  if(weapon.controller!=='mechanical')return weapon;
  weapon.armored=!Number.isInteger(progress.mechanicalLoadout);
  weapon.rangedCount=weapon.armored?0:Math.min(MECHANICAL_GUN_LIMIT,weapon.summonCount);
  weapon.companionHp=weapon.armored?MECHANICAL_ARMORED_HP:MECHANICAL_HP;
  if(weapon.armored){weapon.moveSpeed*=.6;weapon.interval*=1.4;}
  return weapon;
}
// 固定前三个槽挂枪，其余保留重装近战；快照同时供正式战斗和绘制读取。
export function mechanicalNodeWeapon(weapon,index) {
  if(weapon.fixedMelee||weapon.armored||index<(weapon.rangedCount||0))return weapon;
  return {...weapon,armored:true,companionHp:MECHANICAL_ARMORED_HP,moveSpeed:weapon.moveSpeed*.6,interval:weapon.interval*1.4};
}
// 全队共享逐只部署节奏，不因低帧率、初次装备或集中死亡而齐刷。
export const MECHANICAL_SPAWN_INTERVAL = 1;
export const MECHANICAL_RECALL_COST = 6;
export const MECHANICAL_RECALL_DELAY = 2;
// 手持枪所有权决定可挂模块；车载核心同样引用这份整队配置。
export function canMountMechanical(progress, index) {
  return index === null || Number.isInteger(index) && !!WEAPONS[index] &&
    !WEAPONS[index].controller && !['melee','defense'].includes(WEAPONS[index].attackKind) && carriedWeapon(progress,index);
}
// 缺失或非法旧档退回近战，不购买装备、不恢复供给。
export function validateMechanicalLoadout(progress, raw) { return canMountMechanical(progress, raw) ? raw : null; }
// 固定编号按解锁顺序排列，配置只引用已购买枪械。
export function mechanicalChoices(progress) { return [null, ...WEAPON_DISPLAY_ORDER.filter(i => canMountMechanical(progress, i))]; }
