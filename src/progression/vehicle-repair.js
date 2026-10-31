// 自有车耐久与救援订单独立持久化，非法记录不创造车辆或免费完成维修。
import {COLLECTED_VEHICLES} from '../config/vehicles.js';
import {REPAIR_BAY,REPAIR_LAYOUT_VERSION,VEHICLE_REPAIR as C} from '../config/vehicle-repair.js';
// 坐标限制为有限世界镜像，兼容跨边界行驶。
function point(raw,fallback){return raw&&Number.isFinite(raw.x)&&Number.isFinite(raw.y)&&Math.abs(raw.x)<1e6&&Math.abs(raw.y)<1e6?{x:raw.x,y:raw.y}:{...fallback};}
// 只接收拥有车辆；路线有界，刷新保留当前阶段与剩余工时。
export function normalizeVehicleService(raw,progress){
 return COLLECTED_VEHICLES.map((_,i)=>{
  const r=raw?.[i];if(!r||!progress.vehicleHulls[i])return null;
  const hp=Number.isFinite(r.hp)?Math.max(0,Math.min(1,r.hp)):1;
  const phase=['wrecked','outbound','hooking','towing','repairing','ready'].includes(r.phase)?r.phase:null;
  const route=Array.isArray(r.route)?r.route.slice(0,4096).map(p=>point(p,REPAIR_BAY)):[];
  return {hp:phase&&phase!=='ready'?Math.min(hp,.999999):hp,phase,mapId:r.mapId==='jiuzhaigou'?'jiuzhaigou':'forest',
   layoutVersion:r.layoutVersion===REPAIR_LAYOUT_VERSION?REPAIR_LAYOUT_VERSION:0,
   position:['repairing','ready'].includes(phase)?{...REPAIR_BAY}:point(r.position,REPAIR_BAY),truck:point(r.truck,REPAIR_BAY),route,
   step:Math.max(0,Math.min(route.length-1,Math.floor(r.step)||0)),timer:Math.max(0,Math.min(C.repairSeconds,Number(r.timer)||0)),wheel:Number.isFinite(r.wheel)?r.wheel%10000:0,angle:Number.isFinite(r.angle)?r.angle:0};
 });
}
