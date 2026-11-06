// 每份原矿到仓后按原有产率分出矿石与本层金属。
export const ORE_KEYS=['copper','iron','rareMetal'];
export const ORE_NAMES={copper:'铜原矿',iron:'铁原矿',rareMetal:'稀有原矿'};
export const CART_CAPACITY=32,ORE_MASS=.5;
// 只统计三种已定义的实物货物。
export function oreCount(cargo){return ORE_KEYS.reduce((n,key)=>n+(cargo?.[key]||0),0);}
// 非法数量不进入库存，旧矿车及旧背包默认为空。
export function validOre(raw,limit=9999999){
 const cargo={};
 for(const key of ORE_KEYS){const count=raw?.[key];if(Number.isSafeInteger(count)&&count>0&&limit>0){cargo[key]=Math.min(count,limit);limit-=cargo[key];}}
 return cargo;
}
