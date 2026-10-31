import {applyHeroWeaponTalent,heroTalentMultiplier} from './hero-talents.js';
import growth from './content/growth.json' with {type:'json'};
import { GAMEPLAY_VALUES } from './gameplay-values.js';
import { GAMEPLAY_TABLES } from './gameplay-tables.js';
import { i18nText } from "../i18n/index.js";
import { equipmentAttackGrowth } from './economy.js';
import { applyMechanicalArmor } from './mechanical-loadout.js';
import { applyWeaponParts } from './equipment-parts.js';
import { HEROES } from './heroes.js';
// 武器改装目录：每把枪二选一，以明确代价换取不同打法，原始配置永不修改。
import { WEAPONS } from './weapons.js';
import { applyGuardianSupply } from './guardian-upgrades.js';
export const MASTERY_THRESHOLDS = growth.masteryThresholds;
// 熟练度奖励和套件门槛由战斗与工坊共同读取，展示不得自行推算另一套规则。
export const MASTERY_REWARDS = GAMEPLAY_TABLES.masteryRewards;
export const MOD_MASTERY_LEVEL = GAMEPLAY_VALUES.progress.modUnlockLevel;
export const MOD_COST = growth.modCost;
export const WEAPON_MODS = [
  [
    {
      name: i18nText("config.weapon-mods.54e6a7fdec"),
      description: i18nText("config.weapon-mods.c209ca35cb"),
      multiply: { interval: 0.75, damage: 0.85 },
    },
    {
      name: i18nText("config.weapon-mods.51f2f8c825"),
      description: i18nText("config.weapon-mods.449166ca18"),
      multiply: { damage: 1.45, interval: 1.35 },
    },
  ],
  [
    {
      name: i18nText("config.weapon-mods.cedc15b832"),
      description: i18nText("config.weapon-mods.db5a5fcced"),
      multiply: { interval: 0.7, damage: 0.8 },
    },
    {
      name: i18nText("config.weapon-mods.a848039c2a"),
      description: i18nText("config.weapon-mods.ef06405ae1"),
      multiply: { damage: 1.4, interval: 1.3 },
    },
  ],
  [
    {
      name: i18nText("config.weapon-mods.f593b2e140"),
      description: i18nText("config.weapon-mods.c209ca35cb"),
      multiply: { interval: 0.75, damage: 0.85 },
    },
    {
      name: i18nText("config.weapon-mods.02aa639d65"),
      description: i18nText("config.weapon-mods.8d2cc51f26"),
      multiply: { spread: 0.4, damage: 1.25, interval: 1.25 },
    },
  ],
  [
    {
      name: i18nText("config.weapon-mods.d932205d14"),
      description: i18nText("config.weapon-mods.f0ec5bcaa4"),
      multiply: { spread: 0.35, range: 1.25 },
      set: { pellets: 4 },
    },
    {
      name: i18nText("config.weapon-mods.70602e971d"),
      description: i18nText("config.weapon-mods.d654623b98"),
      multiply: { spread: 1.45, damage: 0.8 },
      set: { pellets: 9 },
    },
  ],
  [
    {
      name: i18nText("config.weapon-mods.847e5c9578"),
      description: i18nText("config.weapon-mods.4535429a4e"),
      multiply: { damage: 0.8 },
      set: { bounces: 4 },
    },
    {
      name: i18nText("config.weapon-mods.1e2dcfdcca"),
      description: i18nText("config.weapon-mods.bf643e8858"),
      multiply: { damage: 1.6 },
      set: { bounces: 1 },
    },
  ],
  [
    {
      name: i18nText("config.weapon-mods.41d1060c5f"),
      description: i18nText("config.weapon-mods.c2c3a54c1e"),
      multiply: { impulse: 2, damage: 1.2, interval: 1.25 },
    },
    {
      name: i18nText("config.weapon-mods.edeb179d9a"),
      description: i18nText("config.weapon-mods.ffe4cc8f41"),
      multiply: { damage: 0.5 },
      set: { pellets: 3, spread: 0.38 },
    },
  ],
  [
    {
      name: i18nText("config.weapon-mods.69bf5691bd"),
      description: i18nText("config.weapon-mods.e6bb565572"),
      grenade: { radius: 1.45, impulse: 1.5, damage: 0.75 },
    },
    {
      name: i18nText("config.weapon-mods.7c0af3b01d"),
      description: i18nText("config.weapon-mods.508b8feacd"),
      grenade: { charge: 2 / 3, damage: 0.75 },
    },
  ],
  [
    {
      name: i18nText("config.weapon-mods.fd7db53c44"),
      description: i18nText("config.weapon-mods.f0719cde2b"),
      multiply: { range: 1.4, damage: 0.8 },
    },
    {
      name: i18nText("config.weapon-mods.7a47dd8acd"),
      description: i18nText("config.weapon-mods.69931f2915"),
      multiply: { damage: 1.6, range: 0.75 },
    },
  ],
  [
    {
      name: i18nText("config.weapon-mods.8ec96bae25"),
      description: i18nText("config.weapon-mods.945759289f"),
      multiply: { interval: 0.7, damage: 0.8 },
      set: { pierce: 4 },
    },
    {
      name: i18nText("config.weapon-mods.6fb479e1bf"),
      description: i18nText("config.weapon-mods.281ca90d80"),
      multiply: { damage: 1.35, interval: 1.35 },
      set: { pierce: 9 },
    },
  ],
  [
    {
      name: i18nText("config.weapon-mods.ac8cb8f33e"),
      description: i18nText("config.weapon-mods.d092d7a9d5"),
      multiply: { damage: 0.75, selfImpulse: 0.7 },
      set: { chargeTime: 0.75 },
    },
    {
      name: i18nText("config.weapon-mods.c2fecf0d59"),
      description: i18nText("config.weapon-mods.4667314c5a"),
      multiply: { damage: 1.45, selfImpulse: 1.15 },
      set: { chargeTime: 1.7, pierce: 16 },
    },
  ],
  [
    {
      name: i18nText("config.weapon-mods.ae0b5ac2e2"),
      description: i18nText("config.weapon-mods.b22b84e134"),
      multiply: { damage: 0.75 },
      set: { chain: 5 },
    },
    {
      name: i18nText("config.weapon-mods.8ad5ed9882"),
      description: i18nText("config.weapon-mods.d35c36fda1"),
      multiply: { damage: 1.7 },
      set: { chain: 2 },
    },
  ],
  [
    {
      name: i18nText("config.weapon-mods.d63eaf05c6"),
      description: i18nText("config.weapon-mods.4fda15cdb6"),
      multiply: { damage: 0.8 },
      set: { chillFactor: 0.4, chillDuration: 2.5 },
    },
    {
      name: i18nText("config.weapon-mods.8d012e6024"),
      description: i18nText("config.weapon-mods.e18e97123d"),
      multiply: { damage: 0.55 },
      set: { pellets: 3, spread: 0.32 },
    },
  ],
];

