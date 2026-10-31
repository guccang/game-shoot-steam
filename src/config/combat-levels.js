// 怪物使用固定等级对应的标准装备成长，永远不读取当前玩家的装备或存档。
import {GAMEPLAY_VALUES} from './gameplay-values.js';
import {equipmentAttackGrowth} from './economy.js';

// 攻击复合成长之外增加等级耐久，保证高级普通怪仍能承受数次同级命中。
export function enemyLevelHealthScale(level=1){
 const l=Math.max(1,Math.floor(Number.isFinite(level)?level:1));
 return equipmentAttackGrowth(l,l)*(1+(l-1)*GAMEPLAY_VALUES.enemy.healthPerLevel);
}

// 普通怪基准在最后统一取整，阶级、飞行和重装倍率继续由正式物种工厂应用。
export function enemyLevelHealth(level=1,rankMultiplier=1){
 return Math.max(1,Math.round(GAMEPLAY_VALUES.enemy.baseHealth*enemyLevelHealthScale(level)*rankMultiplier));
}
