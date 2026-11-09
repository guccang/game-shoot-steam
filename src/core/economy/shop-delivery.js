// 购种按粒优先装入背包，其余商品整批优先装车；预览只读取库存。
import {SHOP_GOODS,shopSlot,storedShopGood} from '../../progression/economy/shop-stock.js';
import {catLoad,vehicleLoad} from '../../progression/inventory/load-weight.js';
import {vehicleModel} from '../../config/vehicles.js';
import {parkedOwned} from '../vehicles/camp-parking.js';
import {worldDistance} from '../../world/coordinates.js';
import {rodOwned} from '../../config/fishing-tackle.js';
import {validateProgress} from '../../progression/progress.js';
import {commitCargo,cargoAccessible} from '../inventory/cargo.js';
import {canUseWarehouse} from '../inventory/warehouse.js';

// 店内使用门外的停车位置，不能把随身列表里的远处车辆当成在场。
export function shopVehicles(game){
 const origin=game.cottage?.outside||game.player;
 const cars=parkedOwned(game).map(s=>({hull:s.record.hull,distance:worldDistance(origin,s)}));
 if(game.vehicle?.active)cars.unshift({hull:game.vehicle.index,distance:0});
 return cars.filter(c=>game.progress.vehicleHulls[c.hull]&&!game.progress.vehicleService?.[c.hull]?.phase&&c.distance<=240)
  .sort((a,b)=>a.distance-b.distance).map(c=>c.hull);
}
// 按库存上限和实际载荷检查整批商品，确认时再次调用。
export function shopDelivery(game,id,count){
 const item=SHOP_GOODS[id],p=game.progress;
 if(!item||!Number.isSafeInteger(count)||count<1)return {ok:false,message:'无效商品或数量。'};
 const [bag,key]=shopSlot(p,item,'bag');
 if(item.cap===1&&(bag[key]||storedShopGood(p,id)))return {ok:false,message:'已经拥有这件装备。'};
 const seeds=item.category==='seed',vehicles=shopVehicles(game);
 const places=seeds?['bag',...new Set(vehicles),'home']:[...vehicles,'bag','home'];
 const allocations=[];
 let remaining=count;
 for(const where of places){
  let stock;
  if(where==='bag')stock=bag[key];
  else if(item.category==='ammo')stock=(where==='home'?p.warehouse.ammo:p.supplies.vehicles[where])[item.key];
  else if(where==='home'&&item.category==='seed')stock=p.warehouse.seeds[item.index];
  else stock=p.shopStock?.[where]?.[id];
  let room=item.cap-(Number(stock)||0);
  if(where!=='home'){
   const load=where==='bag'?catLoad(game):vehicleLoad(game,where,{driver:false});
   const weight=load.weight??load.payload;
   if(seeds)room=Math.min(room,Math.floor((load.capacity-weight-.000001)/item.mass));
   else if(weight+item.mass*count>=load.capacity)continue;
  }
  const label=where==='home'?'小屋仓库':where==='bag'?'猫猫背包':vehicleModel(where).name+'的载具仓库';
  if(!seeds){
   if(room>=count)return {ok:true,where,label,message:item.name+' ×'+count+' 已放入'+label+'。'};
   continue;
  }
  const units=Math.min(remaining,room);
  if(units<=0)continue;
  allocations.push({where,count:units,label});
  remaining-=units;
  if(!remaining){
   const destination=allocations.map(a=>a.label+' '+a.count+' 粒').join('、');
   return {ok:true,allocations,label:destination,message:item.name+'已放入'+destination+'。'};
  }
 }
 return {ok:false,message:'仓库和背包都装不下这批商品，请减少数量或先整理库存。'};
}
// 只写候选存档，由各商店和扣款一起提交；鱼竿沿用首次装备规则。
export function addShopStock(p,id,count,where){
 const item=SHOP_GOODS[id];
 if(item.kind==='tent'&&Number.isInteger(where)){p.outdoors.tent=true;p.outdoors.tentHull=where;return;}
 const firstRod=where==='bag'&&item.kind==='rod'&&!rodOwned(p.outdoors,p.outdoors.selectedRod);
 const [stock,key]=shopSlot(p,item,where);
 stock[key]=where==='bag'&&item.cap===1?true:(Number(stock[key])||0)+count;
 if(firstRod)p.outdoors.selectedRod=item.tackleId;
 if(where==='bag'&&item.kind==='fish-container'&&!p.outdoors.containers[p.outdoors.selectedContainer])p.outdoors.selectedContainer=item.tackleId;
}
// 从购买存放格取回实际物品；背包无法容纳整格时取可装下的部分。
export function collectShopStock(game,where,id){
 const item=SHOP_GOODS[id],n=game.progress.shopStock?.[where]?.[id];
 if(!item||!n||!(where==='home'?canUseWarehouse(game):cargoAccessible(game,where)||game.cottage&&shopVehicles(game).includes(where)))return {ok:false,message:'请靠近存放商品的仓库。'};
 const next=validateProgress(structuredClone(game.progress)),load=catLoad(game);
 if(item.category==='weapon'){
  delete next.shopStock[where][id];
  if(catLoad(Object.assign(Object.create(game),{progress:next})).overloaded)return {ok:false,message:'背包空间不足，请先整理背包。'};
  return commitCargo(game,next,item.name+' 已取回背包。');
 }
 const [bag,key]=shopSlot(next,item,'bag');
 const count=Math.min(n,item.cap-(Number(bag[key])||0),Math.floor((load.capacity-load.weight-.000001)/item.mass));
 if(count<1)return {ok:false,message:'背包空间不足，请先整理背包。'};
 next.shopStock[where][id]-=count;if(!next.shopStock[where][id])delete next.shopStock[where][id];
 addShopStock(next,id,count,'bag');return commitCargo(game,next,item.name+' ×'+count+' 已取回背包。');
}
