// 过场只展示已完成的实际工作；未收到就绪通知永远不到100%。
import {JINBEI_LOADING_SVG} from '../rendering/loading-van.js';
import {START_LOADING_TIMING} from '../config/start-loading.js';
export {START_LOADING_TIMING} from '../config/start-loading.js';

// 百分比、填充与车身共用同一个显示进度，避免主线程忙碌时图文各走一套时钟。
export function createStartLoading({root,host}){
 const panel=root.getElementById('start-loading'),road=root.getElementById('start-loading-road'),fill=root.getElementById('start-loading-fill'),bar=root.getElementById('start-loading-progress'),label=root.getElementById('start-loading-percent'),van=root.getElementById('start-loading-van');
 van.innerHTML=JINBEI_LOADING_SVG;
 const reduced=host.matchMedia('(prefers-reduced-motion: reduce)');
 let active=false,prepared=false,frame=null,shown=0,target=0,from=0,changed=0,finishedAt=null,callback=null;
 // 数字、读屏与图形同步提交，减少动态时车仍停在CSS规定的中心位置。
 function paint(exit=0){
  const percent=Math.floor(shown);label.textContent=percent+'%';bar.setAttribute('aria-valuenow',String(percent));
  fill.style.transform='scaleX('+shown/100+')';
  road.style.transform=reduced.matches?'':exit>0?'translateX(calc(100% + '+exit*112+'px))':'translateX('+shown+'%)';
 }
 // 取消未完成回调与帧任务，销毁后不能误入游戏。
 function stop(){active=false;prepared=false;callback=null;if(frame!==null)host.cancelAnimationFrame(frame);frame=null;panel.hidden=true;}
 // 只向真实上报的目标插值；没有新任务完成时停在原位置。
 function tick(now){
  if(!active)return;
  const ratio=Math.min(1,Math.max(0,now-changed)/START_LOADING_TIMING.smooth);
  shown=Math.max(shown,from+(target-from)*ratio);if(ratio===1)shown=target;
  panel.dataset.phase=prepared?'finishing':shown<target?'moving':'waiting';
  let exit=0;
  if(prepared&&shown===100){
   finishedAt??=now;
   // 100%只锁定进度，小车从条尾继续平移一个车身宽度，驶出后才移除过场。
   const duration=reduced.matches?START_LOADING_TIMING.hold:START_LOADING_TIMING.exit;
   exit=Math.min(1,Math.max(0,now-finishedAt)/duration);
   if(exit===1){paint(exit);const done=callback;stop();done?.();return;}
  }
  paint(exit);
  frame=host.requestAnimationFrame(tick);
 }
 // 新一轮清空旧进度；装配和缓存的完成量由应用重新上报。
 function start(){stop();active=true;shown=target=from=0;changed=host.performance.now();finishedAt=null;panel.dataset.phase='moving';panel.hidden=false;paint();panel.focus({preventScroll:true});frame=host.requestAnimationFrame(tick);}
 // 乱序、重复和非法上报均不能倒退或假报完成。
 function update(value){
  if(!active||prepared||!Number.isFinite(value))return;
  const next=Math.max(target,Math.min(99,Math.max(0,value)));if(next===target)return;
  from=shown;target=next;changed=host.performance.now();
 }
 // 只有全部工作就绪才解锁最后1%，100%可见后才恢复游戏模拟。
 function complete(done){if(!active||prepared)return;prepared=true;callback=done;from=shown;target=100;changed=host.performance.now();}
 return {start,update,complete,stop,dispose:stop};
}
