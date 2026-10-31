import { i18nText } from "../../i18n/index.js";
// 工坊试射独占异步加载、帧循环与时钟，切换对象后不再更新旧界面。
import { catSprites } from '../../rendering/cat-animation.js';
import { drawWorkshopTrial } from '../../rendering/workshop.js';

// 渲染与素材入口可注入，正式运行默认复用战场模块。
export function createWorkshopTrial({root,dialog,createTrial,reduced,onHit=()=>{},load=()=>catSprites.load(),draw=drawWorkshopTrial}) {
  const host=root.defaultView, $=id=>root.getElementById(id);
  let request=0,session=null,frame=0,last=0;

  // 失效所有未完成加载并释放动画，取消操作不接触正式战场。
  function stop() {
    request++;
    host.cancelAnimationFrame(frame);
    frame=0;session=null;last=0;
    $('ws-trial').hidden=true;
  }

  // 失败只影响当前试射；过期请求不能覆盖后来选中的装备反馈。
  function fail(token,message) {
    if(token!==request||!dialog.open)return;
    stop();
    $('ws-feedback').textContent=message;
  }

  // 后台或嵌套弹窗冻结时钟；会话结束时停止申请新帧。
  function tick(now) {
    if(!session)return;
    const token=request;
    try {
      const dt=last&&!root.hidden&&!root.querySelector('dialog[open]:not(#workshop-dialog)')?(now-last)/1000:0;
      last=now;
      const running=session.advance(dt);
      if(session.destroyed>0)onHit();
      draw($('ws-trial-canvas').getContext('2d'),session,reduced());
      $('ws-trial-time').textContent=i18nText("ui.workshop.trial.987608b869", { p0: (session.elapsed.toFixed(1)), p1: (session.batch), p2: (session.destroyed) });
      frame=running?host.requestAnimationFrame(tick):0;
    } catch {
      fail(token,i18nText("ui.workshop.trial.c26078a02a"));
    }
  }

  // 启动参数在点击时固定；加载期间切换对象会令本次请求失效。
  async function start({progress,kind,index,label}) {
    stop();
    const token=request;
    try {
      const loaded=await load();
      if(token!==request||!dialog.open)return;
      if(!loaded){fail(token,i18nText("ui.workshop.trial.17d3415836"));return;}
      session=createTrial(progress,kind,index,reduced());
      $('ws-trial').hidden=false;
      $('ws-trial-label').textContent=label;
      frame=host.requestAnimationFrame(tick);
      $('ws-trial').scrollIntoView({block:'nearest'});
    } catch {
      fail(token,i18nText("ui.workshop.trial.db2d5cd626"));
    }
  }

  return {start,stop,active:()=>session!==null};
}
