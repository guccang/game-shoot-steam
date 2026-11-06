// 购买武器时用正式弹匣和负重选择交付地，仓储只改变位置，武器成长保留在原字段。
import {catLoad,vehicleLoad} from '../progression/load-weight.js';
import {shopVehicles} from './shop-delivery.js';
import {vehicleModel} from '../config/vehicles.js';

// 报价生成器可重复执行，绝不修改传入的旧报价或运行时存档。
export function weaponPurchaseQuote(game,plan,quote){
 if(!quote.ok||!quote.next||plan.kind!=='weapons'||plan.action!=='buy')return quote;
 const next={...quote.next},load=catLoad(Object.assign(Object.create(game),{progress:next}));
 if(!load.overloaded)return {...quote,next,load,place:'猫猫背包'};
 // 用付款后的候选库存试装整枪，弹匣、弹药及已消耗的材料按实际位置计重。
 for(const hull of shopVehicles(game)){
  const stored={...next,weapon:game.progress.weapon,shopStock:{...next.shopStock,[hull]:{...next.shopStock?.[hull],['weapon:'+plan.index]:1}}};
  const car=vehicleLoad(Object.assign(Object.create(game),{progress:stored}),hull,{driver:false});
  if(!car.overloaded)return {...quote,next:stored,load,place:vehicleModel(hull).name+'的载具仓库'};
 }
 next.warehouse={...next.warehouse,weapons:[...next.warehouse.weapons,plan.index]};
 next.weapon=game.progress.weapon;return {...quote,next,load,place:'小屋仓库'};
}
