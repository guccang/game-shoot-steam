import { i18nText } from "../i18n/index.js";
// 首页视频只有一个解码实例；页面、可见性、减少动态共同控制播放。
import { createEventScope } from './events.js';
// 缺失视频明确失败；海报只用于加载及用户要求的减少动态，不能冒充成功视频。
export function createTitleVideo({ root, host, active }) {
  const video=root.getElementById('title-video'), status=root.getElementById('title-video-status'),
    play=root.getElementById('title-video-play'), scope=createEventScope(),
    reduced=host.matchMedia('(prefers-reduced-motion: reduce)');
  let disposed=false, failed=false, blocked=false, pending=false, generation=0;
  video.muted=true;
  // 失败态保留原因，显式重试才重新加载同一资源。
  function fail() {
    failed=true;video.pause();status.textContent=i18nText("platform.title-video.c688042202");
    play.hidden=false;play.textContent=i18nText("platform.title-video.d1ff3a0bd6");
  }
  // 异步播放结束后重新核对页面状态，避免快速切场景后误播。
  async function sync() {
    const hasFrame=video.readyState>=2;
    video.hidden=reduced.matches||!hasFrame;root.getElementById('title-poster').hidden=!video.hidden;
    const show=active()&&!root.hidden&&!reduced.matches;
    if(!show) { generation++;video.pause();if(!failed)status.textContent='';play.hidden=failed?false:!blocked||reduced.matches;return; }
    // 媒体独立缓冲，取得首帧前显示封面，可播放后才调用play；开始游戏不等待媒体。
    if(failed||disposed||pending||blocked||video.readyState<3)return;
    const token=++generation;pending=true;
    try {
      await video.play();
      if(disposed||token!==generation||!active()||root.hidden||reduced.matches)video.pause();
      else {status.textContent='';play.hidden=true;}
    } catch(error) {
      if(!disposed&&token===generation) {
        if(error.name==='NotAllowedError'){blocked=true;status.textContent=i18nText("platform.title-video.8e55da8cbd");play.hidden=false;play.textContent=i18nText("platform.title-video.4be5b0d5c7");}
        else if(error.name!=='AbortError')fail();
      }
    } finally {pending=false;if(!disposed&&token!==generation&&active()&&!root.hidden&&!reduced.matches)sync();}
  }
  scope.on(video,'error',fail);
  scope.on(video,'loadeddata',()=>{if(!failed)sync();});
  scope.on(video,'canplay',()=>{if(!failed)sync();});
  scope.on(root,'visibilitychange',sync);
  scope.on(reduced,'change',sync);
  // 重试同样静默加载，只有实际失败或播放受限时才显示反馈。
  scope.on(play,'click',()=>{failed=false;blocked=false;status.textContent='';play.hidden=true;video.load();sync();});
  video.src='/assets/title/background.mp4';sync();
  // 卸载释放媒体源、异步播放和监听，重挂载不会遗留解码器。
  function dispose(){disposed=true;generation++;scope.dispose();video.pause();video.removeAttribute('src');video.load();}
  return {sync,dispose};
}
