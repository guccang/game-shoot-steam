import {driveToTrackedTask} from '../combat/vehicle-se.js';
import {escapeOptionalHtml as escape} from './shared/html.js';
import {livingInteractionPosition} from '../core/camp/living-world.js';
import {equipmentQuestCards} from './equipment-quests.js';
import {EQUIPMENT_QUESTS,equipmentStoryCompleted} from '../config/equipment-quests.js';
import {focusedResidentRequest,visibleResidentRequests} from './living-request-view.js';
import {facilityOpen} from '../config/town-restoration.js';
import {dockNpcDialogue} from './npc-dialogue-layout.js';
import {sceneHit,placeSceneHit} from './scene-hit.js';
import {MAP_CAT_HIT} from './scene-resident.js';
import {GAMEPLAY_VALUES} from '../config/gameplay-values.js';
// 邻里目录与委托交接共用手机任务页，普通闲聊保留底部对白，暂停与任务事务共用正式入口。
import {LIVING_REQUESTS,RESIDENTS,LIVING_PLACES,LIVING_ACTION_NAMES,SEASON_WORK,MAIN_LIVING_RESULTS} from '../config/living-world.js';
import {calendarView,livingSeasonDays} from '../world/living-calendar.js';
import {livingForest,livingSafePoint} from '../world/living-spaces.js';
import {livingResidents,residentInteraction,residentFor,residentLine,acceptLivingRequest,interactLivingRequest,livingRequestTarget,nearbyLivingInteraction,restLivingWorld} from '../core/camp/living-world.js';
import {worldDistance} from '../world/coordinates.js';
import {nearbyStoryPost} from '../core/story/story-posts.js';
import {claimStoryCollection} from '../progression/story/story-rewards.js';
import {storyCollectionMarkup} from './story-rewards.js';
import {STORY_POSTS} from '../config/story-posts.js';
import {createEventScope} from '../platform/events.js';
import {trackedLivingRequest} from '../core/navigation/task-tracking.js';
import {trackLivingRequest} from '../core/camp/living-world.js';
import {createResidentChatter} from './resident-chatter.js';
import {requestWorldNavigation} from '../core/navigation/world-navigation.js';
import {clearingSite} from '../progression/story/clearing-site.js';
import {mainlineTask} from '../core/story/mainline-manager.js';
// 文本既包括存档日志也包括配置内容，统一转义后插入。

