// 小屋和载具共用待领取商品列表，沿用正式商品名称及数量。
import {SHOP_GOODS} from '../progression/economy/shop-stock.js';
export function deliveryRows(progress,where,title='存放的商品'){
 const rows=Object.entries(progress.shopStock?.[where]||{}).filter(([id,n])=>SHOP_GOODS[id]&&n>0);
 if(!rows.length)return '';
 return '<section class="ui-section"><h3>'+title+'</h3>'+rows.map(([id,n])=>`<p>${SHOP_GOODS[id].name} ×${n}</p><button class="ui-button" data-collect-good="${id}" data-collect-where="${where}">取回背包</button>`).join('')+'</section>';
}
