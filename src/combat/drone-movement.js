import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
import { turnWeapon } from './weapon-turn.js';
// 无人机战术飞控：固定分工航道、射后换位、惯性跟随与充能归队，由战斗时钟驱动。
import { nearest } from '../world/coordinates.js';
import { hitCenter } from './collision.js';

// 每门炮保留独立飞行状态；位移不改变射速、锁定或共享能源。
export function createDroneFlight(index) {
  return {
    vx: 0,
    vy: 0,
    thrust: 0,
    brake: 0,
    goalX: 0,
    goalY: 0,
    mode: 'escort',
    headingX: 0,
    headingY: -1,
    step: index % 2,
    shots: 0,
    pending: 0,
    patrol: index * 0.7,
  };
}

// 每两发后安排一次短侧移，先留出后坐动作，再启动独立推进器。
export function queueDroneManeuver(node) {
  node.flight.shots++;
  if (node.flight.shots % GAMEPLAY_VALUES.drone.shotsPerManeuver === 0) node.flight.pending = GAMEPLAY_VALUES.drone.maneuverDelay;
}

// 飞行与显示共享硬边界；两翼不穿过角色，中炮保持上方独立航道。
function constrainFlight(node) {
  const f = node.flight;
  const minX = node.index === 0 ? -72 : node.index === 1 ? -38 : 27;
  const maxX = node.index === 0 ? -27 : node.index === 1 ? 19 : 72;
  const x = Math.max(minX, Math.min(maxX, node.x));
  const y = Math.max(-79, Math.min(node.index === 1 ? -55 : -24, node.y));
  if (x !== node.x) f.vx = 0;
  if (y !== node.y) f.vy = 0;
  node.x = x;
  node.y = y;
  const radius = Math.hypot(node.x, node.y);
  if (radius > GAMEPLAY_VALUES.drone.maxRadius) {
    node.x *= GAMEPLAY_VALUES.drone.maxRadius / radius;
    node.y *= GAMEPLAY_VALUES.drone.maxRadius / radius;
    const outward = (f.vx * node.x + f.vy * node.y) / GAMEPLAY_VALUES.drone.maxRadius;
    if (outward > 0) {
      f.vx -= (outward * node.x) / GAMEPLAY_VALUES.drone.maxRadius;
      f.vy -= (outward * node.y) / GAMEPLAY_VALUES.drone.maxRadius;
    }
  }
}

// 明确的两处射位产生短促跃迁；按目标方向微调，而非环绕玩家公转。
function attackPosition(node) {
  const f = node.flight,
    side = f.step % 2;
  const positions = [
    [
      [-66, -29],
      [-40, -62],
    ],
    [
      [-16, -76],
      [16, -76],
    ],
    [
      [40, -62],
      [66, -29],
    ],
  ];
  const [x, y] = positions[node.index][side];
  return [x + f.headingX * 6, y + f.headingY * 5];
}

