import { vehicleCapacity } from '../config/vehicle-capacity.js';
import { turnWeapon,weaponTurnRate } from './weapon-turn.js';
import { createMountedWeaponState, resetMountedWeaponCharge } from './summons/weapon-state.js';
// 机械猫背枪复用正式枪械弹道、技能与后坐，每猫每枪独立保存供给。
import { effectiveWeapon } from '../config/weapon-mods.js';
import { realmWeapon } from '../config/realms.js';
import { validateMechanicalLoadout, MECHANICAL_GUN_LIMIT } from '../config/mechanical-loadout.js';
import { advancePulse } from './pulse.js';
import { advanceGrenadeCharge, launchGrenade } from './grenades.js';
import { createRecoil, updateRecoil, triggerRecoil, RECOIL_PROFILES } from './recoil.js';
import { advanceReload, consumeRound } from './magazine.js';
import { emitWeaponAttack } from './weapon-fire.js';
import { hitCenter } from './collision.js';
import { nearest } from '../world/coordinates.js';
export const MECHANICAL_GUN_SCALE = .48;
// 枪口与绘制共用背部支架位置，枪身缩放不会改变猫的碰撞体。
export function mechanicalMuzzle(node, reduced = false) {
  const length = (RECOIL_PROFILES[node.gun.weapon.weaponIndex].muzzle - (reduced ? 0 : node.gun.recoil.kick)) * (node.gun.scale??MECHANICAL_GUN_SCALE);
  return { x: node.x + Math.cos(node.gun.angle) * length, y: node.y + (node.gun.mountY??-37) + Math.sin(node.gun.angle) * length };
}
// 新挂载空仓装填；往返配置恢复既有弹药、蓄能和冷却，近战模式冻结背枪。
export function syncMechanicalGun(game, node) {
  const progress = game.loadout || game.progress, index = validateMechanicalLoadout(progress, progress.mechanicalLoadout);
  node.guns ||= {};
  if (index === null || node.index >= MECHANICAL_GUN_LIMIT) { node.gun = null; return null; }
  const weapon = vehicleCapacity(realmWeapon(effectiveWeapon(progress, index), game.realm?.buffs),game.vehicleAmmoBonus||1);
  const gun = node.guns[index] ||= { ...createMountedWeaponState({ammo:0,remaining:weapon.reloadTime}), recoil:createRecoil(), angle:0 };
  gun.weapon = weapon; node.gun = gun; return gun;
}
// 只有活猫战斗时推进枪械供给，死亡和收起不会免费装填。
export function updateMechanicalGun(game, node, target, dt, advanceSupply = true) {
  const gun = node.gun, w = gun.weapon;
  updateRecoil(gun.recoil, w.weaponIndex, dt);
  const active = advanceSupply?advanceReload(gun.magazine, w, dt, (type,data)=>game.onEvent(type,{...data,source:'companion'})):(gun.magazine.remaining>0?0:dt);
  gun.cooldown -= active;
  if (!target || target.hp <= 0 || gun.magazine.remaining > 0 || active <= 0) { gun.cooldown=Math.max(0,gun.cooldown); return; }
  const point = nearest(hitCenter(target), node);
  if(!turnWeapon(gun,Math.atan2(point.y-(node.y+(gun.mountY??-37)),point.x-node.x),dt,weaponTurnRate(w,true))){gun.cooldown=Math.max(0,gun.cooldown);return;}
  const muzzle = mechanicalMuzzle(node, game.reducedMotion), dx = point.x - muzzle.x, dy = point.y - muzzle.y;
  const distance = Math.hypot(dx, dy) || 1;
  if (distance > w.range + target.radius) {gun.cooldown=Math.max(0,gun.cooldown);return;}
  const weapon = { ...w, audioSource:'companion', masteryOwnerIndex: gun.ownerIndex??15 };
  const damage = gun.damage ?? (game.mountedGunDamage ? game.mountedGunDamage(w.weaponIndex) : game.damage(w.weaponIndex));
  if (w.grenade && advanceGrenadeCharge(gun.cycle, w, active, true)) launchGrenade(game, weapon, muzzle, target, damage);
  const ready = w.chargeTime ? advancePulse(gun.pulse, w, active, true) : gun.cooldown <= 0;
  if (!ready) return;
  // 补算范围仅限本次武器步长，装填、无目标与转向不积攒连射。
  gun.cooldown=Math.max(-active,gun.cooldown);
  for(let shot=0;shot<8&&(w.chargeTime?shot===0:gun.cooldown<=1e-8);shot++){
    if(!consumeRound(gun.magazine,w))break;
    emitWeaponAttack(game, weapon, muzzle, { x: dx / distance, y: dy / distance }, damage, false, true, gun.magazine);
    triggerRecoil(gun.recoil, w.weaponIndex);
    // 连续开火保留步内余量，无目标与转向阶段不积攒追补攻击。
    gun.cooldown += w.interval; gun.cycle.firing = gun.magazine.remaining === 0;
    if (w.chargeTime) { gun.pulse.charge = 0; gun.pulse.cooldown = w.cooldown; }
    game.onEvent('shot', { kind: w.id, laser: w.id === 'laser',source:'companion' });
  }
}

// 原枪改装清空未释放技能，保留生命、弹仓与剩余装填时间。
export function resetMechanicalGunCharge(state,index) {
  // 母体换装的各枪仓也遵循正式套件改装规则，清技能但不补供给。
  const spiderGun=state?.mother?state.guns?.[index===16?'native':String(index)]:null;
  resetMountedWeaponCharge(spiderGun);
  for(const node of state?.nodes||[]) {
    const gun=node.guns?.[index];if(!gun)continue;
    resetMountedWeaponCharge(gun);
  }
}
