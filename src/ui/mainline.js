import {isCampaignTask} from '../config/mainline-pacing.js';
import {selectMainlineTask} from '../core/mainline-selection.js';
import {displayMeters} from '../world/distance-units.js';
import {farmLesson} from '../progression/farm.js';
import {FARM_CROPS} from '../config/farm.js';
import {createTaskNavigation} from './task-navigation.js';
import {sceneLayout} from './scene-layout.js';
import {taskNavigationEnabled} from '../core/task-navigation.js';
import {dockNpcDialogue} from './npc-dialogue-layout.js';
import {mainlineReward} from '../config/economy.js';
import {layoutTaskCombatHud,combatHudVisible} from './task-combat-layout.js';
import {clearingCombatActive} from '../core/living-safety.js';
import {sceneHit,placeSceneHit} from './scene-hit.js';
// 巡林簿界面只展示任务表和提交操作意图；不直接改等级、赠装备或判定通关。
import {campTalkSite} from '../core/camp-routines.js';
import {MAINLINE_TASKS,MAINLINE_SITES,MAINLINE_NPCS} from '../config/mainline.js';
import {mainlineTask,mainlineObjective,canTalkMainline,updateMainline,markMainline,mainlineSteps,mainlineStep,mainlineAction,advanceMainlineSpeech} from '../core/mainline-manager.js';
import {createEventScope} from '../platform/events.js';
import {worldDistance,nearest} from '../world/coordinates.js';
import {storyBearing} from './story-navigation.js';
import {trackedLivingRequest} from '../core/task-tracking.js';
import {livingRequestTarget} from '../core/living-world.js';
import {createOperationGuide} from './operation-guide.js';
import {createSpeechBubble} from './speech-bubble.js';
import {requestMainlineNavigation,worldNavigationObjective} from '../core/world-navigation.js';
const resourceNames={coins:'金币',wood:'木材',parts:'机械零件',crystal:'能源晶体',core:'首领核心'};
// 任务正文来自固定中文表；仍转义后插入HTML，防止未来内容表引入标签。
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// 一张紧凑任务卡、一名可交谈NPC和一本按章节展开的手册共享当前目标。
export function createMainline({game,root,renderer,dialogs,onChange,openAction,workshop,onFarm}){
 const scope=createEventScope(),frame=root.getElementById('game-frame');
 const navigationToggle=createTaskNavigation({game,root,onChange});
 const operationGuide=createOperationGuide({game,root,workshop});
 const card=root.createElement('button');card.id='mainline-hud';card.className='mainline-hud';card.hidden=true;
 card.innerHTML='<span class="mainline-bearing"><svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="20"/><path d="M22 9 32 29 22 25 12 29Z"/></svg><small></small></span><span><small class="mainline-kicker">主线 · 巡林簿</small><b></b><span class="mainline-objective"></span></span>';frame.append(card);
 const npc=root.createElement('button');npc.id='mainline-npc';npc.className='mainline-npc';npc.hidden=true;sceneHit(npc,'与巡林伙伴交谈');frame.append(npc);
 const speechUI=createSpeechBubble(root,'mainline-speech','巡林主线对白',{onAdvance:finishSpeech,onSkip:finishSpeech}),bubble=speechUI.node;
 bubble.classList.add('mainline-speech');speechUI.next.classList.add('mainline-begin');frame.append(bubble);
 const book=root.createElement('dialog');book.id='mainline-dialog';book.className='mainline-book';book.setAttribute('aria-labelledby','mainline-title');
 book.innerHTML='<header><div><small>晴叶营地</small><h2 id="mainline-title">巡林簿</h2></div><button id="mainline-close" aria-label="关闭巡林簿">×</button></header><details id="farm-lesson" class="mainline-more"></details><section id="mainline-current"></section><div class="mainline-book-actions"><button id="mainline-action" class="primary"></button><button id="mainline-pause" class="ui-button">自由探索</button><button id="mainline-map">手机地图</button></div><section id="mainline-choices" class="ui-section"></section><details class="mainline-more"><summary>旅程与装备规则</summary><p class="mainline-rule">每段旅程结束后可以自由探索，准备好再主动继续。操作教学、整备与休闲玩法均可自选，不阻挡故事推进。可提前修复设施，获得的资源和装备一直保留。任务右侧的路线箭头可开关寻路；带斜杠表示关闭，再点恢复，任务进度不会丢失。</p><div id="mainline-chapters"></div></details>';root.body.append(book);
 let farmAfterClose=false;
 const $=id=>root.getElementById(id);
 // 手册明确当前为什么行动、如何操作和交付所得；未来章节折叠，避免任务墙。
 function renderBook(){
  const lesson=farmLesson(game.progress.farm),done=lesson.every(s=>s.done);
  $('farm-lesson').innerHTML='<summary>种田备忘'+(done?' · 已完成':'')+'</summary><p>种田是主要金币来源，任务和玩法奖励照常。收成放入附近载具货舱或背包，运回小屋仓库后自动结算金币。</p><ol>'+lesson.map(s=>'<li class="'+(s.done?'done':'')+'">'+(s.done?'✓ ':'')+s.label+(!s.done?'<small> · '+s.hint+'</small>':'')+'</li>').join('')+'</ol><p>水壶每次浇灌选中的一块田，每茬一次，生长时长最多缩短25%。首次播种并浇水：胡萝卜种子 ×2，之后可继续其他委托，成熟后再收。快递站只会补充已经解锁的种子。</p><button id="farm-lesson-go">'+(done?'继续种田':'去种田')+'</button>';

  const task=mainlineTask(game),run=game.progress.mainline,o=mainlineObjective(game,{ignoreTracking:true});
  $('farm-lesson').hidden=task?.id==='first-farm';
  const steps=mainlineSteps(game),current=steps.findIndex(s=>!s.done);
  $('mainline-current').innerHTML=task?`<small>${isCampaignTask(task)?'主线':'自选体验'} · ${escape(task.chapter)}</small><h3>${escape(task.title)}</h3>${run.trackingPaused?'<p class="ui-inset">正在自由探索。任务进度已保留，准备好后再继续。</p>':''}${run.phase!=='doing'?`<p class="mainline-location">${escape(o?.label||'活动结束后继续')} · ${escape(MAINLINE_SITES[task.site].name)}</p>`:''}<ol class="mainline-checklist">${steps.map((s,i)=>`<li class="${s.done?'done':i===current?'current':''}"><span class="mainline-check" aria-label="${s.done?'已完成':i===current?'当前动作':'待完成'}">${s.done?'✓':i+1}</span><span><b>${escape(s.label)}</b>${i===current&&s.hint?`<small>${escape(s.hint)}</small>`:''}</span>${s.progress?`<small>${s.progress}</small>`:''}</li>`).join('')}</ol><div class="mainline-reward"><b>奖励</b>${Object.entries(mainlineReward(task,game.progress)).filter(([,n])=>n>0).map(([k,n])=>'<span>'+resourceNames[k]+' +'+n+'</span>').join('')}${task.seedReward?'<span>'+escape(FARM_CROPS[task.seedReward.crop].name)+'种子 ×'+task.seedReward.count+' · 直接解锁购买</span>':''}</div><details class="mainline-more"><summary>需要操作帮助？</summary>${task.lines.map(t=>'<p>'+escape(t)+'</p>').join('')}</details>${game.mainlineError?'<p role="alert">'+escape(game.mainlineError)+'</p>':''}`:'<h3>巡林簿，由你续写</h3>';

  const campaign=MAINLINE_TASKS.filter(isCampaignTask),next=campaign.find(t=>!run.completed.includes(t.id));
  // 自选列表默认折叠，只有主动点选才追踪；已完成项目保留记录但不能重复领奖。
  $('mainline-choices').innerHTML=(next&&next.id!==task?.id?`<button class="ui-button" data-mainline-select="${next.id}">继续主线 · ${escape(next.title)}</button>`:'')+'<details><summary>自选体验 · 教学、整备与休闲</summary><p>按兴趣选择，不影响主线。切换后当前步骤会保留。</p>'+MAINLINE_TASKS.filter(t=>!isCampaignTask(t)).map(t=>`<p><button class="ui-button" data-mainline-select="${t.id}" ${run.completed.includes(t.id)?'disabled':''}>${run.completed.includes(t.id)?'已完成 · ':t.id===task?.id?'当前 · ':run.suspended[t.id]?'继续 · ':''}${escape(t.title)}</button></p>`).join('')+'</details>';
  $('mainline-pause').hidden=run.trackingPaused;
  const chapters=[...new Set(campaign.map(t=>t.chapter))];
  $('mainline-chapters').innerHTML=chapters.map(ch=>`<details><summary>${escape(ch)}</summary><ol>${campaign.filter(t=>t.chapter===ch).map(t=>`<li class="${run.completed.includes(t.id)?'done':t===task?'current':''}"><b>${run.completed.includes(t.id)?'✓ ':t===task?'现在 · ':''}${escape(t.title)}</b></li>`).join('')}</ol></details>`).join('');
  const near=o&&(o.navigation===false||worldDistance(game.player,o.site)<=150&&game.mapId===o.site.mapId);
  const action=mainlineAction(game);
  $('mainline-action').textContent=run.trackingPaused&&task?'继续当前任务':trackedLivingRequest(game)?'追踪巡林主线':task&&run.phase==='doing'&&near&&action?action.label:task?'返回指引':'继续巡林';
 }
 dialogs.register('mainline-dialog',{onOpen:renderBook,focusId:'mainline-close'});
 // 正文打开当前任务的数据或操作页，保持玩家在右侧按钮选择的寻路状态。
 scope.on(card,'click',()=>{
  const visit=worldNavigationObjective(game),current=mainlineObjective(game);
  if(visit?.key==='boss-clearing'){openAction({type:'clearing',inspect:true});return;}
  // 临时访问优先于主线；远处的守门入口先显示地图，不隐式恢复寻路。
  if(visit?.key==='visit'){
   if(visit.site.mapId!==game.mapId||visit.action?.type==='camp-defense')$('phone-button').click();
   else if(visit.action)openAction({...visit.action,inspect:true});
   else $('living-menu').click();
   return;
  }
  if(current?.clearingStage){openAction({type:'clearing',inspect:true});return;}
  if(current&&current.site.mapId!==game.mapId){$('phone-button').click();return;}
  if(trackedLivingRequest(game)){$('living-menu').click();root.querySelector('[data-living-tab="board"]')?.click();return;}
  if(!openCurrentAction({inspect:true}))dialogs.open('mainline-dialog');
 });
 // 种田任务按钮恢复世界后展开农具，不在任务簿中代做农活。
 scope.on($('farm-lesson'),'click',e=>{if(e.target.closest('#farm-lesson-go')){farmAfterClose=true;dialogs.close('mainline-dialog');}});
 scope.on(book,'close',()=>{if(farmAfterClose){farmAfterClose=false;onFarm?.();}});
 scope.on($('mainline-close'),'click',()=>dialogs.close('mainline-dialog'));
 scope.on(npc,'click',event=>{if(event.detail!==0)return;if(canTalkMainline(game)){game.mainlineTalkDelay=0;updateMainline(game,0);}else dialogs.open('mainline-dialog');onChange();});
 // 到教学地点后直接进入当前动作面板；不代付、不越过任务条件。
 function openCurrentAction({inspect=false}={}){
  const task=mainlineTask(game),action=mainlineAction(game),objective=mainlineObjective(game);
  if(action?.type==='restoration'){if(book.open)dialogs.close('mainline-dialog');openAction(action);return true;}
  if(action?.type==='clearing'&&game.progress.mainline.phase==='doing'){if(book.open)dialogs.close('mainline-dialog');openAction({...action,inspect});return true;}
  if(!task||!action||game.progress.mainline.phase!=='doing'||!objective)return false;
  // 地图、角色等随身操作无需跑回 NPC；现场操作以当前步骤的落点核验距离。
  if(objective.navigation!==false&&(game.mapId!==objective.site.mapId||worldDistance(game.player,objective.site)>150))return false;
  // 农活入口先恢复世界再展开农具；反复点任务不会切换关闭工具，也不会代做田地操作。
  if(action.type==='farm'){if(book.open){farmAfterClose=true;dialogs.close('mainline-dialog');}else onFarm?.();return true;}
  const id=openAction(action);if(id&&book.open)dialogs.transferResume('mainline-dialog',id);
  if(book.open)dialogs.close('mainline-dialog');return true;
 }
 // 读完或跳过后直接打开可用操作；领取仍经过原一次性保存事务。
 function finishSpeech(){const phase=game.mainlineSpeech?.phase;if(advanceMainlineSpeech(game)&&phase==='meet')openCurrentAction();onChange();}
 // 恢复任务先保存主动选择，再执行已有地点与操作校验。
 scope.on($('mainline-pause'),'click',()=>{if(selectMainlineTask(game)){dialogs.close('mainline-dialog');onChange();}else{game.mainlineError||='请先结束当前战斗或活动。';renderBook();}});
 scope.on($('mainline-choices'),'click',e=>{const button=e.target.closest('[data-mainline-select]');if(!button)return;if(selectMainlineTask(game,button.dataset.mainlineSelect)){renderBook();onChange();}else{game.mainlineError||='请先结束当前战斗或活动。';renderBook();}});
 scope.on($('mainline-action'),'click',()=>{
  if(game.progress.mainline.trackingPaused||trackedLivingRequest(game)){
   if(!selectMainlineTask(game,mainlineTask(game)?.id)){game.mainlineError||='请先结束当前战斗或活动。';renderBook();return;}
  }else requestMainlineNavigation(game);
  if(!openCurrentAction())dialogs.close('mainline-dialog');
 });
 scope.on($('mainline-map'),'click',()=>{root.getElementById('phone-button').click();dialogs.transferResume('mainline-dialog','phone-dialog');dialogs.close('mainline-dialog');});
 // 只有实际打开操作面板才记录浏览，不把角色路过门前当作已经学会操作。
 scope.on(root,'click',event=>{
  if(event.target.closest('[data-funnel-config],[data-mechanical-config],[data-spider-config],#ws-funnel'))markMainline(game,'config');
 },true);
 // 任务卡优先显示，波次与Boss进度依次排在下方。
 function render(){
  const selected=worldNavigationObjective(game);
  // 修复前置与临时访问优先级和地面导航一致；关闭寻路仍保留当前修复任务文案。
  const main=mainlineObjective(game),priority=selected?.key==='visit'||selected?.key==='boss-clearing'||main?.restoration||main?.cottageRest;
  const request=priority?null:trackedLivingRequest(game),target=request&&livingRequestTarget(game,request);
  const o=priority?(selected||main):target?{task:request,label:target.text,site:{...target,mapId:game.mapId}}:main,dialogOpen=!!root.querySelector('dialog[open]');
  // 靠近建筑仍保留任务入口，屋顶提示通过场景取景避让任务卡。
  card.hidden=combatHudVisible(root)||clearingCombatActive(game)||!o||!!game.mainlineSpeech||dialogOpen||game.state!=='playing';
  if(!card.hidden){
   card.dataset.taskKind=['visit','boss-clearing'].includes(o.key)?'navigation':request?'living':'mainline';card.dataset.taskId=o.task.id;
   card.querySelector('.mainline-kicker').textContent=o.key==='visit'?'正在前往':o.key==='boss-clearing'?'野外任务':request?'森林邻里':isCampaignTask(o.task)?'主线':'自选体验';
   const visiting=o.key==='visit'||o.key==='boss-clearing',step=!request&&mainlineStep(game);
   card.dataset.navigationTutorial=String(step?.operation?.id==='task-navigation-toggle'&&!step.done);
   card.querySelector('b').textContent=request?o.task.title:o.label;
   card.querySelector('.mainline-objective').textContent=o.hint|| (visiting?o.site.name||o.label:request?o.label:o.phase==='doing'?[step?.progress,step?.hint].filter(Boolean).join(' · '):MAINLINE_SITES[o.task.site].name);
   // 缺资源时在战场直说采集地点；具体缺口保留在任务详情中。
   const shortage=!!step?.resourceHint&&o.phase==='doing'&&!request&&!visiting;card.dataset.resourceShortage=String(shortage);
   // 资源提示保留真实缺口或待运回状态，完整说明在任务详情中展示。
   if(shortage&&!o.restoration)card.querySelector('.mainline-objective').textContent=step.resourceHint.split('。')[0];
   const nav=target?o:worldNavigationObjective(game),bearing=storyBearing(game.player,nav?.site||o.site,85);
   card.querySelector('.mainline-bearing').hidden=!nav||!taskNavigationEnabled(game);
   card.querySelector('path').setAttribute('transform',`rotate(${bearing.angle} 22 22)`);
   card.querySelector('.mainline-bearing small').textContent=(nav?.site||o.site).mapId===game.mapId?displayMeters(bearing.distance)+'米':'跨地图';
   card.title=[o.label,card.querySelector('.mainline-objective').textContent].filter(Boolean).join(' · ');
   card.setAttribute('aria-label',o.task.title+'，'+o.label+'。点击查看任务详情或相关操作');

  }
  layoutTaskCombatHud(root);renderFrame();
 }
 // 主线对白停靠屏幕下方，不因NPC位置改动镜头。
 function renderSceneFrame(dt=0){
  renderer.profiler?.start('render.panels.mainline.navigation');
  navigationToggle.render();
  renderer.profiler?.end('render.panels.mainline.navigation');
  renderer.profiler?.start('render.panels.mainline.objective');
  const o=mainlineObjective(game),v=renderer.view,dialogOpen=!!root.querySelector('dialog[open]');
  renderer.profiler?.end('render.panels.mainline.objective');
  if(o?.restoration||o?.cottageRest){if(!bubble.hidden)bubble.hidden=true;if(!npc.hidden)npc.hidden=true;return;}
  // 短消息排在任务卡下方，避免上车、购买和波次提示被新增主线卡遮住。
  const toast=root.getElementById('toast');
  // 消息隐藏时不测量卡片；出现或可见期间仍按真实尺寸跟随，淡出期间保持最后位置。
  if(toast.classList.contains('visible')){
   const visibleHud=[card,root.getElementById('quest'),root.getElementById('boss-hud'),root.getElementById('equipment-goal')].filter(n=>!n.hidden&&n.offsetHeight);
   if(visibleHud.length){const bottom=Math.max(...visibleHud.map(n=>n.getBoundingClientRect().bottom)),top=(bottom-sceneLayout(renderer,frame).frame.top+8)+'px';if(toast.style.top!==top)toast.style.top=top;}
   else if(toast.style.top)toast.style.removeProperty('top');
  }
  // 先确定最终显隐，避免对白每帧隐藏再显示，触发全战场的 :has 样式重算。
  const speech=game.mainlineSpeech;if(!speech)speechUI.reset();
  if(clearingCombatActive(game)||!o||!v||dialogOpen||game.state!=='playing'||root.hidden||game.mapId!==MAINLINE_SITES[o.task.site].mapId||(!speech&&o.phase==='doing')){if(!bubble.hidden)bubble.hidden=true;if(!npc.hidden)npc.hidden=true;return;}
  if(bubble.hidden!==!speech)bubble.hidden=!speech;
  const actor=nearest(campTalkSite(game,o.task),game.player),{frame:r,canvas:c}=sceneLayout(renderer,frame);
  const x=(actor.x-v.x)*v.zoom+c.left-r.left,y=(actor.y-65-v.y)*v.zoom+c.top-r.top;
  if(!speech&&(x<12||x>r.width-12||y<80||y>r.height-50)){if(!npc.hidden)npc.hidden=true;return;}
  if(speech){
   if(!npc.hidden)npc.hidden=true;
   // 主线对白期间让现场邻里按钮让位，避免手机下方同时出现两种对话入口。
   for(const id of ['living-interact','living-hint']){const node=root.getElementById(id);if(node)node.hidden=true;}
   const text=speech.phase==='meet'?o.task.guide.cue:o.task.guide.thanks;
   const nextLabel=speech.phase==='report'?(o.task.seedDelivery?'交付种子并收谢礼':'收下奖励'):mainlineAction(game)?.label||'出发';
   speechUI.present({key:speech,speaker:MAINLINE_NPCS[o.task.npc].name,text,nextLabel},dt);
   dockNpcDialogue(root,bubble);bubble.dataset.speaker=MAINLINE_NPCS[o.task.npc].name;
  }else{
   const label=(o.phase==='report'?'交付 · ':'交谈 · ')+MAINLINE_NPCS[o.task.npc].name;if(npc.getAttribute('aria-label')!==label)npc.setAttribute('aria-label',label);
   placeSceneHit(npc,actor,renderer,frame,{width:56,height:82});
  }
 }
 // 先提交本帧NPC热点，再测量并定位气泡；低频刷新也保持相同顺序。
 function renderFrame(dt=0){
  renderSceneFrame(dt);
  renderer.profiler?.start('render.panels.mainline.guide');
  operationGuide.render();
  renderer.profiler?.end('render.panels.mainline.guide');
 }
 // 应用重建时释放所有节点和监听，不保留旧存档的目标。
 function dispose(){navigationToggle.dispose();scope.dispose();operationGuide.dispose();root.getElementById('toast').style.removeProperty('top');card.remove();npc.remove();speechUI.dispose();book.remove();}
 return {render,renderFrame,dispose};
}
