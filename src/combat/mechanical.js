import {statisticsSource} from './statistics-source.js';
import {summonGroundReachable,summonGroundWaypoint,summonMeleeLineClear} from './summons/reachability.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
import { observeLostTarget,groundEscort } from './summons/recovery.js';
import { SPIDER_ARRIVAL, spiderEscortHome } from './summons/spider-escort.js';
import { CREW_ARRIVAL } from '../config/jinbei.js';
import { deployNode, walkNode, separateNodes } from './summons/ground-motion.js';
export { deployNode, walkNode } from './summons/ground-motion.js';
import { summonTargetPool, allocateGroundTargets } from './summons/targets.js';
// 机械小猫使用独立地面状态、共享能源与真实近战接触，不复用飞行炮阵列。
import { nearest, worldDistance } from '../world/coordinates.js';
import { forgetNaturalRoute } from '../physics/terrain-navigation.js';
import { hitCenter, traceTargets } from './collision.js';
import { syncMechanicalGun, updateMechanicalGun } from './mechanical-gun.js';
import { MECHANICAL_HP, MECHANICAL_SPAWN_INTERVAL, MECHANICAL_RECALL_COST, MECHANICAL_RECALL_DELAY, mechanicalNodeWeapon } from '../config/mechanical-loadout.js';
import { explodeSpiderling } from './spider-death.js';
import { consumeRound } from './magazine.js';
import { advanceMechanicalFormation, mechanicalHome, naturalMechanicalHome, clearMechanicalVehicle } from './mechanical-formation.js';

