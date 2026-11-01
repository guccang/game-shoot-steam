import {TREASURE_GUNS} from './treasure.js';
// 道具、弹药、主炮质量与故障概率集中配置；重量统一使用千克。
import {TOWN_LAYOUT} from './town-layout.js';
export const AMMO_SHOP={...TOWN_LAYOUT.ammo,id:'ammo-shop',name:'弹药补给铺',mapId:'forest'};
// 按五波清剿和领主的整轮消耗标定补给：保留有限库存，为失准、援军和其他货物留余量。
// 每包数量增加十倍、包价及制作材料不变；重量采用游戏负重尺度，不使用现实炮弹质量。
// 交易分类由同一配置约束；通用子弹可分别补给，炮弹与弹罐只在载具页出售。
export const AMMO_TYPES={
 light:{name:'通用子弹',mass:.002,pack:300,coins:30,wood:2,parts:0,targets:['hand','vehicle']},
 shell:{name:'标准炮弹',mass:.5,pack:50,coins:100,wood:3,parts:1,targets:['vehicle']},
 heavy:{name:'重型炮弹',mass:1,pack:30,coins:180,wood:5,parts:2,targets:['vehicle']},
 water:{name:'潮汐弹罐',mass:.1,pack:200,coins:20,wood:1,parts:0,targets:['vehicle']},
};
export const SUPPLY_ITEMS={medkit:{name:'急救包',mass:1,coins:60,heal:60},gunKit:{name:'主炮维修包',mass:3,coins:90,repair:35},engineKit:{name:'发动机维修包',mass:4,coins:100,repair:35}};
export const GUN_MASSES={17:60,18:360,19:100,20:90,21:850,22:50,...Object.fromEntries(TREASURE_GUNS.map(w=>[w.weaponIndex,w.mass]))};
export const FAULT_RULES={explosion:{chance:.35,gun:24,engine:18},electric:{chance:.5,gun:16,engine:30},fire:{chance:.25,gun:12,engine:22},piercing:{chance:.3,gun:25,engine:15}};
// 召唤能量、近战和护盾不属于可购买的实物子弹。
export function ammoKind(weapon){if(!weapon||weapon.controller||weapon.attackKind==='defense'||weapon.id==='chainsaw'||weapon.attackKind==='melee')return null;if(weapon.ammo)return weapon.ammo;return weapon.id==='wolf-256'?'heavy':weapon.id==='tank-125'?'shell':weapon.id==='hover-tide'?'water':'light';}
// 货舱、背包与重量页共用库存重量。
export function ammunitionMass(stock){return Object.entries(AMMO_TYPES).reduce((sum,[key,rule])=>sum+(stock?.[key]||0)*rule.mass,0);}
// 部件故障按实体主炮和底盘保存，换车或换炮不抹除损坏。
export function vehicleFaults(progress,index){return {gun:progress.supplies?.gunFaults[progress.vehicleLoadouts[index]]||0,engine:progress.supplies?.engineFaults[index]||0};}
