// 清理页复用手机底板，逐项选择数量并二次确认，不提供自动清空贵重物品。
import {createEventScope} from '../platform/events.js';
import {cleanupEntries,cleanupAvailable,discardLoad} from '../core/load-cleanup.js';
import {catLoad,vehicleLoad} from '../progression/load-weight.js';
import {vehicleModel} from '../config/vehicles.js';
// 所有目录文字转义后显示，物品身份只使用稳定ID。
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// 背包与各车货舱独立打开，共用确认、保存失败和重量反馈。
export function createLoadCleanup({game,root,dialogs,onChange}){
 const scope=createEventScope(),panel=root.createElement('dialog');panel.id='load-cleanup-dialog';panel.className='ui-panel ui-page';panel.style.overflowX='hidden';panel.setAttribute('aria-labelledby','load-cleanup-title');
 panel.innerHTML='<header class="ui-panel__header"><div><h2 id="load-cleanup-title">清理载荷</h2><p>按数量丢弃物品，确认后生效</p></div><button id="load-cleanup-close" class="ui-close" data-cleanup-close aria-label="关闭清理">×</button></header><div class="ui-panel__body" id="load-cleanup-content"></div><footer class="ui-panel__footer" style="display:block"><p id="load-cleanup-message" role="status"></p><button class="ui-button" data-cleanup-close>返回</button></footer>';root.body.append(panel);
 let hull=null,pending=null,message='';const get=id=>root.getElementById('load-cleanup-'+id);
 // 重新计算可清理数量和当前负重；装甲、发动机及主炮仍由工坊管理。
 function render(){
  const load=hull===null?catLoad(game):vehicleLoad(game,hull,{driver:true}),weight=load.weight??load.payload,entries=cleanupEntries(game,hull);
  get('title').textContent=hull===null?'清理背包':'清理货舱';get('message').textContent=message;
  const summary=`<section class="ui-inset"><b>${hull===null?'猫猫背包':escape(vehicleModel(hull).name)} ${weight.toFixed(2)} / ${load.capacity} kg</b><p>${load.overloaded?'载荷已满，无法移动，请清理物品。':'剩余载重 '+(load.capacity-weight).toFixed(2)+' kg'}</p></section>`;
  if(pending){get('content').innerHTML=summary+`<section class="ui-section"><h3>确认丢弃${escape(pending.name)} ×${pending.count}？</h3><p>丢弃后无法找回，不会兑换金币。</p>${pending.category==='weapon'?'<p>武器会失去所有权，弹匣内子弹退回背包。</p>':''}<p>物品重量 ${(pending.mass*pending.count).toFixed(2)} kg</p><button class="ui-button ui-button--primary" data-cleanup-confirm>确认丢弃</button> <button class="ui-button" data-cleanup-cancel>取消</button></section>`;return;}
  get('content').innerHTML=summary+'<p>当前装备、教学电锯、常备农具和重要物品不能丢弃。载具装甲与主炮请到工坊调整。</p>'+(entries.length?entries.map((r,i)=>`<section class="ui-section"><h3>${escape(r.name)}</h3><p>持有 ${r.count} · 共 ${r.weight.toFixed(2)} kg${r.note?' · '+escape(r.note):''}</p><label>丢弃数量 <input style="min-height:44px;width:88px" id="cleanup-count-${i}" type="number" min="1" max="${r.count}" step="1" value="1" inputmode="numeric" aria-label="${escape(r.name)}丢弃数量"></label> <button class="ui-button" data-cleanup-all="${i}" data-cleanup-id="${r.id}">全部</button> <button class="ui-button" data-cleanup-select="${i}" data-cleanup-id="${r.id}">丢弃</button></section>`).join(''):`<p>${cleanupAvailable(game,hull)?'没有可丢弃的物品。可使用道具、装卸货物，或在工坊调整装备。':'请靠近这辆载具后清理货舱。'}</p>`);
 }
 // 每次进入重新读取库存，旧确认不会跨车辆或跨页面沿用。
 function open(index=null){hull=index;pending=null;message='';if(!panel.open)root.body.append(panel);dialogs.open(panel.id);}
 dialogs.register(panel.id,{focusId:'load-cleanup-close',onOpen:render});
 scope.on(panel,'click',event=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-cleanup-close')){dialogs.close(panel.id);return;}
  if(b.hasAttribute('data-cleanup-cancel')){pending=null;render();return;}
  if(b.hasAttribute('data-cleanup-confirm')){const result=discardLoad(game,{hull,id:pending?.id,count:pending?.count});message=result.message;pending=null;render();if(result.ok)onChange();return;}
  const r=cleanupEntries(game,hull).find(r=>r.id===b.dataset.cleanupId);if(!r)return;
  if(b.dataset.cleanupAll!==undefined){root.getElementById('cleanup-count-'+b.dataset.cleanupAll).value=r.count;return;}
  if(b.dataset.cleanupSelect!==undefined){const count=Number(root.getElementById('cleanup-count-'+b.dataset.cleanupSelect).value);if(!Number.isSafeInteger(count)||count<1||count>r.count){message='请输入持有数量以内的正整数。';get('message').textContent=message;return;}pending={...r,count};message='';render();}
 });
 // 关闭实例释放节点与事件，不残留前一次确认。
 function dispose(){scope.dispose();panel.remove();}return {open,dispose};
}
