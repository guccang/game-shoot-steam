import {buyFarmSeeds} from '../core/farm-seeds.js';
import {tradeSupply} from '../core/supplies.js';
import {buyOutdoorGear} from '../core/outdoors.js';
import {buyDetector} from '../core/treasure.js';
import {ERA_RESOURCES,eraVehicle,eraDonor} from '../config/vehicle-eras.js';
// 商品在上、结账区在下，点按或拖入购物车后统一确认。
import {createEventScope} from '../platform/events.js';
import {SHOP_GOODS} from '../progression/shop-stock.js';
import {shopDelivery} from '../core/shop-delivery.js';
import {HOME_CATALOG} from '../config/home-decor.js';
import {quoteWorkshop} from '../progression/workshop.js';
import {weaponPurchaseQuote} from '../core/weapon-purchase-load.js';
import {MATERIALS} from '../config/materials.js';

const selector='button[data-shop-good],button[data-shop-name]';
// 商品牌和数量按钮共用同一报价，专用交付项目由原商店提供实际费用和去向。
function offer(game,button,batches){
 const d=button.dataset,item=SHOP_GOODS[d.shopGood];
 if(d.shopKind){
  const plan={kind:d.shopKind,index:Number(d.shopIndex),action:'buy'};
  const q=weaponPurchaseQuote(game,plan,quoteWorkshop(game.progress,plan,!!game.realm));
  const price=q.rows.filter(r=>r.key!=='bosses').map(r=>r.need+' '+({coins:'金币',wood:'木材'}[r.key]||MATERIALS[r.key]?.name||ERA_RESOURCES[r.key]?.name)).join('、')||'免费';
  return {id:d.shopKind+':'+d.shopIndex,name:d.shopName,info:d.shopInfo,price,count:1,place:q.place||(plan.kind==='vehicle'?(eraDonor(eraVehicle(plan.index))?'原车停放处':'营地停车位'):null),error:q.reason,ok:q.ok};
 }
 if(item){
  const count=batches*(item.pack||1),cost=batches*item.price,delivery=shopDelivery(game,item.id,count);
  const affordable=game.progress.coins>=cost;
  return {id:item.id,name:item.name,info:item.description||item.use,price:cost+' 金币',count,place:delivery.label,error:affordable?delivery.message:'金币不足。',ok:delivery.ok&&affordable};
 }
 const furniture=HOME_CATALOG.find(i=>i.id===d.buy);
 return {id:d.shopKey||d.buy||d.shopName,name:d.shopName,info:furniture?.description||d.shopInfo||'',price:d.shopPrice,count:1,place:d.shopPlace,ok:!button.disabled};
}
// 每个商店保留独立清单，关闭购物车仍可继续选购。
export function createShopCheckout({game,root,dialogs,onNotice}){
 const scope=createEventScope(),panel=root.createElement('dialog'),carts=new Map();
 let gesture=null,owner=null,authorized=null,draggedButton=null,paying=false;
 panel.id='shop-checkout';panel.className='ui-panel ui-panel--compact';panel.setAttribute('aria-labelledby','shop-checkout-title');
 panel.innerHTML='<header class="ui-panel__header"><h2 id="shop-checkout-title">购物车</h2></header><div class="ui-panel__body"><div data-cart-lines></div><p data-price></p><p data-cart-message role="status"></p></div><footer class="ui-panel__footer"><button class="ui-button" data-cancel>继续选购</button><button class="ui-button ui-button--primary" data-pay>确认付款</button></footer>';
 root.body.append(panel);dialogs.register(panel.id);
 const shops=new Set(['seed-shop-dialog','outdoor-dialog','field-equipment-dialog','home-decor-dialog','workshop-dialog','logistics-dialog','cat-home-dialog','production-dialog','camp-dialog','vehicle-collection-dialog','inventory-dialog']);
 // 底栏只更新件数，保留同一个触控目标和键盘焦点。
 function updateZone(shop){
  const zone=shop.querySelector(':scope > .shop-dropzone');if(!zone)return;
  const count=(carts.get(shop)||[]).reduce((n,r)=>n+r.units*r.batches,0);
  zone.dataset.filled=String(count>0);
  zone.querySelector('span').textContent=count?'购物车 · '+count+' 件 · 查看清单':'购物车 · 可拖入商品';
 }
 // 创建可点按的购物车投放区。
 function prepare(id){
  const shop=root.getElementById(id);
  if(!shop||(!shops.has(id)&&!shop.querySelector(selector))||shop.querySelector(':scope > .shop-dropzone'))return;
  const zone=root.createElement('button');zone.type='button';zone.className='shop-dropzone';zone.setAttribute('aria-haspopup','dialog');zone.setAttribute('aria-controls',panel.id);
  zone.innerHTML='<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4h3l2.5 11h11l3-8H6M8 18h11"/><circle cx="9" cy="21" r="1"/><circle cx="18" cy="21" r="1"/></svg><span aria-live="polite"></span>';
  const footer=shop.querySelector(':scope > footer');if(footer&&!footer.querySelector(selector)&&id!=='workshop-dialog')footer.before(zone);else shop.append(zone);
  updateZone(shop);
 }
 // 用稳定操作参数识别商品。货架重绘后重新查找对应按钮。
 function keyOf(b){
  const d=b.dataset;
  return JSON.stringify([d.shopGood,d.shopKind,d.shopIndex,d.shopKey,d.buy,d.sow,d.catAdopt,d.tend,d.fitEngine,d.fitArmor,d.gliderModel,d.ammoTarget,d.shopPlace]);
 }
 // 加购只记录报价，不写入游戏存档。唯一装备在同一清单内只占一行。
 function add(button){
  const shop=button.closest('dialog');if(!shop||button.disabled)return;
  prepare(shop.id);
  const lines=carts.get(shop)||[],key=keyOf(button),q=offer(game,button,1),row=lines.find(r=>r.key===key);
  if(row){
   if(row.repeatable)row.batches++;
   else onNotice('这件商品已在购物车中。');
  }else lines.push({key,source:button.cloneNode(false),units:q.count,batches:1,repeatable:SHOP_GOODS[button.dataset.shopGood]?.cap>1||button.hasAttribute('data-buy')});
  carts.set(shop,lines);updateZone(shop);
 }
 // 数字和单位来自商店现有报价，同一货币或材料分别求和。
 function totals(lines){
  const sum=new Map();
  for(const row of lines)for(const match of row.quote.price.matchAll(/(\d+(?:\.\d+)?)\s*([^\d\s、，/]+)/g)){
   const unit=match[2];sum.set(unit,(sum.get(unit)||0)+Number(match[1])*row.batches);
  }
  return sum;
 }
 // 每次打开和修改数量后重新报价，并逐行保留交付位置。
 function renderCart(message=''){
  const lines=carts.get(owner)||[],list=panel.querySelector('[data-cart-lines]');list.replaceChildren();
  for(const [i,row] of lines.entries()){
   row.quote=offer(game,row.source,1);const q=row.quote,entry=root.createElement('article');entry.className='cart-line';
   const name=root.createElement('strong'),info=root.createElement('small'),remove=root.createElement('button');
   name.textContent=q.name+' ×'+row.batches*row.units;
   info.textContent=q.price+(row.batches>1?' × '+row.batches:'')+' · '+(q.ok?'交付到'+(q.place||'当前地点'):q.error);
   remove.type='button';remove.className='ui-button';remove.dataset.removeLine=i;remove.textContent='移除';remove.setAttribute('aria-label','移除'+q.name);
   entry.append(name,info,remove);
   // 种子及弹药仍可在清单内快速选择常用数量。
   const presets=row.source.hasAttribute('data-buy-seed')?[1,5,10]:row.source.hasAttribute('data-ammo-buy')?[1,5,20]:[];
   if(presets.length){
    const options=root.createElement('div');options.className='cart-quantities';
    for(const n of presets){const preset=root.createElement('button');preset.type='button';preset.className='ui-button';preset.textContent=n+(row.source.hasAttribute('data-buy-seed')?' 粒':' 包');preset.dataset.orderAmount=n;preset.dataset.cartRow=i;preset.setAttribute('aria-pressed',String(row.batches===n));options.append(preset);}
    entry.append(options);
   }
   list.append(entry);
  }
  const costs=totals(lines);
  panel.querySelector('[data-price]').textContent=lines.length?'合计　'+([...costs].map(([unit,n])=>n+' '+unit).join('、')||'免费'):'购物车是空的';
  const short=(costs.get('金币')||0)>game.progress.coins;
  panel.querySelector('[data-cart-message]').textContent=message||(short?'金币不足，请调整清单。':'');
  panel.querySelector('[data-pay]').disabled=!lines.length||short||lines.some(r=>!r.quote.ok);
 }

 // 商品手柄独占拖放，货架文字和格间留白仍支持原生滚动。
 function clear(){
  const g=gesture;gesture=null;if(!g)return;
  g.ghost?.remove();g.zone.classList.remove('shop-over','shop-active');
  if(g.button.hasPointerCapture(g.pointer))g.button.releasePointerCapture(g.pointer);
 }
 scope.on(root,'pointerdown',e=>{
  draggedButton=null;
  const card=e.target.closest('.seed-shop-good,.outdoor-gear,.home-product,.shop-grid>.ui-section,.item-card');
  const shelf=e.target.closest('[data-ws-item][data-shop-shelf]');
  const button=shelf||e.target.closest(selector)||(!e.target.closest('button,summary,details,select,input')&&card?.querySelector(selector));
  if(!button||button.disabled||!e.isPrimary||e.button!==0||panel.open)return;
  const owner=button.closest('dialog');prepare(owner.id);
  const zone=owner.querySelector(':scope > .shop-dropzone');if(!zone)return;
  clear();gesture={button,owner,zone,pointer:e.pointerId,x:e.clientX,y:e.clientY};button.setPointerCapture(e.pointerId);
 });
 // 指针捕获后按真实屏幕坐标判断是否进入下方收货框。
 function inside(zone,x,y){const r=zone.getBoundingClientRect();return r.width>0&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;}
 scope.on(root,'pointermove',e=>{
  const g=gesture;if(!g||g.pointer!==e.pointerId)return;
  if(!g.ghost&&Math.hypot(e.clientX-g.x,e.clientY-g.y)<7)return;
  if(!g.ghost){
   // 触屏在目录内纵划时让浏览器滚动，横向拖出后才接管结账。
   if(e.pointerType==='touch'&&g.button.hasAttribute('data-shop-shelf')&&Math.abs(e.clientY-g.y)>Math.abs(e.clientX-g.x)){clear();return;}
   g.ghost=root.createElement('span');g.ghost.className='shop-drag-label';g.ghost.setAttribute('aria-hidden','true');
   g.ghost.textContent=SHOP_GOODS[g.button.dataset.shopGood]?.name||g.button.dataset.shopName||g.button.getAttribute('aria-label');
   g.owner.append(g.ghost);g.zone.classList.add('shop-active');
  }
  const r=g.owner.getBoundingClientRect();g.ghost.style.left=(e.clientX-r.left)+'px';g.ghost.style.top=(e.clientY-r.top)+'px';
  g.zone.classList.toggle('shop-over',inside(g.zone,e.clientX,e.clientY));
 });
 scope.on(root,'pointerup',e=>{
  const g=gesture;if(!g||g.pointer!==e.pointerId)return;
  const dropped=g.ghost&&inside(g.zone,e.clientX,e.clientY);
  const tap=e.pointerType==='touch'&&!g.ghost&&Math.hypot(e.clientX-g.x,e.clientY-g.y)<7&&inside(g.button,e.clientX,e.clientY);
  if(g.ghost||tap)draggedButton=g.button;
  clear();
  if(tap){if(g.button.hasAttribute('data-shop-shelf'))g.button.click();else add(g.button);return;}
  if(!dropped)return;
  if(g.button.hasAttribute('data-shop-shelf')){
   g.button.click();const buy=root.getElementById('ws-purchase');
   if(!buy.hidden&&!buy.disabled)add(buy);
  }else add(g.button);
 });
 scope.on(root,'pointercancel',e=>{if(gesture?.pointer===e.pointerId)clear();});
 // 图标将隐式捕获交给商品按钮时，图标自身也会发出捕获丢失事件。
 scope.on(root,'lostpointercapture',e=>{if(gesture?.pointer===e.pointerId&&e.target===gesture.button)clear();});
 scope.on(root.defaultView,'blur',clear);
 // 拖放后移动浏览器可能抑制后续合成点击；购物车接受一次独立轻触。
 function openCart(zone){
  if(panel.open)return;
  owner=zone.closest('dialog');renderCart();root.body.append(panel);dialogs.open(panel.id);
 }
 scope.on(root,'pointerup',e=>{
  const zone=e.target.closest('.shop-dropzone');
  if(zone&&e.isPrimary&&e.pointerType==='touch'&&inside(zone,e.clientX,e.clientY)){e.preventDefault();openCart(zone);}
 });
 scope.on(root,'click',e=>{
  // 货架选中后会立即重绘，合成点击可能命中新位置的另一车型。
  if(e.detail!==0&&draggedButton){draggedButton=null;e.preventDefault();e.stopImmediatePropagation();return;}
  const zone=e.target.closest('.shop-dropzone');if(zone){e.preventDefault();e.stopImmediatePropagation();openCart(zone);return;}
  const b=e.target.closest(selector);if(!b||b===authorized)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(!b.disabled&&!panel.open)add(b);
 },true);
// 从工坊目录恢复对应型号，并重查当前柜台是否仍提供相同操作。
 function liveButton(row){
  const d=row.source.dataset;
  if(owner.id==='workshop-dialog'&&d.shopKind&&owner.dataset.workshopKind===d.shopKind){
   const tile=owner.querySelector('[data-ws-item="'+Number(d.shopIndex)+'"]');
   if(tile&&tile.getAttribute('aria-pressed')!=='true')tile.click();
  }
  return [...owner.querySelectorAll(selector)].find(b=>keyOf(b)===row.key&&!b.hidden);
 }
 // 货架可能已经切到另一分类，常规商品仍走同一个正式购买函数。
 function purchase(row,button){
  const d=row.source.dataset;
  if(button){
   if(button.disabled)return {ok:false,message:'该商品目前无法购买。'};
   const before=game.progress,coins=before.coins,wood=before.wood;
   authorized=button;try{button.click();}finally{authorized=null;}
   return {ok:game.progress!==before||game.progress.coins<coins||game.progress.wood<wood,message:'购买未完成，请检查库存、材料和商品条件。'};
  }
  if(d.buySeed!==undefined)return buyFarmSeeds(game,Number(d.buySeed),1);
  if(d.ammoBuy)return tradeSupply(game,{kind:'ammo',id:d.ammoBuy,batches:1,target:d.ammoTarget});
  if(d.itemBuy)return tradeSupply(game,{kind:'item',id:d.itemBuy,batches:1,target:'hand'});
  if(d.outdoorBuy)return buyOutdoorGear(game,d.outdoorBuy);
  if(d.buyDetector!==undefined)return buyDetector(game);
  return {ok:false,message:'请返回该商品的货架后重试。'};
 }
 // 只移除已成功交付的数量，库存变化或保存失败时保留剩余清单。
 function pay(){
  if(paying||!owner?.open)return;
  paying=true;
  try{
   const lines=carts.get(owner)||[];
   let delivered=0;
   for(const row of [...lines]){
    while(row.batches>0){
     const button=liveButton(row),q=offer(game,button||row.source,1);
     if(!q.ok||q.price!==row.quote.price||q.place!==row.quote.place){if(button)row.source=button.cloneNode(false);renderCart(q.ok?'报价或交付地点已变化，请核对后继续。':q.error);return;}
     const result=purchase(row,button);
     if(!result.ok){renderCart((delivered?'已交付 '+delivered+' 件，剩余商品保留在购物车。':'')+result.message);return;}
     delivered+=row.units;row.batches--;if(!row.batches)lines.splice(lines.indexOf(row),1);updateZone(owner);
    }
   }
   dialogs.close(panel.id);onNotice('购物车中的商品已交付。');
  }finally{paying=false;}
 }
 scope.on(panel,'click',e=>{
  const amount=e.target.closest('[data-order-amount]');
  if(amount&&owner){carts.get(owner)[Number(amount.dataset.cartRow)].batches=Number(amount.dataset.orderAmount);updateZone(owner);renderCart();return;}
  const remove=e.target.closest('[data-remove-line]');
  if(remove&&owner){carts.get(owner).splice(Number(remove.dataset.removeLine),1);updateZone(owner);renderCart();return;}
  if(e.target.closest('[data-cancel]'))dialogs.close(panel.id);
  else if(e.target.closest('[data-pay]'))pay();
 });
 scope.on(root,'close',e=>{
  if(!carts.has(e.target)||e.target.open)return;
  carts.delete(e.target);updateZone(e.target);if(owner===e.target&&panel.open)dialogs.close(panel.id);
 },true);
 // 实例关闭后释放所有监听与临时订单。
 return {prepare,dispose(){clear();carts.clear();scope.dispose();panel.remove();root.querySelectorAll('.shop-dropzone').forEach(zone=>zone.remove());}};
}
