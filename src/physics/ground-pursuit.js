// 地面追踪将真实攻击目标与可达移动目标分离；河面悬停使用本岸站位，不反复绕桥。
import { canonical, nearest } from '../world/coordinates.js';
import { isWaterBlocked, riverXAt, riverHalfWidth } from '../world/river-geometry.js';
import { clearWaterPath, navigationTarget } from './motion.js';
import { isNaturalBlocked } from '../world/natural-terrain.js';
import { nearestDryTerrain, naturalWaypoint } from './terrain-navigation.js';
import { cautiousPursuit } from './cautious-pursuit.js';
import { valleyBlocked } from '../world/jiuzhaigou.js';
import {settlementPursuit} from './settlement-pursuit.js';

const terrainCache = new WeakMap();
const shoreCache = new Map();
const naturalShoreCache = new Map();
const PLAN_INTERVAL = 0.25;
const LAND_SETTLE = 0.5;

// 湖山岸边站位按位置、方位与体积共享，飞行目标停留时不让每只追兵每帧扫描湖面。
function naturalStation(body, target) {
  const p = canonical(target), near = nearest(body, target), radius = Math.ceil(((body.radius || 12) + 8) / 8) * 8;
  const sector = Math.round(Math.atan2(near.y - target.y, near.x - target.x) / (Math.PI / 4));
  const x = Math.round(p.x / 24) * 24, y = Math.round(p.y / 24) * 24;
  const key = `${body.mapId}:${x}:${y}:${sector}:${radius}`;
  let point = naturalShoreCache.get(key);
  if (!point) {
    const a = sector * Math.PI / 4;
    point = nearestDryTerrain({ x, y, mapId: body.mapId }, { x: x + Math.cos(a) * 600, y: y + Math.sin(a) * 600 }, radius);
    if (naturalShoreCache.size >= 256) naturalShoreCache.delete(naturalShoreCache.keys().next().value);
    naturalShoreCache.set(key, point);
  }
  return nearest(point, body);
}

// 同一玩家位置的地形检测供所有追兵共享；桥面仍按可通行地面处理。
export function hoveringOverWater(target) {
  if (!target.flying && !target.amphibious) return false;
  if (target.mapId === 'jiuzhaigou') return valleyBlocked(target.x, target.y, 12);
  const old = terrainCache.get(target);
  if (old && old.x === target.x && old.y === target.y) return old.water;
  const water = isWaterBlocked(target.x, target.y, 12) || isNaturalBlocked(target.x, target.y, 12);
  terrainCache.set(target, { x: target.x, y: target.y, water });
  return water;
}

// 岸边站位按体积、编号分列，量化地形查询并限制缓存数量，避免每只怪每帧扫描河道。
function shorePosition(body, target, side) {
  const radius = Math.ceil((body.radius || 12) / 8) * 8;
  const id = Math.abs(body.id || 0);
  const slot = body.type === 'boss' ? 0 : id % 7 - 3;
  const row = body.type === 'boss' ? 0 : Math.floor(id / 7) % 3;
  const y = Math.round((target.y + slot * (radius * 2 + 12)) / 24) * 24;
  const cy = canonical({ x: 0, y }).y;
  const key = `${cy}:${side}:${radius}:${row}`;
  let point = shoreCache.get(key);
  if (!point) {
    let x = riverXAt(cy) + side * (riverHalfWidth(cy, side) + radius + 20 + row * (radius * 2 + 12));
    // 瀑布和水潭比河道宽，必须依据同一地形判定继续向外寻找干地。
    for (let i = 0; i < 20 && isWaterBlocked(x, cy, radius); i++) x += side * 8;
    point = { x, y: cy };
    if (shoreCache.size >= 256) shoreCache.delete(shoreCache.keys().next().value);
    shoreCache.set(key, point);
  }
  return nearest(point, body);
}

// 沿弯曲河岸走短段；直线被河弯阻挡时先向外侧退让，不能回到绕桥分支。
function shoreWaypoint(body, station, side) {
  const goal = nearest(station, body);
  if (clearWaterPath(body, goal)) return goal;
  const dy = Math.max(-96, Math.min(96, goal.y - body.y));
  let outward = body.x * side;
  for (let i = 0; i <= 8; i++) {
    const y = body.y + dy * i / 8;
    const cy = canonical({ x: 0, y }).y;
    const bank = nearest({ x: riverXAt(cy) + side * (90 + (body.radius || 12)), y: cy }, body);
    outward = Math.max(outward, bank.x * side);
  }
  const next = { x: outward * side, y: body.y + dy };
  return clearWaterPath(body, next) ? next : { x: next.x, y: body.y };
}

// 每只追兵保留当前岸侧；落地或稳定飞回陆地后恢复原有桥梁寻路。
export function groundPursuit(body, target, dt, navigate = true, dangerRange = 320) {
  // 秘境平台没有森林河岸，领主与普通怪物共用直接追击与平台边界。
  if (body.arena) return { goal: target, direct: true, holding: false };
  const fence=settlementPursuit(body,target,dt,navigate);
  if(fence)return fence;
  // 杂兵和近战领主不能跨水攻击，保持警戒距离；远程领主仍可在岸上施法。
  if (body.type !== 'boss' || body.kind === 'boar' || body.kind === 'moss')
    return cautiousPursuit(body, target, dt, navigate, dangerRange);
  if (body.mapId === 'jiuzhaigou') {
    const water = hoveringOverWater(target);
    const goal = water ? naturalStation(body, target) : target;
    return { goal: navigate ? naturalWaypoint(body, goal) : body, direct: !water && clearWaterPath(body, target), holding: water };
  }
  // 湖上的两栖目标与湖山上方的飞行目标共用干地站位，避免追兵走进水中。
  if ((target.flying || target.amphibious) && isNaturalBlocked(target.x, target.y, 12)) {
    delete body.groundPursuit;
    const station = naturalStation(body, target);
    return { goal: navigate ? naturalWaypoint(body, station) : body, direct: false, holding: true };
  }
  const water = hoveringOverWater(target);
  let state = body.groundPursuit;
  if (water && !state) {
    const p = canonical(body);
    state = body.groundPursuit = {
      side: p.x < riverXAt(p.y) ? -1 : 1,
      dryFor: 0, drySide: 0, clock: 0, station: null, goal: null,
    };
  }
  if (state) {
    if (water) state.dryFor = 0;
    else {
      const p = canonical(target), side = p.x < riverXAt(p.y) ? -1 : 1;
      if (side !== state.drySide) state.dryFor = 0;
      state.drySide = side;
      state.dryFor += dt;
    }
    if ((!target.flying && !target.amphibious) || state.dryFor >= LAND_SETTLE - 1e-8) {
      delete body.groundPursuit;
      state = null;
    }
  }
  if (!state) {
    // 前摇与回位沿既定轨迹运行，不额外重复扫描普通追击路径。
    if (!navigate) return { goal: body, direct: false, holding: false };
    const direct = clearWaterPath(body, target);
    return { goal: navigationTarget(body, target, direct), direct, holding: false };
  }
  state.clock -= dt;
  if (state.clock <= 0 || !state.goal) {
    state.station = shorePosition(body, target, state.side);
    state.goal = shoreWaypoint(body, state.station, state.side);
    state.clock = PLAN_INTERVAL;
  }
  return { goal: nearest(state.goal, body), direct: false, holding: true };
}
