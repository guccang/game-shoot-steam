import { GAMEPLAY_VALUES } from './gameplay-values.js';
// 守护炮塔的局内装备快照与能力面板共用公式，不改写玩家永久等级和挂载。
import { WEAPONS } from './weapons.js';
import { HEROES } from './heroes.js';
import { effectiveWeapon } from './weapon-mods.js';
import { vehicleWeapon, vehicleDamage } from './vehicles.js';
import { realmWeapon } from './realms.js';
import { validateFunnelLoadout } from './funnel-loadouts.js';
import { guardianSupplyLevels } from './guardian-upgrades.js';

// 每座支架独立保存三槽配置；旧记录默认继承入场时的合法挂载。
export function guardianProgress(progress, tower, level = tower.level) {
  return { ...progress, guardianHandWeapons:true, weapon: tower.weaponIndex, vehicleAmmoBonus:tower.kind==='vehicle'?GAMEPLAY_VALUES.vehicle.ammoMultiplier:1,
    weaponParts: [], turretParts: [], vehicleParts: [],
    guardianUpgrades: guardianSupplyLevels(tower),
    weapons: WEAPONS.map(() => level),
    vehicleWeapons: WEAPONS.map(w => w.controller ? 0 : level),
    vehicleLoadouts: progress.vehicleHulls.map(() => tower.weaponIndex),
    mechanicalLoadout: null,
    spiderLoadout: null,
    funnelLoadout: validateFunnelLoadout(progress, tower.funnelLoadout ?? progress.funnelLoadout) };
}

// 能力预览与普通炮塔/阵列的真实伤害和武器配置一致，满级可直接复用当前结果。
export function guardianWeaponStats(progress, tower, buffs = {}, level = tower.level, module = null) {
  const local = guardianProgress(progress, tower, level);
  const index = module === null ? tower.weaponIndex : local.funnelLoadout[module];
  const controller = !!WEAPONS[tower.weaponIndex].controller;
  const weapon = realmWeapon(controller ? effectiveWeapon(local, index) : vehicleWeapon(local, index), buffs);
  const damage = controller
    ? Math.round(effectiveWeapon(local, index).damage * HEROES[local.hero].bonus * (1 + (level - 1) * GAMEPLAY_VALUES.growth.earlyWeaponPerLevel) *
      (1 + (local.heroes[local.hero] - 1) * GAMEPLAY_VALUES.growth.earlyHeroPerLevel) * (1 + (buffs.power || 0) * GAMEPLAY_VALUES.blessings.powerPerStack))
    : Math.round(vehicleDamage(local, index) * (1 + (buffs.power || 0) * GAMEPLAY_VALUES.blessings.powerPerStack));
  return { weapon, damage, rate: 1 / weapon.interval, magazine: weapon.magazineSize,
    reload: weapon.reloadTime, range: weapon.range, pellets: weapon.pellets || 1 };
}
