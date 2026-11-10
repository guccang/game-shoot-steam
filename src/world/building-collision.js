import {vehicleFenceFootprint} from '../config/vehicle-fence-footprint.js';
import {campDecorBlocked} from './camp-decor.js';
import {ownsCampPoint} from '../config/camp-land.js';
import {facilityOpen} from '../config/town-restoration.js';
// 建筑碰撞只使用登记墙体，开放车库不会被整块包围框封死。
import {WORLD_BUILDINGS} from '../config/world-buildings.js';
import {nearest} from './coordinates.js';
import {SpatialGrid} from './spatial-grid.js';
let buildingIndex=null;
// 搬迁完成后废弃旧索引，下一次正式碰撞读取新位置；不在每个寻路采样遍历全部建筑。
export function invalidateBuildingCollisionIndex(){buildingIndex=null;}
// 矩形最大轴向范围保证候选完整，真正阻挡仍读取正式墙体与修复状态。
function nearbyBuildings(x,y,radius){
 buildingIndex??=new SpatialGrid(WORLD_BUILDINGS.map(building=>({x:building.x,y:building.y,radius:Math.max(...building.rects.flat().map(Math.abs)),building})));
 return buildingIndex.query(x,y,x,y,radius);
}
// 世界查询与飞行、步行、高速移动共用同一墙体边界；秘境室内由自身边界管理。
export function worldBuildingBlocked(x,y,radius=12,body={}){
 if(body.mapId!=='forest'||body.arena&&body.arena.terrain!=='forest')return false;
 if(campDecorBlocked(x,y,radius,body.campProgress,vehicleFenceFootprint(body.fenceVehicle,radius)))return true;
 return nearbyBuildings(x,y,radius).some(({building:b})=>{
  // 先按当前坐标排除远处建筑，再读取营地产权和修复状态，避免每个采样遍历存档。
  const p=nearest({x,y},b),dx=p.x-b.x,dy=p.y-b.y;
  if(!b.rects.some(([left,top,right,bottom])=>dx>left-radius&&dx<right+radius&&dy>top-radius&&dy<bottom+radius))return false;
  if(!b.regional&&body.campProgress&&(!ownsCampPoint(body.campProgress,b)||!b.solidBeforeRepair&&!facilityOpen(body.campProgress,b.id==='vehicle'?'garage':b.id)))return false;
  if(b.conditional&&!body.legendaryBuilding)return false;
  return true;
 });
}
