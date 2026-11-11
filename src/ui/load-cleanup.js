import {escapeHtml as escape} from './shared/html.js';
// 清理页用实物拖出、滑条选量与原子减重方案，复用手机底板和正式物品目录。
import {createEventScope} from '../platform/events.js';
import {cleanupEntries,cleanupAvailable,cleanupLoad,cleanupUnitMass,discardLoad,planLoadCleanup,discardForMobility} from '../core/inventory/load-cleanup.js';
import {vehicleModel} from '../config/vehicles.js';
import {inventoryIcon,paintInventoryIcons} from './inventory-icons.js';
import {createCleanupDrag} from './load-cleanup-drag.js';
// 目录与动态文字先转义，身份保持稳定ID。

// 重量统一显示两位，限重临界处保留三位避免视觉上仍像满载。
const kg=value=>Number(value).toFixed(3).replace(/0$/,'');
// 从角色或载具入口确定整理来源，拖拽或点选只打开数量面板，确认才丢弃。
export function createLoadCleanup({game,root,dialogs,onChange}){
 const scope=createEventScope(),panel=root.createElement('dialog'),quantity=root.createElement('dialog');
 panel.id='load-cleanup-dialog';panel.className='ui-panel ui-page';panel.setAttribute('aria-labelledby','load-cleanup-title');
 panel.innerHTML='<header class="ui-panel__header"><div><h2 id="load-cleanup-title">整理载荷</h2><p>拖出图标清理，也可点选物品</p></div><button id="load-cleanup-close" class="ui-close" data-cleanup-close aria-label="关闭清理">×</button></header><div id="load-cleanup-meter" data-cleanup-slot="meter" class="cleanup-meter"></div><div class="ui-panel__body" id="load-cleanup-content" data-cleanup-slot="content"></div><footer class="ui-panel__footer cleanup-footer"><div data-cleanup-drop class="cleanup-drop" aria-label="拖到这里清理"><span aria-hidden="true">↓</span><b>拖到这里清理</b><small>松手后选择数量</small></div><button class="ui-button ui-button--primary" data-cleanup-auto>一键清理至限重内</button><p id="load-cleanup-message" data-cleanup-slot="message" role="status"></p></footer>';
 quantity.id='load-cleanup-quantity';quantity.className='ui-panel ui-panel--compact';quantity.setAttribute('aria-labelledby','cleanup-quantity-title');
 quantity.innerHTML='<header class="ui-panel__header"><h2 id="cleanup-quantity-title">选择丢弃数量</h2><button id="cleanup-quantity-close" class="ui-close" data-quantity-cancel aria-label="取消清理">×</button></header><div class="ui-panel__body" id="cleanup-quantity-content"></div><footer class="ui-panel__footer"><button class="ui-button" data-quantity-cancel>取消</button><button class="ui-button ui-button--primary" data-quantity-confirm>确认丢弃</button></footer>';
 root.body.append(panel,quantity);let hull=null,pending=null,message='';const get=id=>root.getElementById(id);
 // 一键清理在驾驶时以整车载荷为目标，包括猫猫的随身背包。
 function target(){return hull??(game.vehicle.active?game.vehicle.index:null);}
 // 选择物品时只建议刚好低于限重的数量，库存不足时最多选择持有量。
 function suggested(item){const load=cleanupLoad(game,target());return Math.min(item.count,Math.max(1,Math.ceil((load.weight-load.capacity+.01-1e-9)/cleanupUnitMass(item))));}
 // 列表与重量从实时库存生成；切换货舱不沿用旧的物品选择。
 function render(view=panel){
  const slot=name=>view.querySelector("[data-cleanup-slot="+name+"]");
  const load=cleanupLoad(game,hull),entries=cleanupEntries(game,hull),available=cleanupAvailable(game,hull),plan=planLoadCleanup(game,hull);
  if(view===panel){panel.dataset.source=hull===null?'bag':'vehicle';get('load-cleanup-title').textContent=hull===null?'整理背包':'整理载具仓库';}
  slot('meter').innerHTML=`<div><b>${hull===null?'猫猫背包':escape(vehicleModel(hull).name)}</b><span>${kg(load.weight)} / ${kg(load.capacity)} kg</span></div><progress aria-label="当前载荷" max="${load.capacity}" value="${Math.min(load.weight,load.capacity)}"></progress><small>${load.weight>=load.capacity?'载荷已满，清理后解除负重限制': '剩余载重 '+kg(load.capacity-load.weight)+' kg'}</small>`;
  slot('content').innerHTML=entries.length?'<div class="cleanup-grid" aria-label="可清理物品">'+entries.map(r=>`<button type="button" class="cleanup-item" data-cleanup-item="${r.id}" aria-label="${escape(r.name)}，${r.count}份，${kg(r.weight)}千克，选择丢弃数量"><span class="cleanup-grip" data-cleanup-grip aria-hidden="true">${inventoryIcon(r)}</span><b>${escape(r.name)}</b><small>×${r.count} · ${kg(r.weight)} kg</small></button>`).join('')+'</div><p class="cleanup-protection">当前装备、农具和重要物品受保护。拖动图标清理，滑动文字浏览。</p>':`<div class="cleanup-grid cleanup-empty">${available?'这里没有可清理的物品。':'请靠近这辆载具后整理货舱。'}</div>`;
  const auto=view.querySelector('[data-cleanup-auto]');auto.disabled=!plan.ok;auto.title=plan.message;slot('message').textContent=message||(!plan.ok&&plan.weight>=plan.capacity?plan.message:'');paintInventoryIcons(view,game.progress);
 }
 // 滑动时只更新数值和减重预览，不重建滑条以免手势中断。
 function preview(){if(!pending?.item)return;const item=pending.item,count=Number(get('cleanup-quantity-range').value),load=cleanupLoad(game,target()),after=load.weight-cleanupUnitMass(item)*count;pending.count=count;get('cleanup-quantity-count').textContent=count;get('cleanup-quantity-preview').textContent=`减轻 ${kg(cleanupUnitMass(item)*count)} kg · ${target()===null?'背包':'整车'}剩余 ${kg(after)} / ${kg(load.capacity)} kg · ${after<load.capacity?'载荷低于上限':'仍需继续清理'}`;}
 // 刚拖出时读取最新库存，默认建议恢复正常负重所需数量，仍由玩家确认。
 function choose(id){const item=cleanupEntries(game,hull).find(r=>r.id===id);if(!item)return;pending={item,hull,count:suggested(item)};get('cleanup-quantity-title').textContent='丢弃'+item.name;
  get('cleanup-quantity-content').innerHTML=`<div class="cleanup-selected">${inventoryIcon(item)}<div><b>${escape(item.name)}</b><p>持有 ${item.count} · 每份 ${kg(item.mass)} kg</p></div></div><label class="cleanup-range-label" for="cleanup-quantity-range">丢弃数量 <output id="cleanup-quantity-count">${pending.count}</output></label><input id="cleanup-quantity-range" type="range" min="1" max="${item.count}" step="1" value="${pending.count}" aria-label="丢弃数量"><div class="cleanup-steps"><button class="ui-button" data-quantity-step="-1" aria-label="减少一个">−</button><button class="ui-button" data-quantity-preset="needed">刚好减负</button><button class="ui-button" data-quantity-preset="all">全部</button><button class="ui-button" data-quantity-step="1" aria-label="增加一个">＋</button></div><p id="cleanup-quantity-preview" class="ui-inset" aria-live="polite"></p><p>确认丢弃后无法找回，不兑换金币。${item.category==='weapon'?'弹匣中的子弹退回背包。':''}</p>`;paintInventoryIcons(quantity,game.progress);preview();root.body.append(quantity);dialogs.open(quantity.id);get('cleanup-quantity-range').focus({preventScroll:true});
 }
 // 仓库内复用拖拽、数量确认与一键减负操作。
 const inline=root.createElement('section');
 inline.innerHTML='<h3>整理载具仓库</h3><div data-cleanup-slot="meter" hidden></div><div data-cleanup-slot="content"></div><div data-cleanup-drop class="cleanup-drop">拖到这里清理</div><button class="ui-button" data-cleanup-auto>一键清理至限重内</button><p data-cleanup-slot="message" role="status"></p>';
 let inlineHull=null;
 // 操作前绑定当前货舱，避免背包整理入口改变物品来源。
 function selectInline(id){hull=inlineHull;choose(id);}
 const inlineDrag=createCleanupDrag({panel:inline,root,game,onDrop:selectInline});
 scope.on(inline,'click',e=>{const button=e.target.closest('button');if(!button)return;hull=inlineHull;if(button.hasAttribute('data-cleanup-auto'))automatic();else if(button.dataset.cleanupItem)selectInline(button.dataset.cleanupItem);});
 // 在货舱页面直接展示可清理物品。
 function mount(host,index){inlineDrag.cancel();if(inlineHull!==index)message='';inlineHull=index;hull=index;host.append(inline);render(inline);}
 const drag=createCleanupDrag({panel,root,game,onDrop:choose});
 // 快捷方案按来源列明物品，不隐藏可能涉及的背包物品。
 function automatic(){const plan=planLoadCleanup(game,hull);if(!plan.ok){message=plan.message;render();return;}pending={plan};get('cleanup-quantity-title').textContent='清理至限重内';get('cleanup-quantity-content').innerHTML=`<p>${escape(plan.message)}</p><ul class="cleanup-plan">${plan.changes.map(r=>`<li><span>${r.hull===null?'背包':'货舱'} · ${escape(r.name)}</span><b>×${r.count}</b></li>`).join('')}</ul><p class="ui-inset">${kg(plan.weight)} → <strong>${kg(plan.after)}</strong> / ${kg(plan.capacity)} kg</p><p>确认后一次性丢弃上述物品，无法找回。</p>`;root.body.append(quantity);dialogs.open(quantity.id);}
 // 重开、切换来源及关闭均丢弃旧选择，避免将手势用于下一辆车。
 function open(index=null){hull=index;pending=null;message='';drag.cancel();if(!panel.open)root.body.append(panel);dialogs.open(panel.id);render();}
 dialogs.register(panel.id,{focusId:'load-cleanup-close',onOpen:()=>render()});dialogs.register(quantity.id,{focusId:'cleanup-quantity-close'});
 scope.on(panel,'click',e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-cleanup-close')){dialogs.close(panel.id);return;}if(b.hasAttribute('data-cleanup-auto')){automatic();return;}if(b.dataset.cleanupItem)choose(b.dataset.cleanupItem);});
 scope.on(quantity,'input',e=>{if(e.target.id==='cleanup-quantity-range')preview();});
 scope.on(quantity,'click',e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-quantity-cancel')){dialogs.close(quantity.id);return;}if(b.hasAttribute('data-quantity-confirm')){const r=pending?.plan?discardForMobility(game,pending.plan):discardLoad(game,{hull:pending?.hull,id:pending?.item?.id,count:pending?.count});message=r.message;pending=null;dialogs.close(quantity.id);if(panel.open)render();if(r.ok)onChange();return;}if(pending?.item){const slider=get('cleanup-quantity-range');if(b.dataset.quantityStep)slider.value=Math.min(pending.item.count,Math.max(1,Number(slider.value)+Number(b.dataset.quantityStep)));if(b.dataset.quantityPreset)slider.value=b.dataset.quantityPreset==='all'?pending.item.count:suggested(pending.item);preview();}});
 scope.on(quantity,'close',()=>{pending=null;if(panel.open)render();});scope.on(panel,'close',()=>{drag.cancel();if(quantity.open)dialogs.close(quantity.id);});
 // 关闭实例释放手势及两个底板，不留下悬浮物品或事件。
 function dispose(){inlineDrag.dispose();inline.remove();drag.dispose();scope.dispose();quantity.remove();panel.remove();}return {open,mount,dispose};
}
