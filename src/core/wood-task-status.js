// 木材任务读取真实库存：采集统计全部自有货物，施工仍只使用已入库建材。
import {woodInventory} from '../progression/resource-wallet.js';
import {CAMP_WAREHOUSE} from '../config/wood-storage.js';
import {TREE_REWARD} from '../config/rewards.js';
import {availableWood} from './wood-storage.js';
import {woodPickupCapacity} from './wood-pickup.js';
import {vehicleLocations} from './vehicle-location.js';
import {cargoAccessible} from './cargo.js';
import {worldDistance} from '../world/coordinates.js';

// 现有木材在背包、货舱和仓库间转移时总数守恒，不用累计伐木次数推算持有量。
export function woodTaskStatus(game,required){
 const stock=woodInventory(game.progress),missing=Math.max(0,required-stock.total),stored=stock.warehouse>=required;
 const progress=Math.min(required,stock.total)+'/'+required,collected=missing===0;
 const breakdown=`仓库 ${stock.warehouse} · 背包 ${stock.bag} · 载具 ${stock.vehicles}`;
 let destination=null;
 if(!stored&&stock.bag+stock.vehicles>0){
  const nearby=availableWood(game);
  if(stock.warehouse+nearby>=required||nearby>0&&woodPickupCapacity(game)<TREE_REWARD.wood)
   destination={kind:'store',site:CAMP_WAREHOUSE,label:'运回木材，靠近小屋仓库自动入库'};
  else if(collected){
   const vehicle=vehicleLocations(game).filter(v=>game.progress.logistics.builds[v.hull].wood>0&&!cargoAccessible(game,v.hull))
    .sort((a,b)=>(a.mapId===game.mapId?0:1)-(b.mapId===game.mapId?0:1)||worldDistance(a,game.player)-worldDistance(b,game.player))[0];
   if(vehicle)destination={kind:'retrieve',site:vehicle,label:'取回'+vehicle.name+'中的木材'+(vehicle.mapId!==game.mapId?'（先前往'+(vehicle.mapId==='forest'?'晴叶森林':'九寨沟')+'）':'')};
  }
 }
 const hint=stored?'木材已入库，可前往修复':collected?(destination?.label||'木材已采齐，运回小屋仓库入库'):`还差 ${missing} 木头${destination?'，先回仓库卸货腾空间':'，靠近树木采集'}`;
 return {...stock,required,missing,stored,collected,progress,breakdown,destination,hint};
}
