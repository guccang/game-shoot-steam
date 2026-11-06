import {PASTURE,PEN_RAILS} from '../config/pasture.js';
import {worldBuildingBlocked} from '../world/building-collision.js';
import {monsterHitProfile} from '../config/monster-hit-reactions.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
// 轻量二维物理：分步碰撞、惯性与冲量；碎片另带高度轴，重力不会歪曲来弹方向。
import { isWaterBlocked, BRIDGE, riverXAt } from '../world/river-geometry.js';
import {livingFacilityBlocked} from '../world/living-spaces.js';
import {settlementAt,settlementBlocked} from '../world/settlements.js';
import { canonical, nearest, delta, WORLD } from '../world/coordinates.js';
import { SpatialGrid } from '../world/spatial-grid.js';
import { terrainBlocked, terrainLineClear, naturalWaypoint, nearestDryTerrain } from './terrain-navigation.js';
import { BodyGrid } from './body-grid.js';
import { isMountainBlocked } from '../world/natural-terrain.js';
import { valleyBlocked } from '../world/jiuzhaigou.js';

// 领主承受短促位移但不失衡；配合至少六倍质量，普通枪冲量约为基础怪的十分之一。
const BOSS_PUSH_LIMIT = GAMEPLAY_VALUES.physics.bossPushLimit, BOSS_PUSH_DRAG = GAMEPLAY_VALUES.physics.bossPushDrag;

