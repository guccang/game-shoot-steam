import {RESOURCE_CAP} from '../config/resource-limits.js';
// 装配、独立货舱和牵引关系随存档保存，缺失配置使用原厂状态。
import {VEHICLE_LOADS,VEHICLE_ENGINES,LOAD_RULES} from '../config/vehicle-load.js';
import {FARM_CROPS,FARM_STOCK_CAP} from '../config/farm.js';
// 缺失或异常计数归零，不允许负货物抵扣车辆重量。
function integer(n,max){return Number.isFinite(n)?Math.max(0,Math.min(max,Math.floor(n))):0;}
// 新档所有车型均从原厂空货舱开始，购买后使用对应记录。
export function freshLogistics(){return {version:1,bagWood:0,builds:VEHICLE_LOADS.map(()=>({engine:0,engines:[0],plates:0,spares:0,wood:0,cargo:FARM_CROPS.map(()=>0)})),tow:null};}
// 只校验当前装配结构，不迁移历史装甲或发动机等级。
export function normalizeLogistics(raw,progress){
 const result=freshLogistics();result.bagWood=integer(raw?.bagWood,RESOURCE_CAP);
 result.builds=result.builds.map((fallback,i)=>{
  if(!progress.vehicleHulls[i])return fallback;
  if(raw?.version!==1)return fallback;
  const b=raw.builds?.[i]||{},engines=[...new Set([0,...(Array.isArray(b.engines)?b.engines:[]).filter(e=>Number.isInteger(e)&&VEHICLE_ENGINES[e])])];
  return {engine:engines.includes(b.engine)?b.engine:0,engines,plates:integer(b.plates,LOAD_RULES.maxPlates),spares:integer(b.spares,LOAD_RULES.maxPlates),wood:integer(b.wood,RESOURCE_CAP),cargo:FARM_CROPS.map((_,j)=>integer(b.cargo?.[j],FARM_STOCK_CAP))};
 });
 const t=raw?.tow;
 if(Number.isInteger(t?.target)&&(t.tractor==='cat'||(Number.isInteger(t.tractor)&&progress.vehicleHulls[t.tractor]))&&t.tractor!==t.target&&progress.vehicleHulls[t.target]&&progress.vehicleService?.[t.target]?.phase==='wrecked')result.tow={tractor:t.tractor,target:t.target};
 return result;
}
