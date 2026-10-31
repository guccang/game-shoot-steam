// 修复判定、地面范围与导航共用圆角矩形，循环世界取最近镜像。
import {RESTORATION_AREA} from '../config/restoration-area.js';
import {nearest,worldDistance} from './coordinates.js';
// 同一设施有多个实体时选择最近一处；开工后以已保存的起点固定投料目标。
export function restorationLocation(f,from){
 const sites=f.locations;if(!sites?.length)return f;
 const location=sites.reduce((a,b)=>worldDistance(from,a.site)<=worldDistance(from,b.site)?a:b);
 return {...f,...location};
}
// 基础区贴住建筑前缘，外扩距离构成真正可触发的圆角边界。
export function restorationArea(f){
 const {reach,back,front}=RESTORATION_AREA;
 return {x:f.x,y:f.y+(front-back)/2,width:(f.width||150)+reach*2,height:back+front+reach*2,radius:reach};
}
// 圆角处用欧氏距离，禁止用外接方框让看不到的角落触发修复。
export function inRestorationArea(player,area){
 const p=nearest(area,player),dx=Math.max(0,Math.abs(player.x-p.x)-(area.width/2-area.radius)),dy=Math.max(0,Math.abs(player.y-p.y)-(area.height/2-area.radius));
 return Math.hypot(dx,dy)<=area.radius;
}
