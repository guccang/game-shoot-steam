// 地下网格与地表共用世界单位；只存开掘过的格子，不预生成有限矿区。
import {COTTAGE} from './cottage.js';
import {RESOURCE_CAP} from './resource-limits.js';
// 第二层一万金币，之后每层乘三；施工矿石与木材仍按层号递增。
export const MINE_LAYER_UNLOCK={coins:10000,ore:10,wood:20};
// 仅首次开通收费，已存在的层由核心通行逻辑免除费用。
export function mineLayerUnlockCost(depth){
 const tier=Math.max(1,depth-1);
 return Object.fromEntries(Object.entries(MINE_LAYER_UNLOCK).map(([key,n])=>[key,Math.min(RESOURCE_CAP,n*(key==='coins'?3**Math.min(40,tier-1):tier))]));
}
export const MINING={tile:64,flyingMargin:14,speed:112,cartSpeed:176,digSeconds:.65,shaftSeconds:4,radius:10,home:{...COTTAGE.door},hatch:{id:'basement',x:155,y:440,width:64,height:56,goal:{x:155,y:480}},prices:{rail:{ore:1,wood:2},cart:{ore:8,wood:12},lamp:{ore:1,wood:1},sign:{ore:0,wood:2},shaft:{ore:5,wood:8}}};
export const MINE_DIRECTIONS=[{id:'north',name:'北',x:0,y:-1},{id:'east',name:'东',x:1,y:0},{id:'south',name:'南',x:0,y:1},{id:'west',name:'西',x:-1,y:0}];
// 以小屋的真实地表位置作为零格，避免室内局部坐标混入地下地图。
export function mineCell(point){return {x:Math.floor((point.x-MINING.home.x)/MINING.tile+.5),y:Math.floor((point.y-MINING.home.y)/MINING.tile+.5)};}
// 地下稳定标识始终使用网格整数，不使用玩家显示文案。
export function mineKey(point){return `${point.x},${point.y}`;}
// 格子中心与地表坐标一一对应，允许负坐标和持续向外开掘。
export function minePoint(cell){return {x:MINING.home.x+cell.x*MINING.tile,y:MINING.home.y+cell.y*MINING.tile};}
// 一层仓库在小屋东侧一屏宽处；深层货运仍由本层上行口中转。
export const DEPOT_COLUMN=6;
export function mineFreightCell(layer,depth){
 if(depth===1)return {x:DEPOT_COLUMN,y:layer.depotRow??0};
 const [x,y]=layer.entry.split(',').map(Number);return {x,y};
}
// 使用固定种子确定矿脉，刷新和重进不会重抽奖励。
export function mineOre(cell){const n=(Math.imul(cell.x,73856093)^Math.imul(cell.y,19349663)^1847)>>>0;return n%7===0?4:n%3===0?2:1;}

// 作业迎敌半径与安全恢复缓冲，避免远处怪物和短暂击退频繁打断挖矿。
export const MINE_WORK_COMBAT={minRange:220,maxRange:420,exitMargin:80,resumeDelay:1};

// 地下登乘沿用一秒候停；范围与原手动登乘一致，不越过矿壁。
export const MINE_CART_BOARDING=Object.freeze({wait:1,radius:40});
