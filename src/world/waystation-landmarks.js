// 驿站借用正式地标名称；只查询附近静态目录，不读取全图树木或参与每帧寻路。
import {SETTLEMENTS} from '../config/settlements.js';
import {MONSTER_CAMPS,MONSTER_CAMP_RULES} from '../config/monster-camps.js';
import {WAYSTATION_NAMING as NAMING} from '../config/waystations.js';
import {NATURAL_TERRAIN} from './natural-terrain.js';
import {LAKE_VARIANTS,MOUNTAIN_VARIANTS} from './landscape-variants.js';
import {canonical,nearest} from './coordinates.js';
import {SpatialGrid} from './spatial-grid.js';

// 聚落用围栏矩形、野营地用正式半径、景观用原轮廓，保留各目录的稳定身份。
const landmarks=[
 ...SETTLEMENTS.map(s=>({id:'settlement:'+s.id,name:s.name,x:(s.left+s.right)/2,y:(s.top+s.bottom)/2,shape:'rect',rx:(s.right-s.left)/2,ry:(s.bottom-s.top)/2,radius:Math.hypot(s.right-s.left,s.bottom-s.top)/2,priority:0})),
 ...MONSTER_CAMPS.filter(s=>s.mapId==='forest').map(s=>({id:'camp:'+s.id,name:s.name,x:s.x,y:s.y,shape:'circle',radius:MONSTER_CAMP_RULES.radius,priority:1})),
 ...NATURAL_TERRAIN.obstacles.flatMap(s=>{const name=s.name||(s.kind==='lake'?LAKE_VARIANTS:s.kind==='mountain'?MOUNTAIN_VARIANTS:[]).find(v=>v.id===s.variant)?.name;return name?[{id:'scenery:'+s.id,name,x:s.x,y:s.y,shape:'polygon',outline:s.outline,radius:Math.max(...s.outline.map(p=>Math.hypot(p.x,p.y))),priority:2}]:[];}),
];
const index=new SpatialGrid(landmarks,{cellSize:900}),cache=new Map();

// 多边形内部距离为零，外部取最近线段；大型景观不会因为中心很远而漏掉山脚站点。
function outlineDistance(outline,x,y){
 let inside=false,distance=Infinity;
 for(let i=0,j=outline.length-1;i<outline.length;j=i++){
  const a=outline[j],b=outline[i],dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/length)):0;
  distance=Math.min(distance,(x-a.x-dx*t)**2+(y-a.y-dy*t)**2);
  if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;
 }
 return inside?0:Math.sqrt(distance);
}

// 先取环面最近镜像，再测量实际边界；等距时优先营地，最后按稳定ID确定结果。
export function waystationLandmarkName(point){
 if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)||point.mapId&&point.mapId!=='forest')return '';
 const p=canonical(point),key=p.x+','+p.y;if(cache.has(key))return cache.get(key);
 let best=null,bestDistance=NAMING.nearby;
 for(const item of index.query(p.x,p.y,p.x,p.y,NAMING.nearby)){
  const center=nearest(item,p),x=p.x-center.x,y=p.y-center.y,distance=item.shape==='rect'?Math.hypot(Math.max(0,Math.abs(x)-item.rx),Math.max(0,Math.abs(y)-item.ry)):item.shape==='circle'?Math.max(0,Math.hypot(x,y)-item.radius):outlineDistance(item.outline,x,y);
  if(distance>NAMING.nearby)continue;
  if(!best||distance<bestDistance-1e-7||Math.abs(distance-bestDistance)<=1e-7&&(item.priority<best.priority||item.priority===best.priority&&item.id<best.id)){best=item;bestDistance=distance;}
 }
 const name=best?.name||'';if(cache.size>=NAMING.cacheLimit)cache.delete(cache.keys().next().value);cache.set(key,name);return name;
}
