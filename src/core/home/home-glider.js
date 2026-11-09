// 阳台滑翔沿所选方向出发，起飞前确定可步行的着陆点；飞行期间仍由房间保护存档。
import {GLIDERS} from '../../config/gliders.js';
import {HOME_DIRECTIONS,HOME_GLIDER,balconyGlideMeters,floorBalconies} from '../../config/home-construction.js';
import {RANGER_COTTAGE} from '../../world/workshop.js';
import {nearest} from '../../world/coordinates.js';
import {WORLD_UNITS_PER_METER} from '../../world/distance-units.js';
import {townStandingPoint} from '../camp/town-layout.js';
import {updateCatMotion} from '../battle/cat-motion.js';

// 优先找足额航程的落点；沿前方扇面选择空地，所有候选均受实际航程限制。
function landingPoint(game,start,heading,range){
 for(const fraction of [1,.9,.75,.5,.3]){
  for(const turn of [0,.22,-.22,.48,-.48]){
   const angle=heading+turn,d=range*fraction;
   const point=townStandingPoint(game,{x:start.x+Math.cos(angle)*d,y:start.y+Math.sin(angle)*d});
   if(!point)continue;
   const dx=point.x-start.x,dy=point.y-start.y,distance=Math.hypot(dx,dy);
   if(distance>8&&distance<=range+.001&&dx*Math.cos(heading)+dy*Math.sin(heading)>distance*.7)return point;
  }
 }
 return null;
}

// 既有房间、小游戏和载具互斥；没有安全航线时仍留在原阳台。
export function launchHomeGlider(game){
 const room=game.cottage;
 if(room?.kind!=='cottage'||!room.balcony||room.glide||room.arcade||room.sleep||game.vehicle.active||game.state!=='playing'||game.player.hp<=0||!floorBalconies(game.progress.homeDecor,room.floor).includes(room.balcony))return false;
 const side=HOME_DIRECTIONS[room.balcony],house=nearest(RANGER_COTTAGE,room.outside);
 const start={x:house.x+side.dx*44,y:house.y+side.dy*40};
 const model=GLIDERS[game.progress.outdoors?.selectedGlider]||GLIDERS.basic;
 const end=landingPoint(game,start,Math.atan2(side.dy,side.dx),balconyGlideMeters(room.floor,model.ratio)*WORLD_UNITS_PER_METER);
 if(!end){room.glideNotice='前方没有安全落点，请换一侧阳台。';return false;}
 const distance=Math.hypot(end.x-start.x,end.y-start.y);
 room.glideNotice='';
 room.glide={model,end,remaining:distance,distance,height:(room.floor+1)*HOME_GLIDER.floorHeightMeters};
 Object.assign(game.player,start,{vx:0,vy:0,pushX:0,pushY:0});
 game.onEvent?.('cottage-change');return true;
}

// 在当前前方寻找近处空地，保留下滑过程，让高楼远航也可以提前结束。
export function descendHomeGlider(game){
 const room=game.cottage,f=room?.glide,p=game.player;
 if(!f||f.approach||game.state!=='playing'||f.remaining<100)return false;
 const end=landingPoint(game,p,Math.atan2(f.end.y-p.y,f.end.x-p.x),100);
 if(!end){room.glideNotice='前方暂不能着陆，请稍后再试。';return false;}
 f.height*=f.remaining/f.distance;
 f.end=end;f.remaining=f.distance=Math.hypot(end.x-p.x,end.y-p.y);f.approach=true;room.glideNotice='';return true;
}

// 游戏暂停时由房间主循环冻结；连续走完最后一段再交回室外控制。
export function updateHomeGlider(game,dt,steer=0){
 const room=game.cottage,f=room.glide,p=game.player,d=f.remaining;
 // 绕猫猫旋转剩余航段，左右转向不会补充航程。只接受可步行的落点。
 const model=f.model||GLIDERS.basic;
 if(steer&&!f.approach&&d>0){
  const heading=Math.atan2(f.end.y-p.y,f.end.x-p.x)+Math.max(-1,Math.min(1,steer))*model.turn*dt;
  const end={x:p.x+Math.cos(heading)*d,y:p.y+Math.sin(heading)*d};
  if(townStandingPoint(game,end,0))f.end=end;
 }
 // 提前着陆也留出收翼下滑时间，不能在最后十米骤然掉到地面。
 const speed=f.approach?Math.min(model.speed,f.distance/Math.min(6,2+f.height*.2)):model.speed;
 const step=Math.min(d,speed*dt),ratio=d?step/d:1;
 p.x+=(f.end.x-p.x)*ratio;p.y+=(f.end.y-p.y)*ratio;f.remaining=Math.max(0,d-step);
 game.time+=dt;updateCatMotion(p.bodyAnimation,dt,model.speed,false,true);
 if(f.remaining>0)return;
 const safe=townStandingPoint(game,f.end)||townStandingPoint(game,room.outside);
 if(!safe){room.glideNotice='正在等待安全落点';return;}
 Object.assign(p,safe,{vx:0,vy:0});game.cottage=null;game.cottageDoorLatch='cottage';game.onEvent?.('cottage-change');
}
