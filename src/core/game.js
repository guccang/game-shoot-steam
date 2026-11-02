import {updateWarehouseHarvest} from './warehouse-harvest.js';
import {updateOutdoors,outdoorBusy} from './outdoors.js';
import {updateLoadWarning} from './load-warning.js';
import {updateWarehouseWood} from './warehouse.js';
import {collectAutomaticWood} from './wood-pickup.js';
import {updateVehicleBoarding} from './vehicle-boarding.js';
import {takeSupplyAmmo,syncSupplyAmmo,supplyAmmoCount} from '../combat/supply-ammo.js';
import {HERO_COMBAT_XP} from '../config/hero-experience.js';
import {movementLoadFactor} from '../progression/load-weight.js';
import {weaponPurchaseQuote} from './weapon-purchase-load.js';
import {maintainPlayerTow,advancePlayerTow} from './player-towing.js';
import {awardHeroXp} from '../progression/hero-experience.js';
import {legendaryVisible} from './legendary-workshop.js';
import {updateVehicleRepair,vehicleRequiresService,vehicleService,syncVehicleService} from "./vehicle-repair.js";
import {absorbEnergyShield} from '../combat/energy-shield.js';
import {updateFarmDelivery} from './farm-delivery.js';
import {recordMainlineVehiclePractice} from '../progression/mainline-combat.js';
import {updateMonsterCamps,canHitCampActor,settleMonsterCampKill} from './monster-camps.js';
import {awardFarmSeedDrop} from './farm-seeds.js';
import {ensureWildFarms,expireWildFarms} from './wild-farm.js';
import {farmWorking,updateFarmWork,updateFarmRain} from './farm.js';
import {createResourceDrop} from '../combat/resource-pickup.js';
import {updateRestoration} from './town-restoration.js';
import {updateGravityFields} from '../combat/gravity-field.js';
import {countCampActivity} from '../progression/camp-level.js';
import { creditResource } from '../progression/resource-wallet.js';
import {recordDefeat} from '../progression/game-statistics.js';
import {markDumplingHit} from '../combat/dumpling-motion.js';
import {updateCottage} from './cottage.js';
import {scooterCapacity} from '../config/scooter-capacity.js';
import {updateParkingVisitors,boardParkedVehicle,parkingFleetApplies,canSelectParkingVehicle,storeCarriedVehicle,adoptArrivalParking} from "./camp-parking.js";
import {updateParking} from './parking.js';
import {showDamageNumber} from '../combat/damage-numbers.js';
import {startCampDefense,updateCampDefense,campDefenseKill,rescueCampDefense} from './camp-defense.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
import {updateCampRoutines} from './camp-routines.js';
import { updateLivingWorld, acceptLivingRequest } from './living-world.js';
import {syncStoryWorld} from './story-world.js';
import {storyDeliveryReady} from './story-definition.js';
import { livingProtected, retreatLivingEnemy } from './living-safety.js';
import {bossCombatActive,updateBossEngagement} from './boss-engagement.js';
import { riderPosition } from '../config/vehicle-rider.js';
import {updateMainline,resetMainlineScene} from './mainline-manager.js';
import {arrivalPending,arrivalCinematic} from '../config/ranger-arrival.js';
import {restoreArrival,updateArrival,advanceArrival} from './ranger-arrival.js';
import { i18nText } from "../i18n/index.js";
import {readyStoryExcursion} from './story-excursion.js';
import {recordStoryEvent} from './story-journey.js';
import { turnWeapon,weaponTurnRate } from '../combat/weapon-turn.js';
import { returnStoryExcursion, chooseStoryOption, startStoryExcursion, enterStory, leaveStory, syncStory, chooseStoryLoadout, chooseStoryRoute, startStoryStage, advanceStoryDialogue, storyObjective, interactStory, failStory, hurtStoryTarget, storyKill, retryStory, claimStory, updateStory, startStoryTrial, stopStoryTrial } from './story-manager.js';
import { advanceVehicleWheels } from '../combat/vehicle-motion.js';
import { VEHICLE_WEAPONS } from '../config/vehicle-armaments.js';
import { heroHealth, forestReward } from '../config/economy.js';
import { recordEconomy } from '../progression/economy-ledger.js';
import { updateSpider, resetSpiderFormation } from '../combat/spider.js';
import {FIRE_TRANSIT_PHASES} from '../config/fire-rescue.js';
import { startFireRescue,requestFireRescue,dismissFireRescue,guideFireWater,restoreFireRescue,updateFireRescue,syncFireRescue,boardFireGarage } from './fire-rescue.js';
import {startRace,updateRace} from './forest-race.js';
import { footballEquipment } from '../config/slime-football.js';
import { chooseFootballGun, startFootball, updateFootball } from './slime-football.js';
// 装配层通过核心入口管理静态导航预热，不把异步任务带入战斗更新函数。
export { NavigationWarmup } from '../physics/terrain-navigation.js';
import { resetMechanicalGunCharge } from '../combat/mechanical-gun.js';
import { resetMechanicalFormation, updateMechanical } from '../combat/mechanical.js';
import { changeGuardianDefense, updateGuardianDefenses } from './guardian-defense.js';
import { travelMap, mapTravelReason } from './map-travel.js';
import { updateCombatTraces, updateRealmIntermissionEffects } from '../combat/transient-effects.js';
import { syncRealm } from './realm-manager.js';
import { updateCatMotion } from './cat-motion.js';
import { expeditionEquipment } from '../config/expedition.js';
import { realmWeapon } from '../config/realms.js';
import { enterRealm, leaveRealm, chooseRealmBlessing, continueRealm, rollRealmEquipment, readyRealm, updateRealm, realmKill, finishRealm, hurtGoddess } from './realm-manager.js';
// 游戏规则与画面分离，统一管理战斗、资源、成长和存档校验。
import { resetBattlefield, addTree } from './battlefield.js';
import { createRecoil, triggerRecoil, updateRecoil, muzzlePosition } from '../combat/recoil.js';
import { shotSolution } from '../combat/aim.js';
import { piercingLane, updateAimLock } from '../combat/targeting.js';
import {attackTargetDistance,attackTargetVisible,attackTargetKnown,rememberCombatTarget,updateCombatPerception} from '../combat/perception.js';
import { createPulseState, advancePulse, kickHolder, updateHolderKick } from '../combat/pulse.js';
import { consumeRound, advanceReload } from '../combat/magazine.js';
import { resetFunnelFormation, updateFunnel } from '../combat/funnel.js';
import { constrainFunnelViewport } from '../combat/funnel-movement.js';
import { updateEncounters } from './encounter-manager.js';
import { updateWaves,waveKillEligible } from './wave-manager.js';
import { spawnEnemy, updateEnemies, defeatEnemy, recycleEnemies, leaveEnemyRemnant } from './enemy-manager.js';
import { summonBoss, defeatBoss } from './boss-manager.js';
import { restorePatrol, restartPatrol } from './patrol-session.js';
import {settleDeathPenalty} from './death-penalty.js';
import { updateBossSupport, dismissBossSummons } from './boss-reinforcements.js';
import { bossImpactProfile } from '../config/boss-combat.js';
import { updateBoss, updateBossHazards } from '../combat/bosses.js';
import { WEAPONS } from '../config/weapons.js';
import { TREE_REWARD, enemyWoodReward } from '../config/rewards.js';
import { awardMaterials } from '../progression/material-loot.js';
import { clearingKillReward } from '../config/waves.js';
import { MATERIAL_KEYS } from '../config/materials.js';
import { vehicleSpeed, vehicleMaxHp } from '../config/vehicles.js';
import { effectiveWeapon, weaponDamage } from '../config/weapon-mods.js';
import { awardAttackMastery, changeWeaponMod } from '../progression/mastery.js';
import { emitWeaponAttack } from '../combat/weapon-fire.js';
import {
  createVehicle,
  crushVehicleTrees,
  updateVehicle,
  absorbVehicleHit,
  resetVehicleCharge,
  summonVehicle,
  dismountVehicle,
  configureVehicle,
} from '../combat/vehicle.js';
import { equipFunnelModule, resetFunnelModuleCharge } from '../combat/funnel-loadout.js';
import { updateBallistics } from '../combat/ballistics.js';
import { driveBody, applyImpulse } from '../physics/motion.js';
import { HEROES } from '../config/heroes.js';
import {WORLD,worldDistance} from "../world/coordinates.js";
import { clamp } from './math.js';
import { freshProgress, freshRangerProgress, validateProgress } from '../progression/progress.js';
import { vehicleModel } from '../config/vehicles.js';
import { transactVehicle } from '../progression/vehicles.js';
import { transactProgress } from '../progression/transactions.js';
import { createWeaponCycle, advanceGrenadeCharge, launchGrenade } from '../combat/grenades.js';

