import {inspectLogisticsLesson} from '../progression/story/mainline-logistics.js';
import {supplyVehicleNearby} from '../core/vehicles/supplies.js';
import {vehicleFaults} from '../config/supplies.js';
// 手机与现场共用正式维修页，价格、权限和订单状态全部来自业务层。
import {hookTow,unhookTow,towReason,selfTowRepairQuote,deliverTowedVehicle} from '../core/vehicles/player-towing.js';
import {vehicleLoad,catLoad,footTowCapacity} from '../progression/inventory/load-weight.js';
import {createEventScope} from '../platform/events.js';
import {vehicleRepairQuote,vehicleService,requestVehicleRepair,collectRepairedVehicle,repairUnavailable} from '../core/vehicles/vehicle-repair.js';
import {drawVehicleIcon} from '../rendering/vehicle.js';
import {vehicleModel} from '../config/vehicles.js';
import {REPAIR_CENTER,VEHICLE_REPAIR,vehicleRepairRate} from '../config/vehicle-repair.js';
import {requestWorldNavigation} from '../core/navigation/world-navigation.js';
// 维修和牵引名单共用正面车型图标，读屏名称由相邻车型文字提供。
function repairVehicleIcon(hull){
 return `<canvas class="repair-vehicle-icon" data-repair-icon="${hull}" width="112" height="112" aria-hidden="true"></canvas>`;
}
// 统一底板保持标题与底部操作可见，车辆列表独立滚动。
export function createVehicleRepairPanel({game,root,dialogs,onChange,onNotice}){
 const scope=createEventScope(),panel=root.createElement('dialog');let remote=false,selection=null,wreck=null;
 panel.id='vehicle-repair-dialog';panel.className='ui-panel ui-page';panel.setAttribute('aria-labelledby','vehicle-repair-title');
 panel.innerHTML='<header class="ui-panel__header"><div><h2 id="vehicle-repair-title">载具维修中心</h2><p>让老伙计重新上路</p></div><button type="button" id="vehicle-repair-close" class="ui-close" aria-label="关闭维修中心">×</button></header><div class="ui-panel__body"><p class="ui-inset"></p><p data-repair-balance></p><div data-repair-list></div><section class="ui-section" data-player-tow></section><p data-repair-message role="status"></p></div><footer class="ui-panel__footer"><button type="button" class="ui-button" data-repair-nav>前往维修中心</button><button type="button" class="ui-button ui-button--primary" data-repair-confirm disabled>选择车辆</button></footer>';
 root.body.append(panel);
 // 说明与正式车型费率同步，故障追加比例同样受该车型维修上限约束。
 panel.querySelector('.ui-inset').textContent=`按损失耐久比例计费；部件故障按最高损坏比例的20%追加。红狼满损维修上限为基础车价的${vehicleRepairRate('red-wolf')*100}%，其他车型为${VEHICLE_REPAIR.repairRate*100}%。费用向上取整，含报废拖运与维修，无需木头。`;
 // 页面打开时刷新一次；游戏暂停时不伪造进度或反复重建焦点。
 function render(){
  // 现场只显示所点残骸的操作。
  for(const selector of ['.ui-panel__body > .ui-inset','[data-repair-list]','[data-repair-balance]','[data-repair-confirm]'])panel.querySelector(selector).hidden=wreck!==null;
  panel.querySelector('#vehicle-repair-title').textContent=wreck===null?'载具维修中心':vehicleModel(wreck).name+' · 牵引';
  const reason=repairUnavailable(game,remote);panel.querySelector('[data-repair-message]').textContent=wreck!==null?'':reason||'关闭页面后继续维修，修好留在维修工坊原车位；可用手机定位。';
  panel.querySelector('[data-repair-balance]').textContent=`持有金币：${game.progress.coins}`;
  panel.querySelector('[data-repair-list]').innerHTML=game.vehicles.filter(v=>game.progress.vehicleHulls[v.index]).map(v=>{
   const r=vehicleService(game,v.index),phase=r?.phase,cost=vehicleRepairQuote(game,v.index),status=({wrecked:'已报废 · 需要救援',outbound:'拖车赶往现场',hooking:'正在挂钩',towing:'正在拖回中心',repairing:r?.repairSpot?'车位维修中':'等待维修车位',ready:'已修好 · 等待停车场空位'})[phase]||(v.hp<=0?'已报废':vehicleFaults(game.progress,v.index).engine>=100?'发动机停驶':cost?'需要维修':'完好');
   const available=!reason&&(phase==='ready'?true:(!phase||phase==='wrecked')&&cost>0&&(!remote||v.hp<=0||vehicleFaults(game.progress,v.index).engine>=100));
   return `<button type="button" class="ui-choice" data-repair-hull="${v.index}" aria-pressed="${selection===v.index}" ${available?'':'disabled'}>${repairVehicleIcon(v.index)}<span class="repair-vehicle-info"><b>${vehicleModel(v.index).name}</b><span>${status} · 耐久 ${Math.ceil(v.hp)} / ${v.maxHp} · 主炮损坏 ${vehicleFaults(game.progress,v.index).gun}% / 发动机损坏 ${vehicleFaults(game.progress,v.index).engine}%</span><small>${phase==='ready'?'空出车位后自动交付':phase&&phase!=='wrecked'?'已付费，无需重复支付':cost?`费用 ${cost} 金币${game.progress.coins<cost?' · 金币不足':''}`:'无需维修'}</small></span></button>`;
  }).join('')||'<p>还没有自有载具。</p>';
  const tow=game.progress.logistics?.tow;
  panel.querySelector('[data-player-tow]').innerHTML='<h3>自行牵引 · 到厂维修费4折</h3><p>自行拖到维修中心，按普通救援维修报价的40%收费。车辆载荷越高，剩余牵引能力越低。</p>'+(tow&&(wreck===null||tow.target===wreck)?`<p class="repair-tow-heading">${repairVehicleIcon(tow.target)}<b>正在牵引 ${vehicleModel(tow.target).name} · 优惠维修 ${selfTowRepairQuote(game)} 金币</b></p><div class="logistics-actions"><button class="ui-button" data-tow-action="release">解除牵引</button><button class="ui-button" data-tow-action="deliver">到厂交车维修</button></div>`:`<p>${game.vehicle.active?'当前剩余牵引能力 '+Math.floor(vehicleLoad(game).towCapacity)+' kg':'猫猫徒步牵引余量 '+Math.floor(footTowCapacity(catLoad(game)))+' kg'}</p>`+game.vehicles.filter(v=>(wreck===null||v.index===wreck)&&game.progress.vehicleHulls[v.index]&&vehicleService(game,v.index)?.phase==='wrecked').map(v=>{const why=towReason(game,v.index);return `<div class="ui-inset"><div class="repair-tow-heading">${repairVehicleIcon(v.index)}<b>${vehicleModel(v.index).name} · ${Math.ceil(vehicleLoad(game,v.index,{driver:false}).mass)} kg</b></div><p>${why||'可以挂接'}</p><button class="ui-button" data-tow-target="${v.index}" ${why?'disabled':''}>挂接牵引绳</button></div>`;}).join(''));
  for(const icon of panel.querySelectorAll('[data-repair-icon]')){
   drawVehicleIcon(icon.getContext('2d'),Number(icon.dataset.repairIcon));
  }
  const confirm=panel.querySelector('[data-repair-confirm]'),r=vehicleService(game,selection),cost=vehicleRepairQuote(game,selection);
  const enabled=selection!==null&&!reason&&(r?.phase==='ready'?true:(!r?.phase||r.phase==='wrecked')&&cost>0&&game.progress.coins>=cost&&(!remote||game.vehicles[selection].hp<=0||vehicleFaults(game.progress,selection).engine>=100));
  confirm.disabled=!enabled;confirm.textContent=selection===null?'选择车辆':r?.phase==='ready'?'重新安排车位':`确认支付 ${cost} 金币`;
 }
 // 确认时再次从业务层报价与校验，不使用页面缓存扣费。
 scope.on(panel,'click',event=>{
  const towButton=event.target.closest('[data-tow-target],[data-tow-action]');
  if(towButton&&!towButton.disabled){const result=towButton.dataset.towTarget!==undefined?hookTow(game,Number(towButton.dataset.towTarget)):towButton.dataset.towAction==='release'?unhookTow(game):deliverTowedVehicle(game);render();panel.querySelector('[data-repair-message]').textContent=result.message;onChange();return;}
  const row=event.target.closest('[data-repair-hull]');if(row&&!row.disabled){selection=Number(row.dataset.repairHull);render();return;}
  if(event.target.closest('#vehicle-repair-close')){dialogs.close(panel.id);return;}
  if(event.target.closest('[data-repair-nav]')){requestWorldNavigation(game,{...REPAIR_CENTER,y:REPAIR_CENTER.y+55},'前往载具维修中心',{direct:true});dialogs.close(panel.id);if(root.getElementById('phone-dialog')?.open)dialogs.close('phone-dialog');onNotice('已标出维修中心位置；湖谷请先乘车返回森林。');return;}
  if(event.target.closest('[data-repair-confirm]')&&!panel.querySelector('[data-repair-confirm]').disabled){const result=vehicleService(game,selection)?.phase==='ready'?collectRepairedVehicle(game,selection):requestVehicleRepair(game,selection,remote);selection=null;render();panel.querySelector('[data-repair-message]').textContent=result.message;onChange();}
 });
 dialogs.register(panel.id,{focusId:'vehicle-repair-close',onOpen:render});
 // 现场入口与手机入口仅改变服务方式，不改变人物位置。
 function open(fromPhone=false,target=null){wreck=target;remote=fromPhone;selection=null;if(!panel.open)root.body.append(panel);dialogs.open(panel.id);
  // 现场看过报价才算到访；完好且确实停在店旁的当前车辆可直接通过检查。
  if(wreck===null&&!remote&&!repairUnavailable(game)){inspectLogisticsLesson(game,'repairVisited');const i=game.vehicle.index;if(game.progress.vehicleHulls[i]&&!vehicleService(game,i)?.phase&&supplyVehicleNearby(game,i)&&vehicleRepairQuote(game,i)===0)inspectLogisticsLesson(game,'repairChecked');onChange();}
 }
 // 退出应用释放节点与监听，重新装配不会出现重复窗口。
 function dispose(){scope.dispose();panel.remove();}
 return {open,dispose};
}
