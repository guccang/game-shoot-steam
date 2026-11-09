// 维修车位与普通停车统一占用，不抢占已停车辆、访客或倒车中的预约。
import {REPAIR_PARKING_SPOTS,repairParkingSpot,repairParkingReserved} from '../../config/repair-parking.js';
import {parkingRecordOccupies} from '../../progression/vehicles/roadside-parking.js';
import {worldDistance} from '../../world/coordinates.js';
// 分配结果写入订单；满位只等待，既不在门前画车，也不开始计时。
export function assignRepairParking(game,index){
 const r=game.progress.vehicleService[index];if(!r||!['repairing','ready'].includes(r.phase))return false;
 let spot=repairParkingSpot(r);
 if(!spot)spot=REPAIR_PARKING_SPOTS.find(s=>!repairParkingReserved(game.progress,s.id)
  &&!game.progress.campParking.owned.some(p=>parkingRecordOccupies(p,s))
  &&!(game.parkingVisitors||[]).some(p=>p.spot===s.id)
  &&!(game.parking?.id===s.id&&['align','reverse'].includes(game.parking.phase))
  &&!(game.mapId==='forest'&&!game.cottage&&game.vehicle.active&&worldDistance(game.player,s)<85));
 if(!spot){r.repairSpot=null;return false;}
 r.repairSpot=spot.id;r.mapId='forest';r.position={x:spot.x,y:spot.y};return true;
}
