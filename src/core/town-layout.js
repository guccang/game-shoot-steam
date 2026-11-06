import {parkingCollisionBarriers} from './camp-parking.js';
import {worldBuildingBlocked} from '../world/building-collision.js';
// 布局调整后的旧存档只修正被新围栏、桌脚或低岩丘占据的落点，不改任务和资产。
import {blocked} from '../physics/motion.js';
import {TOWN_LAYOUT} from '../config/town-layout.js';
import {nearest,canonical} from '../world/coordinates.js';

// 普通森林重载时在原点附近寻找可站立位置；剧情、秘境与接送保留各自导演落点。
export function restoreTownPosition(game){
 if(game.mapId!=='forest'||game.story||game.realm||game.fireActive||game.campDefense||game.arrivalCinematic)return false;
 const p=game.player,at=nearest(p,TOWN_LAYOUT.spawn),body={mapId:'forest',livingCollision:true,legendaryBuilding:!!game.progress.vehicleHulls[6]};
 restoreBuildingParking(game,body);
 const parkingBarriers=parkingCollisionBarriers(game);
 // 地图外原有落点规则不变，停车重叠无论位于营地内外都需要就近解困。
 if((at.x<TOWN_LAYOUT.bounds.left-40||at.x>TOWN_LAYOUT.bounds.right+50||at.y<TOWN_LAYOUT.bounds.top-10||at.y>2090)&&!worldBuildingBlocked(p.x,p.y,12,body)&&!parkingBarriers.some(b=>{const near=nearest(b,p);return Math.abs(p.x-near.x)<b.width/2+12&&Math.abs(p.y-near.y)<b.height/2+12;}))return false;
 const point=townStandingPoint(game,p);
 if(!point||point.x===p.x&&point.y===p.y)return false;
 Object.assign(p,point,{vx:0,vy:0});game.progress.living.position=canonical(p);return true;
}

// 按正式步行碰撞就近寻找落脚点；优先保留原位，车辆与建筑都不可重叠。
export function townStandingPoint(game,origin,maxRadius=256){
 const body={...game.player,mapId:game.mapId,flying:false,amphibious:false,treePass:false,livingCollision:true,legendaryBuilding:!!game.progress.vehicleHulls[6],parkingBarriers:parkingCollisionBarriers(game)};
 if(!blocked(origin.x,origin.y,12,game.trees,body))return {x:origin.x,y:origin.y};
 for(let radius=16;radius<=maxRadius;radius+=16)for(let i=0;i<24;i++){
  const x=origin.x+Math.cos(i*Math.PI/12)*radius,y=origin.y+Math.sin(i*Math.PI/12)*radius;
  if(!blocked(x,y,12,game.trees,body))return {x,y};
 }
 return null;
}

// 新墙体覆盖旧路边车辆时，仅就近挪出实体，保留车型、耐久和供给；固定库位不搬动。
function restoreBuildingParking(game,body){
 for(const record of game.progress.campParking?.owned||[]){
  if(record.spot||record.mapId!=='forest'||!worldBuildingBlocked(record.x,record.y,30,body))continue;
  let point=null;
  for(let radius=32;radius<=320&&!point;radius+=16)for(let i=0;i<24;i++){
   const x=record.x+Math.cos(i*Math.PI/12)*radius,y=record.y+Math.sin(i*Math.PI/12)*radius;
   if(!blocked(x,y,30,game.trees,body)){point=canonical({x,y});break;}
  }
  if(point)Object.assign(record,point);
 }
}
