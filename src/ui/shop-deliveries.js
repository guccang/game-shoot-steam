// 小屋和载具共用待领取商品列表，沿用正式商品名称及数量。
import {SHOP_GOODS} from '../progression/shop-stock.js';
export function deliveryRows(progress,where){
 const rows=Object.entries(progress.shopStock?.[where]||{}).filter(([,n])=>n>0);
 if(!rows.length)return '';
 return '<section class="ui-section"><h3>存放的商品</h3>'+rows.map(([id,n])=>`<p>${SHOP_GOODS[id].name} ×${n}</p><button class="ui-button" data-collect-good="${id}">取回背包</button>`).join('')+'</section>';
}
