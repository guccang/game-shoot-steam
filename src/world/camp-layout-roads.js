import {campDecorDefinition} from '../config/camp-management.js';
import {LIVING_PLACES} from '../config/living-world.js';
import {WORKSHOP_INTERIORS} from '../config/workshop-interiors.js';
import {nearest} from './coordinates.js';
import {WORLD_BUILDINGS} from '../config/world-buildings.js';
// 有界网格从营地中心生成连通道路树，绕开建筑；正式场景与编辑预览共用结果。
import {CAMP_BUILDINGS,campBuildingPosition} from '../config/camp-layout.js';
import {campPlotAt,ownsCampPlot} from '../config/camp-land.js';
import {campBoundary} from './camp-boundary.js';
const cache=new WeakMap();
// 运行路网依附存档对象；建造、购地或田块数量变化才重算。
export function campRoadNetwork(progress){const key=JSON.stringify([progress.campLayout,progress.campLand,progress.farm?.plots?.length||0,progress.campManagement?.items]);let entry=cache.get(progress);if(entry?.key!==key){entry={key,...campLayoutRoads(progress)};cache.set(progress,entry);}return entry;}
// 路面保持在已购地内，边缘留出一半路宽。
export function ownedLayoutPoint(progress,x,y,margin=0){return [[-margin,-margin],[margin,-margin],[-margin,margin],[margin,margin]].every(([dx,dy])=>{const plot=campPlotAt({x:x+dx,y:y+dy},progress);return plot&&ownsCampPlot(progress,plot.id);});}
// 建筑屋面占地加通路余量，脚底向南保留门口直连段。
export function layoutBuildings(progress,layout){return CAMP_BUILDINGS.filter(b=>{const p=campPlotAt(b);return p&&ownsCampPlot(progress,p.id);}).map(b=>campBuildingPosition(layout,b));}
// 营门外保留100单位接驳地带，让贴边种子小屋的真实门槛也能连到营路。
// 一次洪泛得到全部路径；随新增北侧用地调整网格，约5万格预算，不在每帧重算。
export function campLayoutRoads(progress,layout=progress.campLayout,{ignoreDecor=false}={}){const boundary=campBoundary(progress,layout),LEFT=-1220,TOP=Math.floor((Math.min(...boundary.regions.map(r=>r.top))-120)/20)*20,STEP=Math.max(20,Math.ceil(Math.sqrt(2100*(2200-TOP)/50000)/20)*20),COLS=Math.ceil(2150/STEP),ROWS=Math.ceil((2200-TOP)/STEP),buildings=layoutBuildings(progress,layout),regions=[...boundary.regions,...boundary.gates.map(g=>g.horizontal?{left:g.x-g.length/2+8,right:g.x+g.length/2-8,top:g.y-100,bottom:g.y+100}:{left:g.x-100,right:g.x+100,top:g.y-g.length/2+8,bottom:g.y+g.length/2-8})],fixed=WORLD_BUILDINGS.filter(b=>!CAMP_BUILDINGS.some(c=>c.id===({'vehicle':'garage','cat-home':'catHome','warehouse-depot':'warehouseDepot'}[b.id]||b.id))).concat(Object.values(LIVING_PLACES).filter(s=>!['flowers','basket','warning','relay','kitchen','market'].includes(s.kind)).map(s=>({...s,rects:[[-s.width/2,-19,s.width/2,5]]}))),fields=(progress.farm?.plots||[]).filter(p=>p.mapId==='forest').map(p=>nearest(p,{x:350,y:650})).filter(p=>p.x>LEFT-60&&p.x<800&&p.y>TOP-60&&p.y<2200),blocked=new Uint8Array(COLS*ROWS),parents=new Int32Array(COLS*ROWS).fill(-2),point=i=>({x:LEFT+(i%COLS)*STEP,y:TOP+Math.floor(i/COLS)*STEP});
 for(let i=0;i<blocked.length;i++){const p=point(i);blocked[i]=!ignoreDecor&&(progress.campManagement?.items||[]).some(d=>d.x!==null&&!campDecorDefinition(d.type)?.passable&&Math.abs(p.x-d.x)<campDecorDefinition(d.type).width/2+34&&Math.abs(p.y-d.y)<campDecorDefinition(d.type).depth/2+34)||![[ -28,-28],[28,-28],[-28,28],[28,28]].every(([dx,dy])=>regions.some(r=>p.x+dx>=r.left&&p.x+dx<=r.right&&p.y+dy>=r.top&&p.y+dy<=r.bottom))||fixed.some(b=>b.rects.some(([l,t,r,bottom])=>p.x>b.x+l-28&&p.x<b.x+r+28&&p.y>b.y+t-28&&p.y<b.y+bottom+28))||fields.some(f=>Math.abs(p.x-f.x)<53&&Math.abs(p.y-f.y)<46)||buildings.some(b=>!b.passable&&(!b.parking||layout?.positions?.[b.id])&&p.x>b.x-b.width/2-34&&p.x<b.x+b.width/2+34&&p.y>b.y-b.height-20&&p.y<b.y+30)?1:0;}
 const closest=target=>{let best=-1,distance=Infinity;for(let i=0;i<blocked.length;i++)if(!blocked[i]){const p=point(i),d=Math.hypot(p.x-target.x,p.y-target.y);if(d<distance){distance=d;best=i;}}return best;};
 const root=closest({x:600,y:730});if(root<0)return {paths:[],unreachable:buildings.map(b=>b.id)};parents[root]=-1;const queue=[root];
 for(let n=0;n<queue.length;n++){const i=queue[n],x=i%COLS,y=Math.floor(i/COLS);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,j=ny*COLS+nx;if(nx>=0&&nx<COLS&&ny>=0&&ny<ROWS&&!blocked[j]&&parents[j]===-2){parents[j]=i;queue.push(j);}}}
 const paths=[],unreachable=[],used=new Set();
 const targets=[...buildings.map(b=>{
 // 停车场地坪可通行，连接东侧入口。
 if(b.parking)return {id:b.id,x:b.x+315,y:b.y-220,door:{x:b.x+315,y:b.y-220}};const room=WORKSHOP_INTERIORS[({'garage':'vehicle','catHome':'cat-home'}[b.id]||b.id)],dy=room?room.door.y-room.site.y:b.id==='cottage'?12:24;return {id:b.id,x:b.x,y:b.y+72,door:{x:b.x,y:b.y+dy}};}),...campBoundary(progress,layout).gates.filter(g=>campPlotAt({x:g.x+(g.side==='left'?50:g.side==='right'?-50:0),y:g.y+(g.side==='top'?50:g.side==='bottom'?-50:0)},progress)).map(g=>({id:'gate',x:g.x+(g.side==='left'?50:g.side==='right'?-50:0),y:g.y+(g.side==='top'?50:g.side==='bottom'?-50:0),door:{x:g.x,y:g.y}}))];
 for(const t of targets){const end=closest(t);if(end<0||parents[end]===-2||Math.hypot(point(end).x-t.x,point(end).y-t.y)>80){unreachable.push(t.id);continue;}const path=[t.door,{x:t.x,y:t.y},point(end)];let i=end;while(parents[i]>=0){const parent=parents[i],key=Math.min(i,parent)+':'+Math.max(i,parent);path.push(point(parent));if(used.has(key))break;used.add(key);i=parent;}paths.push(path);}
 return {paths,unreachable,visited:queue.length};
}
