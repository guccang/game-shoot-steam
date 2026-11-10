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

// 线段穿过土壤时距离为零；否则最近点来自端点或矩形四角，保留斜路边缘的真实距离。
function soilDistance(a,b,p){
 const ax=a.x-p.x,ay=a.y-p.y,bx=b.x-p.x,by=b.y-p.y,dx=bx-ax,dy=by-ay;
 let lo=0,hi=1;
 for(const [origin,step,half] of [[ax,dx,HALF_W],[ay,dy,HALF_H]]){
  if(Math.abs(step)<1e-9){if(Math.abs(origin)>half){lo=1;hi=0;break;}}
  else{const t1=(-half-origin)/step,t2=(half-origin)/step;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));}
 }
 if(lo<=hi)return 0;
 let distance=Math.min(Math.hypot(Math.max(0,Math.abs(ax)-HALF_W),Math.max(0,Math.abs(ay)-HALF_H)),Math.hypot(Math.max(0,Math.abs(bx)-HALF_W),Math.max(0,Math.abs(by)-HALF_H)));
 for(const x of [-HALF_W,HALF_W])for(const y of [-HALF_H,HALF_H]){
  const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1)));
  distance=Math.min(distance,Math.hypot(x-ax-t*dx,y-ay-t*dy));
 }
 return distance;
}
// 森林实体路面半宽24，湖谷半宽15；森林渐薄草缘不禁种，周期边缘检查相邻地图镜像。
export function farmOverlapsRoad(point,progress=null){
 if(point.mapId==='forest'&&overlapsCampPlaza(point.x,point.y,24,18))return true;
 // 搬迁后的营路与正式绘制共用路径，旧支路已被草地覆盖后允许重新开垦。
 const plot=point.mapId==='forest'&&campPlotAt(point);
 if(plot&&progress&&ownsCampPlot(progress,plot.id)&&Object.keys(progress.campLayout?.positions||{}).length){for(const path of campRoadNetwork(progress).paths)for(let i=1;i<path.length;i++)if(soilDistance(path[i-1],path[i],nearest(point,path[i-1]))<CAMP_ROAD_WIDTH/2)return true;return false;}
 if(!['forest','jiuzhaigou'].includes(point.mapId))return false;
 const p=canonical(point),radius=point.mapId==='forest'?24:15,index=point.mapId==='forest'?forest:valley;
 const xs=[p.x],ys=[p.y],rx=HALF_W+radius,ry=HALF_H+radius;
 if(p.x<rx)xs.push(p.x+WORLD.width);if(p.x>WORLD.width-rx)xs.push(p.x-WORLD.width);
 if(p.y<ry)ys.push(p.y+WORLD.height);if(p.y>WORLD.height-ry)ys.push(p.y-WORLD.height);
 for(const x of xs)for(const y of ys){
  const seen=new Set();
  for(let cy=Math.floor((y-ry)/CELL);cy<=Math.floor((y+ry)/CELL);cy++)for(let cx=Math.floor((x-rx)/CELL);cx<=Math.floor((x+rx)/CELL);cx++)for(const segment of index.get(cx+','+cy)||[]){
   if(seen.has(segment))continue;seen.add(segment);
   if(soilDistance(segment.a,segment.b,{x,y})<radius)return true;
  }
 }
 return false;
}
