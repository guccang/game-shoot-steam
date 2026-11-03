import {applyVehicleFault} from './vehicle-faults.js';
import {takeSupplyAmmo,finiteSupply,supplyAmmoCount} from './supply-ammo.js';
import {ammoKind,vehicleFaults} from '../config/supplies.js';
import {parkAtPosition} from '../progression/roadside-parking.js';
import {personalFleet,vehicleRequiresService,vehicleService,markVehicleWreck,syncVehicleService} from '../core/vehicle-repair.js';
import {RED_WOLF_HULL} from '../config/red-wolf-geometry.js';
import {breakTreesAlong} from './boss-terrain.js';
import {statisticsSource} from './statistics-source.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
import {clampRiderSupply} from './rider-supply.js';
import { i18nText } from "../i18n/index.js";
import { turnWeapon,weaponTurnRate } from './weapon-turn.js';
import { advanceTidePair } from './tide-cannon.js';
import { tankHullPose } from '../config/tank-recoil.js';
import {isVehicleArmament} from "../config/vehicle-armaments.js";
import { createMountedWeaponState, resetMountedWeaponCharge } from './summons/weapon-state.js';
import { funnelWeapon } from '../config/funnel-loadouts.js';
import { createVehicleCompanions, updateVehicleCompanions } from './vehicle-companions.js';
// 载具是角色附加形态，每种车体独立管理耐久、炮塔供给和召唤冷却。
import {
  vehicleWeapon,
  vehicleDamage,
  vehicleMaxHp,
  ownsVehicleWeapon,
  vehicleModel,
} from '../config/vehicles.js';
import { landVehicle,landingPoint } from './vehicle-landing.js';
import { realmWeapon } from '../config/realms.js';
import { worldDistance, nearest } from '../world/coordinates.js';
import {attackTargetKnown,rememberCombatTarget} from './perception.js';
import { hitCenter } from './collision.js';
import { createRecoil, triggerRecoil, updateRecoil, RECOIL_PROFILES } from './recoil.js';
import { advancePulse } from './pulse.js';
import { advanceGrenadeCharge, launchGrenade } from './grenades.js';
import { consumeRound, advanceReload } from './magazine.js';
import { emitWeaponAttack } from './weapon-fire.js';

import { VEHICLE_COOLDOWN } from '../config/vehicles.js';
export { VEHICLE_COOLDOWN } from '../config/vehicles.js';
export const VEHICLE_GUN_SCALE = 0.75;

// 载具炮塔与角色所有权独立；专属主炮随车获得，秘境保持局内装备限制。
export function canMountVehicleWeapon(progress, index, hull = progress.vehicleIndex) {
  return Number.isInteger(index) && (progress.guardianHandWeapons || isVehicleArmament(index)) && ownsVehicleWeapon(progress, index);
}

// 每个备选炮塔模块保留独立弹夹和技能进度，首次更换空仓装填。
function createModule(weapon, full, progress) {
  const magazine = { ammo: full ? weapon.magazineSize : 0, remaining: full ? 0 : weapon.reloadTime };
  if (weapon.independentSupply) magazine.modules = Array.from({length:3},(_,slot)=>{
    const mounted=progress.funnelLoadout[slot]===12?weapon:funnelWeapon({...progress,vehicleAmmoBonus:progress.vehicleAmmoBonus||GAMEPLAY_VALUES.vehicle.ammoMultiplier},slot);
    return {ammo:full?mounted.magazineSize:0,remaining:full?0:mounted.reloadTime};
  });
  return {
    ...createMountedWeaponState(magazine),
    companions: createVehicleCompanions(weapon, magazine),
  };
}

// 按车型与当前车体结构建立独立耐久，不接收驾驶员生命参数。
export function createVehicle(progress, index = progress.vehicleIndex || 0) {
  const selected = {
    ...progress,
    vehicleIndex: index,
  };
  // 车体读取实际安装主炮，守护支架沿用临时挂载记录。
  const weaponIndex = progress.vehicleLoadouts?.[index];
  const weapon = vehicleWeapon(progress, weaponIndex ?? null);
  const module = weapon ? createModule(weapon, !progress.supplies||!!progress.temporaryGrowth||!ammoKind(weapon), progress) : null;
  const saved=progress.supplies?.vehicleMags[index];
  if(module&&ammoKind(weapon)&&!progress.temporaryGrowth&&saved?.weapon===weaponIndex)Object.assign(module.magazine,{ammo:Math.min(weapon.magazineSize,saved.ammo),remaining:saved.remaining});
  return {
    index,
    active: false,
    hp: vehicleMaxHp(selected),
    maxHp: vehicleMaxHp(selected),
    cooldown: 0,
    weaponIndex: weapon?.weaponIndex ?? null,
    module,
    modules: weapon ? { [weapon.weaponIndex]: module } : {},
    angle: 0,
    targetId: null,
    recoil: createRecoil(),
    flash: 0,
    rotor:0, rotorSpeed:0,
    wheelPhase: 0,
  };
}

