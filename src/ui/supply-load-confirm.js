// 补给达到负重上限时交给玩家决定；复用原生模态、交易事务和中文手机底板。
import {createEventScope} from '../platform/events.js';
import {tradeSupply} from '../core/supplies.js';
import {vehicleModel} from '../config/vehicles.js';
// 统一保留足够小数，避免临界负重四舍五入后看不出变化。
const kg=value=>Number(value).toFixed(3).replace(/0$/,'');
// 只保留当前待确认交易，关闭、取消或成功后不能重复扣费。
export function createSupplyLoadConfirm({game,root,dialogs,onResult}){
 const scope=createEventScope(),panel=root.createElement('dialog');let pending=null;
 panel.id='supply-load-confirm';panel.className='ui-panel ui-panel--compact';panel.setAttribute('aria-labelledby','supply-load-title');panel.setAttribute('aria-describedby','supply-load-effect');
 panel.innerHTML='<header class="ui-panel__header"><h2 id="supply-load-title">购买后载荷将满</h2><button class="ui-close" data-load-cancel aria-label="取消购买">×</button></header><div class="ui-panel__body"><p data-load-product></p><p data-load-destination></p><p class="ui-inset" data-load-weight></p><p id="supply-load-effect"></p></div><footer class="ui-panel__footer"><button id="supply-load-cancel" class="ui-button" data-load-cancel>取消</button><button class="ui-button ui-button--primary" data-load-continue>仍然购买</button></footer>';root.body.append(panel);
 dialogs.register(panel.id,{focusId:'supply-load-cancel'});
 // 首次调用只尝试正常交易，需要确认时保留原请求及当前车型。
 function submit(request){
  const result=tradeSupply(game,request);
  if(!result.needsLoadConfirmation){onResult(result);return;}
  const {load}=result;pending={request:{...request},confirmation:result.confirmation,hull:load.hull};
  panel.querySelector('#supply-load-title').textContent=(request.craft?'制作':'购买')+'后载荷将满';
  panel.querySelector('[data-load-product]').textContent=result.name+' ×'+result.amount+' '+result.unit;
  panel.querySelector('[data-load-destination]').textContent='放入：'+(result.storage?.vehicle>0?`猫猫背包 ${result.storage.hand} 发、${vehicleModel(load.hull).name}货舱 ${result.storage.vehicle} 发（载荷含驾驶员及背包）`:load.target==='vehicle'?vehicleModel(load.hull).name+'货舱（含驾驶员及背包）':'猫猫背包');
  panel.querySelector('[data-load-weight]').textContent=`${kg(load.before)} → ${kg(load.after)} / ${kg(load.capacity)} kg`;
  panel.querySelector('#supply-load-effect').textContent=(load.target==='vehicle'?'载具将无法行驶':'猫猫将无法移动')+'，需要整理载荷。是否仍然'+(request.craft?'制作':'购买')+'？';
  panel.querySelector('[data-load-continue]').textContent=request.craft?'仍然制作':'仍然购买';
  panel.querySelector('[data-load-cancel]').setAttribute('aria-label',request.craft?'取消制作':'取消购买');
  dialogs.open(panel.id);
 }
 // 关闭不会提交；确认后事务再次校验位置、余额和库存，变化时重新提示。
 function cancel(){pending=null;if(panel.open)dialogs.close(panel.id);}
 scope.on(panel,'click',e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-load-cancel')){cancel();return;}if(!b.hasAttribute('data-load-continue')||!pending)return;const saved=pending;cancel();if(saved.hull!==null&&saved.hull!==game.vehicle.index){onResult({ok:false,message:'当前载具已变化，请重新选择补给。'});return;}submit({...saved.request,loadConfirmation:saved.confirmation});});
 scope.on(panel,'cancel',()=>{pending=null;});scope.on(panel,'close',()=>{if(!panel.open)pending=null;});
 // 页面销毁释放自身节点和监听，待确认操作不跨页面保留。
 function dispose(){pending=null;scope.dispose();panel.remove();}
 return {submit,cancel,dispose};
}
