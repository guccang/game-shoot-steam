import {scooterCapacity} from '../config/scooter-capacity.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
import { advanceRotary } from './rotary.js';
import { flyingObservation } from './summons/recovery.js';
import { summonTargetPool, allocateFlyingTargets } from './summons/targets.js';
import { isSummonEnergy } from '../config/summon-energy.js';
import { realmWeapon } from '../config/realms.js';
// 三炮协同控制：锁定、阵列位置与独立射击调度只由战斗时钟推进，无人机共享弹夹，浮游炮独立返航供给。
import { nearest } from '../world/coordinates.js';
import { hitCenter } from './collision.js';
import { emitWeaponAttack } from './weapon-fire.js';
import { funnelWeapon } from '../config/funnel-loadouts.js';
import { advancePulse } from './pulse.js';
import { advanceGrenadeCharge, launchGrenade } from './grenades.js';
import { consumeRound, advanceReload } from './magazine.js';
import { advanceGatlingHeat } from './weapon-heat.js';
import { createRecoil, updateRecoil, triggerRecoil } from './recoil.js';
import { createFunnelFlight, updateFunnelMovement } from './funnel-movement.js';

import { createDroneFlight, updateDroneMovement, queueDroneManeuver } from './drone-movement.js';

export const FUNNEL_INDEX = 12;
export const DRONE_INDEX = 13;
export const FUNNEL_FOLDED = [
  [-42, -48],
  [0, -78],
  [42, -48],
];
// 充能阵列移至头部两侧，中央空间留给屏幕坐标的进度徽章。
export const FUNNEL_CHARGING = [
  [-44, -32],
  [-34, -64],
  [44, -40],
];
export const FUNNEL_OPEN = [
  [-54, -48],
  [0, -78],
  [54, -48],
];

// 三门炮数量固定；冷却是剩余时间，收起武器时不用世界时钟偷偷恢复。
export function createFunnelState(magazine, kind = 'funnel') {
  return {
    kind,
    reloadTime: GAMEPLAY_VALUES.funnel.fallbackReloadSeconds,
    deploy: GAMEPLAY_VALUES.funnel.deploySeconds,
    primed: false,
    charging: false,
    hadTargets: false,
    completion: 0,
    time: 0,
    // 环绕相位独立于单炮出击和补给，归队时接续同一编队槽位。
    orbitPhase: 0,
    previousPlayer: null,
    nodes: FUNNEL_FOLDED.map(([x, y], index) => ({
      index,
      flight: kind === 'drone' ? createDroneFlight(index) : createFunnelFlight(index),
      magazine: kind === 'funnel' ? (magazine?.modules[index] ?? { ammo: GAMEPLAY_VALUES.funnel.fallbackAmmo, remaining: 0 }) : null,
      charging: false,
      completion: 0,
      x,
      y,
      targetId: null,
      targetPoint: null,
      angle: -Math.PI / 2,
      cooldown: 0,
      lockFlash: 0,
      recoil: createRecoil(),
    })),
  };
}

// 换枪只重建锁定和展开动作，能源、充能及各炮剩余冷却全部保留。
export function resetFunnelFormation(state) {
  state.deploy = GAMEPLAY_VALUES.funnel.deploySeconds;
  state.primed = false;
  state.hadTargets = false;
  state.previousPlayer = null;
  for (const node of state.nodes) {
    node.targetId = null;delete node.observation;delete node.returnEase;
    node.targetPoint = null;
    node.lockFlash = 0;
    node.recoil = createRecoil();
    node.flight =
      state.kind === 'drone' ? createDroneFlight(node.index) : createFunnelFlight(node.index);
    [node.x, node.y] = FUNNEL_FOLDED[node.index];
  }
}

// 保留仍有效的独立目标；补位时优先无人认领的目标，数量不足才均分集火。
export function funnelTargets(game, weapon, state = game[weapon.controller || 'funnel']) {
  // 每门炮按挂载武器独立判断射程和怪物优先级。
  const pools = state.nodes.map((node) => {
    if (node.charging) return [];
    const module = state.kind === 'drone' ? weapon : scooterCapacity(realmWeapon(funnelWeapon((game.loadout || game.progress), node.index), game.realm?.buffs),game);
    return summonTargetPool(game,game.player,module.range,{bossFirst:true,tieById:true,targetTrees:module.targetTrees});
  });
  return allocateFlyingTargets(state.nodes,pools,weapon.focusFire);
}

// 瞄准、炮口与渲染共享同一姿态，后坐只移动炮体，不推退角色。
export function funnelMuzzle(player, node, reduced = false) {
  const length = 17 - (reduced ? 0 : node.recoil.kick);
  return {
    x: player.x + node.x + Math.cos(node.angle) * length,
    y: player.y + node.y + Math.sin(node.angle) * length,
  };
}

