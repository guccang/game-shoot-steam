// 购买武器时用正式弹匣和负重选择交付地，仓储只改变位置，武器成长保留在原字段。
import {catLoad,vehicleLoad} from '../progression/load-weight.js';
import {shopVehicles} from './shop-delivery.js';
import {vehicleModel} from '../config/vehicles.js';

// 报价生成器可重复执行，绝不修改传入的旧报价或运行时存档。
export function weaponPurchaseQuote(game,plan,quote){
 if(!quote.ok||!quote.next||plan.kind!=='weapons'||plan.action!=='buy')return quote;
 const next={...quote.next},load=catLoad(Object.assign(Object.create(game),{progress:next}));
 const mass=load.weight-catLoad(game).weight;
 for(const hull of shopVehicles(game)){
  const car=vehicleLoad(game,hull,{driver:false});
  if(car.payload+mass>=car.capacity)continue;
  next.shopStock={...next.shopStock,[hull]:{...next.shopStock?.[hull],['weapon:'+plan.index]:1}};
  next.weapon=game.progress.weapon;return {...quote,next,load,place:vehicleModel(hull).name+'的载具仓库'};
 }
 if(!load.overloaded)return {...quote,next,load,place:'猫猫背包'};
 next.warehouse={...next.warehouse,weapons:[...next.warehouse.weapons,plan.index]};
 next.weapon=game.progress.weapon;return {...quote,next,load,place:'小屋仓库'};
}
