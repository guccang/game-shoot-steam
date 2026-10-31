// 驾驶队形与车壳避让只驱动真实地面移动，不能改变玩家或地形碰撞体。
import { MECHANICAL_ESCORT as ESCORT } from '../config/summon-behavior.js';
import { nearest, WORLD } from '../world/coordinates.js';
import { moveBody } from '../physics/motion.js';
import { MECHANICAL_VEHICLE_SPACING } from '../config/mechanical-loadout.js';

// 由实际位移估计车速与朝向；方向平滑，停车后逐渐展开护卫圈。
export function advanceMechanicalFormation(game,state,dt) {
  const p=game.player,f=state.follow ||= {x:p.x,y:p.y,speed:0,heading:0,blend:0,idle:1};
  const old=nearest(f,p),dx=p.x-old.x,dy=p.y-old.y,d=Math.hypot(dx,dy);
  f.x=p.x;f.y=p.y;
  const moving=dt>0&&d>.05&&d<120;
  const speed=moving?Math.min(500,d/dt):0;
  f.speed+=(speed-f.speed)*(1-Math.exp(-dt*9));
  f.idle=moving?0:f.idle+dt;
  if(moving){const angle=Math.atan2(dy,dx),delta=Math.atan2(Math.sin(angle-f.heading),Math.cos(angle-f.heading));f.heading+=Math.max(-dt*3,Math.min(dt*3,delta));}
  const target=game.vehicle?.active&&(moving||f.idle<.25)?1:0;
  f.blend+=(target-f.blend)*(1-Math.exp(-dt*3.5));
  return f;
}

// 静止分散、行驶分列后随；二十小蛛使用错列双环且不继承车载猫队形。
export function mechanicalHome(owner,node,count,weapon,follow,riding) {
  const ring=weapon.guardRadius&&count>10?Math.floor(node.index/10):0;
  const slots=weapon.guardRadius&&count>10?Math.min(10,count-ring*10):count;
  const a=(node.index%slots)*Math.PI*2/slots+ring*.31;
  const padding=riding&&!weapon.guardRadius?MECHANICAL_VEHICLE_SPACING.padding:0;
  const radius=weapon.guardRadius?weapon.guardRadius+ring*65:count>5?100:66;
  const x=Math.cos(a)*(radius+padding),y=Math.sin(a)*((weapon.guardRadius?radius*.72:count>5?74:52)+padding)+24;
  if(!riding||weapon.guardRadius){
    // 小队上方的椭圆落点原在车壳内：先投到避让圈外，避免归队与推离互相争抢。
    if(riding&&node.crew){
      const dy=y+10,d=Math.hypot(x,dy),safe=MECHANICAL_VEHICLE_SPACING.clearance+18;
      if(d<safe){const angle=d>.01?Math.atan2(dy,x):a;return {x:owner.x+Math.cos(angle)*safe,y:owner.y-10+Math.sin(angle)*safe};}
    }
    return {x:owner.x+x,y:owner.y+y};
  }
  const columns=Math.min(3,count),row=Math.floor(node.index/columns),inRow=Math.min(columns,count-row*columns);
  const lateral=(node.index%columns-(inRow-1)/2)*64,longitudinal=-110-row*44;
  const c=Math.cos(follow.heading),s=Math.sin(follow.heading),blend=follow.blend;
  return {x:owner.x+x*(1-blend)+(longitudinal*c-lateral*s)*blend,y:owner.y+y*(1-blend)+(longitudinal*s+lateral*c)*blend};
}

