// 小屋仓库手机页面：先选物品，再用滑条选择数量，所有变更交给仓库事务。
import {canUseWarehouse,warehouseVehicles,warehouseRows,warehouseTransferPreview,transferWarehouse} from '../core/warehouse.js';
import {catLoad,vehicleLoad} from '../progression/load-weight.js';
import {COLLECTED_VEHICLES} from '../config/vehicles.js';
import {inventoryIcon} from './inventory-icons.js';
import {createEventScope} from '../platform/events.js';
// 创建统一底板与数量面板，关闭页面不离开仓库。
export function createWarehouse({game,root,dialogs,onChange}){
 const scope=createEventScope(),panel=root.createElement('dialog');let source='bag',category='material',selection=null,message='';
 panel.id='warehouse-dialog';panel.className='ui-panel ui-page';panel.setAttribute('aria-labelledby','warehouse-title');
 panel.innerHTML='<header class="ui-panel__header"><h2 id="warehouse-title">小屋仓库</h2><button class="ui-close" data-close aria-label="关闭仓库">×</button></header><div class="ui-panel__body"><label for="warehouse-source">存取位置</label><select id="warehouse-source"></select><p id="warehouse-load"></p><p>入库物品不占负重。木材可用于建设和制作；只存取备用弹药，已装填弹匣保留。种子存取使用猫猫背包。</p><nav class="warehouse-tabs" aria-label="物品分类"></nav><p id="warehouse-message" role="status"></p><section id="warehouse-quantity" class="ui-section" hidden></section><div id="warehouse-list"></div></div>';
 root.body.append(panel);dialogs.register(panel.id,{focusId:'warehouse-source'});
 const get=id=>root.getElementById('warehouse-'+id);
 // 每次打开与事务后重新核验附近车队，不远程展示可操作车辆。
 function render(){
  const cars=warehouseVehicles(game);if(source!=='bag'&&!cars.includes(source))source='bag';
  get('source').innerHTML='<option value="bag">猫猫背包</option>'+cars.map(i=>`<option value="${i}">${COLLECTED_VEHICLES[i].name}货舱</option>`).join('');get('source').value=String(source);
  const load=source==='bag'?catLoad(game):vehicleLoad(game,source,{driver:true});get('load').textContent=`${source==='bag'?'背包负重':'载具负重（含驾驶员）'} ${(load.weight??load.payload).toFixed(2)} / ${load.capacity.toFixed(2)} 千克`;
  panel.querySelector('nav').innerHTML=[['material','木材'],['ammo','弹药'],['seed','种子']].map(([key,name])=>`<button class="ui-button" data-category="${key}" aria-pressed="${category===key}">${name}</button>`).join('');
  get('message').textContent=message;const rows=warehouseRows(game,source).filter(r=>r.category===category&&(r.category!=='seed'||r.carried||r.stored));
  get('list').innerHTML=rows.map(r=>`<article class="ui-section warehouse-row"><span class="warehouse-row__icon">${inventoryIcon(r)}</span><div><h3>${r.name}</h3><p>随行 ${r.carried} · 仓库 ${r.stored}</p><p>每份 ${r.mass} 千克</p></div><div class="warehouse-row__actions"><button class="ui-button" data-item="${r.id}" data-direction="deposit" ${r.carried?'':'disabled'}>存入</button><button class="ui-button" data-item="${r.id}" data-direction="withdraw" ${r.stored?'':'disabled'}>取出</button></div></article>`).join('')||`<p>${category==='seed'&&source!=='bag'?'请切换到猫猫背包存取种子。':'背包和仓库中还没有这类物品。'}</p>`;
  renderQuantity();
 }
 // 数量面板只含滑条和快捷数量，不使用文本输入；负重预览跟随滑条更新。
 function renderQuantity(){
  const box=get('quantity');box.hidden=!selection;if(!selection){box.innerHTML='';return;}
  const r=warehouseRows(game,source).find(r=>r.id===selection.id),max=selection.direction==='deposit'?r.carried:r.stored;selection.count=Math.min(selection.count,max);
  box.innerHTML=`<h3>${selection.direction==='deposit'?'存入':'取出'}${r.name}</h3><label for="warehouse-range">数量 <output id="warehouse-count">${selection.count}</output> / ${max}</label><input id="warehouse-range" type="range" min="1" max="${max}" value="${selection.count}" step="1"><div class="warehouse-tabs"><button class="ui-button" data-amount="1">1 份</button><button class="ui-button" data-amount="${max}">全部</button></div><p id="warehouse-preview"></p><div class="warehouse-row__actions"><button class="ui-button" data-confirm>确认${selection.direction==='deposit'?'存入':'取出'}</button><button class="ui-button" data-cancel>取消</button></div>`;preview();
 }
 // 满载风险写在确认按钮旁，用户改变数量后重新计算。
 function preview(){const p=warehouseTransferPreview(game,source,selection.id,selection.count,selection.direction);get('count').textContent=selection.count;get('preview').textContent=p.ok?`操作后负重 ${p.weight.toFixed(2)} / ${p.capacity.toFixed(2)} 千克。${p.needsConfirmation?'载荷已满，将无法移动；确认即继续取出。':''}`:p.message;panel.querySelector('[data-confirm]').disabled=!p.ok;}
 scope.on(get('source'),'change',()=>{source=get('source').value==='bag'?'bag':Number(get('source').value);selection=null;message='';render();});
 scope.on(panel,'input',e=>{if(e.target.id==='warehouse-range'){selection.count=Number(e.target.value);preview();}});
 scope.on(panel,'click',e=>{
  const b=e.target.closest('button');if(!b||b.disabled)return;
  if(b.hasAttribute('data-close'))return dialogs.close(panel.id);
  if(b.dataset.category){category=b.dataset.category;selection=null;render();}
  else if(b.dataset.item){selection={id:b.dataset.item,direction:b.dataset.direction,count:1};renderQuantity();get('quantity').scrollIntoView({block:'nearest'});}
  else if(b.dataset.amount){selection.count=Number(b.dataset.amount);renderQuantity();}
  else if(b.hasAttribute('data-cancel')){selection=null;renderQuantity();}
  else if(b.hasAttribute('data-confirm')&&selection){const r=transferWarehouse(game,source,selection.id,selection.count,selection.direction,true);message=r.message;selection=null;render();onChange();}
 });
 // 仅室内管理员打开，超载时仍可点击柜台卸货。
 function open(){if(!canUseWarehouse(game))return false;source='bag';selection=null;message='';dialogs.open(panel.id);render();return true;}
 // 释放全部 DOM 和事件，重复启动不叠加操作。
 function dispose(){scope.dispose();panel.remove();}
 return {open,render,dispose};
}
