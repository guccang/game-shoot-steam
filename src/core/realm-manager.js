import {facilityOpen} from '../config/town-restoration.js';
import {awardCampXp} from '../progression/camp-level.js';
import {creditResource} from '../progression/resource-wallet.js';
import {recordActivity} from '../progression/game-statistics.js';
import {enemyMass} from '../config/enemy-mass.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
import { i18nText } from "../i18n/index.js";
import {recordStoryExcursion} from './story-excursion.js';
import { recordEconomy } from '../progression/economy-ledger.js';
import { createSpiderState, resetSpiderFormation } from '../combat/spider.js';
import { FOOTBALL, footballGuns } from '../config/slime-football.js';
import {RACE} from '../config/forest-race.js';
import {prepareRace,startRace} from './forest-race.js';
import { startFootball, finishFootball } from './slime-football.js';
import { createMechanicalState, resetMechanicalFormation } from '../combat/mechanical.js';
// 独立秘境会话：冻结森林现场，管理关卡、局内强化、女神承伤与逐关奖励。
import { REALMS, REALM_BOSS_INTERVAL, TOWER_REST_SECONDS, GUARDIAN_REST_SECONDS, ROGUE_BLESSINGS, realmStageSpec, realmReward } from '../config/realms.js';
import { GUARDIAN_ECONOMY, guardianCanDeploy } from '../config/guardian.js';
import { guardianSpawnPoint } from './guardian-spawns.js';
import { guardianEnemyProfile } from '../config/guardian-enemies.js';
import { prepareGuardianDefense } from './guardian-defense.js';
import { nativeVehicleWeapon } from '../config/vehicle-armaments.js';
import { EXPEDITION_GUNS, EXPEDITION_TURRETS, EXPEDITION_VEHICLES, drawExpeditionItem } from '../config/expedition.js';
import { createMagazines } from '../combat/magazine.js';
import { createFunnelState, resetFunnelFormation } from '../combat/funnel.js';
import { initializeFunnelLoadouts } from '../combat/funnel-loadout.js';
import { chooseRealmArena, prepareRealmTrees } from './realm-region.js';
import { blocked } from '../physics/motion.js';
import { createVehicle } from '../combat/vehicle.js';
import { COLLECTED_VEHICLES, vehicleMaxHp } from '../config/vehicles.js';
import { BOSSES } from '../config/bosses.js';
import { capturePatrol } from './patrol-session.js';
import { validateRealms } from '../progression/realm-progress.js';
import { captureRealmVehicles, restoreRealmVehicles, restoreForestVehicleSelection } from './realm-vehicles.js';

