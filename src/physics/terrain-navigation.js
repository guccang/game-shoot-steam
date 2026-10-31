import { i18nText } from "../i18n/index.js";
// 自然地貌绕行：小型可见图只在路径被湖山挡住时建立，普通追击仍走直线。
import { NATURAL_TERRAIN, isNaturalBlocked } from '../world/natural-terrain.js';
import { isWaterBlocked, BRIDGE } from '../world/river-geometry.js';
import { nearest, WORLD } from '../world/coordinates.js';
import { JIUZHAIGOU_TERRAIN, JIUZHAIGOU_SPAWN, valleyBlocked } from '../world/jiuzhaigou.js';

const routes = new WeakMap();
const staticEdges = new Map();
const STATIC_EDGE_LIMIT = 4096;
const edgeStats = { hits: 0, misses: 0, warmed: 0 };

// 森林和湖谷的静态边跨伙伴复用；有向绝对坐标键保留周期镜像与采样方向，不缓存移动端点。
function routeLineClear(a, b, radius=12) {
  if (!a.navKey || !b.navKey) return terrainLineClear(a, b, radius);
  const key = `${radius}:${a.mapId || 'forest'}:${a.x}:${a.y}>${b.x}:${b.y}`;
  if (!staticEdges.has(key)) {
    edgeStats.misses++;
    if (staticEdges.size >= STATIC_EDGE_LIMIT) staticEdges.delete(staticEdges.keys().next().value);
    staticEdges.set(key, terrainLineClear(a, b, radius));
  } else edgeStats.hits++;
  return staticEdges.get(key);
}

// 静态角点用整数周期偏移定位，避免跟随者的小数坐标使同一条缓存边出现浮点尾差。
function navigationNodes(body) {
  const nodes = [], terrain = body.mapId === 'jiuzhaigou' ? JIUZHAIGOU_TERRAIN : NATURAL_TERRAIN;
  for (const item of terrain.obstacles) {
    const cx = item.x + Math.ceil((body.x - item.x) / WORLD.width - .5) * WORLD.width;
    const cy = item.y + Math.ceil((body.y - item.y) / WORLD.height - .5) * WORLD.height;
    const b = item.bounds, pad = 30;
    for (const x of [b.x - pad, b.x + b.w + pad]) for (const y of [b.y - pad, b.y + b.h + pad]) {
      const point = { x: cx + x, y: cy + y, mapId: body.mapId, navKey: `${item.id}:${x}:${y}` };
      if (!terrainBlocked(point.x, point.y, 12, body.mapId)) nodes.push(point);
    }
  }
  // 河流的合法跨岸入口必须进入导航图，不能只登记湖山的外侧角点。
  if(body.mapId!=='jiuzhaigou')for(const x of [BRIDGE.x-32,BRIDGE.x+BRIDGE.width+32]){
    const point=nearest({x,y:BRIDGE.y+BRIDGE.height/2},body);
    nodes.push({...point,mapId:body.mapId,navKey:`bridge:${x}`});
  }
  return nodes;
}

// 仅预热静态边；战斗中的动态起终点和搜索顺序仍同步执行，未预热也不延迟单位行动。
export class NavigationWarmup {
  // 调度状态属于应用实例，静态判定结果由有界缓存跨实例复用。
  constructor() { this.steps = null; this.key = ''; this.slices = 0; this.maxSliceMs = 0; }
  // 地图或镜像组合变化时替换未完成批次；已算好的边继续由有界缓存复用。
  prepare(body) {
    const nodes = navigationNodes(body);
    const key = `${body.mapId || 'forest'}:${nodes.map(p => `${p.x},${p.y}`).join(';')}`;
    if (key === this.key) return;
    this.key = key; this.steps = this.edges(nodes);
  }
  // 每条有向边独立让出执行权，缓存的是原采样判定而不是近似导航结果。
  *edges(nodes) {
    for (const a of nodes) for (const b of nodes) {
      if (a === b) continue;
      const misses = edgeStats.misses;
      routeLineClear(a, b); edgeStats.warmed += edgeStats.misses - misses;
      yield;
    }
  }
  // 固定步数上限保护测试时钟和极低精度计时器，实际预算由应用的剩余帧时间决定。
  advance(budget = 1, now = () => performance.now()) {
    if (!this.steps || !(budget > 0)) return;
    const start = now(); let count = 0;
    while (this.steps && count++ < 128 && now() - start < budget)
      if (this.steps.next().done) this.steps = null;
    this.slices++; this.maxSliceMs = Math.max(this.maxSliceMs, now() - start);
  }
  // 销毁只撤销预热任务，共享缓存仍保持容量上限。
  dispose() { this.steps?.return(); this.steps = null; }
  // 诊断区分预热与按需查询，不能将预热时间混入战斗武器阶段。
  stats() { return { ...edgeStats, count: staticEdges.size, limit: STATIC_EDGE_LIMIT,
    pending: !!this.steps, slices: this.slices, maxSliceMs: this.maxSliceMs }; }
}
// 不可达状态按时间重新尝试时清理旧的失败路线，避免依赖渲染帧数。
export function forgetNaturalRoute(body) { routes.delete(body); }

