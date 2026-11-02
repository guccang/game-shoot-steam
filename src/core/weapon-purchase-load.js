// 购枪报价与正式扣款共用真实背包负重，避免购买后满载而无法离开工坊。
import {catLoad} from '../progression/load-weight.js';

// 预演候选武器、弹匣和现有库存；失败候选不能进入保存事务。
export function weaponPurchaseQuote(game,plan,quote){
  if(!quote.ok||!quote.next||plan.kind!=='weapons'||plan.action!=='buy')return quote;
  const load=catLoad(Object.assign(Object.create(game),{progress:quote.next}));
  if(!load.overloaded)return {...quote,load};
  return {...quote,ok:false,next:null,load,loadBlocked:true,
    reason:`购买后背包负重 ${load.weight.toFixed(2)} / ${load.capacity} kg，已达到载荷上限。请先整理背包，或将不用的武器存入小屋武器架。`};
}