// 小步积分统一不同帧率的加速和制动；跟随滞后使用环面最短位移，越界不会甩飞。
export function updateDroneMovement(game, dt, targets, formations) {
  const s = game.drone,
    player = game.player,
    reduced = !!game.reducedMotion;
  const prior = s.previousPlayer ? nearest(s.previousPlayer, player) : player;
  const dx = player.x - prior.x,
    dy = player.y - prior.y;
  s.previousPlayer = { x: player.x, y: player.y };
  const active = !s.charging && targets.some(Boolean);
  const points = s.charging ? formations.charging : active ? formations.open : formations.folded;
  for (const node of s.nodes) {
    const f = node.flight,
      target = targets[node.index];
    node.targetPoint = target ? nearest(hitCenter(target), player) : null;
    if (node.targetPoint) {
      const tx = node.targetPoint.x - player.x,
        ty = node.targetPoint.y - player.y;
      const length = Math.hypot(tx, ty) || 1,
        blend = 1 - Math.exp(-GAMEPLAY_VALUES.drone.headingGain * dt);
      f.headingX += (tx / length - f.headingX) * blend;
      f.headingY += (ty / length - f.headingY) * blend;
    }
    if (f.pending > 0) {
      f.pending = Math.max(0, f.pending - dt);
      if (f.pending === 0) f.step++;
    }
    f.patrol += dt;
    let [x, y] = points[node.index];
    if (!reduced && active) [x, y] = attackPosition(node);
    else if (!reduced && !s.charging) {
      const scan = Math.floor(f.patrol / GAMEPLAY_VALUES.drone.patrolPeriod) % 2 ? 1 : -1;
      x += scan * (node.index === 1 ? 12 : 7);
      y += node.index === 1 ? -6 : scan * 6;
    }
    if(node.observation){
      // 观察锚点使用世界坐标；保留独立航道，不再立即折向回收点。
      const anchor=nearest(node.observation,player);x=anchor.x-player.x;y=anchor.y-player.y;f.pending=0;
    }
    // 目标射位同样投影到安全圈内，避免抵住边界仍持续推进的假运动。
    const goalRadius = Math.hypot(x, y);
    if (goalRadius > GAMEPLAY_VALUES.drone.goalRadius) {
      x *= GAMEPLAY_VALUES.drone.goalRadius / goalRadius;
      y *= GAMEPLAY_VALUES.drone.goalRadius / goalRadius;
    }
    f.goalX = x;
    f.goalY = y;
    if (reduced) {
      [node.x, node.y] = node.observation?[x,y]:points[node.index];
      f.vx = f.vy = f.thrust = f.brake = 0;
      // 保留原低动态锚点，充能中炮可以停在左上方，让出中央进度提示。
      const radius = Math.hypot(node.x, node.y);
      if (radius > GAMEPLAY_VALUES.drone.maxRadius) {
        node.x *= GAMEPLAY_VALUES.drone.maxRadius / radius;
        node.y *= GAMEPLAY_VALUES.drone.maxRadius / radius;
      }
      f.mode = s.charging ? 'dock' : active ? 'aim' : 'escort';
    } else {
      // 充能时允许中炮回到左上方专属泊位，其余时刻维持分离航道。
      const steps = Math.max(1, Math.ceil(dt * 120)),
        h = dt / steps;
      for (let i = 0; i < steps; i++) {
        node.x -= (dx * GAMEPLAY_VALUES.drone.followRatio) / steps;
        node.y -= (dy * GAMEPLAY_VALUES.drone.followRatio) / steps;
        const wait = s.deploy > GAMEPLAY_VALUES.funnel.deploySeconds - node.index * GAMEPLAY_VALUES.drone.deployStagger;
        const gx = wait ? formations.folded[node.index][0] : x;
        const gy = wait ? formations.folded[node.index][1] : y;
        let avoidX = 0,
          avoidY = 0;
        // 近距离互相让位，避免切入充能泊位或换向时三门炮叠在一起。
        for (const other of s.nodes) {
          if (other === node) continue;
          const ax = node.x - other.x,
            ay = node.y - other.y;
          const gap = Math.hypot(ax, ay) || 1;
          if (gap < GAMEPLAY_VALUES.drone.separationRadius) {
            avoidX += (ax / gap) * (GAMEPLAY_VALUES.drone.separationRadius - gap) * GAMEPLAY_VALUES.drone.separationGain;
            avoidY += (ay / gap) * (GAMEPLAY_VALUES.drone.separationRadius - gap) * GAMEPLAY_VALUES.drone.separationGain;
          }
        }
        f.vx += ((gx - node.x) * GAMEPLAY_VALUES.drone.steeringGain - f.vx * GAMEPLAY_VALUES.drone.velocityDrag + avoidX) * h;
        f.vy += ((gy - node.y) * GAMEPLAY_VALUES.drone.steeringGain - f.vy * GAMEPLAY_VALUES.drone.velocityDrag + avoidY) * h;
        const speed = Math.hypot(f.vx, f.vy);
        if (speed > GAMEPLAY_VALUES.drone.maxSpeed) {
          f.vx *= GAMEPLAY_VALUES.drone.maxSpeed / speed;
          f.vy *= GAMEPLAY_VALUES.drone.maxSpeed / speed;
        }
        node.x += f.vx * h;
        node.y += f.vy * h;
        constrainFlight(node);
      }
      const speed = Math.hypot(f.vx, f.vy),
        distance = Math.hypot(x - node.x, y - node.y);
      f.thrust = Math.min(1, speed / 145);
      f.brake = distance < 15 ? f.thrust : 0;
      f.mode = s.charging
        ? 'dock'
        : distance > 9
          ? 'dash'
          : speed > 18
            ? 'brake'
            : active
              ? 'aim'
              : 'escort';
    }
    if(node.observation){f.mode='observe';node.angle=node.observation.angle;continue;}
    if (node.targetPoint && !s.charging) {
      node.aimAligned=turnWeapon(node,Math.atan2(node.targetPoint.y-player.y-node.y,node.targetPoint.x-player.x-node.x),dt,GAMEPLAY_VALUES.weaponTurn.defaultRate);
    } else {
      // 归队炮口向外收拢，转向使用最短角度，避免跨越正负 π 时反向旋转。
      const desired = node.index === 0 ? -2.5 : node.index === 1 ? -Math.PI / 2 : -0.64;
      const difference = Math.atan2(Math.sin(desired - node.angle), Math.cos(desired - node.angle));
      node.angle += difference * (reduced ? 1 : 1 - Math.exp(-9 * dt));
    }
  }
}
