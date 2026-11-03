import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
import { turnWeapon } from './weapon-turn.js';
// 浮游炮出击飞控：待机编队、错峰离队、驻点攻击与充能回收，独立于射击时钟。
import { nearest } from '../world/coordinates.js';
import { hitCenter } from './collision.js';
import { FUNNEL_ORBIT } from '../config/funnel-flight.js';
import {DEFAULT_CAMERA_Y,defaultCombatZoom} from '../config/camera.js';

// 三炮共用连续相位，离队与补给不重排槽位；窄屏整体缩小轨道，避免逐点裁切形成停顿。
function orbitPosition(state, node, bounds) {
  const { radiusX, radiusY, centerY, margin } = FUNNEL_ORBIT;
  const rx = Math.min(radiusX, -bounds.minX - margin, bounds.maxX - margin);
  const ry = Math.min(radiusY, centerY - bounds.minY - margin, bounds.maxY - centerY - margin);
  const angle = state.orbitPhase - Math.PI / 2 + (node.index - 1) * Math.PI * 2 / state.nodes.length;
  return { x: Math.cos(angle) * rx, y: centerY + Math.sin(angle) * ry };
}

// 出击锚点受屏幕边缘和活动半径限制；为炮体、后坐、推进器以及右侧和上下 HUD 留出空间。
export function funnelFlightBounds(viewport = {}, extraMargin = 0) {
  const width = viewport.width || 390,
    height = viewport.height || 844;
  const zoom = defaultCombatZoom(width);
  // 默认镜头中心在猫猫前方，纵向安全边界须换算到同一个角色相对坐标。
  return {
    minX: -Math.min(250, Math.max(0, (width / 2 - 40 - extraMargin) / zoom)),
    maxX: Math.min(250, Math.max(0, (width / 2 - 94 - extraMargin) / zoom)),
    // 顶部按当前紧凑生命条与任务条留出150像素，短屏仍能保留环绕猫猫的空间。
    minY: DEFAULT_CAMERA_Y-Math.min(260, Math.max(0, (height / 2 - 150) / zoom)),
    maxY: DEFAULT_CAMERA_Y+Math.min(240, Math.max(0, (height / 2 - 225) / zoom)),
  };
}

// 每门炮记住世界射位而非头顶偏移；目标没移动时不会绕玩家反复换位。
export function createFunnelFlight(index) {
  return {
    vx: 0,
    vy: 0,
    thrust: 0,
    brake: 0,
    mode: 'escort',
    goalX: 0,
    goalY: 0,
    targetId: null,
    station: null,
    targetAt: null,
    delay: 0,
    sortieTime: 0,
    side: index === 0 ? -1 : 1,
    trail: [],
    trailClock: 0,
    arrival: 0,
    replan: 0,
    safety: 0,
  };
}

// 投影到矩形视口和最大活动半径，绝不牵动角色或触发镜头缩放。
function projectPoint(point, bounds) {
  const result = {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, point.x)),
    y: Math.max(bounds.minY, Math.min(bounds.maxY, point.y)),
  };
  const radius = Math.hypot(result.x, result.y);
  if (radius > GAMEPLAY_VALUES.flight.maxRadius) {
    result.x *= GAMEPLAY_VALUES.flight.maxRadius / radius;
    result.y *= GAMEPLAY_VALUES.flight.maxRadius / radius;
  }
  return result;
}

// 视口变窄时立即收回越界部分，暂停也适用；只修正空间，不推进充能或攻击。
export function constrainFunnelViewport(state, viewport) {
  if (!state) return;
  const bounds = funnelFlightBounds(viewport, state.nodes.some(n=>n.weapon?.chargeTime) ? 25 : 0);
  for (const node of state.nodes) {
    const p = projectPoint(node, bounds);
    if (p.x !== node.x) node.flight.vx = 0;
    if (p.y !== node.y) node.flight.vy = 0;
    node.x = p.x;
    node.y = p.y;
    node.flight.trail = node.flight.trail.filter(
      (p) => p.x >= bounds.minX && p.x <= bounds.maxX && p.y >= bounds.minY && p.y <= bounds.maxY,
    );
  }
}