// 自有车报废必须维修；活动借用车沿用局内冷却，主动下车不恢复耐久。
export function summonVehicle(game) {
  const v = game.vehicle;
  if (
    !['playing', 'paused'].includes(game.state) ||
    !(game.loadout || game.progress).vehicleHulls[v.index] ||
    v.active ||
    v.cooldown > 0
  )
    return false;
  if(vehicleRequiresService(game,v)&&(v.hp<=0||vehicleService(game,v.index)?.phase))return false;
  if (v.hp <= 0) v.hp = v.maxHp = vehicleMaxHp(game.loadout || game.progress);
  v.active = true;
  game.player.flying = !!vehicleModel(v.index).flying;
  game.player.amphibious = !!vehicleModel(v.index).amphibious;
  game.player.treePass = !!vehicleModel(v.index).treePass;
  game.onEvent('vehicle-summon', { name: vehicleModel(v.index).name, index:v.index });
  return true;
}

// 下车保留驾驶员生命与武器；特殊通行载具先找安全步行落点，避免红狼下车后卡进树干。
export function dismountVehicle(game) {
  // 地下没有地表停车点，避免下车把车辆存到同坐标的森林里。
  if(game.cottage?.kind==='mine'){game.cottage.notice='请沿矿洞坡道开回地表后下战车；地下开路请步行进入。';return false;}
  const parkedPosition={x:game.player.x,y:game.player.y};
  if (!game.vehicle.active) return false;
  if ((!game.player.arena || game.player.arena.terrain === 'forest') && (game.player.flying || game.player.amphibious || game.player.treePass) && !landVehicle(game)) return false;
  game.player.flying = false;
  game.player.amphibious = false;
  game.player.treePass = false;
  game.vehicle.active = false;
  if(game.vehicle.index===5)clampRiderSupply(game);
  game.vehicle.targetId = null;
  if(parkAtPosition(game,parkedPosition)&&worldDistance(game.player,parkedPosition)<60){const side=landingPoint({...game.player,x:parkedPosition.x+72,y:parkedPosition.y+20},game.trees);if(side)Object.assign(game.player,side);}
  game.player.vx=game.player.vy=0;
  // 下车后若仍落在车辆接近范围，须先移开，防止一秒后被自动送回车上。
  game.vehicleBoarding=null;game.vehicleBoardingBlocked={hull:game.vehicle.index,mapId:game.mapId};
  game.onEvent('vehicle-dismount',{index:game.vehicle.index});
  return true;
}

// 所有怪物与环境伤害都由 Game.hurt 汇入；溢出伤害不再次击中驾驶员。
export function absorbVehicleHit(game, amount, source=null) {
  const v = game.vehicle;
  if (!v.active) return false;
  applyVehicleFault(game,source);
  v.hp = Math.max(0, v.hp - amount);
  v.flash = 0.18;
  game.player.invincible = GAMEPLAY_VALUES.player.invincibleSeconds;
  game.float(game.player.x, game.player.y, i18nText("combat.vehicle.ade5b0a1b1", { p0: (Math.floor(amount)) }), '#ffe2a0', true);
  game.onEvent('hurt', { armored: true });
  if (!v.hp) {
    const permanent=markVehicleWreck(game,game.player);
    // 报废必须解除驾驶；特殊地形仍优先走既有安全落地流程。
    if(!dismountVehicle(game)){v.active=false;game.player.flying=false;game.player.amphibious=false;game.player.treePass=false;v.targetId=null;}
    // 残骸留在原点，驾驶员移至旁侧安全步行点，画面不会仍像坐在废车上。
    if(permanent&&worldDistance(game.player,vehicleService(game,v.index).position)<70){const side=landingPoint({...game.player,x:game.player.x+72,y:game.player.y+20},game.trees);if(side)Object.assign(game.player,side);}
    game.player.vx=game.player.vy=game.player.pushX=game.player.pushY=0;
    v.cooldown = permanent?0:VEHICLE_COOLDOWN;
    game.fx.add('ring', game.player.x, game.player.y, 0.4, { size: 65, color: '#ffda9d' });
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5;
      game.fx.add(i % 2 ? 'spark' : 'smoke', game.player.x, game.player.y, 0.6, {
        vx: Math.cos(angle) * 90,
        vy: Math.sin(angle) * 70,
        size: i % 2 ? 5 : 13,
        color: i % 2 ? '#f5c775' : '#819277',
      });
    }
    game.onEvent('vehicle-destroyed', { name: vehicleModel(v.index).name, permanent });
  }
  syncVehicleService(game);
  if(v.hp>0&&personalFleet(game))game.onEvent('vehicle-durability');
  return true;
}

