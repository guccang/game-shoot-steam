import {restoreVehicleService} from './vehicle-repair.js';
import {farmCovers} from '../world/farm-land.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
import { createSpiderState } from '../combat/spider.js';
import { createMechanicalState } from '../combat/mechanical.js';
import { createCatMotion } from './cat-motion.js';
// 战场构建模块负责初始实体、运行时容器和树林生成，不承担存档与战斗推进。
import { resetEncounters } from './encounter-manager.js';
import { resetWaves } from './wave-manager.js';
import { createRecoil } from '../combat/recoil.js';
import { createMagazines } from '../combat/magazine.js';
import { createVehicle } from '../combat/vehicle.js';
import { COLLECTED_VEHICLES } from '../config/vehicles.js';
import { createFunnelState } from '../combat/funnel.js';
import { initializeFunnelLoadouts } from '../combat/funnel-loadout.js';
import { createWeaponCycle } from '../combat/grenades.js';
import { createPulseState } from '../combat/pulse.js';
import { CombatFX } from '../combat/effects.js';
import { forestLayout, biomeAt, terrainNoise } from '../world/biomes.js';
import { updateAimLock } from '../combat/targeting.js';
import { excludesNaturalScenery } from '../world/natural-terrain.js';
import { isWaterScenery } from '../world/river-geometry.js';
import { jiuzhaigouTrees, valleyBlocked, JIUZHAIGOU_SPAWN } from '../world/jiuzhaigou.js';

// 重建战场瞬态；死亡续游先恢复统计和波次，再按正确难度生成敌人。
export function resetBattlefield(game, continuation = null) {
  resetWaves(game, continuation?.wave ?? 1, continuation);
  resetEncounters(game);
  game.time = continuation?.time ?? 0;
  game.kills = continuation?.kills ?? 0;
  game.chopped = continuation?.chopped ?? 0;
  game.roundBosses = continuation?.roundBosses ?? 0;
  game.bossKillsAt = continuation?.bossKillsAt ?? 0;
  // 续接只属于当前可见的结算，不跨重置或重新载入保留。
  game.pendingClearingRound=0;
  game.player = {
    mapId: game.mapId || 'forest',
    flying: false,
    amphibious: false,
    treePass: false,
    x: GAMEPLAY_VALUES.player.spawnX,
    y: GAMEPLAY_VALUES.player.spawnY,
    hp: game.maxHp(),
    angle: -0.4,
    flash: 0,
    invincible: 0,
    aimHold: 0,
    walkPhase: 0,
    bodyAnimation: createCatMotion(),
    recoil: createRecoil(),
  };
  if (game.mapId === 'jiuzhaigou') Object.assign(game.player, JIUZHAIGOU_SPAWN);
  game.trees = [];
  game.enemies = [];
  game.particles = [];
  game.numbers = [];
  game.shots = [];
  game.drops = [];
  game.stumps = [];
  game.hazards = [];
  game.enemyBolts = [];
  game.rangedShotTimer = 0;
  game.projectiles = []; game.gravityFields = [];
  game.remnants = [];
  game.fx = new CombatFX();
  game.attackTimer = GAMEPLAY_VALUES.player.firstAttackDelay;
  // 只有章节重建改用借用快照，原森林与秘境的初始化约定保持原样。
  const loadout=game.story?game.loadout:game.progress;
  game.magazines = createMagazines(loadout);
  game.vehicles = COLLECTED_VEHICLES.map((_, index) =>
    createVehicle(loadout, index),
  );
  game.vehicle = game.vehicles[loadout.vehicleIndex];
  restoreVehicleService(game);
  game.funnel = createFunnelState(game.magazines[12]);
  initializeFunnelLoadouts(game.funnel, loadout);
  game.drone = createFunnelState(null, 'drone');
  game.mechanical = createMechanicalState();
  game.spider = createSpiderState();
  game.weaponCycle = createWeaponCycle();
  game.pulse = createPulseState();
  game.aimLock = null;
  game.boss = null;
  game.nextId = 1;
  game.previewTime = 0;
  // 首页暂不创建地图植被；正式进入时连同碰撞与战场现场一起建立。
  if (!game.worldPending) for (const tree of game.mapId === 'jiuzhaigou' ? jiuzhaigouTrees() : forestLayout()) game.addTree(tree.x, tree.y, tree);
  // 营地采集树已统一安排在疏林布局的边缘，不再额外生成遮挡小屋和麦田的近景树。
  // 首次进入和死亡续游统一经过预警与外围调度，不再预置五只近身怪物。
  updateAimLock(game, 0);
}

// 树木初始化与再生统一从此入口生成，避免属性默认值散落。
export function addTree(game, x, y, details = {}) {
  // 已开垦土地保留，旧树不能在读档或再生时覆盖农作物。
  if(farmCovers(game,{x,y}))return;
  if (game.mapId === 'jiuzhaigou' ? valleyBlocked(x, y, 30) : excludesNaturalScenery(x, y, true) || isWaterScenery(x, y) || (x > 485 && x < 655 && y > 350 && y < 530)) return;
  const zone = biomeAt(x, y, game.mapId);
  game.trees.push({
    id: game.nextId++,
    type: 'tree',
    x,
    y,
    hp: GAMEPLAY_VALUES.forest.treeHealth,
    maxHp: GAMEPLAY_VALUES.forest.treeHealth,
    radius: GAMEPLAY_VALUES.forest.treeRadius,
    variant: zone.tree,
    palette: zone.palette,
    biome: zone.id,
    size: 0.85 + terrainNoise(x, y) * 0.25,
    flash: 0,
    ...details,
  });
}
