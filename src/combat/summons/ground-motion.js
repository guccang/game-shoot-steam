import {spiderFollowWaypoint} from './spider-navigation.js';
// 地面召唤物共用部署、碰撞行走与局部分离；各自步态参数保持原样。
import { SUMMON_RECOVERY, MECHANICAL_ESCORT } from '../../config/summon-behavior.js';
import { nearest, WORLD } from '../../world/coordinates.js';
import { blocked, moveBody } from '../../physics/motion.js';
import { nearestDryTerrain, naturalWaypoint } from '../../physics/terrain-navigation.js';
import { MECHANICAL_VEHICLE_SPACING } from '../../config/mechanical-loadout.js';
import { mechanicalVehicleWaypoint } from '../mechanical-formation.js';

// 出生与归队使用可通行脚底位置；玩家在载具中越水时，小猫仍留在干地。
export function deployNode(game, node, count) {
  const angle = node.index * Math.PI * 2 / count, owner = game.player;
  node.arena = owner.arena; node.mapId = owner.mapId;
  const origin = owner.arena && owner.arena.terrain !== 'forest' ? owner : nearestDryTerrain(owner, owner, node.radius||9);
  // 机械伙伴在车壳外落脚；共享部署入口中的蜘蛛不套用此间距。
  const startRadius=game.vehicle?.active&&!node.spider&&!node.mother?MECHANICAL_VEHICLE_SPACING.spawnRadius:32;
  for (let radius = startRadius; radius <= startRadius+48; radius += 16) {
    for (let turn = 0; turn < 8; turn++) {
      const a = angle + turn * Math.PI / 4, x = origin.x + Math.cos(a) * radius, y = origin.y + Math.sin(a) * radius;
      if (!blocked(x, y, node.radius||9, game.trees, node)) {
        node.x = x; node.y = y; node.ready = true; return;
      }
    }
  }
  node.ready = false;
}

// 目标落点先落在实际脚底可站立的干地和战斗圈内；不移动伙伴本身。
export function groundDestination(game,node,goal){
  let point=nearest(goal,node);const radius=node.radius||9,a=node.arena;
  if(a){const center=nearest(a,node),dx=point.x-center.x,dy=point.y-center.y,d=Math.hypot(dx,dy),limit=a.radius-radius-1;
    if(d>limit)point={x:center.x+dx/d*limit,y:center.y+dy/d*limit};}
  if(!blocked(point.x,point.y,radius,game.trees,node))return point;
  for(let distance=12;distance<=192;distance+=12)for(let i=0;i<24;i++){
    const angle=Math.atan2(node.y-point.y,node.x-point.x)+i*Math.PI/12;
    const p={x:point.x+Math.cos(angle)*distance,y:point.y+Math.sin(angle)*distance};
    if(!blocked(p.x,p.y,radius,game.trees,node))return p;
  }
  return {x:node.x,y:node.y};
}

// 行走相位只积累真实位移；树干前侧向绕行，不穿过地形或用瞬移完成近战。
export function walkNode(game, node, goal, speed, dt, approach = null) {
  node.worldBarriers=game.player.worldBarriers; // 维修护栏与主人共享，寻路和实际行走使用同一边界。
  let route;
  if(node.mother){
    // 落点以主人为参考，母体绕门移动时不会把同一个跟随位置反复投到护栏两侧。
    const home=groundDestination(game,{...node,x:game.player.x,y:game.player.y},goal);
    route=spiderFollowWaypoint(game,node,home);
  }else route=node.arena&&node.arena.terrain!=='forest'?nearest(goal,node):naturalWaypoint(node,groundDestination(game,node,goal),node.radius||9);
  // 拐角路点需要走到再转弯，不能提前套用终点减速后停在转角外。
  if(route.transit&&approach)approach={...approach,stopDistance:0,arrival:Infinity};
  const point=mechanicalVehicleWaypoint(game,node,route);
  const dx = point.x - node.x, dy = point.y - node.y, length = Math.hypot(dx, dy);
  node.moving = length > 1e-6 && length >= (approach?.stopDistance??2);
  if (!node.moving || dt<=0) return;
  // 只为归队启用到达减速，攻击、出舱及其他伙伴保留原速度和停步规则。
  if(approach)speed=Math.min(speed,length*approach.arrival);
  const desired=Math.atan2(dy,dx);
  if(node.returnEase>0) {
    // 观察结束缓起步并沿最短角度转身，不突然整只翻向主人。
    speed*=.25+.75*(1-node.returnEase/SUMMON_RECOVERY.returnEase);
    node.angle+=Math.atan2(Math.sin(desired-node.angle),Math.cos(desired-node.angle))*(1-Math.exp(-dt*7));
    node.returnEase=Math.max(0,node.returnEase-dt);
  } else if(approach) {
    const turn=Math.atan2(Math.sin(desired-node.angle),Math.cos(desired-node.angle));
    node.angle+=Math.max(-approach.turnSpeed*dt,Math.min(approach.turnSpeed*dt,turn));
  } else node.angle=desired;
  const distance = Math.min(speed * dt, length), ox = node.x, oy = node.y;
  moveBody(node, dx / length * distance, dy / length * distance, WORLD, node.radius||9, game.trees);
  if (Math.hypot(node.x - ox, node.y - oy) < distance * .3) {
    const side = node.index % 2 ? 1 : -1;
    moveBody(node, -dy / length * distance * side, dx / length * distance * side, WORLD, node.radius||9, game.trees);
  }
  node.walkPhase += Math.hypot(node.x - ox, node.y - oy) * (node.mother ? .065 : node.spider ? .11 : .16);
  if(approach)node.moving=Math.hypot(node.x-ox,node.y-oy)>.01;
}

// 局部分离只推开活动伙伴，仍走正式地形碰撞，不扩展实体阻路范围。
export function separateNodes(game, nodes, dt) {
  for (let i=0;i<nodes.length;i++) for(let j=i+1;j<nodes.length;j++) {
    const a=nodes[i],b=nodes[j]; if(!a.ready||!b.ready||a.hp<=0||b.hp<=0) continue;
    const point=nearest(b,a); let dx=point.x-a.x,dy=point.y-a.y,d=Math.hypot(dx,dy);
    const gap=a.spider||b.spider?40:MECHANICAL_ESCORT.bodyGap;
    if(d>=gap)continue;
    if(d<.01){dx=Math.cos(i*2.4);dy=Math.sin(i*2.4);d=1;}
    const push=Math.min((gap-d)*.5,(a.spider||b.spider?120:60)*dt);
    moveBody(a,-dx/d*push,-dy/d*push,WORLD,9,game.trees);
    moveBody(b,dx/d*push,dy/d*push,WORLD,9,game.trees);
  }
}