// 通行采样同时包含河流与湖山，扑击和路径搜索使用同一个判定。
export function terrainBlocked(x, y, radius = 12, mapId = 'forest') {
  if (mapId === 'jiuzhaigou') return valleyBlocked(x, y, radius);
  return isWaterBlocked(x, y, radius) || isNaturalBlocked(x, y, radius);
}

// 以短步长检查整段路线；可单独传入河流判定以保留原有桥头导航。
export function terrainLineClear(a, b, radius = 12, blocked = (x, y, r) => terrainBlocked(x, y, r, a.mapId)) {
  const target = nearest(b, a), steps = Math.max(1, Math.ceil(Math.hypot(target.x - a.x, target.y - a.y) / 8));
  for (let i = 0; i <= steps; i++)
    if (blocked(a.x + (target.x - a.x) * i / steps, a.y + (target.y - a.y) * i / steps, radius)) return false;
  return true;
}

// 在湖岸或山脚之外找最近干地；靠近参考单位的方向优先，循环世界保持最近镜像。
export function nearestDryTerrain(point, reference = point, radius = 12) {
  const blocked = (x, y, r) => terrainBlocked(x, y, r, point.mapId || reference.mapId);
  if (!blocked(point.x, point.y, radius)) return { x: point.x, y: point.y };
  const near = nearest(reference, point), angle = Math.atan2(near.y - point.y, near.x - point.x);
  for (let distance = 16; distance <= 800; distance += 16) {
    for (let i = 0; i < 32; i++) {
      const a = angle + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * Math.PI / 16;
      const x = point.x + Math.cos(a) * distance, y = point.y + Math.sin(a) * distance;
      if (!blocked(x, y, radius)) return { x, y };
    }
  }
  // 当前生成器保证主路保留；极端自定义地貌下也返回已验证的干地，不静默留在障碍中。
  const fallback = nearest(point.mapId === 'jiuzhaigou' ? JIUZHAIGOU_SPAWN : { x: 900, y: 700 }, point);
  if (!blocked(fallback.x, fallback.y, radius)) return fallback;
  throw new Error(i18nText("physics.terrain-navigation.ce35c14d65"));
}

// 用包围盒外侧角点构成小型导航图，保证绕行路线不会切入不规则湖湾。
function planRoute(body, goal, radius=12) {
  // 每条候选边都检查端点；端点已在障碍内时不存在可行边，直接返回原有等待结果。
  if (terrainBlocked(body.x, body.y, radius, body.mapId) || terrainBlocked(goal.x, goal.y, radius, body.mapId)) return [];
  const nodes = [{ x: body.x, y: body.y, mapId: body.mapId }, { ...goal, mapId: body.mapId }];
  nodes.push(...navigationNodes(body));
  const costs = nodes.map(() => Infinity), previous = nodes.map(() => -1), visited = new Set();
  costs[0] = 0;
  for (let step = 0; step < nodes.length; step++) {
    let current = -1;
    for (let i = 0; i < nodes.length; i++)
      if (!visited.has(i) && (current < 0 || costs[i] < costs[current])) current = i;
    if (current < 0 || !Number.isFinite(costs[current])) break;
    if (current === 1) {
      const path = [];
      for (let i = 1; i > 0; i = previous[i]) path.unshift(nodes[i]);
      return path;
    }
    visited.add(current);
    for (let next = 0; next < nodes.length; next++) {
      if (visited.has(next)) continue;
      const distance = Math.hypot(nodes[next].x - nodes[current].x, nodes[next].y - nodes[current].y);
      if (costs[current] + distance >= costs[next] || !routeLineClear(nodes[current], nodes[next],radius)) continue;
      costs[next] = costs[current] + distance; previous[next] = current;
    }
  }
  return [];
}

// 缓存每只单位的绕行点；目标明显移动或路线失效才重规划，抵达角点自动取后续路段。
export function naturalWaypoint(body, target, radius=12) {
  const goal = nearest(target, body);
  if (terrainLineClear(body, goal,radius)) return goal;
  let route = routes.get(body);
  if (!route || route.mapId !== body.mapId || route.radius!==radius || Math.hypot(route.goal.x - goal.x, route.goal.y - goal.y) > 64) {
    route = { goal, radius, mapId: body.mapId, path: planRoute(body, goal,radius), misses: 0 }; routes.set(body, route);
  }
  for (let i = route.path.length - 1; i >= 0; i--)
    if (terrainLineClear(body, route.path[i],radius)) return route.path[i];
  // 受击可能把单位推到原路线另一侧；有限频率重试，不能每帧重建不可达路径。
  if (++route.misses >= 30) routes.delete(body);
  return { x: body.x, y: body.y };
}
