// 维修使用既有两侧露天泊位，中央车库和进门通道保留给玩家。
import {PARKING_SPOTS} from './parking.js';
export const REPAIR_PARKING_SPOTS=PARKING_SPOTS.filter(s=>s.building==='repair'&&!s.indoor);
// 订单只引用稳定车位ID，坐标始终来自正式停车场配置。
export function repairParkingSpot(order){return ['repairing','ready'].includes(order?.phase)?REPAIR_PARKING_SPOTS.find(s=>s.id===order.repairSpot)||null:null;}
// 在修和等待交付都占位，正常停车与访客共用此判断。
export function repairParkingReserved(progress,id){return (progress.vehicleService||[]).some(r=>repairParkingSpot(r)?.id===id);}
