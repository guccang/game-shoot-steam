// 每炮模块仓保存独立弹夹与技能周期；切换模块不会补弹或跳过冷却。
import { canMountWeapon, funnelWeapon, FUNNEL_CORE } from '../config/funnel-loadouts.js';
import { effectiveWeapon } from '../config/weapon-mods.js';
import { createMountedWeaponState, resetMountedWeaponCharge } from './summons/weapon-state.js';

// 改装原枪时清空未释放技能，保留所有活动及收起模块的余弹、装填与冷却。
export function resetFunnelModuleCharge(state, index) {
  for (const node of state.nodes) {
    const saved = node.loadouts[index];
    if (!saved) continue;
    resetMountedWeaponCharge(saved);
  }
}

// 建立每炮的运行槽，弹夹仍引用统一 magazine.modules 中的对象。
export function initializeFunnelLoadouts(state, progress) {
  for (const node of state.nodes) {
    const weapon = funnelWeapon(progress, node.index);
    node.weaponIndex = weapon.weaponIndex;
    node.weapon = weapon;
    const saved=createMountedWeaponState(node.magazine);
    node.pulse=saved.pulse;node.cycle=saved.cycle;
    node.loadouts = { [node.weaponIndex]: saved };
  }
}

// 装配只变更指定炮；新模块空仓返航，旧模块恢复之前余弹和未完成的补给。
export function equipFunnelModule(game, slot, index) {
  if (
    !Number.isInteger(slot) ||
    slot < 0 ||
    slot > 2 ||
    (!game.progress.weapons[FUNNEL_CORE] && !game.progress.vehicleWeapons?.[FUNNEL_CORE]) ||
    !canMountWeapon(game.progress, index)
  )
    return false;
  const node = game.funnel.nodes[slot];
  if (node.weaponIndex === index) return false;
  node.loadouts[node.weaponIndex] = {
    magazine: node.magazine,
    cooldown: node.cooldown,
    pulse: node.pulse,
    cycle: node.cycle,
  };
  const weapon = effectiveWeapon(game.progress, index);
  const saved = node.loadouts[index] ?? createMountedWeaponState({ammo:0,remaining:weapon.reloadTime});
  node.loadouts[index] = saved;
  node.weaponIndex = index;
  node.weapon = weapon;
  node.magazine = saved.magazine;
  node.cooldown = saved.cooldown;
  node.pulse = saved.pulse;
  node.cycle = saved.cycle;
  node.charging = node.magazine.remaining > 0;
  node.targetId = null;
  node.targetPoint = null;
  node.lockFlash = 0;
  node.flight.targetId = null;
  node.flight.station = null;
  node.completion = 0;
  game.magazines[FUNNEL_CORE].modules[slot] = node.magazine;
  game.progress.funnelLoadout[slot] = index;
  return true;
}
