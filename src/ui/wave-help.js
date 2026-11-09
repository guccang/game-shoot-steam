import { HELP_EMBLEM } from './help-emblem.js';
import { i18nText, i18nHtml } from "../i18n/index.js";
// 波次详情复用正式进度与弹窗暂停归属，不维护第二套计数或计时。
import {waveDifficulty} from '../config/waves.js';
import {waveProgressState,updateWaveProgress} from './wave-progress.js';
import {createEventScope} from '../platform/events.js';
import {clearingRound} from './clearing-round.js';
import {clearingCombatActive} from '../core/camp/living-safety.js';
import {claimClearingNotice} from '../core/story/clearing-notice.js';
import {taskNavigationEnabled,toggleTaskNavigation} from '../core/navigation/task-navigation.js';

// 详情展示当前已结算击杀；波间休整仍说明刚完成的波次和下一波。
export function waveHelpState(game){
  const group=waveProgressState(game),total=waveDifficulty(group.waiting?group.start:game.wave,game.recoveryRun).total;
  const status=game.boss?i18nText("ui.wave-help.998f7a3734"):game.bossReady?i18nText("ui.wave-help.2bd1cbab02"):game.waveRest>0?i18nText("ui.wave-help.5b81df441b"):game.waveWarning>0?i18nText("ui.wave-help.b53be09930"):i18nText("ui.wave-help.add02fbaf5");
  const note=game.boss?i18nText("ui.wave-help.b5b2d04085"):game.bossReady?i18nText("ui.wave-help.84acd880fb"):game.waveRest>0?
    i18nText("ui.wave-help.c46c6bb8a7", { p0: (group.waiting?1:Math.min(group.count,group.completed+1)) }):game.waveWarning>0?
    i18nText("ui.wave-help.09d8d9a887"):i18nText("ui.wave-help.79ea54e1a7");
  return {wave:game.wave,round:clearingRound(game),kills:group.waiting?0:Math.min(total,Math.max(0,game.waveKills)),total,status,note,completed:group.completed,count:group.count};
}

