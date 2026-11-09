import {escapeHtml as escape} from './shared/html.js';
// 背包与货舱共用手机数量底板，取消不扣物，确认前展示真实目标负重。
import {createEventScope} from '../platform/events.js';
import {vehicleModel} from '../config/vehicles.js';
import {inventoryIcon,paintInventoryIcons} from './inventory-icons.js';
import {transferItem,transferQuantity,transferVehicles,previewInventoryTransfer,transferInventoryItem} from '../core/inventory/inventory-transfer.js';

// 所有文本来自正式物品目录，插入属性和正文前统一转义。

// 子页按打开顺序置于父页之后，沿用现有暂停与焦点管理。
export function createInventoryTransfer({game,root,dialogs,onChange,onNotice}){
 const scope=createEventScope(),panel=root.createElement('dialog');panel.id='inventory-transfer-dialog';panel.className='ui-panel ui-panel--compact ui-page inventory-transfer';panel.setAttribute('aria-labelledby','inventory-transfer-title');
 panel.innerHTML='<header class="ui-panel__header"><h2 id="inventory-transfer-title"></h2><button id="inventory-transfer-close" class="ui-close" aria-label="关闭移物">×</button></header><div class="ui-panel__body"></div><footer class="ui-panel__footer"><button class="ui-button" data-transfer-cancel>取消</button><button class="ui-button ui-button--primary" data-transfer-confirm>确认移入</button></footer>';root.body.append(panel);
 let id=null,direction='load',hull=null;
 const body=panel.querySelector('.ui-panel__body'),confirm=panel.querySelector('[data-transfer-confirm]');
 // 数量输入仅更新预览，不重建输入框或打断手机键盘焦点。
 function preview(){
  const count=Number(panel.querySelector('[data-transfer-count]').value),result=previewInventoryTransfer(game,id,hull,count,direction);
  const status=panel.querySelector('[data-transfer-status]');confirm.disabled=!result.ok;
  status.textContent=result.ok?`转移后：背包 ${result.bag.weight.toFixed(2)} / ${result.bag.capacity} kg；载具 ${result.car.payload.toFixed(2)} / ${result.car.capacity} kg。`:result.message;
 }
 // 一次打开只渲染一次物品、目标及数量；切车后重新核验库存和载荷。
 function render(){
  const item=transferItem(id),vehicles=direction==='load'?transferVehicles(game):[hull],count=transferQuantity(game,id,direction==='load'?'bag':hull);
  if(!vehicles.includes(hull))hull=vehicles.includes(game.vehicle.index)?game.vehicle.index:vehicles[0]??null;
  panel.querySelector('h2').textContent=direction==='load'?'移到载具':'移到背包';
  body.innerHTML=`<div class="inventory-detail-icon">${inventoryIcon(item)}</div><h3>${escape(item.name)}</h3><p>可转移 ${count} ${item.category==='ammo'?'发备用弹药':'件'}</p>${item.category==='ammo'?'<p>已装填弹药随武器保留。</p>':''}${direction==='load'?`<label class="inventory-transfer-field">目标载具<select data-transfer-hull aria-label="目标载具">${vehicles.length?vehicles.map(i=>`<option value="${i}" ${i===hull?'selected':''}>${escape(vehicleModel(i).name)}</option>`).join(''):'<option value="">附近没有可装卸的载具</option>'}</select></label>`:`<p>来源：${escape(vehicleModel(hull).name)}的仓库</p>`}<label class="inventory-transfer-field">转移数量<input data-transfer-count aria-label="转移数量" inputmode="numeric" type="number" min="1" max="${count}" step="1" value="1"></label><div class="logistics-actions"><button class="ui-button" data-transfer-step="-1" aria-label="减少一件">−</button><button class="ui-button" data-transfer-step="1" aria-label="增加一件">＋</button><button class="ui-button" data-transfer-all>全部</button></div><p data-transfer-status role="status" aria-live="polite"></p>`;
  paintInventoryIcons(body,game.progress);preview();
 }
 dialogs.register(panel.id,{focusId:'inventory-transfer-close',onOpen:render});
 scope.on(panel,'input',event=>{if(event.target.matches('[data-transfer-count]'))preview();});
 scope.on(panel,'change',event=>{if(event.target.matches('[data-transfer-hull]')){hull=event.target.value===''?null:Number(event.target.value);preview();}});
 scope.on(panel,'click',event=>{
  const b=event.target.closest('button');if(!b||b.disabled)return;
  if(b.id==='inventory-transfer-close'||b.hasAttribute('data-transfer-cancel')){dialogs.close(panel.id);return;}
  const input=panel.querySelector('[data-transfer-count]');
  if(b.hasAttribute('data-transfer-all'))input.value=String(transferQuantity(game,id,direction==='load'?'bag':hull));
  if(b.hasAttribute('data-transfer-step'))input.value=String(Math.max(1,Math.min(Number(input.max),Number(input.value)+Number(b.dataset.transferStep))));
  if(b.hasAttribute('data-transfer-confirm')){
   const result=transferInventoryItem(game,id,hull,Number(input.value),direction);
   if(result.ok){dialogs.close(panel.id);onChange();onNotice?.(result.message);return;}
   panel.querySelector('[data-transfer-status]').textContent=result.message;return;
  }
  preview();
 });
 // 无正式物品身份的固定道具不会打开转移底板。
 function open(itemId,nextDirection='load',index=null){if(!transferItem(itemId))return;id=itemId;direction=nextDirection;hull=index;root.body.append(panel);dialogs.open(panel.id);}
 return {open,dispose(){scope.dispose();panel.remove();}};
}
