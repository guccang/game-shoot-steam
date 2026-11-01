// 小屋仓库双库存格子，拖拽提出存取请求，滑条确认后交给正式仓库事务。
import {canUseWarehouse,warehouseVehicles,warehouseRows,warehouseTransferPreview,transferWarehouse} from '../core/warehouse.js';
import {catLoad,vehicleLoad} from '../progression/load-weight.js';
import {COLLECTED_VEHICLES} from '../config/vehicles.js';
import {inventoryIcon} from './inventory-icons.js';
import {createEventScope} from '../platform/events.js';
import {createWarehouseDrag} from './warehouse-drag.js';
// 创建统一手机底板及独立数量确认层，两个库存区始终保留可投放空间。
export function createWarehouse({game,root,dialogs,onChange}){
 const scope=createEventScope(),panel=root.createElement('dialog'),quantity=root.createElement('dialog');let source='bag',category='all',selection=null,message='';
 panel.id='warehouse-dialog';panel.className='ui-panel ui-page';panel.setAttribute('aria-labelledby','warehouse-title');
 panel.innerHTML='<header class="ui-panel__header"><h2 id="warehouse-title">小屋仓库</h2><button class="ui-close" data-close aria-label="关闭仓库">×</button></header><div class="ui-panel__body"><select id="warehouse-source" aria-label="存取位置"></select><p id="warehouse-load"></p><nav class="warehouse-tabs" aria-label="物品分类"></nav><p class="warehouse-hint">拖动图标到另一侧存取，也可点选</p><div class="warehouse-stores"><section class="warehouse-store" data-warehouse-zone="deposit" aria-label="随行物品"><header><h3 id="warehouse-carried-title">猫猫背包</h3><span id="warehouse-carried-total"></span></header><div id="warehouse-carried" class="warehouse-grid"></div></section><section class="warehouse-store" data-warehouse-zone="withdraw" aria-label="仓库物品"><header><h3>仓库</h3><span id="warehouse-stored-total"></span></header><div id="warehouse-stored" class="warehouse-grid"></div></section></div><p id="warehouse-message" role="status"></p><p class="warehouse-note">靠近自动存木材、农作物按售价兑换金币 · 金币支付时直接扣除，无需取出 · 手动取出的木材本次停留保留 · 仅存备用弹药</p></div>';
 quantity.id='warehouse-quantity';quantity.className='ui-panel ui-panel--compact';quantity.setAttribute('aria-labelledby','warehouse-quantity-title');
 quantity.innerHTML='<header class="ui-panel__header"><h2 id="warehouse-quantity-title"></h2><button class="ui-close" data-cancel aria-label="取消存取">×</button></header><div class="ui-panel__body" id="warehouse-quantity-body"></div><footer class="ui-panel__footer"><button class="ui-button" data-cancel>取消</button><button class="ui-button ui-button--primary" data-confirm>确认</button></footer>';
 root.body.append(panel,quantity);
 // 父页先转交暂停归属，避免外部关闭父页后数量层阻止游戏恢复。
 scope.on(panel,'close',()=>{if(!panel.open&&quantity.open){dialogs.transferResume(panel.id,quantity.id);dialogs.close(quantity.id);}selection=null;});
 dialogs.register(panel.id,{focusId:'warehouse-source'});dialogs.register(quantity.id,{focusId:'warehouse-range'});
 const get=id=>root.getElementById('warehouse-'+id),drag=createWarehouseDrag({panel,onTransfer:choose});
 // 正数库存按物品目录生成格子，数量不缩写，标题显示此库存的全部物品总数。
 function renderStore(rows,direction){const field=direction==='deposit'?'carried':'stored',items=rows.filter(r=>r[field]>0||r.readonly&&field==='stored'),visible=items.filter(r=>category==='all'||r.category===category);
  get(field+'-total').textContent=`${items.length} 类 · ${items.reduce((sum,r)=>sum+r[field],0)} 件`;
  get(field).innerHTML=visible.map(r=>r.readonly?`<button class="warehouse-slot" data-warehouse-currency aria-label="金币，${r.stored}枚，查看说明"><span class="warehouse-slot__art">${inventoryIcon(r)}<strong class="warehouse-slot__count">${r.stored}</strong></span><span class="warehouse-slot__name">金币</span></button>`:`<button class="warehouse-slot" data-item="${r.id}" data-direction="${direction}" aria-label="${direction==='deposit'?'存入':'取出'}${r.name}，${r[field]}份，每份${r.mass}千克" ${source!=='bag'&&r.category==='seed'?'disabled title="请切换到猫猫背包存取种子"':''}><span class="warehouse-slot__art" data-warehouse-grip>${inventoryIcon(r)}<strong class="warehouse-slot__count">${r[field]}</strong></span><span class="warehouse-slot__name">${r.name}</span></button>`).join('')||`<p class="warehouse-empty">${items.length?'此分类暂无物品':'暂无物品'}<br>${category==='currency'?'金币由仓库保管，支付时直接扣除':direction==='deposit'?'从仓库拖到这里取出':'从随行区拖到这里存入'}</p>`;
 }
 // 仅在打开或事务变更时更新格子，车辆权限重新核验，仓库种子不会因选择货舱而消失。
 function render(){
  panel.querySelector('.warehouse-hint').textContent=category==='currency'?'金币与顶部钱包为同一余额，支付时直接扣除':'拖动图标到另一侧存取，也可点选';
  drag.cancel();const cars=warehouseVehicles(game);if(source!=='bag'&&!cars.includes(source))source='bag';
  get('source').innerHTML='<option value="bag">猫猫背包</option>'+cars.map(i=>`<option value="${i}">${COLLECTED_VEHICLES[i].name}货舱</option>`).join('');get('source').value=String(source);
  const load=source==='bag'?catLoad(game):vehicleLoad(game,source,{driver:true});get('load').textContent=`${source==='bag'?'背包负重':'载具负重（含驾驶员）'} ${(load.weight??load.payload).toFixed(2)} / ${load.capacity.toFixed(2)} 千克`;
  panel.querySelector('nav').innerHTML=[['all','全部'],['currency','金币'],['material','木材'],['ammo','弹药'],['seed','种子']].map(([key,name])=>`<button class="ui-button" data-category="${key}" aria-pressed="${category===key}">${name}</button>`).join('');
  get('carried-title').textContent=source==='bag'?'猫猫背包':'载具货舱';get('message').textContent=message||(source!=='bag'?'种子请切换到猫猫背包存取。':'');
  renderStore(warehouseRows(game,source),'deposit');renderStore(warehouseRows(game,'bag'),'withdraw');
 }
 // 拖放和键盘点选共用同一确认流程，先选择数量，取消不扣物品。
 function choose(id,direction){const r=warehouseRows(game,source).find(r=>r.id===id),max=direction==='deposit'?r?.carried:r?.stored;if(!max)return;selection={id,direction,source,count:1,max};get('quantity-title').textContent=`${direction==='deposit'?'存入':'取出'}${r.name}`;
  get('quantity-body').innerHTML=`<p>${direction==='deposit'?'随行物品 → 仓库':'仓库 → '+(source==='bag'?'猫猫背包':'载具货舱')} · 每份 ${r.mass} 千克</p><label for="warehouse-range">数量 <output id="warehouse-count">1</output> / ${max}</label><input id="warehouse-range" type="range" min="1" max="${max}" value="1" step="1"><div class="warehouse-tabs"><button class="ui-button" data-amount="1">1 份</button><button class="ui-button" data-amount="${max}">全部</button></div><p id="warehouse-preview" role="status"></p>`;preview();dialogs.open(quantity.id);
 }
 // 实时预览满载风险，确认按钮的明确文案表示玩家选择继续取出。
 function preview(){if(!selection)return;const p=warehouseTransferPreview(game,selection.source,selection.id,selection.count,selection.direction);get('count').textContent=selection.count;get('preview').textContent=p.ok?`操作后负重 ${p.weight.toFixed(2)} / ${p.capacity.toFixed(2)} 千克。${p.needsConfirmation?'载荷已满，将无法移动。可减少数量，或确认继续取出。':''}`:p.message;const confirm=quantity.querySelector('[data-confirm]');confirm.disabled=!p.ok;confirm.textContent=p.needsConfirmation?'仍要取出':selection.direction==='deposit'?'确认存入':'确认取出';}
 scope.on(get('source'),'change',()=>{source=get('source').value==='bag'?'bag':Number(get('source').value);message='';render();});
 scope.on(panel,'click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;if(b.hasAttribute('data-close'))return dialogs.close(panel.id);if(b.hasAttribute('data-warehouse-currency')){message='金币 '+game.progress.coins+' 枚 · 与顶部钱包为同一余额，购买、修理与升级直接扣除，无需取出。';get('message').textContent=message;return;}if(b.dataset.category){category=b.dataset.category;render();}else if(b.dataset.item)choose(b.dataset.item,b.dataset.direction);});
 scope.on(quantity,'input',e=>{if(e.target.id==='warehouse-range'&&selection){selection.count=Number(e.target.value);preview();}});
 scope.on(quantity,'click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;if(b.hasAttribute('data-cancel'))return dialogs.close(quantity.id);if(!selection)return;if(b.dataset.amount){selection.count=Number(b.dataset.amount);get('range').value=selection.count;preview();}else if(b.hasAttribute('data-confirm')){const r=transferWarehouse(game,selection.source,selection.id,selection.count,selection.direction,true);message=r.message;selection=null;dialogs.close(quantity.id);render();onChange();}});
 scope.on(quantity,'close',()=>{if(!quantity.open)selection=null;});
 // 室外靠近仓库即可打开，超载仍可卸货，骑乘和世界位置保持不变。
 function open(){if(!canUseWarehouse(game))return false;source=game.vehicle.active?game.vehicle.index:'bag';category='all';selection=null;message='';render();dialogs.open(panel.id);return true;}
 // 释放手势和两个弹窗，避免重复初始化叠加事件。
 function dispose(){drag.dispose();scope.dispose();quantity.remove();panel.remove();}
 return {open,render,dispose};
}
