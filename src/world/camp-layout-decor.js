import {campDecorRoadOverlap,campDecorRoadHalfWidth} from './camp-decor.js';
// 布局优先：仅找出需要回收的装饰，预览期间不修改玩家物品。
import {CAMP_BUILDINGS,campBuildingPosition,campLayoutFootprints} from '../config/camp-layout.js';
import {campDecorDefinition} from '../config/camp-management.js';
import {PARKING_SPOTS} from '../config/parking.js';
import {nearest} from './coordinates.js';
import {campSurfaceRoads} from './camp-surface-roads.js';
// 线段距离同时覆盖道路与停车进出通道，周期坐标使用就近镜像。
function distance(p,a,b){const q=nearest(p,a),dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((q.x-a.x)*dx+(q.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(q.x-a.x-t*dx,q.y-a.y-t*dy);}
// 建筑足迹、附属车位和最终路面共用正式数据；未冲突的摆件保持位置。
export function campLayoutDecorConflicts(progress,layout,roads){
 const moved=CAMP_BUILDINGS.filter(b=>{const before=campBuildingPosition(progress.campLayout,b),after=campBuildingPosition(layout,b);return before.x!==after.x||before.y!==after.y;});if(!moved.length)return [];
 const rects=moved.flatMap(b=>campLayoutFootprints(campBuildingPosition(layout,b))),aliases={vehicle:'garage','cat-home':'catHome','warehouse-depot':'warehouseDepot'},lanes=[];
 for(const b of moved){const before=campBuildingPosition(progress.campLayout,b),after=campBuildingPosition(layout,b),dx=after.x-before.x,dy=after.y-before.y;for(const s of PARKING_SPOTS.filter(s=>(aliases[s.building]||s.building)===b.id))lanes.push([{x:s.x+dx,y:s.y+dy},{x:s.x+dx,y:s.approachY+dy}]);}
 const paths=Object.keys(layout.positions||{}).length?roads.paths:campSurfaceRoads({...progress,campLayout:layout});
 return (progress.campManagement?.items||[]).filter(i=>{if(i.x===null)return false;const d=campDecorDefinition(i.type),r=Math.max(d.width/2,d.depth/2)+10;return rects.some(b=>{const p=nearest(i,{x:(b.left+b.right)/2,y:(b.top+b.bottom)/2});return b.left<p.x+d.width/2&&b.right>p.x-d.width/2&&b.top<p.y+d.depth/2&&b.bottom>p.y-d.height;})||lanes.some(([a,b])=>distance(i,a,b)<r+55)||campDecorRoadOverlap(i,d,paths,campDecorRoadHalfWidth({...progress,campLayout:layout}));}).map(i=>i.uid);
}
