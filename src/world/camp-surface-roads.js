import {campGateRoads} from './camp-gate-roads.js';
import {hasCampLayoutChanges} from '../config/camp-layout.js';
import {campPlotAt,ownsCampPlot} from '../config/camp-land.js';
import {campBoundary} from './camp-boundary.js';
// 营地换路面保留原路形；只有玩家搬迁建筑时才使用重新规划的路网。
import {PATHS} from './paths.js';
import {LIVING_ROADS} from '../config/living-world.js';
import {nearest} from './coordinates.js';
import {campRoadNetwork} from './camp-layout-roads.js';
// 二次曲线采样与原道路一致，只保留营地附近有限段，不扫描整图到每帧。
function localRoads(){const paths=[];for(const path of [...PATHS,...LIVING_ROADS]){let part=[];for(const source of path){const p=nearest(source,{x:0,y:700});if(p.x>=-1250&&p.x<=950&&p.y>=-160&&p.y<=1550)part.push(p);else if(part.length){if(part.length>1)paths.push(part);part=[];}}if(part.length>1)paths.push(part);}return paths.map(path=>{const points=[path[0]];let a=path[0];for(let i=1;i<path.length-1;i++){const b=path[i],e={x:(b.x+path[i+1].x)/2,y:(b.y+path[i+1].y)/2},steps=Math.max(2,Math.ceil((Math.hypot(b.x-a.x,b.y-a.y)+Math.hypot(e.x-b.x,e.y-b.y))/12));for(let n=1;n<=steps;n++){const t=n/steps,u=1-t;points.push({x:u*u*a.x+2*u*t*b.x+t*t*e.x,y:u*u*a.y+2*u*t*b.y+t*t*e.y});}a=e;}points.push(path.at(-1));return points;});}
const original=localRoads();
// 未搬迁的营地保留老路，门口短接线接到真正的原路中心，避免北扩区域断头。
const approaches=new WeakMap();
export function campGateInnerRoads(progress){if(hasCampLayoutChanges(progress.campLayout))return [];const boundary=campBoundary(progress),cached=approaches.get(progress);if(cached?.key===boundary.key)return cached.paths;const paths=[];
 for(const gate of boundary.gates){if(!gate.id)continue;const dx=gate.side==='left'?1:gate.side==='right'?-1:0,dy=gate.side==='top'?1:gate.side==='bottom'?-1:0,mouth={x:gate.x+dx*72,y:gate.y+dy*72},plot=campPlotAt(mouth,progress);if(!plot||!ownsCampPlot(progress,plot.id))continue;let best=null,distance=Infinity;
 for(const path of original)for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],vx=b.x-a.x,vy=b.y-a.y,t=Math.max(0,Math.min(1,((mouth.x-a.x)*vx+(mouth.y-a.y)*vy)/(vx*vx+vy*vy||1))),p={x:a.x+vx*t,y:a.y+vy*t};if((p.x-gate.x)*dx+(p.y-gate.y)*dy<48)continue;const d=Math.hypot(p.x-mouth.x,p.y-mouth.y);if(d<distance){best=p;distance=d;}}
 if(best)paths.push([{x:gate.x,y:gate.y},mouth,best]);}
 approaches.set(progress,{key:boundary.key,paths});return paths;
}
// 营地内外所有可见路面共用几何，装饰和农田避让不再看到旧断头路。
export function campSurfaceRoads(progress){const inside=hasCampLayoutChanges(progress.campLayout)?campRoadNetwork(progress).paths:[...original,...campGateInnerRoads(progress)];return [...inside,...campGateRoads(progress)];}