import {restoreTownPosition} from './town-layout.js';

export class Game {
  // 注入随机数和事件回调，便于验证关键玩法。
  constructor(progress = freshProgress(), random = Math.random, onEvent = () => {}, { deferWorld = false } = {}) {
    this.progress = validateProgress(progress);
    this.mapId = this.progress.mapId;
    this.random = random;
    this.onEvent = onEvent;
    this.state = 'ready';
    this.recoveryRun = false;
    this.worldPending = deferWorld;
    this.reset();
    if (!this.worldPending) this.restoreWorld();
  }
  // 首页只建立界面需要的轻量状态，点击进入后才生成地图并恢复现场。
  initializeWorld() {
    if (!this.worldPending) return false;
    this.worldPending = false;
    this.reset();
    this.restoreWorld();
    return true;
  }
  // 新旧入口共用恢复顺序，避免延后加载遗漏剧情、入职或特殊战斗。
  restoreWorld() {
    if(this.mapId==='forest'&&this.progress.living.position)Object.assign(this.player,this.progress.living.position);
    restorePatrol(this, this.progress.patrol);
    if (this.progress.realms.run) enterRealm(this, this.progress.realms.run.mode, this.progress.realms.run);
    else if (this.progress.story.run) enterStory(this, this.progress.story.run);
    restoreFireRescue(this);
    restoreArrival(this);
    if(this.progress.campDefense.run&&!this.story&&!this.realm)startCampDefense(this,this.progress.campDefense.run.gateId,this.progress.campDefense.run);
    restoreTownPosition(this);
  }
  // 入职流程由独立导演处理，任务进度与过场控制分别提供查询。
  get arrivalPending(){return arrivalPending(this.progress);}
  // 自动演出期间不接受驾驶及其他角色控制。
  get arrivalCinematic(){return arrivalCinematic(this.progress);}
  // 交接和施工由显式按钮触发，核心再次校验。
  advanceArrival(){return advanceArrival(this);}
  // 章节公开入口保留规则校验，界面只提交意图，不直接写任务阶段。
  enterStory(id,postId=null) { return !this.arrivalCinematic && (id?.startsWith('neighbors-')?acceptLivingRequest(this,id).ok:enterStory(this,null,id,postId)); }
  // 配置选项与正式秘境委托共用章节事务入口。
  chooseStoryOption(id) { return chooseStoryOption(this,id); }
  // 暂离章节再进入秘境，两个会话不会同时活动。
  startStoryExcursion() { return startStoryExcursion(this); }
  // 暂离时保留章节检查点，恢复原森林现场。
  leaveStory() { return leaveStory(this); }
  // 提交整套借用装备选择。
  chooseStoryLoadout(id) { return chooseStoryLoadout(this,id); }
  // 提交一次性的巡护路线选择。
  chooseStoryRoute(id) { return chooseStoryRoute(this,id); }
  // 确认安全整备并开始下一个战斗阶段。
  startStoryStage() { return startStoryStage(this); }
  // 阅读或跳过台词使用同一迁移规则。
  advanceStoryDialogue(skip=false) { return advanceStoryDialogue(this,skip); }
  // 共享当前目标供交互、地图和画面读取。
  storyObjective() { return storyObjective(this); }
  // 就近启动可中断的调查读条。
  interactStory() { return interactStory(this); }
  // 统一入口结算中继站的单次受击。
  hurtStoryTarget(amount) { return hurtStoryTarget(this,amount); }
  // 从失败阶段的检查点重试。
  retryStory() { return retryStory(this); }
  // 奖励写入成功后才完成章节。
  claimStory() { return claimStory(this); }
  // 提交当前任务的可序列化快照。
  syncStory() { syncStory(this); }
  // 训练的开始与结束仍受章节准备状态校验。
  startStoryTrial(scene) { return startStoryTrial(this,scene); }
  // 结束训练并恢复准备草稿与正式供给。
  stopStoryTrial() { return stopStoryTrial(this); }
  // 重建战场，可接收死亡续游统计；仅显式清档和首次进入使用默认初始值。
  reset(continuation = null) {
    // 只清空本次死亡收据，永久金币已在死亡结算时扣除。
    this.deathPenaltyCoins=null;
    // 观察记录只属于当前战场，不写进存档或继承到重开后的同编号怪物。
    this.combatSight=new WeakMap();
    this.farmWork=null;this.farmVehicleReturn=null;this.farmSignals=[];this.farmDragging=false;this.farmCursor=null;this.farmDeliveryCheck=0;
    // 结算续接资格仅属于当前现场，重置后旧收据失效。
    this.campDefense=null;
    this.warehouseAutoWood=null;this.warehouseAutoHarvest=null;
    this.fishing=null;this.campSleep=null;this.outdoorNotice='';this.loadWarning=null;this.vehicleBoarding=null;this.vehicleBoardingBlocked=null;this.parking=null;this.cottage=null;this.cottageEntry=null;this.cottageEntryKind=null;this.cottageDoorLatch=false;this.parkingVisitors=[];this.parkingVisitorHistory=[];this.parkingVisitTimer=8;
    resetMainlineScene(this);
    this.fireRescue=null;this.fireClock=GAMEPLAY_VALUES.fire.initialDispatchDelay;
    resetBattlefield(this, continuation);
  }
  // 面板与逻辑共用切换限制，不依赖按钮禁用来保护战斗状态。
  get mapTravelReason() { return mapTravelReason(this); }
  // 切换地貌后由事件适配器立即保存当前地图和巡游进度。
  switchMap(id) { return !this.arrivalCinematic && travelMap(this, id); }
  // 清空永久成长并重建战场，回到首次开始界面，不沿用死亡后的保留进度规则。
  resetProgress() {
    this.livingActors=null;this.livingBattle=null;this.campActors=null;this.campRoutine=null;
    this.story = null;
    this.storyForest = null;
    this.realm = null;
    this.forestState = null;
    this.forestPatrol = null;
    this.progress = freshRangerProgress();
    this.mapId = 'forest';
    this.mapVisits = {};
    this.recoveryRun = false;
    this.reset();
    this.state = 'ready';
    if (!this.worldPending) restoreArrival(this);
    if(this.progress.campDefense.run&&!this.story&&!this.realm)startCampDefense(this,this.progress.campDefense.run.gateId,this.progress.campDefense.run);
  }
  // 守护布防与高塔层间允许移动，战斗、弹药、修复和刷怪时钟仍保持冻结。
  get canExploreRealm() {
    return this.state === 'realm' && ((this.realm?.mode === 'guardian' && ['build', 'rest'].includes(this.realm.phase)) || (this.realm?.mode === 'tower' && this.realm.phase === 'rest'));
  }
  // 添加一棵可破坏且会缓慢再生的树。
  addTree(x, y, details = {}) {
    addTree(this, x, y, details);
  }
  // 视口用于浮游炮安全范围和怪潮外围选点，暂停缩屏也立即收回越界炮体。
  setViewport(width, height) {
    this.viewport = { width, height };
    constrainFunnelViewport(this.funnel, this.viewport);
  }
  // 当前角色最大生命随等级成长。
  maxHp() {
    const p=this.story?this.loadout:this.progress;
    return heroHealth(HEROES[p.hero].hp,p.heroes[p.hero],p) + (this.realm?.buffs.vitality || 0) * GAMEPLAY_VALUES.blessings.vitalityPerStack;
  }
  // 消防接警沿用公共会话入口。
  startFireRescue() { return !this.arrivalCinematic && startFireRescue(this); }
  // 活动消防是森林事件，不能被当作秘境或剧情会话。
  get fireActive() { return this.fireTransit||['active','returning'].includes(this.fireRescue?.phase); }
  // 自动步行、上下车和低速入库期间锁定输入，不跳过原身体及车轮动作。
  get fireTransit() { return FIRE_TRANSIT_PHASES.includes(this.fireRescue?.phase); }
  // 未驾驶的任务车与永久停驻车走同一个世界实体绘制入口。
  get fireStationTruck() { return ['transferring','approaching','boarding','exiting'].includes(this.fireRescue?.phase)?this.fireRescue.loan:this.fireGarageParked?this.vehicles[4]:null; }
  // 主动接取、拒绝/撤退、补水指引与保存都由核心校验。
  requestFireRescue() { return !this.arrivalCinematic && requestFireRescue(this); }
  // 取消后仍停留在当前位置，归还未永久获得的车辆。
  dismissFireRescue() { return dismissFireRescue(this); }
  // 切换目的地而不移动玩家。
  guideFireWater() { return guideFireWater(this); }
  // 与巡游进度在一次存储事务中保存。
  syncFireRescue() { syncFireRescue(this); }
  // 战斗、正式绘制器与 HUD 共用局内装备；保存仍只读取永久 progress。
  get loadout() {
    if(this.story?.equipment)return this.story.equipment;
    const r = this.realm;
    if(this.fireActive)return this.fireRescue.equipment;
    if(r?.mode==='football'){if(!r.equipment)r.equipment=footballEquipment(this.progress,r.gun??3);return r.equipment;}
    if (!r?.loadout) return this.progress;
    const key = `${r.stage}:${r.loadout.weapon}:${r.loadout.vehicle}:${r.loadout.turret}`;
    if (r.equipmentKey !== key) {
      r.equipment = expeditionEquipment(this.progress, r.loadout, r.stage);
      r.equipmentKey = key;
    }
    return r.equipment;
  }
  // 统一读取装备、熟练度与互斥改装后的有效参数。
  weapon(index = this.loadout.weapon) {
    return scooterCapacity(realmWeapon(effectiveWeapon(this.loadout, index), this.realm?.buffs),this);
  }
  // 改装不补弹，清空当前武器蓄能，防止切分支绕过充能和装填限制。
  modifyWeapon(index, choice) {
    if(this.cottage?.kind!=='weapons')return false;
    if (this.arrivalCinematic || this.realm || this.story || this.fireActive) return false;
    if (!changeWeaponMod(this.progress, index, choice)) return false;
    resetFunnelModuleCharge(this.funnel, index);
    resetMechanicalGunCharge(this.mechanical,index);
    resetMechanicalGunCharge(this.spider,index);
    for(const vehicle of this.vehicles)for(const module of Object.values(vehicle.modules)) {
      if(module.companions?.nodes[0]?.loadouts)resetFunnelModuleCharge(module.companions,index);
      resetMechanicalGunCharge(module.companions,index);
    }
    for (const vehicle of this.vehicles) resetVehicleCharge(vehicle, index);
    if (index === this.progress.weapon) {
      this.pulse = createPulseState();
      this.weaponCycle = createWeaponCycle();
      this.aimLock = null;
      this.attackTimer = this.weapon().interval;
      updateAimLock(this);
    }
    this.onEvent('purchase', { name: WEAPONS[index].name, action: 'modify' });
    return true;
  }
  // 当前武器与角色等级共同影响伤害。
  damage(index = this.loadout.weapon) {
    return Math.round(weaponDamage(this.loadout, index, this.realm?.buffs.power || 0)*(this.loadout.storyDamage??1));
  }
  // 独立模块变更由战斗层校验，只修改一个炮的配置并触发保存。
  configureFunnel(slot, index) {
    if (this.arrivalCinematic || this.realm || this.story || this.fireActive) return false;
    if (!equipFunnelModule(this, slot, index)) return false;
    this.onEvent('funnel-config', { slot, index });
    return true;
  }
  // 消防站保留唯一停驻车，接警出发或靠近车库快捷上车时才取出。
  get fireGarageParked() { return !!this.progress.fireDispatch.garage?.parked&&!this.realm&&!this.story; }
  // 载具入口统一转交独立控制器，不改变主武器和角色坐标。
  summonVehicle() {
    if(vehicleRequiresService(this)&&(this.vehicle.hp<=0||vehicleService(this,this.vehicle.index)?.phase)){this.onEvent('story-hint',{text:this.vehicle.hp<=0?'载具已损坏，需要维修。请用手机呼叫救援，或前往维修中心。':'载具在维修中心，请现场取车。'});return false;}
    if(this.cottage)return false;
    if(this.vehicle.index===4&&this.fireGarageParked)return boardFireGarage(this);
    // 跳过开场后的首个输入也先接管北广场赠车，不能趁下一帧到来前远程召走。
    adoptArrivalParking(this);
    if(parkingFleetApplies(this)&&this.progress.campParking.owned.some(s=>s.hull===this.vehicle.index))return boardParkedVehicle(this,this.vehicle.index);
    if(this.arrivalCinematic||this.fireTransit||['football','race'].includes(this.realm?.mode))return false;
    const summoned=summonVehicle(this);
    if(summoned&&this.vehicle.index===5&&this.progress.arrival){this.progress.arrival.parked=false;this.onEvent('vehicle-config');}
    return summoned;
  }
  // 主动下车保存载具耐久和弹药，不能反复上下车免费维修。
  dismountVehicle() {
    if(this.arrivalCinematic||this.fireTransit)return false;
    return dismountVehicle(this);
  }
  // 载具挂载校验与独立供给由战斗模块管理。
  configureVehicle(index) {
    if(this.story||this.fireActive)return false;
    if(['football','race'].includes(this.realm?.mode))return false;
    if (this.realm && this.realm.phase !== 'combat') return false;
    return configureVehicle(this, index);
  }
  // 升级按原耐久比例提升上限，不修复损毁、不补弹、不改变冷却。
  upgradeVehicle() {
    if (this.arrivalCinematic || this.realm || this.story || this.fireActive) return false;
    const ratio = this.vehicle.maxHp ? this.vehicle.hp / this.vehicle.maxHp : 0;
    if (!transactVehicle(this.progress, 'vehicle', this.progress.vehicleIndex, 'upgrade'))
      return false;
    this.vehicle.maxHp = vehicleMaxHp(this.progress,this.maxHp());
    this.vehicle.hp = Math.min(this.vehicle.maxHp, this.vehicle.maxHp * ratio);
    this.onEvent('purchase', { name: vehicleModel(this.vehicle.index).name, action: 'upgrade' });
    return true;
  }
  // 购买车体不自动驾驶，首次拥有按车型独立基础 HP 与车体等级建立耐久。
  buyVehicle(index) {
    if (this.arrivalCinematic || this.realm || this.story || this.fireActive) return false;
    if (!transactVehicle(this.progress, 'vehicle', index, 'buy')) return false;
    this.vehicles[index] = createVehicle(this.progress, index);
    this.onEvent('purchase', { name: vehicleModel(index).name, action: 'buy' });
    return true;
  }
  // 切换先安全下车，各型号保留耐久、弹药和修复倒计时，之后由玩家手动召唤。
  selectVehicle(index) {
    if(this.story||this.fireActive)return false;
    if(['football','race'].includes(this.realm?.mode))return false;
    if (this.realm && this.realm.phase !== 'combat') return false;
    if (
      !Number.isInteger(index) ||
      !this.loadout.vehicleHulls[index] ||
      index === this.loadout.vehicleIndex
    )
      return false;
    if(parkingFleetApplies(this)&&(!canSelectParkingVehicle(this,index)||!storeCarriedVehicle(this)))return false;
    if (this.vehicle.active && !this.dismountVehicle()) return false;
    syncVehicleService(this);
    this.loadout.vehicleIndex = index;
    this.vehicle = this.vehicles[index];
    this.onEvent('vehicle-config');
    return true;
  }
  // 炮塔独立交易；随车主炮只升级，旧炮塔记录不授予角色武器。
  transactTurret(index, action) {
    if(action==='upgrade'&&this.cottage?.kind!=='vehicle')return false;
    if (action === 'equip') return this.configureVehicle(index);
    if (this.arrivalCinematic || this.realm || this.story || this.fireActive) return false;
    if (!transactVehicle(this.progress, 'turret', index, action)) return false;
    this.onEvent('purchase', { name: i18nText("core.game.45add05d74", { p0: (VEHICLE_WEAPONS[index].name) }), action });
    return true;
  }
  // 开始或重新开始巡游。
  start() {
    if(this.story){if(this.story.phase==='active'||storyDeliveryReady(this))this.state='playing';return;}
    if (this.realm?.phase === 'rest') {
      this.state = 'realm';
      this.onEvent('start');
      return;
    }
    if (this.realm && this.realm.phase !== 'combat') return;
    const deathPenalty=this.state === 'dead'?restartPatrol(this):null;
    this.state = 'playing';
    this.onEvent('start',deathPenalty?{deathPenalty}:undefined);
  }
  // 只在巡游和暂停状态之间切换。
  pause() {
    if(this.story&&this.story.phase!=='active'&&!storyDeliveryReady(this))return;
    if (this.realm?.phase === 'rest') {
      this.state = this.state === 'paused' ? 'realm' : 'paused';
      return;
    }
    if (this.realm && this.realm.phase !== 'combat') return;
    if (this.state === 'playing') this.state = 'paused';
    else if (this.state === 'paused') this.state = 'playing';
  }
  // 购买、装备、升级共用事务入口，余额不足时不修改状态。
  transact(kind, index, action) {
    if(action==='upgrade'&&this.cottage?.kind!==(kind==='weapons'?'weapons':'vehicle'))return false;
    if (this.arrivalCinematic || this.realm || this.story || this.fireActive) return false;
    // 非工坊入口同样先校验购枪后的负重，拒绝时不扣资源、不改变装备。
    if(kind==='weapons'&&action==='buy'&&Number.isInteger(index)&&WEAPONS[index]&&!this.progress.weapons[index]){
      const next={...this.progress,weapons:this.progress.weapons.slice(),weapon:index};
      next.weapons[index]=1;
      if(!weaponPurchaseQuote(this,{kind,index,action},{ok:true,next}).ok)return false;
    }
    const oldWeapon = this.progress.weapon;
    if (!transactProgress(this.progress, kind, index, action)) return false;
    if (oldWeapon !== this.progress.weapon) {
      resetFunnelFormation(this.funnel);
      resetFunnelFormation(this.drone);
      resetMechanicalFormation(this.mechanical);
      resetSpiderFormation(this.spider);
    }
    if (action === 'buy' || action === 'equip') {
      this.player.recoil = createRecoil();
      this.weaponCycle = createWeaponCycle();
      this.pulse = createPulseState();
      this.aimLock = null;
      updateAimLock(this, 0);
    }
    // 换猫、升级和购买不赠送生命，最大生命下降时只裁剪溢出。
    this.player.hp = clamp(this.player.hp, 0, this.maxHp());
    // 换人只同步固定天赋差异；角色升级不提高车体 HP，受损比例与冷却保持不变。
    if(kind==='heroes')for(const hull of this.vehicles){
      const ratio=hull.maxHp?hull.hp/hull.maxHp:0;
      const selected={...this.progress,vehicleIndex:hull.index};
      const maxHp=vehicleMaxHp(selected);
      if(hull.maxHp!==maxHp){hull.maxHp=maxHp;hull.hp=Math.min(maxHp,maxHp*ratio);}
    }
    const list = kind === 'heroes' ? HEROES : WEAPONS;
    this.onEvent('purchase', { name: list[index].name, action });
    return true;
  }
  // 兼容原有出生入口，完整怪物生命周期由怪物管理模块维护。
  spawnEnemy(angle, radius, arrival = null, context = null) {
    return spawnEnemy(this, angle, radius, arrival, context);
  }
  // 波次推进与配额统一委托波次管理，Boss 战时保持冻结。
  updateWaves(dt) {
    if(this.arrivalCinematic||this.story||this.fireActive)return;
    if (this.realm) updateRealm(this, dt);
    else updateWaves(this, dt);
  }
  // Boss 挑战保存独立强度，重开普通波次不影响重试数值。
  summonBoss() {
    if (this.arrivalCinematic || this.realm || this.story || this.fireActive) return false;
    return summonBoss(this);
  }
  // 秘境入口、离开、祝福及层间推进统一由独立会话模块校验。
  enterRealm(mode) { if(this.arrivalCinematic)return false; return mode==='fire'?requestFireRescue(this):enterRealm(this, mode); }
  // 领主技能通过游戏接口伤害祭坛，战斗模块不反向依赖秘境管理器。
  hurtGoddess(amount) { hurtGoddess(this, amount); }
  // 返回被冻结的森林现场，保留本局已结算材料。
  leaveRealm() {
    const mode=this.realm?.mode;
    if(!leaveRealm(this))return false;
    // 装配层在秘境归还森林后恢复交付，避免故事与秘境执行器相互导入。
    returnStoryExcursion(this,mode);return true;
  }
  // 只接受本次实际提供的祝福，重复点击无效。
  chooseRealmBlessing(key) { return chooseRealmBlessing(this, key); }
  // 补给点击立即落盘，重复领取与跳过装备均由规则层拒绝。
  rollRealmEquipment(kind) { return rollRealmEquipment(this, kind); }
  // 三槽齐备后才允许进入开局祝福。
  readyRealm() { return readyRealm(this); }
  // 运动场选枪只影响本局；公开入口负责检查点与保存事件。
  chooseFootballGun(index) {if(!chooseFootballGun(this,index))return false;syncRealm(this);this.onEvent('realm-change');return true;}
  // 运动会从准备页统一开赛，保存起点并释放弹窗暂停归属。
  startRace() {if(!startRace(this))return false;syncRealm(this);this.onEvent('realm-change');return true;}
  // 两秒开球预告后开始正式计时，重复开赛不会重置分数。
  startFootball() {if(!startFootball(this))return false;syncRealm(this);this.onEvent('realm-change');return true;}
  // 爬塔倒计时与手动继续共用下一层入口。
  continueRealm() { return continueRealm(this); }
  // 战中币与部署一起留在运行时，过波再结算；刷新整体回退波前，避免重复赚取击杀币。
  guardianDefense(action, slot, kind, index, weaponIndex = index) {
    if (!changeGuardianDefense(this, action, slot, kind, index, weaponIndex)) return false;
    if (this.realm.phase !== 'combat') syncRealm(this);
    this.onEvent('realm-defense');
    return true;
  }
  // 生成飘字，限制数量以避免长时间游玩堆积。
  float(x, y, text, color = '#fff8df', big = false, resources = null) {
    this.numbers.push({
      x: x + (this.random() - 0.5) * 15,
      y: y - 28,
      text,
      color,
      life: 0.95,
      big,
      ...(resources ? { resources } : {}),
    });
    if (this.numbers.length > 65) this.numbers.shift();
  }
  // 生成击中与破坏的碎屑反馈。
  burst(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      const a = this.random() * Math.PI * 2,
        speed = 30 + this.random() * 100;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 25,
        life: 0.4 + this.random() * 0.4,
        color,
        size: 2 + this.random() * 4,
      });
    }
  }
  // 战斗底层通过实例提交只读体验事件，不反向导入章节状态机。
  recordStoryEvent(event,detail){recordStoryEvent(this,event,detail);}
  // 结算攻击与死亡，体验事件不改变伤害结果。
  hit(target, amount, critical = false, impact = null) {
    if (target.hp <= 0) return;
    // 邻里运木的障碍树必须由履带碾压，流弹不能替代驾驶目标。
    if(target.equipmentObstacle)return;
    // 具名居民永不受伤；追兵在圈外仍参与战斗，返营与预警居民不被流弹击中。
    if(target.campNpc||target.type==='monster-camp-npc'||target.monsterCamp&&!canHitCampActor(this,target))return;
    rememberCombatTarget(this,target);
    // 章节统计记录正式元素命中，试射反馈也来自同一命中链。
    if(this.story&&target.type!=='tree'){
      if(impact?.weaponIndex===10)this.story.metrics.arcHits=(this.story.metrics.arcHits||0)+1;
      if(impact?.weaponIndex===10&&target.wet>0)this.story.metrics.synergy++;
      if(impact?.chillDuration)this.story.metrics.frost++;
      if(this.story.trial)this.story.trial.hits++;
      if(impact?.weaponIndex===18&&target.chill>0){
        this.story.metrics.frostRelay=(this.story.metrics.frostRelay||0)+1;
      }
      recordStoryEvent(this,'impact',{weaponIndex:impact?.weaponIndex,wet:target.wet>0,chill:target.chill>0});
    }
    if(target.type==='tree'&&(['football','race'].includes(this.realm?.mode)||target.fireRescue||this.campDefense))return;
    // 比赛只接受正式冲量，生命恒定，禁止死亡奖励及高伤害刷分。
    if(!target.football)target.hp -= amount;
    // 击退碰撞沿用发起攻击的快照，不把切枪后的武器误记为来源。
    if(amount>0&&impact?.impulse>0)target.statisticsSource=impact.statisticsSource;
    target.flash = 0.13;
    markDumplingHit(target);
    const direction = impact?.direction || {
      x: Math.cos(this.player.angle),
      y: Math.sin(this.player.angle),
    };
    target.hitX = direction.x;
    target.hitY = direction.y;
    // 致命命中的方向随残影复制，力度只控制死亡表现，不再读取玩家之后的朝向。
    if(target.hp<=0)target.deathPower=Math.max(1,Math.min(3,impact?.power||1));
    const hitKind = impact?.kind ?? WEAPONS[impact?.weaponIndex]?.id;
    // 命中提示读取发射时的来源快照，伙伴集火不叠加主武器反馈。
    if(impact?.audioSource==='primary')this.onEvent('weapon-hit',{kind:hitKind});
    // 重击只强化领主局部反馈；保留实际弹丸来源，不使用当前手持枪推断。
    const bossImpact = target.type === 'boss' ? bossImpactProfile(hitKind) : null;
    if (bossImpact?.pose) {
      target.heavyHit = bossImpact.flash;
      target.heavyKind = hitKind;
      target.heavyHitX = direction.x; target.heavyHitY = direction.y;
      target.flash = Math.max(target.flash, bossImpact.flash);
      if (!(target.heavyFxCooldown > 0)) {
        this.fx.bossImpact(target, direction, hitKind, impact);
        target.heavyFxCooldown = 0.09;
      }
    }
    if (target.type === 'tree') target.sway = 0.7;
    else {
      const finishing = target.hp <= 0 && impact?.power > 1;
      applyImpulse(
        target,
        direction,
        (impact?.impulse ?? GAMEPLAY_VALUES.combat.defaultImpulse) * (finishing ? GAMEPLAY_VALUES.combat.finishingImpulse : 1),
        // 武器分别限制连续推力，领主继续受自身质量与抗击退规则约束。
        impact?.pushLimit ?? (impact?.kind==='hover-tide'?GAMEPLAY_VALUES.combat.tidePushLimit:impact?.power > 2 ? GAMEPLAY_VALUES.combat.heavyPushLimit : GAMEPLAY_VALUES.combat.normalPushLimit),
        bossImpact,
        impact?.groundedPush === true,
      );
      // 重型弹致命一击保留实体动量，并按质量增加腾空高度，随后由重力和碰撞接管。
      if (finishing && target.type !== 'boss')
        target.vz = Math.max(
          target.vz || 0,
          (impact.power > 2 ? GAMEPLAY_VALUES.combat.heavyFinishingLift : GAMEPLAY_VALUES.combat.finishingLift) / Math.sqrt(target.mass || 1),
        );
      if (impact?.water) target.wet = GAMEPLAY_VALUES.combat.wetSeconds;
      if (impact?.chillDuration) {
        target.chill = Math.max(target.chill || 0, impact.chillDuration);
        target.chillFactor = Math.min(
          target.chillFactor || 1,
          target.type === 'boss' ? GAMEPLAY_VALUES.combat.bossChillFactor : impact.chillFactor,
        );
      }
    }
    this.fx.impact(
      { target, x: impact?.x ?? target.x, y: impact?.y ?? target.y - 8 },
      direction,
      critical,
      impact?.laser || false,
      target.hp <= 0,
      impact?.water || false,
      impact?.power || 1,
      hitKind,
    );
    if(!target.football)showDamageNumber(this,target,amount,critical,impact?.damageGroup);
    if (target.hp > 0) return;
    // 工坊靶标保留正式致命命中特效与死亡回收，但不结算奖励、熟练度或击杀进度。
    if (target.workshopTarget) return;
    // 新召唤物不提前完成剧情／秘境／守门击杀条件，也不额外发放活动奖励。
    if(target.type==='boss')dismissBossSummons(this,target.id);
    if(target.bossSummon&&(this.story||this.realm||this.campDefense)){leaveEnemyRemnant(this,target,impact);return;}
    if(!this.workshopTrial&&!this.livingPreview&&!target.football)recordDefeat(this.progress,target.type,impact?.statisticsSource);
    // 走过死亡保护后只发一次经验；试射、预览、伐木与召唤杂兵不计入角色成长。
    if(!this.workshopTrial&&!this.livingPreview&&!target.football&&!target.bossSummon&&['enemy','boss'].includes(target.type)){const earned=awardHeroXp(this.progress,target.type==='boss'?HERO_COMBAT_XP.boss:target.tough?HERO_COMBAT_XP.tough:HERO_COMBAT_XP.enemy);if(earned.gained){this.float(target.x,target.y-75,earned.levels?`${HEROES[earned.index].name}升到${earned.level}级`:`经验 +${earned.gained}`,'#e8d69b');this.onEvent('hero-experience',earned);}}
    recordMainlineVehiclePractice(this,target,impact);
    if(campDefenseKill(this,target))return;
    if(this.story){storyKill(this,target);return;}
    // 秘境击杀只推进当前关卡，资源在清关后统一入账。
    if (this.realm) {
      if (target.type === 'tree') { this.leaveStump(target); return; }
      realmKill(this, target);
      this.remnants.push({ ...target, flash: 0, life: 0.6, duration: 0.6, burst: true, burstDelay: 0, reactionTime: 0 });
      if (this.remnants.length > 20) this.remnants.shift();
      return;
    }
    // 火苗怪仅记入救援，不推进波次或重复发放采集奖励。
    if(target.fireEvent){if(this.fireRescue)this.fireRescue.kills++;this.remnants.push({...target,flash:0,life:.6,duration:.6,burst:true,burstDelay:0,reactionTime:0});if(this.remnants.length>20)this.remnants.shift();return;}
    // 邻里护路按委托结算报酬，任务怪保留正式死亡动作但不另发资源。
    if(target.livingRequest){defeatEnemy(this,target,impact);this.onEvent('living-kill');return;}
    // 营地仅在整轮清空时发固定种子，不占清缴配额、不刷单怪奖励。
    if(target.monsterCamp){defeatEnemy(this,target,impact);settleMonsterCampKill(this,target);this.onEvent('monster-camp-kill');return;}
    // 新材料在击杀保护之后结算，穿透、范围伤害和多炮集火均不会重复奖励。
    // 计入本波的普通怪分摊固定预算；先取序号再递增，混合击杀也不损失整波奖励。
    const waveReward=waveKillEligible(this,target);
    const rewardIndex=this.waveKills,share=waveReward?clearingKillReward(this.wave,rewardIndex,this.progress):null;
    const materials = awardMaterials(this.progress, target, this.random,share?share.attempts:1);
    const seed=awardFarmSeedDrop(this,target);
    if(seed&&(seed.count||seed.unlocked))this.float(target.x,target.y-65,seed.message,'#e2f3ce');
    if (MATERIAL_KEYS.some(key => materials[key]))
      this.float(target.x, target.y - 40, '', '#e2f3ce', false, materials);
    awardAttackMastery(this.progress, impact, target.type);
    let coins = 0,
      wood = 0;
    if (target.type === 'tree') {
      countCampActivity(this.progress,'trees');
      this.chopped++;
      coins = TREE_REWARD.coins;
      wood = TREE_REWARD.wood;
      this.leaveStump(target);
    } else if (target.type === 'enemy') {
      if(!waveReward&&!target.wave&&!target.bossOwner&&!this.progress.living.patrolActive)countCampActivity(this.progress,'enemies');
      coins = defeatEnemy(this, target, impact);
      wood = enemyWoodReward(coins);
    } else {
      defeatBoss(this);
    }
    ({coins,wood}=forestReward(target.type,coins,this.progress));
    if(share){coins=share.coins;wood=share.wood;}
    // 金币照常入账；木材仅在整笔装得下时直接入包，满载不生成地面物品。
    coins=creditResource(this.progress,'coins',coins);
    collectAutomaticWood(this,target,wood,impact);
    recordEconomy(this.progress,'income','forest:'+target.type,{coins,...materials});
    if(coins)this.drops.push(createResourceDrop(target,coins,0));
    this.onEvent('reward');
  }
  // 玩家采集与领主毁树共用树桩和再生规则，资源奖励由各自调用方决定。
  leaveStump(tree) {
    this.stumps.push({
      x: tree.x,
      y: tree.y,
      life: GAMEPLAY_VALUES.forest.treeRegrowSeconds,
      variant: tree.variant,
      palette: tree.palette,
      size: tree.size,
    });
  }
  // 只读射线同时供预览、能力和开火使用，避免目标已变化而仍沿用旧方向。
  findAttackLane() {
    return piercingLane(this);
  }
  // 自动优先攻击怪物，其次采集范围内树木。
  findAttackTarget() {
    // 安宁道路保护玩家免受威胁，但不关闭对道路两侧敌人的正常寻敌与攻击。
    const weapon = this.weapon();
    if(weapon.attackKind==='defense')return null;
    if (weapon.aimAssist) return this.findAttackLane()?.target || null;
    let target = null, closest = Infinity;
    // 单次扫描保留原稳定排序的同距优先级，只对可能胜出的射程内目标检查视野。
    for (const enemy of this.boss ? [...this.enemies, this.boss] : this.enemies) {
      if (!(enemy.hp > 0)) continue;
      const distance = attackTargetDistance(this, enemy, Math.min(closest, weapon.range + enemy.radius));
      if (distance < closest && distance < weapon.range + enemy.radius && attackTargetKnown(this, enemy)) {
        target = enemy; closest = distance;
      }
    }
    if (target || weapon.targetTrees === false || this.fireActive || ['football', 'race'].includes(this.realm?.mode)) return target;
    for (const tree of this.trees) {
      if (!(tree.hp > 0)) continue;
      const distance = attackTargetDistance(this, tree, Math.min(closest, weapon.range));
      if (distance < closest && distance < weapon.range && attackTargetVisible(this, tree)) {
        target = tree; closest = distance;
      }
    }
    return target;
  }
  // 有效普通攻击启动榴弹计时，自动瞄准与其他武器共用目标选择。
  attack() {
    if(this.arrivalCinematic||this.parking?.idle||farmWorking(this)||outdoorBusy(this))return false;
    const weapon = this.weapon();
    // 浮游炮仅由独立调度器开火，手持射击入口不能额外发射或绕过冷却。
    if (weapon.controller || weapon.attackKind==='defense') return false;
    const magazine = this.magazines[this.loadout.weapon];
    if (magazine.remaining > 0 || magazine.ammo <= 0) return false;
    updateAimLock(this, 0);
    if (
      weapon.chargeTime &&
      (this.pulse.cooldown > 0 || this.pulse.charge < weapon.chargeTime - 1e-8)
    )
      return false;
    const target = this.findAttackTarget();
    if (!target) return false;
    const { angle, muzzle, direction } = shotSolution(
      riderPosition(this.player, this.vehicle),
      target,
      this.loadout.weapon,
      this.aimLock,
    );
    if(!turnWeapon(this.player,angle,0,weaponTurnRate(weapon)))return false;
    rememberCombatTarget(this,target);
    this.player.flash = 0.09;
    this.player.aimHold = weapon.interval + GAMEPLAY_VALUES.player.aimHoldSeconds;
    const critical = this.random() < GAMEPLAY_VALUES.combat.criticalChance,
      amount = Math.round(this.damage() * (critical ? GAMEPLAY_VALUES.combat.criticalMultiplier : 1));
    const laser = this.loadout.weapon === 1;
    // 子弹先离开当前枪口，再产生后坐冲量；弹道保留发射瞬间的位置。
    triggerRecoil(this.player.recoil, this.loadout.weapon);
    consumeRound(magazine, weapon);
    emitWeaponAttack(this, weapon, muzzle, direction, amount, critical, false, magazine);
    if (weapon.chargeTime) {
      this.pulse.charge = 0;
      this.pulse.cooldown = weapon.cooldown;
      kickHolder(this.player, direction, weapon.selfImpulse);
    }
    this.weaponCycle.firing = magazine.remaining === 0;
    if (magazine.remaining > 0) this.weaponCycle.charge = 0;
    this.onEvent('shot', { laser, kind: weapon.id });
    return true;
  }
  // 连续交火满三秒独立发射榴弹，不替换普通攻击，也不依赖普通射速整除计时。
  updateWeaponAbility(dt) {
    const weapon = this.weapon();
    if(weapon.controller)return;
    if (this.magazines[this.loadout.weapon].remaining > 0) return;
    if (weapon.chargeTime) {
      if (advancePulse(this.pulse, weapon, dt, !!this.findAttackTarget())) this.attack();
      return;
    }
    if (!weapon.grenade) return;
    const target = this.findAttackTarget();
    // 转向期间保留已积累的榴弹进度，不能先扣除一次蓄力再丢弃发射。
    if(target&&!turnWeapon(this.player,shotSolution(riderPosition(this.player, this.vehicle),target,this.loadout.weapon,this.aimLock).angle,0,weaponTurnRate(weapon)))return;
    if (!advanceGrenadeCharge(this.weaponCycle, weapon, dt, !!target)) return;
    launchGrenade(
      this,
      weapon,
      muzzlePosition(riderPosition(this.player, this.vehicle), this.loadout.weapon),
      target,
      this.damage(),
    );
    triggerRecoil(this.player.recoil, this.loadout.weapon);
  }
  // 用本帧完整移动线段扫过全部存活目标，按距离结算最近碰撞。
  updateProjectiles(dt) {
    updateBallistics(this, dt);
  }
  // 护盾逐次承伤；只有穿透护盾的角色或车体伤害受原有无敌时间保护。
  hurt(amount, source=null) {
    if(livingProtected(this)||['rescue','result'].includes(this.campDefense?.phase))return;
    if(this.state!=='playing')return;
    if (this.realm) amount = Math.max(1, amount * Math.max(GAMEPLAY_VALUES.blessings.armorFloor, 1 - (this.realm.buffs.armor || 0) * GAMEPLAY_VALUES.blessings.armorPerStack));
    // 格挡不产生或刷新无敌时间，已有的身体保护也不能免除护盾消耗。
    amount=absorbEnergyShield(this,amount,source);
    if(amount<=0||this.player.invincible>0)return;
    if (absorbVehicleHit(this, amount, source)) return;
    this.player.hp = Math.max(0, this.player.hp - amount);
    this.player.invincible = GAMEPLAY_VALUES.player.invincibleSeconds;
    this.float(this.player.x, this.player.y, `−${Math.floor(amount)}`, '#ffb1a0', true);
    this.onEvent('hurt', { fatal: this.player.hp <= 0 });
    if (!this.player.hp) {
      if(this.campDefense){rescueCampDefense(this,'death');return;}
      if (this.story) { failStory(this); return; }
      if (this.realm) { finishRealm(this); return; }
      this.state = 'dead';updateFireRescue(this,0);
      settleDeathPenalty(this);
      recordEconomy(this.progress,'challenge-failed',this.boss?'forest:boss':'forest:wave');
      this.onEvent('death');
    }
  }
  // 固定上限步长更新，后台恢复时不会突进或受到大量伤害。
  update(dt, input = { x: 0, y: 0 }) {
    dt = clamp(dt, 0, 0.05);
    this.previewTime += dt;
    updateBossEngagement(this);
    updateOutdoors(this,dt);
    updateFarmRain(this);
    updateWarehouseWood(this,dt);
    updateWarehouseHarvest(this,dt);
    // 运动会使用独立移动时钟，倒计时、暂停、终点均不推进森林或战斗逻辑。
    if(this.realm?.mode==='race'){if(updateRace(this,dt,input)){syncRealm(this);this.onEvent('realm-finish',{won:this.realm.phase==='won'});}return;}
    if(updateArrival(this,dt)){if(this.state==='paused')updateVehicleBoarding(this,0,input);else this.vehicleBoarding=null;return;}
    updateLoadWarning(this,dt,input);
    if(outdoorBusy(this))input={x:0,y:0};
    if(!outdoorBusy(this))updateVehicleBoarding(this,dt,input);
    maintainPlayerTow(this);
    // 屋内等待仍推进已付费维修，弹窗暂停由业务状态统一冻结。
    if(this.cottage)updateVehicleRepair(this,dt);
    if(updateCottage(this,dt,input))return;
    updateRestoration(this,dt);
    updateParkingVisitors(this,dt);
    // 驾驶者先停稳入位，避免靠近工坊时主线对白抢走倒车控制。
    if(updateParking(this,dt,input))return;
    updateCampRoutines(this,dt);
    if(!outdoorBusy(this)&&!this.campDefense&&this.parking?.phase!=='waiting'&&updateMainline(this,dt))return;
    // 在下一帧边界归还场景，避免致命伤害遍历中替换敌人、载具和森林对象。
    if(this.realm?.phase==='lost'&&readyStoryExcursion(this)){this.leaveRealm();return;}
    if (this.realm?.phase === 'rest') {
      updateRealm(this, dt);
      // 高塔和守护休整继续动作与收尾表现；真正暂停及开波同帧不重复推进。
      if (this.realm.phase !== 'rest' || this.state !== 'realm') return;
    }
    if (this.canExploreRealm) {
      const p = this.player, x = p.x, y = p.y, length = Math.hypot(input.x, input.y);
      driveBody(p, input, HEROES[this.progress.hero].speed * (this.vehicle.active ? vehicleSpeed(this.loadout, this.vehicle.index) : 1), dt, WORLD, this.trees);
      crushVehicleTrees(this, {x,y});
      advanceVehicleWheels(this.vehicle, p, { x, y });
      updateCatMotion(p.bodyAnimation, dt, dt > 0 ? Math.hypot(p.x - x, p.y - y) / dt : 0, length > 0 && !this.vehicle.active);
      if (length > 0) p.angle = Math.atan2(input.y, input.x);
      updateRealmIntermissionEffects(this, dt);
      const rest = Math.ceil(p.walkPhase / Math.PI) * Math.PI;
      p.walkPhase = length > 0 ? p.walkPhase + dt * 12 : p.walkPhase + (rest - p.walkPhase) * Math.min(1, dt * 14);
      return;
    }
    const fireTransit=this.fireTransit;if(!this.arrivalCinematic&&!this.campDefense)updateFireRescue(this,dt,input);
    if(fireTransit||this.fireTransit)return;
    if (this.state !== 'playing') return;
    syncStoryWorld(this);
    // 营地实体在章节全程可见，底座碰撞同样不随任务节点开关。
    this.player.legendaryBuilding=legendaryVisible(this);
    this.player.livingCollision=!this.campDefense&&!this.realm&&this.mapId==='forest'&&!this.fireActive;
    updateLivingWorld(this,dt);
    expireWildFarms(this);
    ensureWildFarms(this);
    updateFarmDelivery(this);
    const profiler = this.profiler;
    this.time += dt;
    const p = this.player,
      previousPlayer = { x: p.x, y: p.y };
    profiler?.start('logic.effects');
    this.fx.update(dt);
    profiler?.end('logic.effects');
    profiler?.start('logic.movement');
    input=outdoorBusy(this)?{x:0,y:0}:updateFarmWork(this,dt,input);
    updateRecoil(p.recoil, this.loadout.weapon, dt);
    p.aimHold = Math.max(0, p.aimHold - dt);
    const length = Math.hypot(input.x, input.y),
      speed =
        HEROES[(this.story?this.loadout:this.progress).hero].speed *
        (this.vehicle.active ? vehicleSpeed(this.loadout, this.vehicle.index) : 1)*movementLoadFactor(this);
    if(speed===0)p.vx=p.vy=0;
    driveBody(p, input, speed, dt, WORLD, this.trees);
    advancePlayerTow(this,previousPlayer,dt);
    crushVehicleTrees(this, previousPlayer);
    // 只记录主动移动，后坐与敌人击退不触发地图遭遇。
    const exploringMove = length > 0 && worldDistance(p, previousPlayer) > .01;
    advanceVehicleWheels(this.vehicle, p, previousPlayer);
    if(this.arrivalPending&&this.mapId==='forest'&&!this.realm&&!this.story&&!this.fireActive&&!this.campDefense){this.progress.arrival.x=p.x;this.progress.arrival.y=p.y;}
    updateCatMotion(p.bodyAnimation, dt, dt > 0 ? Math.hypot(p.x - previousPlayer.x, p.y - previousPlayer.y) / dt : 0, length > 0 && !this.vehicle.active);
    const beforeKick = {x:p.x,y:p.y};
    if(speed!==0)updateHolderKick(p, dt, this.trees);
    else p.pushX=p.pushY=0;
    advancePlayerTow(this,beforeKick,dt);
    crushVehicleTrees(this, beforeKick);
    // 无战斗目标时也按转速收枪转向行进方向。
    if(length>0&&p.aimHold<=0&&!this.findAttackTarget())turnWeapon(p,Math.atan2(input.y,input.x),dt,GAMEPLAY_VALUES.weaponTurn.handheldRate);
    // 停止时连续收步，不瞬间重置到第零帧；真实序列帧仍由既有动作时钟驱动。
    const restingPhase = Math.ceil(p.walkPhase / Math.PI) * Math.PI;
    p.walkPhase = length > 0 ? p.walkPhase + dt * 12 : p.walkPhase + (restingPhase - p.walkPhase) * Math.min(1, dt * 14);
    p.flash = Math.max(0, p.flash - dt);
    p.invincible = Math.max(0, p.invincible - dt);
    profiler?.end('logic.movement');
    profiler?.start('logic.trees');
    // 树干阻挡移动，树冠允许经过，保留自然的俯视层次。
    for (const tree of this.trees)
      if (tree.hp > 0) {
        tree.sway = Math.max(0, (tree.sway || 0) - dt);
        tree.flash = Math.max(0, tree.flash - dt);
      }

    profiler?.end('logic.trees');
    updateMonsterCamps(this,dt);
    profiler?.start('logic.targeting');
    updateCombatPerception(this);
    updateAimLock(this, dt);
    const aimTarget=this.findAttackTarget();
    if(aimTarget&&!farmWorking(this)&&!outdoorBusy(this)){const desired=shotSolution(riderPosition(p, this.vehicle),aimTarget,this.loadout.weapon,this.aimLock).angle;turnWeapon(p,desired,dt,weaponTurnRate(this.weapon()));}
    profiler?.end('logic.targeting');
    profiler?.start('logic.weapons');
    const weapon = this.weapon();
    const magazine = this.magazines[this.loadout.weapon];
    const wasReloading = magazine.remaining > 0;
    const fireTime = advanceReload(magazine, weapon, dt, this.onEvent,n=>takeSupplyAmmo(this,weapon,n),supplyAmmoCount(this,weapon));
    if (!this.parking?.idle&&!farmWorking(this)&&!outdoorBusy(this)&&['funnel', 'drone'].includes(weapon.controller)) updateFunnel(this, dt);
    if (!this.parking?.idle&&!farmWorking(this)&&!outdoorBusy(this)&&weapon.controller === 'mechanical') updateMechanical(this, dt);
    if (!this.parking?.idle&&!farmWorking(this)&&!outdoorBusy(this)&&weapon.controller === 'spider') updateSpider(this, dt);
    // 装填完成即可恢复攻击；装填期间仍继续走位、模拟在途弹丸和怪物。
    if (wasReloading && magazine.remaining === 0) this.attackTimer = 0;
    if(!this.parking?.idle&&!farmWorking(this)&&!outdoorBusy(this))this.updateWeaponAbility(fireTime);
    this.attackTimer -= fireTime;
    if (
      magazine.remaining === 0 &&
      this.attackTimer <= 0 &&
      !weapon.chargeTime &&
      !weapon.controller
    ) {
      // 只补当前步内到期的攻击；高速祝福也保留射速，无目标不囤积攻击。
      this.attackTimer=Math.max(-fireTime,this.attackTimer);
      for(let shot=0;shot<8&&this.attackTimer<=1e-8&&magazine.remaining===0;shot++){
        if(!this.attack()){this.attackTimer=0;break;}
        this.attackTimer+=this.weapon().interval;
      }
    }
    // 静止停车只收住火力，不暂停世界、装填或车体修复冷却。
    updateVehicle(this, dt, !!this.parking?.idle);
    syncSupplyAmmo(this);
    updateVehicleRepair(this,dt);
    updateGuardianDefenses(this, dt);
    profiler?.end('logic.weapons');
    profiler?.start('logic.projectiles');
    this.updateProjectiles(dt);
    profiler?.end('logic.projectiles');
    profiler?.start('logic.spawn');
    if(!this.campDefense)this.updateWaves(dt);
    updateCampDefense(this,dt);
    if(!this.campDefense&&!this.arrivalPending&&!this.fireActive)updateEncounters(this, dt, exploringMove);
    updateBossSupport(this, dt);
    profiler?.end('logic.spawn');
    profiler?.start('logic.enemies');
    updateEnemies(this, dt, previousPlayer);
    if(updateFootball(this,dt)){
      // 球赛已完成一次结算，立即恢复森林；本帧不再用球场坐标更新森林实体。
      const score=this.realm.score;
      this.leaveRealm();
      this.onEvent('realm-finish',{won:true,mode:'football',score});
      profiler?.end('logic.enemies');
      return;
    }
    profiler?.end('logic.enemies');
    profiler?.start('logic.boss');
    updateBossEngagement(this);
    if(bossCombatActive(this)&&!retreatLivingEnemy(this,this.boss,dt))updateBoss(this, dt, previousPlayer);
    updateBossHazards(this, dt, previousPlayer);
    updateGravityFields(this,dt);
    updateStory(this, dt);
    profiler?.end('logic.boss');
    profiler?.start('logic.cleanup');
    for (const s of this.stumps) {
      s.life -= dt;
      if (s.life <= 0 && worldDistance(s, p) > GAMEPLAY_VALUES.forest.treeRegrowSafeDistance) {
        this.addTree(s.x, s.y, { variant: s.variant, palette: s.palette, size: s.size });
        s.regrown = true;
      }
    }
    this.stumps = this.stumps.filter((s) => !s.regrown);
    updateCombatTraces(this, dt);
    // 无树木死亡时保持集合身份，避免每帧使导航与空间索引失效。
    if(this.trees.some(t=>t.hp<=0))this.trees = this.trees.filter((t) => t.hp > 0);
    recycleEnemies(this);
    // 本帧弹道击杀与怪物移动结算后立即刷新锁定，绘制时不留下空目标帧。
    profiler?.end('logic.cleanup');
    profiler?.start('logic.targeting');
    if (this.state === 'playing') updateAimLock(this);
    profiler?.end('logic.targeting');
    // 猫猫不会自然回血；普通巡游受伤后需回小屋完成休息。

  }
}