// 创建可卸载的生活面板，日常世界不另开章节会话。
export function createLivingPanel({game,root,dialogs,onChange,environment,onRest,onClearing,renderer,onEquipmentStory,onTalk}){
  const scope=createEventScope(),dialog=root.createElement('dialog'),menu=root.createElement('button'),action=root.createElement('button'),hint=root.createElement('div');
  dialog.id='living-dialog';dialog.className='living-dialog';dialog.setAttribute('aria-labelledby','living-title');
  dialog.innerHTML='<header><div><small id="living-date"></small><h2 id="living-title">森林邻里</h2></div><button id="living-close" class="ui-close" aria-label="关闭邻里面板">×</button></header><div id="living-content"><nav id="living-category-nav" role="tablist" aria-orientation="vertical" aria-label="邻里分类"></nav><section id="living-page"></section></div>';
  menu.id='living-menu';menu.setAttribute('aria-haspopup','dialog');menu.innerHTML='<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 23 24 6 43 23M10 20v22h28V20" fill="#e9dba5" stroke="#426449" stroke-width="3"/><path d="M20 42V28h9v14" fill="#91b58b" stroke="#426449" stroke-width="2"/></svg><span>邻里</span>';
  action.id='living-interact';action.className='living-interact';action.hidden=true;
  hint.id='living-hint';hint.className='living-hint';hint.hidden=true;
  root.body.append(dialog);root.getElementById('field-menu-items').prepend(menu);root.getElementById('game-frame').append(action,hint);
  const chatter=createResidentChatter({game,root,renderer}),residentNodes=new Map(),frame=root.getElementById('game-frame');
  sceneHit(action,'继续现场请求');
  let view='board',person=null,notice='',target=null,signature='',handoffKey='',taskPanel=false,focusId=null,noticeError=false;
  let itemId=null,tabSignature='';
  const categories=[['board','邻里委托'],['equipment','装备故事'],['news','找邻居'],['replies','回信'],['gift','邻居谢礼'],['camp','营地事务']];
  // 目录行只显示辨认条目所需的信息，正文留在选中的详情页。
  function choice(id,title,status){
    return '<button type="button" class="ui-choice living-choice" data-living-item="'+escape(id)+'"><span><b>'+escape(title)+'</b>'+(status?'<small>'+escape(status)+'</small>':'')+'</span><span aria-hidden="true">›</span></button>';
  }
  // 只在语义内容改变时更新，保留焦点和窄屏滚动位置。
  function render(){
    if(!dialog.open)return;
    const state=game.progress.living,calendar=calendarView(state.calendar),residents=livingResidents(game),post=nearbyStoryPost(game),near=!!post;
    const ordered=visibleResidentRequests(game,person,focusId);
    root.getElementById('living-date').textContent=person?(focusId?'当前委托':'正在交谈'):calendar.label;
    const quests=EQUIPMENT_QUESTS.filter(q=>!person||q.host===person);
    const tabs=person?[['board',ordered.length?'邻里委托':'交谈'],...(quests.length?[['equipment','装备故事']]:[])]:categories;
    const showRail=!person||taskPanel&&!focusId&&tabs.length>1;
    const nav=root.getElementById('living-category-nav'),page=root.getElementById('living-page');
    dialog.classList.toggle('living-catalog',showRail);nav.hidden=!showRail;
    if(showRail){
      const tabKey=view+'|'+tabs.map(([id,label])=>id+label).join('|');
      if(tabSignature!==tabKey){
        tabSignature=tabKey;
        nav.innerHTML=tabs.map(([id,label])=>`<button type="button" class="ui-button" id="living-tab-${id}" data-living-tab="${id}" role="tab" aria-controls="living-page" aria-selected="${view===id}" tabindex="${view===id?0:-1}">${label}</button>`).join('');
      }
      page.setAttribute('role','tabpanel');page.setAttribute('aria-labelledby','living-tab-'+view);
    }else{page.removeAttribute('role');page.removeAttribute('aria-labelledby');}
    let html='';
    if(notice&&(!focusId||noticeError))html+=`<p class="living-notice" role="status">${escape(notice)}</p>`;
    root.getElementById('living-title').textContent=person?residentFor(game,person)?.name||'邻居':'森林邻里';
    // 正在阅读现场回应时，不再接上一段无关闲聊，保留这次交谈的情绪与指向。
    if(person&&!notice&&!ordered.length&&view==='board'){const resident=residentFor(game,person);if(resident)html+=`<section class="living-conversation"><h3>${escape(resident.name)} · ${LIVING_ACTION_NAMES[resident.moving?'walk':resident.action]}</h3><p>${escape(residentLine(game,resident))}</p><small>${escape(resident.job)} · ${escape(resident.relation)}</small></section>`;}
    if(view==='board'){
      const selected=ordered.find(q=>q.id===(focusId||itemId))||(person&&ordered.length===1?ordered[0]:null);
      if(!selected&&ordered.length){
        html+='<h3>邻里委托</h3>'+ordered.map(q=>{
          const record=state.requests[q.id],host=residentFor(game,q.host);
          const status=record.stage>=0?'进行中':q.requires.some(id=>!state.requests[id].completed)?'待解锁':'待接取';
          return choice(q.id,q.title,(host?.name||'邻居')+' · '+status);
        }).join('');
      }
      if(selected){
        const spec=selected;
        if(!focusId&&(!person||ordered.length>1))html+='<button class="living-back" data-living-back>‹ 委托列表</button>';
        const q=state.requests[spec.id],host=residentFor(game,spec.host),locked=spec.requires.some(id=>!state.requests[id].completed);
        const canAccept=(near||host&&worldDistance(livingInteractionPosition(game),host)<110)&&!locked,t=livingRequestTarget(game,spec),accepted=q.stage>=0;
        const names={coins:'金币',wood:'木材',parts:'零件',crystal:'晶体',core:'核心'};
        html+=`<article data-living-request="${spec.id}" class="living-request ${accepted?'living-current':''}"><div class="living-task-meta"><small>${q.completed?'已完成':accepted?'正在帮忙':escape(host?.name||'邻居')+'想请你帮忙'}</small>${accepted&&!q.completed?`<small>第 ${q.stage+1} / ${spec.steps.length} 步</small>`:''}</div><h3>${escape(spec.title)}</h3>`;
        if(accepted&&!q.completed)html+=`<div class="living-task-goal"><small>当前目标</small><strong>${escape(t?.text)}</strong></div>`;
        else if(!q.completed)html+=`<p>${escape(spec.lead)}</p>`;
        if(notice&&focusId===spec.id&&!noticeError)html+=`<p class="living-notice" role="status">${escape(notice)}</p>`;
        html+=`<section class="living-payment"><h4>${q.completed?'任务奖励':'完成奖励'}</h4><div class="living-pay">${Object.entries(spec.reward).map(([key,n])=>`<span>${names[key]} +${n}</span>`).join('')}</div></section>`;
        if(q.completed){/* 完成页只保留右上角关闭，不出现下一委托操作。 */}
        else if(accepted){
          const close=t&&worldDistance(livingInteractionPosition(game),t)<110;
          html+=`<button class="primary" ${close?`data-living-do="${spec.id}"`:`data-living-track="${spec.id}"`}>${close?'在这里继续':'带我过去'}</button>`;
        }else if(locked)html+='<small>先完成送饭与夜班请求，大家再一起筹备集市。</small>';
        else html+=canAccept?`<button class="primary" data-living-accept="${spec.id}">接下请求</button>`:`<button data-living-visit="${spec.host}">去找${escape(host?.name||'邻居')}</button>`;
        html+='</article>';
      }
      // 节点回应已说明下一步或收束心意，不用“没有事”打断刚刚交代的请求。
      if(!ordered.length&&!notice&&!person)html+='<p>今天没有要托你办的事，路上慢慢逛。</p>';
    }else if(view==='gift'){
      const board=STORY_POSTS.find(p=>p.id==='monster-neighbors');
      html+=storyCollectionMarkup(game.progress,board,post?.id===board.id,{flat:true});
      if(post?.id!==board.id)html+='<button data-living-board>去委托板领取</button>';
    }else if(view==='equipment'){
      const quest=quests.find(q=>q.chapter===itemId)||(person&&quests.length===1?quests[0]:null);
      if(quest)html+=(quests.length>1||!person?'<button class="living-back" data-living-back>‹ 装备故事列表</button>':'')+equipmentQuestCards(game.progress,person,quest.chapter);
      else html+='<h3>装备故事</h3>'+quests.map(q=>choice(q.chapter,q.title,residentFor(game,q.host)?.name)).join('');
    }else if(view==='news'){
      const resident=residents.find(r=>r.id===itemId);
      if(resident)html+=`<button class="living-back" data-living-back>‹ 邻居名册</button><article class="living-request"><h3>${escape(resident.name)}</h3><small>${escape(resident.job)} · ${LIVING_ACTION_NAMES[resident.moving?'walk':resident.action]}</small><p>${escape(resident.relation)}</p><p>惦记的事：${escape(resident.wish)}</p><button data-living-visit="${resident.id}">去找${escape(resident.name)}</button></article>`;
      else html+='<h3>邻居名册</h3>'+residents.map(r=>choice(r.id,r.name,LIVING_ACTION_NAMES[r.moving?'walk':r.action])).join('');
    }else if(view==='replies'){
      const letters=[
        ...LIVING_REQUESTS.filter(q=>state.requests[q.id].completed).map(q=>({id:q.id,title:q.title,text:q.reply})),
        ...EQUIPMENT_QUESTS.filter(q=>equipmentStoryCompleted(game.progress,q.chapter)).map(q=>({id:q.chapter,title:q.title,text:q.reply})),
        ...MAIN_LIVING_RESULTS.filter(r=>!EQUIPMENT_QUESTS.some(q=>q.chapter===r.id)&&game.progress.story.chapters[r.id]?.completed).map(r=>({id:r.id,title:r.line.split('：')[0]+'的回信',text:r.line}))
      ];
      const letter=letters.find(q=>q.id===itemId);
      html+=letter?`<button class="living-back" data-living-back>‹ 回信列表</button><h3>${escape(letter.title)}</h3><p>${escape(letter.text)}</p>`:'<h3>回信</h3>'+(letters.length?letters.map(q=>choice(q.id,q.title)).join(''):'<p>还没有收到回信。办妥邻居的委托后，可以在这里重读。</p>');
    }else if(view==='camp'){
      const safe=livingForest(game)&&livingSafePoint(game.player)&&!game.boss&&!game.livingBattle;
      html+=`<h3>营地事务</h3><p>${escape(SEASON_WORK[calendar.seasonIndex])}</p><p>${calendar.market?'今天是集市日，白昼和黄昏都能遇见邻居。':'还有'+(livingSeasonDays()-calendar.seasonDay)+'天到集市日。'}</p><button id="living-patrol">${state.patrolActive?'去告示牌管理清缴':'去告示牌接取清缴'}</button>${state.patrolActive?'<button data-living-clearing>前往清缴场</button>':''}${mainlineTask(game)?'<button data-living-mainline>追踪巡林主线</button>':''}<button id="living-rest" ${safe&&!state.patrolActive?'':'disabled'}>休息到下一时段</button><h4>森林里的往来</h4><p>道路、渡口、巡护灯和中继站曾把聚落连在一起。如今旧设备需要修理，信件和药箱仍每天出发。晴叶提供补给与维修，邻里交换食物与手艺，哨站守着道路和夜里的消息。</p>`;
    }
    if(signature!==html){
      signature=html;page.innerHTML=html;
      for(const button of page.querySelectorAll('button'))button.classList.add('ui-button');
    }
    if(person){dialog.dataset.speaker=residentFor(game,person)?.name||'邻居';if(!taskPanel)dockNpcDialogue(root,dialog);}
  }
  // 委托交接使用标准任务页；普通闲聊才停靠底部，避免任务正文被限制在半屏内。
  function open(id=null,requestId=null){
    if(!facilityOpen(game.progress,'neighbors')){game.requestFacility?.('neighbors');return;}if(!livingForest(game))return;
    person=id&&RESIDENTS.some(r=>r.id===id)?id:null;notice='';noticeError=false;view='board';signature='';
    // 通讯录和事务页只读；秘密由主动分层闲聊或正式委托结算记录。
    focusId=focusedResidentRequest(game,person)?.id||null;
    itemId=requestId||(!person?trackedLivingRequest(game)?.id:null);
    if(requestId&&game.progress.living.requests[requestId]?.completed)view='replies';
    taskPanel=!!person&&(visibleResidentRequests(game,person,focusId).length>0||EQUIPMENT_QUESTS.some(q=>q.host===person));
    dialog.classList.toggle('npc-bottom-dialogue',!!person&&!taskPanel);
    dialogs.open('living-dialog',{modal:!person||taskPanel});render();
    root.getElementById('living-page').scrollTop=0;root.getElementById('living-category-nav').scrollTop=0;
  }
  dialogs.register('living-dialog',{onOpen:()=>{signature='';},focusId:'living-close'});
  scope.on(menu,'click',()=>open());scope.on(root.getElementById('living-close'),'click',()=>dialogs.close('living-dialog'));
  // 世界动作在核心事务成功后才刷新界面，失败保留当前对话与请求。
  function result(value){noticeError=!value.ok;notice=value.message|| (value.ok?'已记下，沿路去看看吧。':'现在还不能这样做。');onRest();render();onChange();
    // 节点提交后从回应开头阅读，不能沿用点击底部操作时的旧滚动位置。
    root.getElementById('living-page').scrollTop=0;root.getElementById('living-content').scrollTop=0;if(value.battle)dialogs.close('living-dialog');}
  scope.on(dialog,'click',event=>{
    const button=event.target.closest('button');if(!button||button.disabled)return;
    if(button.dataset.equipmentStory){onEquipmentStory?.(button.dataset.equipmentStory);dialogs.transferResume('living-dialog','story-dialog');dialogs.close('living-dialog');}
    else if(button.dataset.livingTab){
      view=button.dataset.livingTab;itemId=null;notice='';render();
      root.getElementById('living-page').scrollTop=0;root.getElementById('living-tab-'+view).focus({preventScroll:true});
    }else if(button.dataset.livingItem||button.hasAttribute('data-living-back')){
      const previous=itemId;itemId=button.dataset.livingItem||null;notice='';render();
      const page=root.getElementById('living-page');page.scrollTop=0;
      (itemId?page.querySelector('[data-living-back]'):page.querySelector('[data-living-item="'+previous+'"]'))?.focus({preventScroll:true});
    }
    else if(button.dataset.livingAccept){const value=acceptLivingRequest(game,button.dataset.livingAccept);result(value);if(value.ok){dialogs.close('living-dialog');driveToTrackedTask(game);}}
    else if(button.dataset.livingTrack){const value=trackLivingRequest(game,button.dataset.livingTrack);result(value);if(value.ok){dialogs.close('living-dialog');driveToTrackedTask(game);}}
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
  // 竖向页签支持方向键，以及首尾页快速定位。
  scope.on(root.getElementById('living-category-nav'),'keydown',event=>{
    const tabs=[...event.currentTarget.querySelectorAll('[role="tab"]')],i=tabs.indexOf(event.target);
    if(i<0)return;
    const target={ArrowDown:(i+1)%tabs.length,ArrowUp:(i+tabs.length-1)%tabs.length,Home:0,End:tabs.length-1}[event.key];
    if(target!==undefined){event.preventDefault();tabs[target].click();}
  });
  // E键作为现场点击的键盘替代，仍匹配对应居民或当前任务道具。
  function interact(){if(!target)return;const owner=target.resident||residentFor(game,target.step?.resident||LIVING_REQUESTS.find(q=>q.id===target.id)?.host)?.id;if(onTalk&&target.resident){onTalk('resident:'+owner,()=>open(owner));return;}open(owner);if(target.step)result(interactLivingRequest(game,target.id));}
  scope.on(action,'click',event=>{if(event.detail===0)interact();});
  scope.on(root,'keydown',event=>{if(event.code==='KeyE'&&!event.repeat&&!event.defaultPrevented&&target&&!game.mainlineSpeech&&!root.querySelector('dialog[open]')){event.preventDefault();interact();}});
  // 调试选项放进既有Debug折叠区，正式玩家流程不暴露实现参数。
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
            if(onTalk)onTalk('resident:'+resident.id,()=>open(resident.id));
            else {open(resident.id);if(selected.step)result(interactLivingRequest(game,selected.id));}
          });}
        placeSceneHit(node,resident,renderer,frame,Number.isInteger(resident.hero)?MAP_CAT_HIT:{width:76,height:78});
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