export const MECHANICAL_INDEX = 15;
// 固定十个槽保存各自冷却；升级只展开新槽，切换武器不会刷新已有攻击计时。
export function createMechanicalState(capacity=GAMEPLAY_VALUES.mechanical.capacity) {
  return { spawnTimer: 0, nodes: Array.from({ length: capacity }, (_, index) => ({ index, x: 0, y: 0,
    ready: false, active: false, spawned: false, angle: 0, walkPhase: index, cooldown: index * GAMEPLAY_VALUES.mechanical.initialCooldownStep,
    swing: 0, windup: 0, mode: 'return', hp: MECHANICAL_HP, maxHp: MECHANICAL_HP, deadTime: 0, flash: 0, targetId: null, radius: GAMEPLAY_VALUES.mechanical.radius })) };
}
// 只回收位置和目标，不补能源或抹除冷却；地图和装备切换共用此入口。
export function resetMechanicalFormation(state) {
  if(state){state.follow=null;if(!state.mother&&!state.crew)state.spawnTimer=0;}
  for (const node of state?.nodes || []) {
    node.ready = node.active = false; node.targetId = null; node.swing = 0;
    node.emerge=0;node.escortHome=null;node.escortWait=0;
    delete node.observation;delete node.returnEase;delete node.catchingUp;
    forgetNaturalRoute(node);
  }
}
// 同一正式命中入口处理伤害、特效和熟练度；每次成功挥爪只消耗一格共享能源。
function strike(game, node, target, weapon) {
  const start = hitCenter(node), center = nearest(hitCenter(target), start);
  const dx = center.x - start.x, dy = center.y - start.y, length = Math.hypot(dx, dy);
  if (length > weapon.meleeReach + target.radius) return;
  if (!summonMeleeLineClear(game,node,target)) return;
  const direction = { x: dx / (length || 1), y: dy / (length || 1) };
  const hit = traceTargets(start, center, [...game.trees, target], 1)[0];
  if (!hit || hit.target !== target) return;
  const ownerIndex=weapon.weaponIndex??MECHANICAL_INDEX,magazine = game.magazines[ownerIndex];
  if (!weapon.freeMelee&&!consumeRound(magazine, weapon, game.onEvent)) return;
  node.angle = Math.atan2(dy, dx); node.mode = 'strike'; node.swing = weapon.swingTime||GAMEPLAY_VALUES.mechanical.swingSeconds; node.cooldown = weapon.interval;
  const critical = game.random() < GAMEPLAY_VALUES.mechanical.criticalChance;
  game.hit(target, Math.round(game.damage(ownerIndex) * (critical ? GAMEPLAY_VALUES.mechanical.criticalMultiplier : 1)), critical,
    { ...hit, direction, impulse: weapon.impulse, pushLimit: weapon.pushLimit, groundedPush: weapon.groundedPush, weaponIndex: ownerIndex, kind:weapon.crew?'cat-crew':undefined, audioSource:weapon.crew?'vehicle':'companion', statisticsSource:statisticsSource(game,weapon), power: .65 });
  game.onEvent('shot', { kind: weapon.crew?'cat-crew-hit':node.spider?'mechanical-spider':'mechanical-core',source:'companion' });
  game.fx.add('spark', hit.x, hit.y, .2, { color: '#d7ebad', size: 3, vx: -direction.x * 30, vy: -direction.y * 30 });
}
// 机械猫承伤不触发玩家无敌或载具护甲；死亡保留背枪弹药及冷却。
export function hurtMechanical(game, node, amount) {
  if (!node.active || !node.ready || node.hp <= 0 || amount <= 0) return false;
  node.hp = Math.max(0, node.hp - amount); node.flash = .18;
  if (!node.hp) {
    node.mode = 'dead'; node.deadTime = node.recallDelay??MECHANICAL_RECALL_DELAY; node.windup = node.swing = 0;
    node.targetId = null;delete node.observation;delete node.returnEase;delete node.catchingUp;
    explodeSpiderling(game,node);
    game.fx.add('spark', node.x, node.y - 12, .35, { color: '#f4dca0', size: 5 });
  }
  return true;
}
// 首次部署、回收后归队与死亡补召共用单槽队列；低帧率也不会一帧召出整群。
function advanceDeployment(game,state,nodes,base,dt,combat) {
  for(const node of nodes) {
    if(node.hp<=0&&combat)node.deadTime=Math.max(0,node.deadTime-dt);
    if(node.ready&&(node.mapId!==game.player.mapId||node.arena!==game.player.arena||worldDistance(node,game.player)>base.range*GAMEPLAY_VALUES.mechanical.redeployRangeRatio))node.ready=false;
  }
  if(!combat)return;
  state.spawnTimer=Math.max(0,(state.spawnTimer||0)-dt);
  if(state.spawnTimer>1e-8)return;
  const energy=game.magazines[MECHANICAL_INDEX];
  const node=nodes.find(n=>n.hp>0?!n.ready:n.deadTime<=1e-8&&energy.remaining<=0&&energy.ammo>=MECHANICAL_RECALL_COST);
  if(!node)return;
  const dead=node.hp<=0;
  deployNode(game,node,base.summonCount);
  if(!node.ready)return;
  if(dead){energy.ammo-=MECHANICAL_RECALL_COST;node.hp=node.maxHp;}
  node.spawned=true;node.mode='return';node.targetId=null;node.cooldown=Math.max(GAMEPLAY_VALUES.mechanical.deployAttackDelay,node.cooldown);
  game.onEvent('weapon-sound',{kind:'mechanical-deploy',source:'companion'});
  forgetNaturalRoute(node);
  state.spawnTimer=MECHANICAL_SPAWN_INTERVAL;
}
// 波间只归队，暂停/收起不推进补召或供给；远程猫在主人附近分散射击。
export function updateMechanical(game, dt, combat = true, sharedFollow = null) {
  const base = game.weapon(), state = game.mechanical;
  if (base.controller !== 'mechanical' || !state) return;
  const follow=sharedFollow||advanceMechanicalFormation(game,state,dt);
  const count = base.summonCount, eligible = state.nodes.slice(0,count);
  for(const node of state.nodes)node.previous={x:node.x,y:node.y};
  for(const node of eligible) {
    const weapon=mechanicalNodeWeapon(base,node.index);
    const hp=weapon.companionHp||MECHANICAL_HP;
    if(node.maxHp!==hp){node.hp=node.hp/node.maxHp*hp;node.maxHp=hp;}
    if(weapon.fixedMelee)node.gun=null;else syncMechanicalGun(game,node);
  }
  if(!base.manualSpawn)advanceDeployment(game,state,eligible,base,dt,combat);
  for(const node of state.nodes)node.active=node.index<count&&!!node.spawned;
  const live=eligible.filter(n=>n.spawned);
  // 远程与近战分组认领，不能让远程首槽把整队变成原地射击或追逐飞行目标。
  const assignments=new Map(),escorts=new Map();
  for(const node of live)if(node.ready&&node.hp>0)escorts.set(node.index,groundEscort(game,node,mechanicalNodeWeapon(base,node.index),follow));
  for(const ranged of [false,true]) {
    const group=live.filter(n=>n.ready&&!n.catchingUp&&!!n.gun===ranged&&!(n.emerge>0));
    const targets=combat?summonTargetPool(game,game.player,ranged?group[0]?.gun.weapon.range:base.range,{allowFlying:ranged,targetTrees:ranged?group[0]?.gun.weapon.targetTrees:true}):[];
    const choices=allocateGroundTargets(group,targets,(node,target)=>ranged||summonGroundReachable(game,node,target,mechanicalNodeWeapon(base,node.index).meleeReach));group.forEach((n,i)=>assignments.set(n.index,choices[i]));
  }
  for (const node of live) {
    const weapon=mechanicalNodeWeapon(base,node.index),ranged=!!node.gun;
    node.flash=Math.max(0,node.flash-dt); node.moving=false;
    if(node.hp<=0) {
      if(combat&&weapon.manualSpawn)node.deadTime=Math.max(0,node.deadTime-dt);
      continue;
    }
    // 小蛛的出舱由母体控制；小狗只由上方单槽队列部署，不能在此批量展开。
    if (weapon.manualSpawn&&(!node.ready || node.mapId!==game.player.mapId || node.arena!==game.player.arena || worldDistance(node, game.player) > weapon.range * GAMEPLAY_VALUES.mechanical.redeployRangeRatio)) {
      deployNode(game, node, count); forgetNaturalRoute(node); node.targetId = null;
      node.cooldown = Math.max(GAMEPLAY_VALUES.mechanical.redeployAttackDelay, node.cooldown);
    }
    if (!node.ready) continue;
    // 出舱沿实际地面位移展开腿部；此阶段可受击，但不会瞬间跳到敌人旁挥爪。
    if(node.emerge>0) {
      node.mode='emerge';node.targetId=null;
      if(combat){node.emerge=Math.max(0,node.emerge-dt);walkNode(game,node,node.egress,weapon.emergeSpeed||GAMEPLAY_VALUES.mechanical.emergeSpeed,dt);}
      continue;
    }
    node.swing = Math.max(0, node.swing - dt);
    if (combat) node.cooldown = Math.max(0, node.cooldown - dt);
    const target=assignments.get(node.index);
    const escort=escorts.get(node.index);
    const observing=observeLostTarget(game,node,target,dt,{urgent:escort?.urgent,disabled:!combat});
    if(target?.id!==node.targetId)node.windup=0;
    node.targetId=target?.id??null;
    const owner=nearest(game.player,node),station=weapon.guardRadius?mechanicalHome(owner,node,count,weapon,follow,!!game.vehicle?.active):naturalMechanicalHome(owner,node,count,follow,!!game.vehicle?.active,dt,live);
    const home=node.spider?spiderEscortHome(state,node,station):station;
    const followSpeed=escort?.speed||weapon.moveSpeed*GAMEPLAY_VALUES.mechanical.followSpeedRatio;
    if(observing) {
      node.mode='observe';node.windup=0;node.moving=false;
      if(ranged&&combat)updateMechanicalGun(game,node,null,dt);
      continue;
    }
    if(ranged) {
      node.mode=worldDistance(home,node)>10?'return':'ranged';
      walkNode(game,node,home,followSpeed,dt);
      if(combat)updateMechanicalGun(game,node,target,dt);
    } else if(target) {
      const t=nearest(target,node),distance=worldDistance(t,node);
      const peers=live.filter(n=>!n.gun&&assignments.get(n.index)?.id===target.id&&n.hp>0),rank=peers.indexOf(node);
      const angle=rank/peers.length*Math.PI*2+(target.id%5)*.4,reach=target.radius+weapon.meleeReach*GAMEPLAY_VALUES.mechanical.meleeStandRatio;
      const goal={x:t.x+Math.cos(angle)*reach,y:t.y+Math.sin(angle)*reach};
      if(node.swing>0)node.mode='strike';
      else if(node.cooldown<=0&&distance<=target.radius+weapon.meleeReach&&summonMeleeLineClear(game,node,target)) {
        node.mode='windup';node.windup+=dt;node.angle=Math.atan2(t.y-node.y,t.x-node.x);
        if(node.windup>=(weapon.windupTime||GAMEPLAY_VALUES.mechanical.windupSeconds)){strike(game,node,target,weapon);node.windup=0;}
      } else {
        node.mode=distance>reach+GAMEPLAY_VALUES.mechanical.chasePadding?'chase':'recover';node.windup=0;
        walkNode(game,node,summonGroundWaypoint(node,target,goal),weapon.moveSpeed,dt);
      }
    } else {
      node.windup=0;node.mode=worldDistance(home,node)>10?'return':'idle';
      walkNode(game,node,home,followSpeed,dt,node.spider?SPIDER_ARRIVAL:node.crew?CREW_ARRIVAL:null);
    }
  }
  separateNodes(game,live,dt);
  // 二十蛛可围住相邻敌人，第二次局部松弛消除首轮被后续邻居挤回的重叠。
  if(base.manualSpawn)separateNodes(game,live,dt);
  clearMechanicalVehicle(game,live,dt);
}
