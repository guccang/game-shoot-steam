import {enemyMass} from './enemy-mass.js';
import content from './content/monsters.json' with {type:'json'};
import { GAMEPLAY_VALUES } from './gameplay-values.js';

// 远程名额仍少于近战；提高可见威胁，同时限制全场弹量和齐射间隔。
export const RANGED_LIMITS = Object.freeze(content.rangedLimits);
// 名称与枪口锚点保留展示绑定，战斗属性只从怪物表读取。
const presentation={
  "spore-spitter": {
    "name": "孢子喷团",
    "muzzle": 24
  },
  "acorn-slinger": {
    "name": "橡果投团",
    "muzzle": 26
  },
  "reed-archer": {
    "name": "苇叶弩团",
    "muzzle": 28
  },
  "bramble-buggy": {
    "name": "装甲车团",
    "muzzle": 34
  },
  "stump-bombard": {
    "name": "重炮团",
    "muzzle": 34
  }
};
export const RANGED_ENEMIES=Object.freeze(Object.fromEntries(Object.entries(content.ranged).map(([id,stats])=>[id,{...presentation[id],...stats}])));

// 第二波开始每三个名额抽取一次；不依赖近战还活着，避免玩家先杀近战就永远刷不到远程。
export function rangedSpawn(wave, ordinal, roll, enemies, excluded = false) {
  if (excluded || wave < GAMEPLAY_VALUES.ranged.unlockWave || ordinal % GAMEPLAY_VALUES.ranged.every !== GAMEPLAY_VALUES.ranged.ordinalRemainder || roll >= (wave < GAMEPLAY_VALUES.ranged.denseFromWave ? GAMEPLAY_VALUES.ranged.earlyChance : GAMEPLAY_VALUES.ranged.lateChance)) return false;
  return enemies.filter(e => e.hp > 0 && RANGED_ENEMIES[e.species]).length < RANGED_LIMITS.alive;
}
// 基础远程先出现，装甲与重火力随危险等级解锁，不改变原波次总数。
export function rangedSpecies(stage, roll) {
  const keys = Object.keys(RANGED_ENEMIES).filter(key => stage >= (RANGED_ENEMIES[key].unlock || GAMEPLAY_VALUES.ranged.unlockWave));
  return keys[Math.min(keys.length - 1, Math.max(0, Math.floor(roll * keys.length)))];
}
// 各型保留地区阶级和奖励；装甲车更结实，重炮手移速较慢。
export function rangedIdentity(identity, species) {
  const profile = RANGED_ENEMIES[species];
  return { ...identity, species, flying: false, name: `${profile.name}·${['基础','精英','强敌'][identity.rank]}`,
    hp: Math.round(identity.hp * (profile.health || GAMEPLAY_VALUES.ranged.healthRatio)), damage: Math.max(1, Math.round(identity.damage * profile.damage)),
    speed: identity.speed * (profile.movement || GAMEPLAY_VALUES.ranged.speedRatio), mass: species==='bramble-buggy'?enemyMass(species):identity.mass*(profile.mass||1) };
}
// 炮口位于身体前方，战斗弹丸与正式绘制共享同一锚点。
export function rangedMuzzle(enemy, dirX = enemy.assault?.dirX ?? 1, dirY = enemy.assault?.dirY || 0) {
  const reach = RANGED_ENEMIES[enemy.species]?.muzzle || 24;
  return { x: enemy.x + dirX * reach, y: enemy.y - 15 + dirY * reach };
}
