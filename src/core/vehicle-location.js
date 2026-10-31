import {repairParkingSpot} from '../config/repair-parking.js';
// 手机定位读取真实车队位置，报废残骸、拖车和停车记录不互相覆盖。
import {vehicleModel} from '../config/vehicles.js';
import {parkingRecordSite} from '../progression/roadside-parking.js';
import {REPAIR_BAY} from '../config/vehicle-repair.js';
import {FIRE_GARAGE} from '../world/fire-navigation.js';
import {canonical} from '../world/coordinates.js';
import {ownsKeepsake} from '../progression/keepsakes.js';
import {personalFleet} from './vehicle-repair.js';
import {requestWorldNavigation} from './world-navigation.js';

// 列出每辆已拥有的车；跨地图保留地图名称，不伪造本地图坐标。
export function vehicleLocations(game){
 return game.vehicles.filter(v=>game.progress.vehicleHulls[v.index]).map(v=>{
  const order=game.progress.vehicleService?.[v.index],record=game.progress.campParking?.owned.find(r=>r.hull===v.index);
  let site,status;
  if(order?.phase){
   site=['repairing','ready'].includes(order.phase)?{...(repairParkingSpot(order)||REPAIR_BAY),mapId:'forest'}:{...(order.phase==='wrecked'?order.position:order.truck||order.position),mapId:order.mapId};
   status=({wrecked:'已报废',outbound:'救援中',hooking:'拖车挂接中',towing:'拖运中',repairing:order.repairSpot?'车位维修中':'等待维修车位',ready:'修好待停车场空位'})[order.phase];
  }else if(v.active&&v===game.vehicle){site={...canonical(game.player),mapId:game.mapId};status='驾驶中';}
  else if(v.index===4&&game.fireGarageParked){site={...FIRE_GARAGE,mapId:'forest'};status='消防站车库';}
  else if(record){site=parkingRecordSite(record);status=record.spot?'停车场':'原地停放';}
  else{site={...canonical(game.cottage?.outside||game.player),mapId:game.mapId};status='随行载具';}
  if(game.progress.logistics?.tow?.target===v.index)status='自行牵引中';
  return {...site,id:'vehicle-location-'+v.index,hull:v.index,name:vehicleModel(v.index).shortName,status};
 });
}
// 点击定位只设置正式导航，不召车或改变车辆位置；房内仍可查看世界位置。
export function locateVehicle(game,hull){
 if(!ownsKeepsake(game.progress,'patrol-phone')||!personalFleet(game)||!['playing','paused'].includes(game.state))return {ok:false,message:'请在自由巡林时使用手机定位。'};
 const site=vehicleLocations(game).find(v=>v.hull===hull);if(!site)return {ok:false,message:'尚未拥有这辆载具。'};
 requestWorldNavigation(game,site,'寻找'+site.name,{direct:true});
 return {ok:true,message:site.mapId===game.mapId?'已标出'+site.name+'的位置。':site.name+'位于'+(site.mapId==='forest'?'晴叶森林':'九寨沟')+'，请先前往该地图。'};
}
