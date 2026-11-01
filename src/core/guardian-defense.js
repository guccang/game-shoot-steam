import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
import { createSpiderState, updateSpider } from '../combat/spider.js';
import { createMechanicalState, updateMechanical } from '../combat/mechanical.js';
// 支架事务与自动火力复用正式炮塔、浮游炮及无人机，不修改永久装备对象。
import { GUARDIAN_PADS, guardianPads, GUARDIAN_ECONOMY, guardianCanDeploy, guardianInvestment } from '../config/guardian.js';
import { WEAPONS } from '../config/weapons.js';
import { guardianProgress } from '../config/guardian-equipment.js';
import { GUARDIAN_STAT_KEYS, GUARDIAN_STAT_MAX, guardianStatCost, guardianStatLevel, guardianSupplyLevels } from '../config/guardian-upgrades.js';
import { canMountWeapon } from '../config/funnel-loadouts.js';
import { createVehicle, updateVehicle } from '../combat/vehicle.js';
import { createMagazines, advanceReload } from '../combat/magazine.js';
import { createFunnelState, updateFunnel } from '../combat/funnel.js';
import { initializeFunnelLoadouts, equipFunnelModule } from '../combat/funnel-loadout.js';
import { createRecoil, updateRecoil } from '../combat/recoil.js';

// 战中可即时增援，暂停和失败阶段拒绝交易；战中检查点由游戏入口保持在波前。
export function changeGuardianDefense(game, action, slot, kind, index, weaponIndex = index) {
  const r = game.realm;
  if (r?.mode !== 'guardian' || !['build', 'rest', 'combat'].includes(r.phase) || game.state === 'paused' ||
      (r.phase === 'combat' && game.state !== 'playing') || !Number.isInteger(slot) || !GUARDIAN_PADS[slot]) return false;
  const old = r.defenses.find(t => t.slot === slot);
  if (action === 'deploy') {
    if (old || !guardianCanDeploy(game.progress, kind, index, weaponIndex) || r.realmCoins < GUARDIAN_ECONOMY[kind]) return false;
    r.realmCoins -= GUARDIAN_ECONOMY[kind];
    r.defenses.push({ slot, kind, index, weaponIndex, level: 1 });
  } else if (action === 'mount') {
    if (!old || WEAPONS[old.weaponIndex].controller !== 'funnel' || !canMountWeapon(game.progress, weaponIndex)) return false;
    const local = old.runtime || prepareGuardianDefense(game, old);
    if (!equipFunnelModule(local, index, weaponIndex)) return false;
    old.funnelLoadout = [...local.progress.funnelLoadout];
  } else if (action === 'upgrade') {
    const stat = kind ?? 'damage';
    if (!old || !GUARDIAN_STAT_KEYS.includes(stat) || guardianStatLevel(old, stat) >= GUARDIAN_STAT_MAX || r.realmCoins < guardianStatCost(old, stat)) return false;
    const before = guardianSupplyLevels(old);
    r.realmCoins -= guardianStatCost(old, stat);
    if (stat === 'damage') old.level++;
    else old.upgrades = { ...before, [stat]: before[stat] + 1 };
    // 余弹与动作连续保留；换弹升级按剩余进度缩短时间，不完成装填或赠送弹药。
    if (old.runtime) {
      old.runtime.progress.weapons.fill(old.level);
      old.runtime.progress.vehicleWeapons = WEAPONS.map(w => w.controller ? 0 : old.level);
      old.runtime.progress.guardianUpgrades = guardianSupplyLevels(old);
      if (stat === 'reload') shortenGuardianReload(old.runtime, (1 + (before.reload - 1) * GAMEPLAY_VALUES.guardian.reloadPerLevel) / (1 + before.reload * GAMEPLAY_VALUES.guardian.reloadPerLevel));
    }
  } else if (action === 'remove') {
    if (!old) return false;
    r.realmCoins += guardianInvestment(old);
    r.defenses = r.defenses.filter(t => t !== old);
  } else return false;
  for (const tower of r.defenses) if (!tower.runtime) prepareGuardianDefense(game, tower);
  return true;
}

