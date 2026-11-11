import {deliverClearingReports} from '../core/camp/living-world.js';
import {displayMeters} from '../world/distance-units.js';
import {forestRuleLines} from '../config/forest-rules.js';
import {facilityOpen} from "../config/town-restoration.js";
import {worldDistance} from '../world/coordinates.js';
import {sceneHit,placeSceneHit} from './scene-hit.js';
// 清缴场景交互：点告示牌接取，确认后自动接续正式导航，不借用邻里长列表。
import {regionalClearingBoard,nearestClearingPost,clearingApproach,CLEARING_STEPS} from '../config/clearing.js';
import {challengeLevelMarkup} from './challenge-feedback.js';
import {challengeProgress} from '../config/economy.js';
import {clearingRound} from './clearing-round.js';
import {clearingSite} from '../progression/story/clearing-site.js';
import {canUseClearingPost,acceptClearingPost,clearingStage,clearingPostReason} from '../core/story/clearing-guide.js';
import {setLivingPatrol} from '../core/camp/living-world.js';
import {requestWorldNavigation} from '../core/navigation/world-navigation.js';
import {livingForest} from '../world/living-spaces.js';
import {createEventScope} from '../platform/events.js';
import {clearingCombatActive} from '../core/camp/living-safety.js';
// 简短节点使用SVG图形，避免稀有字符缺字导致教学图标空白。
const icons={accept:'<path d="M10 33V6m0 1h22l-6 8 6 8H10"/>',travel:'<path d="M7 30c28 0-12-20 20-20m-5-5 7 5-7 5" stroke-dasharray="4 4"/>',battle:'<path d="M10 13 6 5l13 7 15-7-4 9v13l-10 8-10-8Z"/><path d="m14 19 4 2m8-2-4 2M16 27h8"/>'};
// 面板、现场按钮与快捷键均走同一核心权限；卸载时清除所有监听。
export function createClearingPanel({game,root,renderer,dialogs,onChange}){
 const scope=createEventScope(),frame=root.getElementById('game-frame'),marker=root.createElement('button'),dialog=root.createElement('dialog');
 const combatLabels=['quest','boss-hud'].map(id=>{const host=root.getElementById(id),label=root.createElement('span');label.className='clearing-objective';label.hidden=true;host.append(label);return {host,label};});
 marker.id='clearing-marker';marker.className='clearing-marker';marker.hidden=true;sceneHit(marker,'查看清缴告示牌');frame.append(marker);
 dialog.id='clearing-dialog';dialog.className='clearing-dialog ui-panel ui-page';dialog.setAttribute('aria-labelledby','clearing-title');
 // 与任务簿共用固定标题、滚动正文和操作栏，短屏也能直接接取或暂停。
 dialog.innerHTML=`<header class="ui-panel__header"><div><small>营地 · 巡护委托</small><h2 id="clearing-title">领主清缴</h2></div><button id="clearing-close" class="ui-close" aria-label="关闭清缴告示牌">×</button></header><div class="ui-panel__body"><ol class="clearing-steps">${CLEARING_STEPS.map(s=>`<li><svg viewBox="0 0 40 40" aria-hidden="true">${icons[s.icon]}</svg><b>${s.label}</b></li>`).join('')}</ol><p id="clearing-status"></p><p class="clearing-loot">团怪成群 · 击败怪物获得装备材料</p><p id="clearing-error" role="status"></p></div><footer class="ui-panel__footer"><button id="clearing-deliver" class="ui-button">交付战报</button><button id="clearing-stop" class="ui-button">暂停清缴</button><button id="clearing-accept" class="ui-button ui-button--primary"></button></footer>`;
 root.body.append(dialog);const $=id=>root.getElementById(id);
 // 禁用原因固定在操作栏，不依赖点击禁用按钮，也不会随正文滚动而消失。
 const blockedReason=root.createElement('p');blockedReason.id='clearing-blocked-reason';blockedReason.setAttribute('role','status');blockedReason.hidden=true;
 dialog.querySelector('.ui-panel__footer').prepend(blockedReason);$('clearing-accept').setAttribute('aria-describedby',blockedReason.id);
 const rules=root.createElement('details');rules.className='ui-section';const summary=root.createElement('summary');summary.textContent='野外怪物刷新规则';rules.append(summary);for(const text of forestRuleLines()){const p=root.createElement('p');p.textContent=text;rules.append(p);}dialog.querySelector('.ui-panel__body').append(rules);
 // 等级区插在滚动正文的任务步骤之后，底部领取操作独立保留。
 const challenge=root.createElement('div');challenge.id='clearing-challenge-level';dialog.querySelector('.clearing-steps').after(challenge);
 // 节点状态来自实际接取与地点，失败时保持原界面可重试。
 function render(){if(!dialog.open)return;const active=game.progress.living.patrolActive,resuming=!active&&!!game.boss?.livingChallenge;
  challenge.innerHTML=challengeLevelMarkup(game.progress);
  [...dialog.querySelectorAll('li')].forEach((n,i)=>n.dataset.current=String(i===(active?1:0)));
  dialog.querySelector('.clearing-loot').textContent=game.progress.bosses<3?'入门清缴 · 团怪成群，特殊怪穿插':'进阶清缴 · 成群团怪与特殊强敌';
  dialog.querySelector('.clearing-loot').textContent+=' · 击败怪物获得装备材料；金币来自种地，木材通过采集与任务获取';
  dialog.querySelector('.clearing-loot').textContent+=' · 完成后营地经验 +180';
  $('clearing-status').textContent=`第 ${clearingRound(game)} 轮清缴 · ${active?`已接取 · 距地点 ${displayMeters(worldDistance(game.player,clearingSite(game.progress)))} 米`:`接取营地周围 1000 米内 · 清理 5 批怪物及领主`}`;
  if(resuming)$('clearing-status').textContent=`第 ${clearingRound(game)} 轮清缴已暂停 · 领主 ${Math.ceil(game.boss.hp)} / ${game.boss.maxHp} HP · 继续后返回原地点。`;
  dialog.querySelector('.clearing-loot').textContent+=' · 远离领主脱战或回营后可暂停并购买弹药，无需先击败领主';
  const reason=clearingPostReason(game),accept=$('clearing-accept');
  blockedReason.textContent=reason;blockedReason.hidden=!reason;accept.dataset.disabledReason=reason;accept.title=reason;
  const deliver=$('clearing-deliver'),reports=game.progress.living.clearingReports;
  deliver.hidden=!reports;deliver.disabled=!!reason;deliver.textContent='交付清缴战报（'+reports+'）';
  accept.textContent=active?'继续前往':resuming?'继续本轮清缴':'接取并出发';accept.disabled=!!reason;$('clearing-stop').hidden=!active;
 }
 // 从菜单远程查看时先引向实体；不能隔空接取，也不会打开无关居民页面。
 function visit(){if(!nearestClearingPost(game.player).camp&&!facilityOpen(game.progress,'clearing')){game.requestFacility?.('clearing');return;}if(canUseClearingPost(game))open();else{requestWorldNavigation(game,clearingApproach(game.player),'去清缴告示牌接取');onChange();}}
 // 原生弹窗只在现场打开，初始焦点落在当前确认操作上。
 function open(){if(!regionalClearingBoard(game.player)&&!facilityOpen(game.progress,'clearing')){game.requestFacility?.('clearing');return false;}if(!canUseClearingPost(game))return false;$('clearing-error').textContent='';dialogs.open('clearing-dialog');render();return true;}
 // 任务卡可远程阅读委托数据；接取按钮继续使用原有现场距离和任务权限。
 function inspect(){if(!regionalClearingBoard(game.player)&&!facilityOpen(game.progress,'clearing')){game.requestFacility?.('clearing');return;}$('clearing-error').textContent='';dialogs.open('clearing-dialog');}
 dialogs.register('clearing-dialog',{onOpen:()=>{render();dialog.querySelector('.ui-panel__body').scrollTop=0;},focusId:'clearing-accept'});
 scope.on(marker,'click',e=>{if(e.detail===0)visit();});scope.on($('clearing-close'),'click',()=>dialogs.close('clearing-dialog'));
 scope.on($('clearing-accept'),'click',()=>{const r=acceptClearingPost(game);if(!r.ok){$('clearing-error').textContent=r.message;return;}requestWorldNavigation(game,clearingSite(game.progress),'前往本次清缴地点');dialogs.close('clearing-dialog');onChange();});
 scope.on($('clearing-deliver'),'click',()=>{const result=deliverClearingReports(game);render();$('clearing-error').textContent=result.ok?'清缴战报已交付。':result.message;onChange();});
 scope.on($('clearing-stop'),'click',()=>{const r=setLivingPatrol(game,false);if(!r.ok){$('clearing-error').textContent=r.message;return;}dialogs.close('clearing-dialog');onChange();});
 scope.on(root,'keydown',e=>{if(e.code==='KeyE'&&!e.repeat&&!e.defaultPrevented&&!marker.hidden&&canUseClearingPost(game)&&!root.querySelector('dialog[open]')){e.preventDefault();open();}});
 // 命中区贴合告示牌本体，离开屏幕或进入对话时隐藏，保留键盘操作。
 function renderFrame(){
  const focused=clearingCombatActive(game),objective=game.boss?'击败领主':game.bossReady?'领主即将登场':'清理怪潮';
  // 文本节点重建会触发布局；轮次、目标或显隐实际改变时才提交更新。
  const combatText=`第 ${clearingRound(game)} 轮清缴 · ${objective}`;
  for(const {host,label} of combatLabels){if(label.hidden===focused)label.hidden=!focused;if(host.classList.contains('clearing-focused')!==focused)host.classList.toggle('clearing-focused',focused);if(label.textContent!==combatText)label.textContent=combatText;}
  if(!livingForest(game)||game.state!=='playing'||game.mainlineSpeech||!renderer.view||root.querySelector('dialog[open]')||frame.dataset.page==='title'){if(!marker.hidden)marker.hidden=true;return;}
  placeSceneHit(marker,nearestClearingPost(game.player),renderer,frame,{width:118,height:108});const stage=clearingStage(game);if(marker.dataset.stage!==stage)marker.dataset.stage=stage;
  const q=challengeProgress(game.progress),label=`查看清缴告示牌，营地 ${q.tier} 级，购买${q.percent/10}折`;
  if(marker.getAttribute('aria-label')!==label)marker.setAttribute('aria-label',label);
 }
 // 释放原生弹窗与场景命中区，不留下空白标签。
 function dispose(){scope.dispose();for(const {host,label} of combatLabels){label.remove();host.classList.remove('clearing-focused');}marker.remove();dialog.remove();}
 return {open,visit,inspect,render,renderFrame,dispose};
}