const SHARED = new Set(['livingActors','livingBattle','livingPersist','livingWeather','livingPhase','livingPreview','progress', 'random', 'onEvent', 'profiler', 'viewport', 'arrivalView', 'realm', 'forestState', 'forestPatrol']);
// 随机洗牌后取三个不同祝福，避免固定顺序造成每局相同构筑。
function offers(game) {
  const pool = [...ROGUE_BLESSINGS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(game.random() * (i + 1)));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, GAMEPLAY_VALUES.blessings.offerCount);
}
// 森林运行时对象整体冻结，返回时保留位置、弹药、载具、敌人和领主现场。
export function enterRealm(game, mode, checkpoint = null) {
  if(!checkpoint&&!facilityOpen(game.progress,mode))return false;
  if (game.campDefense||game.story||game.fireActive||mode==='fire') return false;
  if (game.realm || !Object.hasOwn(REALMS, mode) || game.state === 'dead') return false;
  const saved = checkpoint && validateRealms({ run: checkpoint }).run;
  // 刷新时先重建冻结的森林车库，再恢复秘境关卡起点，两个场景互不消耗耐久与弹药。
  if (saved?.forestVehicles) restoreRealmVehicles(game, saved.forestVehicles);
  const forestVehicles = captureRealmVehicles(game);
  game.forestPatrol = capturePatrol(game);
  game.forestState = Object.fromEntries(Object.entries(game).filter(([key]) => !SHARED.has(key)));
  // 秘境仍使用原森林区域；离开时由现场快照恢复旅行地图，存档地图不变。
  game.mapId = 'forest';
  game.reset();
  game.recoveryRun = false;
  // 新开高塔挑战从最高已通关层重战；有效检查点仍优先续接，跳过的层数不补发奖励。
  const startStage=mode==='tower'?Math.max(1,game.progress.realms.records.tower.best):1;
  game.realm = saved || { mode, stage: startStage, cleared: startStage-1, phase: mode === 'rogue' ? 'loadout' : ['guardian','fire'].includes(mode) ? 'build' : 'combat',
    // 首次游玩身份随本局保存，刷新不计新局；有历史纪录的旧档不补弹新手引导。
    ...(mode === 'rogue' ? { firstRun: !game.progress.statistics?.plays?.rogue && !game.progress.realms.records.rogue.best, loadout: { weapon: null, vehicle: null, turret: null, modules: [0, 0, 0] } } : {}),
    ...(mode === 'guardian' ? { realmCoins: GUARDIAN_ECONOMY.start, defenses: [] } : {}),
    buffs: {}, blessingCounts: {}, offers: mode === 'rogue' ? offers(game) : [], encounter: 'swarm',
    startHp: game.maxHp(), goddessHp: GAMEPLAY_VALUES.realm.goddessHealth, earnings: { coins: 0, wood: 0, parts: 0, crystal: 0, core: 0 } };
  const r = game.realm;
  r.forestVehicles = forestVehicles;
  r.arena = mode === 'race' ? {...RACE.arena} : mode === 'football' ? {...FOOTBALL.arena} : chooseRealmArena(game.random, r.arena);
  game.trees = ['football','race'].includes(mode) ? game.trees.filter(t=>Math.hypot(t.x-r.arena.x,t.y-r.arena.y)>r.arena.radius+GAMEPLAY_VALUES.football.treeClearPadding) : prepareRealmTrees(game.trees, r);
  if(mode==='football'){
    r.gun=footballGuns(game.progress).includes(r.gun)?r.gun:3;
    r.score=saved?.phase==='won'?saved.score:0;r.remaining=FOOTBALL.duration;
    r.phase=saved?.phase==='won'?'won':'build';r.warning=0;r.rings=[];r.goalFlash=0;
    // 运动场不带入载具，森林车库由原现场快照完整保存。
    game.enemies=[];game.stumps=[];
  }
  if (r.loadout) {
    prepareExpeditionEquipment(game);
    if (saved?.vehicles) restoreRealmVehicles(game, saved.vehicles);
  } else if(!['football','fire','race'].includes(mode)) {
    const vehicles = structuredClone(saved?.vehicles || forestVehicles);
    // 新挑战带上当前可用车辆；接待厅的强制下车不应让秘境缺车，也不改动门外停车记录。
    // 读档保留局内上下车选择，报废、维修中和冷却中的车辆不能借入场复活。
    const hull = vehicles.hulls[vehicles.index];
    if (!saved && hull.hp > 0 && hull.cooldown === 0 && !game.progress.vehicleService?.[vehicles.index]?.phase) hull.active = true;
    restoreRealmVehicles(game, vehicles);
  }
  r.goddess = { type: 'goddess', x: r.arena.x, y: r.arena.y, hp: r.goddessHp, maxHp: GAMEPLAY_VALUES.realm.goddessHealth, radius: GAMEPLAY_VALUES.realm.goddessRadius };
  if (r.mode === 'guardian') {
    r.defenses = r.defenses.filter(t => guardianCanDeploy(game.progress, t.kind, t.index, t.weaponIndex));
    for (const tower of r.defenses) prepareGuardianDefense(game, tower);
  }
  game.player.arena = r.arena;
  game.player.x = r.arena.x;
  game.player.y = r.arena.y + (mode==='football'?GAMEPLAY_VALUES.football.playerSpawnY:GAMEPLAY_VALUES.realm.playerSpawnY);
  game.player.hp = Math.min(game.maxHp(), r.startHp);
  if(mode==='race')prepareRace(game);
  if (r.phase === 'combat') beginRealmStage(game, !!saved);
  else game.state = 'realm';
  if (saved && r.phase === 'combat') game.state = 'paused';
  if(!saved)recordActivity(game.progress,mode);
  syncRealm(game);
  recordStoryExcursion(game);
  game.onEvent('realm-change');
  return true;
}
// 关卡起点保存生命和祝福，刷新只回到这个起点；局中击杀不提供永久资源。
export function beginRealmStage(game, restoring = false) {
  const r = game.realm;
  if(r?.mode==='race'){const started=startRace(game);if(started)syncRealm(game);return started;}
  if(r?.mode==='football'){const started=startFootball(game);if(started)syncRealm(game);return started;}
  if (!r || (r.loadout && (r.loadout.weapon === null || r.loadout.vehicle === null))) return false;
  // 领取装备后的首次开战自动驾驶；读档与后续关卡保留玩家上下车和修复状态。
  const autoBoard = !restoring && r.mode === 'rogue' && r.loadout && r.phase === 'choice' && r.stage === 1 && r.cleared === 0;
  if (r.loadout) {
    const ratio = game.vehicle.hp / game.vehicle.maxHp;
    game.vehicle.maxHp = vehicleMaxHp(game.loadout, game.maxHp());
    game.vehicle.hp = game.vehicle.maxHp * ratio;
  }
  if (!restoring && r.mode === 'rogue') r.encounter = ['swarm', 'hunters', 'elite'][Math.min(2, Math.floor(game.random() * 3))];
  for (const tower of r.defenses || []) prepareGuardianDefense(game, tower);
  r.phase = 'combat'; r.spawned = 0; r.kills = 0; r.warning = GAMEPLAY_VALUES.realm.warningSeconds; r.spawnTimer = 0;
  r.spec = realmStageSpec(r.mode, r.stage, r.encounter);
  r.startHp = game.player.hp; r.goddessHp = r.goddess.hp;
  game.enemies = []; game.projectiles = []; game.gravityFields = []; game.remnants = []; game.hazards = [];
  game.boss = null;
  game.wave = r.stage; game.waveKills = 0; game.waveSpawned = 0; game.aimLock = null;
  game.state = 'playing';
  if (autoBoard) game.summonVehicle();
  syncRealm(game);
  return true;
}
// 应用抽取结果时重建独立弹药与车体，森林现场仍由原引用完整保留。
function prepareExpeditionEquipment(game) {
  const p = game.loadout;
  game.magazines = createMagazines(p);
  game.funnel = createFunnelState(game.magazines[12]);
  initializeFunnelLoadouts(game.funnel, p);
  game.drone = createFunnelState(null, 'drone');
  game.mechanical = createMechanicalState();
  game.spider = createSpiderState();
  game.vehicles = COLLECTED_VEHICLES.map((_, i) => createVehicle(p, i));
  game.vehicle = game.vehicles[p.vehicleIndex];
}
// 抽签结果先保存再播放转轮；刷新不会重新抽奖，连点无法领取第二份装备。
export function rollRealmEquipment(game, kind) {
  const r = game.realm, previous = game.progress.realms.lastLoadout;
  if (!r?.loadout || r.phase !== 'loadout') return false;
  const l = r.loadout;
  if (kind === 'weapon' && l.weapon === null) {
    l.weapon = drawExpeditionItem(EXPEDITION_GUNS, previous?.weapon, game.random);
    l.modules = [0, 1, 2].map(() => drawExpeditionItem(EXPEDITION_TURRETS, null, game.random));
  } else if (kind === 'vehicle' && l.weapon !== null && l.vehicle === null) {
    l.vehicle = drawExpeditionItem(EXPEDITION_VEHICLES, previous?.vehicle, game.random);
    l.turret = nativeVehicleWeapon(l.vehicle)?.weaponIndex ?? null;
  } else return false;
  game.progress.realms.lastLoadout = { ...structuredClone(l), vehicle: l.vehicle ?? previous?.vehicle ?? null, turret: l.turret };
  prepareExpeditionEquipment(game);
  syncRealm(game);
  game.onEvent('realm-loadout');
  return true;
}
// 玩家确认已领取的武器、车体及随车主炮后再选祝福，准备期间不会刷怪。
export function readyRealm(game) {
  const r = game.realm;
  if (r?.phase !== 'loadout' || r.loadout.weapon === null || r.loadout.vehicle === null) return false;
  r.phase = 'choice';
  syncRealm(game);
  game.onEvent('realm-change');
  return true;
}
// 祝福只影响本局统计，选择验证通过后才推进关卡，双击不能重复领取。
export function chooseRealmBlessing(game, key) {
  const r = game.realm;
  if (!r || r.mode !== 'rogue' || r.phase !== 'choice' || !r.offers.includes(key)) return false;
  // 次数只在合法选择事务内累加，不从叠加层数反推历史。
  r.blessingCounts[key] = Math.min(Number.MAX_SAFE_INTEGER, (r.blessingCounts[key] || 0) + 1);
  if (key === 'mend') r.goddess.hp = Math.min(GAMEPLAY_VALUES.realm.goddessHealth, r.goddess.hp + GAMEPLAY_VALUES.blessings.mendHealth);
  else if (key === 'heal') game.player.hp = Math.min(game.maxHp(), game.player.hp + game.maxHp() * GAMEPLAY_VALUES.blessings.healRatio);
  else {
    r.buffs[key] = Math.min(GAMEPLAY_VALUES.blessings.maxStacks, (r.buffs[key] || 0) + 1);
    if (key === 'vitality') game.player.hp = Math.min(game.maxHp(), game.player.hp + GAMEPLAY_VALUES.blessings.vitalityPerStack);
  }
  r.offers = [];
  if (r.cleared === r.stage) r.stage++;
  // 首次抵达第五关先暂停刷怪，让玩家选择回主线或继续本局；奖励仍只按已通关结算。
  if (r.firstRun && r.stage === 5) {
    r.phase = 'guide';
    r.startHp = game.player.hp; r.goddessHp = r.goddess.hp;
    game.state = 'realm';
    syncRealm(game);
    game.onEvent('realm-change');
    return true;
  }
  beginRealmStage(game);
  game.onEvent('realm-change');
  return true;
}
// 倒计时或手动继续共用一次推进事务，传送不会重建弹药和载具耐久。
export function continueRealm(game) {
  if (!game.realm || !['rest', 'build', 'guide'].includes(game.realm.phase)) return false;
  if (game.realm.phase === 'rest') {
    const r = game.realm;
    // 守护继续原场地与站位；只有爬塔需要传送到新区域。
    if (r.mode === 'tower') {
      r.arena = chooseRealmArena(game.random, null, r.arena);
      game.trees = prepareRealmTrees(game.trees, r);
      // 曾经砍下的树也不能在新落点或高塔内部重新长出。
      game.stumps = prepareRealmTrees(game.stumps, r);
      Object.assign(game.player, { x: r.arena.x, y: r.arena.y + GAMEPLAY_VALUES.realm.playerSpawnY, arena: r.arena });
      Object.assign(r.goddess, { x: r.arena.x, y: r.arena.y });
      for (const key of ['shots', 'particles', 'numbers', 'drops']) game[key] = [];
      game.fx.items.length = 0;
      resetFunnelFormation(game.funnel);
      resetFunnelFormation(game.drone);
      resetMechanicalFormation(game.mechanical);
      resetSpiderFormation(game.spider);
    }
    r.restRemaining = 0;
    r.stage++;
  }
  beginRealmStage(game);
  game.onEvent('realm-change');
  return true;
}
// 将完整的已结算阶段与永久资源在同一存档中提交。
export function syncRealm(game) {
  const r = game.realm;
  if (r) r.vehicles = captureRealmVehicles(game);
  game.progress.realms.run = r ? validateRealms({ run: r }).run : null;
}
// 所有秘境退出后恢复自由活动，接待厅内不依赖被室内界面隐藏的暂停按钮。
export function leaveRealm(game) {
  if (!game.realm) return false;
  // 新手引导返回后优先追踪主线，和离开远征的存档事件一并保存。
  if (!game.progress.mainline.trackingPaused && game.realm.mode === 'rogue' && game.realm.phase === 'guide') game.progress.taskTracking = { kind: 'mainline' };
  // 返回时补记旧档中的已进入体验，失败或提前退出也可回营交付。
  recordStoryExcursion(game);
  const football=game.realm.mode==='football';
  if(football)finishFootball(game);
  const state = game.forestState;
  game.realm = null;
  Object.assign(game, state);
  restoreForestVehicleSelection(game);
  game.state = state.state === 'ready' ? 'ready' : 'playing';
  game.forestState = null; game.forestPatrol = null;
  game.player.hp = Math.min(game.player.hp, game.maxHp());
  game.progress.realms.run = null;
  game.onEvent('realm-change');
  return true;
}
// 失败只结束秘境，不调用森林死亡回退或森林领主奖励。
export function finishRealm(game) {
  const r = game.realm;
  if (!r || r.phase === 'lost') return;
  r.phase = 'lost';
  recordEconomy(game.progress,'challenge-failed',r.mode+':'+r.stage);
  r.offers = [];
  r.startHp = Math.max(1, game.player.hp); r.goddessHp = r.goddess.hp;
  game.state = 'realm';
  syncRealm(game);
  game.onEvent('realm-finish', { won: false });
}
// 女神是实际攻击目标，每只怪物按自身扑击节奏造成伤害，无共享无敌帧。
export function hurtGoddess(game, amount) {
  const r = game.realm;
  if (!r || r.mode !== 'guardian' || r.phase !== 'combat' || game.state !== 'playing') return;
  r.goddess.hp = Math.max(0, r.goddess.hp - amount);
  r.goddess.flash = 0.25;
  game.float(r.goddess.x, r.goddess.y - 45, `−${Math.ceil(amount)}`, '#ffb6ae');
  if (!r.goddess.hp) finishRealm(game);
}
// 局内击杀积累关卡进度与吸血效果，不改变森林累计击杀和材料保底。
export function realmKill(game, target) {
  const r = game.realm;
  if (!r || r.phase !== 'combat') return;
  r.kills++;
  if (r.mode === 'guardian') {
    const amount = target?.type === 'boss' ? GUARDIAN_ECONOMY.boss : target?.tough ? GUARDIAN_ECONOMY.elite : GUARDIAN_ECONOMY.kill;
    r.realmCoins = Math.min(GAMEPLAY_VALUES.progress.counterCap, r.realmCoins + amount);
    game.float(target.x, target.y - 20, i18nText("core.realm-manager.b4efb94348", { p0: (amount) }), '#f4d67d');
  }
  if (target?.type === 'boss') {
    game.boss = null;
    game.hazards = [];
    game.onEvent('realm-boss-defeated');
  }
  game.player.hp = Math.min(game.maxHp(), game.player.hp + (r.buffs.leech || 0) * GAMEPLAY_VALUES.blessings.leechPerStack);
}
// 同一关只结算一次，先更新阶段再发事件，防止保存出半完成的奖励状态。
function clearStage(game) {
  const r = game.realm, record = game.progress.realms.records[r.mode];
  if (r.cleared >= r.stage) return;
  awardCampXp(game.progress,'realm');
  const reward = realmReward(r.mode, r.stage, record.best, game.progress);
  for (const [key, amount] of Object.entries(reward)) {
    const received=creditResource(game.progress,key,amount);
    reward[key]=received;
    r.earnings[key] += received;
  }
  recordEconomy(game.progress,'income','realm:'+r.mode,reward);
  recordEconomy(game.progress,'challenge',r.mode+':'+r.stage);
  r.cleared = r.stage; record.best = Math.max(record.best, r.stage);
  if (r.spec.boss) record.bosses++;
  r.phase = r.mode === 'rogue' ? 'choice' : 'rest';
  // 高塔与守护清波即撤销仍可命中的弹丸与伤害区域，独立光束和爆炸表现自然消散。
  if (['guardian', 'tower'].includes(r.mode)) {
    game.enemyBolts = [];
    game.projectiles = []; game.gravityFields = [];
    game.hazards = [];
    game.aimLock = null;
  }
  r.offers = r.mode === 'rogue' ? offers(game) : [];
  if (r.mode === 'guardian') r.restRemaining = GUARDIAN_REST_SECONDS;
  if (r.mode === 'tower') {
    game.player.hp = Math.min(game.maxHp(), game.player.hp + game.maxHp() * GAMEPLAY_VALUES.realm.towerClearHealRatio);
    r.restRemaining = TOWER_REST_SECONDS;
  }
  r.startHp = game.player.hp; r.goddessHp = r.goddess.hp;
  game.state = 'realm';
  syncRealm(game);
  game.onEvent('realm-clear', { mode: r.mode });
}
// 领主按固定关卡轮换形象与真实技能，不借用森林召唤资格、强度快照或胜场奖励。
function spawnRealmBoss(game, spot) {
  const r = game.realm, index = Math.floor(r.stage / REALM_BOSS_INTERVAL) - 1;
  const profile = BOSSES[index % BOSSES.length], hp = Math.round(r.spec.hp * GAMEPLAY_VALUES.realm.bossHealthMultiplier);
  game.boss = { id: game.nextId++, type: 'boss', kind: profile.id, realm: true, arena: r.arena,
    ...spot, hp, maxHp: hp, radius: GAMEPLAY_VALUES.realm.bossRadius, mass: GAMEPLAY_VALUES.realm.bossMass, flash: 0, attack: GAMEPLAY_VALUES.realm.bossFirstAttackDelay,
    ai: { phase: 'chase', elapsed: 0 }, speed: profile.speed * Math.min(GAMEPLAY_VALUES.realm.bossSpeedCap, 1 + r.stage * GAMEPLAY_VALUES.realm.bossSpeedPerStage),
    damage: r.spec.damage * GAMEPLAY_VALUES.realm.bossContactMultiplier, blastDamage: r.spec.damage * GAMEPLAY_VALUES.realm.bossBlastMultiplier };
  game.onEvent('realm-boss', { name: profile.name });
}

