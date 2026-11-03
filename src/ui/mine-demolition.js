// 手机回收页固定展示目标与原价返还，二次确认后再回到场景提交事务。
import {createEventScope} from '../platform/events.js';
import {mineRemovalChoices,removeMineFacility} from '../core/mine-demolition.js';
// 与现有工具折叠栏、弹窗暂停和输入生命周期共用同一套接口。
export function createMineDemolition({game,root,controls,input,dialogs}){
 const scope=createEventScope(),button=root.createElement('button'),dialog=root.createElement('dialog');
 let context=null,choices=[],selected=null,pending=null;
 button.id='mine-remove';button.className='ui-button';button.textContent='拆除 / 回收';controls.querySelector('.mine-actions').append(button);
 dialog.id='mine-removal-dialog';dialog.className='ui-panel ui-panel--compact';dialog.setAttribute('aria-labelledby','mine-removal-title');
 dialog.innerHTML='<header class="ui-panel__header"><div><h2 id="mine-removal-title" tabindex="-1">拆除与回收</h2><p>先停车下车，再选择附近设施。</p></div><button class="ui-close" data-remove-close aria-label="关闭拆除页面">×</button></header><div class="ui-panel__body"><section class="ui-section"><div id="mine-removal-choices"></div><p id="mine-removal-detail" role="status">选择要回收的设施。铁轨拆除后保留通道和桥梁。</p></section></div><footer class="ui-panel__footer"><button class="ui-button" data-remove-close>取消</button><button class="ui-button ui-button--danger" data-remove-confirm disabled>确认回收</button></footer>';
 root.body.append(dialog);dialogs.register(dialog.id,{focusId:'mine-removal-title'});
 scope.on(button,'click',()=>{
  if(button.disabled||game.state!=='playing')return;
  context={room:game.cottage,depth:game.cottage.depth||1};selected=null;choices=mineRemovalChoices(game);
  const list=root.getElementById('mine-removal-choices');list.replaceChildren();
  for(const [index,choice] of choices.entries()){
   const row=root.createElement('div'),b=root.createElement('button'),help=root.createElement('p');
   b.className='ui-button';b.dataset.removeChoice=index;b.textContent=choice.label;b.disabled=!choice.ok;b.setAttribute('aria-pressed','false');
   help.textContent=choice.message;row.append(b,help);list.append(row);
  }
  dialog.querySelector('[data-remove-confirm]').disabled=true;root.getElementById('mine-removal-detail').textContent='选择要回收的设施。铁轨拆除后保留通道和桥梁。';
  input.reset();dialogs.open(dialog.id);
 });
 scope.on(dialog,'click',event=>{
  const b=event.target.closest('button');if(!b||b.disabled)return;
  if(b.hasAttribute('data-remove-close')){selected=null;dialogs.close(dialog.id);}
  else if(b.hasAttribute('data-remove-choice')){
   selected=choices[Number(b.dataset.removeChoice)];
   for(const choice of dialog.querySelectorAll('[data-remove-choice]'))choice.setAttribute('aria-pressed',String(choice===b));
   root.getElementById('mine-removal-detail').textContent='确定'+selected.label+'？'+selected.message;
   dialog.querySelector('[data-remove-confirm]').disabled=false;
  }else if(b.hasAttribute('data-remove-confirm')&&selected){
   pending={...context,target:selected};selected=null;input.reset();dialogs.close(dialog.id);
  }
 });
 // 切层和上下车导致旧确认失效，执行前核心还会检查距离、占用与存档。
 function render(){
  const room=game.cottage,valid=room?.kind==='mine';
  button.disabled=!valid||!!room.ride||game.vehicle.active;
  if(dialog.open&&(!valid||context.room!==room||context.depth!==(room.depth||1)||room.ride||game.vehicle.active)){dialogs.close(dialog.id);selected=null;}
  if(pending&&game.state==='playing'){
   const action=pending;pending=null;
   if(valid&&action.room===room&&action.depth===(room.depth||1))removeMineFacility(game,action.target);
  }
  if(!valid)pending=null;
 }
 // 卸载时关闭底板并清理监听，不保留未确认的回收操作。
 function dispose(){if(dialog.open)dialogs.close(dialog.id);scope.dispose();button.remove();dialog.remove();}
 return {render,dispose};
}