// 射线会穿过车壳时先沿圆周走；被急转车辆贴近时优先向外移动。
export function mechanicalVehicleWaypoint(game,node,goal) {
  if(!game.vehicle?.active||node.spider||node.mother)return goal;
  const owner=nearest(game.player,node),cx=owner.x,cy=owner.y-10,r=MECHANICAL_VEHICLE_SPACING.clearance;
  const dx=node.x-cx,dy=node.y-cy,d=Math.hypot(dx,dy),a=d>.1?Math.atan2(dy,dx):node.index*2.4;
  // 小队离开实体避让圈即可沿切线绕行，不能在额外缓冲带内只向外顶住同伴。
  if(d<r+(node.crew?0:5))return {x:cx+Math.cos(a)*(r+12),y:cy+Math.sin(a)*(r+12)};
  const gx=goal.x-node.x,gy=goal.y-node.y,len=gx*gx+gy*gy,t=Math.max(0,Math.min(1,-(dx*gx+dy*gy)/(len||1)));
  if(Math.hypot(dx+gx*t,dy+gy*t)>=r+4)return goal;
  const target=Math.atan2(goal.y-cy,goal.x-cx),turn=Math.atan2(Math.sin(target-a),Math.cos(target-a));
  const next=a+(turn>=0?1:-1)*.4;
  // 小队绕车时经过护卫站位外侧，避免被已停下的同伴反复挤回车壳边缘。
  const bypass=Math.max(r+(node.crew?56:14),d);
  return {x:cx+Math.cos(next)*bypass,y:cy+Math.sin(next)*bypass};
}

// 实际碰撞移动推离扫过的车壳，按帧限速，不瞬移、不穿水或树。
export function clearMechanicalVehicle(game,nodes,dt) {
  if(!game.vehicle?.active)return;
  for(const node of nodes){
    if(!node.ready||node.hp<=0||node.spider||node.mother)continue;
    const owner=nearest(game.player,node),dx=node.x-owner.x,dy=node.y-owner.y+10,d=Math.hypot(dx,dy),r=MECHANICAL_VEHICLE_SPACING.clearance;
    if(d>=r)continue;
    const a=d>.1?Math.atan2(dy,dx):node.index*2.4,push=Math.min(r-d,600*dt),x=node.x,y=node.y;
    moveBody(node,Math.cos(a)*push,Math.sin(a)*push,WORLD,node.radius||9,game.trees);
    const distance=Math.hypot(node.x-x,node.y-y);node.walkPhase+=distance*.16;node.moving ||= distance>.1;
  }
}

// 每只猫保留世界落脚点；小范围绕圈时留守，拉远后错峰选最近方向抄近路归队。
export function naturalMechanicalHome(owner,node,count,follow,riding,dt,nodes=[]) {
  const near=nearest(node,owner),dx=near.x-owner.x,dy=near.y-owner.y,distance=Math.hypot(dx,dy);
  const radius=(riding?ESCORT.vehicleRadius:ESCORT.footRadius)+(node.index%3)*14+(count>5?ESCORT.largePackPadding:0);
  node.escortWait=Math.max(0,(node.escortWait||0)-dt);
  const station=node.escortHome&&nearest(node.escortHome,owner);
  const stationDistance=station?Math.hypot(station.x-owner.x,station.y-owner.y):Infinity;
  const tooClose=stationDistance<(riding?ESCORT.vehicleClearance:ESCORT.footClearance);
  if(!station||tooClose||stationDistance>radius+ESCORT.reselectDistance&&node.escortWait===0||distance>radius+130) {
    // 沿自身所在一侧找近落脚点，不让朝向旋转强迫整队交换位置；极近时用错位角展开。
    const angle=distance>20?Math.atan2(dy,dx):node.index*2.39996;
    const lead=riding?Math.min(28,follow.speed*.12):0;
    let best=null,score=Infinity;
    for(let i=0;i<12;i++) {
      const offset=(i%2?1:-1)*Math.ceil(i/2)*.48,a=angle+offset;
      const point={x:owner.x+Math.cos(a)*radius+Math.cos(follow.heading)*lead,
        y:owner.y+Math.sin(a)*radius*.82+Math.sin(follow.heading)*lead};
      let cost=Math.hypot(point.x-near.x,point.y-near.y);
      for(const other of nodes)if(other!==node&&other.active&&other.hp>0) {
        const p=nearest(other.escortHome||other,point);
        cost+=Math.max(0,ESCORT.personalGap-Math.hypot(point.x-p.x,point.y-p.y))*8;
      }
      if(cost<score){score=cost;best=point;}
    }
    node.escortHome=best;
    node.escortWait=.18+(node.index%4)*.09;
  }
  const goal=nearest(node.escortHome,node);
  // 到达后保留当前位置和朝向，避免在浮点误差与邻居分离之间反复迈步。
  return Math.hypot(goal.x-node.x,goal.y-node.y)<ESCORT.stopDistance?{x:node.x,y:node.y}:goal;
}
