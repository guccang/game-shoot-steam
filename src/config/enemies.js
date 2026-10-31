import content from './content/monsters.json' with {type:'json'};
import { GAMEPLAY_VALUES } from './gameplay-values.js';
import { i18nText } from "../i18n/index.js";
// 低空近战族群：使用原波次名额和区域成长，不额外增加刷怪总量。
export const FLYING_ATTACK = content.flyingAttack;

// 前两波步战只出现地面怪；飞行载具每四个名额混入一只，第三波起逐步混编。
export function flyingSpawn(wave, ordinal, playerFlying = false) {
  const every = playerFlying || wave >= GAMEPLAY_VALUES.flying.denseFromWave ? GAMEPLAY_VALUES.flying.denseEvery : wave >= GAMEPLAY_VALUES.flying.unlockWave ? GAMEPLAY_VALUES.flying.earlyEvery : 0;
  return every > 0 && ordinal % every === 0;
}

// 叶翼蝠较脆、移动较快，保留区域和阶级差异，飞行标记同时供导航与物理读取。
export function flyingIdentity(identity) {
  return {
    ...identity,
    flying: true,
    species: 'leaf-bat',
    name: i18nText("config.enemies.73d6d2c355", { p0: ([i18nText("config.enemies.89e5e14c8d"), i18nText("config.enemies.a5399ff0bb"), i18nText("config.enemies.3de8aaae16")][identity.rank]) }),
    hp: Math.round(identity.hp * GAMEPLAY_VALUES.flying.healthRatio),
    damage: Math.max(1, Math.round(identity.damage * GAMEPLAY_VALUES.flying.damageRatio)),
    speed: identity.speed * GAMEPLAY_VALUES.flying.speedRatio,
    mass: identity.mass * GAMEPLAY_VALUES.flying.massRatio,
  };
}
