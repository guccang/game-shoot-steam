import {EQUIPMENT_QUESTS} from '../config/equipment-quests.js';
import {equipmentQuestCards,equipmentQuestStatus} from './equipment-quests.js';
import {canEnterEquipmentQuest,equipmentQuestDestination} from '../core/equipment-quest-entry.js';
import {requestWorldNavigation} from '../core/world-navigation.js';
import { HELP_EMBLEM } from './help-emblem.js';
import {facilityOpen,workshopFacility} from '../config/town-restoration.js';
import { i18nText, i18nHtml } from "../i18n/index.js";
import {storyCatalogRow,storyChapterHelp} from './story-catalog.js';
import {storyTypeIcon} from './story-icons.js';
import {createStoryPostMarkers} from './story-posts.js';
import {storyRewardMarkup,storyCollectionMarkup,storyCollectionHelp} from './story-rewards.js';
import {claimStoryCollection} from '../progression/story-rewards.js';
import {STORY_POSTS} from '../config/story-posts.js';
import {storyPostForChapter,canUseStoryPost} from '../core/story-posts.js';
// 多章目录与界面只发送规则意图：接取、对话、路线、整备和日志复用统一暂停归属。
import {storyDefinition,storyUnlocked,storyNode,storyText,storyTarget,storyDeliveryReady} from '../core/story-definition.js';
import {STORY_CAMPAIGN} from '../config/story-campaign.js';
import { worldDistance } from '../world/coordinates.js';
import { createEventScope } from '../platform/events.js';
import { catSprites } from '../rendering/cat-animation.js';
import { createStoryNavigation } from './story-navigation.js';
import {loadoutExperience,storyExperienceGoal,storyDialogueLines} from '../core/story-journey.js';
import {createStoryChatter} from './story-chatter.js';
import { createStorySpeech } from './story-speech.js';
import {taskCatalog} from './task-catalog.js';
import {createStoryInteraction} from './story-interaction.js';
import {storyInteractionReady,storyInteractionNear} from '../core/story-interaction.js';
import {cancelStory} from '../core/story-manager.js';
// 动态文本按普通文字插入，不把存档或错误内容解释为标记。
function escapeText(value) {return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
// 创建一个章节弹窗和一个临近交互按钮，关闭或卸载时释放所有监听。
export function createStoryPanel({game,root,dialogs,renderer,onChange,openWorkshop,onLiving}) {
  let selected=game.story?.chapterId||game.progress.story.run?.chapterId||'sunleaf-01',def=storyDefinition(selected);
  const scope=createEventScope(),menu=root.createElement('button'),dialog=root.createElement('dialog'),action=root.createElement('button');
  menu.id='story-button';menu.setAttribute('aria-label','任务簿：主线、故事与邻里委托');menu.setAttribute('aria-haspopup','dialog');
  menu.innerHTML=`<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="11" width="38" height="28" rx="5" fill="#f4e7b9" stroke="#3e6250" stroke-width="3"/><path d="m7 14 17 13 17-13" fill="none" stroke="#698c66" stroke-width="3"/></svg><span>${i18nHtml("ui.story-catalog.4c2c5762d3")}</span>`;
  menu.querySelector('span').textContent='任务';root.getElementById('field-menu-items').prepend(menu);
  dialog.id='story-dialog';dialog.className='story-dialog ui-panel ui-page';dialog.setAttribute('aria-labelledby','story-title');
  // 保留标题关闭与正文的阶段操作，移除重复返回底栏，腾出手机阅读空间。
  dialog.innerHTML=`<header class="story-heading ui-panel__header"><div><small>${escapeText(def.subtitle)}</small><h2 id="story-title">${escapeText(def.title)}</h2></div><button id="story-close" class="ui-close" aria-label="${i18nHtml("ui.story.8710472746")}">×</button></header><div id="story-content" class="ui-panel__body"></div>`;
  root.body.append(dialog);action.id='story-interact';action.className='story-interact';action.hidden=true;root.getElementById('game').after(action);
  // 退出操作固定在底栏，短屏不必滚到任务正文末尾；取消须在本页确认。
  const taskActions=root.createElement('footer');taskActions.className='ui-panel__footer';taskActions.id='story-task-actions';taskActions.hidden=true;dialog.append(taskActions);
  let signature='',autoKey='',view='main',notice='',postId=null;
  const postMarkers=createStoryPostMarkers({game,root,renderer,open});
  const navigation=createStoryNavigation(root);
  const speech=createStorySpeech({game,root,renderer,onChange});
  const chatter=createStoryChatter({game,root,renderer});
  const interaction=createStoryInteraction({game,root,renderer,button:action});
  const experience=root.createElement('small');experience.id='story-experience';experience.className='story-experience';experience.hidden=true;
  root.getElementById('quest').append(experience);
  // 安全准备页展示三套借用装备；详细倍率留在开发配置，玩家看到打法和代价。
  function cards() {return '<div class="story-loadouts">'+def.loadouts.map((l,i)=>`<button data-story-loadout="${l.id}" class="story-loadout ${game.story.loadoutId===l.id?'selected':''}" aria-pressed="${game.story.loadoutId===l.id}"><span class="story-number">0${i+1}</span><strong>${escapeText(l.choice||l.name)}</strong><span>${escapeText(l.name)} · ${escapeText(l.text)}</span><small>${l.hint}</small></button>`).join('')+'</div>';}
  // 内容只在语义状态变更时重建，避免打断滚动和键盘焦点。
  function content() {
    def=storyDefinition(game.story?.chapterId||selected);
    const r=game.story,node=storyNode(game),panel=node?.panel,record=game.progress.story.chapters[def.id],completed=record.completed;
    let html='';
    if(!r){
      const post=storyPostForChapter(game,def.id,postId),near=canUseStoryPost(game,post)||canEnterEquipmentQuest(game,def.id,postId);
      const local=STORY_POSTS.find(p=>p.id===postId),tasks=taskCatalog(game);
      const catalog=(local?local.chapters.map(id=>STORY_CAMPAIGN[id]):Object.values(STORY_CAMPAIGN)).filter(c=>!c.id.startsWith('equipment-')&&!tasks.neighbors.some(q=>q.id===c.id));
      html=`${storyCollectionMarkup(game.progress,local||post,near)}<details class="story-catalog" data-story-disclosure="catalog" open><summary>查看森林故事目录</summary><nav class="story-chapters" aria-label="森林故事目录">`+catalog.map(c=>storyCatalogRow(c,game.progress,def.id,storyUnlocked(game.progress,c.id))).join('')+'</nav></details>';
      const equipmentQuest=EQUIPMENT_QUESTS.find(q=>q.chapter===def.id);
      if(equipmentQuest){const status=equipmentQuestStatus(game.progress,equipmentQuest);html+=`<section class="ui-section"><h3>工坊购买条件</h3><p>${escapeText(status.text)}</p><p>${equipmentQuest.requires.length?'本章承接前一战的战果，按主线顺序接取。':'本任务可独立接取。'}完成交付后开放购买，金币与材料另付。</p>${status.target!==def.id?`<button data-equipment-current="${status.target}">${escapeText(status.action)}</button>`:!status.ready&&!near?`<button data-equipment-navigate="${def.id}">追踪委托人</button>`:''}</section>`;}
      if(game.progress.story.run)html+=`<p class="story-note">${i18nHtml("ui.story.c56eb70924")}</p>`;
      html+=`<section class="story-selection" data-selected-story="${def.id}"><div class="story-selection-heading">${storyTypeIcon(def.catalogType)}<h3>${escapeText(def.title)}</h3><button data-story-help="chapter" aria-label="${i18nHtml("ui.story.1c8f9513f9")}" class="story-help-button" aria-haspopup="dialog">${HELP_EMBLEM}</button></div><p class="story-selection-lead">${escapeText(def.ui.lead)}</p>${storyRewardMarkup(def,record)}<button class="story-primary" data-story-command="enter" ${near&&storyUnlocked(game.progress,def.id)&&(!game.progress.story.run||game.progress.story.run.chapterId===def.id)?'':'disabled'}>${game.progress.story.run?i18nText("ui.story.7b030bf85b"):completed?i18nText("ui.story.6c9fcbd074"):def.catalogType==='commission'?i18nText("ui.story.efc4dfab8c"):i18nText("ui.story.960488b307")}</button>${near?'':`<p class="story-note">${escapeText(post?i18nText("ui.story.d346c0b5e3", { p0: (post.name) }):i18nText("ui.story.e06813eeb0"))}</p>`}</section>`;
      if(completed&&record.followupLoadout&&!record.followupDismissed){const f=def.journey.followup;
        html+=`<section class="story-followup"><h3>${escapeText(f.title)}</h3><div class="story-actions"><button data-story-workshop="weapons">${escapeText(f.weapon)}</button><button data-story-workshop="vehicle">${escapeText(f.vehicle)}</button><button data-story-command="dismiss-followup">${escapeText(f.dismiss)}</button></div></section>`;}
      if(game.progress.story.invalidRun)html+=`<p role="status">${i18nHtml("ui.story.16f5756af0")}</p>`;
      // 同一目录呈现三类任务，邻里只显示常驻请求，不再列一份过期的章节接取状态。
      const current=tasks.current;
      const overview=`<section class="story-task-overview"><small>当前追踪</small><h3>${escapeText(current?.title||'自由巡林')}</h3><p>${escapeText(current?.text||'沿路看看邻居的新消息。')}</p>${current?`<button data-task-panel="${tasks.neighbors.some(q=>q.tracked)?'living':'mainline'}">查看当前任务</button>`:''}</section>`;
      const mainline=`<section class="story-task-group"><h3>巡林主线</h3><p>${escapeText(tasks.mainline?.title||'巡林主线已完成')}</p><button data-task-panel="mainline">打开巡林簿</button></section>`;
      const neighbors='<section class="story-task-group"><h3>邻里委托</h3><p>已领取的请求会保留；需要时到邻里面板切换追踪。</p>'+tasks.neighbors.map(q=>`<button class="story-neighbor-row" data-task-panel="living" data-task-request="${q.id}"><b>${escapeText(q.title)}</b><small>${q.state}</small><span>${escapeText(q.text)}</span></button>`).join('')+'</section>';
      html=overview+mainline+neighbors+'<details class="story-task-group"><summary>装备故事 · 工坊购买资格</summary>'+equipmentQuestCards(game.progress)+'</details>'+'<h3 class="story-task-heading">森林故事</h3>'+html;
    }else if(view==='log'){
      html=`<h3>${i18nHtml("ui.story.48268cbb55")}</h3><p>${node.title}</p>`+r.readLines.map(k=>`<section class="story-log">${storyDialogueLines(r,k).map(([who,line])=>`<p><b>${escapeText(who)}</b> ${escapeText(line)}</p>`).join('')}</section>`).join('');
      html+=Object.entries(def.journey.experiences).filter(([id])=>r.experiences?.[id]).map(([,e])=>`<p>✓ ${escapeText(e.success)}</p>`).join('');
      if(!r.readLines.length)html+=`<p>${i18nHtml("ui.story.0af8e86934")}</p>`;
      html+=`<button data-story-command="back">${i18nHtml("ui.story.f093d5761d")}</button>`;
    }else if(r.dialogue){
      html=`<p>${i18nHtml("ui.story.55fb9fe5ef")}</p><button class="story-primary" data-story-command="resume">${i18nHtml("ui.story.f692fc50d7")}</button>`;
    }else if(r.phase==='prepare'&&panel?.type==='choice'){
      html=`<h3>${escapeText(panel.title)}</h3><p>${escapeText(panel.text)}</p><div class="story-actions">`+def.choices[node.choice].map(o=>`<button data-story-option="${o.id}">${escapeText(o.label)}</button>`).join('')+'</div>';
    }else if(r.phase==='prepare'&&panel?.type==='excursion'){
      html=`<h3>${escapeText(panel.title)}</h3><p>${escapeText(panel.text)}</p><p>${i18nHtml("ui.story.60cb7b18e2")}</p><button class="story-primary" data-story-command="excursion">${escapeText(panel.button)}</button>`;
    }else if(r.phase==='failed'){
      html=`<h3>${i18nHtml("ui.story.04220e863b")}</h3><p>${escapeText(r.error)}</p><p>${i18nHtml("ui.story.eadbe7e9b8")}</p>${r.metrics.deaths>=3?`<p>${escapeText(def.ui.failureHint)}</p>`:''}<button class="story-primary" data-story-command="retry">${i18nHtml("ui.story.33cd21f457")}</button>`;
    }else if(r.phase==='prepare'&&panel?.type==='loadout'){
      html=`<h3>${escapeText(panel.title)}</h3><p>${i18nHtml("ui.story.49e5962640")}</p>${cards()}<div class="story-actions"><button class="story-primary" data-story-command="start" ${r.loadoutId?'':'disabled'}>${escapeText(panel.button)}</button></div>`;
      if(r.loadoutId)html+=`<p class="story-advice">${escapeText(loadoutExperience(r)?.[1].advice||'')}</p>`;
      if(node.trial)html+=`<details class="story-training"><summary>${i18nHtml("ui.story.ef514d8e87")}</summary><p>${i18nHtml("ui.story.a581131316", { p0: (def.trial.duration) })}</p><div class="story-actions">${Object.entries(def.trial.scenes).map(([id,{label}])=>`<button data-story-trial="${id}" ${r.loadoutId?'':'disabled'}>${label}</button>`).join('')}</div></details>`;
    }else if(panel?.type==='claim'&&r.phase==='prepare'){
      html=`<h3>${escapeText(panel.title)}</h3><p>${escapeText(panel.text)}</p>${storyRewardMarkup(def,record)}<button class="story-primary" data-story-command="claim">${record.rewardClaimed?i18nText("ui.story.8b82b847a1"):escapeText(panel.button)}</button>`;
    }else{
      html=`<h3>${node.title}</h3><p>${game.storyObjective().label}</p><button class="story-primary" data-story-command="resume">${i18nHtml("ui.panels.realms.25aa5ece41")}</button>`;
    }
    if(r)html+=`<div class="story-footer"><button data-story-command="log">${i18nHtml("ui.story.48268cbb55")}</button><button class="story-help-button" data-story-help="chapter" aria-label="${i18nHtml("ui.story.1c8f9513f9")}">${HELP_EMBLEM}</button></div>`;
    if(view==='cancel-confirm')html='<h3>取消当前章节任务？</h3><p>本次未交付进度将清空，借用装备会归还。已获得的奖励和已完成章节保持不变。</p><p>之后可以回到接取驿牌重新开始。</p>';
    if(r?.error||notice)html+=`<p role="status" class="story-error">${escapeText(notice||r.error)}</p>`;
    return html;
  }
  // 统一打开与刷新内容，既有弹窗拥有暂停时不抢走其恢复资格。
  function open(post=null) {if(!game.story&&!facilityOpen(game.progress,post?.id==='monster-neighbors'?'neighbors':'story')){game.requestFacility?.(post?.id==='monster-neighbors'?'neighbors':'story');return;}if(post?.id==='monster-neighbors'&&!game.story){onLiving?.();return;}postId=post?.id||null;
    if(post&&!game.story){const pending=game.progress.story.run?.chapterId;
      selected=post.chapters.includes(pending)?pending:post.chapters.find(id=>storyUnlocked(game.progress,id)&&!game.progress.story.chapters[id].completed)||post.chapters[0];}
    view='main';signature='';paint();dialogs.open('story-dialog');}
  function paint() {
    const html=content();
    const pending=game.story||game.progress.story.run;
    taskActions.hidden=!pending;
    // 选车准备阶段只保留取消任务，避免整备时误触暂离章节。
    const choosingLoadout=game.story?.phase==='prepare'&&storyNode(game)?.panel?.type==='loadout';
    const actions=!pending?'':view==='cancel-confirm'?'<button class="ui-button" data-story-command="back">继续任务</button><button class="ui-button ui-button--danger" data-story-command="confirm-cancel">确认取消任务</button>':`${game.story&&!choosingLoadout?'<button class="ui-button" data-story-command="leave">暂离章节</button>':''}<button class="ui-button" data-story-command="cancel">取消任务</button>`;
    if(taskActions.innerHTML!==actions)taskActions.innerHTML=actions;
    root.getElementById('story-title').textContent=game.story?def.title:'任务簿';
    dialog.querySelector('.story-heading small').textContent=game.story?def.subtitle:'巡林主线 · 森林故事 · 邻里委托';
    dialog.dataset.view=game.story?'session':'catalog';
    if(html!==signature){
      // 切换条目保持滚动、目录展开状态和键盘焦点，不回到赠礼区顶部。
      const body=root.getElementById('story-content'),scroll=body.scrollTop,focus=root.activeElement?.dataset.storyChapter;
      const disclosures=[...dialog.querySelectorAll('[data-story-disclosure]')].map(n=>[n.dataset.storyDisclosure,n.open]);
      root.getElementById('story-content').innerHTML=html;signature=html;
      // 操作按钮统一材质，任务列表仍保持轻薄、左对齐的整行选择结构。
      for(const button of body.querySelectorAll('button')){
        button.classList.add('ui-button');
        if(button.classList.contains('story-primary'))button.classList.add('ui-button--primary');
        if(button.matches('.story-neighbor-row,[data-story-chapter],.story-loadout'))button.classList.add('ui-choice');
      }
      for(const [key,expanded] of disclosures){const node=[...dialog.querySelectorAll('[data-story-disclosure]')].find(n=>n.dataset.storyDisclosure===key);if(node)node.open=expanded;}
      if(focus)dialog.querySelector(`[data-story-chapter="${focus}"]`)?.focus({preventScroll:true});
      body.scrollTop=scroll;
    }
  }
  // 二级说明沿用统一弹窗暂停归属，关闭后回到原按钮与滚动位置。
  const help=root.createElement('dialog');help.id='story-help-dialog';help.className='story-dialog story-help-dialog ui-panel ui-page';help.setAttribute('aria-labelledby','story-help-title');
  help.innerHTML=`<header class="story-heading ui-panel__header"><h2 id="story-help-title">${i18nHtml("ui.story.9c233c0310")}</h2><button id="story-help-close" class="ui-close" aria-label="${i18nHtml("ui.story.c4b1ec646c")}">×</button></header><div id="story-help-content" class="ui-panel__body"></div>`;
  root.body.append(help);let helpMode='chapter';
  dialogs.register('story-help-dialog',{focusId:'story-help-close',onOpen:()=>{
    const post=STORY_POSTS.find(p=>p.id===postId)||storyPostForChapter(game,def.id);
    root.getElementById('story-help-title').textContent=helpMode==='collection'?i18nText("ui.story-rewards.962eb82e69"):def.title;
    root.getElementById('story-help-content').innerHTML=helpMode==='collection'?storyCollectionHelp(game.progress,post,canUseStoryPost(game,post)):storyChapterHelp(def,game.progress.story.chapters[def.id]);
  }});
  scope.on(root.getElementById('story-help-close'),'click',()=>dialogs.close('story-help-dialog'));
  // 新一次打开回到目录起点，同一次打开期间的内容刷新保持正文滚动位置。
  dialogs.register('story-dialog',{onOpen:()=>{paint();root.getElementById('story-content').scrollTop=0;},focusId:'story-close'});
  scope.on(menu,'click',()=>open());scope.on(root.getElementById('story-close'),'click',()=>dialogs.close('story-dialog'));
  // 故事任务与领主阶段正文均可查看本章数据，内嵌操作不会额外打开任务簿。
  for(const id of ['quest','boss-hud'])scope.on(root.getElementById(id),'click',event=>{
    if(game.story&&!event.target.closest('button,a,input,summary'))open();
  });
  // 结束弹窗恢复归属后再执行阶段跳转，避免关闭回调重新启动已冻结森林。
  function perform(fn) {const resume=dialogs.willResume('story-dialog');dialogs.cancelResume();dialogs.close('story-dialog');notice='';try{fn(resume);}catch(error){notice=error.message;open();}onChange();}
  scope.on(dialog,'click',event=>{
    const node=event.target.closest('button');if(!node||node.disabled)return;
    if(node.dataset.equipmentStory){selected=node.dataset.equipmentStory;postId=null;paint();root.querySelector('[data-selected-story]')?.scrollIntoView({block:'nearest'});return;}
    if(node.dataset.equipmentCurrent){selected=node.dataset.equipmentCurrent;postId=null;paint();return;}
    if(node.dataset.equipmentNavigate){const target=equipmentQuestDestination(game,node.dataset.equipmentNavigate);if(target){requestWorldNavigation(game,target,'去找'+target.name);dialogs.close('story-dialog');}return;}
    if(node.dataset.taskPanel){
      const destination=node.dataset.taskPanel==='mainline'?'mainline-dialog':'living-dialog';
      if(destination==='mainline-dialog')dialogs.open(destination);
      else{onLiving?.();root.querySelector('[data-living-tab="board"]')?.click();}
      dialogs.transferResume('story-dialog',destination);dialogs.close('story-dialog');return;
    }
    if(node.dataset.storyHelp){helpMode=node.dataset.storyHelp;dialogs.open('story-help-dialog');return;}
    if(node.dataset.storyPrize){notice=claimStoryCollection(game,node.dataset.storyBoard,node.dataset.storyPrize).message;onChange();paint();return;}
    if(node.dataset.storyChapter){selected=node.dataset.storyChapter;paint();return;}
    if(node.dataset.storyOption){perform(()=>game.chooseStoryOption(node.dataset.storyOption));return;}
    if(node.dataset.storyWorkshop){
      const record=game.progress.story.chapters[def.id],spec=def.loadouts.find(l=>l.id===record.followupLoadout);
      if(!game.story&&record.completed&&spec&&openWorkshop){const kind=node.dataset.storyWorkshop;
        openWorkshop(kind,kind==='vehicle'?spec.vehicle:spec.weapon);dialogs.transferResume('story-dialog','workshop-dialog');dialogs.close('story-dialog');}return;
    }
    if(node.dataset.storyCommand==='dismiss-followup'){game.progress.story.chapters[def.id].followupDismissed=true;game.onEvent('story-change');paint();return;}
    if(node.dataset.storyLoadout){game.chooseStoryLoadout(node.dataset.storyLoadout);paint();return;}
    if(node.dataset.storyRoute){perform(()=>game.chooseStoryRoute(node.dataset.storyRoute));return;}
    if(node.dataset.storyTrial){perform(()=>game.startStoryTrial(node.dataset.storyTrial));return;}
    const command=node.dataset.storyCommand;
    if(command==='cancel'){view='cancel-confirm';notice='';paint();root.getElementById('story-content').scrollTop=0;taskActions.querySelector('[data-story-command="back"]').focus();return;}
    if(command==='confirm-cancel'){
      const active=!!game.story,result=cancelStory(game);
      if(!result.ok){notice=result.message;paint();return;}
      if(active)dialogs.cancelResume();dialogs.close('story-dialog');view='main';notice='';onChange();return;
    }
    if(command==='enter'&&def.id.startsWith('neighbors-')&&!game.story){onLiving?.();dialogs.transferResume('story-dialog','living-dialog');dialogs.close('story-dialog');return;}
    if(command==='log'){view='log';paint();return;}if(command==='back'){view='main';paint();return;}
    const commands={excursion:()=>game.startStoryExcursion(),enter:()=>{if(catSprites.status!=='ready')throw Error(i18nText("ui.story.728f262f38"));game.enterStory(def.id,postId);},
      start:()=>game.startStoryStage(),retry:()=>game.retryStory(),leave:()=>game.leaveStory(),
      // 成功后仅由奖励队列展示结算；保存失败才回到原领取页，保留错误与重试入口。
      claim:(resume)=>{if(!game.claimStory()&&game.story){
        // 失败重开必须重新取得暂停归属，关闭领取页后仍能在营地行走。
        if(resume&&storyDeliveryReady(game)&&game.state==='paused')game.pause();open();
      }},resume:()=>{if(game.story?.phase==='active')game.state='playing';}};
    if(commands[command])perform(commands[command]);
  });
  // 临近目标的按钮和E键提交同一交互规则，不允许远距离领取。
  function interact() {if(game.story?.trial)perform(()=>game.stopStoryTrial());else if(game.story){if(['prepare','failed','dialogue'].includes(game.story.phase))open();else game.interactStory();}else open();}
  scope.on(action,'click',event=>{if((event.detail===0||game.state==='story')&&!action.disabled&&!root.querySelector('dialog[open]')&&storyInteractionReady(game))interact();});
  scope.on(root,'keydown',event=>{if(root.getElementById('game-frame').dataset.page!=='title'&&event.code==='KeyE'&&!event.repeat&&!root.querySelector('dialog[open]')&&!action.hidden&&!action.disabled&&storyInteractionReady(game)){event.preventDefault();interact();}});
  // 章节HUD只覆盖当前目标，其他生命/供给仪表仍读取正式战斗快照。
  function render() {
    // 查看当地委托时不被另一块板的暂离章节抢回选中项与标题。
    if(game.story)selected=game.story.chapterId;
    else if(game.progress.story.run&&(!postId||STORY_POSTS.find(p=>p.id===postId)?.chapters.includes(game.progress.story.run.chapterId)))selected=game.progress.story.run.chapterId;
    def=storyDefinition(selected);
    const r=game.story,node=storyNode(game),o=game.storyObjective(),site=def.world.sites[o.site],near=r?storyInteractionNear(game):worldDistance(game.player,site)<=def.interaction.radius;
    root.getElementById('game-frame').classList.toggle('story-active',!!r);
    root.getElementById('boss-button').hidden=!!r||!!game.realm;
    if(r){
      root.getElementById('quest').hidden=!!game.boss;root.getElementById('quest').classList.remove('incoming');
      root.getElementById('quest-title').textContent=r.trial?def.trial.title:node.title;
      root.getElementById('quest-detail').textContent=r.trial?def.trial.detail:`${near?i18nText("ui.story-navigation.c6ffca86a5"):i18nText("ui.story-navigation.78ee8b51a9")} · ${o.label}`;
      const hud=node.hud,target=storyTarget(game);
      if(hud?.type==='defense')root.getElementById('quest-detail').textContent=r.repair>0?storyText(hud.repair,{seconds:Math.ceil(r.repair)}):
        `${hud.lanes[r.group||0]} · ${r.combat?.spawned===0?storyText(hud.countdown,{seconds:Math.ceil(r.combat.timer)}):hud.active}`;
      if(hud?.type==='text')root.getElementById('quest-detail').textContent=hud.detail;
      if(r.trial)root.getElementById('quest-detail').textContent=storyText(def.trial.hints[r.loadoutId]||def.trial.defaultHint,r.metrics);
      root.getElementById('quest-count').textContent=hud?.count?storyText(hud.count,{hp:Math.ceil(target?.hp??def.targets[node.target].hp)}):r.combat?`${r.combat.spawned-game.enemies.filter(e=>e.hp>0).length}/${r.combat.total}`:'';
      // 紧凑两行优先展示发现提醒，完整任务说明仍保留在标题提示中。
      root.getElementById('quest-title').title=root.getElementById('quest-title').textContent+' · '+root.getElementById('quest-detail').textContent;
      root.getElementById('wave-label').textContent=hud?.wave||def.ui.wave;root.getElementById('boss-button').disabled=true;
      const key=`${r.runId}:${r.stageId}:${r.phase}:${r.dialogue||''}`;
      // 其他菜单挡住交付时保留待打开状态，不能提前消费这次自动展示机会。
      if(key!==autoKey&&['prepare','failed'].includes(r.phase)){
        if(!root.hidden&&root.getElementById('game-frame').dataset.page!=='title'&&!root.querySelector('dialog[open]')){autoKey=key;open();}
      }else if(!['prepare','failed'].includes(r.phase))autoKey=key;
    }else {autoKey='';root.getElementById('quest-title').removeAttribute('title');}
    const goal=storyExperienceGoal(game);
    experience.hidden=!goal||!r||r.phase!=='active'||game.state!=='playing'||!!root.querySelector('dialog[open]');
    if(goal){const host=root.getElementById(game.boss?'boss-hud':'quest');if(experience.parentElement!==host)host.append(experience);
      experience.textContent=i18nText("ui.story.experience", { p0: goal.done ? '✓ ' : i18nText("ui.story.71c10bdab9"), p1: goal.text });experience.title=experience.textContent;experience.dataset.done=String(goal.done);}
    navigation.render(game,o);
    if(dialog.open)paint();
  }
  // 释放动态元素；注册弹窗由统一管理器在应用销毁时撤销。
  function dispose(){scope.dispose();speech.dispose();chatter.dispose();experience.remove();navigation.dispose();postMarkers.dispose();menu.remove();dialog.remove();help.remove();action.remove();}
  // 长对白与非暂停反馈分开投影；短气泡绝不向剧情镜头提交布局。
  function renderFrame(dt){speech.renderFrame(dt);chatter.renderFrame();postMarkers.renderFrame();interaction.renderFrame();}
  // 从工坊或邻里查看指定故事，不接取、不追踪、不改写完成记录。
  function openEquipment(id){if(!EQUIPMENT_QUESTS.some(q=>q.chapter===id))return;selected=id;postId=null;open();root.querySelector('[data-selected-story]')?.scrollIntoView({block:'nearest'});}
  return {render,open,openEquipment,dispose,renderFrame};
}
