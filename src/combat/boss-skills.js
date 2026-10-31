// 专属技能只生成锁定几何，表现与命中共享数据；不在预警后偷偷追踪目标。
import {nearest} from '../world/coordinates.js';

// 以首领朝向和目标快照构建危险区，返回值沿用原危险区生命周期。
export function bossSkillHazards(boss,target,skill,color){
 const p=nearest(target,boss),angle=Math.atan2(p.y-boss.y,p.x-boss.x),dx=Math.cos(angle),dy=Math.sin(angle);
 const base={owner:boss.id,skill:skill.id,x:boss.x,y:boss.y,age:0,warmup:skill.windup,duration:skill.active,
  color,damage:Math.max(1,Math.round((boss.blastDamage??30)*skill.damage)),hit:false,angle};
 if(skill.id==='tusk-sweep')return [{...base,kind:'cone',radius:skill.radius,halfAngle:skill.halfAngle}];
 if(skill.id==='spore-wreath')return Array.from({length:5},(_,i)=>{
  // 六等分中留出背向首领的缺口；中心可暂留，外围不能形成无解封闭圈。
  const a=angle+(i+1)*Math.PI/3;
  return {...base,kind:'spore',x:p.x+Math.cos(a)*skill.orbit,y:p.y+Math.sin(a)*skill.orbit,radius:skill.radius,tick:0};
 });
 if(skill.id==='cross-feathers')return [-1,1].flatMap(side=>{
  const x=boss.x-dy*side*68,y=boss.y+dx*side*68,aim=Math.atan2(p.y-y,p.x-x);
  return [-.10,.10].map(offset=>({...base,kind:'feather',x,y,dx:Math.cos(aim+offset),dy:Math.sin(aim+offset),
   warmup:skill.windup+(side===1?.22:0),duration:skill.length/skill.speed,speed:skill.speed,length:skill.length,radius:skill.radius}));
 });
 if(skill.id==='return-tide')return [{...base,kind:'wave',radius:skill.radius,speed:skill.speed,width:skill.width}];
 if(skill.id==='root-fork')return [-.68,0,.68].map(offset=>({...base,kind:'lane',dx:Math.cos(angle+offset),dy:Math.sin(angle+offset),length:skill.length,radius:skill.radius}));
 if(skill.id==='triple-bounce')return [-1,0,1].map((side,i)=>({...base,kind:'slam',family:'dumpling',
  x:p.x-dy*side*skill.spacing,y:p.y+dx*side*skill.spacing,radius:skill.radius,warmup:skill.windup+i*skill.delay,duration:.3,order:i+1}));
 return [];
}

// 点到有限线段的距离，用于根刺胶囊及扇区两侧边缘的玩家碰撞半径。
function segmentDistance(x,y,dx,dy,length){
 const t=Math.max(0,Math.min(length,x*dx+y*dy));return Math.hypot(x-dx*t,y-dy*t);
}
// 玩家圆与实心扇区／根刺胶囊相交；循环地图先选择最近镜像。
export function bossSkillTouches(hazard,target,targetRadius){
 const p=nearest(target,hazard),x=p.x-hazard.x,y=p.y-hazard.y;
 if(hazard.kind==='lane')return segmentDistance(x,y,hazard.dx,hazard.dy,hazard.length)<=hazard.radius+targetRadius;
 if(hazard.kind!=='cone')return false;
 const distance=Math.hypot(x,y),delta=Math.atan2(Math.sin(Math.atan2(y,x)-hazard.angle),Math.cos(Math.atan2(y,x)-hazard.angle));
 if(distance<=targetRadius)return true;
 if(Math.abs(delta)<=hazard.halfAngle)return distance<=hazard.radius+targetRadius;
 return [-1,1].some(side=>{const a=hazard.angle+side*hazard.halfAngle;return segmentDistance(x,y,Math.cos(a),Math.sin(a),hazard.radius)<=targetRadius;});
}
