import {freshHomeArcade,normalizeHomeArcade} from './home-arcade.js';
import {freshMining,normalizeMining,openBasement} from './mining.js';
import {normalizeNpcDialogue} from './npc-dialogue.js';
import {normalizeOutdoors} from './outdoors.js';
import {freshTreasure,normalizeTreasure} from './treasure.js';
import {normalizeWarehouse} from './warehouse.js';
import {normalizeWeaponStorage} from './weapon-storage.js';
import {freshSupplies,normalizeSupplies} from './supplies.js';
import {isVehicleArmament} from '../config/vehicle-armaments.js';
import {freshMailbox,normalizeMailbox} from './mailbox.js';
import {freshLogistics,normalizeLogistics} from './vehicle-build.js';
import {normalizeHeroXp,awardHeroXp} from './hero-experience.js';
import {normalizeVehicleService} from './vehicle-repair.js';
import {freshHome,normalizeHome} from './home-decor.js';
import {equipmentLevelCap,normalizeLegendaryWorkshop} from '../config/legendary-workshop.js';
import {normalizeMonsterCamps} from './monster-camps.js';
import {TOWN_LAYOUT_VERSION} from '../config/town-layout.js';
import {FIRE_STATION_LAYOUT_VERSION} from '../config/fire-station-layout.js';
import {freshRestoration,validateRestoration} from '../config/town-restoration.js';
import {freshFarm,validateFarm} from './farm.js';
import {initializeWildFarmAges} from './wild-farm-age.js';
import {freshKeepsakes,normalizeKeepsakes} from './keepsakes.js';
import {validateCampLevel} from './camp-level.js';
import {validateGameStatistics} from './game-statistics.js';
import { RESOURCE_CAP } from '../config/resource-limits.js';
import {normalizeCampParking} from './camp-parking.js';
import {validateCampDefense} from './camp-defense.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
import { MASTERY_THRESHOLDS, WEAPON_MODS } from '../config/weapon-mods.js';
import { normalizeLivingWorld } from './living-world.js';
import {normalizeTaskTracking} from './task-tracking.js';
import { RANGER, validateArrival, arrivalPending } from '../config/ranger-arrival.js';
import {validateMainline} from './mainline-progress.js';
import { VEHICLE_WEAPONS } from '../config/vehicle-armaments.js';
import { validateStory } from './story-progress.js';
import { economyUpgradeCost, bindEconomy, economyFor } from '../config/economy.js';
import { freshLedger, validateLedger } from './economy-ledger.js';
// 当前成长存档的默认值与校验，巡游子记录交给独立校验器，不访问浏览器或战场。
import { validateMechanicalLoadout } from '../config/mechanical-loadout.js';
import { validateSpiderLoadout } from '../config/spider-loadout.js';
import { validatePartLevels } from '../config/equipment-parts.js';
import { validateFunnelLoadout } from '../config/funnel-loadouts.js';
import { validateRealms } from './realm-progress.js';
import { WEAPONS } from '../config/weapons.js';
import { HEROES } from '../config/heroes.js';
import { VEHICLE_MAX_LEVEL, COLLECTED_VEHICLES, VEHICLE_DISPLAY_ORDER } from '../config/vehicles.js';
import { clamp } from '../core/math.js';
import { validatePatrol } from './patrol-progress.js';
import { MATERIAL_KEYS, MATERIAL_CAP } from '../config/materials.js';
import { BOSSES } from '../config/bosses.js';
import { equipmentRecipe, ownsEquipment } from './equipment-goals.js';
// 创建新玩家进度，首批物资可用于体验一次升级。
import {validateFireProgress} from './fire-progress.js';
export function freshProgress() {
  return {
    townLayoutVersion:TOWN_LAYOUT_VERSION,
    fireStationLayoutVersion:FIRE_STATION_LAYOUT_VERSION,
    legendaryWorkshop:normalizeLegendaryWorkshop(null),
    arrival: null,
    farm:freshFarm(),
    mailbox:freshMailbox(),
    logistics:freshLogistics(),
    supplies:freshSupplies(),
    warehouse:normalizeWarehouse(null),
    outdoors:normalizeOutdoors(null),
    treasure:freshTreasure(),
    npcDialogue:{},
    homeDecor:freshHome(),
    mining:freshMining(),
    homeArcade:freshHomeArcade(),
    monsterCamps:normalizeMonsterCamps(null),
    keepsakes:freshKeepsakes(true),
    restoration:freshRestoration(),
    campParking:{owned:[]},
    vehicleService:[],
    campLevel:validateCampLevel(null),
    campDefense:validateCampDefense(null),
    mainline: validateMainline(null),
    living:normalizeLivingWorld(null),
    taskTracking:null,
    fireDispatch:validateFireProgress(null),
    story: validateStory(null),
    weaponParts: validatePartLevels(null, WEAPONS.map(() => 1), 'weapons'),
    turretParts: validatePartLevels(null, VEHICLE_WEAPONS.map(() => 1), 'turret'),
    vehicleParts: validatePartLevels(null, COLLECTED_VEHICLES.map(() => 1), 'vehicle'),
    version: 1,
    economyLog: freshLedger(),
    statistics:validateGameStatistics(null),
    mapId: 'forest',
    realms: validateRealms(null),
    materials: { parts: 0, crystal: 0, core: 0 },
    materialPity: { parts: 0, crystal: 0 },
    materialBosses: [],
    equipmentGoal: null,
    mechanicalLoadout: null,
    spiderLoadout: null,
    funnelLoadout: [12, 12, 12],
    vehicleIndex: RANGER.scooter,
    vehicleHulls: COLLECTED_VEHICLES.map((_, i) => i === RANGER.scooter ? 1 : 0),
    vehicleLoadouts: COLLECTED_VEHICLES.map(() => null),
    vehicleWeapons: VEHICLE_WEAPONS.map(() => 0),
    coins: GAMEPLAY_VALUES.progress.startCoins,
    wood: GAMEPLAY_VALUES.progress.startWood,
    hero: 0,
    weapon: 0,
    heroXp: HEROES.map(()=>0),
    heroes: HEROES.map((_, index) => index === 0 ? 1 : 0),
    weapons: WEAPONS.map((_, index) => (index === 0 ? 1 : 0)),
    mastery: WEAPONS.map(() => 0),
    mods: WEAPONS.map(() => 0),
    bosses: 0,
    bossChallenge: null,
    patrol: null,
  };
}
// 正式首页首次进入及清档共用空白入职档；交接前不拥有赠品。
export function freshRangerProgress() {
  const p = freshProgress();
  p.arrival = validateArrival({version:3,phase:'bus',x:RANGER.bus.x-12,y:RANGER.bus.y-180});
  p.keepsakes=freshKeepsakes();
  p.mainline=validateMainline(null);
  p.coins=0;p.wood=0;p.weapons.fill(0);p.weapon=RANGER.saw;
  p.vehicleHulls.fill(0);p.vehicleWeapons.fill(0);p.vehicleLoadouts.fill(null);p.vehicleIndex=RANGER.scooter;
  return p;
}
// 白名单恢复存档，缺失字段与损坏数据回退到合法默认值。
export function validateProgress(raw) {
  const p = freshProgress();
  if (!raw || raw.version !== 1) return p;
  p.legendaryWorkshop=normalizeLegendaryWorkshop(raw.legendaryWorkshop);
  p.restoration=validateRestoration(raw.restoration);
  p.farm=validateFarm(raw.farm);
  p.outdoors=normalizeOutdoors(raw.outdoors);
  p.mailbox=normalizeMailbox(raw.mailbox);
  p.campLevel=validateCampLevel(raw.campLevel);
  p.mainline=validateMainline(raw.mainline);
  bindEconomy(p,economyFor(raw));
  p.economyLog=validateLedger(raw.economyLog);
  p.statistics=validateGameStatistics(raw.statistics);
  p.mapId = raw.mapId === 'jiuzhaigou' ? 'jiuzhaigou' : 'forest';
  for (const key of ['coins', 'wood', 'bosses'])
    if (Number.isFinite(raw[key])) p[key] = clamp(Math.floor(raw[key]), 0, key==='bosses'?GAMEPLAY_VALUES.progress.counterCap:RESOURCE_CAP);
  for (const key of ['heroes', 'weapons'])
    if (Array.isArray(raw[key]))
      p[key] = p[key].map((fallback, i) =>
        clamp(Math.floor(Number(raw[key][i]) || fallback), i === 0 ? 1 : 0, equipmentLevelCap(p,key)),
      );
  p.heroXp=normalizeHeroXp(raw.heroXp,p.heroes);
  // 合法的跨级经验恢复时自动结算，历史等级保持不变。
  for(let i=0;i<p.heroes.length;i++)if(p.heroXp[i]>0){const xp=p.heroXp[i];p.heroXp[i]=0;awardHeroXp(p,xp,i);}
  p.hero = Number.isInteger(raw.hero) && p.heroes[raw.hero] ? raw.hero : 0;
  p.weapon = Number.isInteger(raw.weapon) && p.weapons[raw.weapon] ? raw.weapon : 0;
  // 所有权只读取当前车体数组，缺少记录不补发车辆。
  p.vehicleHulls = COLLECTED_VEHICLES.map((_, i) =>
    Number.isFinite(raw.vehicleHulls?.[i])
      ? clamp(Math.floor(raw.vehicleHulls[i]), 0, VEHICLE_MAX_LEVEL)
      : 0,
  );
  p.vehicleIndex = Number.isInteger(raw.vehicleIndex) && p.vehicleHulls[raw.vehicleIndex] > 0
    ? raw.vehicleIndex : VEHICLE_DISPLAY_ORDER.find(i => p.vehicleHulls[i] > 0) ?? RANGER.scooter;
  p.vehicleWeapons = VEHICLE_WEAPONS.map((w, i) =>
    Number.isFinite(raw.vehicleWeapons?.[i])
      ? clamp(Math.floor(raw.vehicleWeapons[i]), 0, GAMEPLAY_VALUES.progress.maxEquipmentLevel)
      : 0,
  );
  for (let i = 0; i < WEAPONS.length; i++) {
    const xp = raw.mastery?.[i],
      mod = raw.mods?.[i];
    if ((p.weapons[i] || i<17&&p.vehicleWeapons[i]) && Number.isFinite(xp))
      p.mastery[i] = clamp(Math.floor(xp), 0, MASTERY_THRESHOLDS.at(-1));
    if (p.mastery[i] >= MASTERY_THRESHOLDS[GAMEPLAY_VALUES.progress.modUnlockLevel - 1] && Number.isInteger(mod) && mod >= 0 && mod <= WEAPON_MODS[i].length) p.mods[i] = mod;
  }
  // 挑战快照必须属于当前胜场，损坏或已过期记录不能改变新领主强度。
  const challenge = raw.bossChallenge,
    fields = ['maxHp', 'damage', 'blastDamage', 'speed'];
  if (
    challenge &&
    challenge.bosses === p.bosses &&
    fields.every(
      (key) => Number.isFinite(challenge[key]) && challenge[key] > 0 && challenge[key] <= 1e12,
    )
  ) {
    p.bossChallenge = { bosses: p.bosses, healthVersion: challenge.healthVersion };
    if(Number.isInteger(challenge.clearingHealthVersion))p.bossChallenge.clearingHealthVersion=challenge.clearingHealthVersion;
    for (const key of fields) p.bossChallenge[key] = challenge[key];
    // 当前挑战保留明确身份直到结算。
    if(BOSSES.some(b=>b.id===challenge.kind))p.bossChallenge.kind=challenge.kind;
  }
  p.weaponParts = validatePartLevels(raw.weaponParts, p.weapons, 'weapons');
  p.turretParts = validatePartLevels(raw.turretParts, p.vehicleWeapons, 'turret');
  p.vehicleParts = validatePartLevels(raw.vehicleParts, p.vehicleHulls, 'vehicle');
  p.funnelLoadout = validateFunnelLoadout(p, raw.funnelLoadout);
  p.mechanicalLoadout = validateMechanicalLoadout(p, raw.mechanicalLoadout);
  p.spiderLoadout = validateSpiderLoadout(p, raw.spiderLoadout);
  p.campDefense=validateCampDefense(raw.campDefense);
  p.patrol = validatePatrol(raw.patrol);
  p.fireDispatch=validateFireProgress(raw.fireDispatch);
  p.realms = validateRealms(raw.realms);
  p.story = validateStory(raw.story);
  p.living=normalizeLivingWorld(raw.living);
  p.homeDecor=normalizeHome(raw.homeDecor,p.living.calendar);
  p.mining=normalizeMining(raw.mining);
  p.homeArcade=normalizeHomeArcade(raw.homeArcade);
  if(p.homeDecor.basement)openBasement(p.mining);
  initializeWildFarmAges(p.farm,p.living.calendar);
  p.monsterCamps=normalizeMonsterCamps(raw.monsterCamps);
  p.taskTracking=normalizeTaskTracking(raw.taskTracking,p.living);
  // 材料与首通记录只恢复明确保存的值，不根据胜场推算奖励历史。
  for (const key of MATERIAL_KEYS)
    if (Number.isFinite(raw.materials?.[key]))
      p.materials[key] = clamp(Math.floor(raw.materials[key]), 0, MATERIAL_CAP);
  for (const key of ['parts', 'crystal'])
    if (Number.isFinite(raw.materialPity?.[key]))
      p.materialPity[key] = clamp(Math.floor(raw.materialPity[key]), 0, Math.max(economyFor(p).drops[key].pity,economyFor(p).drops[key].favoredPity||0)-1);
  p.materialBosses = Array.isArray(raw.materialBosses)
    ? BOSSES.filter(boss => raw.materialBosses.includes(boss.id)).map(boss => boss.id)
    : [];
  const goal = raw.equipmentGoal;
  if (goal && equipmentRecipe(goal.kind, goal.index) && !ownsEquipment(p, goal.kind, goal.index))
    p.equipmentGoal = { kind: goal.kind, index: goal.index };
  p.arrival=validateArrival(raw.arrival);
  p.keepsakes=normalizeKeepsakes(raw.keepsakes);
  // 入职档允许空手起步，严格保留明确的零所有权。
  if(p.arrival) {
    for(const key of ['weapons','vehicleHulls']) p[key]=p[key].map((n,i)=>Number.isFinite(raw[key]?.[i])?Math.max(0,Math.min(equipmentLevelCap(p,key),Math.floor(raw[key][i]))):0);
    p.vehicleIndex=Number.isInteger(raw.vehicleIndex)&&COLLECTED_VEHICLES[raw.vehicleIndex]?raw.vehicleIndex:RANGER.scooter;
    p.weapon=p.weapons[raw.weapon]?raw.weapon:arrivalPending(p)?RANGER.saw:0;
    p.vehicleWeapons=VEHICLE_WEAPONS.map((_,i)=>Math.max(0,Math.min(GAMEPLAY_VALUES.progress.maxEquipmentLevel,Math.floor(Number(raw.vehicleWeapons?.[i])||0))));
  }
  // 当前挂载按实物主炮去重；车体所有权不强制恢复出厂主炮。
  const mountedGuns=new Set();
  p.vehicleLoadouts=p.vehicleHulls.map((owned,i)=>{const gun=raw.vehicleLoadouts?.[i];if(!owned||!isVehicleArmament(gun)||!p.vehicleWeapons[gun]||mountedGuns.has(gun))return null;mountedGuns.add(gun);return gun;});
  p.supplies=normalizeSupplies(raw.supplies,p);
  p.warehouse=normalizeWarehouse(raw.warehouse);
  p.vehicleService=normalizeVehicleService(raw.vehicleService,p);
  p.campParking=normalizeCampParking(raw.campParking,p);
  p.logistics=normalizeLogistics(raw.logistics,p);
  p.treasure=normalizeTreasure(raw.treasure,p);
  p.npcDialogue=normalizeNpcDialogue(raw.npcDialogue);
  normalizeWeaponStorage(p);
  p.funnelLoadout=validateFunnelLoadout(p,p.funnelLoadout);p.mechanicalLoadout=validateMechanicalLoadout(p,p.mechanicalLoadout);p.spiderLoadout=validateSpiderLoadout(p,p.spiderLoadout);
  return p;
}
// 根据当前等级计算升级费用。
export function upgradeCost(level, progress, kind = 'weapons', index = 0, part = null) {
  return economyUpgradeCost(progress,kind,index,level,part);
}
