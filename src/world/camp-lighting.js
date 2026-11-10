import {hasCampLayoutChanges} from '../config/camp-layout.js';
// 友善营地的基础亮度和路口灯具，按地契与布局缓存，不扫描整张世界。
import {CAMP_LIGHTING} from '../config/camp-lighting.js';
import {campPlots,CAMP_PLOTS,ownsCampPlot,ownsCampPoint} from '../config/camp-land.js';
import {CAMP_BUILDINGS,campBuildingPosition} from '../config/camp-layout.js';
import {TOWN_PATHS} from '../config/town-layout.js';
import {REGIONAL_CAMPS,REGIONAL_SETTLEMENTS} from '../config/regional-camps.js';
import {SETTLEMENTS} from '../config/settlements.js';
import {campRoadNetwork} from './camp-layout-roads.js';
import {nearest,visibleBodies} from './coordinates.js';
const cache=new WeakMap();

// 只在真实友善地契范围开灯，未购买的野地不会提前变成亮营地。
export function campLightRegions(game){
 if(game.mapId!=='forest'||game.realm||game.cottage)return [];
 return [...campPlots(game.progress).filter(p=>ownsCampPlot(game.progress,p.id)),SETTLEMENTS.find(s=>s.id==='neighbors'),...REGIONAL_SETTLEMENTS];
}

// 周期世界中使用实际矩形边界，不能因为主营地的负坐标而漏掉照明。
export function campPointLit(game,point){
 return campLightRegions(game).some(r=>{const p=nearest(point,{x:(r.left+r.right)/2,y:(r.top+r.bottom)/2});return p.x>=r.left&&p.x<=r.right&&p.y>=r.top&&p.y<=r.bottom;});
}

// 视口只接收相邻营地矩形，边缘渐隐带与渲染同源，最多十二个固定区域。
export function visibleCampLightRegions(game,view){
 return visibleBodies(campLightRegions(game).map(r=>({x:(r.left+r.right)/2,y:(r.top+r.bottom)/2,w:r.right-r.left,h:r.bottom-r.top})),view,1100)
 .filter(r=>r.x+r.w/2+CAMP_LIGHTING.feather>=view.x&&r.x-r.w/2-CAMP_LIGHTING.feather<=view.x+view.w&&r.y+r.h/2+CAMP_LIGHTING.feather>=view.y&&r.y-r.h/2-CAMP_LIGHTING.feather<=view.y+view.h)
 .map(r=>({...r,x:r.x-r.w/2,y:r.y-r.h/2,feather:CAMP_LIGHTING.feather,power:CAMP_LIGHTING.ambient}));
}

// 生成原有灯柱候选；主营地迁移为存档装饰，邻里和其他营地仍为公共灯。
function lamp(id,x,y){return {id,type:'fixture',kind:'lamp',x,y,phase:0,height:86,offset:18,radius:CAMP_LIGHTING.lampRadius,campLight:true};}

// 路口与转角选路肩，避开完整房屋、门口和耕地；搬迁后从真实新路网重建。
export function campRoadLights(progress,includeManaged=false){
 if(!progress)return [];
 const plots=progress.farm?.plots,key=JSON.stringify([progress.campLayout,progress.campLand]);
 let entry=cache.get(progress);if(entry?.key===key&&entry.plots===plots&&entry.count===plots?.length)return includeManaged||!progress.campManagement?.defaultDecorVersion?entry.lights:entry.lights.filter(l=>!l.id.startsWith('camp-road-'));
 const customized=hasCampLayoutChanges(progress.campLayout),paths=customized?campRoadNetwork(progress).paths:TOWN_PATHS;
 const buildings=CAMP_BUILDINGS.map(b=>campBuildingPosition(progress.campLayout,b)),lights=[];
 const candidates=paths.flatMap(path=>customized?path.filter((p,i)=>i>0&&i<path.length-1&&(p.x-path[i-1].x)*(path[i+1].y-p.y)!==(p.y-path[i-1].y)*(path[i+1].x-p.x)):path);
 for(const p of candidates){
  if(!ownsCampPoint(progress,p)||lights.some(l=>Math.hypot(l.x-p.x,l.y-p.y)<190))continue;
  for(const [dx,dy]of [[-66,68],[66,68],[-66,-62],[66,-62]]){
   const x=p.x+dx,y=p.y+dy;if(lights.some(l=>Math.hypot(l.x-x,l.y-y)<160))continue;if(!ownsCampPoint(progress,{x,y}))continue;
   if(buildings.some(b=>x+32>b.x-b.width/2-12&&x-18<b.x+b.width/2+12&&y>b.y-b.height-12&&y-120<b.y+45))continue;
   if((progress.farm?.plots||[]).some(f=>{const q=nearest(f,{x,y});return f.mapId==='forest'&&Math.abs(q.x-x)<55&&q.y>y-130&&q.y<y+35;}))continue;
   lights.push(lamp('camp-road-'+lights.length,x,y));break;
  }
 }
 // 邻里主路与五方营地十字口同样有固定路肩照明，不把路灯铺满野外。
 lights.push(lamp('neighbors-road',280,1830));
 for(const c of REGIONAL_CAMPS)for(const [i,[dx,dy]]of [[-95,-95],[95,95]].entries())lights.push(lamp('camp-'+c.id+'-'+i,c.x+dx,c.y+dy));
 entry={key,lights,plots,count:plots?.length};cache.set(progress,entry);return includeManaged||!progress.campManagement?.defaultDecorVersion?lights:lights.filter(l=>!l.id.startsWith('camp-road-'));
}
