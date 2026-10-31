// 建筑碰撞只使用登记墙体，开放车库不会被整块包围框封死。
import {WORLD_BUILDINGS} from '../config/world-buildings.js';
import {nearest} from './coordinates.js';
// 世界查询与飞行、步行、高速移动共用同一墙体边界；秘境室内由自身边界管理。
export function worldBuildingBlocked(x,y,radius=12,body={}){
 if(body.mapId!=='forest'||body.arena&&body.arena.terrain!=='forest')return false;
 return WORLD_BUILDINGS.some(b=>{
  if(b.conditional&&!body.legendaryBuilding)return false;
  const p=nearest({x,y},b),dx=p.x-b.x,dy=p.y-b.y;
  return b.rects.some(([left,top,right,bottom])=>dx>left-radius&&dx<right+radius&&dy>top-radius&&dy<bottom+radius);
 });
}
