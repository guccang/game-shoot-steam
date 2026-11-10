// 布局保存中的维修迁移只操作候选存档，失败不会移动车辆或重置工时。
import {CAMP_BUILDINGS,campBuildingPosition,campLayoutFootprints} from '../../config/camp-layout.js';
import {repairLayoutSite} from '../../config/repair-parking.js';
import {ownedLayoutPoint} from '../../world/camp-layout-roads.js';
import {nearest,worldDistance} from '../../world/coordinates.js';
// 只迁移确实占用新建筑的待修残骸；历史完好记录不参与占地。
export function relocateLayoutService(game,next){
 const moved=CAMP_BUILDINGS.filter(b=>worldDistance(campBuildingPosition(game.progress.campLayout,b),campBuildingPosition(next.campLayout,b))>=1),rects=moved.flatMap(b=>campLayoutFootprints(campBuildingPosition(next.campLayout,b)));
 if(!moved.length)return '';
 const all=CAMP_BUILDINGS.flatMap(b=>campLayoutFootprints(campBuildingPosition(next.campLayout,b))),bay=repairLayoutSite(next,null);
 const overlaps=(point,boxes,margin)=>boxes.some(r=>{const p=nearest(point,{x:(r.left+r.right)/2,y:(r.top+r.bottom)/2});return p.x>=r.left-margin&&p.x<=r.right+margin&&p.y>=r.top-margin&&p.y<=r.bottom+margin;});
 for(const r of next.vehicleService||[]){if(!r?.phase)continue;
  if(['repairing','ready'].includes(r.phase)){r.position=repairLayoutSite(next,r);r.truck={...bay};continue;}
  if(r.mapId!=='forest')continue;
  if(['outbound','hooking','towing'].includes(r.phase)){r.layoutVersion=0;r.routeRetry=0;}
  if(!['wrecked','outbound','hooking'].includes(r.phase)||!r.position||!overlaps(r.position,rects,35))continue;
  let destination=null;
  for(let radius=0;radius<=2400&&!destination;radius+=80){const count=Math.max(1,Math.ceil(2*Math.PI*radius/80));for(let i=0;i<count;i++){const p={x:bay.x+Math.cos(i*2*Math.PI/count)*radius,y:bay.y+Math.sin(i*2*Math.PI/count)*radius};if(!ownedLayoutPoint(next,p.x,p.y,45)||overlaps(p,all,45)||worldDistance(p,game.player)<100||(game.trees||[]).some(t=>t.hp>0&&worldDistance(t,p)<80)||(next.farm?.plots||[]).some(f=>f.mapId==='forest'&&worldDistance(f,p)<80)||(next.vehicleService||[]).some(o=>o!==r&&o?.phase&&o.mapId==='forest'&&o.position&&worldDistance(o.position,p)<100)||(next.campParking?.owned||[]).some(v=>v.spot==null&&v.mapId==='forest'&&worldDistance(v,p)<100))continue;destination=p;break;}}
  if(!destination)return '营地没有足够空地安置待修载具，请为维修中心留出临时停放空间。';
  r.position=destination;if(r.phase==='hooking'){r.phase='outbound';r.timer=0;}
 }
 return '';
}
