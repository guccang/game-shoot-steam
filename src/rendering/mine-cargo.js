// 矿车示意矿堆按真实货物分配，少量高阶矿也保留可辨颜色。
import {ORE_KEYS,oreCount,CART_CAPACITY} from '../config/mine-freight.js';
export const MINE_ORE_COLORS={stone:'#aaa999',copper:'#ca9367',iron:'#9ba8b3',rareMetal:'#b09acb'};
// 最多十二块，每种现有矿物至少一块，其余按实际占比补足最大缺口。
export function mineCargoDisplay(cargo){
 const total=oreCount(cargo),keys=ORE_KEYS.filter(key=>cargo?.[key]>0);if(!total)return [];
 const count=Math.max(keys.length,Math.ceil(Math.min(total,CART_CAPACITY)*12/CART_CAPACITY)),counts=Object.fromEntries(keys.map(key=>[key,1]));
 for(let n=keys.length;n<count;n++){
  const key=keys.reduce((best,key)=>cargo[key]/total*count-counts[key]>cargo[best]/total*count-counts[best]?key:best,keys[0]);counts[key]++;
 }
 const result=[];while(result.length<count)for(const key of keys)if(counts[key]){result.push(key);counts[key]--;}
 return result;
}
