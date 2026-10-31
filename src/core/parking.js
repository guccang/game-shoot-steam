import {enterParkedWorkshop} from './cottage.js';
import {parkingOccupied,leaveParkedVehicle} from './camp-parking.js';
import {movementLoadFactor} from '../progression/load-weight.js';
// 正常森林的点击停车：可取消的低速对齐和倒车，复用正式碰撞与车轮动作。
import {PARKING as C,PARKING_SPOTS} from '../config/parking.js';
import {pathDistance} from '../world/paths.js';
import {WORLD,nearest,worldDistance} from '../world/coordinates.js';
import {moveBody,blocked} from '../physics/motion.js';
import {advanceVehicleWheels} from '../combat/vehicle-motion.js';
import {updateCatMotion} from './cat-motion.js';

// 普通自有车都可停驻；消防任务、剧情与战斗活动仍使用各自的出入场流程。
export function parkingAvailable(game){
 if(movementLoadFactor(game)===0||game.progress.logistics?.tow)return false;
 return game.mapId==='forest'&&game.vehicle.active&&[0,1,2,3,4,5,6,7,8].includes(game.vehicle.index)&&!game.arrivalCinematic&&!game.realm&&!game.story&&!game.fireActive&&!game.campDefense&&!game.workshopTrial&&!game.player.arena&&!game.boss&&!game.livingBattle&&!game.cottage;
}
// 只有院内泊位及紧邻过道可以候停，路面和路肩即使静止也不会触发。
export function nearestParkingSpot(game){
 const p=game.player;
 return PARKING_SPOTS.map(s=>({s,at:nearest(s,p),front:nearest({x:s.x,y:s.approachY},p)}))
  .filter(({s,at,front})=>!parkingOccupied(game,s.id)&&Math.abs(p.x-at.x)<C.radius&&p.y>=at.y-10&&p.y<=front.y+C.approachMargin)
  .filter(()=>pathDistance(p.x,p.y)>C.roadClearance)
  .sort((a,b)=>worldDistance(p,a.front)-worldDistance(p,b.front))[0]?.s||null;
}
// 每四单位采样完整路线，树干或临时护栏阻挡时不发起自动移动。
export function parkingPathClear(game,path){
 let from=game.player;
 for(const point of path){const to=nearest(point,from),distance=worldDistance(from,to),steps=Math.max(1,Math.ceil(distance/4));
  for(let i=1;i<=steps;i++)if(blocked(from.x+(to.x-from.x)*i/steps,from.y+(to.y-from.y)*i/steps,12,game.trees,game.player))return false;
  from=to;
 }return true;
}
// 每帧只维护候选位；明确点击后的对齐和倒车仍由正式运动控制器推进。
export function updateParking(game,dt,input={x:0,y:0}){
 if(!parkingAvailable(game)){game.parking=null;return false;}
 if(game.state!=='playing')return false;
 const p=game.player,moving=Math.hypot(input.x,input.y)>.01;
 const unsafe=game.enemies.some(e=>e.hp>0&&worldDistance(e,p)<180);
 let state=game.parking;
 if(state&&state.hull!==game.vehicle.index)state=game.parking=null;
 if(state&&['parked','cancelled'].includes(state.phase)){
  const spot=PARKING_SPOTS.find(s=>s.id===state.id),front={x:spot.x,y:spot.approachY};
  if(worldDistance(p,spot)>C.releaseRadius&&worldDistance(p,front)>C.releaseRadius)game.parking=null;
  // 停稳时收枪怠速，居民与世界继续更新；主动驾驶或近身危险立即恢复攻击。
  state.idle=state.phase==='parked'&&!moving&&!unsafe&&Math.hypot(p.vx||0,p.vy||0)<=C.stopSpeed;
  return false;
 }
 if(state&&['align','reverse'].includes(state.phase)){
  if(moving||unsafe){state.phase='cancelled';p.vx=p.vy=0;return false;}
  return advanceParking(game,dt);
 }
 const spot=nearestParkingSpot(game);
 if(!spot||unsafe){game.parking=null;return false;}
 if(!state||state.id!==spot.id){state=game.parking={id:spot.id,hull:game.vehicle.index,phase:'waiting',elapsed:0};game.mainlineSpeech=null;}
 // 候选位只用于点击提示；停留再久也不会接管驾驶。
 state.elapsed=0;state.idle=false;
 return false;
}
// 点击时重新验证车位、驾驶状态、危险与完整路线，随后复用连续倒车。
export function requestParking(game){
 if(!canRequestParking(game))return false;
 const spot=nearestParkingSpot(game),p=game.player;
 const state=game.parking={id:spot.id,hull:game.vehicle.index,phase:'waiting',elapsed:0};
 const at=nearest(spot,p),front=nearest({x:spot.x,y:spot.approachY},p);
 // 先在门外横向对齐，再沿门洞轴线倒入；已在轴线上不多绕一圈。
 const path=Math.abs(p.x-at.x)>2?[{x:p.x,y:Math.max(p.y,front.y)},front,at]:[at];
 if(!parkingPathClear(game,path)){state.phase='cancelled';return false;}
 Object.assign(state,{phase:path.length>1?'align':'reverse',path,step:0,speed:0,stalled:0});
 p.vx=p.vy=0;game.mainlineSpeech=null;
 return true;
}
// 沿路径连续倒车；真正停稳并安全下车后，库内泊位直接进入所属建筑。
function advanceParking(game,dt){
 const s=game.parking,p=game.player,previous={x:p.x,y:p.y},target=nearest(s.path[s.step],p);
 const dx=target.x-p.x,dy=target.y-p.y,distance=Math.hypot(dx,dy);
 s.speed=Math.min(C.speed,s.speed+C.acceleration*dt,Math.sqrt(2*C.acceleration*distance));
 const step=Math.min(distance,s.speed*dt);
 if(distance>1e-8)moveBody(p,dx/distance*step,dy/distance*step,WORLD,12,game.trees);
 const moved=worldDistance(p,previous);
 s.stalled=moved<.001&&distance>1?s.stalled+dt:0;
 if(s.stalled>.4){s.phase='cancelled';p.vx=p.vy=0;return true;}
 p.vx=dt?(p.x-previous.x)/dt:0;p.vy=dt?(p.y-previous.y)/dt:0;
 advanceVehicleWheels(game.vehicle,p,previous);
 if(game.vehicle.index===1)p.walkPhase=((p.walkPhase+(dy<=0?-1:1)*moved/12)%27+27)%27;
 updateCatMotion(p.bodyAnimation,dt,0,false);game.time+=dt;game.fx.update(dt);
 if(worldDistance(p,target)<1e-6){
  s.step++;s.speed=0;s.phase=s.step>=s.path.length-1?'reverse':'align';
  if(s.step===s.path.length){s.phase='parked';p.vx=p.vy=0;
   const spot=PARKING_SPOTS.find(spot=>spot.id===s.id);
   if(!leaveParkedVehicle(game,spot)){s.phase='cancelled';return true;}
   if(spot.indoor)enterParkedWorkshop(game,spot.id);
   game.onEvent('vehicle-parked',{id:s.id,kind:spot.kind,index:game.vehicle.index});
  }
 }
 return true;
}
// 按钮显示与点击执行共用校验，暂停、敌人接近和正在倒车时不可再次发起。
export function canRequestParking(game){
 return parkingAvailable(game)&&game.state==='playing'&&!['align','reverse'].includes(game.parking?.phase)&&!!nearestParkingSpot(game)&&!game.enemies.some(e=>e.hp>0&&worldDistance(e,game.player)<180);
}
