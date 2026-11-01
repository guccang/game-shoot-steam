import {carriedWeapon} from '../progression/weapon-storage.js';
import { vehicleCapacity } from './vehicle-capacity.js';
// 浮游炮挂载目录：原生核心与已拥有的手持武器，禁止嵌套自动阵列。
import { WEAPONS, WEAPON_DISPLAY_ORDER } from './weapons.js';
import { effectiveWeapon } from './weapon-mods.js';

export const FUNNEL_CORE = 12;

// 原生核心用于旧档兼容；普通模块必须已拥有，不能借挂载跳过购买。
export function canMountWeapon(progress, index) {
  return (
    Number.isInteger(index) &&
    (index === FUNNEL_CORE ||
      (!!WEAPONS[index] && !WEAPONS[index].controller && WEAPONS[index].attackKind!=='defense' && carriedWeapon(progress,index)))
  );
}

// 每个槽位独立修复非法值，缺失配置保持原来的三门能量炮。
export function validateFunnelLoadout(progress, raw) {
  if (!Array.isArray(raw)) return [FUNNEL_CORE,FUNNEL_CORE,FUNNEL_CORE];
  return Array.from({ length: 3 }, (_, i) =>
    canMountWeapon(progress, raw?.[i]) ? raw[i] : FUNNEL_CORE,
  );
}

// 配置页只列出合法模块，按现有枪械解锁顺序展示，允许重复挂载同一枪。
export function availableFunnelWeapons(progress) {
  return [
    FUNNEL_CORE,
    ...WEAPON_DISPLAY_ORDER.filter((i) => i !== FUNNEL_CORE && canMountWeapon(progress, i)),
  ];
}

// 直接复用所挂枪械的等级、熟练度与改装快照，不叠加第二套浮游炮伤害倍率。
export function funnelWeapon(progress, slot) {
  const index = progress.funnelLoadout?.[slot] ?? FUNNEL_CORE;
  return vehicleCapacity(effectiveWeapon(progress, canMountWeapon(progress, index) ? index : FUNNEL_CORE),progress.vehicleAmmoBonus||1);
}
