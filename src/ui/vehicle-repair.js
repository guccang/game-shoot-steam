// 手机与现场共用正式维修页，价格、权限和订单状态全部来自业务层。
import {createEventScope} from '../platform/events.js';
import {vehicleRepairQuote,vehicleService,requestVehicleRepair,collectRepairedVehicle,repairUnavailable} from '../core/vehicle-repair.js';
import {vehicleModel} from '../config/vehicles.js';
import {REPAIR_CENTER} from '../config/vehicle-repair.js';
import {requestWorldNavigation} from '../core/world-navigation.js';
// 统一底板保持标题与底部操作可见，车辆列表独立滚动。
export function createVehicleRepairPanel({game,root,dialogs,onChange,onNotice}){
 const scope=createEventScope(),panel=root.createElement('dialog');let remote=false,selection=null;
 panel.id='vehicle-repair-dialog';panel.className='ui-panel ui-page';panel.setAttribute('aria-labelledby','vehicle-repair-title');
 panel.innerHTML='<header class="ui-panel__header"><div><h2 id="vehicle-repair-title">载具维修中心</h2><p>让老伙计重新上路</p></div><button type="button" id="vehicle-repair-close" class="ui-close" aria-label="关闭维修中心">×</button></header><div class="ui-panel__body"><p class="ui-inset">维修费＝损失耐久比例×基础车价×修复系数0.5，金币向上取整。报废车辆损失比例为100%，费用含拖运与维修。无需木头。</p><p data-repair-balance></p><div data-repair-list></div><p data-repair-message role="status"></p></div><footer class="ui-panel__footer"><button type="button" class="ui-button" data-repair-nav>前往维修中心</button><button type="button" class="ui-button ui-button--primary" data-repair-confirm disabled>选择车辆</button></footer>';
 root.body.append(panel);
 // 页面打开时刷新一次；游戏暂停时不伪造进度或反复重建焦点。
 function render(){
  const reason=repairUnavailable(game,remote);panel.querySelector('[data-repair-message]').textContent=reason||'关闭页面后继续维修，修好自动停入北门停车场；可用手机定位。';
  panel.querySelector('[data-repair-balance]').textContent=`持有金币：${game.progress.coins}`;
  panel.querySelector('[data-repair-list]').innerHTML=game.vehicles.filter(v=>game.progress.vehicleHulls[v.index]).map(v=>{
   const r=vehicleService(game,v.index),phase=r?.phase,cost=vehicleRepairQuote(game,v.index),status=({wrecked:'已报废 · 需要救援',outbound:'拖车赶往现场',hooking:'正在挂钩',towing:'正在拖回中心',repairing:'维修中',ready:'已修好 · 等待停车场空位'})[phase]||(v.hp<=0?'已报废':v.hp<v.maxHp?'耐久损耗':'完好');
   const available=!reason&&(phase==='ready'?true:(!phase||phase==='wrecked')&&cost>0&&(!remote||v.hp<=0));
   return `<button type="button" class="ui-choice" style="width:100%;margin-bottom:8px;min-height:72px;display:block;text-align:left" data-repair-hull="${v.index}" aria-pressed="${selection===v.index}" ${available?'':'disabled'}><b>${vehicleModel(v.index).name}</b><br><span>${status} · 耐久 ${Math.ceil(v.hp)} / ${v.maxHp}</span><br><small>${phase==='ready'?'空出车位后自动交付':phase&&phase!=='wrecked'?'已付费，无需重复支付':cost?`费用 ${cost} 金币${game.progress.coins<cost?' · 金币不足':''}`:'无需维修'}</small></button>`;
  }).join('')||'<p>还没有自有载具。</p>';
  const confirm=panel.querySelector('[data-repair-confirm]'),r=vehicleService(game,selection),cost=vehicleRepairQuote(game,selection);
  const enabled=selection!==null&&!reason&&(r?.phase==='ready'?true:(!r?.phase||r.phase==='wrecked')&&cost>0&&game.progress.coins>=cost&&(!remote||game.vehicles[selection].hp<=0));
  confirm.disabled=!enabled;confirm.textContent=selection===null?'选择车辆':r?.phase==='ready'?'重新安排车位':`确认支付 ${cost} 金币`;
 }
 // 确认时再次从业务层报价与校验，不使用页面缓存扣费。
 scope.on(panel,'click',event=>{
  const row=event.target.closest('[data-repair-hull]');if(row&&!row.disabled){selection=Number(row.dataset.repairHull);render();return;}
  if(event.target.closest('#vehicle-repair-close')){dialogs.close(panel.id);return;}
  if(event.target.closest('[data-repair-nav]')){requestWorldNavigation(game,{...REPAIR_CENTER,y:REPAIR_CENTER.y+55},'前往载具维修中心',{direct:true});dialogs.close(panel.id);if(root.getElementById('phone-dialog')?.open)dialogs.close('phone-dialog');onNotice('已标出维修中心位置；湖谷请先乘车返回森林。');return;}
  if(event.target.closest('[data-repair-confirm]')&&!panel.querySelector('[data-repair-confirm]').disabled){const result=vehicleService(game,selection)?.phase==='ready'?collectRepairedVehicle(game,selection):requestVehicleRepair(game,selection,remote);selection=null;render();panel.querySelector('[data-repair-message]').textContent=result.message;onChange();}
 });
 dialogs.register(panel.id,{focusId:'vehicle-repair-close',onOpen:render});
 // 现场入口与手机入口仅改变服务方式，不改变人物位置。
 function open(fromPhone=false){remote=fromPhone;selection=null;dialogs.open(panel.id);}
 // 退出应用释放节点与监听，重新装配不会出现重复窗口。
 function dispose(){scope.dispose();panel.remove();}
 return {open,dispose};
}
