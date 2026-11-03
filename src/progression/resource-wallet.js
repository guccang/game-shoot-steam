// 金币、木材和三种材料统一封顶入账，返回实际增量供掉落、档案和经济账本使用。
import { RESOURCE_CAP } from '../config/resource-limits.js';
import {MATERIAL_KEYS,MATERIAL_CAP} from '../config/materials.js';
import {recordResourceGain} from './game-statistics.js';
// 超出容量的收益直接舍弃，消费后的容量可继续接收新收益。
export function creditResource(progress,key,amount) {
  if(!['coins','wood',...MATERIAL_KEYS].includes(key))return 0;
  const material=MATERIAL_KEYS.includes(key),wallet=material?progress.materials:progress,cap=material?MATERIAL_CAP:RESOURCE_CAP;
  const before=Math.max(0,Math.min(cap,Number(wallet[key])||0));
  const received=Math.max(0,Math.min(cap-before,Math.floor(Number(amount)||0)));
  recordResourceGain(progress,key,received);
  wallet[key]=before+received;
  return received;
}

// 木头总览只读真实存量，不把车体、借用装备或可消费仓库额度重复计算。
export function woodInventory(progress){const warehouse=progress.wood,bag=progress.logistics.bagWood,vehicles=progress.logistics.builds.reduce((sum,build,index)=>sum+(progress.vehicleHulls[index]?build.wood:0),0);return {warehouse,bag,vehicles,total:warehouse+bag+vehicles};}

// 房屋修复与施工可直接使用背包和仓库，载具货舱不计入施工余额。
export function constructionWood(progress){return (progress.wood||0)+(progress.logistics?.bagWood||0);}
// 优先使用随身木材释放负重；不足或非法金额不修改任一库存，保存由上层事务负责。
export function spendConstructionWood(progress,amount){
 if(!Number.isSafeInteger(amount)||amount<0||constructionWood(progress)<amount)return false;
 const bag=Math.min(progress.logistics?.bagWood||0,amount);if(bag)progress.logistics.bagWood-=bag;progress.wood-=amount-bag;return true;
}