// 独立刷怪调度：总配额随层数增长，分批入场；最后一个名额在固定关卡替换成领主。
export function updateRealm(game, dt) {
  const r = game.realm;
  // 比赛必须在刚体运动后判分，其独立时钟在Game更新末段推进。
  if(['football','race'].includes(r?.mode))return;
  // 休整只推进下一波或传送时钟；暂停与弹窗期间冻结，不运行战斗或重复结算奖励。
  if (r && ['tower', 'guardian'].includes(r.mode) && r.phase === 'rest' && game.state === 'realm') {
    r.restRemaining = Math.max(0, (r.restRemaining ?? (r.mode === 'guardian' ? GUARDIAN_REST_SECONDS : TOWER_REST_SECONDS)) - dt);
    if (game.progress.realms.run) game.progress.realms.run.restRemaining = r.restRemaining;
    if (r.restRemaining <= 1e-8) continueRealm(game);
    return;
  }
  if (!r || r.phase !== 'combat' || game.state !== 'playing') return;
  r.goddess.flash = Math.max(0, (r.goddess.flash || 0) - dt);
  if (r.kills >= r.spec.total && !game.boss && !game.enemies.some(e => e.hp > 0)) { clearStage(game); return; }
  r.warning = Math.max(0, r.warning - dt);
  if (r.warning > 0) return;
  r.spawnTimer -= dt;
  if (r.spawnTimer > 0 || r.spawned >= r.spec.total) return;
  if (game.enemies.filter(e => e.hp > 0).length + Number(!!game.boss) >= r.spec.alive) { r.spawnTimer = 0; return; }
  r.spawnTimer = Math.max(-dt, r.spawnTimer);
  // 帧率低于补兵频率时按时间债务批量出生；满场不积攒下一帧爆发。
  const capacity = r.spec.alive - game.enemies.filter(e => e.hp > 0).length - Number(!!game.boss);
  const batch = r.mode === 'guardian' ? Math.min(GAMEPLAY_VALUES.realm.spawnBatchLimit, capacity, r.spec.total - r.spawned, 1 + Math.floor(-r.spawnTimer / r.spec.spacing)) : 1;
  for (let i = 0; i < batch; i++) {
    if (!spawnRealmUnit(game)) return;
    r.spawnTimer = r.mode === 'guardian' ? r.spawnTimer + r.spec.spacing : r.spec.spacing;
  }
}

