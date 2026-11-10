import {CAMP_BUILDINGS,campBuildingPosition} from './camp-layout.js';
// 维修使用既有两侧露天泊位，中央车库和进门通道保留给玩家。
import {PARKING_SPOTS} from './parking.js';
export const REPAIR_PARKING_SPOTS=PARKING_SPOTS.filter(s=>s.building==='repair'&&!s.indoor);
// 订单只引用稳定车位ID，坐标始终来自正式停车场配置。
export function repairParkingSpot(order){return ['repairing','ready'].includes(order?.phase)?REPAIR_PARKING_SPOTS.find(s=>s.id===order.repairSpot)||null:null;}
// 在修和等待交付都占位，正常停车与访客共用此判断。
export function repairParkingReserved(progress,id){return (progress.vehicleService||[]).some(r=>repairParkingSpot(r)?.id===id);}

// 读档与布局事务直接按存档计算车位，不能借用另一个存档已激活的全局坐标。
export function repairLayoutSite(progress,order){const base=CAMP_BUILDINGS.find(b=>b.id==='repair'),b=campBuildingPosition(progress.campLayout,base),spot=repairParkingSpot(order);return {x:b.x+(spot?(spot.id==='repair-west'?-170:170):185),y:b.y+(spot?65:160)};}
