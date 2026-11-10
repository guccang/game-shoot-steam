import {campGateRoads} from './camp-gate-roads.js';
import {hasCampLayoutChanges} from '../config/camp-layout.js';
import {campSurfaceRoads} from './camp-surface-roads.js';
import {roadFootprintDistance} from './road-footprint.js';
import {overlapsCampPlaza} from './camp-plaza.js';
import {campRoadNetwork} from './camp-layout-roads.js';
import {campPlotAt,ownsCampPlot} from '../config/camp-land.js';
import {CAMP_ROAD_WIDTH} from '../config/camp-layout.js';
import {nearest} from './coordinates.js';
// 开垦只避让实际路面与50×36土壤交叠，不把作物高度、草缘或额外留白算成道路。
import {PATHS} from './paths.js';
import {LIVING_ROADS} from '../config/living-world.js';
import {JIUZHAIGOU_PATHS} from './jiuzhaigou.js';
import {canonical,WORLD} from './coordinates.js';

const CELL=128,HALF_W=25,HALF_H=18;
// 与森林道路绘制器保持相同的二次曲线；每段约12单位采样，弯道不使用控制点折线。
function smoothRoad(path){
 const points=[path[0]];let start=path[0];
 for(let i=1;i<path.length-1;i++){
  const control=path[i],end={x:(control.x+path[i+1].x)/2,y:(control.y+path[i+1].y)/2};
  const count=Math.max(2,Math.ceil((Math.hypot(control.x-start.x,control.y-start.y)+Math.hypot(end.x-control.x,end.y-control.y))/12));
  for(let n=1;n<=count;n++){const t=n/count,u=1-t;points.push({x:u*u*start.x+2*u*t*control.x+t*t*end.x,y:u*u*start.y+2*u*t*control.y+t*t*end.y});}
  start=end;
 }
 points.push(path.at(-1));return points;
}
// 静态路段按局部网格索引，种田与野外田生成只检查附近路段，不逐次扫描整张地图。
function roadIndex(paths){
 const cells=new Map();
 for(const path of paths)for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],segment={a,b};
  for(let y=Math.floor(Math.min(a.y,b.y)/CELL);y<=Math.floor(Math.max(a.y,b.y)/CELL);y++)for(let x=Math.floor(Math.min(a.x,b.x)/CELL);x<=Math.floor(Math.max(a.x,b.x)/CELL);x++){
   const key=x+','+y;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(segment);
  }
 }
 return cells;
}
const forest=roadIndex([...PATHS,...LIVING_ROADS].map(smoothRoad));
const valley=roadIndex(JIUZHAIGOU_PATHS.map(path=>path.map(([x,y])=>({x,y}))));

// 森林实体路面半宽24，湖谷半宽15；森林渐薄草缘不禁种，周期边缘检查相邻地图镜像。
export function worldRoadFootprintOverlap(point,progress=null,halfWidth=HALF_W,halfDepth=HALF_H){
 if(progress&&point.mapId==='forest'&&campGateRoads(progress).some(path=>path.some((b,i)=>i&&roadFootprintDistance(path[i-1],b,nearest(point,path[i-1]),halfWidth,halfDepth)<28)))return true;
 if(point.mapId==='forest'&&overlapsCampPlaza(point.x,point.y,halfWidth,halfDepth))return true;
 // 搬迁后的营路与正式绘制共用路径，旧支路已被草地覆盖后允许重新开垦。
 const plot=point.mapId==='forest'&&campPlotAt(point,progress);
 if(progress&&point.mapId==='forest'&&nearest(point,{x:0,y:0}).y< -58)return campSurfaceRoads(progress).some(path=>path.some((b,i)=>i&&roadFootprintDistance(path[i-1],b,nearest(point,path[i-1]),halfWidth,halfDepth)<28));
 if(plot&&progress&&ownsCampPlot(progress,plot.id)&&hasCampLayoutChanges(progress.campLayout)){for(const path of campRoadNetwork(progress).paths)for(let i=1;i<path.length;i++)if(roadFootprintDistance(path[i-1],path[i],nearest(point,path[i-1]),halfWidth,halfDepth)<CAMP_ROAD_WIDTH/2)return true;return false;}
 if(!['forest','jiuzhaigou'].includes(point.mapId))return false;
 const p=canonical(point),radius=point.mapId==='forest'?24:15,index=point.mapId==='forest'?forest:valley;
 const xs=[p.x],ys=[p.y],rx=halfWidth+radius,ry=halfDepth+radius;
 if(p.x<rx)xs.push(p.x+WORLD.width);if(p.x>WORLD.width-rx)xs.push(p.x-WORLD.width);
 if(p.y<ry)ys.push(p.y+WORLD.height);if(p.y>WORLD.height-ry)ys.push(p.y-WORLD.height);
 for(const x of xs)for(const y of ys){
  const seen=new Set();
  for(let cy=Math.floor((y-ry)/CELL);cy<=Math.floor((y+ry)/CELL);cy++)for(let cx=Math.floor((x-rx)/CELL);cx<=Math.floor((x+rx)/CELL);cx++)for(const segment of index.get(cx+','+cy)||[]){
   if(seen.has(segment))continue;seen.add(segment);
   if(roadFootprintDistance(segment.a,segment.b,{x,y},halfWidth,halfDepth)<radius)return true;
  }
 }
 return false;
}

// 农田继续使用固定50×36土壤范围，装饰可传入自己的实际底座。
export function farmOverlapsRoad(point,progress=null){return worldRoadFootprintOverlap(point,progress,HALF_W,HALF_H);}
