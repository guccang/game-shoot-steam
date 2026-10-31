import {enemyMass} from './enemy-mass.js';
import content from './content/monsters.json' with {type:'json'};
import { GAMEPLAY_VALUES } from './gameplay-values.js';
// 重装近战的数值与出生配额；血量和质量表达耐打，不额外引入隐形减伤。
export const ARMORED = Object.freeze(content.armored);
// 第三波或三级野外开始少量混编，远程/飞行名额由调用方保护。
export function armoredSpawn(stage,ordinal,roll,enemies){
  return stage>=GAMEPLAY_VALUES.armored.unlockWave&&ordinal%GAMEPLAY_VALUES.armored.every===GAMEPLAY_VALUES.armored.ordinalRemainder&&roll<GAMEPLAY_VALUES.armored.chance&&enemies.filter(e=>e.hp>0&&e.species===ARMORED.id).length<ARMORED.maxAlive;
}
// 保留地区等级、阶级与存档身份体系，仅替换此物种的实体属性。
export function armoredIdentity(base){
  return {...base,species:ARMORED.id,name:`${ARMORED.name}·${['基础','精英','强敌'][base.rank]}`,flying:false,
    hp:Math.round(base.hp*ARMORED.health),speed:base.speed*ARMORED.speed,mass:enemyMass(ARMORED.id),
    damage:Math.round(base.damage*ARMORED.damage),reward:Math.round(base.reward*ARMORED.reward)};
}
