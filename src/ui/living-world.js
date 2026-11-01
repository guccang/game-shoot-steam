import {hearTreasureRumor} from '../core/treasure.js';
import {livingInteractionPosition} from '../core/living-world.js';
import {equipmentQuestCards} from './equipment-quests.js';
import {EQUIPMENT_QUESTS,equipmentStoryCompleted} from '../config/equipment-quests.js';
import {focusedResidentRequest,visibleResidentRequests} from './living-request-view.js';
import {facilityOpen,workshopFacility} from '../config/town-restoration.js';
import {dockNpcDialogue} from './npc-dialogue-layout.js';
import {sceneHit,placeSceneHit} from './scene-hit.js';
import {GAMEPLAY_VALUES} from '../config/gameplay-values.js';
// 邻里目录与委托交接共用手机任务页，普通闲聊保留底部对白，暂停与任务事务共用正式入口。
import {LIVING_REQUESTS,RESIDENTS,LIVING_PLACES,LIVING_ACTION_NAMES,SEASON_WORK,MAIN_LIVING_RESULTS} from '../config/living-world.js';
import {calendarView,livingSeasonDays} from '../world/living-calendar.js';
import {livingForest,livingSafePoint} from '../world/living-spaces.js';
import {livingResidents,residentInteraction,residentFor,residentLine,acceptLivingRequest,interactLivingRequest,livingRequestTarget,nearbyLivingInteraction,restLivingWorld} from '../core/living-world.js';
import {worldDistance} from '../world/coordinates.js';
import {nearbyStoryPost} from '../core/story-posts.js';
import {claimStoryCollection} from '../progression/story-rewards.js';
import {storyCollectionMarkup} from './story-rewards.js';
import {STORY_POSTS} from '../config/story-posts.js';
import {createEventScope} from '../platform/events.js';
import {trackedLivingRequest} from '../core/task-tracking.js';
import {trackLivingRequest} from '../core/living-world.js';
import {createResidentChatter} from './resident-chatter.js';
import {requestWorldNavigation} from '../core/world-navigation.js';
import {clearingSite} from '../progression/clearing-site.js';
import {mainlineTask} from '../core/mainline-manager.js';
// 文本既包括存档日志也包括配置内容，统一转义后插入。
function escape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
// 创建可卸载的生活面板，日常世界不另开章节会话。
export function createLivingPanel({game,root,dialogs,onChange,environment,onRest,onClearing,renderer,onEquipmentStory}){
  const scope=createEventScope(),dialog=root.createElement('dialog'),menu=root.createElement('button'),action=root.createElement('button'),hint=root.createElement('div');
  dialog.id='living-dialog';dialog.className='living-dialog';dialog.setAttribute('aria-labelledby','living-title');
  dialog.innerHTML='<header><div><small id="living-date"></small><h2 id="living-title">森林邻里</h2></div><button id="living-close" class="ui-close" aria-label="关闭邻里面板">×</button></header><div id="living-content"></div>';
  menu.id='living-menu';menu.setAttribute('aria-haspopup','dialog');menu.innerHTML='<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 23 24 6 43 23M10 20v22h28V20" fill="#e9dba5" stroke="#426449" stroke-width="3"/><path d="M20 42V28h9v14" fill="#91b58b" stroke="#426449" stroke-width="2"/></svg><span>邻里</span>';
  action.id='living-interact';action.className='living-interact';action.hidden=true;
  hint.id='living-hint';hint.className='living-hint';hint.hidden=true;
  root.body.append(dialog);root.getElementById('field-menu-items').prepend(menu);root.getElementById('game-frame').append(action,hint);
  const chatter=createResidentChatter({game,root,renderer}),residentNodes=new Map(),frame=root.getElementById('game-frame');
  sceneHit(action,'继续现场请求');
  let rumor='',view='board',person=null,notice='',target=null,signature='',handoffKey='',taskPanel=false,focusId=null,noticeError=false;
  // 只在语义内容改变时更新，保留焦点和窄屏滚动位置。
  function render(){
    if(!dialog.open)return;
    const state=game.progress.living,calendar=calendarView(state.calendar),residents=livingResidents(game),post=nearbyStoryPost(game),near=!!post;
    const ordered=visibleResidentRequests(game,person,focusId);
    root.getElementById('living-date').textContent=person?(focusId?'当前委托':'正在交谈'):calendar.label;
    let html=person?'':'<nav class="living-tabs" aria-label="邻里记录">'+[['board','帮个忙'],['equipment','装备故事'],['news','找邻居'],['replies','回信']].map(([id,label])=>`<button data-living-tab="${id}" aria-pressed="${view===id}">${label}</button>`).join('')+'</nav>';
    if(!person)html+=`<section class="living-clearing"><button id="living-patrol">${state.patrolActive?'清缴已接取 · 去告示牌管理':'Boss 清缴 · 去告示牌接取'}</button>${state.patrolActive?'<button data-living-clearing>前往清缴场</button>':''}</section>`;
    if(person&&rumor)html+=`<p class="living-notice">${escape(rumor)}</p>`;
    if(notice&&(!focusId||noticeError))html+=`<p class="living-notice" role="status">${escape(notice)}</p>`;
    root.getElementById('living-title').textContent=person?residentFor(game,person)?.name||'邻居':'森林邻里';
    // 正在阅读现场回应时，不再接上一段无关闲聊，保留这次交谈的情绪与指向。
    if(person&&!notice&&!ordered.length){const resident=residentFor(game,person);if(resident)html+=`<section class="living-conversation"><h3>${escape(resident.name)} · ${LIVING_ACTION_NAMES[resident.moving?'walk':resident.action]}</h3><p>${escape(residentLine(game,resident))}</p><small>${escape(resident.job)} · ${escape(resident.relation)}</small></section>`;}
    if(view==='board'){
      if(!person)html+='<p class="living-intro">去见见邻居，帮一件小事。故事就发生在路上。</p>';
      for(const spec of ordered){
        const q=state.requests[spec.id],host=residentFor(game,spec.host),locked=spec.requires.some(id=>!state.requests[id].completed);
        const canAccept=(near||host&&worldDistance(livingInteractionPosition(game),host)<110)&&!locked,t=livingRequestTarget(game,spec),accepted=q.stage>=0;
        const names={coins:'金币',wood:'木材',parts:'零件',crystal:'晶体',core:'核心'};
        html+=`<article data-living-request="${spec.id}" class="living-request ${accepted?'living-current':''}"><div class="living-task-meta"><small>${q.completed?'已完成':accepted?'正在帮忙':escape(host?.name||'邻居')+'想请你帮忙'}</small>${accepted&&!q.completed?`<small>第 ${q.stage+1} / ${spec.steps.length} 步</small>`:''}</div><h3>${escape(spec.title)}</h3>`;
        if(accepted&&!q.completed)html+=`<div class="living-task-goal"><small>当前目标</small><strong>${escape(t?.text)}</strong></div>`;
        else if(!q.completed)html+=`<p>${escape(spec.lead)}</p>`;
        if(notice&&focusId===spec.id&&!noticeError)html+=q.completed?`<p class="living-notice" role="status">${escape(notice)}</p>`:`<details class="living-response"><summary>邻居的回应</summary><p>${escape(notice)}</p></details>`;
        html+=`<details class="living-reward-details"><summary>${q.completed?'任务奖励':'完成奖励'}</summary><div class="living-pay">${Object.entries(spec.reward).map(([key,n])=>`<span>${names[key]} +${n}</span>`).join('')}</div></details>`;
        if(q.completed){/* 完成页只保留右上角关闭，不出现下一委托操作。 */}
        else if(accepted){
          const close=t&&worldDistance(livingInteractionPosition(game),t)<110;
          html+=`<button class="primary" ${close?`data-living-do="${spec.id}"`:`data-living-track="${spec.id}"`}>${close?'在这里继续':'带我过去'}</button>`;
        }else if(locked)html+='<small>先完成送饭与夜班请求，大家再一起筹备集市。</small>';
        else html+=canAccept?`<button class="primary" data-living-accept="${spec.id}">接下请求</button>`:`<button data-living-visit="${spec.host}">去找${escape(host?.name||'邻居')}</button>`;
        html+='</article>';
      }
      // 节点回应已说明下一步或收束心意，不用“没有事”打断刚刚交代的请求。
      if(!ordered.length&&!notice)html+='<p>今天没有要托你办的事，路上慢慢逛。</p>';
      const board=STORY_POSTS.find(p=>p.id==='monster-neighbors'),completed=LIVING_REQUESTS.filter(spec=>state.requests[spec.id].completed).length;
      if(!person)html+=`<details class="living-gift" ${completed===LIVING_REQUESTS.length?'open':''}><summary>邻居的谢礼 · ${completed}/${LIVING_REQUESTS.length} 件事办妥</summary>${storyCollectionMarkup(game.progress,board,post?.id===board.id)}${post?.id!==board.id?'<button data-living-board>去委托板领取</button>':''}</details>`;
      if(!person&&mainlineTask(game))html+='<details class="living-archive"><summary>我的巡林目标</summary><button data-living-mainline>追踪巡林主线</button></details>';
      if(person)html+=equipmentQuestCards(game.progress,person);
    }else if(view==='equipment'){
      html+='<p>帮助邻居、免费借装体验，交付后开放工坊购买。金币与材料另付。</p>'+equipmentQuestCards(game.progress);
    }else if(view==='news'){
      html+=`<p>${escape(SEASON_WORK[calendar.seasonIndex])}</p><p>${calendar.market?'今天是集市日，白昼和黄昏都能遇见邻居。':`还有${livingSeasonDays()-calendar.seasonDay}天到集市日。`}</p>`;
      html+=residents.map(r=>`<article class="living-request"><h3>${escape(r.name)} · ${LIVING_ACTION_NAMES[r.moving?'walk':r.action]}</h3><p>${escape(r.relation)}</p><small>惦记的事：${escape(r.wish)}</small><button data-living-visit="${r.id}">去找${escape(r.name)}</button></article>`).join('');
      html+='<details><summary>森林里的往来</summary><p>道路、渡口、巡护灯和中继站曾把聚落连在一起。如今旧设备需要修理，信件和药箱仍每天出发。晴叶提供补给与维修，邻里交换食物与手艺，哨站守着道路和夜里的消息。</p></details>';
    }else if(view==='replies'){
      const done=LIVING_REQUESTS.filter(q=>state.requests[q.id].completed);html+=done.length?done.map(q=>`<article class="living-request"><h3>${escape(q.title)}</h3><p>${escape(q.reply)}</p></article>`).join(''):'<p>还没有收到回信。邻居们的事情，慢慢来。</p>';
      html+=EQUIPMENT_QUESTS.filter(q=>equipmentStoryCompleted(game.progress,q.chapter)).map(q=>`<article class="living-request"><h3>${escape(q.title)}</h3><p>${escape(q.reply)}</p></article>`).join('');
      html+=MAIN_LIVING_RESULTS.filter(r=>!EQUIPMENT_QUESTS.some(q=>q.chapter===r.id)&&game.progress.story.chapters[r.id]?.completed).map(r=>`<p>${escape(r.line)}</p>`).join('');
    }else html+=state.journal.length?state.journal.map(line=>`<p class="living-log">${escape(line)}</p>`).join(''):'<p>沿路听到的话，会留在这里。</p>';
    const safe=livingForest(game)&&livingSafePoint(game.player)&&!game.boss&&!game.livingBattle;
    if(!person)html+=`<footer><button id="living-rest" ${safe&&!state.patrolActive?'':'disabled'}>休息到下一时段</button><small>木门内安心休息，世界不会在离线时催你。</small></footer>`;
    if(signature!==html){signature=html;const content=root.getElementById('living-content');content.innerHTML=html;
      // 邻里对话与功能目录的操作共用按钮材质，仅选项排列由各自页面负责。
      for(const button of content.querySelectorAll('button'))button.classList.add('ui-button');
    }
    if(person){dialog.dataset.speaker=residentFor(game,person)?.name||'邻居';if(!taskPanel)dockNpcDialogue(root,dialog);}
  }
  // 委托交接使用标准任务页；普通闲聊才停靠底部，避免任务正文被限制在半屏内。
  function open(id=null){
    if(!facilityOpen(game.progress,'neighbors')){game.requestFacility?.('neighbors');return;}if(!livingForest(game))return;
    person=id&&RESIDENTS.some(r=>r.id===id)?id:null;notice='';noticeError=false;view='board';signature='';
    const speaker=person&&residentFor(game,person);rumor=speaker&&worldDistance(livingInteractionPosition(game),speaker)<110?(hearTreasureRumor(game,person)?.message||''):'';
    focusId=focusedResidentRequest(game,person)?.id||null;
    taskPanel=!!person&&(visibleResidentRequests(game,person,focusId).length>0||EQUIPMENT_QUESTS.some(q=>q.host===person));
    dialog.classList.toggle('npc-bottom-dialogue',!!person&&!taskPanel);
    dialogs.open('living-dialog',{modal:!person||taskPanel});render();
  }
  dialogs.register('living-dialog',{onOpen:()=>{signature='';},focusId:'living-close'});
  scope.on(menu,'click',()=>open());scope.on(root.getElementById('living-close'),'click',()=>dialogs.close('living-dialog'));
  // 世界动作在核心事务成功后才刷新界面，失败保留当前对话与请求。
  function result(value){noticeError=!value.ok;notice=value.message|| (value.ok?'已记下，沿路去看看吧。':'现在还不能这样做。');onRest();render();onChange();
    // 节点提交后从回应开头阅读，不能沿用点击底部操作时的旧滚动位置。
    root.getElementById('living-content').scrollTop=0;if(value.battle)dialogs.close('living-dialog');}
  scope.on(dialog,'click',event=>{
    const button=event.target.closest('button');if(!button||button.disabled)return;
    if(button.dataset.equipmentStory){onEquipmentStory?.(button.dataset.equipmentStory);dialogs.transferResume('living-dialog','story-dialog');dialogs.close('living-dialog');}
    else if(button.dataset.livingTab){view=button.dataset.livingTab;render();}
    else if(button.dataset.livingAccept){const value=acceptLivingRequest(game,button.dataset.livingAccept);result(value);if(value.ok)dialogs.close('living-dialog');}
    else if(button.dataset.livingTrack){const value=trackLivingRequest(game,button.dataset.livingTrack);result(value);if(value.ok)dialogs.close('living-dialog');}
    else if(button.hasAttribute('data-living-mainline'))result(trackLivingRequest(game));
    else if(button.dataset.livingDo)result(interactLivingRequest(game,button.dataset.livingDo));
    else if(button.dataset.storyPrize)result(claimStoryCollection(game,button.dataset.storyBoard,button.dataset.storyPrize));
    else if(button.dataset.storyHelp){notice=STORY_POSTS.find(p=>p.id==='monster-neighbors').collection.text;render();}
    else if(button.dataset.livingVisit){const resident=residentFor(game,button.dataset.livingVisit);if(resident){requestWorldNavigation(game,resident,'去找'+resident.name);dialogs.close('living-dialog');}}
    else if(button.hasAttribute('data-living-clearing')){requestWorldNavigation(game,clearingSite(game.progress),'前往本次清缴地点');dialogs.close('living-dialog');}
    else if(button.hasAttribute('data-living-board')){const board=STORY_POSTS.find(p=>p.id==='monster-neighbors');requestWorldNavigation(game,board,'前往邻里委托板');dialogs.close('living-dialog');}
    else if(button.id==='living-rest')result(restLivingWorld(game));
    else if(button.id==='living-patrol'){dialogs.close('living-dialog');onClearing();}
  });
  // E键作为现场点击的键盘替代，仍匹配对应居民或当前任务道具。
  function interact(){if(!target)return;const owner=target.resident||residentFor(game,target.step?.resident||LIVING_REQUESTS.find(q=>q.id===target.id)?.host)?.id;open(owner);if(target.step)result(interactLivingRequest(game,target.id));}
  scope.on(action,'click',event=>{if(event.detail===0)interact();});
  scope.on(root,'keydown',event=>{if(event.code==='KeyE'&&!event.repeat&&!event.defaultPrevented&&target&&!game.mainlineSpeech&&!root.querySelector('dialog[open]')){event.preventDefault();interact();}});
  // 顶部图片在正式历法下打开日程，调试预览仍交给环境面板。
  for(const id of ['season-picture','time-picture'])scope.on(root.getElementById(id),'click',()=>{if(environment.calendarActive&&!environment.livingPreview){open();view='news';render();}});
  // 调试选项放进既有Debug折叠区，正式玩家流程不暴露实现参数。
  const debug=root.createElement('label');debug.className='living-preview';debug.innerHTML='<input id="living-preview" type="checkbox">环境预览（不推进正式日期）';root.getElementById('debug-content').append(debug);
  scope.on(debug.querySelector('input'),'change',event=>{environment.livingPreview=event.target.checked;onRest();onChange();});
  // 热点跟随真实人物和任务道具；不显示屏幕底部交互条。
  function renderFrame(){
    chatter.render();
    const enabled=livingForest(game)&&game.state==='playing'&&!root.querySelector('dialog[open]')&&root.getElementById('game-frame').dataset.page!=='title';
    // 当前追踪请求的每个节点到点打开；先记已展示，关闭后留在原地不会反复弹窗。
    const request=trackedLivingRequest(game),record=request&&game.progress.living.requests[request.id];
    const handoff=record&&!record.completed&&record.stage>=0?livingRequestTarget(game,request):null;
    // 护路结束属于同一节点的新交接，重新显示当前行动；开战前仍由玩家点击推进。
    const battleReady=handoff?.step.battle&&(record.battleKills||0)>=GAMEPLAY_VALUES.living.battleKills;
    const key=handoff?request.id+':'+record.stage+':'+Boolean(battleReady):'';
    if(key!==handoffKey||!handoff||worldDistance(game.player,handoff)>145)handoffKey='';
    if(enabled&&!root.hidden&&!game.livingPreview&&!game.mainlineSpeech&&!game.boss&&!game.livingBattle&&!game.progress.living.patrolActive&&handoff&&worldDistance(game.player,handoff)<=110&&
      !game.enemies.some(e=>e.hp>0&&worldDistance(game.player,e)<180)&&handoffKey!==key){
      handoffKey=key;open(residentFor(game,handoff.step.resident||request.host)?.id);return;
    }
    const menuHidden=!livingForest(game);if(menu.hidden!==menuHidden)menu.hidden=menuHidden;
    target=enabled?nearbyLivingInteraction(game):null;
    // 可见现场热点交给投影一次决定，离屏时不先显示再隐藏。
    if(!(enabled&&!game.mainlineSpeech&&target?.step&&!target.step.resident)&&!action.hidden)action.hidden=true;
    const residents=enabled&&!game.mainlineSpeech?livingResidents(game):[],ids=new Set(residents.map(r=>r.id));
    for(const [id,node] of residentNodes)if(!ids.has(id)&&!node.hidden)node.hidden=true;
    if(enabled&&!game.mainlineSpeech){
      for(const resident of residents){
        let node=residentNodes.get(resident.id);
        if(!node){node=root.createElement('button');node.className='resident-hit';node.dataset.resident=resident.id;sceneHit(node,'与'+resident.name+'交谈');frame.append(node);residentNodes.set(resident.id,node);
          scope.on(node,'click',event=>{if(event.detail!==0||game.state!=='playing'||game.mainlineSpeech||root.querySelector('dialog[open]'))return;
            const selected=residentInteraction(game,resident.id);
            if(!selected){const current=livingResidents(game).find(r=>r.id===resident.id);if(current){requestWorldNavigation(game,current,'去找'+current.name,{direct:true});onChange();}return;}
            open(resident.id);if(selected.step)result(interactLivingRequest(game,selected.id));
          });}
        placeSceneHit(node,resident,renderer,frame,{width:resident.hero===undefined?76:50,height:resident.hero===undefined?78:64});
      }
      // 食材篮、厨房等非人物步骤直接点现场道具，不在屏幕底部叠按钮。
      if(target?.step&&!target.step.resident){const place=LIVING_PLACES[target.step.place];placeSceneHit(action,place,renderer,frame,{width:place.width,height:place.height||70});if(action.getAttribute('aria-label')!==target.text)action.setAttribute('aria-label',target.text);}
    }
    // 当前目标统一放在任务卡，靠近人物或驿牌也不切回另一个委托的旧提示。
    if(!hint.hidden)hint.hidden=true;
    if(dialog.open)render();
  }
  // 关闭时由共享弹窗服务恢复作息；销毁不留下事件监听或悬浮入口。
  function dispose(){for(const node of residentNodes.values())node.remove();residentNodes.clear();chatter.dispose();scope.dispose();dialog.remove();menu.remove();action.remove();hint.remove();debug.remove();}
  return {open,render,renderFrame,dispose};
}
