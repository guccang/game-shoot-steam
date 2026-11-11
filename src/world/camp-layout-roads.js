import {campBuildingRoadWidth} from '../config/camp-roads.js';
import {campPlacementRegions,campPlacementPoint} from './camp-placement-area.js';
import {resolveCampPlaza} from './camp-plaza.js';
import {campFixedFacilities} from './camp-layout-facilities.js';
import {campDecorDefinition} from '../config/camp-management.js';
import {WORKSHOP_INTERIORS} from '../config/workshop-interiors.js';
import {nearest} from './coordinates.js';
// 有界网格从营地中心生成连通道路树，绕开建筑；正式场景与编辑预览共用结果。
import {CAMP_BUILDINGS,campBuildingPosition} from '../config/camp-layout.js';
import {campPlotAt,ownsCampPlot} from '../config/camp-land.js';
import {campBoundary} from './camp-boundary.js';
// 以道路几何缓存，保存时克隆存档不再丢失结果；最多保留八种布局。
const cache=new Map();let builds=0,hits=0;
// 农田只记录占地，装饰已在摆放/保存时避让路面，不驱动正式道路重算。
function roadKey(progress,layout,ignoreDecor){return JSON.stringify([layout?.positions||{},layout?.gates||{},progress.campLand,(progress.farm?.plots||[]).map(p=>[p.mapId,p.x,p.y]),ignoreDecor?null:progress.campManagement?.items]);}
// 正式路网复用保存阶段同一几何的校验结果，不依赖可被替换的存档对象。
export function campRoadNetwork(progress){return campLayoutRoads(progress,progress.campLayout,{ignoreDecor:true});}
// 诊断缓存复用与重建次数，供布局更新的性能回归检查。
export function campRoadCacheStats(){return {builds,hits,count:cache.size};}
// 路面保持在已购地内，边缘留出一半路宽。
export function ownedLayoutPoint(progress,x,y,margin=0){return [[-margin,-margin],[margin,-margin],[-margin,margin],[margin,margin]].every(([dx,dy])=>{const plot=campPlotAt({x:x+dx,y:y+dy},progress);return plot&&ownsCampPlot(progress,plot.id);});}
// 建筑屋面占地加通路余量，脚底向南保留门口直连段。
export function layoutBuildings(progress,layout){return CAMP_BUILDINGS.filter(b=>{if(progress.campLand?.sites?.[b.id])return true;const p=campPlotAt(b);return b.plotId||p?ownsCampPlot(progress,b.plotId||p.id):b.publicFacility;}).map(b=>{if(b.plaza&&!layout?.positions?.plaza){const p=resolveCampPlaza(progress,layout);return {...b,x:p?.x??b.x,y:p?p.y+p.depth/2:b.y};}return campBuildingPosition(layout,b);});}
// 营门外保留100单位接驳地带，让贴边种子小屋的真实门槛也能连到营路。
// 有界网格先验证连通性，再从门口建立骨架；每条支路就近接入已有路网，只在布局变化时重算。
export function campLayoutRoads(progress,layout=progress.campLayout,{ignoreDecor=false}={}){const key=roadKey(progress,layout,ignoreDecor);if(cache.has(key)){hits++;return cache.get(key);}const result=buildCampLayoutRoads(progress,layout,ignoreDecor);builds++;if(cache.size>=8)cache.delete(cache.keys().next().value);cache.set(key,result);return result;}
// 只有真实占地变化才执行有界网格构建，调用方共享不可变的路径结果。
function buildCampLayoutRoads(progress,layout,ignoreDecor){const boundary=campBoundary(progress,layout),outskirts=campPlacementRegions(progress),bounds=[...boundary.regions,...outskirts],LEFT=Math.floor((Math.min(...bounds.map(r=>r.left))-120)/20)*20,RIGHT=Math.max(...bounds.map(r=>r.right))+120,BOTTOM=Math.max(...bounds.map(r=>r.bottom))+160,TOP=Math.floor((Math.min(...bounds.map(r=>r.top))-120)/20)*20,STEP=Math.max(20,Math.ceil(Math.sqrt((RIGHT-LEFT)*(BOTTOM-TOP)/120000)/20)*20),COLS=Math.ceil((RIGHT-LEFT)/STEP),ROWS=Math.ceil((BOTTOM-TOP)/STEP),buildings=layoutBuildings(progress,layout),regions=[...boundary.regions,...outskirts,...boundary.gates.map(g=>g.horizontal?{left:g.x-g.length/2+8,right:g.x+g.length/2-8,top:g.y-100,bottom:g.y+100}:{left:g.x-100,right:g.x+100,top:g.y-g.length/2+8,bottom:g.y+g.length/2-8})],fixed=campFixedFacilities(progress),fields=(progress.farm?.plots||[]).filter(p=>p.mapId==='forest').map(p=>nearest(p,{x:350,y:650})).filter(p=>p.x>LEFT-60&&p.x<RIGHT&&p.y>TOP-60&&p.y<BOTTOM),blocked=new Uint8Array(COLS*ROWS),parents=new Int32Array(COLS*ROWS).fill(-2),point=i=>({x:LEFT+(i%COLS)*STEP,y:TOP+Math.floor(i/COLS)*STEP});
 for(let i=0;i<blocked.length;i++){const p=point(i);blocked[i]=boundary.grid.query(p.x,p.y,p.x,p.y,28).some(f=>{const q=nearest(p,f);return f.horizontal?Math.abs(q.x-f.x)<f.length/2+28&&Math.abs(q.y-f.y)<33:Math.abs(q.x-f.x)<33&&Math.abs(q.y-f.y)<f.length/2+28;})||(!boundary.regions.some(r=>p.x>=r.left&&p.x<=r.right&&p.y>=r.top&&p.y<=r.bottom)&&!boundary.gates.some(g=>g.horizontal?Math.abs(p.x-g.x)<g.length/2-8&&Math.abs(p.y-g.y)<100:Math.abs(p.y-g.y)<g.length/2-8&&Math.abs(p.x-g.x)<100)&&!campPlacementPoint(progress,p.x,p.y))||!ignoreDecor&&(progress.campManagement?.items||[]).some(d=>d.x!==null&&!campDecorDefinition(d.type)?.passable&&Math.abs(p.x-d.x)<campDecorDefinition(d.type).width/2+34&&Math.abs(p.y-d.y)<campDecorDefinition(d.type).depth/2+34)||![[ -28,-28],[28,-28],[-28,28],[28,28]].every(([dx,dy])=>regions.some(r=>p.x+dx>=r.left&&p.x+dx<=r.right&&p.y+dy>=r.top&&p.y+dy<=r.bottom))||fixed.some(b=>b.rects.some(([l,t,r,bottom])=>p.x>b.x+l-28&&p.x<b.x+r+28&&p.y>b.y+t-28&&p.y<b.y+bottom+28))||fields.some(f=>Math.abs(p.x-f.x)<53&&Math.abs(p.y-f.y)<46)||buildings.some(b=>b.passable&&campBuildingRoadWidth(b)===24&&Math.abs(p.x-b.x)<(b.placementKind==='sign'?46:b.width/2+28)&&Math.abs(p.y-b.y)<40)||buildings.some(b=>!b.passable&&(!b.parking||layout?.positions?.[b.id])&&p.x>b.x-b.width/2-34&&p.x<b.x+b.width/2+34&&p.y>b.y-b.height-20&&p.y<b.y+30)?1:0;}
 const closest=(target,reachable=false)=>{let best=-1,distance=Infinity;for(let i=0;i<blocked.length;i++)if(!blocked[i]&&(!reachable||parents[i]!==-2)){const p=point(i),d=Math.hypot(p.x-target.x,p.y-target.y);if(d<distance){distance=d;best=i;}}return best;};
 const root=closest({x:175,y:675});if(root<0)return {paths:[],unreachable:buildings.map(b=>b.id)};parents[root]=-1;const queue=[root];
 for(let n=0;n<queue.length;n++){const i=queue[n],x=i%COLS,y=Math.floor(i/COLS);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,j=ny*COLS+nx;if(nx>=0&&nx<COLS&&ny>=0&&ny<ROWS&&!blocked[j]&&parents[j]===-2){parents[j]=i;queue.push(j);}}}
 const paths=[],unreachable=[],network=new Set([root]),searchParents=new Int32Array(blocked.length),seen=new Uint32Array(blocked.length);let searchId=0;
 const targets=[...buildings.filter(b=>!progress.campLand?.sites?.[b.id]||ownedLayoutPoint(progress,b.x,b.y)).map(b=>{
 // 广场铺地可通行，连接中心，避免南边邻接房屋时把支路目标放进房屋。
 if(b.plaza)return {id:b.id,width:campBuildingRoadWidth(b),x:b.x,y:b.y-b.height/2,door:{x:b.x,y:b.y-b.height/2}};
 // 停车场地坪可通行，连接东侧入口。
 if(b.placementKind==='pasture')return {id:b.id,width:campBuildingRoadWidth(b),x:b.x,y:b.y-b.height-72,door:{x:b.x,y:b.y-b.height-18}};
 // 后院仓库向西接卸货坪，南侧正对小屋仓库墙体。
 if(b.id==='warehouseDepot')return {id:b.id,width:campBuildingRoadWidth(b),x:b.x-70,y:b.y+62,door:{x:b.x,y:b.y+24}};
 if(b.parking)return {id:b.id,width:56,x:b.x+175,y:b.y-220,door:{x:b.x+175,y:b.y-220}};const room=WORKSHOP_INTERIORS[({'garage':'vehicle','catHome':'cat-home'}[b.id]||b.id)],dy=room?room.door.y-room.site.y:b.id==='cottage'?12:24;return {id:b.id,width:campBuildingRoadWidth(b),x:b.x,y:b.y+72,door:{x:b.x,y:b.y+(b.placementKind==='sign'?28:dy)}};}),...campBoundary(progress,layout).gates.filter(g=>campPlotAt({x:g.x+(g.side==='left'?50:g.side==='right'?-50:0),y:g.y+(g.side==='top'?50:g.side==='bottom'?-50:0)},progress)).map(g=>({id:'gate',width:56,x:g.x+(g.side==='left'?50:g.side==='right'?-50:0),y:g.y+(g.side==='top'?50:g.side==='bottom'?-50:0),door:{x:g.x,y:g.y}}))];
 // 营门先接成外出骨架，再依次连接宽路和细路，避免停车入口先生成平行干道。
 const ordered=targets.sort((a,b)=>(b.id==='gate')-(a.id==='gate')||b.width-a.width);
 for(const t of ordered){const end=closest(t,true);if(end<0||parents[end]===-2||Math.hypot(point(end).x-t.x,point(end).y-t.y)>80){unreachable.push(t.id);continue;}
  // 从入口广度搜索到任意既有道路格，即得绕障后的最短支路；不再沿固定中心树绕远。
  const pending=[end];seen[end]=++searchId;searchParents[end]=-1;let join=-1;
  for(let n=0;n<pending.length;n++){const i=pending[n];if(network.has(i)){join=i;break;}const x=i%COLS,y=Math.floor(i/COLS);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,j=ny*COLS+nx;if(nx>=0&&nx<COLS&&ny>=0&&ny<ROWS&&!blocked[j]&&seen[j]!==searchId){seen[j]=searchId;searchParents[j]=i;pending.push(j);}}}
  if(join<0){unreachable.push(t.id);continue;}
  const branch=[];for(let i=join;i>=0;i=searchParents[i])branch.push(i);branch.reverse();
  const path=[t.door,{x:t.x,y:t.y},...branch.map(point)];for(const i of branch)network.add(i);path.width=t.width;path.targetId=t.id;paths.push(path);
 }
 return {paths,unreachable,visited:queue.length};
}
