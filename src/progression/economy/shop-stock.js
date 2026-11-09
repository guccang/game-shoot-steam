// 商店库存只接受正式目录中的商品，随身物品沿用玩法原有的库存字段。
import {OUTDOOR_GEAR,FISH_SPECIES,OUTDOOR_RULES} from '../../config/outdoors.js';
import {FARM_CROPS,FARM_STOCK_CAP} from '../../config/farm.js';
import {AMMO_TYPES,SUPPLY_ITEMS} from '../../config/supplies.js';
import {itemDefinition} from '../../config/items.js';
import {DETECTOR} from '../../config/treasure.js';
import {WEAPONS} from '../../config/weapons.js';
import {ammoKind} from '../../config/supplies.js';

export const SHOP_GOODS=Object.fromEntries([
 ...WEAPONS.map((w,i)=>({...itemDefinition('weapon:'+i),cap:1})),
 ...FARM_CROPS.map((crop,i)=>({...itemDefinition('seed:'+i),price:crop.cost,cap:FARM_STOCK_CAP})),
 ...Object.entries(AMMO_TYPES).map(([k,r])=>({...itemDefinition('ammo:'+k),price:r.coins,pack:r.pack,cap:100000})),
 ...Object.entries(SUPPLY_ITEMS).map(([k,r])=>({...itemDefinition('supply:'+k),price:r.coins,pack:r.pack,cap:999})),
 ...Object.entries(OUTDOOR_GEAR).map(([k,r])=>({...r,id:'outdoor:'+k,price:r.coins,cap:r.kind==='bait'?999:1})),
 {...itemDefinition('metal-detector'),price:DETECTOR.price,cap:1},
].map(row=>[row.id,row]));

// 运输目录包含采集物，但不把鱼获和牧草加入商店出售目录。
export const CARGO_GOODS={...SHOP_GOODS,...Object.fromEntries([
 {...itemDefinition('material:sweet-grass'),cap:999},
 ...FISH_SPECIES.map(f=>({id:'fish:'+f.id,name:f.name,mass:f.mass,category:'outdoor',cap:OUTDOOR_RULES.maxFish,icon:{kind:'outdoor',key:'fish'}})),
].map(r=>[r.id,r]))};

// 老档没有待领取的商品；仓库按车型保留，避免把一件货计入多个货舱。
export function normalizeShopStock(raw,hulls){
 const result={};
 for(const [where,stock] of Object.entries(raw||{})){
  if(where!=='home'&&!(String(Number(where))===where&&hulls[where]))continue;
  for(const [id,count] of Object.entries(stock||{})){
   const item=CARGO_GOODS[id];if(!Object.hasOwn(CARGO_GOODS,id)||!Number.isSafeInteger(count)||count<=0)continue;
   (result[where]??={})[id]=Math.min(item.cap,count);
  }
 }
 return result;
}
// 返回可写的原库存槽；新货种在货舱或小屋内保存在专属格，取回后直接可用。
export function shopSlot(p,item,where){
 if(where==='bag'){
  if(item.id==='material:sweet-grass')return [p.farm,'forage'];
  if(item.id.startsWith('fish:'))return [p.outdoors.fish,item.id.slice(5)];
  if(item.category==='seed')return [p.farm.seeds,item.index];
  if(item.category==='ammo')return [p.supplies.hand,item.key];
  if(item.category==='supply')return [p.supplies.items,item.key];
  if(item.id==='metal-detector')return [p.treasure,'detector'];
  if(item.kind==='tent')return [p.outdoors,'tent'];
  if(item.kind==='fish-container')return [p.outdoors.containers,item.tackleId];
  if(item.tackleId===item.kind)return [p.outdoors,item.kind];
  return [item.kind==='bait'?p.outdoors.baits:p.outdoors.rods,item.tackleId];
 }
 if(item.category==='ammo')return [where==='home'?p.warehouse.ammo:p.supplies.vehicles[where],item.key];
 if(item.category==='seed'&&where==='home')return [p.warehouse.seeds,item.index];
 const stock=p.shopStock??={};return [stock[where]??={},item.id];
}
// 仅额外的货格需要另计重量，原弹药和露营套装仍由各自的负重代码统计。
export function shopCargoMass(p,hull,magazines=p.supplies?.handMags){
 return Object.entries(p.shopStock?.[hull]||{}).reduce((total,[id,n])=>{
  const item=CARGO_GOODS[id];if(!item)return total;const key=item.category==='weapon'&&ammoKind(WEAPONS[item.index]);
  const extra=key?itemDefinition('magazine').mass+(magazines?.[item.index]?.ammo||0)*AMMO_TYPES[key].mass:0;
  return total+(item.mass+extra)*n;
 },0);
}
// 唯一工具存放期间仍属已购，避免在店里重复购买。
export function storedShopGood(p,id){return Object.values(p.shopStock||{}).some(store=>store[id]>0);}