// 按实际挂载射程选择交战距离；安全圈包含实体体积与炮口空间，不扩充武器射程。
export function funnelEngagement(weapon, target) {
  const range = weapon?.range || GAMEPLAY_VALUES.flight.fallbackRange;
  // 挂载近战工具需要接近锯链有效长度，不能沿用远程炮的百单位安全圈。
  if (weapon?.attackKind === 'melee') {
    const maximum = range - 8;
    const minimum = Math.min(maximum - 12, (target.radius || 16) + 24);
    return { minimum, preferred: Math.max(minimum + 8, range * GAMEPLAY_VALUES.flight.meleeRangeRatio), maximum };
  }
  const preferred = Math.min(400, Math.max(100, range * GAMEPLAY_VALUES.flight.rangedRangeRatio));
  const maximum = Math.max(40, range - 16);
  const minimum = Math.min(maximum - 12, Math.max(preferred * GAMEPLAY_VALUES.flight.minimumRangeRatio, (target.radius || 16) + 55));
  return { minimum, preferred: Math.max(minimum + 12, preferred), maximum };
}

// 从目标近侧与视口内候选点选射位；安全、有效射程优先，之后才考虑阵型与前出距离。
function assignStation(node, player, point, target, bounds, nodes) {
  const dx = point.x - player.x,
    dy = point.y - player.y;
  const distance = Math.hypot(dx, dy) || 1,
    ux = dx / distance,
    uy = dy / distance;
  const band = funnelEngagement(node.weapon, target);
  const forward = Math.max(-230, Math.min(230, distance - band.preferred));
  const flank = (node.index - 1) * 48;
  const preferred = { x: ux * forward - uy * flank, y: uy * forward + ux * flank };
  const occupied = nodes
    .filter((n) => n !== node && n.flight.station)
    .map((n) => {
      const p = nearest(n.flight.station, player);
      return { x: p.x - player.x, y: p.y - player.y };
    });
  const candidates = [];
  for (const depth of [0, -65, 65, -130])
    for (const offset of [0, -70, 70, -140, 140]) {
      candidates.push({
          x: ux * (forward + depth) - uy * (flank + offset),
          y: uy * (forward + depth) + ux * (flank + offset),
      });
    }
  // 窄屏、近身和大体型目标可能挤掉理想点，补采视口内射位，避免夹在目标与屏边。
  for (let x = 0; x <= 6; x++)
    for (let y = 0; y <= 6; y++)
      candidates.push({
        x: bounds.minX + (bounds.maxX - bounds.minX) * x / 6,
        y: bounds.minY + (bounds.maxY - bounds.minY) * y / 6,
      });
  let station = projectPoint(preferred, bounds), best = Infinity;
  for (const p of candidates) {
    const candidate = projectPoint(p, bounds);
    const targetDistance = Math.hypot(candidate.x - dx, candidate.y - dy);
    let score = (candidate.x - preferred.x) ** 2 + (candidate.y - preferred.y) ** 2
      + (targetDistance - band.preferred) ** 2 * 2
      + Math.max(0, band.minimum + 12 - targetDistance) ** 2 * 4000
      + Math.max(0, targetDistance - band.maximum) ** 2 * 4000
      + Math.max(0, 48 - Math.hypot(candidate.x, candidate.y + 22)) ** 2 * 2000;
    for (const other of occupied)
      score += Math.max(0, 68 - Math.hypot(candidate.x - other.x, candidate.y - other.y)) ** 2 * 1000;
    if (score < best) { best = score; station = candidate; }
  }
  node.flight.station = { x: player.x + station.x, y: player.y + station.y };
  node.flight.targetAt = { ...point };
  node.flight.replan = GAMEPLAY_VALUES.flight.replanSeconds;
}