// 单只敌人的安全选点、领主替换与属性配置保持统一，失败让调度器稍后重试。
function spawnRealmUnit(game) {
  const r = game.realm;
  const angle = game.random() * Math.PI * 2;
  const isBoss = r.spec.boss && r.spawned === r.spec.total - 1, radius = r.arena.radius - (isBoss ? GAMEPLAY_VALUES.realm.bossSpawnInset : GAMEPLAY_VALUES.realm.enemySpawnInset);
  let spot = r.mode === 'guardian' ? guardianSpawnPoint(game, isBoss) : { x: r.arena.x + Math.cos(angle) * radius, y: r.arena.y + Math.sin(angle) * radius };
  if (!spot) { r.spawnTimer = GAMEPLAY_VALUES.realm.spawnRetrySeconds; return false; }
  // 原森林树干参与出生检查，沿边界找空地，避免刷在树体或区域外。
  if (r.mode !== 'guardian') {
    for (let i = 1; i <= 32 && blocked(spot.x, spot.y, isBoss ? GAMEPLAY_VALUES.realm.bossRadius : GAMEPLAY_VALUES.realm.spawnCollisionRadius, game.trees, { arena: r.arena }); i++) {
      const next = angle + i * Math.PI / 16;
      spot = { x: r.arena.x + Math.cos(next) * radius, y: r.arena.y + Math.sin(next) * radius };
    }
    if (blocked(spot.x, spot.y, isBoss ? GAMEPLAY_VALUES.realm.bossRadius : GAMEPLAY_VALUES.realm.spawnCollisionRadius, game.trees, { arena: r.arena })) spot = { x: r.arena.x, y: r.arena.y };
  }
  if (isBoss) { spawnRealmBoss(game, spot); r.spawned++; return true; }
  const enemy = game.spawnEnemy(0, 0, spot);
  const elite = r.spec.elite && r.spawned === r.spec.total - 1;
  Object.assign(enemy, { arena: r.arena, realm: true, flying: false,
    hp: r.spec.hp * (elite ? GAMEPLAY_VALUES.realm.eliteHealthMultiplier : 1), maxHp: r.spec.hp * (elite ? GAMEPLAY_VALUES.realm.eliteHealthMultiplier : 1),
    damage: r.spec.damage * (elite ? GAMEPLAY_VALUES.realm.eliteDamageMultiplier : 1), speed: r.spec.speed, tough: elite,
    rank: elite ? 2 : 0, level: r.stage, radius: elite ? GAMEPLAY_VALUES.realm.eliteRadius : GAMEPLAY_VALUES.realm.normalRadius, mass: enemyMass(),
    name: elite ? i18nText("core.realm-manager.daefce3c1d") : i18nText("core.realm-manager.9feab77e29"),
    goddessTarget: r.mode === 'guardian' });
  if (r.mode === 'guardian') {
    const profile = guardianEnemyProfile(r.stage, r.spawned);
    const hp = Math.max(1, Math.round(r.spec.hp * profile.hp));
    Object.assign(enemy, { ...profile, hp, maxHp: hp, speed: r.spec.speed * profile.speed,
      damage: r.spec.damage * profile.damage, flying: profile.species === 'leaf-bat',
      tough: profile.rank > 0, radius: profile.rank ? GAMEPLAY_VALUES.realm.toughRadius : GAMEPLAY_VALUES.realm.normalRadius, mass: profile.species==='leaf-bat'?enemyMass()*GAMEPLAY_VALUES.flying.massRatio:enemyMass(profile.species) });
  }
  r.spawned++;
  return true;
}
