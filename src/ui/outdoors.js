import {setHidden} from './shared/dom-state.js';
import {fishingSurveyMarkup} from './fishing-surveys.js';
import {fishingTackleMarkup} from './fishing-tackle.js';
import {fishingStorageMarkup} from './fish-storage.js';
import {rodOwned,baitCount} from '../config/fishing-tackle.js';
import {fishingSetup} from '../core/fishing/fishing-tackle.js';
// 手机野外装备页与实时钓鱼操作条；弹窗只负责准备，抛竿和收线始终发生在正式湖面。
import {OUTDOOR_GEAR,FISH_SPECIES,OUTDOOR_RULES} from '../config/outdoors.js';
import {balconyGlideMeters} from '../config/home-construction.js';
import {WORLD_UNITS_PER_METER} from '../world/distance-units.js';
import {GLIDERS} from '../config/gliders.js';
import {selectOutdoorGlider,buyOutdoorGear,sellOutdoorFish,deployCamp,packCamp,sleepAtCamp,beginFishing,fishingAvailability,acceptFishingSurvey,claimFishingSurvey,equipFishingTackle,fishingControl,outdoorBusy} from '../core/activities/outdoors.js';
import {fishingShores} from '../world/outdoor-sites.js';
import {OUTDOOR_SHOP} from '../config/outdoor-shop.js';
import {requestWorldNavigation} from '../core/navigation/world-navigation.js';
import {createEventScope} from '../platform/events.js';
import {nearest,worldDistance} from '../world/coordinates.js';
import {storedShopGood} from '../progression/economy/shop-stock.js';
import {vehicleModel} from '../config/vehicles.js';
import {outdoorGearIcon} from './outdoor-gear-icon.js';
import {FISH_RARITIES} from '../config/fish-catalog.js';

// 列表先说明用途与单价，重量、规格和完整说明留给商品详情。
function outdoorGearCard(progress,id,g,shop){
 const p=progress.outdoors;
 const owned=g.kind!=='bait'&&(storedShopGood(progress,'outdoor:'+id)||(g.kind==='tent'?p.tent:g.kind==='fish-container'?p.containers[g.tackleId]:rodOwned(p,g.tackleId)));
 const summary=g.kind==='tent'?'在野外搭营，睡觉或小憩。':g.kind==='fish-container'?`独立鱼获容量 ${g.capacity} 千克`:g.kind==='rod'?`${g.tier} 阶 · 可钓${g.tier===1?'常见鱼':FISH_RARITIES[g.tier-1]+'及以下鱼种'}`:`每包 ${g.pack} 份 · ${g.description}`;
 return `<article class="outdoor-product">
  <button type="button" class="outdoor-product-icon" data-gear-detail="${id}" aria-haspopup="dialog" aria-label="查看${g.name}详情">${outdoorGearIcon(g)}<small>详情</small></button>
  <div class="outdoor-product-copy"><strong>${g.name}</strong><p>${summary}</p></div>
  <div class="outdoor-product-order"><strong>${g.coins} 金币</strong>${owned?'<span>已备好</span>':`<button type="button" class="ui-button" data-shop-good="outdoor:${id}" data-outdoor-buy="${id}" aria-label="将${g.name}加入购物车" ${shop?'':'disabled'}>加入购物车</button>`}</div>
 </article>`;
}