// 浮游炮协议与旧武器同样二选一，不改变三炮数量与各自能源容量。
WEAPON_MODS.push([
  {
    name: i18nText("config.weapon-mods.8d188fcc14"),
    description: i18nText("config.weapon-mods.2b4b9a88ce"),
    multiply: { damage: 0.85 },
    set: { range: 480 },
  },
  {
    name: i18nText("config.weapon-mods.568084fee7"),
    description: i18nText("config.weapon-mods.637776d8ad"),
    multiply: { damage: 1.25, interval: 1.25 },
    set: { focusFire: true },
  },
]);

// 无人机沿用分散与集火协议，成长槽位与浮游炮互相独立。
WEAPON_MODS.push(WEAPON_MODS[12].map((mod) => ({ ...mod })));

// 电锯改装在采集效率与近身战斗之间取舍，不增加电池容量。
WEAPON_MODS.push([
  { name: i18nText("config.weapon-mods.15405708ca"), description: i18nText("config.weapon-mods.dd10e8e373"),
    multiply: { treeMultiplier: 1.5, damage: 0.8 } },
  { name: i18nText("config.weapon-mods.383a0334b3"), description: i18nText("config.weapon-mods.32fd728734"),
    multiply: { damage: 1.5, interval: 1.25 } },
]);

