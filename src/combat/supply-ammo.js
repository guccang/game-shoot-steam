// 正式巡林实物弹药按库存扣除；活动借用装备仍使用独立局内供给。
import {ammoKind} from '../config/supplies.js';
import {catAmmoRoom} from '../progression/inventory/load-weight.js';
// 判断当前战斗是否使用玩家持久化弹药。
export function finiteSupply(game){return !game.realm&&!game.story&&!game.campDefense&&!game.fireActive&&!game.workshopTrial&&!game.arrivalCinematic;}
// 自动补给只连接当前自有载具，停车距离不限，不访问其他车或临时活动库存。
export function catAmmoWarehouse(game){
 const hull=game.vehicle?.index;
 return finiteSupply(game)&&game.progress.vehicleHulls[hull]?game.progress.supplies.vehicles[hull]:null;
}
// 空库存保持待补给状态，避免不断播放没有子弹的装填声。
export function supplyAmmoCount(game,weapon,hull=null){
 const key=ammoKind(weapon);if(!finiteSupply(game)||!key)return Infinity;
 if(hull!==null)return game.progress.supplies.vehicles[hull][key];
 const hand=game.progress.supplies.hand[key];if(hand>0)return hand;
 const stored=catAmmoWarehouse(game)?.[key]||0;return stored>0?Math.min(stored,catAmmoRoom(game,key)):0;
}
// 换弹只提取实际存在的数量，空库返回零，不补满或产生负库存。
export function takeSupplyAmmo(game,weapon,amount,hull=null){
 if(!finiteSupply(game)||!ammoKind(weapon))return amount;
 const stock=hull===null?game.progress.supplies.hand:game.progress.supplies.vehicles[hull],key=ammoKind(weapon),n=Math.min(amount,stock[key]);
 // 背包弹药会进入弹匣，总重不变；先计算可新增重量再扣备用，避免重复利用这部分空间。
 const car=hull===null&&n<amount?catAmmoWarehouse(game):null,extra=car?.[key]>0?Math.min(amount-n,car[key],catAmmoRoom(game,key)):0;
 stock[key]-=n;if(extra>0)car[key]-=extra;return n+extra;
}
// 运行弹夹进入候选快照，保存、退出和切场景不会凭空补弹。
export function syncSupplyAmmo(game){if(!finiteSupply(game)||!game.progress.supplies)return;const s=game.progress.supplies;s.handMags=(game.magazines||[]).map((m,i)=>({ammo:m.ammo||0,remaining:m.remaining||0,weapon:i}));s.vehicleMags=(game.vehicles||[]).map(v=>({ammo:v.module?.magazine.ammo||0,remaining:v.module?.magazine.remaining||0,weapon:v.weaponIndex}));}
