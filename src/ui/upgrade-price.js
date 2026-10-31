// 升级报价展示：复用正式报价，原价与折后价始终成对出现。
import { economyUpgradeQuote } from '../config/economy.js';
import { priceIcons } from '../rendering/resource-icons.js';

// 卡片与载具按钮共用紧凑两行价格；普通升级保持原来的图标报价。
export function upgradePriceMarkup(progress,kind,index,level,part=null){
  const quote=economyUpgradeQuote(progress,kind,index,level,part);
  if(quote.discount>=1)return priceIcons(quote.cost);
  return `<span class="upgrade-price"><span class="upgrade-price-original">原价 <s>${priceIcons(quote.original)}</s></span><span>折后 ${priceIcons(quote.cost)}</span></span>`;
}
