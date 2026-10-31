// 开始过场只管理展示与时序；地图是否就绪由应用显式通知，未就绪永远不到100%。
import {JINBEI_LOADING_SVG} from '../rendering/loading-van.js';
export const START_LOADING_TIMING = {travel:1600,finish:260,hold:120};

// 车身与进度填充使用合成层动画，主线程建立地图时仍可呈现行驶反馈。
export function createStartLoading({root,host}) {
  const panel=root.getElementById('start-loading'),road=root.getElementById('start-loading-road'),
    fill=root.getElementById('start-loading-fill'),bar=root.getElementById('start-loading-progress'),
    label=root.getElementById('start-loading-percent'),van=root.getElementById('start-loading-van');
  van.innerHTML=JINBEI_LOADING_SVG;
  let active=false,prepared=false,frame=null,started=0,finishing=null,callback=null,animations=[];
  const reduced=host.matchMedia('(prefers-reduced-motion: reduce)');
  // 同步视觉百分比与读屏进度，不播报每一帧的重复文字。
  function setProgress(value){label.textContent=`${value}%`;bar.setAttribute('aria-valuenow',String(value));}
  // 每段动画明确保留终点；结束或卸载统一释放，不留常驻动画层。
  function animate(node,from,to,duration){animations.push(node.animate([{transform:from},{transform:to}],{duration,easing:'linear',fill:'forwards'}));}
  // 取消未完成回调，防止退出期间重新进入游戏。
  function stop(){active=false;prepared=false;callback=null;if(frame!==null)host.cancelAnimationFrame(frame);frame=null;for(const a of animations)a.cancel();animations=[];panel.hidden=true;}
  // 进度按过场时钟前进到90%，最后一段必须等待真实地图与首帧缓存就绪。
  function tick(now){
    if(!active)return;
    // 帧时间戳可能略早于点击时的 performance.now()；首帧耗时不得为负。
    const elapsed=Math.max(0,now-started),{travel,finish,hold}=START_LOADING_TIMING;
    if(prepared&&elapsed>=travel&&finishing===null){
      finishing=now;animate(fill,'scaleX(.9)','scaleX(1)',finish);
      if(!reduced.matches)animate(road,'translateX(90%)','translateX(calc(100% + 112px))',finish);
    }
    const percent=finishing===null?Math.min(90,Math.floor(elapsed/travel*90)):Math.min(100,90+Math.floor((now-finishing)/finish*10));
    // 等待地图时车停在路边，轮辐也停在当前角度；最后一段再继续行驶。
    panel.dataset.phase=finishing!==null?'finishing':elapsed>=travel?'waiting':'moving';
    setProgress(percent);
    if(finishing!==null&&now-finishing>=finish+hold){const done=callback;stop();done?.();return;}
    frame=host.requestAnimationFrame(tick);
  }
  // 点击当帧先显示0%并隐藏首页控件，建图安排在后续帧。
  function start(){
    stop();active=true;started=host.performance.now();finishing=null;panel.dataset.phase='moving';panel.hidden=false;setProgress(0);
    animate(fill,'scaleX(0)','scaleX(.9)',START_LOADING_TIMING.travel);
    if(!reduced.matches)animate(road,'translateX(0)','translateX(90%)',START_LOADING_TIMING.travel);
    panel.focus({preventScroll:true});frame=host.requestAnimationFrame(tick);
  }
  // 准备通知只放行最后10%，不会跳过用户可见的行驶或100%阶段。
  function complete(done){if(!active)return;prepared=true;callback=done;}
  return {start,complete,stop,dispose:stop};
}
