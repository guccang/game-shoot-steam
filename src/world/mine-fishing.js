// 地下垂钓采样正式水界，抛投线不能跨过未开掘岩壁。
import {mineLayer} from '../progression/mining/mine-layers.js';
import {mineSurfaceAt} from './mine-surface.js';
import {mineOccupancy,mineLineClear} from '../physics/mine-motion.js';
import {OUTDOOR_RULES} from '../config/outdoors.js';
// 给浮漂摆动和浅岸留出余量；完整圆周都属于实际开放水面才允许落漂。
function waterRoom(layer,point){
 for(let i=-1;i<8;i++){const x=point.x+(i<0?0:Math.cos(i*Math.PI/4)*38),y=point.y+(i<0?0:Math.sin(i*Math.PI/4)*38),s=mineSurfaceAt(layer,x,y);if(!s.open||!s.water)return false;}
 return true;
}
// 从当前站位沿邻近方向寻找水内落点，只在开始钓鱼时计算，不增加逐帧地形扫描。
export function mineFishingShore(game){
 const layer=mineLayer(game.progress.mining,game.cottage?.depth||1),p=game.player;
 if(!layer||!mineOccupancy(game,p.x,p.y))return null;
 const facing=p.angle||0;
 for(let radius=40;radius<=OUTDOOR_RULES.castReach;radius+=8)for(let i=0;i<24;i++){
  const angle=facing+i*Math.PI/12,water={x:p.x+Math.cos(angle)*radius,y:p.y+Math.sin(angle)*radius};
  if(!mineSurfaceAt(layer,water.x,water.y).water||!mineLineClear(game,p,water))continue;
  // 留足浮漂和鱼影摆动空间，避免在岸边或狭缝生成陆上浮漂。
  if(!waterRoom(layer,water))continue;
  return {x:p.x,y:p.y,water,distance:0,name:'地下湖岸',mineDepth:game.cottage.depth||1};
 }
 return null;
}
// 地下蓄力延伸始终校验水域，不能套用地表循环地图的湖泊轮廓。
export function mineCastWater(game,shore,charge){
 const p=game.player,edge=shore.water,dx=edge.x-p.x,dy=edge.y-p.y,n=Math.hypot(dx,dy)||1;
 const layer=mineLayer(game.progress.mining,shore.mineDepth);let result=edge;
 for(let d=4;d<=charge*35;d+=4){const q={x:edge.x+dx/n*d,y:edge.y+dy/n*d};if(!waterRoom(layer,q))break;result=q;}
 return result;
}