// 改装清空未释放技能，不可借此补弹、回满耐久或略过冷却。
export function resetVehicleCharge(vehicle, index) {
  const module = vehicle.modules[index];
  resetMountedWeaponCharge(module);
}

// 配置校验独立炮塔所有权；收起模块保留弹药和技能，刷新只持久化选择。
export function configureVehicle(game, index, vehicleIndex = game.loadout.vehicleIndex) {
  // 永久车队必须经由原子换炮事务；这里只处理守护活动的临时挂载。
  if(!game.loadout.guardianHandWeapons)return false;
  if (!game.loadout.vehicleHulls[vehicleIndex] || !game.vehicles[vehicleIndex] || !canMountVehicleWeapon(game.loadout, index, vehicleIndex) || index === game.vehicles[vehicleIndex].weaponIndex)
    return false;
  const v = game.vehicles[vehicleIndex],
    weapon = vehicleWeapon(game.loadout, index);
  v.module = v.modules[index] ??= createModule(weapon, false, game.loadout);
  v.weaponIndex = game.loadout.vehicleLoadouts[vehicleIndex] = index;
  v.targetId = null;
  v.recoil = createRecoil();
  game.onEvent('vehicle-config');
  return true;
}

// 渲染和弹道共用炮塔的转向、抬升及后坐，避免视觉枪口与真实发射点分离。
export function vehicleGunPose(vehicle, reduced = false) {
  return {
    angle: vehicle.angle - (reduced || [18,21,23,24].includes(vehicle.weaponIndex) ? 0 : vehicle.recoil.rise * 0.3),
    kick: reduced ? ([18,21,23,24].includes(vehicle.weaponIndex)?vehicle.recoil.kick*.08:0) : vehicle.recoil.kick * 0.7,
  };
}

// 炮塔位于车体前缘，与猫猫的手持枪口各自独立。
export function vehicleMuzzle(player, vehicle, reduced = false) {
  const pose = vehicleGunPose(vehicle, reduced),
    hull = tankHullPose(vehicle,reduced),
    length = RECOIL_PROFILES[vehicle.weaponIndex].muzzle * VEHICLE_GUN_SCALE - pose.kick;
  return {
    x: player.x + hull.x + Math.cos(pose.angle) * length,
    y: player.y + hull.y + 5 + Math.sin(pose.angle) * length,
  };
}

// 怪物优先、Boss 集火；有效锁定不被更近目标抢占，循环地图按最近镜像瞄准。
function vehicleTarget(game, weapon) {
  // 运木障碍交给履带处理，炮塔不会反复锁定无法射毁的任务树。
  const valid = (t) => !t.equipmentObstacle && t.hp > 0 && attackTargetKnown(game,t) && worldDistance(t, game.player) <= weapon.range;
  if (game.boss && valid(game.boss)) return game.boss;
  const enemies = game.enemies.filter(valid),
    pool = enemies.length ? enemies : weapon.targetTrees===false||game.fireActive ? [] : game.trees.filter(valid);
  return (
    pool.find((t) => t.id === game.vehicle.targetId) ||
    pool.sort(
      (a, b) => worldDistance(a, game.player) - worldDistance(b, game.player) || a.id - b.id,
    )[0]
  );
}