// 每个支架有独立弹夹、后坐与飞行时钟；代理的命中和奖励始终回到正式游戏实例。
export function prepareGuardianDefense(game, tower) {
  const local = Object.create(game), pad = guardianPads(game.realm.arena)[tower.slot];
  local.progress = guardianProgress(game.progress, tower);
  local.statisticsVehicleIndex=tower.kind==='vehicle'?tower.index:null;
  // 守护支架有独立位置，但可见范围仍相对真正的玩家镜头。
  local.summonViewOrigin = game.player;
  if (WEAPONS[tower.weaponIndex].controller === 'funnel') tower.funnelLoadout = [...local.progress.funnelLoadout];
  local.player = { ...game.player, ...pad, arena: game.realm.arena, walkPhase: 0, recoil: createRecoil(), angle: 0, flying: tower.kind === 'vehicle' && tower.index === 2 };
  local.hit = game.hit.bind(game);
  local.float = game.float.bind(game);
  local.vehicle = createVehicle(local.progress, tower.kind === 'vehicle' ? tower.index : 0);
  local.vehicle.active = true;
  local.vehicles = [local.vehicle];
  local.magazines = createMagazines(local.progress);
  // 波前补给使用升级后的容量；阵列模块已由正式挂载公式初始化。
  local.magazines.forEach((magazine, index) => { if (!magazine.modules) magazine.ammo = local.weapon(index).magazineSize; });
  const controller = WEAPONS[tower.weaponIndex].controller;
  if (controller) local[controller] = controller === 'mechanical' ? createMechanicalState() : controller === 'spider' ? createSpiderState() : createFunnelState(local.magazines[tower.weaponIndex], controller);
  if (controller === 'funnel') initializeFunnelLoadouts(local.funnel, local.progress);
  // 每波补给仍重建，但飞行与旋翼姿态接续上一帧，避免开波时阵列瞬移回头顶。
  const previous = tower.runtime;
  if (previous) {
    local.vehicle.angle = previous.vehicle.angle;
    local.vehicle.recoil = previous.vehicle.recoil;
    if (['mechanical','spider'].includes(controller)) local[controller] = structuredClone(previous[controller]);
    else if (controller) {
      const before = previous[controller], state = local[controller];
      for (const key of ['time', 'orbitPhase', 'previousPlayer', 'deploy']) state[key] = before[key];
      for (const node of state.nodes) for (const key of ['x', 'y', 'angle', 'flight', 'recoil']) node[key] = before.nodes[node.index][key];
    }
  }
  tower.runtime = local;
  return local;
}

// 同一弹夹可能由多个运行槽引用，只缩短一次；收起的浮游炮模块也保留相同比例进度。
function shortenGuardianReload(local, ratio) {
  const magazines = new Set();
  for (const magazine of local.magazines) {
    if (magazine.modules) magazine.modules.forEach(m => magazines.add(m));
    else magazines.add(magazine);
  }
  for (const module of Object.values(local.vehicle.modules)) magazines.add(module.magazine);
  for (const node of Object.hasOwn(local, 'funnel') ? local.funnel.nodes : [])
    for (const module of Object.values(node.loadouts)) magazines.add(module.magazine);
  for (const magazine of magazines) if (magazine.remaining > 0) magazine.remaining *= ratio;
}

// 波次开始重新建立供给；只有正式战斗时钟能推进支架火力。
export function updateGuardianDefenses(game, dt) {
  if (game.realm?.mode !== 'guardian' || game.realm.phase !== 'combat' || game.state !== 'playing') return;
  for (const tower of game.realm.defenses) {
    const local = tower.runtime || prepareGuardianDefense(game, tower);
    const weapon = local.weapon(), controller = weapon.controller;
    if (controller) {
      updateRecoil(local.player.recoil, tower.weaponIndex, dt);
      advanceReload(local.magazines[tower.weaponIndex], weapon, dt, game.onEvent);
      if (controller === 'mechanical') updateMechanical(local, dt);
      else if(controller==='spider')updateSpider(local,dt);
      else updateFunnel(local, dt);
    } else updateVehicle(local, dt);
  }
}
