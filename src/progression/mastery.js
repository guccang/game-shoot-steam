import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
import { GAMEPLAY_TABLES } from '../config/gameplay-tables.js';
import { recordEconomy } from './economy-ledger.js';
// 熟练度与互斥改装事务独立于战斗、界面及存储，便于复用和回归验证。
import { WEAPONS } from '../config/weapons.js';
import { WEAPON_MODS, MASTERY_THRESHOLDS, masteryInfo, MOD_COST } from '../config/weapon-mods.js';

// 只奖励有明确来源的有效击杀，空射与重复命中尸体不增长熟练度。
export function awardMastery(progress, weaponIndex, type) {
  if (!Number.isInteger(weaponIndex) || !WEAPONS[weaponIndex] || !(progress.weapons[weaponIndex] || weaponIndex<17&&progress.vehicleWeapons?.[weaponIndex]))
    return;
  const reward = GAMEPLAY_TABLES.masteryRewards[type];
  if (!reward) return;
  progress.mastery[weaponIndex] = Math.min(MASTERY_THRESHOLDS.at(-1), progress.mastery[weaponIndex] + reward);
}

// 有效击杀同时培养挂载枪和发射载体；原生核心来源相同时只计一次。
export function awardAttackMastery(progress, impact, type) {
  // 车型主炮独立编号与新手持编号可能相同，不能把主炮击杀计入手持熟练度。
  if(['vehicle-machinegun','tank-125','vehicle-vulcan','hover-tide','wolf-256'].includes(impact?.kind))return;
  awardMastery(progress, impact?.weaponIndex, type);
  if (impact?.masteryOwnerIndex !== impact?.weaponIndex)
    awardMastery(progress, impact?.masteryOwnerIndex, type);
}

// 二选一切换不叠加，先检查所有门槛再扣费；恢复原厂免费，但重新改装仍需付费。
export function changeWeaponMod(progress, index, choice) {
  if (
    !Number.isInteger(index) ||
    !progress.weapons[index] ||
    !WEAPON_MODS[index] ||
    !Number.isInteger(choice) ||
    choice < 0 ||
    choice > WEAPON_MODS[index].length ||
    progress.mods[index] === choice
  )
    return false;
  if (
    choice &&
    (masteryInfo(progress, index).level < GAMEPLAY_VALUES.progress.modUnlockLevel ||
      progress.coins < MOD_COST.coins ||
      progress.wood < MOD_COST.wood)
  )
    return false;
  if (choice) {
    recordEconomy(progress,'expense','modify:weapons:'+index,MOD_COST);
    progress.coins -= MOD_COST.coins;
    progress.wood -= MOD_COST.wood;
  }
  progress.mods[index] = choice;
  return true;
}
