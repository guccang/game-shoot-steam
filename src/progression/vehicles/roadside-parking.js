// 任意停车记录与固定泊位共用存档，地图和坐标是车辆位置的唯一来源。
import {PARKING_SPOTS} from '../../config/parking.js';
import {canonical,worldDistance} from '../../world/coordinates.js';

// 旧存档固定泊位默认属于森林，新记录保留地图与下车前的实际位置。
export function parkingRecordSite(record){
 const spot=PARKING_SPOTS.find(s=>s.id===record.spot);
 return spot?{...spot,mapId:'forest'}:{id:'roadside-'+record.hull,name:'路边停车',mapId:record.mapId,x:record.x,y:record.y};
}
// 只保存正常自有车辆；活动借车、报废和室内操作不能产生额外车体。
export function roadsideParkingRecord(game,position){
 const v=game.vehicle,p=game.progress;
 if(game.realm||game.story||game.fireActive||game.campDefense||game.workshopTrial||game.arrivalCinematic||game.cottage||!p.vehicleHulls[v.index]||v.hp<=0||p.vehicleService?.[v.index]?.phase)return null;
 return {hull:v.index,spot:null,mapId:game.mapId,...canonical(position),hp:v.hp/v.maxHp,ammo:v.module?.magazine.ammo||0,reload:v.module?.magazine.remaining||0,wheel:v.wheelPhase||0,track:game.player.walkPhase||0};
}
// 先检查下车落点，再提交相同停车记录；预检本身不移动货物或改变驾驶状态。
export function parkAtPosition(game,position){
 const record=roadsideParkingRecord(game,position);if(!record)return false;
 const p=game.progress;
 p.campParking??={owned:[]};
 p.campParking.owned=p.campParking.owned.filter(r=>r.hull!==record.hull);
 p.campParking.owned.push(record);
 return true;
}

// 原地停在车位或其边缘同样占位，防止访客、新购车和自动泊车压在旧车上。
export function parkingRecordOccupies(record,spot){
 if(!spot)return false;
 if(record.spot===spot.id)return true;
 const site=parkingRecordSite(record);return site.mapId==='forest'&&worldDistance(site,spot)<75;
}
