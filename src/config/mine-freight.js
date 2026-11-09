// 石矿与三类金属原矿是独立实物，顺序同时用于背包施工补差，优先消耗石矿。
export const ORE_KEYS=['stone','copper','iron','rareMetal'];
export const ORE_NAMES={stone:'石矿',copper:'铜原矿',iron:'铁原矿',rareMetal:'稀有原矿'};
export const CART_CAPACITY=160,ORE_MASS=.5;
// 自动装车沿用三格投料范围，只推进当前矿层的游戏时钟，不创建额外计时器。
export const MINE_FREIGHT_LOADING=Object.freeze({radius:192,interval:.25,retry:2});
// 基点总和一万，一层严格99.5%石矿和0.5%铜，六层起沿用成熟矿带比例。
export const MINE_ORE_WEIGHTS=Object.freeze([
 Object.freeze({stone:9950,copper:50,iron:0,rareMetal:0}),
 Object.freeze({stone:8500,copper:1400,iron:90,rareMetal:10}),
 Object.freeze({stone:6500,copper:2500,iron:900,rareMetal:100}),
 Object.freeze({stone:5000,copper:2800,iron:1900,rareMetal:300}),
 Object.freeze({stone:4000,copper:2800,iron:2500,rareMetal:700}),
 Object.freeze({stone:3500,copper:2500,iron:3000,rareMetal:1000}),
]);
// 返回只读概率表，界面与矿物抽取共用，未开通层也可查看配置。
export function mineOreWeights(depth){return MINE_ORE_WEIGHTS[Math.max(0,Math.min(MINE_ORE_WEIGHTS.length-1,(depth||1)-1))];}
// 一处矿点整批产出一种矿，按层种子、坐标及再生轮次固定，刷新或保存失败不重抽。
export function mineOreKind(depth,seed,cell,cycle=0){
 let hash=(Math.imul(cell.x,73856093)^Math.imul(cell.y,19349663)^Math.imul(depth||1,83492791)^Math.imul(seed||1847,2654435761)^Math.imul(Math.round(cycle*1000),1597334677))>>>0;
 hash=Math.imul(hash^(hash>>>16),2246822507);hash=Math.imul(hash^(hash>>>13),3266489909);hash=(hash^(hash>>>16))>>>0;
 let roll=hash/4294967296*10000;
 for(const key of ORE_KEYS){roll-=mineOreWeights(depth)[key];if(roll<0)return key;}
 return 'stone';
}
// 只统计四种已定义的实物货物。
export function oreCount(cargo){return ORE_KEYS.reduce((n,key)=>n+(cargo?.[key]||0),0);}
// 非法数量不进入库存，旧矿车及旧背包默认为空。
export function validOre(raw,limit=9999999){
 const cargo={};
 for(const key of ORE_KEYS){const count=raw?.[key];if(Number.isSafeInteger(count)&&count>0&&limit>0){cargo[key]=Math.min(count,limit);limit-=cargo[key];}}
 return cargo;
}
