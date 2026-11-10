import {hasCampLayoutChanges} from '../config/camp-layout.js';
import {worldRoadFootprintOverlap} from './farm-roads.js';
import {overlapsCampPlaza} from './camp-plaza.js';
import {campSurfaceRoads} from './camp-surface-roads.js';
import {roadFootprintDistance} from './road-footprint.js';
import {CAMP_ROAD_WIDTH} from '../config/camp-layout.js';
// 装饰占地与通路保护：正式物理、编辑预览和保存均读取同一脚底矩形。
import {campDecorDefinition,CAMP_DECOR_SHOP} from '../config/camp-management.js';
import {ownedLayoutPoint,layoutBuildings} from './camp-layout-roads.js';
import {campBoundaryBlocked,campBoundary} from './camp-boundary.js';
import {WORLD_BUILDINGS} from '../config/world-buildings.js';
import {PARKING_SPOTS,NORTH_PARKING} from '../config/parking.js';
import {nearest,worldDistance} from './coordinates.js';
import {SpatialGrid} from './spatial-grid.js';
const indexes=new WeakMap();
// 一次提交重建一次有界索引，寻路热路径不遍历全存档。
export function campDecorBlocked(x,y,radius,progress){const state=progress?.campManagement;if(!state)return false;let grid=indexes.get(state);if(!grid){grid=new SpatialGrid(state.items.filter(i=>i.x!==null&&!campDecorDefinition(i.type)?.passable).map(i=>({...i,radius:campDecorDefinition(i.type).width/2+24})));indexes.set(state,grid);}return grid.query(x,y,x,y,radius).some(i=>{const p=nearest({x,y},i),d=campDecorDefinition(i.type);return Math.abs(p.x-i.x)<d.width/2+radius&&Math.abs(p.y-i.y)<d.depth/2+radius;});}
// 线段距离用于道路、门口和停车进出通道保护。
function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);}
// 放置不占路、不盖门、不挤车辆，也不允许把实体压到玩家脚下。
export function campDecorPlacementError(game,uid,x,y){const p=game.progress,item=p.campManagement?.items.find(i=>i.uid===uid),d=campDecorDefinition(item?.type);if(!d||!Number.isFinite(x)||!Number.isFinite(y))return '请先选择已购买的装饰。';const point={x,y},r=Math.max(d.width/2,d.depth/2)+10;
 if(overlapsCampPlaza(x,y-d.height/2,d.width/2,d.height/2+d.depth/2,p))return '请保留中央庆典广场，装饰可放在广场周边。';
 if(!ownedLayoutPoint(p,x,y,r))return '请放在已购买营地的空地内。';
 if(campBoundaryBlocked(x,y,r,p))return '请与围栏留出距离。';
 if(campBoundary(p).gates.some(g=>segmentDistance(point,g.horizontal?{x:g.x-g.length/2,y:g.y}:{x:g.x,y:g.y-g.length/2},g.horizontal?{x:g.x+g.length/2,y:g.y}:{x:g.x,y:g.y+g.length/2})<r+90))return '请保留大门和转弯通道。';
 const buildings=[...layoutBuildings(p,p.campLayout),...WORLD_BUILDINGS,CAMP_DECOR_SHOP];if(buildings.some(b=>{const q=nearest(b,point);return Math.abs(x-q.x)<(b.width||140)/2+r&&y>q.y-(b.height||130)-d.height/4&&y<q.y+85+d.depth/2;}))return '这里是建筑、屋檐或门前通道。';
 const lot=nearest(NORTH_PARKING,point);if(x>lot.x-r&&x<lot.x+NORTH_PARKING.width+r&&y>lot.y-r&&y<lot.y+NORTH_PARKING.height+r)return '请保留北停车场。';
 if(PARKING_SPOTS.some(s=>{const q=nearest(s,point);return segmentDistance(point,q,{x:q.x,y:q.y+s.approachY-s.y})<r+55;}))return '请保留停车位及进出车道。';
 if(campDecorRoadHalfWidth(p)===24?worldRoadFootprintOverlap({...point,mapId:'forest'},p,d.width/2,d.depth/2):campDecorRoadOverlap(point,d,campSurfaceRoads(p),campDecorRoadHalfWidth(p)))return '请不要占用营地道路。';
 if(p.campManagement.items.some(i=>{if(i.uid===uid||i.x===null)return false;const o=campDecorDefinition(i.type);return Math.abs(x-i.x)<(d.width+o.width)/2+12&&Math.abs(y-i.y)<(d.depth+o.depth)/2+18;}))return '与其他装饰太近了。';
 if(p.farm?.plots?.some(f=>f.mapId==='forest'&&worldDistance(f,point)<r+40))return '这里已有农田。';
 if(game.trees?.some(t=>t.hp>0&&worldDistance(t,point)<r+40))return '请避开树木。';
 if(game.player&&worldDistance(game.player,point)<r+28)return '请先离开摆放位置。';
 if(p.campParking?.owned?.some(v=>v.spot==null&&v.mapId==='forest'&&worldDistance(v,point)<r+65)||(p.vehicleService||[]).some(v=>v?.position&&v.mapId==='forest'&&worldDistance(v.position,point)<r+65))return '这里停着载具，请先移走。';return '';}

// 默认土路实体半宽24；搬迁和自定义铺面沿用正式营路宽度，草缘阴影不算路面。
export function campDecorRoadHalfWidth(progress){const finish=progress.campManagement?.styles.road;return hasCampLayoutChanges(progress.campLayout)||finish&&(finish.material!=='earth'||finish.shape!=='plain')?CAMP_ROAD_WIDTH/2:24;}
// 道路仅检验真实底座，不借用农田尺寸，也不叠加角色或灯杆高度缓冲。
export function campDecorRoadOverlap(point,definition,paths,halfWidth){return paths.some(path=>path.some((b,i)=>i&&roadFootprintDistance(path[i-1],b,nearest(point,path[i-1]),definition.width/2,definition.depth/2)<halfWidth));}
