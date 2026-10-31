import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
// 消防接警仅在黑屏中回镇；后续世界碰撞、原猫步态与真实轮相共用正式物理。
import {FIRE_RESCUE as C,FIRE_TRANSFER} from '../config/fire-rescue.js';
import {FIRE_TOWN_ARRIVAL} from '../world/fire-navigation.js';
import {moveBody} from '../physics/motion.js';
import {WORLD,nearest,worldDistance} from '../world/coordinates.js';
import {advanceVehicleWheels} from '../combat/vehicle-motion.js';
import {updateCatMotion} from './cat-motion.js';
import {updateRecoil} from '../combat/recoil.js';
// 切换动作只写路径和时钟，保持猫猫与消防车当前世界位置。
export function beginFireTransit(game,phase,path,wait=GAMEPLAY_VALUES.fire.transitWaitSeconds){
 const r=game.fireRescue;r.phase=phase;r.transit={path:path.map(p=>({x:p.x,y:p.y})),step:0,speed:0,wait};r.route=r.transit.path;r.stream=null;r.filling=false;
 game.player.vx=game.player.vy=game.player.pushX=game.player.pushY=0;
}
// 新接警和旧版卡住检查点共用回镇入口，原地先黑屏，不在可见画面中跳坐标。
export function beginFireTownTransfer(game){
 beginFireTransit(game,'transferring',[FIRE_TOWN_ARRIVAL],0);
 game.fireRescue.townApproach=true;game.fireRescue.transit.transferElapsed=0;game.fireRescue.transit.transferred=false;
}
// 遮罩逐帧读取同一逻辑时钟，暂停、刷新与减少动态都不会提前暴露换位。
export function fireTransferOpacity(game){
 if(game.fireRescue?.phase!=='transferring')return 0;
 const elapsed=game.fireRescue.transit.transferElapsed||0;
 return Math.max(0,Math.min(1,elapsed/FIRE_TRANSFER.fadeOut,(FIRE_TRANSFER.duration-elapsed)/(FIRE_TRANSFER.duration-FIRE_TRANSFER.fadeInAt)));
}
// 每帧按加速、刹车距离和碰撞扫掠移动，最后一步也不超过当帧允许的位移。
export function advanceFireTransit(game,dt){
 const r=game.fireRescue,m=r.transit,p=game.player,previous={x:p.x,y:p.y};if(!m)return false;
 game.time+=dt;game.fx.update(dt);p.invincible=Math.max(0,p.invincible-dt);p.flash=Math.max(0,p.flash-dt);
 updateRecoil(p.recoil,game.loadout.weapon,dt);
 p.vx=p.vy=0;
 if(r.phase==='transferring'){
  m.transferElapsed=Math.min(FIRE_TRANSFER.duration,(m.transferElapsed||0)+dt);
  if(!m.transferred&&m.transferElapsed>=FIRE_TRANSFER.relocateAt){
   Object.assign(p,nearest(FIRE_TOWN_ARRIVAL,p),{vx:0,vy:0,pushX:0,pushY:0});m.transferred=true;
  }
  updateCatMotion(p.bodyAnimation,dt,0,false);
  return m.transferElapsed>=FIRE_TRANSFER.duration;
 }
 if(m.wait>0)m.wait=Math.max(0,m.wait-dt);
 else if(m.step<m.path.length){
  const target=nearest(m.path[m.step],p),dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy);
  const maximum=game.vehicle.active?C.garageSpeed:C.walkSpeed;
  m.speed=Math.min(maximum,m.speed+C.transitAcceleration*dt,(game.vehicle.active||m.step===m.path.length-1?Math.sqrt(2*C.transitAcceleration*d):maximum));
  const distance=Math.min(d,m.speed*dt);
  if(d>1e-8)moveBody(p,dx/d*distance,dy/d*distance,WORLD,12,game.trees);
  if(worldDistance(p,m.path[m.step])<1e-6){m.step++;}
  if(d>1&&!game.vehicle.active)p.angle=Math.atan2(dy,dx);
  const actual=nearest(p,previous);p.vx=dt?(actual.x-previous.x)/dt:0;p.vy=dt?(actual.y-previous.y)/dt:0;
 }
 r.route=m.path.slice(m.step);
 const moved=worldDistance(p,previous),walking=!game.vehicle.active&&moved>0;
 advanceVehicleWheels(game.vehicle,p,previous);updateCatMotion(p.bodyAnimation,dt,dt?moved/dt:0,walking);
 const rest=Math.ceil(p.walkPhase/Math.PI)*Math.PI;p.walkPhase=walking?p.walkPhase+dt*12:p.walkPhase+(rest-p.walkPhase)*Math.min(1,dt*14);
 return m.step>=m.path.length&&m.wait<=0;
}