// 清缴范围内将说明徽章接在生命卡之后；手动详情支持键盘关闭并恢复焦点。
export function createWaveHelp({game,root,dialogs}){
  const scope=createEventScope(),button=root.createElement('button'),dialog=root.createElement('dialog');
  const frame=root.getElementById('game-frame'),health=root.querySelector('.bottom-info'),quest=root.getElementById('quest');
  const track=root.getElementById('wave-track');
  let automatic=false,hideAt=0,motion=null,hintMotion=null,closing=false,disposed=false;
  button.id='wave-help';button.type='button';button.setAttribute('aria-label',i18nText("ui.wave-help.6ec1f91040"));
  button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','wave-help-dialog');button.innerHTML=HELP_EMBLEM;
  root.getElementById('quest').append(button);
  dialog.id='wave-help-dialog';dialog.className='wave-help-dialog';dialog.setAttribute('aria-labelledby','wave-help-title');
  dialog.innerHTML=`<header><div><h2 id="wave-help-title">清缴任务</h2><small id="clearing-notice-countdown" hidden></small></div><button id="wave-help-close" aria-label="${i18nHtml("ui.wave-help.586c88a44f")}">×</button></header><p id="wave-help-wave"></p><div class="wave-help-counter"><span>${i18nHtml("ui.wave-help.054525de16")}</span><strong id="wave-help-count"></strong></div><p id="wave-help-group"></p><p id="wave-help-note"></p>`;
  root.body.append(dialog);
  // 直接移动正式轨道，保留唯一节点、头像画布与按钮事件，不复制静态快照。
  const detailTrack=root.createElement('div');detailTrack.id='wave-help-track';root.getElementById('wave-help-wave').after(detailTrack);
  // 容器切换时立即刷新，关闭或范围外打开均不等待下一次HUD更新。
  function placeTrack(parent){if(track.parentElement!==parent){parent.append(track);updateWaveProgress(root,game);}}
  const routeButton=root.createElement('button');routeButton.id='clearing-detail-navigation';routeButton.type='button';routeButton.className='ui-button';dialog.append(routeButton);
  // 区分实际输入方式，避免弹窗程序恢复焦点被浏览器误判为键盘操作。
  button.dataset.focusInput='pointer';
  scope.on(root,'pointerdown',()=>{button.dataset.focusInput='pointer';},true);
  scope.on(root,'keydown',event=>{
    if(!event.altKey&&!event.ctrlKey&&!event.metaKey&&['Tab','Enter',' ','Escape'].includes(event.key))
      button.dataset.focusInput='keyboard';
  },true);
  // 每次打开重新读取战场，不沿用上次打开时的快照。
  function render(){
    placeTrack(detailTrack);
    updateWaveProgress(root,game);
    const s=waveHelpState(game);
    root.getElementById('wave-help-wave').textContent=`第 ${s.round} 轮清缴 · ${s.status}`;
    root.getElementById('wave-help-count').textContent=s.kills+' / '+s.total;
    root.getElementById('wave-help-group').textContent=i18nText("ui.wave-help.d33ad58163", { p0: (s.completed), p1: (s.count) });
    root.getElementById('wave-help-note').textContent=s.note;
    const enabled=taskNavigationEnabled(game);routeButton.textContent=enabled?'关闭寻路光点':'开启寻路光点';routeButton.setAttribute('aria-pressed',String(enabled));
  }
  const countdown=root.getElementById('clearing-notice-countdown');
  // 取消旧动画及其完成回调，快速重开时不让上一轮关闭新面板。
  function clearMotion(){if(motion){motion.onfinish=null;motion.cancel();motion=null;}closing=false;delete dialog.dataset.collapsing;}
  // 每次使用实际屏幕坐标，手机旋转和安全区变化后仍收向同一枚猫猫图标。
  function endpoint(){
    const from=dialog.getBoundingClientRect(),to=button.getBoundingClientRect();
    if(!from.width||!from.height||!to.width||!to.height)return null;
    return 'translate('+(to.x+to.width/2-from.x-from.width/2)+'px,'+(to.y+to.height/2-from.y-from.height/2)+'px) scale('+Math.min(to.width/from.width,to.height/from.height)+')';
  }
  // 关闭后统一归还暂停和焦点，落点短亮一次说明可在此继续查看。
  function finishClose(highlight=false){
    clearMotion();automatic=false;hideAt=0;countdown.hidden=true;
    dialogs.close(dialog.id);
    if(highlight&&!disposed&&button.getBoundingClientRect().width){
      button.focus({preventScroll:true});
      if(!root.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches){
        hintMotion?.cancel();hintMotion=button.animate([{boxShadow:'0 0 0 0 #edbd6399'},{boxShadow:'0 0 0 9px #edbd6300'}],{duration:500});
        hintMotion.onfinish=()=>{hintMotion=null;};
      }
    }
  }
  // 倒计时、关闭按钮和Escape共用缩向入口的关闭路径。
  function collapse(){
    if(!dialog.open||closing)return;
    clearMotion();closing=true;hideAt=0;dialog.dataset.collapsing='true';
    const target=endpoint(),reduced=root.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches;
    motion=dialog.animate([{transform:'none',opacity:1},{transform:reduced||!target?'none':target,opacity:0}],{duration:reduced?100:440,easing:'cubic-bezier(.4,0,.8,1)',fill:'forwards'});
    motion.onfinish=()=>finishClose(true);
  }
  // 首次与手动查看复用同一面板；手动接管会撤销自动收起。
  function openDetail(auto=false){
    clearMotion();hintMotion?.cancel();hintMotion=null;automatic=auto;hideAt=auto?root.defaultView.performance.now()+3000:0;
    countdown.hidden=!auto;countdown.textContent=auto?'3秒后收起 · 点问号查看':'';
    if(dialog.open){render();return;}
    dialogs.open(dialog.id);
    if(!auto&&!root.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches){
      const start=endpoint();if(start){motion=dialog.animate([{transform:start,opacity:.15},{transform:'none',opacity:1}],{duration:260,easing:'cubic-bezier(.2,.8,.2,1)'});motion.onfinish=()=>{motion=null;};}
    }
  }
  dialogs.register(dialog.id,{onOpen:render,focusId:'wave-help-close'});
  scope.on(button,'click',()=>{if(!game.story&&!game.realm)openDetail();});
  // 清缴任务正文打开当前波次数据；召唤领主等内嵌按钮保留自己的操作。
  for(const id of ['quest','boss-hud'])scope.on(root.getElementById(id),'click',event=>{
    if(!game.story&&!game.realm&&!event.target.closest('button,a,input,summary'))openDetail();
  });
  scope.on(root.getElementById('wave-help-close'),'click',collapse);
  scope.on(dialog,'cancel',event=>{event.preventDefault();collapse();});
  // 原生外部关闭也取消倒计时与动画，唯一轨道始终归还原HUD。
  scope.on(dialog,'close',()=>{if(!dialog.open){clearMotion();automatic=false;hideAt=0;countdown.hidden=true;placeTrack(quest);}});
  scope.on(routeButton,'click',()=>{automatic=false;hideAt=0;countdown.hidden=true;toggleTaskNavigation(game);render();});
  // 使用页面时钟倒计时，弹窗暂停战斗时也能准时收起。
  function renderFrame(){
    const compact=clearingCombatActive(game),parent=compact?health:quest;
    if(button.parentElement!==parent)parent.append(button);
    if(dialog.open){
      if(automatic){
        const interrupted=root.hidden||!compact||!game.progress.living.patrolActive||!['playing','paused'].includes(game.state)||!!root.querySelector('dialog[open]:not(#wave-help-dialog)');
        if(interrupted){finishClose();return;}
        if(!closing){
          const now=root.defaultView.performance.now();
          countdown.textContent=Math.max(0,Math.ceil((hideAt-now)/1000))+'秒后收起 · 点问号查看';
          if(now>=hideAt)collapse();
        }
      }
      return;
    }
    placeTrack(quest);
    if(root.hidden||game.state!=='playing'||frame.dataset.page==='title'||game.mainlineSpeech||root.querySelector('dialog[open]'))return;
    if(claimClearingNotice(game))openDetail(true);
  }
  // 切后台或旋转期间取消飞行动画，避免返回时看到过期坐标。
  scope.on(root,'visibilitychange',()=>{if(root.hidden&&automatic)finishClose();});
  scope.on(root.defaultView,'resize',()=>{if(closing)finishClose(true);});
  // 与 HUD 一起卸载，不留下倒计时、动画或第二份轨道。
  function dispose(){disposed=true;clearMotion();hintMotion?.cancel();scope.dispose();placeTrack(quest);button.remove();dialog.remove();}
  return {dispose,renderFrame};
}