// 限加速度与到站减速让长距离离队呈现加速、滑行、刹停，不瞬移或持续绕圈。
function steer(node, goal, h, avoid, follow) {
  const f = node.flight,
    dx = goal.x - node.x,
    dy = goal.y - node.y;
  const distance = Math.hypot(dx, dy) || 1;
  const speed = Math.min(GAMEPLAY_VALUES.flight.cruiseSpeed, distance * GAMEPLAY_VALUES.flight.arrivalGain, Math.sqrt(2 * GAMEPLAY_VALUES.flight.brakingAcceleration * distance));
  const desiredX = (dx / distance) * speed + avoid.x + follow.x;
  const desiredY = (dy / distance) * speed + avoid.y + follow.y;
  let ax = (desiredX - f.vx) * GAMEPLAY_VALUES.flight.steeringGain,
    ay = (desiredY - f.vy) * GAMEPLAY_VALUES.flight.steeringGain;
  const acceleration = Math.hypot(ax, ay);
  if (acceleration > GAMEPLAY_VALUES.flight.maxAcceleration) {
    ax *= GAMEPLAY_VALUES.flight.maxAcceleration / acceleration;
    ay *= GAMEPLAY_VALUES.flight.maxAcceleration / acceleration;
  }
  f.vx += ax * h;
  f.vy += ay * h;
  const velocity = Math.hypot(f.vx, f.vy);
  if (velocity > GAMEPLAY_VALUES.flight.maxSpeed) {
    f.vx *= GAMEPLAY_VALUES.flight.maxSpeed / velocity;
    f.vy *= GAMEPLAY_VALUES.flight.maxSpeed / velocity;
  }
  node.x += f.vx * h;
  node.y += f.vy * h;
}

// 炮体分离与角色避让只修正航线，不改变碰撞、仇恨或玩家位置。
function avoidance(node, nodes, player) {
  let x = 0,
    y = 0;
  for (const other of nodes) {
    if (other === node) continue;
    const dx = node.x - other.x,
      dy = node.y - other.y,
      d = Math.hypot(dx, dy) || 1;
    if (d < 38) {
      x += (dx / d) * (38 - d) * 10;
      y += (dy / d) * (38 - d) * 10;
    }
  }
  const dx = node.x,
    dy = node.y + 22,
    d = Math.hypot(dx, dy) || 1;
  if (d < 40) {
    x += (Math.abs(dx) < 1 ? node.flight.side : dx / d) * (40 - d) * 18;
    y += (dy / d) * (40 - d) * 18;
  }
  // 对逼近目标施加脱离速度，飞行途中也避让安全圈；只影响炮体，不推怪或改伤害。
  if (node.flight.station && node.targetPoint && node.flight.delay <= 0) {
    const tx = node.x - (node.targetPoint.x - player.x);
    const ty = node.y - (node.targetPoint.y - player.y);
    const td = Math.hypot(tx, ty);
    const force = Math.min(480, Math.max(0, node.flight.safety - td) * 12);
    x += (td > 0.01 ? tx / td : node.flight.side) * force;
    y += (td > 0.01 ? ty / td : 0) * force;
  }
  return { x, y };
}