// 装备页共用标准底板，野外动作条保留足够的触控范围和中文操作反馈。
export function createOutdoors({game,root,renderer,dialogs,onChange,onFishCaught,onNotice}){
 const scope=createEventScope(),panel=root.createElement('dialog'),hud=root.createElement('section'),entry=root.createElement('button');
 entry.id='outdoor-menu';entry.setAttribute('aria-controls','outdoor-dialog');entry.setAttribute('aria-haspopup','dialog');entry.type='button';entry.setAttribute('aria-label','打开野外露营与钓鱼');entry.innerHTML='<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 39 23 8 43 39Z" fill="#c8d39b" stroke="#315c43" stroke-width="3"/><path d="m14 39 9-18 10 18" fill="#f6e6b6" stroke="#315c43" stroke-width="2"/></svg><span>野外</span>';root.getElementById('field-menu-items').append(entry);
 panel.id='outdoor-dialog';panel.className='ui-panel ui-page';panel.setAttribute('aria-labelledby','outdoor-title');panel.innerHTML='<header class="ui-panel__header"><div><h2 id="outdoor-title">露营与垂钓</h2><p>把一天留给湖水和晚风</p></div><button class="ui-close" id="outdoor-close" aria-label="关闭野外装备">×</button></header><div class="ui-panel__body" id="outdoor-content"></div><footer class="ui-panel__footer"><p id="outdoor-message" role="status"></p></footer>';root.body.append(panel);
 hud.id='fishing-hud';setHidden(hud,true);hud.setAttribute('aria-label','湖岸钓鱼操作');hud.innerHTML='<div class="fishing-heading"><b id="fishing-phase">湖岸垂钓</b><button class="ui-button" id="fishing-cancel">收竿</button></div><p id="fishing-message" role="status"></p><div id="fishing-meters"><label>鱼线张力 <meter id="fishing-tension" min="0" max="1" low="0.16" high="0.78" optimum="0.45"></meter></label><label>收线进度 <progress id="fishing-progress" max="1"></progress></label></div><label id="fishing-lean-label">左控竿 ← <input id="fishing-lean" type="range" min="-1" max="1" step="0.05" value="0" aria-label="左右控制鱼竿"> → 右控竿</label><button class="ui-button ui-button--primary" id="fishing-control">按住蓄力 · 松手抛竿</button>';root.getElementById('game-frame').append(hud);
 const nearby=root.createElement('button');nearby.id='fishing-nearby';nearby.type='button';nearby.className='ui-button ui-button--primary';nearby.textContent='钓鱼';nearby.setAttribute('aria-label','在湖边钓鱼');setHidden(nearby,true);root.getElementById('game-frame').append(nearby);
 let campOnly=false,message='',held=false,lastPhase='',nextShoreCheck=0;const get=id=>root.getElementById(id);
 const detail=root.createElement('dialog');
 detail.id='outdoor-gear-detail';detail.className='ui-panel ui-panel--compact';detail.setAttribute('aria-labelledby','outdoor-detail-name');
 detail.innerHTML='<header class="ui-panel__header"><h2 id="outdoor-detail-name"></h2><button type="button" class="ui-close" id="outdoor-detail-close" aria-label="关闭道具详情">×</button></header><div class="ui-panel__body"></div>';
 root.body.append(detail);dialogs.register(detail.id,{focusId:'outdoor-detail-close'});
 scope.on(get('outdoor-detail-close'),'click',()=>dialogs.close(detail.id));
 // 详情弹在当前货架上方，关闭时保留滚动位置、购物车及游戏暂停状态。
 function showGearDetail(id){
  const g=OUTDOOR_GEAR[id],p=game.progress.outdoors;
  const specs=[['售价',g.coins+' 金币'],[g.kind==='bait'?'每份重量':'重量',g.mass+' 千克']];
  let usage='在开阔草地展开套装，搭好后可睡到明早，或休息到下一时段。';
  if(g.kind==='rod'){
   specs.push(['鱼竿等级',g.tier+' 阶'],['最高可钓',FISH_RARITIES[g.tier-1]]);
   usage='在「鱼竿与鱼饵」里选好搭配，走到湖岸，按住蓄力后松手抛竿。';
  }else if(g.kind==='bait'){
   specs.push(['每包数量',g.pack+' 份'],['行囊持有',baitCount(p,g.tackleId)+' 份']);
   usage='选用后每次抛竿消耗一份，偏好这种饵料的鱼更容易咬钩。';
  }else if(g.kind==='fish-container'){
   specs.push(['鱼获容量',g.capacity+' 千克'],['数量上限',OUTDOOR_RULES.maxFish+' 条']);usage='取回背包后，在鱼获收纳中选择；钓起鱼后也可手动选择放入鱼桶或渔网。鱼获不占背包负重。';
  }
  get('outdoor-detail-name').textContent=g.name;
  detail.querySelector('.ui-panel__body').innerHTML=`<div class="outdoor-detail-intro">${outdoorGearIcon(g)}<p>${g.description}</p></div><dl class="outdoor-detail-specs">${specs.map(([label,value])=>`<dt>${label}</dt><dd>${value}</dd>`).join('')}</dl><p>${usage}</p>`;
  dialogs.open(detail.id);
 }
 // 来源与价格实时读取正式配置，拥有的装备不会反复出售。
 function renderPanel(){
  const expanded=[...get('outdoor-content').querySelectorAll('details')].map(d=>d.open),scroll=get('outdoor-content').scrollTop;
  const p=game.progress.outdoors,camp=p.camp,shop=game.cottage?.kind==='outdoor';
  get('outdoor-title').textContent=campOnly?'野外营地':'露营与垂钓';
  setHidden(get('outdoor-title').nextElementSibling,campOnly);
  const campSection=`<section class="ui-section">${campOnly?'':`<h3>${camp?'野外营地':'今晚住哪里'}</h3>`}${camp?'':'<p>请在开阔草地上展开套装，或在战车旁驻营。</p>'}${p.tentHull!=null?'<p>露营套装存放在'+vehicleModel(p.tentHull).name+'的仓库中。</p>':storedShopGood(game.progress,'outdoor:tent')?'<p>露营套装已送到小屋仓库，可到仓库取回。</p>':''}${camp?`<p>营地已搭好 · ${camp.mode==='vehicle'?'战车驻营':'帐篷露营'} · ${camp.mapId==='forest'?'晴叶森林':'九寨沟'}</p><div class="outdoor-actions">${campOnly&&worldDistance(game.player,camp)<=OUTDOOR_RULES.campReach?'':'<button class="ui-button" data-outdoor-action="camp-nav">返回营地</button>'}<button class="ui-button" data-outdoor-action="sleep">睡到明早</button><button class="ui-button" data-outdoor-action="nap">休息到下一时段</button><button class="ui-button" data-outdoor-action="pack">收回营地</button></div>`:'<div class="outdoor-actions"><button class="ui-button" data-outdoor-action="vehicle">战车旁驻营</button><button class="ui-button" data-outdoor-action="tent" '+(!p.tent?'disabled':'')+'>展开露营套装</button></div>'}</section>`;
  // 购置后直接装备，已拥有的型号可以在同一柜台免费换装。
  const gliderSection=shop?'<section class="ui-section"><details><summary>选购与更换滑翔伞</summary>'+Object.entries(GLIDERS).map(([id,m])=>{
   const current=p.selectedGlider===id,owned=p.gliders.includes(id);
   return `<article class="outdoor-gear"><div><b>${m.name}</b><p>每层航程 ${balconyGlideMeters(0,m.ratio)} 米 · 航速 ${m.speed/WORLD_UNITS_PER_METER} 米/秒 · 转向 ${Math.round(m.turn*180/Math.PI)}°/秒</p></div><button class="ui-button" data-glider-model="${id}" ${owned?'':'data-shop-name="'+m.name+'" data-shop-price="'+m.price+' 金币" data-shop-place="小屋阳台"'} ${current?'disabled':''}>${current?'已装备':owned?'装备':'加入购物车 · '+m.price+' 金币'}</button></article>`;
  }).join('')+'</details></section>':'';
  const shopSection=`<section class="ui-section"><details><summary class="outdoor-shelf-heading"><span>采购钓具与露营装备</span><small>持有 ${game.progress.coins} 金币</small></summary><div class="outdoor-products">${Object.entries(OUTDOOR_GEAR).map(([id,g])=>outdoorGearCard(game.progress,id,g,shop)).join('')}</div>${shop?'':'<button class="ui-button" data-outdoor-action="shop">前往户外用品店采购</button>'}</details></section>`;
  get('outdoor-content').innerHTML=campOnly?campSection:`${shop?shopSection+gliderSection:''}${fishingTackleMarkup(game)}${fishingStorageMarkup(game)}${fishingSurveyMarkup(game)}${shop?'':shopSection}${campSection}<section class="ui-section"><h3>湖边垂钓</h3><p>按住蓄力，松手抛竿。浮漂轻晃时等待，明显下沉时扬竿。中鱼后按住收线，张力变红就松手；向鱼逃窜的反方向控竿。</p><div class="outdoor-actions"><button class="ui-button" data-outdoor-action="shore">寻找最近湖岸</button><button class="ui-button ui-button--primary" data-outdoor-action="fish" ${fishingAvailability(game).ok?'':'disabled'}>在这里钓鱼</button></div><p>累计钓获 ${p.caught} 条 · 最长 ${p.best} 厘米</p><div class="outdoor-fish-list">${FISH_SPECIES.filter(f=>p.fish[f.id]>0).map(f=>`<span>${f.name} ×${p.fish[f.id]}<small>${f.mass} 千克/条 · ${f.coins} 金币/条</small></span>`).join('')}</div><button class="ui-button" data-outdoor-action="sell" ${!shop?'disabled':''}>出售随身及附近载具鱼获</button></section>`;
  get('outdoor-content').querySelectorAll('details').forEach((d,i)=>{d.open=expanded[i]??(shop&&i===0);});get('outdoor-content').scrollTop=scroll;
  get('outdoor-message').textContent=message||(shop?'':game.outdoorNotice||'营地位置和装备会保存；离线不会自动钓鱼。');
 }
 // 现场动作成功后才关闭准备页；条件不足时原地显示原因，保留关页时恢复游戏的资格。
 function perform(action){
  let result;
  if(action==='shop'||action==='shore'||action==='camp-nav'){
   if(game.cottage?.kind==='mine'){message='请先收起页面，在地下小地图找到湖岸；采购需返回地面补给铺。';renderPanel();return;}
   const site=action==='shop'?{...OUTDOOR_SHOP,y:OUTDOOR_SHOP.y+22}:action==='shore'?fishingShores(game)[0]:game.progress.outdoors.camp;
   if(!site){message='附近暂时找不到可站立的湖岸。';renderPanel();return;}
   requestWorldNavigation(game,site,action==='shore'?'前往湖岸钓鱼':action==='shop'?'购买露营与钓鱼装备':'返回野外营地',{direct:true,arrivalRadius:action==='shore'?OUTDOOR_RULES.castReach:undefined});dialogs.close(panel.id);onChange();return;
  }
  if(action==='fish')result=beginFishing(game);
  if(action==='sleep'||action==='nap')result=sleepAtCamp(game,action==='sleep'?'morning':'phase');
  if(action==='tent'||action==='vehicle')result=deployCamp(game,action);
  if(action==='pack')result=packCamp(game);
  if(action==='sell')result=sellOutdoorFish(game);
  if(action==='survey-accept')result=acceptFishingSurvey(game);
  if(action==='survey-claim')result=claimFishingSurvey(game);
  if(!result)return;
  message=result.message;game.outdoorNotice=message;
  if(result.ok&&['fish','sleep','nap','tent','vehicle','pack'].includes(action)){
   dialogs.close(panel.id);if(action==='pack')onNotice(message);
  }
  else renderPanel();
  onChange();
 }
 dialogs.register(panel.id,{focusId:'outdoor-close',onOpen:renderPanel});
 // 不重建原商店，只嵌入自己的装备页面；返回仍位于售货员所在房间。
 function open(){campOnly=false;message='';get('outdoor-content').replaceChildren();dialogs.open(panel.id);}
 // 营地短按使用与画面相同的世界镜像，摇杆拖动仍由输入系统处理。
 function tapWorld(event){
  const camp=game.progress.outdoors.camp,view=renderer.view;
  if(!camp||camp.mapId!==game.mapId||!view||game.state!=='playing'||game.cottage||game.realm||game.story||game.fireActive||game.campDefense||game.workshopTrial||outdoorBusy(game))return false;
  const rect=renderer.canvas.getBoundingClientRect();
  const point={x:view.x+(event.clientX-rect.left)*view.w/rect.width,y:view.y+(event.clientY-rect.top)*view.h/rect.height};
  const local=nearest(point,camp),dx=local.x-camp.x,dy=local.y-camp.y;
  // 套装覆盖天幕到前排椅子，战车营地只覆盖行军床、灯和桌子。
  if(dx<(camp.kit?-105:-73)||dx>(camp.kit?102:57)||dy<(camp.kit?-90:-81)||dy>(camp.kit?60:30))return false;
  campOnly=true;message=worldDistance(game.player,camp)>OUTDOOR_RULES.campReach?'请走近营地，再休息或收营。':camp.kit?'收营时优先放入附近的载具仓库，其次放入背包。':'可以在行军床上休息。';
  dialogs.open(panel.id);return true;
 }
 scope.on(panel,'change',e=>{const kind=e.target.dataset.fishingEquip;if(!kind)return;const result=equipFishingTackle(game,kind,e.target.value);message=result.message;renderPanel();onChange();});
 scope.on(entry,'click',open);scope.on(get('outdoor-close'),'click',()=>dialogs.close(panel.id));
 // 就地入口直接备竿，实际按下时重新验证装备、危险与位置，防止沿用旧岸点。
 scope.on(nearby,'pointerdown',e=>e.stopPropagation());
 scope.on(nearby,'click',e=>{e.stopPropagation();const result=beginFishing(game);setHidden(nearby,true);nextShoreCheck=0;if(!result.ok)onNotice(result.message);onChange();});
 scope.on(panel,'click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;if(b.dataset.gearDetail){showGearDetail(b.dataset.gearDetail);return;}if(b.dataset.gliderModel){message=selectOutdoorGlider(game,b.dataset.gliderModel).message;renderPanel();onChange();return;}if(b.dataset.outdoorBuy){const result=buyOutdoorGear(game,b.dataset.outdoorBuy);message=result.message;renderPanel();onChange();}if(b.dataset.outdoorAction)perform(b.dataset.outdoorAction);});
 // 取消手势和窗口失焦只释放卷线轮，不把未完成蓄力误判为一次抛竿。
 function release(cancel=false){if(!held)return;held=false;if(cancel||game.state!=='playing'){if(game.fishing){game.fishing.reeling=false;if(game.fishing.phase==='charging')game.fishing.phase='ready';}}else fishingControl(game,'release');}
 const control=get('fishing-control');
 scope.on(control,'pointerdown',e=>{e.preventDefault();e.stopPropagation();held=true;control.setPointerCapture(e.pointerId);fishingControl(game,'press');});
 scope.on(control,'pointermove',e=>{if(held)fishingControl(game,'lean',(e.clientX-control.getBoundingClientRect().left)/control.clientWidth*2-1);});
 scope.on(control,'pointerup',e=>{e.preventDefault();e.stopPropagation();release();});scope.on(control,'pointercancel',()=>release(true));scope.on(control,'lostpointercapture',()=>release(true));
 scope.on(control,'keydown',e=>{if([' ','Enter'].includes(e.key)&&!e.repeat){e.preventDefault();held=true;fishingControl(game,'press');}});scope.on(control,'keyup',e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();release();}});
 scope.on(root.defaultView,'blur',()=>release(true));scope.on(get('fishing-lean'),'input',e=>fishingControl(game,'lean',Number(e.target.value)));
 scope.on(hud,'pointerdown',e=>e.stopPropagation());scope.on(hud,'click',e=>{e.stopPropagation();if(e.target.closest('#fishing-cancel')){fishingControl(game,'cancel');game.campSleep=null;held=false;onChange();}});
 // 低成本刷新文字、进度和显隐，不每帧重建按住中的按钮。
 function renderFrame(){
  const dialogOpen=!!root.querySelector('dialog[open]'),now=performance.now();
  if(game.state!=='playing'||dialogOpen||outdoorBusy(game)||game.vehicle.active||fishingSetup(game).reason){setHidden(nearby,true);nextShoreCheck=0;}
  else if(now>=nextShoreCheck){setHidden(nearby,!fishingAvailability(game).ok);nextShoreCheck=now+OUTDOOR_RULES.shoreRefreshMs;}
  const f=game.fishing,s=game.campSleep,hidden=!outdoorBusy(game)||game.state!=='playing'||dialogOpen;setHidden(hud,hidden);if(hidden){release(true);return;}
  if(f?.phase==='landed'){setHidden(hud,true);release(true);onFishCaught(f);return;}
  const phase=s?'sleeping':f.phase;get('fishing-phase').textContent=s?'林间好梦':({ready:'湖岸垂钓',charging:'蓄力抛竿',casting:'浮漂入水',waiting:'静候鱼讯',nibble:'鱼儿试探',bite:'浮漂下沉！',fight:'稳住鱼竿',landed:'鱼儿上岸',missed:'下次再来'})[phase];
  get('fishing-message').textContent=s?'睡袋暖暖的，天光正在变化……':f.message+(['ready','charging'].includes(phase)?(f.mode==='school'?' 附近鱼群：'+[...new Set(f.schools.map(s=>FISH_SPECIES[s.species].name))].join('、')+'，更容易咬钩。':' 本湖常住鱼正在等待。'):'');
  setHidden(get('fishing-meters'),phase!=='fight');setHidden(get('fishing-lean-label'),phase!=='fight');setHidden(control,['sleeping','landed','missed'].includes(phase));
  if(f){get('fishing-tension').value=f.tension;get('fishing-progress').value=f.progress;control.textContent=phase==='charging'?`蓄力 ${Math.round(f.charge*100)}% · 松手抛竿`:phase==='bite'?'现在扬竿！':phase==='fight'?(f.reeling?'正在收线 · 松手放线':'按住收线 · 左右拖动控竿'):phase==='ready'?'按住蓄力 · 松手抛竿':'等黑漂 · 暂时不要提竿';control.disabled=phase==='casting';hud.dataset.phase=phase;}
  if(lastPhase!==phase){if(phase==='bite')root.defaultView.navigator.vibrate?.([35,35,65]);lastPhase=phase;}
 }
 // 销毁时释放触控与实时动作，防止遗留按住状态。
 function dispose(){release(true);scope.dispose();entry.remove();detail.remove();panel.remove();hud.remove();nearby.remove();}
 return {open,tapWorld,renderFrame,dispose};
}
