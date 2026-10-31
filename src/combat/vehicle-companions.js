import {createCatCrewState,updateCatCrew} from './cat-crew.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
import { createSpiderState, updateSpider } from './spider.js';
// 车载召唤模块持有独立状态，通过局部战斗视图复用正式伙伴逻辑。
import { createMechanicalState, updateMechanical } from './mechanical.js';
import { createFunnelState, updateFunnel } from './funnel.js';
import { initializeFunnelLoadouts, equipFunnelModule } from './funnel-loadout.js';
import { effectiveWeapon, weaponDamage } from '../config/weapon-mods.js';
import { vehicleWeapon, vehicleDamage } from '../config/vehicles.js';
import { realmWeapon } from '../config/realms.js';
// 新模块只在首次创建时初始化；切换车辆不会复制其他控制器的生命和能源。
export function createVehicleCompanions(weapon, magazine) {
  if (!weapon.controller) return null;
  if(weapon.crew)return createCatCrewState();
  if (weapon.controller === 'mechanical') return createMechanicalState();
  if (weapon.controller === 'spider') return createSpiderState();
  return createFunnelState(weapon.controller === 'funnel' ? magazine : null, weapon.controller);
}
// 构造短生命周期视图，不把 Game 引用写入模块或存档，渲染可安全读取。
export function vehicleCompanionContext(game) {
  const v = game.vehicle, m = v?.module;
  if (!v?.active || !m?.companions) return null;
  const progress = game.loadout || game.progress;
  const weapon = realmWeapon(vehicleWeapon(progress, v.weaponIndex), game.realm?.buffs);
  if (!weapon?.controller) return null;
  const local = Object.create(game);
  local.statisticsVehicleIndex=game.statisticsVehicleIndex!==undefined?game.statisticsVehicleIndex:v.index;
  // 浮游炮的原生核心使用车载等级，外挂枪仍继承手持枪成长。
  const mounted = { ...progress, weapons: [...progress.weapons], weaponParts: [...progress.weaponParts] };
  mounted.weapons[v.weaponIndex] = progress.vehicleWeapons[v.weaponIndex];
  mounted.weaponParts[v.weaponIndex] = progress.turretParts[v.weaponIndex];
  Object.defineProperty(local, 'loadout', { value: mounted });
  local.progress = mounted;mounted.vehicleAmmoBonus=GAMEPLAY_VALUES.vehicle.ammoMultiplier;local.vehicleAmmoBonus=GAMEPLAY_VALUES.vehicle.ammoMultiplier;
  local.weapon = index => index === undefined || index === v.weaponIndex ? weapon : realmWeapon(effectiveWeapon(progress, index), game.realm?.buffs);
  local.damage = index => index === undefined || index === v.weaponIndex ? vehicleDamage(progress, v.weaponIndex) * (1 + (game.realm?.buffs.power || 0) * GAMEPLAY_VALUES.blessings.powerPerStack) : weaponDamage(progress, index, game.realm?.buffs.power || 0);
  local.mountedGunDamage = index => weaponDamage(progress, index, game.realm?.buffs.power || 0);
  local.magazines = [...game.magazines]; local.magazines[v.weaponIndex] = m.magazine;
  local[weapon.controller] = m.companions;
  local.hit = game.hit.bind(game); local.float = game.float.bind(game);
  return local;
}
// 首次进入战斗时为浮游炮建立模块仓，之后只推进当前车载伙伴。
export function updateVehicleCompanions(game, dt) {
  const local = vehicleCompanionContext(game);
  if (!local) return false;
  const weapon = local.weapon(), state = local[weapon.controller];
  if (weapon.controller === 'funnel' && !state.nodes[0].loadouts) initializeFunnelLoadouts(state, local.loadout);
  if(weapon.controller==='funnel')for(const node of state.nodes){const next=local.loadout.funnelLoadout[node.index];if(node.weaponIndex!==next)equipFunnelModule(local,node.index,next);}
  if(weapon.crew)updateCatCrew(local,dt);
  else if (weapon.controller === 'mechanical') updateMechanical(local, dt);
  else if(weapon.controller==='spider')updateSpider(local,dt);
  else updateFunnel(local, dt);
  game.nextId = local.nextId;
  return true;
}
