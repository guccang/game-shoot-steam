// 兽潮屏外入场选点：读取正式镜头，只在营门前场与原战区内寻找可连续走入的落点。
import {CAMP_DEFENSE} from '../config/camp-defense.js';
import {nearest,worldDistance} from '../world/coordinates.js';
import {blocked} from '../physics/motion.js';
// 路径逐段检查原地形、树木及围栏，避免团子出生在河岸另一侧或卡在障碍后。
function clearEntryPath(game,from,to){
 const r=game.campDefense,target=nearest(to,from),steps=Math.ceil(worldDistance(from,target)/16),body={mapId:game.mapId,arena:r.arena};
 for(let i=0;i<=steps;i++){const t=i/Math.max(1,steps);if(blocked(from.x+(target.x-from.x)*t,from.y+(target.y-from.y)*t,24,game.trees,body))return false;}
 return true;
}
// 没有有效镜头或全景已覆盖整个战区时，交回原出生规则，不把配额阻塞在屏外选点上。
export function findCampOffscreenSpawn(game){
 const r=game.campDefense,v=game.arrivalView,cfg=CAMP_DEFENSE.spawn;
 if(!r||!v||v.width!==game.viewport?.width||v.height!==game.viewport?.height)return null;
 const p=nearest(game.player,r.barrier),bounds={left:p.x+v.left,right:p.x+v.right,top:p.y+v.top,bottom:p.y+v.bottom},g=r.gate,b=r.barrier;
 const target={x:b.x+g.nx*95,y:b.y+g.ny*95},margin=cfg.offscreenMargin,start=game.random();
 for(let i=0;i<6;i++){
  const t=(start+i*.61803398875)%1,lateral=(t-.5)*cfg.width,depth=cfg.depth+t*cfg.depthSpread;
  // 前沿优先，侧前方候补；北门在长屏上也能从左右边缘走入，西门优先从左侧走入。
  const candidates=g.nx<0?[
   {x:Math.min(bounds.left-margin,b.x-cfg.depth),y:b.y+lateral},
   {x:b.x-depth,y:bounds.top-margin},{x:b.x-depth,y:bounds.bottom+margin},
  ]:[
   {x:b.x+lateral,y:Math.min(bounds.top-margin,b.y-cfg.depth)},
   {x:bounds.left-margin,y:b.y-depth},{x:bounds.right+margin,y:b.y-depth},
  ];
  for(const spot of candidates){
   if(worldDistance(spot,r.arena)>r.arena.radius-25||worldDistance(spot,p)<CAMP_DEFENSE.spawn.depth-90)continue;
   if(game.enemies.some(e=>e.hp>0&&worldDistance(e,spot)<e.radius+24))continue;
   if(clearEntryPath(game,spot,target))return spot;
  }
 }
 return null;
}