// 仅由正式战斗时钟推进；步战冻结炮塔装填，冷却到零也不会自动上车。
export function updateVehicle(game, dt, holdFire = false) {
  if (game.state !== 'playing') return;
  const v = game.vehicle;
  // 临时活动载具推进局内冷却，自有车订单由维修系统处理；收起的炮塔冻结。
  for (const hull of game.vehicles || [v]) {
    hull.cooldown = Math.max(0, hull.cooldown - dt);
    if (hull.cooldown < 1e-8) hull.cooldown = 0;
    hull.flash = Math.max(0, hull.flash - dt);
  }
  if (!v.active) return;
  // 完全损坏的主炮停止装填和攻击，活动借用装备不使用永久故障。
  if (finiteSupply(game)&&vehicleFaults(game.progress,v.index).gun>=100){v.targetId=null;return;}
  const baseWeapon = realmWeapon(vehicleWeapon((game.loadout || game.progress), v.weaponIndex), game.realm?.buffs),
    w = baseWeapon && {...baseWeapon,interval:baseWeapon.interval*(1+(finiteSupply(game)?vehicleFaults(game.progress,v.index).gun:0)/100),statisticsSource:statisticsSource(game,baseWeapon,game.statisticsVehicleIndex!==undefined?game.statisticsVehicleIndex:v.index)},
    m = v.module;
  if (!w || !m) {
    v.targetId = null;
    return;
  }
  updateRecoil(v.recoil, v.weaponIndex, dt);
  const activeTime = advanceReload(m.magazine, w, dt, game.onEvent,n=>takeSupplyAmmo(game,w,n,v.index),supplyAmmoCount(game,w,v.index));
  // 候停和停稳期间停止搜索与开火，正常装填和各车修复冷却照常推进。
  if(holdFire){v.targetId=null;return;}
  if (w.controller) { updateVehicleCompanions(game, dt); return; }
  // 专属炮射击间隔与装填并行计时；不会将单发坦克炮的周期重复计算。
  m.cooldown -= isVehicleArmament(v.weaponIndex)?dt:activeTime;
  const target = vehicleTarget(game, w);
  v.targetId = target?.id ?? null;
  let aligned=false;
  if (target) {
    rememberCombatTarget(game,target);
    const point = nearest(hitCenter(target), game.player);
    aligned=turnWeapon(v,Math.atan2(point.y-game.player.y-5,point.x-game.player.x),dt,weaponTurnRate(w,true));
  }
  if(w.id==='vehicle-vulcan'){v.rotorSpeed += ((target&&m.magazine.ammo>0?38:0)-v.rotorSpeed)*Math.min(1,dt*7);v.rotor=(v.rotor+v.rotorSpeed*dt)%(Math.PI*2);}
  if(w.id==='hover-tide')advanceTidePair(game,m.magazine,dt,vehicleMuzzle(game.player,v,game.reducedMotion),{x:Math.cos(v.angle),y:Math.sin(v.angle)});
  // 转向只能等到冷却就绪，不能囤积负冷却后连续补发多枪。
  if(target&&!aligned){m.cooldown=Math.max(0,m.cooldown);return;}
  if (m.magazine.remaining > 0 || activeTime <= 0) return;
  if (w.grenade && advanceGrenadeCharge(m.cycle, w, activeTime, !!target))
    launchGrenade(
      game,
      w,
      vehicleMuzzle(game.player, v, game.reducedMotion),
      target,
      vehicleDamage((game.loadout || game.progress), v.weaponIndex) * (1 + (game.realm?.buffs.power || 0) * GAMEPLAY_VALUES.blessings.powerPerStack),
    );
  const ready = w.chargeTime ? advancePulse(m.pulse, w, activeTime, !!target) : m.cooldown <= 0;
  if (!target || !ready) {
    if (!target) m.cooldown = Math.max(0, m.cooldown);
    return;
  }
  // 只补当前步内的炮弹，不把独立炮装填期间累计的负冷却变成瞬间齐射。
  m.cooldown=Math.max(-activeTime,m.cooldown);
  for(let shot=0;shot<8&&(w.chargeTime?shot===0:m.cooldown<=1e-8);shot++){
  const muzzle = vehicleMuzzle(game.player, v, game.reducedMotion),
    point = nearest(hitCenter(target), muzzle),
    distance = Math.hypot(point.x - muzzle.x, point.y - muzzle.y) || 1;
  if (!consumeRound(m.magazine, w)) return;
  const critical = game.random() < GAMEPLAY_VALUES.combat.criticalChance;
  emitWeaponAttack(
    game,
    w.id==='chainsaw'?{...w,sawScale:VEHICLE_GUN_SCALE,sawAngle:vehicleGunPose(v,game.reducedMotion).angle}:w,
    muzzle,
    { x: (point.x - muzzle.x) / distance, y: (point.y - muzzle.y) / distance },
    Math.round(vehicleDamage((game.loadout || game.progress), v.weaponIndex) * (critical ? GAMEPLAY_VALUES.combat.criticalMultiplier : 1) * (1 + (game.realm?.buffs.power || 0) * GAMEPLAY_VALUES.blessings.powerPerStack)),
    critical,
    true,
    m.magazine,
  );
  // 潮汐炮由两根独立喷管后坐，避免整座炮架随任一喷口抖动。
  if(w.id!=='hover-tide')triggerRecoil(v.recoil, v.weaponIndex);
  if(['tank-125','wolf-256','longbranch','honeycomb'].includes(w.id))v.recoil.tankAngle=v.angle;
  m.cooldown += w.interval;
  m.cycle.firing = m.magazine.remaining === 0;
  if (!m.cycle.firing) m.cycle.charge = 0;
  if (w.chargeTime) {
    m.pulse.charge = 0;
    m.pulse.cooldown = w.cooldown;
  }
  game.onEvent('shot', { kind: w.id, laser: w.id === 'laser' });
  }
}

// 只扫实际驶过的树干；复用碎裂与再生，不调用命中奖励，也不改变只读寻路。
export function crushVehicleTrees(game, from) {
  if (!game.vehicle.active || !vehicleModel(game.vehicle.index).treePass) return;
  // 车壳宽与前后长度取正式履带尺寸，扫掠方向由实际位移决定，不受炮塔转向影响。
  breakTreesAlong(game, from, game.player, 0, {protectSettlement:false,footprint:RED_WOLF_HULL});
}
