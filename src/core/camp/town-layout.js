import {campBoundaryBlocked} from '../../world/camp-boundary.js';
import {parkingCollisionBarriers} from '../vehicles/camp-parking.js';
import {isNaturalBlocked,isMountainBlocked} from '../../world/natural-terrain.js';
import {nearestDryTerrain} from '../../physics/terrain-navigation.js';
import {vehicleModel} from '../../config/vehicles.js';
import {worldBuildingBlocked} from '../../world/building-collision.js';
// 布局调整后的旧存档只修正被新围栏、桌脚或低岩丘占据的落点，不改任务和资产。
import {blocked} from '../../physics/motion.js';
import {TOWN_LAYOUT} from '../../config/town-layout.js';
import {nearest,canonical} from '../../world/coordinates.js';

// 普通森林重载时在原点附近寻找可站立位置；剧情、秘境与接送保留各自导演落点。
export function restoreTownPosition(game){
 if(game.mapId!=='forest'||game.story||game.realm||game.fireActive||game.campDefense||game.arrivalCinematic)return false;
 const terrainMoved=restoreTerrainPosition(game);
 const p=game.player,at=nearest(p,TOWN_LAYOUT.spawn),body={campProgress:game.progress,mapId:'forest',livingCollision:true,legendaryBuilding:!!game.progress.vehicleHulls[6]};
 const parkingMoved=restoreBuildingParking(game,body);
 const parkingBarriers=parkingCollisionBarriers(game);
 // 地图外原有落点规则不变，停车重叠无论位于营地内外都需要就近解困。
 if((at.x<TOWN_LAYOUT.bounds.left-40||at.x>TOWN_LAYOUT.bounds.right+50||at.y<TOWN_LAYOUT.bounds.top-10||at.y>2090)&&!worldBuildingBlocked(p.x,p.y,12,body)&&!campBoundaryBlocked(p.x,p.y,12,game.progress)&&!parkingBarriers.some(b=>{const near=nearest(b,p);return Math.abs(p.x-near.x)<b.width/2+12&&Math.abs(p.y-near.y)<b.height/2+12;}))return terrainMoved||parkingMoved;
 const point=townStandingPoint(game,p);
 if(!point||point.x===p.x&&point.y===p.y)return terrainMoved||parkingMoved;
 Object.assign(p,point,{vx:0,vy:0});game.progress.living.position=canonical(p);
 // 入职阶段另外保存角色落点，旧档解困后同步，避免再次进入又回到墙内。
 if(game.arrivalPending)Object.assign(game.progress.arrival,canonical(p));
 return true;
}

// 重建地图后只挪开落在新山湖内的旧落点；在岸边避开树干，车辆货物与损耗保持。
function restoreTerrainPosition(game){
 let changed=false;
 const place=(origin,radius)=>{
  const shore=nearestDryTerrain({...origin,mapId:'forest'},origin,radius+65),body={mapId:'forest',campProgress:game.progress,livingCollision:true};
  for(let distance=0;distance<=320;distance+=16)for(let i=0;i<(distance?24:1);i++){
   const p={x:shore.x+Math.cos(i*Math.PI/12)*distance,y:shore.y+Math.sin(i*Math.PI/12)*distance};
   if(!blocked(p.x,p.y,radius,game.trees,body))return canonical(p);
  }
  throw Error('新地形岸边没有可用落点，请检查地图通行。');
 };
 for(const record of game.progress.campParking?.owned||[]){
  if(record.spot||record.mapId!=='forest')continue;
  const blockedTerrain=vehicleModel(record.hull).amphibious?isMountainBlocked:isNaturalBlocked;
  if(blockedTerrain(record.x,record.y,30)){Object.assign(record,place(record,30));changed=true;}
 }
 const p=game.player,blockedTerrain=p.amphibious?isMountainBlocked:isNaturalBlocked;
 if(!p.flying&&blockedTerrain(p.x,p.y,12)){
  Object.assign(p,place(p,12),{vx:0,vy:0});game.progress.living.position=canonical(p);
  if(game.arrivalPending)Object.assign(game.progress.arrival,canonical(p));changed=true;
 }
 return changed;
}

// 按正式步行碰撞就近寻找落脚点；优先保留原位，车辆与建筑都不可重叠。
export function townStandingPoint(game,origin,maxRadius=256){
 const body={...game.player,campProgress:game.progress,mapId:game.mapId,flying:false,amphibious:false,treePass:false,livingCollision:true,legendaryBuilding:!!game.progress.vehicleHulls[6],parkingBarriers:parkingCollisionBarriers(game)};
 if(!blocked(origin.x,origin.y,12,game.trees,body))return {x:origin.x,y:origin.y};
 for(let radius=16;radius<=maxRadius;radius+=16)for(let i=0;i<24;i++){
  const x=origin.x+Math.cos(i*Math.PI/12)*radius,y=origin.y+Math.sin(i*Math.PI/12)*radius;
  if(!blocked(x,y,12,game.trees,body))return {x,y};
 }
 return null;
}

// 新墙体覆盖旧路边车辆时，仅就近挪出实体，保留车型、耐久和供给；固定库位不搬动。
function restoreBuildingParking(game,body){
 let changed=false;
 for(const record of game.progress.campParking?.owned||[]){
  if(record.spot||record.mapId!=='forest'||!(worldBuildingBlocked(record.x,record.y,30,body)||campBoundaryBlocked(record.x,record.y,30,game.progress)))continue;
  let point=null;
  for(let radius=32;radius<=320&&!point;radius+=16)for(let i=0;i<24;i++){
   const x=record.x+Math.cos(i*Math.PI/12)*radius,y=record.y+Math.sin(i*Math.PI/12)*radius;
   if(!blocked(x,y,30,game.trees,body)){point=canonical({x,y});break;}
  }
  if(point){Object.assign(record,point);changed=true;}
 }
 return changed;
}
