import { HELP_EMBLEM } from './help-emblem.js';
import { i18nText, i18nHtml } from "../i18n/index.js";
// 波次详情复用正式进度与弹窗暂停归属，不维护第二套计数或计时。
import {waveDifficulty} from '../config/waves.js';
import {waveProgressState} from './wave-progress.js';
import {createEventScope} from '../platform/events.js';
import {clearingRound} from './clearing-round.js';
import {clearingCombatActive} from '../core/living-safety.js';
import {claimClearingNotice} from '../core/clearing-notice.js';
import {taskNavigationEnabled,toggleTaskNavigation} from '../core/task-navigation.js';

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
  const notice=root.createElement('section');notice.id='clearing-arrival-notice';notice.className='ui-panel ui-panel--compact';notice.hidden=true;notice.setAttribute('role','status');
  notice.innerHTML='<header class="ui-panel__header"><b id="clearing-notice-round"></b></header><div class="ui-panel__body"><p id="clearing-notice-progress"></p><progress id="clearing-notice-bar" max="100" aria-label="清缴进度"></progress></div>';health.append(notice);
  let hideAt=0;
  button.id='wave-help';button.type='button';button.setAttribute('aria-label',i18nText("ui.wave-help.6ec1f91040"));
  button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','wave-help-dialog');button.innerHTML=HELP_EMBLEM;
  root.getElementById('quest').append(button);
  dialog.id='wave-help-dialog';dialog.className='wave-help-dialog';dialog.setAttribute('aria-labelledby','wave-help-title');
  dialog.innerHTML=`<header><h2 id="wave-help-title">Boss 清缴任务</h2><button id="wave-help-close" aria-label="${i18nHtml("ui.wave-help.586c88a44f")}">×</button></header><p id="wave-help-wave"></p><div class="wave-help-counter"><span>${i18nHtml("ui.wave-help.054525de16")}</span><strong id="wave-help-count"></strong></div><p id="wave-help-group"></p><p id="wave-help-note"></p>`;
  root.body.append(dialog);
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
    const s=waveHelpState(game);
    root.getElementById('wave-help-wave').textContent=`第 ${s.round} 轮清缴 · ${s.status}`;
    root.getElementById('wave-help-count').textContent=s.kills+' / '+s.total;
    root.getElementById('wave-help-group').textContent=i18nText("ui.wave-help.d33ad58163", { p0: (s.completed), p1: (s.count) });
    root.getElementById('wave-help-note').textContent=s.note;
    const enabled=taskNavigationEnabled(game);routeButton.textContent=enabled?'关闭寻路光点':'开启寻路光点';routeButton.setAttribute('aria-pressed',String(enabled));
  }
  dialogs.register(dialog.id,{onOpen:render,focusId:'wave-help-close'});
  scope.on(button,'click',()=>{if(!game.story&&!game.realm)dialogs.open(dialog.id);});
  // 清缴任务正文打开当前波次数据；召唤领主等内嵌按钮保留自己的操作。
  for(const id of ['quest','boss-hud'])scope.on(root.getElementById(id),'click',event=>{
    if(!game.story&&!game.realm&&!event.target.closest('button,a,input,summary'))dialogs.open(dialog.id);
  });
  scope.on(root.getElementById('wave-help-close'),'click',()=>dialogs.close(dialog.id));
  scope.on(routeButton,'click',()=>{toggleTaskNavigation(game);render();});
  // 一秒提示仍读取实时击杀；只有文案或进度变化时才写DOM，不维护第二份计数。
  function renderNotice(){
    const s=waveHelpState(game),group=waveProgressState(game);
    const title=`第 ${s.round} 轮清缴 · ${s.status}`,progress=`已完成 ${s.completed} / ${s.count} 批 · 当前 ${s.kills} / ${s.total}`;
    const heading=root.getElementById('clearing-notice-round'),detail=root.getElementById('clearing-notice-progress'),bar=root.getElementById('clearing-notice-bar');
    if(heading.textContent!==title)heading.textContent=title;if(detail.textContent!==progress)detail.textContent=progress;
    if(bar.value!==group.progress*100)bar.value=group.progress*100;
  }
  // 每帧只更新出现/消失与父容器变化；自动提示无弹窗遮罩、不夺焦点且不暂停战斗。
  function renderFrame(){
    const compact=clearingCombatActive(game),parent=compact?health:quest;
    if(button.parentElement!==parent)parent.append(button);
    const hidden=!!root.querySelector('dialog[open]')||root.hidden||game.state!=='playing'||frame.dataset.page==='title'||!!game.mainlineSpeech;
    const now=root.defaultView.performance.now();
    if(hidden||!game.progress.living.patrolActive){if(!notice.hidden)notice.hidden=true;hideAt=0;return;}
    if(claimClearingNotice(game)){
      hideAt=now+1000;notice.hidden=false;
    }
    if(hideAt&&now>=hideAt){notice.hidden=true;hideAt=0;}
    if(!notice.hidden)renderNotice();
  }
  // 与 HUD 一起卸载，重新挂载不会增加按钮或重复注册监听。
  function dispose(){scope.dispose();button.remove();dialog.remove();notice.remove();}
  return {dispose,renderFrame};
}