// 河岸、湖山及树干统一使用脚底圆形碰撞体，桥面是河流通道。
export function blocked(x, y, radius = 12, trees = [], body = null) {
  if(trees.mineScene)return !trees.mineScene.walkable(x,y,radius,!!body?.flying);
  // 建筑墙体连低空载具也不能穿过；飞行仍可跨越水面、树木与普通围栏。
  if(worldBuildingBlocked(x,y,radius,body||{}))return true;
  if(body?.flying)return false;
  if(body?.mapId==='forest'&&!body.arena){
    const dx=delta(x-PASTURE.x,WORLD.width),dy=delta(y-PASTURE.y,WORLD.height);
    if(Math.abs(dx)<=130+radius&&Math.abs(dy)<=52+radius&&PEN_RAILS.some(([x1,y1,x2,y2])=>dx>=x1-radius&&dx<=x2+radius&&dy>=y1-radius&&dy<=y2+radius))return true;
  }
  // 停驻车体的边界跟随正式泊位；上车后记录移除，正常驾驶立即恢复通行。
  if(!body?.flying&&(body?.parkingBarriers||[]).some(b=>Math.abs(delta(x-b.x,WORLD.width))<b.width/2+radius&&Math.abs(delta(y-b.y,WORLD.height))<b.height/2+radius))return true;
  // 维修护栏只阻挡地面实体，位置与地图镜像一致，气垫船也不能穿过木栏。
  if(!body?.flying&&(body?.worldBarriers||[]).some(b=>Math.abs(delta(x-b.x,WORLD.width))<b.width/2+radius&&Math.abs(delta(y-b.y,WORLD.height))<b.height/2+radius))return true;
  if(body?.mapId==='forest'&&!body.flying&&(!body.arena||body.arena.terrain==='forest')&&settlementBlocked(x,y,radius))return true;
  if(body?.livingCollision&&!body.flying&&livingFacilityBlocked(x,y,radius))return true;
  // 主场景秘境同时遵守圆形区域与森林碰撞；旧平台夹具保留兼容路径。
  if (body?.arena) {
    if (Math.hypot(delta(x-body.arena.x,WORLD.width),delta(y-body.arena.y,WORLD.height)) > body.arena.radius - radius) return true;
    if (body.arena.terrain !== 'forest') return false;
  }
  // 两栖能力只影响水面，树干与山体沿用原碰撞；省略能力参数时仍按步行检测。
  if (body?.mapId === 'jiuzhaigou'
    ? valleyBlocked(x, y, radius, body.amphibious)
    : body?.amphibious ? isMountainBlocked(x, y, radius) : terrainBlocked(x, y, radius)) return true;
  // 红狼可碾压树干；此处只判断通行，实际驶过后才毁树，寻路查询不能破坏环境。
  if(body?.treePass)return false;
  const candidates = trees.query ? trees.query(x, y, x, y, radius) : trees;
  for (const t of candidates) {
    if (t.hp <= 0) continue;
    const dx = delta(t.x - x, WORLD.width), dy = delta(t.y - y, WORLD.height);
    if (dx * dx + dy * dy < (t.radius + radius) ** 2) return true;
  }
  return false;
}
// 小步扫掠并沿障碍滑动，避免高速冲量穿过狭窄河道或树干。
export function moveBody(body, dx, dy, bounds, radius = 12, trees = []) {
  if(trees.mineScene){const n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/4));for(let i=0;i<n;i++){if(!blocked(body.x+dx/n,body.y,radius,trees,body))body.x+=dx/n;if(!blocked(body.x,body.y+dy/n,radius,trees,body))body.y+=dy/n;}return;}
  // 野外敌人不能沿门洞或飞行闯入聚落；剧情和独立战斗圈沿用各自边界。
  if(body.mapId==='forest'&&['enemy','boss'].includes(body.type)&&!body.story&&!body.arena&&!settlementAt(body)&&settlementAt({x:body.x+dx,y:body.y+dy}))return;
  // 静止刚体无需重复扫描河岸与树干；原地移动不会产生位置修正。
  if (dx === 0 && dy === 0) return;
  // 所有秘境单位（含飞行载具与击退）都受同一平台边界约束。
  if (body.arena) {
    // 圈心选择玩家所在的最近世界镜像，跨地图边界后不会被投影到遥远的原始坐标。
    const a = {...body.arena,...nearest(body.arena,body)}, x = body.x + dx - a.x, y = body.y + dy - a.y;
    // 投影时保留微小内侧余量，避免浮点舍入让边界点被判成墙外。
    const factor = Math.min(1, (a.radius - radius - 1e-6) / Math.max(1, Math.hypot(x, y)));
    dx = a.x + x * factor - body.x; dy = a.y + y * factor - body.y;
    if (a.terrain !== 'forest') { body.x += dx; body.y += dy; return; }
  }
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 4));
  for (let i = 0; i < steps; i++) {
    const x = body.x + dx / steps;
    const y = body.y + dy / steps;
    if (!blocked(x, y, radius, trees, body)) {
      body.x = x;
      body.y = y;
    } else {
      if (!blocked(x, body.y, radius, trees, body)) body.x = x;
      if (!blocked(body.x, y, radius, trees, body)) body.y = y;
    }
  }
}
// 有限加速度和快速刹停保留左手操作的响应，斜向移动不额外加速。
export function driveBody(body, input, speed, dt, bounds, trees = []) {
  const length = Math.max(1, Math.hypot(input.x, input.y)),
    blend = 1 - Math.exp(-GAMEPLAY_VALUES.physics.driveAcceleration * dt);
  body.vx = (body.vx || 0) + ((input.x / length) * speed - (body.vx || 0)) * blend;
  body.vy = (body.vy || 0) + ((input.y / length) * speed - (body.vy || 0)) * blend;
  moveBody(body, body.vx * dt, body.vy * dt, bounds, 12, trees);
}
// 质量与能量决定冲量；连续射击有限叠加，足够大的冲击进入翻滚状态。
export function applyImpulse(body, direction, force, speedLimit = GAMEPLAY_VALUES.combat.normalPushLimit, bossImpact = null, groundedPush = false) {
  if (force <= 0) return;
  if (body.type === 'boss') {
    // 上层注入重击参数，物理模块不反向依赖武器配置。
    const profile = bossImpact || { scale: GAMEPLAY_VALUES.physics.bossImpulseScale, limit: BOSS_PUSH_LIMIT, drag: BOSS_PUSH_DRAG };
    if (!(body.bossPushBoost > 0)) {
      body.bossPushLimit = BOSS_PUSH_LIMIT;
      body.bossPushDrag = BOSS_PUSH_DRAG;
    }
    if (profile.limit > BOSS_PUSH_LIMIT) {
      body.bossPushBoost = GAMEPLAY_VALUES.physics.bossPushBoostSeconds;
      body.bossPushLimit = Math.max(body.bossPushLimit || BOSS_PUSH_LIMIT, profile.limit);
      body.bossPushDrag = Math.min(body.bossPushDrag || BOSS_PUSH_DRAG, profile.drag);
    }
    const strength = force * GAMEPLAY_VALUES.physics.impulseScale * profile.scale / Math.max(GAMEPLAY_VALUES.physics.bossMinMass, body.mass || GAMEPLAY_VALUES.physics.bossMinMass);
    body.pushX = (body.pushX || 0) + direction.x * strength;
    body.pushY = (body.pushY || 0) + direction.y * strength;
    limitPush(body, Math.min(speedLimit, body.bossPushBoost > 0 ? body.bossPushLimit : BOSS_PUSH_LIMIT));
    return;
  }
  const mass = body.mass || (body.tough ? GAMEPLAY_VALUES.physics.toughMass : 1);
  // 普通怪恢复 adc572d 的逐轴叠加上限，所有枪械共用原版受击机制。
  body.pushX = Math.max(-speedLimit, Math.min(speedLimit, (body.pushX || 0) + direction.x * force * GAMEPLAY_VALUES.physics.impulseScale / mass));
  body.pushY = Math.max(-speedLimit, Math.min(speedLimit, (body.pushY || 0) + direction.y * force * GAMEPLAY_VALUES.physics.impulseScale / mass));
  // 地面短推不重新抛起敌人；已被重炮击飞时仍保留现有腾空轨迹。
  body.groundedPush = groundedPush && !(body.z > 1 || body.knockTime > 0);
  if (!groundedPush) tumble(body, Math.hypot(body.pushX, body.pushY), direction.x);
}
// 采用向量限速，斜向集火也不能超过上限；不改写技能状态和前摇时间。
function limitPush(body, limit = BOSS_PUSH_LIMIT) {
  const speed = Math.hypot(body.pushX || 0, body.pushY || 0);
  if (speed > limit) {
    body.pushX *= limit / speed;
    body.pushY *= limit / speed;
  }
}
// 领主只在地面短滑，指数阻尼积分消除帧率差异；撞树或河岸停下，不反弹翻滚。
function stepBossPush(body, dt, bounds, trees) {
  body.knockTime = body.rollAngle = body.z = body.vz = 0;
  if (!(body.bossPushBoost > 0)) {
    body.bossPushLimit = BOSS_PUSH_LIMIT;
    body.bossPushDrag = BOSS_PUSH_DRAG;
  }
  limitPush(body, body.bossPushLimit);
  const drag = body.bossPushDrag || BOSS_PUSH_DRAG,
    decay = Math.exp(-drag * dt),
    vx = body.pushX || 0, vy = body.pushY || 0,
    dx = vx * (1 - decay) / drag,
    dy = vy * (1 - decay) / drag,
    x = body.x, y = body.y;
  moveBody(body, dx, dy, bounds, 12, trees);
  body.pushX = Math.abs(body.x - x) < Math.abs(dx) * 0.5 ? 0 : vx * decay;
  body.pushY = Math.abs(body.y - y) < Math.abs(dy) * 0.5 ? 0 : vy * decay;
  if (Math.hypot(body.pushX, body.pushY) < 0.5) body.pushX = body.pushY = 0;
  body.bossPushBoost = Math.max(0, (body.bossPushBoost || 0) - dt);
}
// 重击继续打断攻击并短暂腾空；具体物种的翻滚或踉跄姿态由后续位移采样。
function tumble(body, speed, direction) {
  if (speed < GAMEPLAY_VALUES.physics.tumbleMinSpeed || body.type === 'boss') return;
  body.knockTime = Math.max(body.knockTime || 0, Math.min(GAMEPLAY_VALUES.physics.knockMaxSeconds, GAMEPLAY_VALUES.physics.knockBaseSeconds + speed / GAMEPLAY_VALUES.physics.knockSpeedScale));
  body.reactionTime = 0;
  body.rollSign = direction < 0 ? -1 : 1;
  body.vz = Math.max(body.vz || 0, Math.min(GAMEPLAY_VALUES.physics.maxLift, speed * GAMEPLAY_VALUES.physics.liftSpeedRatio));
  body.z = Math.max(body.z || 0, 1);
  if (body.assault) body.assault = { phase: 'chase', elapsed: 0, hit: false };
}
// 保留单体入口用于独立物理验证，实际战斗使用统一刚体列表处理连锁碰撞。
export function stepImpulse(body, dt, bounds) {
  stepBodies([body], dt, bounds);
}
// 小步推进、质量加权碰撞与能量衰减，三只及更多怪物可以逐个传递冲击。
export function stepBodies(bodies, dt, bounds, onImpact = () => {}, trees = []) {
  // 空战场、空残块和零步长没有碰撞任务，不为这些调用建立整片树林索引。
  if (!bodies.length || dt <= 1e-8) return;
  // 同一物理帧的树干不移动，只建一次索引供所有碰撞小步复用；死树在精查时排除。
  if (trees.length > 24) trees = new SpatialGrid(trees);
  let remaining = dt;
  const contacts = new Set();
  while (remaining > 1e-8) {
    const h = Math.min(remaining, 1 / 120);
    remaining -= h;
    for (const b of bodies) {
      // 领主位移独立衰减，不进入普通怪物的腾空与翻滚分支。
      if (b.type === 'boss') {
        stepBossPush(b, h, bounds, trees);
        continue;
      }
      b.reactionTime = (b.reactionTime || 0) + h;
      b.knockTime = Math.max(0, (b.knockTime || 0) - h);
      const vx = b.pushX || 0,
        vy = b.pushY || 0,
        speed = Math.hypot(vx, vy),
        x = b.x,
        y = b.y;
      moveBody(b, vx * h, vy * h, bounds, 12, trees);
      if (speed > GAMEPLAY_VALUES.physics.wallImpactMinSpeed && Math.hypot(b.x - x, b.y - y) < speed * h * GAMEPLAY_VALUES.physics.wallBlockedRatio) {
        b.pushX = -vx * GAMEPLAY_VALUES.physics.wallBounceRatio;
        b.pushY = -vy * GAMEPLAY_VALUES.physics.wallBounceRatio;
        onImpact(b, null, speed);
      }
      const travel = Math.hypot(b.x - x, b.y - y);
      // 弱冲量未触发失衡时，扑击锁定轨迹也随位移平移，避免下一次 AI 更新吞掉击退。
      if (!(b.knockTime > 0) && b.assault && b.assault.phase !== 'chase') {
        for (const key of ['originX','endX']) if (Number.isFinite(b.assault[key])) b.assault[key] += b.x - x;
        for (const key of ['originY','endY']) if (Number.isFinite(b.assault[key])) b.assault[key] += b.y - y;
      }
      // 只有圆形团怪累计翻滚；其他物种积累真实后撤行程供腿/轮局部动作使用。
      if(monsterHitProfile(b).roll)b.rollAngle=(b.rollAngle||0)+(travel/Math.max(12,b.radius||17))*(b.rollSign||1);
      else { b.rollAngle=0; b.hitStep=(b.hitStep||0)+travel; b.hitWheel=(b.hitWheel||0)-travel/9*Math.sign(Math.abs(vx)>Math.abs(vy)?vx:vy); }
      b.z = (b.z || 0) + (b.vz || 0) * h;
      b.vz = (b.vz || 0) - GAMEPLAY_VALUES.physics.bodyGravity * h;
      if (b.z < 0) {
        b.z = 0;
        if (b.vz < -GAMEPLAY_VALUES.physics.groundImpactMinSpeed) {
          onImpact(b, null, Math.abs(b.vz));
          b.vz = -b.vz * GAMEPLAY_VALUES.physics.groundBounceRatio;
        } else b.vz = 0;
      }
      const drag = Math.exp(-(b.z > 1 ? GAMEPLAY_VALUES.physics.airDrag : GAMEPLAY_VALUES.physics.groundDrag) * h);
      b.pushX = (b.pushX || 0) * drag;
      b.pushY = (b.pushY || 0) * drag;
      if (speed < 18 && b.knockTime <= 0) {
        b.rollAngle = (b.rollAngle || 0) * Math.exp(-18 * h);
      }
    }
    const grid = new BodyGrid(bodies);
    for (let i = 0; i < bodies.length; i++) {
      let candidates = grid.after(i);
      let coverage = grid.coverage(i);
      for (let k = 0; k < candidates.length; k++) {
        const j = candidates[k];
        const a = bodies[i],
          b = bodies[j],
          dx = delta(b.x - a.x, WORLD.width),
          dy = delta(b.y - a.y, WORLD.height),
          limit = (a.radius || 17) + (b.radius || 17);
        // 空中与地面处于不同碰撞层；空中同类仍保留碰撞和连锁击退。
        if (!!a.flying !== !!b.flying) continue;
        // 保留原始成对顺序与连锁冲量，远处对只做平方距离比较，不分配镜像对象。
        if (dx * dx + dy * dy >= limit * limit) continue;
        const d = Math.hypot(dx, dy);
        const nx = d > 0.001 ? dx / d : 1,
          ny = d > 0.001 ? dy / d : 0,
          ia = a.type === 'boss' ? 0 : 1 / (a.mass || 1),
          ib = b.type === 'boss' ? 0 : 1 / (b.mass || 1),
          penetration = limit - d;
        // 击飞怪物可撞向领主，但只推开怪物，不将枪械冲量间接传给领主。
        if (ia + ib === 0) continue;
        moveBody(
          a,
          ((-nx * penetration * ia) / (ia + ib)) * 0.55,
          ((-ny * penetration * ia) / (ia + ib)) * 0.55,
          bounds,
          12,
          trees,
        );
        moveBody(
          b,
          ((nx * penetration * ib) / (ia + ib)) * 0.55,
          ((ny * penetration * ib) / (ia + ib)) * 0.55,
          bounds,
          12,
          trees,
        );
        // 同步两端的新位置，再找后续编号；挤压新产生的连锁接触不能漏检。
        grid.update(i);
        grid.update(j);
        const nextCoverage = grid.coverage(i);
        if (coverage !== nextCoverage) {
          candidates = grid.after(i, j);
          coverage = nextCoverage;
          k = -1;
        }
        const closing =
          ((a.pushX || 0) - (b.pushX || 0)) * nx + ((a.pushY || 0) - (b.pushY || 0)) * ny;
        if (closing <= GAMEPLAY_VALUES.physics.bodyImpactMinSpeed) continue;
        const source =
          Math.abs((a.pushX || 0) * nx + (a.pushY || 0) * ny) >=
          Math.abs((b.pushX || 0) * nx + (b.pushY || 0) * ny)
            ? a
            : b;
        const impulse = (GAMEPLAY_VALUES.physics.bodyRestitutionScale * closing) / (ia + ib);
        a.pushX = (a.pushX || 0) - impulse * nx * ia;
        a.pushY = (a.pushY || 0) - impulse * ny * ia;
        b.pushX = (b.pushX || 0) + impulse * nx * ib;
        b.pushY = (b.pushY || 0) + impulse * ny * ib;
        // 地面推挤只传递平面动量，避免机枪通过碰撞重新触发整群腾空。
        for (const body of [a, b]) {
          if (source.groundedPush && !(source.z > 1) && !(body.z > 1 || body.knockTime > 0)) body.groundedPush = true;
          else { body.groundedPush = false; tumble(body, Math.hypot(body.pushX, body.pushY), body.pushX); }
        }
        const key = i + ':' + j;
        if (!contacts.has(key)) {
          contacts.add(key);
          onImpact(source, source === a ? b : a, closing);
        }
      }
    }
  }
}
// 保留原接口名；整段通路同时检查河流、湖水和山脚，扑击不能穿越地形。
export function clearWaterPath(a, b, radius = 12) {
  return terrainLineClear(a, b, radius);
}
// 通过两侧桥头导航点绕行；先沿岸到桥，再横穿，避免一直顶住河岸。
export function navigationTarget(body, target, direct = clearWaterPath(body, target)) {
  const goal = nearest(target, body);
  if (direct) return goal;
  if (body.mapId === 'jiuzhaigou') return naturalWaypoint(body, goal);
  if (terrainLineClear(body, goal, 12, isWaterBlocked)) return naturalWaypoint(body, goal);
  const point = canonical(body),
    side = point.x < riverXAt(point.y) ? -1 : 1;
  const bridge = nearest({ x: BRIDGE.x + BRIDGE.width / 2, y: BRIDGE.y + BRIDGE.height / 2 }, body);
  const x = bridge.x + side * (BRIDGE.width / 2 + 30),
    y = bridge.y;
  const end = canonical(target),
    targetSide = end.x < riverXAt(end.y) ? -1 : 1;
  const exit = { x: bridge.x + targetSide * (BRIDGE.width / 2 + 30), y };
  // 进入整个可通行桥面带后向出口推进；群体挤压偏离中线不能触发掉头。
  // 桥沿按正式移动半径留白，防止斜线采样漏掉岸角的极短水域而卡在边缘。
  const onDeck = Math.abs(body.y - y) <= BRIDGE.height / 2 - 12;
  if (onDeck && clearWaterPath(body, exit)) return exit;
  return naturalWaypoint(body, { x, y });
}
// 出生点先修正河道，再避开湖山；绝不让单位出生后被困在新增地貌中。
export function drySpawn(body) {
  if (body.mapId !== 'jiuzhaigou' && isWaterBlocked(body.x, body.y, 12)) {
    const p = canonical(body),
      center = riverXAt(p.y);
    body.x += center + (p.x < center ? -80 : 80) - p.x;
  }
  Object.assign(body, nearestDryTerrain(body));
  return body;
}
// 碎片的平面速度保留弹道方向，高度负责抛物线、落地回弹和摩擦。
export function stepFragment(p, dt) {
  let remaining = dt;
  while (remaining > 1e-8) {
    const h = Math.min(remaining, 1 / 120);
    remaining -= h;
    p.x += p.vx * h;
    p.y += p.vy * h;
    p.z = (p.z || 0) + (p.vz || 0) * h;
    p.vz = (p.vz || 0) - 420 * h;
    if (p.z < 0) {
      p.z = 0;
      p.vz = Math.abs(p.vz) > 25 ? -p.vz * 0.28 : 0;
      p.vx *= 0.78;
      p.vy *= 0.78;
    }
    const drag = Math.exp(-(p.z > 0 ? 1.1 : 7) * h);
    p.vx *= drag;
    p.vy *= drag;
    p.angle += p.spin * h;
  }
}
// 树木受到一次推弯后回正，随后恢复缓慢风摆；竖直来弹也保留可读反馈。
export function treeSway(tree, time) {
  const age = 0.7 - (tree.sway || 0),
    hit = tree.sway > 0 ? Math.sin((age / 0.7) * Math.PI) * 0.15 * (tree.hitX || 0 || 0.6) : 0;
  return Math.sin(time * 0.55 + canonical(tree).x * 0.019) * 0.025 + hit;
}
