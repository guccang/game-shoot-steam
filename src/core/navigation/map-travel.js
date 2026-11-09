import {facilityOpen} from '../../config/town-restoration.js';
import { GAMEPLAY_VALUES } from '../../config/gameplay-values.js';
import { i18nText } from "../../i18n/index.js";
import { resetSpiderFormation } from '../../combat/spider.js';
import { resetMechanicalFormation } from '../../combat/mechanical.js';
// 地图旅行仅更换地貌和落点；角色成长、当前波次、生命、弹药与载具耐久保持连续。
import { MAPS } from '../../world/maps.js';
import { forestLayout } from '../../world/biomes.js';
import { jiuzhaigouTrees } from '../../world/jiuzhaigou.js';
import { canonical } from '../../world/coordinates.js';
import { landingPoint } from '../../combat/vehicle-landing.js';
import { drySpawn } from '../../physics/motion.js';
import { forgetNaturalRoute } from '../../physics/terrain-navigation.js';
import { resetFunnelFormation } from '../../combat/funnel.js';
import {resetEncounters} from '../battle/encounter-manager.js';

// 战斗中的领主和秘境不允许旅行，避免中断蓄力、挑战结算或秘境检查点。
export function mapTravelReason(game) {
  if(game.progress.logistics?.tow)return '请先解除牵引或将残骸送到维修中心，再跨地图旅行。';
  if(game.campDefense)return '请先完成营地守门结算。';
  if(game.fireActive)return i18nText("core.map-travel.c5d64346b5");
  if (game.story) return i18nText("core.map-travel.fc3e9d412b");
  if (game.realm) return i18nText("core.map-travel.2125782820");
  if (game.state === 'dead') return i18nText("core.map-travel.9667c1b64b");
  if (game.boss) return i18nText("core.map-travel.e9d299d895");
  return '';
}

// 同页往返保留各地图树木与停留位置；敌人保留血量和波次配额，随玩家重新落位。
export function travelMap(game, id) {
  const destination = MAPS.find(m => m.id === id);
  if (id!=='forest'&&!facilityOpen(game.progress,'travel'))return false;
  if (!destination || id === game.mapId || mapTravelReason(game)) return false;
  game.mapVisits ||= {};
  game.mapVisits[game.mapId] = { trees: game.trees, stumps: game.stumps, position: canonical(game.player) };
  game.mapId = game.progress.mapId = id;
  const visit = game.mapVisits[id];
  game.trees = visit?.trees || [];
  game.stumps = visit?.stumps || [];
  if (!visit) for (const tree of id === 'jiuzhaigou' ? jiuzhaigouTrees() : forestLayout()) game.addTree(tree.x, tree.y, tree);
  const target = visit?.position || destination.spawn;
  const point = landingPoint({ ...target, mapId: id }, game.trees);
  if (!point) throw new Error(i18nText("core.map-travel.a97c6b4b60"));
  Object.assign(game.player, point, { mapId: id, vx: 0, vy: 0, pushX: 0, pushY: 0 });
  // 遭遇属于当地地图；离开时移除，不结算奖励或改变波次名额。
  game.enemies = game.enemies.filter(e => !e.ambient);
  resetEncounters(game);
  for (let i = 0; i < game.enemies.length; i++) {
    const enemy = game.enemies[i], angle = i * 2.39996;
    const spawn = drySpawn({ x: point.x + Math.cos(angle) * (GAMEPLAY_VALUES.enemy.mapTravelSpawnRadius + i % 3 * GAMEPLAY_VALUES.enemy.mapTravelSpawnRingStep), y: point.y + Math.sin(angle) * (GAMEPLAY_VALUES.enemy.mapTravelSpawnRadius + i % 3 * GAMEPLAY_VALUES.enemy.mapTravelSpawnRingStep), mapId: id });
    const safe = landingPoint(spawn, game.trees);
    Object.assign(enemy, safe || spawn, { mapId: id, pushX: 0, pushY: 0, assault: { phase: 'chase', elapsed: 0, hit: false } });
    delete enemy.groundPursuit; forgetNaturalRoute(enemy);
  }
  for (const key of ['gravityFields', 'enemyBolts', 'projectiles', 'hazards', 'shots', 'particles', 'numbers', 'remnants', 'drops']) game[key] = [];
  game.rangedShotTimer = 0;
  game.fx.items.length = 0;
  game.aimLock = null;
  game.arrivalView = null;
  resetFunnelFormation(game.funnel);
  resetFunnelFormation(game.drone);
  resetMechanicalFormation(game.mechanical);
  resetSpiderFormation(game.spider);
  game.onEvent('map-change', { name: destination.name });
  return true;
}