// 有效单炮射击只扣一格能源，保持来源快照并复用扫掠命中和成长奖励。
function fireNode(game, node, target, weapon, state) {
  // 同时记录挂载枪与载体成长来源，不改变原枪伤害、弹道及表现类型。
  weapon = { ...weapon,...(weapon.id==='chainsaw'?{sawScale:.42,sawAngle:node.angle}:{}),audioSource:'companion',...(state.kind==='funnel'?{masteryOwnerIndex:FUNNEL_INDEX}:{}) };
  const magazine = state.kind === 'funnel' ? node.magazine : game.magazines[weapon.weaponIndex];
  const muzzle = funnelMuzzle(game.player, node, game.reducedMotion);
  if(game.combatLineClear&&!game.combatLineClear(game.player,muzzle))return false;
  if (!consumeRound(magazine, weapon)) return false;
  const center = nearest(hitCenter(target), muzzle);
  const distance = Math.hypot(center.x - muzzle.x, center.y - muzzle.y) || 1;
  const direction = { x: (center.x - muzzle.x) / distance, y: (center.y - muzzle.y) / distance };
  const critical = game.random() < GAMEPLAY_VALUES.combat.criticalChance;
  const amount = Math.round(game.damage(weapon.weaponIndex) * (critical ? GAMEPLAY_VALUES.combat.criticalMultiplier : 1));
  // 搜敌距离始终以角色为中心，炮口偏移不能使合法目标落在弹丸行程之外。
  emitWeaponAttack(
    game,
    ['funnel', 'drone'].includes(weapon.id)
      ? { ...weapon, range: Math.max(weapon.range, distance + GAMEPLAY_VALUES.funnel.nativeRangePadding) }
      : weapon,
    muzzle,
    direction,
    amount,
    critical,
    true,
    magazine,
  );
  triggerRecoil(node.recoil, weapon.weaponIndex);
  game.player.recoil.flash = 0.08;
  game.onEvent('shot', { kind: weapon.id, laser: weapon.id === 'laser',source:'companion' });
  if (node.cycle) {
    node.cycle.firing = magazine.remaining === 0;
    if (magazine.remaining > 0) node.cycle.charge = 0;
  }
  if (weapon.chargeTime) {
    node.pulse.charge = 0;
    node.pulse.cooldown = weapon.cooldown;
    // 重型反冲由炮体承担，持有者与镜头不受推进冲量。
    node.flight.vx -= direction.x * weapon.selfImpulse;
    node.flight.vy -= direction.y * weapon.selfImpulse;
  }
  if (state.kind === 'drone') queueDroneManeuver(node);
  if (magazine.remaining > 0) {
    if (state.kind === 'funnel') node.charging = true;
    else state.charging = true;
  }
  return true;
}

// 种地及守护准备、休整仅续接飞行、归队和后坐；不寻敌、开火、补弹或推进技能冷却。
export function updateFunnelIdle(game, dt) {
  const weapon = game.weapon(), state = game[weapon.controller];
  if (!['funnel', 'drone'].includes(weapon.controller) || !state) return;
  state.time += dt;
  state.deploy = Math.max(0, state.deploy - dt);
  state.completion = Math.max(0, state.completion - dt);
  state.hadTargets = false;
  for (const node of state.nodes) {
    node.weapon = weapon.independentSupply ? scooterCapacity(realmWeapon(funnelWeapon(game.loadout || game.progress, node.index), game.realm?.buffs),game) : weapon;
    node.targetId = null;delete node.observation;delete node.returnEase;
    node.lockFlash = Math.max(0, node.lockFlash - dt);
    node.completion = Math.max(0, node.completion - dt);
    updateRecoil(node.recoil, node.weapon.weaponIndex, dt);
  }
  (state.kind === 'drone' ? updateDroneMovement : updateFunnelMovement)(game, dt, state.nodes.map(() => null), {
    folded: FUNNEL_FOLDED, open: FUNNEL_OPEN, charging: FUNNEL_CHARGING,
  });
}