// 机械猫的爪部套件改变挥爪节奏与结构；不替代独立数量成长。
WEAPON_MODS.push([
  { name: i18nText("config.weapon-mods.d3878a6dac"), description: i18nText("config.weapon-mods.3f9d736414"), multiply: { interval: .75, damage: .85 } },
  { name: i18nText("config.weapon-mods.e1aac32a9a"), description: i18nText("config.weapon-mods.178e56b5f1"), multiply: { damage: 1.5, interval: 1.3, impulse: 1.5 } },
]);

// 母巢套件强化原生脉冲炮或小蛛，替换枪械仍使用该枪自己的套件。
WEAPON_MODS.push([
  {name:i18nText("config.weapon-mods.737b6bb704"),description:i18nText("config.weapon-mods.39ab260659"),multiply:{damage:1.25,chargeTime:1.25}},
  {name:i18nText("config.weapon-mods.0d77957a2e"),description:i18nText("config.weapon-mods.f233e73e55"),multiply:{minionDamageRatio:1.4,minionRange:1.2}},
]);

// 聚怪套件在覆盖范围与持续牵引之间取舍，互斥选择。
WEAPON_MODS.push([
 {name:'广域磁环',description:'引力范围提高25%，持续时间减少20%。',multiply:{gravityRadius:1.25,gravityDuration:.8}},
 {name:'长效约束',description:'持续时间提高40%，装填时间增加25%。',multiply:{gravityDuration:1.4,reloadTime:1.25}},
]);

// 熟练度按累计经验分段，达到最高等级后不再继续增长。
export function masteryInfo(progress, index) {
  const xp = progress.mastery?.[index] || 0;
  let level = 1;
  while (level < MASTERY_THRESHOLDS.length && xp >= MASTERY_THRESHOLDS[level]) level++;
  return {
    xp,
    level,
    next: MASTERY_THRESHOLDS[level] ?? null,
    floor: MASTERY_THRESHOLDS[level - 1],
  };
}

// 防御盾使用容量与充能部件成长，不提供攻击熟练度改装。
WEAPON_MODS.push([]);

// 战斗与界面共用改装快照；未解锁或旧档中的非法选择不产生属性收益。
export function effectiveWeapon(progress, index = progress.weapon, kind = 'weapons') {
  const base = WEAPONS[index],
    mastery = masteryInfo(progress, index);
  const choice = progress.mods?.[index] || 0;
  const mod =
    progress.weapons[index] && mastery.level >= GAMEPLAY_VALUES.progress.modUnlockLevel ? WEAPON_MODS[index]?.[choice - 1] : null;
  const result = { ...base, weaponIndex: index, modChoice: mod ? choice : 0 };
  if (mod) {
    for (const [key, value] of Object.entries(mod.multiply || {})) result[key] *= value;
    Object.assign(result, mod.set);
    if (mod.grenade) {
      result.grenade = { ...base.grenade };
      for (const [key, value] of Object.entries(mod.grenade)) result.grenade[key] *= value;
    }
  }
  if (['pulse','mechanical-spider'].includes(result.id)) result.interval = result.chargeTime + result.cooldown;
  result.damage *= 1 + (mastery.level - 1) * GAMEPLAY_VALUES.progress.masteryDamagePerLevel;
  result.modName = mod?.name || i18nText("config.weapon-mods.e49deec22c");
  if (mod) result.description = `${mod.name} · ${mod.description}`;
  return applyHeroWeaponTalent(applyMechanicalArmor(applyGuardianSupply(applyWeaponParts(result, progress, index), progress.guardianUpgrades),progress),progress,kind);
}

// 手持枪伤害由战斗与工坊共用，熟练度已经包含在有效武器快照中。
export function weaponDamage(progress, index = progress.weapon, power = 0) {
  return Math.round(effectiveWeapon(progress, index).damage * HEROES[progress.hero].bonus *
    equipmentAttackGrowth(progress.weapons[index],progress.heroes[progress.hero],progress) * heroTalentMultiplier(progress,'handDamage') * (1 + power * GAMEPLAY_VALUES.blessings.powerPerStack));
}