// 出击位置使用世界坐标驻留，角色移动后只有超出安全范围或目标明显移动才重新部署。
export function updateFunnelMovement(game, dt, targets, formations) {
  const s = game.funnel,
    player = game.player,
    reduced = !!game.reducedMotion;
  const prior = s.previousPlayer ? nearest(s.previousPlayer, player) : player;
  const dx = player.x - prior.x,
    dy = player.y - prior.y;
  s.previousPlayer = { x: player.x, y: player.y };
  const bounds = funnelFlightBounds(game.viewport, s.nodes.some(n=>n.weapon?.chargeTime) ? 25 : 0);
  // 战斗与守护休整共用连续相位；暂停和收起武器不会让编队自行跳相位。
  s.orbitPhase = ((s.orbitPhase || 0) + (reduced ? 0 : dt * Math.PI * 2 / FUNNEL_ORBIT.period)) % (Math.PI * 2);
  const goals = [];
  for (const node of s.nodes) {
    const f = node.flight,
      target = s.charging || node.charging ? null : targets[node.index];
    node.targetPoint = targets[node.index] ? nearest(hitCenter(targets[node.index]), player) : null;
    f.arrival = Math.max(0, f.arrival - dt);
    f.replan = Math.max(0, f.replan - dt);
    for (const p of f.trail) {
      p.x -= dx;
      p.y -= dy;
      p.life -= dt;
    }
    f.trail = f.trail.filter((p) => p.life > 0);
    // 出击炮保留世界位置；待机与回收也以真实加速追随，而不是直接粘住角色。
    node.x -= dx;
    node.y -= dy;
    if (node.observation) {
      // 丢失视野后驻留旧位置减速观察，炮口保持最后朝向。
      const anchor=nearest(node.observation,player);
      const goal=projectPoint({x:anchor.x-player.x,y:anchor.y-player.y},bounds);
      f.station={x:player.x+goal.x,y:player.y+goal.y};f.targetAt=null;f.targetId=null;f.delay=0;f.mode='observe';
      f.goalX=goal.x;f.goalY=goal.y;goals.push(goal);
      if(reduced){node.x=goal.x;node.y=goal.y;f.vx=f.vy=f.thrust=f.brake=0;f.trail=[];}
      continue;
    }
    if (reduced) {
      const points =
        s.charging || node.charging
          ? formations.charging
          : target
            ? formations.open
            : formations.folded;
      [node.x, node.y] = points[node.index];
      f.vx = f.vy = f.thrust = f.brake = 0;
      f.trail = [];
      f.station = null;
      f.targetId = null;
      f.delay = 0;
      f.mode = s.charging || node.charging ? 'dock' : target ? 'attack' : 'escort';
      goals.push({ x: node.x, y: node.y });
      continue;
    }
    if (target) {
      const band = funnelEngagement(node.weapon, target);
      f.safety = band.minimum;
      const newTarget = f.targetId !== target.id || !f.station;
      if (newTarget) {
        const departing = f.mode === 'escort' || f.mode === 'dock' || f.mode === 'return';
        assignStation(node, player, node.targetPoint, target, bounds, s.nodes);
        f.targetId = target.id;
        f.sortieTime = 0;
        f.delay = departing ? GAMEPLAY_VALUES.flight.departureSeconds + node.index * GAMEPLAY_VALUES.flight.departureStagger : 0;
        f.mode = f.delay > 0 ? 'launch' : 'outbound';
      }
      const moved = f.targetAt ? nearest(node.targetPoint, f.targetAt) : node.targetPoint;
      let station = nearest(f.station, player);
      const targetDistance = Math.hypot(station.x - node.targetPoint.x, station.y - node.targetPoint.y);
      const local = { x: station.x - player.x, y: station.y - player.y };
      const clipped = projectPoint(local, bounds);
      // 安全距离可提前触发后撤，轻微走位保持驻点；重规划冷却避免边界无解时每帧抖动。
      if (f.replan <= 0 && (
        targetDistance < band.minimum || targetDistance > band.maximum + 8 ||
        Math.hypot(moved.x - f.targetAt.x, moved.y - f.targetAt.y) > GAMEPLAY_VALUES.flight.targetMoveThreshold ||
        Math.hypot(local.x, local.y + 22) < 40 ||
        Math.hypot(clipped.x - local.x, clipped.y - local.y) > 1
      )) {
        assignStation(node, player, node.targetPoint, target, bounds, s.nodes);
        station = nearest(f.station, player);
        f.mode = 'outbound';
      }
      f.delay = Math.max(0, f.delay - dt);
      f.sortieTime += dt;
      const goal = projectPoint({ x: station.x - player.x, y: station.y - player.y }, bounds);
      if (f.delay > 0)
        // 错峰等待期间接续原位置，避免从环绕轨道突然折返头顶。
        goals.push({ x: node.x, y: node.y });
      else {
        if (f.mode === 'launch') f.mode = 'outbound';
        // 向下出击先从侧方绕开角色，保持从编队展开的弧形航线。
        if (goal.y > 10 && f.sortieTime < 0.42) {
          goal.x += f.side * Math.sin(Math.PI * Math.min(1, f.sortieTime / 0.42)) * 75;
        }
        goals.push(projectPoint(goal, bounds));
      }
    } else {
      f.targetId = null;
      f.station = null;
      f.targetAt = null;
      f.delay = 0;
      if (s.charging || node.charging) {
        const [x, y] = formations.charging[node.index];
        goals.push({ x, y });
      } else goals.push(orbitPosition(s, node, bounds));
      if (f.mode !== 'escort' && f.mode !== 'dock') f.mode = 'return';
    }
    f.goalX = goals[node.index].x;
    f.goalY = goals[node.index].y;
  }
  // 地下把驻点、环绕和充能目标都先收进可达空间，避免飞控持续追逐岩壁内的目标。
  if(game.projectFlyingPoint)for(const node of s.nodes){
    const goal=game.projectFlyingPoint(goals[node.index]);goals[node.index]=goal;
    node.flight.goalX=goal.x;node.flight.goalY=goal.y;
    if(reduced){node.x=goal.x;node.y=goal.y;}
  }
  if (!reduced) {
    const steps = Math.max(1, Math.ceil(dt * 120)),
      h = dt / steps;
    for (let k = 0; k < steps; k++) {
      // 同一步先采样全部避让向量，避免炮体更新顺序产生偏置。
      // 地下狭窄泊位允许紧凑收拢，避免避让力将归队炮不断推出合法装填点。
      const forces = s.nodes.map((n) => game.projectFlyingPoint&&(s.charging||n.charging)?{x:0,y:0}:avoidance(n, s.nodes, player));
      for (const node of s.nodes) {
        const returning = !node.flight.station || node.flight.delay > 0;
        const follow =
          returning && dt > 0 ? { x: (dx / dt) * GAMEPLAY_VALUES.flight.followVelocityRatio, y: (dy / dt) * GAMEPLAY_VALUES.flight.followVelocityRatio } : { x: 0, y: 0 };
        steer(node, goals[node.index], h, forces[node.index], follow);
      }
    }
    constrainFunnelViewport(s, game.viewport);
  }
  for (const node of s.nodes) {
    const f = node.flight,
      speed = Math.hypot(f.vx, f.vy),
      goal = goals[node.index];
    const distance = Math.hypot(goal.x - node.x, goal.y - node.y);
    if (!reduced) {
      f.thrust = Math.min(1, speed / 320);
      // 巡航持续推进，不在追随移动槽位时误显示反向制动喷流。
      f.brake = (f.station || s.charging || node.charging) && distance < 65 ? f.thrust : 0;
      // 回收时以相对玩家速度判定停靠，玩家跑动也能完成补给。
      const dockSpeed = f.station || dt <= 0 ? speed : Math.hypot(f.vx - dx / dt, f.vy - dy / dt);
      if (f.delay <= 0 && distance < GAMEPLAY_VALUES.flight.dockDistance && dockSpeed < GAMEPLAY_VALUES.flight.dockSpeed) {
        const next = f.station ? 'attack' : s.charging || node.charging ? 'dock' : 'escort';
        if (next === 'attack' && f.mode !== 'attack') f.arrival = 0.28;
        f.mode = next;
      } else if (f.station && f.delay <= 0) f.mode = 'outbound';
      else if (s.charging || node.charging) f.mode = 'return';
      f.trailClock += dt;
      if (speed > 85 && f.trailClock >= 0.025) {
        f.trail.push({ x: node.x, y: node.y, life: 0.2 });
        f.trailClock = 0;
        if (f.trail.length > 9) f.trail.shift();
      }
    }
    if(node.observation){f.mode='observe';node.angle=node.observation.angle;continue;}
    if (node.targetPoint && !(s.charging || node.charging))
      node.aimAligned=turnWeapon(node,Math.atan2(node.targetPoint.y-player.y-node.y,node.targetPoint.x-player.x-node.x),dt,GAMEPLAY_VALUES.weaponTurn.defaultRate);
    else {
      // 待机沿真实飞行方向转向，归队和停靠仍保留原有朝向逻辑。
      const orbiting = !reduced && !f.station && !(s.charging || node.charging);
      const desired =
        (orbiting && speed > 1) || (f.mode === 'return' && speed > 60)
          ? Math.atan2(f.vy, f.vx)
          : node.index === 0
            ? -2.5
            : node.index === 1
              ? -Math.PI / 2
              : -0.64;
      node.angle +=
        Math.atan2(Math.sin(desired - node.angle), Math.cos(desired - node.angle)) *
        (reduced ? 1 : 1 - Math.exp(-10 * dt));
    }
  }
}
