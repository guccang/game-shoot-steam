// 设置下方的轻量帧率读数：只统计正式绘制回调，不启动额外循环或读取布局。
import {createEventScope} from '../platform/events.js';

// 一秒窗口显示实际绘制频率，与逻辑步长及诊断开关独立。
export function createFpsDisplay(root,preferences){
 const node=root.getElementById('fps-display'),scope=createEventScope();
 let start=null,frames=0;
 // 仅当读数改变时提交文字，避免稳定帧率下重复使样式失效。
 function text(value){if(node.textContent!==value)node.textContent=value;}
 // 后台、首页及开关切换不沿用旧窗口，等待下一秒的新样本。
 function reset(){start=null;frames=0;text('— FPS');}
 // 开关即时改变布局；任务栏沿用资源栏真实底边避让。
 function sync(){const hidden=!preferences.showFps;if(node.hidden!==hidden)node.hidden=hidden;reset();}
 // now来自正式帧入口的单调时钟；每帧常数计数，每秒最多一次文字更新。
 function recordFrame(now){
  if(!preferences.showFps)return;
  if(now===null||root.hidden){if(start!==null)reset();return;}
  if(start===null){start=now;return;}
  frames++;const elapsed=now-start;
  if(elapsed>=1000){text(Math.round(frames*1000/elapsed)+' FPS');start=now;frames=0;}
 }
 scope.on(root,'visibilitychange',reset);sync();
 // 重建应用时释放监听与旧读数，静态节点由页面继续持有。
 function dispose(){scope.dispose();node.hidden=true;reset();}
 return {sync,recordFrame,dispose};
}
