import {approachWarehouseMine} from '../core/navigation/scene-approach.js';
import {deliveryRows} from './shop-deliveries.js';
import {collectShopStock} from '../core/economy/shop-delivery.js';
// 小屋仓库双库存格子，拖拽提出存取请求，滑条确认后交给正式仓库事务。
import {canUseWarehouse,warehouseVehicles,warehouseRows,warehouseTransferPreview,transferWarehouse} from '../core/inventory/warehouse.js';
import {catLoad,vehicleLoad} from '../progression/inventory/load-weight.js';
import {COLLECTED_VEHICLES} from '../config/vehicles.js';
import {inventoryIcon,paintInventoryIcons} from './inventory-icons.js';
import {createEventScope} from '../platform/events.js';
import {createWarehouseDrag} from './warehouse-drag.js';
// 小屋库存作为主区，背包与附近载具用页签切换，完整列表共用正文滚动。
export function createWarehouse({game,root,dialogs,onChange}){
 const scope=createEventScope(),panel=root.createElement('dialog'),quantity=root.createElement('dialog');let source='bag',category='all',selection=null,message='',shownProgress=null;
 panel.id='warehouse-dialog';panel.className='ui-panel ui-panel--fullscreen ui-page';panel.setAttribute('aria-labelledby','warehouse-title');
 panel.innerHTML='<header class="ui-panel__header"><h2 id="warehouse-title">小屋仓库</h2><div class="warehouse-header-actions"><button class="ui-close" data-help aria-label="仓库帮助" aria-controls="warehouse-help" aria-expanded="false">?</button><button class="ui-close" data-close aria-label="关闭仓库">×</button></div></header><div class="ui-panel__body"><div class="warehouse-toolbar"><div class="warehouse-views"><button id="warehouse-home-link" class="ui-button ui-button--primary warehouse-home-link" data-warehouse-jump="stored" data-warehouse-zone="withdraw">仓库</button><nav id="warehouse-sources" role="tablist" aria-label="背包与载具仓库"></nav></div><nav class="warehouse-tabs warehouse-categories" aria-label="物品分类"></nav></div><aside id="warehouse-help" class="ui-inset" hidden><p>点选物品或拖到另一库存，选择数量后确认存取。</p><p>两厂成品自动入库；靠近仓库自动存木材，农作物兑换金币。手动取出的木材本次停留保留。</p><p>金币和公共材料直接用于支付、建造；武器保留弹匣、等级与改装。</p></aside><p id="warehouse-message" role="status"></p><div class="warehouse-stores"><section class="warehouse-store warehouse-store--home" data-warehouse-zone="withdraw" aria-label="仓库物品"><header><h3>仓库物品</h3><span id="warehouse-stored-total"></span></header><div id="warehouse-stored" class="warehouse-grid"></div></section><section id="warehouse-carried-panel" class="warehouse-store warehouse-store--carried" role="tabpanel" data-warehouse-zone="deposit"><header><p id="warehouse-load"></p><span id="warehouse-carried-total"></span></header><div id="warehouse-carried" class="warehouse-grid"></div></section></div><section class="warehouse-services" data-mine-dock hidden><button class="ui-button" data-enter-mine>进入矿井</button></section></div>';
 quantity.id='warehouse-quantity';quantity.className='ui-panel ui-panel--compact';quantity.setAttribute('aria-labelledby','warehouse-quantity-title');
 quantity.innerHTML='<header class="ui-panel__header"><h2 id="warehouse-quantity-title"></h2><button class="ui-close" data-cancel aria-label="取消存取">×</button></header><div class="ui-panel__body" id="warehouse-quantity-body"></div><footer class="ui-panel__footer"><button class="ui-button" data-cancel>取消</button><button class="ui-button ui-button--primary" data-confirm>确认</button></footer>';
 root.body.append(panel,quantity);
 // 父页先转交暂停归属，避免外部关闭父页后数量层阻止游戏恢复。
 scope.on(panel,'close',()=>{if(!panel.open&&quantity.open){dialogs.transferResume(panel.id,quantity.id);dialogs.close(quantity.id);}selection=null;});
 dialogs.register(panel.id,{focusId:'warehouse-home-link'});dialogs.register(quantity.id,{focusId:'warehouse-range'});
 const get=id=>root.getElementById('warehouse-'+id),drag=createWarehouseDrag({panel,onTransfer:choose});
 // 正数库存按物品目录生成格子，数量不缩写，只保留简短类别统计。
 function renderStore(rows,direction){const field=direction==='deposit'?'carried':'stored',items=rows.filter(r=>r[field]>0||r.readonly&&r.category==='currency'&&field==='stored'),visible=items.filter(r=>category==='all'||r.category===category);
  get(field+'-total').textContent=`${items.length} 类`;
  get(field).innerHTML=visible.map(r=>r.readonly?`<button class="warehouse-slot" ${r.category==='currency'?'data-warehouse-currency':`data-warehouse-balance="${r.key}"`} aria-label="${r.name}，${r.stored}${r.category==='currency'?'枚':'份'}，查看说明"><span class="warehouse-slot__art">${inventoryIcon(r)}<strong class="warehouse-slot__count">${r.stored}</strong></span><span class="warehouse-slot__name">${r.name}</span></button>`:`<button class="warehouse-slot" data-item="${r.id}" data-direction="${direction}" aria-label="${direction==='deposit'?'存入':'取出'}${r.name}，${r[field]}份，每份${r.mass}千克" ${source!=='bag'&&['seed','weapon'].includes(r.category)?'disabled title="请切换到猫猫背包存取"':''}><span class="warehouse-slot__art" data-warehouse-grip>${inventoryIcon(r)}<strong class="warehouse-slot__count">${r[field]}</strong></span><span class="warehouse-slot__name">${r.name}</span></button>`).join('')||`<p class="warehouse-empty">${items.length?'此分类暂无物品':'暂无物品'}</p>`;
 }
 // 仅在打开或事务变更时更新格子，车辆权限重新核验，仓库种子不会因选择货舱而消失。
 function render(){
  shownProgress=game.progress;
  const dock=panel.querySelector('[data-mine-dock]');dock.hidden=!game.progress.homeDecor.basement;
  dock.querySelector('button').disabled=game.vehicle.active;
  dock.querySelector('button').textContent=game.vehicle.active?'下车后进入矿井':'进入矿井';
  drag.cancel();const cars=warehouseVehicles(game);if(source!=='bag'&&!cars.includes(source))source='bag';
  get('sources').innerHTML=[['bag','背包'],...cars.map(i=>[i,COLLECTED_VEHICLES[i].name])].map(([key,name])=>`<button id="warehouse-source-${key}" class="warehouse-source-tab" role="tab" data-warehouse-source="${key}" aria-selected="${source===key}" aria-controls="warehouse-carried-panel" tabindex="${source===key?0:-1}" ${source===key?'data-warehouse-zone="deposit"':''}>${name}</button>`).join('');
  const carried=get('carried').parentElement;carried.setAttribute('aria-labelledby','warehouse-source-'+source);
  const load=source==='bag'?catLoad(game):vehicleLoad(game,source,{driver:true});get('load').textContent=`${(load.weight??load.payload).toFixed(2)} / ${load.capacity.toFixed(2)} 千克`;
  panel.querySelector('.warehouse-categories').innerHTML=[['all','全部'],['currency','金币'],['material','材料'],['weapon','武器'],['ammo','弹药'],['seed','种子']].map(([key,name])=>`<button class="ui-button" data-category="${key}" aria-pressed="${category===key}">${name}</button>`).join('');
  get('message').textContent=message;
  renderStore(warehouseRows(game,source),'deposit');renderStore(warehouseRows(game,'bag'),'withdraw');
  panel.querySelectorAll('[data-shop-stock]').forEach(n=>n.remove());
  // 待领取商品留在对应库存区，避免大列表把它们挤到另一个仓库之后。
  for(const [field,stock]of [['stored',deliveryRows(game.progress,'home','小屋仓库存放的商品')],['carried',source==='bag'?'':deliveryRows(game.progress,source,COLLECTED_VEHICLES[source].name+'存放的商品')]])if(stock)get(field).parentElement.insertAdjacentHTML('beforeend','<div data-shop-stock>'+stock+'</div>');
  paintInventoryIcons(panel,game.progress);
  alignSource();
 }
 // 只滚动页签轨道，不让打开页面或自动刷新带动完整物品列表跳动。
 function alignSource(){const nav=get('sources'),tab=get('source-'+source);if(!nav.clientWidth||!tab)return;if(source==='bag'){nav.scrollLeft=0;return;}const area=nav.getBoundingClientRect(),item=tab.getBoundingClientRect(),left=area.left+get('source-bag').offsetWidth;if(item.left<left)nav.scrollLeft+=item.left-left;else if(item.right>area.right)nav.scrollLeft+=item.right-area.right;}
 // 两区完整展示于同一正文，源页签与仓库入口同时保留跨区拖放目标。
 function jump(field){const body=panel.querySelector('.ui-panel__body'),target=get(field).parentElement,toolbar=panel.querySelector('.warehouse-toolbar');body.scrollTop+=target.getBoundingClientRect().top-body.getBoundingClientRect().top-toolbar.getBoundingClientRect().height-8;}
 // 拖放和键盘点选共用同一确认流程，先选择数量，取消不扣物品。
 function choose(id,direction){const r=warehouseRows(game,source).find(r=>r.id===id),max=direction==='deposit'?r?.carried:r?.stored;if(!max)return;selection={id,direction,source,count:1,max};get('quantity-title').textContent=`${direction==='deposit'?'存入':'取出'}${r.name}`;
  get('quantity-body').innerHTML=`<p>${direction==='deposit'?'随行物品 → 仓库':'仓库 → '+(source==='bag'?'猫猫背包':'载具货舱')} · 每份 ${r.mass} 千克</p><label for="warehouse-range">数量 <output id="warehouse-count">1</output> / ${max}</label><input id="warehouse-range" type="range" min="1" max="${max}" value="1" step="1"><div class="warehouse-tabs"><button class="ui-button" data-amount="1">1 份</button><button class="ui-button" data-amount="${max}">全部</button></div><p id="warehouse-preview" role="status"></p>`;preview();dialogs.open(quantity.id);
 }
 // 实时预览满载风险，确认按钮的明确文案表示玩家选择继续取出。
 function preview(){if(!selection)return;const p=warehouseTransferPreview(game,selection.source,selection.id,selection.count,selection.direction);get('count').textContent=selection.count;get('preview').textContent=p.ok?`操作后负重 ${p.weight.toFixed(2)} / ${p.capacity.toFixed(2)} 千克。${p.needsConfirmation?'载荷已满，'+(selection.source==='bag'?'猫猫只能缓慢行走。':'载具将无法行驶。')+'可减少数量，或确认继续取出。':''}`:p.message;const confirm=quantity.querySelector('[data-confirm]');confirm.disabled=!p.ok;confirm.textContent=p.needsConfirmation?'仍要取出':selection.direction==='deposit'?'确认存入':'确认取出';}
 // 切换页签后将当前来源留在可视范围，并保持键盘焦点和横向位置。
 function selectSource(value,focus=false){source=value==='bag'?'bag':Number(value);message='';render();jump('carried');if(focus)get('source-'+source).focus({preventScroll:true});}
 scope.on(root.defaultView,'resize',()=>{if(panel.open)alignSource();});
 // 页签按左右方向键或首尾键切换，与手机点按使用相同的来源校验。
 scope.on(get('sources'),'keydown',e=>{const tabs=[...get('sources').querySelectorAll('[role=tab]')],index=tabs.indexOf(e.target);if(index<0||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;selectSource(tabs[next].dataset.warehouseSource,true);});
 scope.on(panel,'click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;if(b.dataset.warehouseJump){jump(b.dataset.warehouseJump);return;}if(b.dataset.warehouseSource!==undefined){selectSource(b.dataset.warehouseSource);return;}if(b.hasAttribute('data-help')){const help=get('help');help.hidden=!help.hidden;b.setAttribute('aria-expanded',String(!help.hidden));if(!help.hidden)panel.querySelector('.ui-panel__body').scrollTop=0;return;}if(b.hasAttribute('data-enter-mine')){panel.addEventListener('close',()=>{approachWarehouseMine(game);onChange();},{once:true});dialogs.close(panel.id);return;}if(b.dataset.collectGood){message=collectShopStock(game,b.dataset.collectWhere==='home'?'home':Number(b.dataset.collectWhere),b.dataset.collectGood).message;render();onChange();return;}if(b.hasAttribute('data-close'))return dialogs.close(panel.id);if(b.dataset.warehouseBalance){const balance=warehouseRows(game).find(r=>r.readonly&&r.key===b.dataset.warehouseBalance);if(balance){message=balance.name+' '+balance.stored+' 份 · 建造和工坊直接使用同一库存，无需取出。';get('message').textContent=message;}return;}if(b.hasAttribute('data-warehouse-currency')){message='金币 '+game.progress.coins+' 枚 · 与顶部钱包为同一余额，购买、修理与升级直接扣除，无需取出。';get('message').textContent=message;return;}if(b.dataset.category){category=b.dataset.category;render();}else if(b.dataset.item)choose(b.dataset.item,b.dataset.direction);});
 scope.on(quantity,'input',e=>{if(e.target.id==='warehouse-range'&&selection){selection.count=Number(e.target.value);preview();}});
 scope.on(quantity,'click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;if(b.hasAttribute('data-cancel'))return dialogs.close(quantity.id);if(!selection)return;if(b.dataset.amount){selection.count=Number(b.dataset.amount);get('range').value=selection.count;preview();}else if(b.hasAttribute('data-confirm')){const r=transferWarehouse(game,selection.source,selection.id,selection.count,selection.direction,true);message=r.message;selection=null;dialogs.close(quantity.id);render();onChange();}});
 scope.on(quantity,'close',()=>{if(!quantity.open)selection=null;});
 // 室外靠近仓库即可打开，超载仍可卸货，骑乘和世界位置保持不变。
 function open(){if(!canUseWarehouse(game))return false;source=game.vehicle.active?game.vehicle.index:'bag';category='all';selection=null;message='';get('help').hidden=true;panel.querySelector('[data-help]').setAttribute('aria-expanded','false');render();dialogs.open(panel.id);alignSource();return true;}
 // 释放手势和两个弹窗，避免重复初始化叠加事件。
 function dispose(){drag.dispose();scope.dispose();quantity.remove();panel.remove();}
 // 厂内结算替换存档后即时刷新已打开库存，不打断数量确认或正在进行的拖放。
 function renderFrame(){if(panel.open&&!quantity.open&&!drag.active&&game.progress!==shownProgress)render();}
 return {open,render,renderFrame,dispose};
}
