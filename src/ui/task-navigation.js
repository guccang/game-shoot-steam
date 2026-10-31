// 手机任务卡右侧共用寻路开关；不把取消路线当作放弃任务。
import {taskNavigationEnabled,toggleTaskNavigation} from '../core/task-navigation.js';
import {createEventScope} from '../platform/events.js';
// 不重复设置相同属性，避免每帧使样式失效。
function attribute(node,name,value){if(node.getAttribute(name)!==value)node.setAttribute(name,value);}
// 跟随当前可见任务栏，入职、主线、清缴与故事只显示一个开关。
export function createTaskNavigation({game,root,onChange}){
 const scope=createEventScope(),frame=root.getElementById('game-frame'),button=root.createElement('button');
 button.id='task-navigation-toggle';button.type='button';button.className='ui-button task-navigation-toggle';button.hidden=true;frame.append(button);
 // 图标沿用正式SVG语言，关闭用斜杠与空心箭头区分，不只依赖颜色。
 button.innerHTML='<svg viewBox="0 0 32 32" aria-hidden="true"><path class="task-route-trail" d="M7 25v-5a4 4 0 0 1 4-4h3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle class="task-route-trail" cx="7" cy="26" r="2" fill="currentColor"/><path class="task-route-arrow" d="m22 5 6 16-6-4-6 4Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path class="task-route-slash" d="M5 5 27 27" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>';
 scope.on(button,'click',()=>{toggleTaskNavigation(game);onChange();});
 // 只由右侧独立按钮切换寻路，任务正文事件交回各自的详情与操作入口。
 // 开关在任务卡右侧留白内居中，保持独立按钮，避免在可点击任务卡中嵌套按钮。
 function render(){
  const candidates=['mainline-hud','ranger-arrival','boss-hud','quest'].map(id=>root.getElementById(id));
  const blocked=game.state!=='playing'||game.arrivalCinematic||game.realm||game.fireActive||game.campDefense||root.querySelector('dialog[open]');
  const anchor=!blocked&&candidates.find(n=>n&&!n.hidden&&n.offsetHeight&&getComputedStyle(n).visibility!=='hidden');
  const hidden=!anchor;if(button.hidden!==hidden)button.hidden=hidden;
  for(const n of candidates)if(n){const selected=!hidden&&n===anchor;if(n.classList.contains('task-route-anchor')!==selected)n.classList.toggle('task-route-anchor',selected);}
  if(button.hidden)return;
  const enabled=taskNavigationEnabled(game),rect=frame.getBoundingClientRect(),a=anchor.getBoundingClientRect();
  attribute(button,'data-enabled',String(enabled));attribute(button,'aria-pressed',String(enabled));attribute(button,'aria-label',enabled?'关闭任务寻路，保留任务进度':'开启任务寻路');attribute(button,'title',enabled?'寻路已开启，点击关闭':'寻路已关闭，点击开启');
  // 波次面板中开关紧跟问号同排；其他任务卡继续沿用独立右侧锚点。
  const clearing=frame.classList.contains('task-combat-active')&&anchor.classList.contains('clearing-focused');
  const help=anchor.querySelector('#wave-help'),helpRect=help?.getBoundingClientRect();
  const besideHelp=helpRect?.height>0;
  const left=(a.right-rect.left-45)+'px',top=(besideHelp?helpRect.top-rect.top:a.top-rect.top+(clearing?6:(a.height-44)/2))+'px';
  if(button.style.left!==left)button.style.left=left;if(button.style.top!==top)button.style.top=top;

 }
 // 应用销毁时释放按钮和监听，重新进入不重复创建。
 function dispose(){scope.dispose();for(const n of root.querySelectorAll('.task-route-anchor'))n.classList.remove('task-route-anchor');button.remove();}
 return {render,dispose};
}
