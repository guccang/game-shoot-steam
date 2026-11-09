// 露营与垂钓直接采样正式地貌、水界和碰撞，不铺设假的钓鱼背景。
import {NATURAL_TERRAIN,touchesLandform} from './natural-terrain.js';
import {JIUZHAIGOU_LAKES} from './jiuzhaigou.js';
import {worldDistance,nearest,canonical} from './coordinates.js';
import {blocked} from '../physics/motion.js';
import {TOWN_LAYOUT} from '../config/town-layout.js';
import {OUTDOOR_RULES as R} from '../config/outdoors.js';

// 多边形朝向只计算一次，岸边法线不再依赖湖心，兼容凹湾与狭长湖面。
const shoreEdges=new WeakMap();
function lakeEdges(lake){
 let edges=shoreEdges.get(lake);if(edges)return edges;
 const points=lake.outline,area=points.reduce((sum,a,i)=>{const b=points[(i+1)%points.length];return sum+a.x*b.y-b.x*a.y;},0),sign=area>=0?1:-1;
 edges=points.map((a,i)=>{const b=points[(i+1)%points.length],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);return {a,dx,dy,length,nx:sign*dy/length,ny:-sign*dx/length};}).filter(e=>e.length>0);
 shoreEdges.set(lake,edges);return edges;
}
// 投影到每段真实湖岸，近岸查询先排除远湖，避免按钮逐帧扫描整张地图。
export function fishingShores(game,{maxDistance=Infinity}={}){
 const lakes=game.mapId==='forest'?NATURAL_TERRAIN.lakes:game.mapId==='jiuzhaigou'?JIUZHAIGOU_LAKES.filter(l=>l.kind==='lake'):[];
 const sites=[],body={...game.player,mapId:game.mapId,campProgress:game.progress,livingCollision:game.mapId==='forest',flying:false,amphibious:false};
 for(const lake of lakes){let best=null;
  const center=nearest(lake,game.player),px=game.player.x-center.x,py=game.player.y-center.y,b=lake.bounds;
  if(Math.hypot(Math.max(b.x-px,0,px-b.x-b.w),Math.max(b.y-py,0,py-b.y-b.h))>maxDistance+R.shoreOffset)continue;
  for(const e of lakeEdges(lake)){
   const t=Math.max(0,Math.min(1,((px-e.a.x)*e.dx+(py-e.a.y)*e.dy)/(e.length*e.length)));
   // 最近投影被树挡住时仍尝试端点和中点，导航可以找到同一湖的其他可用岸段。
   for(const u of new Set([t,0,.5,1])){
    const x=center.x+e.a.x+e.dx*u,y=center.y+e.a.y+e.dy*u;
    const stand={x:x+e.nx*R.shoreOffset,y:y+e.ny*R.shoreOffset},distance=Math.hypot(stand.x-game.player.x,stand.y-game.player.y);
    if(distance>maxDistance||best&&distance>=best.distance||blocked(stand.x,stand.y,16,game.trees,body))continue;
    const water={x:x-e.nx*R.floatInset,y:y-e.ny*R.floatInset};
    if(!touchesLandform(lake,water.x,water.y))continue;
    best={...stand,water,lake,mapId:game.mapId,id:'fishing-'+lake.id,name:lake.name||'林间湖泊',distance};
   }
  }if(best)sites.push(best);
 }return sites.sort((a,b)=>a.distance-b.distance);
}
// 帐篷与天幕共同检查整片落点，避开城镇、湖水、道路设施和田块。
export function campPlacement(game){
 const bounds=TOWN_LAYOUT.bounds;
 for(const radius of [80,120,160])for(let i=0;i<12;i++){
  const angle=i*Math.PI/6,site=canonical({x:game.player.x+Math.cos(angle)*radius,y:game.player.y+Math.sin(angle)*radius});
  const town=nearest(site,{x:(bounds.left+bounds.right)/2,y:(bounds.top+bounds.bottom)/2});
  if(game.mapId==='forest'&&town.x>bounds.left-90&&town.x<bounds.right+90&&town.y>bounds.top-90&&town.y<bounds.bottom+90)continue;
  if(game.progress.farm.plots.some(p=>p.mapId===game.mapId&&worldDistance(p,site)<150))continue;
  let clear=true;for(const x of [-82,-40,0,40,82])for(const y of [-50,0,50])if(blocked(site.x+x,site.y+y,18,game.trees,{mapId:game.mapId,livingCollision:game.mapId==='forest'}))clear=false;
  if(clear)return {...site,mapId:game.mapId};
 }return null;
}
