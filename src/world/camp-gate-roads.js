// 营门外侧接回既有世界道路，门位变化后只重建一次局部接驳线。
import {PATHS} from './paths.js';
import {LIVING_ROADS} from '../config/living-world.js';
import {campBoundary} from './camp-boundary.js';
import {campPlotAt,ownsCampPlot} from '../config/camp-land.js';
import {nearest} from './coordinates.js';
const cache=new WeakMap();
// 道路中心投影保持接点落在真实线段上，不把世界采样点当作道路端点。
function project(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return {x:a.x+dx*t,y:a.y+dy*t};}
// 连接段不得横穿营地其他围栏；沿外侧保持路肩余量。
function outsideSegment(a,b,regions){const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/24));for(let i=0;i<=steps;i++){const x=a.x+(b.x-a.x)*i/steps,y=a.y+(b.y-a.y)*i/steps;if(regions.some(r=>x>r.left-26&&x<r.right+26&&y>r.top-26&&y<r.bottom+26))return false;}return true;}
// 只处理玩家已购地的门，邻里与其他营地仍沿用原道路布局。
export function campGateRoads(progress){const boundary=campBoundary(progress),old=cache.get(progress);if(old?.key===boundary.key)return old.paths;const paths=[];
 for(const gate of boundary.gates){if(!gate.id)continue;const normal={x:gate.side==='left'?-1:gate.side==='right'?1:0,y:gate.side==='top'?-1:gate.side==='bottom'?1:0},inside={x:gate.x-normal.x*24,y:gate.y-normal.y*24};const plot=campPlotAt(inside,progress);if(!plot||!ownsCampPlot(progress,plot.id))continue;
 const mouth={x:gate.x+normal.x*72,y:gate.y+normal.y*72};let best=null,distance=2000;
 for(const path of [...PATHS,...LIVING_ROADS])for(let i=1;i<path.length;i++){const a=nearest(path[i-1],gate),b=nearest(path[i],gate);if(Math.min(a.x,b.x)>mouth.x+distance||Math.max(a.x,b.x)<mouth.x-distance||Math.min(a.y,b.y)>mouth.y+distance||Math.max(a.y,b.y)<mouth.y-distance||Math.hypot(b.x-a.x,b.y-a.y)>5000)continue;const end=project(mouth,a,b),d=Math.hypot(end.x-mouth.x,end.y-mouth.y);if(d>=distance||(end.x-gate.x)*normal.x+(end.y-gate.y)*normal.y<60||!outsideSegment(mouth,end,boundary.regions))continue;best=end;distance=d;}
 if(best)paths.push([inside,{x:gate.x,y:gate.y},mouth,best]);
 }
 cache.set(progress,{key:boundary.key,paths});return paths;
}
