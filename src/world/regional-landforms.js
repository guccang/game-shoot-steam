// 大世界山湖以真实多边形面积配额生成，沿低频地势聚集，保留旧地标、道路和营地。
import {WORLD,PREVIOUS_FOREST_WORLD} from './coordinates.js';
import {pathBoundsOverlap} from './paths.js';
import {MONSTER_CAMPS} from '../config/monster-camps.js';
import {TERRAIN_COVERAGE} from '../config/terrain-coverage.js';
import {lakeContour,LAKE_VARIANTS,MOUNTAIN_VARIANTS} from './landscape-variants.js';
import {REGIONAL_TERRAIN_SEED,REGIONAL_TERRAIN_ROWS} from '../config/terrain-regions.generated.js';

// 多边形面积用于配额和离线审计，半轴或包围盒不作为实际覆盖率。
export function landformArea(item){return Math.abs(item.outline.reduce((sum,p,i)=>{const q=item.outline[(i+1)%item.outline.length];return sum+p.x*q.y-q.x*p.y;},0))/2;}
// 包围盒保持足够走廊，避免相邻山湖合并为封闭围墙。
function overlap(a,b,pad=0){return a.x<b.x+b.w+pad&&a.x+a.w>b.x-pad&&a.y<b.y+b.h+pad&&a.y+a.h>b.y-pad;}
// 凸包分离轴比矩形更贴合弯曲湖岸，留出通行间距而不浪费整个外接矩形。
function hull(points){
 const sorted=[...points].sort((a,b)=>a.x-b.x||a.y-b.y),cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 const half=list=>{const result=[];for(const p of list){while(result.length>1&&cross(result.at(-2),result.at(-1),p)<=0)result.pop();result.push(p);}result.pop();return result;};
 return [...half(sorted),...half([...sorted].reverse())];
}
// 同一地貌只计算一次凸包，候选失败不进入正式地图。
function separated(a,b,pad=90){
 if(!overlap(a.visualBounds,b.visualBounds,pad))return true;
 const ap=a.hull??=hull(a.outline),bp=b.hull??=hull(b.outline);
 for(const points of [ap,bp])for(let i=0;i<points.length;i++){
  const p=points[i],q=points[(i+1)%points.length],length=Math.hypot(q.x-p.x,q.y-p.y),nx=(p.y-q.y)/length,ny=(q.x-p.x)/length;
  let amin=Infinity,amax=-Infinity,bmin=Infinity,bmax=-Infinity;
  for(const p of ap){const n=(p.x+a.x)*nx+(p.y+a.y)*ny;amin=Math.min(amin,n);amax=Math.max(amax,n);}
  for(const p of bp){const n=(p.x+b.x)*nx+(p.y+b.y)*ny;bmin=Math.min(bmin,n);bmax=Math.max(bmax,n);}
  if(amax+pad<bmin||bmax+pad<amin)return true;
 }
 return false;
}
// 更新同源轮廓和视觉范围；最终一个地貌按剩余面积等比收缩，不改动其他实体。
function bounds(item){
 const xs=item.outline.map(p=>p.x),ys=item.outline.map(p=>p.y);
 item.bounds={x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};
 item.visualBounds={x:item.x+item.bounds.x-60,y:item.y+item.bounds.y-item.height-60,w:item.bounds.w+120,h:item.bounds.h+item.height+120};
 return item;
}
// 不同种子只改变外围地貌；旧生活区和野外营地的稳定编号与坐标保持不变。
export function appendRegionalLandforms(terrain,{regenerate=false,reserved:extraReserved=[]}={}){
 if(!regenerate&&terrain.seed===REGIONAL_TERRAIN_SEED){
  for(const [kind,id,x,y,rx,ry,height,phase,variant] of REGIONAL_TERRAIN_ROWS){
   const outline=kind==='lake'?lakeContour(rx,ry,phase,variant):Array.from({length:64},(_,i)=>{const a=i/64*Math.PI*2,r=1+.07*Math.sin(3*a+phase)+.035*Math.sin(5*a-phase);return {x:Math.cos(a)*rx*r,y:Math.sin(a)*ry*r};});
   const item=bounds({id,group:id,type:'landform',kind,regional:true,x,y,rx,ry,height,phase,variant,beachVariant:'crescent',forestVariant:'pine',outline});
   (kind==='lake'?terrain.lakes:terrain.mountains).push(item);terrain.obstacles.push(item);
  }
  return terrain;
 }
 let state=(terrain.seed^0x78e32a)>>>0;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const reserved=[...extraReserved,{x:0,y:0,w:PREVIOUS_FOREST_WORLD.width+200,h:PREVIOUS_FOREST_WORLD.height+200},
  // 营地西侧工业地在环面另一端，完整保留现有和待购买地块及邻里小院。
  {x:WORLD.width-1450,y:0,w:1450,h:2350},
  ...MONSTER_CAMPS.filter(c=>c.mapId==='forest').map(c=>({x:c.x-570,y:c.y-650,w:1140,h:1200}))];
 const total=WORLD.width*WORLD.height;
 for(const kind of ['lake','mountain']){
  const output=kind==='lake'?terrain.lakes:terrain.mountains,target=total*TERRAIN_COVERAGE[kind];
  let area=output.reduce((n,item)=>n+landformArea(item),0);
  for(let attempt=0;area<target-.01&&attempt<110000;attempt++){
   const x=300+random()*(WORLD.width-600),y=300+random()*(WORLD.height-600);
   const field=Math.sin(x/4900+y/6100)+.55*Math.sin(y/2700-x/7600);
   if(attempt<18000&&(kind==='lake'?field>.9:field<-.5))continue;
   const size=attempt<6000?1:attempt<18000?.7:attempt<45000?.43:.25;
   const rx=(650+random()*850)*size,ry=(470+random()*620)*size,phase=random()*Math.PI*2;
   const variants=kind==='lake'?LAKE_VARIANTS:MOUNTAIN_VARIANTS,variant=variants[Math.floor(random()*variants.length)].id;
   const item=bounds({id:`regional-${kind}-${output.length}`,group:`regional-${kind}-${output.length}`,type:'landform',kind,regional:true,x,y,rx,ry,height:kind==='lake'?0:110+random()*110,phase,variant,beachVariant:'crescent',forestVariant:'pine',outline:kind==='lake'?lakeContour(rx,ry,phase,variant):Array.from({length:64},(_,i)=>{const a=i/64*Math.PI*2,r=1+.07*Math.sin(3*a+phase)+.035*Math.sin(5*a-phase);return {x:Math.cos(a)*rx*r,y:Math.sin(a)*ry*r};})});
   const b=item.visualBounds;
   if(b.x<160||b.y<160||b.x+b.w>WORLD.width-160||b.y+b.h>WORLD.height-160||reserved.some(r=>overlap(b,r,24))||pathBoundsOverlap(b,70))continue;
   // 原河道所在竖带保持完整；湖泊不能覆盖无桥河段或旧渡口。
   if(b.x<1450&&b.x+b.w>1020)continue;
   if(terrain.obstacles.some(other=>!separated(item,other)))continue;
   const remaining=target-area,original=landformArea(item);
   if(original>remaining){const scale=Math.sqrt(remaining/original);item.rx*=scale;item.ry*=scale;item.height*=scale;item.outline=item.outline.map(p=>({x:p.x*scale,y:p.y*scale}));delete item.hull;bounds(item);}
   area+=landformArea(item);output.push(item);terrain.obstacles.push(item);
  }
  if(Math.abs(area-target)>1)throw Error(`地图${kind==='lake'?'湖泊':'山地'}面积不足：${(area/total*100).toFixed(2)}%，不能发布不满足配额的地图。`);
 }
 for(const item of terrain.obstacles)delete item.hull;
 return terrain;
}