// 充能期间冷却自然结束；完成后恢复错峰，不积攒额外齐射或在一帧补发多次攻击。
export function updateFunnel(game, dt) {
  const weapon = game.weapon(),
    state = game[weapon.controller],
    magazine = game.magazines[weapon.weaponIndex];
  state.reloadTime = weapon.reloadTime;
  state.time += dt;
  state.deploy = Math.max(0, state.deploy - dt);
  state.completion = Math.max(0, state.completion - dt);
  for (const node of state.nodes) {
    const module = weapon.independentSupply ? scooterCapacity(realmWeapon(funnelWeapon((game.loadout || game.progress), node.index), game.realm?.buffs),game) : weapon;
    node.weapon = module;
    node.cooldown -= dt;
    node.completion = Math.max(0, node.completion - dt);
    // 原生炮空中回能，外挂枪在泊位内装填；换枪保留两类供给状态。
    if (weapon.independentSupply && isSummonEnergy(module)) {
      // 原生能源在飞行、交火与待机时持续恢复；外挂枪仍必须返航入坞装填。
      advanceReload(node.magazine, module, dt, (type,data)=>game.onEvent(type,{...data,source:'companion'}));
      node.charging = false;
    } else if (weapon.independentSupply) {
      let supplied = false;
      node.charging = node.magazine.remaining > 0 || node.magazine.ammo === 0;
      if (node.charging && node.flight.mode === 'dock') {
        const [x, y] = FUNNEL_CHARGING[node.index];
        const prior = state.previousPlayer
          ? nearest(state.previousPlayer, game.player)
          : game.player;
        const dx = game.player.x - prior.x,
          dy = game.player.y - prior.y;
        if (Math.hypot(node.x - dx - x, node.y - dy - y) < GAMEPLAY_VALUES.funnel.supplyDockRadius) {
          advanceReload(node.magazine, module, dt, (type,data)=>game.onEvent(type,{...data,source:'companion'}));
          supplied = true;
          if (node.magazine.remaining === 0) {
            node.charging = false;
            node.completion = 0.45;
            node.cooldown = Math.max(0, node.cooldown) + node.index * GAMEPLAY_VALUES.funnel.fireStaggerSeconds;
          }
        }
      }
      // 飞行与无目标时也自然散热；入坞由装填推进热量，同一帧只更新一次。
      if (!supplied) {advanceGatlingHeat(node.magazine, module, dt);advanceRotary(node.magazine,module,dt);}
    }
    node.lockFlash = Math.max(0, node.lockFlash - dt);
    updateRecoil(node.recoil, module.weaponIndex, dt);
  }
  if (!weapon.independentSupply && state.charging && magazine.remaining === 0) {
    state.charging = false;
    state.completion = 0.45;
    state.nodes.forEach((node) => {
      node.cooldown = Math.max(0, node.cooldown) + node.index * GAMEPLAY_VALUES.funnel.fireStaggerSeconds;
    });
  }
  if (!weapon.independentSupply && magazine.remaining > 0) state.charging = true;
  const targets = funnelTargets(game, weapon);
  const hasTargets = targets.some(Boolean),
    resuming = hasTargets && !state.hadTargets;
  state.hadTargets = hasTargets;
  state.nodes.forEach((node, i) => {
    flyingObservation(game,state,node,targets[i],dt,state.charging||node.charging);
    const next = targets[i]?.id ?? null;
    if (next !== node.targetId && next !== null) node.lockFlash = 0.25;
    node.targetId = next;
  });
  (state.kind === 'drone' ? updateDroneMovement : updateFunnelMovement)(game, dt, targets, {
    folded: FUNNEL_FOLDED,
    open: FUNNEL_OPEN,
    charging: FUNNEL_CHARGING,
  });
  if(game.constrainFlyingNode)for(const node of state.nodes)game.constrainFlyingNode(node);
  if (state.deploy > 0 || state.charging) return;
  if (!state.primed && hasTargets) {
    state.primed = true;
    state.nodes.forEach((node) => {
      node.cooldown = Math.max(node.cooldown, GAMEPLAY_VALUES.funnel.firstLockSeconds + node.index * GAMEPLAY_VALUES.funnel.fireStaggerSeconds);
      node.lockFlash = 0.25;
    });
  } else if (resuming) {
    // 空场重新发现目标时首炮立即响应，其余炮保持短错峰，不重复首次锁定前摇。
    state.nodes.forEach((node) => {
      node.cooldown = Math.max(node.cooldown, node.index * GAMEPLAY_VALUES.funnel.fireStaggerSeconds);
    });
  }
  for (const node of state.nodes) {
    if (!weapon.independentSupply && magazine.remaining > 0) break;
    if (node.charging) continue;
    const target = targets[node.index];
    const module = node.weapon;
    if (!target || target.hp <= 0) {
      if (node.pulse) advancePulse(node.pulse, module, dt, false);
      if (node.cycle) advanceGrenadeCharge(node.cycle, module, dt, false);
      node.cooldown = Math.max(0, node.cooldown);
      continue;
    }
    if(node.aimAligned===false){node.cooldown=Math.max(0,node.cooldown);continue;}
    // 榴弹与脉冲复用手持枪的技能时钟，每炮独立累计，装填时停止蓄能。
    if (module.grenade && advanceGrenadeCharge(node.cycle, module, dt, true)) {
      launchGrenade(
        game,
        { ...module,audioSource:'companion',...(state.kind==='funnel'?{masteryOwnerIndex:FUNNEL_INDEX}:{}) },
        funnelMuzzle(game.player, node, game.reducedMotion),
        target,
        game.damage(module.weaponIndex),
      );
      triggerRecoil(node.recoil, module.weaponIndex);
    }
    if (module.chargeTime) {
      if (node.cooldown <= 1e-8 && advancePulse(node.pulse, module, dt, true))
        fireNode(game, node, target, module, state);
    } else {
      // 高速挂载保留步内射击余量；每次仍执行正式扣弹与装填校验。
      node.cooldown=Math.max(-dt,node.cooldown);
      for(let shot=0;shot<8&&node.cooldown<=1e-8;shot++){
        if(!fireNode(game,node,target,module,state))break;
        node.cooldown+=module.interval;
      }
    }
  }
}
