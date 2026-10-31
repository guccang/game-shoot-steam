// 道具、弹药、主炮质量与故障概率集中配置；重量统一使用千克。
import {TOWN_LAYOUT} from './town-layout.js';
export const AMMO_SHOP={...TOWN_LAYOUT.ammo,id:'ammo-shop',name:'弹药补给铺',mapId:'forest'};
export const AMMO_TYPES={
 light:{name:'通用子弹',mass:.02,pack:30,coins:30,wood:2,parts:0},
 shell:{name:'标准炮弹',mass:12,pack:5,coins:100,wood:3,parts:1},
 heavy:{name:'重型炮弹',mass:35,pack:3,coins:180,wood:5,parts:2},
 water:{name:'潮汐弹罐',mass:1,pack:20,coins:20,wood:1,parts:0},
};
export const SUPPLY_ITEMS={medkit:{name:'急救包',mass:1,coins:60,heal:60},gunKit:{name:'主炮维修包',mass:3,coins:90,repair:35},engineKit:{name:'发动机维修包',mass:4,coins:100,repair:35}};
export const GUN_MASSES={17:60,18:360,19:100,20:90,21:850,22:50};
export const FAULT_RULES={explosion:{chance:.35,gun:24,engine:18},electric:{chance:.5,gun:16,engine:30},fire:{chance:.25,gun:12,engine:22},piercing:{chance:.3,gun:25,engine:15}};
// 召唤能量、近战和护盾不属于可购买的实物子弹。
export function ammoKind(weapon){if(!weapon||weapon.controller||weapon.attackKind==='defense'||weapon.id==='chainsaw'||weapon.attackKind==='melee')return null;return weapon.id==='wolf-256'?'heavy':weapon.id==='tank-125'?'shell':weapon.id==='hover-tide'?'water':'light';}
// 货舱、背包与重量页共用库存重量。
export function ammunitionMass(stock){return Object.entries(AMMO_TYPES).reduce((sum,[key,rule])=>sum+(stock?.[key]||0)*rule.mass,0);}
// 部件故障按实体主炮和底盘保存，换车或换炮不抹除损坏。
export function vehicleFaults(progress,index){return {gun:progress.supplies?.gunFaults[progress.vehicleLoadouts[index]]||0,engine:progress.supplies?.engineFaults[index]||0};}
