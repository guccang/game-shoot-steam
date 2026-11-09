import {VEHICLE_LOADS} from '../../config/vehicle-load.js';
import {VEHICLE_WEAPONS} from '../../config/vehicle-armaments.js';
// 当前补给结构的校验与默认值；不迁移历史无限弹药或车辆等级。
import {AMMO_TYPES,SUPPLY_ITEMS} from '../../config/supplies.js';
// 初始六百发覆盖首轮清剿及赶路余量；后续与车载弹药仍通过购买或制作获得。
export function freshSupplies(){return {version:1,items:{medkit:0,gunKit:0,engineKit:0},hand:{light:600,shell:0,heavy:0,water:0},vehicles:Array.from({length:VEHICLE_LOADS.length},()=>({light:0,shell:0,heavy:0,water:0})),handMags:[],vehicleMags:[],gunFaults:Array(VEHICLE_WEAPONS.length).fill(0),engineFaults:Array(VEHICLE_LOADS.length).fill(0)};}
// 有界非负整数保护货物、损坏百分比与装填记录。
function count(n,max=100000){return Number.isFinite(n)?Math.max(0,Math.min(max,Math.floor(n))):0;}
// 只保留明确的实物库存与当前安装主炮的弹夹。
export function normalizeSupplies(raw,p){const s=freshSupplies();if(raw?.version!==1)return s;const stock=r=>Object.fromEntries(Object.keys(AMMO_TYPES).map(k=>[k,count(r?.[k])]));s.hand=stock(raw.hand);s.items=Object.fromEntries(Object.keys(SUPPLY_ITEMS).map(k=>[k,count(raw.items?.[k],999)]));s.vehicles=s.vehicles.map((_,i)=>p.vehicleHulls[i]?stock(raw.vehicles?.[i]):stock(null));s.gunFaults=s.gunFaults.map((_,i)=>count(raw.gunFaults?.[i],100));s.engineFaults=s.engineFaults.map((_,i)=>count(raw.engineFaults?.[i],100));const mag=m=>({ammo:count(m?.ammo),remaining:Math.max(0,Math.min(120,Number(m?.remaining)||0)),weapon:Number.isInteger(m?.weapon)?m.weapon:null});s.handMags=p.weapons.map((_,i)=>mag(raw.handMags?.[i]));s.vehicleMags=p.vehicleHulls.map((_,i)=>mag(raw.vehicleMags?.[i]));return s;}
