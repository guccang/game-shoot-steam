import {fishingSurveyMarkup} from './fishing-surveys.js';
import {fishingTackleMarkup} from './fishing-tackle.js';
import {rodOwned,baitCount} from '../config/fishing-tackle.js';
import {fishingSetup} from '../core/fishing-tackle.js';
// 手机野外装备页与实时钓鱼操作条；弹窗只负责准备，抛竿和收线始终发生在正式湖面。
import {OUTDOOR_GEAR,FISH_SPECIES,OUTDOOR_RULES} from '../config/outdoors.js';
import {buyOutdoorGear,sellOutdoorFish,deployCamp,packCamp,sleepAtCamp,beginFishing,acceptFishingSurvey,claimFishingSurvey,equipFishingTackle,fishingControl,finishFishing,outdoorBusy} from '../core/outdoors.js';
import {fishingShores} from '../world/outdoor-sites.js';
import {AMMO_SHOP} from '../config/supplies.js';
import {requestWorldNavigation} from '../core/world-navigation.js';
import {createEventScope} from '../platform/events.js';

// 装备页共用标准底板，野外动作条保留足够的触控范围和中文操作反馈。
export function createOutdoors({game,root,dialogs,onChange,onFishCaught}){
 const scope=createEventScope(),panel=root.createElement('dialog'),hud=root.createElement('section'),entry=root.createElement('button');
 entry.id='outdoor-menu';entry.setAttribute('aria-controls','outdoor-dialog');entry.setAttribute('aria-haspopup','dialog');entry.type='button';entry.setAttribute('aria-label','打开野外露营与钓鱼');entry.innerHTML='<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 39 23 8 43 39Z" fill="#c8d39b" stroke="#315c43" stroke-width="3"/><path d="m14 39 9-18 10 18" fill="#f6e6b6" stroke="#315c43" stroke-width="2"/></svg><span>野外</span>';root.getElementById('field-menu-items').append(entry);
 panel.id='outdoor-dialog';panel.className='ui-panel ui-page';panel.setAttribute('aria-labelledby','outdoor-title');panel.innerHTML='<header class="ui-panel__header"><div><h2 id="outdoor-title">露营与垂钓</h2><p>把一天留给湖水和晚风</p></div><button class="ui-close" id="outdoor-close" aria-label="关闭野外装备">×</button></header><div class="ui-panel__body" id="outdoor-content"></div><footer class="ui-panel__footer"><p id="outdoor-message" role="status"></p></footer>';root.body.append(panel);
 hud.id='fishing-hud';hud.hidden=true;hud.setAttribute('aria-label','湖岸钓鱼操作');hud.innerHTML='<div class="fishing-heading"><b id="fishing-phase">湖岸垂钓</b><button class="ui-button" id="fishing-cancel">收竿</button></div><p id="fishing-message" role="status"></p><div id="fishing-meters"><label>鱼线张力 <meter id="fishing-tension" min="0" max="1" low="0.16" high="0.78" optimum="0.45"></meter></label><label>收线进度 <progress id="fishing-progress" max="1"></progress></label></div><label id="fishing-lean-label">左控竿 ← <input id="fishing-lean" type="range" min="-1" max="1" step="0.05" value="0" aria-label="左右控制鱼竿"> → 右控竿</label><button class="ui-button ui-button--primary" id="fishing-control">按住蓄力 · 松手抛竿</button><div id="fishing-catch"><button class="ui-button ui-button--primary" data-fish-keep>收进鱼护</button><button class="ui-button" data-fish-release>放回湖里</button></div>';root.getElementById('game-frame').append(hud);
 let message='',held=false,lastPhase='';const get=id=>root.getElementById(id);
 // 来源与价格实时读取正式配置，拥有的装备不会反复出售。
 function renderPanel(){
  const expanded=[...get('outdoor-content').querySelectorAll('details')].map(d=>d.open),scroll=get('outdoor-content').scrollTop;
  const p=game.progress.outdoors,camp=p.camp,shop=game.cottage?.kind==='ammo';
  get('outdoor-content').innerHTML=`${fishingTackleMarkup(game)}${fishingSurveyMarkup(game)}<section class="ui-section"><details><summary>采购钓具与露营装备</summary><h3>行囊 · ${game.progress.coins} 金币</h3>${Object.entries(OUTDOOR_GEAR).map(([id,g])=>`<article class="outdoor-gear"><div><b>${g.name}</b><p>${g.description}</p><small>${g.kind==='bait'?`持有 ${baitCount(p,g.tackleId)} 份 · 每包 ${g.pack} 份`:g.mass+' 千克'+(g.tier?' · '+g.tier+'阶':'')}</small></div>${(g.kind==='tent'?p.tent:g.kind==='rod'&&rodOwned(p,g.tackleId))?'<span>已备好</span>':`<button class="ui-button" data-outdoor-buy="${id}" ${!shop?'disabled':''}>${g.coins} 金币</button>`}</article>`).join('')}${shop?'':'<button class="ui-button" data-outdoor-action="shop">前往弹药补给铺采购</button>'}</details></section><section class="ui-section"><h3>今晚住哪里</h3><p>战车旁可直接驻营；购买套装后搭起帐篷、天幕、桌椅、炉具与营灯。请选择远离危险的开阔草地。</p>${camp?`<p>营地已搭好 · ${camp.mode==='vehicle'?'战车驻营':'帐篷露营'} · ${camp.mapId==='forest'?'晴叶森林':'九寨沟'}</p><div class="outdoor-actions"><button class="ui-button" data-outdoor-action="camp-nav">返回营地</button><button class="ui-button" data-outdoor-action="sleep">睡到明早</button><button class="ui-button" data-outdoor-action="nap">休息到下一时段</button><button class="ui-button" data-outdoor-action="pack">收回营地</button></div>`:'<div class="outdoor-actions"><button class="ui-button" data-outdoor-action="vehicle">战车旁驻营</button><button class="ui-button" data-outdoor-action="tent" '+(!p.tent?'disabled':'')+'>展开露营套装</button></div>'}</section><section class="ui-section"><h3>湖边垂钓</h3><p>按住蓄力，松手抛竿。浮漂轻晃时等待，明显下沉时扬竿。中鱼后按住收线，张力变红就松手；向鱼逃窜的反方向控竿。</p><div class="outdoor-actions"><button class="ui-button" data-outdoor-action="shore">寻找最近湖岸</button><button class="ui-button ui-button--primary" data-outdoor-action="fish" ${fishingSetup(game).reason?'disabled':''}>在这里钓鱼</button></div><p>累计钓获 ${p.caught} 条 · 最长 ${p.best} 厘米</p><div class="outdoor-fish-list">${FISH_SPECIES.filter(f=>p.fish[f.id]>0).map(f=>`<span>${f.name} ×${p.fish[f.id]}<small>${f.mass} 千克/条 · ${f.coins} 金币/条</small></span>`).join('')}</div><button class="ui-button" data-outdoor-action="sell" ${!shop?'disabled':''}>在柜台出售全部鱼获</button></section>`;
  get('outdoor-content').querySelectorAll('details').forEach((d,i)=>{d.open=expanded[i]||false;});get('outdoor-content').scrollTop=scroll;
  get('outdoor-message').textContent=message||game.outdoorNotice||'营地位置和装备会保存；离线不会自动钓鱼。';
 }
 // 关闭准备页后才开始现场动作，避免菜单暂停吞掉抛竿和睡眠时钟。
 function perform(action){
  let result;
  if(action==='shop'||action==='shore'||action==='camp-nav'){
   if(game.cottage?.kind==='mine'){message='请先收起页面，在地下小地图找到湖岸；采购需返回地面补给铺。';renderPanel();return;}
   const site=action==='shop'?{...AMMO_SHOP,y:AMMO_SHOP.y+22}:action==='shore'?fishingShores(game)[0]:game.progress.outdoors.camp;
   if(!site){message='附近暂时找不到可站立的湖岸。';renderPanel();return;}
   requestWorldNavigation(game,site,action==='shore'?'前往湖岸钓鱼':action==='shop'?'购买露营与钓鱼装备':'返回野外营地',{direct:true,arrivalRadius:action==='shore'?OUTDOOR_RULES.castReach:undefined});dialogs.close(panel.id);onChange();return;
  }
  if(['fish','sleep','nap','tent','vehicle','pack'].includes(action))dialogs.close(panel.id);
  if(action==='fish')result=beginFishing(game);
  if(action==='sleep'||action==='nap')result=sleepAtCamp(game,action==='sleep'?'morning':'phase');
  if(action==='tent'||action==='vehicle')result=deployCamp(game,action);
  if(action==='pack')result=packCamp(game);
  if(action==='sell')result=sellOutdoorFish(game);
  if(action==='survey-accept')result=acceptFishingSurvey(game);
  if(action==='survey-claim')result=claimFishingSurvey(game);
  if(result){message=result.message;game.outdoorNotice=message;if(!result.ok&&!panel.open)dialogs.open(panel.id);if(panel.open)renderPanel();onChange();}
 }
 dialogs.register(panel.id,{focusId:'outdoor-close',onOpen:renderPanel});
 // 不重建原商店，只嵌入自己的装备页面；返回仍位于售货员所在房间。
 function open(){message='';dialogs.open(panel.id);}
 scope.on(panel,'change',e=>{const kind=e.target.dataset.fishingEquip;if(!kind)return;const result=equipFishingTackle(game,kind,e.target.value);message=result.message;renderPanel();onChange();});
 scope.on(entry,'click',open);scope.on(get('outdoor-close'),'click',()=>dialogs.close(panel.id));
 scope.on(panel,'click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;if(b.dataset.outdoorBuy){const result=buyOutdoorGear(game,b.dataset.outdoorBuy);message=result.message;renderPanel();onChange();}if(b.dataset.outdoorAction)perform(b.dataset.outdoorAction);});
 // 取消手势和窗口失焦只释放卷线轮，不把未完成蓄力误判为一次抛竿。
 function release(cancel=false){if(!held)return;held=false;if(cancel||game.state!=='playing'){if(game.fishing){game.fishing.reeling=false;if(game.fishing.phase==='charging')game.fishing.phase='ready';}}else fishingControl(game,'release');}
 const control=get('fishing-control');
 scope.on(control,'pointerdown',e=>{e.preventDefault();e.stopPropagation();held=true;control.setPointerCapture(e.pointerId);fishingControl(game,'press');});
 scope.on(control,'pointermove',e=>{if(held)fishingControl(game,'lean',(e.clientX-control.getBoundingClientRect().left)/control.clientWidth*2-1);});
 scope.on(control,'pointerup',e=>{e.preventDefault();e.stopPropagation();release();});scope.on(control,'pointercancel',()=>release(true));scope.on(control,'lostpointercapture',()=>release(true));
 scope.on(control,'keydown',e=>{if([' ','Enter'].includes(e.key)&&!e.repeat){e.preventDefault();held=true;fishingControl(game,'press');}});scope.on(control,'keyup',e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();release();}});
 scope.on(root.defaultView,'blur',()=>release(true));scope.on(get('fishing-lean'),'input',e=>fishingControl(game,'lean',Number(e.target.value)));
 scope.on(hud,'pointerdown',e=>e.stopPropagation());scope.on(hud,'click',e=>{e.stopPropagation();if(e.target.closest('#fishing-cancel')){fishingControl(game,'cancel');game.campSleep=null;held=false;onChange();}if(e.target.closest('[data-fish-keep],[data-fish-release]')){const result=finishFishing(game,!!e.target.closest('[data-fish-keep]'));if(!result.ok&&game.fishing)game.fishing.message=result.message;if(result.ok&&result.catch)onFishCaught?.(result.catch);onChange();}});
 // 低成本刷新文字、进度和显隐，不每帧重建按住中的按钮。
 function renderFrame(){
  const f=game.fishing,s=game.campSleep,hidden=!outdoorBusy(game)||game.state!=='playing'||!!root.querySelector('dialog[open]');hud.hidden=hidden;if(hidden){release(true);return;}
  const phase=s?'sleeping':f.phase;get('fishing-phase').textContent=s?'林间好梦':({ready:'湖岸垂钓',charging:'蓄力抛竿',casting:'浮漂入水',waiting:'静候鱼讯',nibble:'鱼儿试探',bite:'浮漂下沉！',fight:'稳住鱼竿',landed:'鱼儿上岸',missed:'下次再来'})[phase];
  get('fishing-message').textContent=s?'睡袋暖暖的，天光正在变化……':f.message+(['ready','charging'].includes(phase)?(f.mode==='school'?' 附近鱼群：'+[...new Set(f.schools.map(s=>FISH_SPECIES[s.species].name))].join('、')+'，更容易咬钩。':' 本湖常住鱼正在等待。'):'');
  get('fishing-meters').hidden=phase!=='fight';get('fishing-lean-label').hidden=phase!=='fight';get('fishing-catch').hidden=phase!=='landed';control.hidden=['sleeping','landed','missed'].includes(phase);
  if(f){get('fishing-tension').value=f.tension;get('fishing-progress').value=f.progress;control.textContent=phase==='charging'?`蓄力 ${Math.round(f.charge*100)}% · 松手抛竿`:phase==='bite'?'现在扬竿！':phase==='fight'?(f.reeling?'正在收线 · 松手放线':'按住收线 · 左右拖动控竿'):phase==='ready'?'按住蓄力 · 松手抛竿':'等黑漂 · 暂时不要提竿';control.disabled=phase==='casting';hud.dataset.phase=phase;}
  if(lastPhase!==phase){if(phase==='bite')root.defaultView.navigator.vibrate?.([35,35,65]);lastPhase=phase;}
 }
 // 销毁时释放触控与实时动作，防止遗留按住状态。
 function dispose(){release(true);scope.dispose();entry.remove();panel.remove();hud.remove();}
 return {open,renderFrame,dispose};
}
