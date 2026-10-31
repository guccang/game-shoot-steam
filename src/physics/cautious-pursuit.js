// 不可达目标的地面战术：停止靠岸，近处退到安全距离，可达后恢复正常追击。
import { canonical, nearest, worldDistance } from '../world/coordinates.js';
import { riverXAt } from '../world/river-geometry.js';
import { terrainBlocked, terrainLineClear, forgetNaturalRoute } from './terrain-navigation.js';
import { navigationTarget } from './motion.js';

const targetTerrain = new WeakMap();

// 同一目标本帧只查一次地形，异常存档或测试站在障碍中也按不可达处理。
function targetBlocked(target) {
  let cached = targetTerrain.get(target);
  if (!cached || cached.mapId !== target.mapId || cached.x !== target.x || cached.y !== target.y) {
    cached = { x: target.x, y: target.y, mapId: target.mapId, blocked: terrainBlocked(target.x, target.y, 12, target.mapId) };
    targetTerrain.set(target, cached);
  }
  return cached.blocked;
}

// 只选择完整可走且增大距离的短路段；无路可退时原地警戒，不向水边挤压。
function retreatGoal(body, target, safeDistance) {
  const distance = worldDistance(body, target);
  if (distance >= safeDistance) return { x: body.x, y: body.y };
  const near = nearest(target, body), away = Math.atan2(body.y - near.y, body.x - near.x);
  const sign = (body.id || 0) % 2 ? 1 : -1;
  const travel = Math.min(72, safeDistance + 12 - distance);
  for (const length of [travel, Math.min(24, travel)]) {
    for (const turn of [0, 0.3, -0.3, 0.65, -0.65, 1, -1, 1.3, -1.3]) {
      const angle = away + turn * sign;
      const goal = { x: body.x + Math.cos(angle) * length, y: body.y + Math.sin(angle) * length };
      if (worldDistance(goal, target) > distance + 1 && terrainLineClear(body, goal)) return goal;
    }
  }
  return { x: body.x, y: body.y };
}

// 规划频率独立于帧率；短暂擦过岸线不反复切换，正常绕山和过桥不视为不可达。
export function cautiousPursuit(body, target, dt, navigate, dangerRange = 320) {
  const blocked = targetBlocked(target);
  let state = body.groundPursuit;
  if (state && !state.cautious) { delete body.groundPursuit; state = null; }
  if (state) {
    state.clock -= dt; state.retry -= dt;
    state.dryFor = blocked ? 0 : state.dryFor + dt;
    const moved = worldDistance(target, state.target) > 48;
    const landed = !blocked && ((!target.flying && !target.amphibious) || state.dryFor >= 0.5 - 1e-8);
    if (landed && (!state.noRoute || state.retry <= 0 || moved)) {
      if (state.noRoute) forgetNaturalRoute(body);
      delete body.groundPursuit; state = null;
    }
  }
  if (!blocked && !state) {
    if (!navigate) return { goal: body, direct: false, holding: false };
    const direct = terrainLineClear(body, target), goal = navigationTarget(body, target, direct);
    if (direct || worldDistance(body, goal) > 1) return { goal, direct, holding: false };
  }
  if (!state) {
    const p = canonical(body);
    state = body.groundPursuit = { cautious: true, side: p.x < riverXAt(p.y) ? -1 : 1,
      dryFor: 0, clock: 0, retry: 0.75, noRoute: !blocked,
      target: { x: target.x, y: target.y }, goal: null };
  }
  if (navigate && (state.clock <= 0 || !state.goal || worldDistance(target, state.target) > 48)) {
    state.goal = retreatGoal(body, target, Math.max(240, dangerRange + (body.radius || 17) + 48 + Math.abs(body.id || 0) % 5 * 8));
    state.target = { x: target.x, y: target.y }; state.clock = 0.25;
  }
  return { goal: navigate ? nearest(state.goal || body, body) : body, direct: false, holding: true };
}
