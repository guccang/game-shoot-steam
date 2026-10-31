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
 if((at.x<TOWN_LAYOUT.bounds.left-40||at.x>TOWN_LAYOUT.bounds.right+50||at.y<100||at.y>2090)&&!worldBuildingBlocked(p.x,p.y,12,body)||!blocked(p.x,p.y,12,game.trees,body))return false;
 for(let radius=16;radius<=256;radius+=16)for(let i=0;i<24;i++){
  const angle=i*Math.PI/12,x=p.x+Math.cos(angle)*radius,y=p.y+Math.sin(angle)*radius;
  if(blocked(x,y,12,game.trees,body))continue;
  Object.assign(p,{x,y,vx:0,vy:0});game.progress.living.position=canonical(p);return true;
 }
 return false;
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
