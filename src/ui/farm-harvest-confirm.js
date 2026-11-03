// 收获超载沿用统一手机确认底板；取消保留田里的作物，确认仅授权当前这一份。
import {createEventScope} from '../platform/events.js';
import {resolveHarvestLoad} from '../core/farm.js';
import {FARM_CROPS} from '../config/farm.js';

// 持有当前农活引用，防止旧弹窗确认到换图、换工具后的另一份收获。
export function createFarmHarvestConfirm({game,root,dialogs,onChange,onNotice}){
 const scope=createEventScope(),panel=root.createElement('dialog');let pending=null,accepted=false;
 panel.id='farm-harvest-confirm';panel.className='ui-panel ui-panel--compact';panel.setAttribute('aria-labelledby','farm-harvest-load-title');
 panel.innerHTML='<header class="ui-panel__header"><h2 id="farm-harvest-load-title">收获后载荷将满</h2><button class="ui-close" data-harvest-cancel aria-label="取消收获">×</button></header><div class="ui-panel__body"><p data-harvest-product></p><p data-harvest-destination></p><p class="ui-inset" data-harvest-weight></p><p data-harvest-effect></p></div><footer class="ui-panel__footer"><button class="ui-button" id="farm-harvest-cancel" data-harvest-cancel>暂不收获</button><button class="ui-button ui-button--primary" data-harvest-continue>仍然收获这份</button></footer>';
 root.body.append(panel);dialogs.register(panel.id,{focusId:'farm-harvest-cancel'});
 // 动作命中前暂停队列，只在正式世界可交互且没有其他弹窗时展示。
 function render(){
  const job=game.farmWork?.job,request=job?.loadRequest;if(panel.open||pending||!request||game.state!=='playing'||game.farmWork.autoCombat||root.querySelector('dialog[open]'))return;
  pending=job;accepted=false;const l=request.load;
  panel.querySelector('[data-harvest-product]').textContent=FARM_CROPS[request.crop].name+' ×1';
  panel.querySelector('[data-harvest-destination]').textContent='存放到：'+l.name+(l.hull===null?'':'（载荷含驾驶员及背包）');
  panel.querySelector('[data-harvest-weight]').textContent=`${l.before.toFixed(3)} → ${l.after.toFixed(3)} / ${l.capacity.toFixed(3)} 千克`;
  panel.querySelector('[data-harvest-effect]').textContent=(l.hull===null?'背包达到上限后猫猫只能缓慢行走。':'载具达到载荷上限后无法行驶。')+'可先整理或到小屋仓库结算。是否仍然收获这一份？暂不收获会停止后续队列，田里的作物保留。';
  dialogs.open(panel.id);
 }
 scope.on(panel,'click',e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-harvest-cancel'))dialogs.close(panel.id);else if(b.hasAttribute('data-harvest-continue')){accepted=true;dialogs.close(panel.id);}});
 // 等弹窗统一恢复游戏后授权，下一次命中再次核验距离、目标、田块与真实负重。
 scope.on(panel,'close',()=>{if(panel.open)return;const job=pending,allow=accepted;pending=null;accepted=false;if(!job)return;const result=resolveHarvestLoad(game,job,allow);if(!allow)onNotice?.(result.message);onChange();});
 // 离开页面不提交尚未确认的收获。
 function dispose(){pending=null;scope.dispose();panel.remove();}
 return {render,dispose};
}
