// 床边休息采用统一紧凑底板；选择时暂停，候选日期仅在正式睡眠保存成功后兑现。
import {sleepInCottage,cottageSleepTarget} from '../core/home/cottage.js';
import {calendarView} from '../world/living-calendar.js';
import {createEventScope} from '../platform/events.js';
export function createCottageSleep({game,root,dialogs,input}) {
 const scope=createEventScope(),dialog=root.createElement('dialog');let room=null;
 dialog.id='cottage-sleep-dialog';dialog.className='ui-panel ui-panel--compact';dialog.setAttribute('aria-labelledby','cottage-sleep-title');
 dialog.innerHTML='<header class="ui-panel__header"><h2 id="cottage-sleep-title">睡到什么时候</h2><button class="ui-close" aria-label="取消休息">×</button></header><div class="ui-panel__body"><p>睡醒后恢复全部生命。</p><div class="ui-section"><button class="ui-button" data-sleep="morning">睡到早晨</button><button class="ui-button" data-sleep="dusk">睡到黄昏</button><button class="ui-button" data-sleep="night">睡到夜晚</button></div><p id="cottage-sleep-feedback" role="status"></p></div><footer class="ui-panel__footer"><button class="ui-button" data-cancel-sleep>暂不休息</button></footer>';
 root.body.append(dialog);dialogs.register(dialog.id);
 // Esc、取消和完成选择均锁住床边，避免关闭后下一帧再次弹出。
 function cancel(){if(room){room.sleepRequested=false;room.restElapsed=null;room.bedLatch=true;}room=null;}
 scope.on(dialog,'close',cancel);
 scope.on(dialog,'click',event=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.dataset.sleep){
   if(game.cottage!==room||!sleepInCottage(game,b.dataset.sleep)){dialog.querySelector('#cottage-sleep-feedback').textContent='请回到床边再休息。';return;}
  }
  input.reset();cancel();dialogs.close(dialog.id);
 });
 // 只在床边请求产生时打开，不抢占其他服务页；日期提示与提交共用目标计算。
 function render(){
  if(dialog.open&&game.cottage!==room){cancel();dialogs.close(dialog.id);}
  if(!game.cottage?.sleepRequested||dialog.open||game.state!=='playing'||root.querySelector('dialog[open]'))return;
  room=game.cottage;input.reset();dialog.querySelector('#cottage-sleep-feedback').textContent='';
  for(const b of dialog.querySelectorAll('[data-sleep]')){
   const target=cottageSleepTarget(game.progress.living.calendar,b.dataset.sleep),name={morning:'早晨',dusk:'黄昏',night:'夜晚'}[b.dataset.sleep];
   b.textContent='睡到'+name+' · '+(target.day>game.progress.living.calendar.day?'次日':'今日');b.title=calendarView(target).label;
  }
  dialogs.open(dialog.id);
 }
 // 卸载时清理本模块的事件和节点，暂停归属仍由统一弹窗管理器负责。
 function dispose(){cancel();scope.dispose();dialog.remove();}
 return {render,dispose};
}
