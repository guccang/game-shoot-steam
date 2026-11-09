// 手机寻宝只展示实际听到的线索；探测表读取正式距离，操作使用同一事务入口。
import {TREASURE_SITES,TREASURE_PARTS} from '../config/treasure.js';
import {detectorSignal,treasureAvailable,excavateTreasure,collectTreasurePart} from '../core/activities/treasure.js';
import {vehicleLocations} from '../core/vehicles/vehicle-location.js';
import {cargoAccessible} from '../core/inventory/cargo.js';
import {vehicleLoad} from '../progression/inventory/load-weight.js';
import {requestWorldNavigation} from '../core/navigation/world-navigation.js';
import {AMMO_SHOP} from '../config/supplies.js';
import {createEventScope} from '../platform/events.js';
import {ownsKeepsake} from '../progression/inventory/keepsakes.js';
import {inventoryIcon} from './inventory-icons.js';
import {itemDefinition} from '../config/items.js';
import {worldDistance} from '../world/coordinates.js';
// 独立弹窗和场景信号表共用已有帧循环，不创建额外计时器。
export function createTreasure({game,root,dialogs,onChange,onNotice}){
 const scope=createEventScope(),panel=root.createElement('dialog'),hud=root.createElement('button');let message='',signature='';
 panel.id='treasure-dialog';panel.className='ui-panel ui-page';panel.setAttribute('aria-labelledby','treasure-title');panel.innerHTML='<header class="ui-panel__header"><div><h2 id="treasure-title">寻宝手记</h2><p>听邻居说，沿着线索找</p></div><button class="ui-close" data-treasure-close aria-label="关闭寻宝">×</button></header><div class="ui-panel__body" id="treasure-body"></div><footer class="ui-panel__footer"><p id="treasure-message" role="status"></p><button class="ui-button ui-button--primary" data-detector-toggle></button></footer>';root.body.append(panel);
 hud.id='detector-hud';hud.className='ui-button detector-hud';hud.hidden=true;hud.setAttribute('aria-label','金属探测信号，点击查看或挖掘');root.getElementById('game-frame').append(hud);
 // 收起手机及其子页，归还游戏暂停归属，原世界位置保持不变。
 function closeAll(){for(const id of [panel.id,'phone-dialog','keepsake-dialog','current-cat-dialog'])if(root.getElementById(id)?.open)dialogs.close(id);}
 // 出土以后才展示具体物品；未出土只记录邻居的原话与粗略区域。
 function render(){const t=game.progress.treasure,signal=detectorSignal(game),cars=vehicleLocations(game).filter(v=>cargoAccessible(game,v.hull)&&!game.progress.vehicleService[v.hull]?.phase),known=TREASURE_SITES.filter(s=>t.clues.includes(s.id));
  panel.querySelector('#treasure-body').innerHTML=`<section class="ui-inset treasure-intro"><span class="treasure-art">${inventoryIcon(itemDefinition('metal-detector'))}</span><div><b>${t.detector?'金属探测器已就绪':'先准备金属探测器'}</b><p>${t.detector?'开启后沿线索区域移动，信号越强，埋藏点越近。45米内可挖掘。':'弹药补给铺出售，180金币 / 1.2千克，可反复使用。'}</p>${t.detector?'':'<button class="ui-button" data-detector-shop>前往补给铺</button>'}</div></section><p>线索 ${known.length} / ${TREASURE_SITES.length} · 已寻回 ${t.recovered.length} / ${TREASURE_SITES.length}</p>`+(known.length?'':'<section class="ui-inset"><h3>手记还是空白的</h3><p>与邻居当面聊聊，打电话，或完成委托时留心他们的话。只会记下你真正听过的线索。</p></section>')+known.map(s=>{const found=t.found.includes(s.id),done=t.recovered.includes(s.id),part=TREASURE_PARTS.find(p=>p.kind===s.kind&&p.index===s.index),near=treasureAvailable(game)&&worldDistance(game.player,s)<=100;return `<article class="ui-section treasure-card" data-treasure-site="${s.id}"><small>${s.speaker}的线索 · ${done?'已寻回':found?'已出土，待装载':'待寻找'}</small><h3>${s.title}</h3><blockquote>${s.clue}</blockquote><p>${s.area}</p>${found&&part?`<div class="treasure-found"><span class="treasure-art">${inventoryIcon(itemDefinition(part.id))}</span><div><b>${part.name} · ${part.mass}千克</b><p>${part.description}</p></div></div>`:''}${!done?`<button class="ui-button" data-treasure-nav="${s.id}">${found?'回到出土点':'前往大致区域'}</button>`:''}${signal?.site?.id===s.id&&!done?`<p>探测信号 ${signal.strength}% · ${signal.dig?'就在脚边':'继续移动寻找更强的信号'}</p><progress max="100" value="${signal.strength}" aria-label="探测强度"></progress>${!found?`<button class="ui-button ui-button--primary" data-treasure-dig="${s.id}" ${signal.dig?'':'disabled'}>挖掘</button>`:''}`:''}${found&&!done&&part?`<p>部件留在原地，装车后计入载荷；满载不会自动领取。</p>${near?cars.map(v=>{const load=vehicleLoad(game,v.hull,{driver:true});return `<button class="ui-button" data-treasure-collect="${s.id}" data-hull="${v.hull}">装入${v.name} · 余量${Math.max(0,load.capacity-load.payload).toFixed(1)}千克</button>`;}).join('')||'<p>请把完好的载具开到旁边。</p>':'<p>回到出土点附近才能装载。</p>'}`:''}${done&&s.kind==='vehicle'?'<p>车体出土时已报废。请在手机载具定位查看当前位置，通过救援或牵引送维修中心。</p>':''}</article>`;}).join('');
  const toggle=panel.querySelector('[data-detector-toggle]');toggle.disabled=!t.detector||!treasureAvailable(game);toggle.textContent=game.detectorActive?'关闭探测器':'开启探测，返回大世界';panel.querySelector('#treasure-message').textContent=message;
 }
 // 入口沿用巡林手机的获得条件，其他场景允许阅读已经听过的手记。
 function open(){if(!ownsKeepsake(game.progress,'patrol-phone'))return;message='';if(!panel.open)root.body.append(panel);dialogs.open(panel.id);}
 dialogs.register(panel.id,{focusId:'treasure-title',onOpen:render});scope.on(hud,'click',open);
 scope.on(panel,'click',event=>{const b=event.target.closest('button');if(!b||b.disabled)return;let result;
  if(b.hasAttribute('data-treasure-close'))return dialogs.close(panel.id);
  if(b.hasAttribute('data-detector-toggle')){game.detectorActive=!game.detectorActive;closeAll();onChange();return;}
  if(b.hasAttribute('data-detector-shop')){if(!treasureAvailable(game)){message='请回到森林大世界再导航。';render();return;}requestWorldNavigation(game,{...AMMO_SHOP,y:AMMO_SHOP.y+22},'购买金属探测器',{direct:true});closeAll();return;}
  if(b.dataset.treasureNav){const s=TREASURE_SITES.find(s=>s.id===b.dataset.treasureNav);if(!s||!game.progress.treasure.clues.includes(s.id)||!treasureAvailable(game)){message='请回到森林大世界再按线索探索。';render();return;}const found=game.progress.treasure.found.includes(s.id);requestWorldNavigation(game,{...(found?s:s.region),mapId:s.mapId,id:'treasure-'+s.id,name:found?'出土点':s.area},found?'返回出土点':'前往线索区域',{direct:true});if(game.progress.treasure.detector)game.detectorActive=true;closeAll();onNotice('已标出搜索区域；用探测器继续寻找埋藏点。');return;}
  if(b.dataset.treasureDig)result=excavateTreasure(game,b.dataset.treasureDig);
  if(b.dataset.treasureCollect)result=collectTreasurePart(game,b.dataset.treasureCollect,Number(b.dataset.hull));
  if(result){message=result.message;render();onChange();}
 });
 // 每帧只更新变化的信号文案；暂停、进屋和活动会自动收起探测表。
 function update(){const signal=game.state==='playing'&&!root.querySelector('dialog[open]')?detectorSignal(game):null;hud.hidden=!signal;if(!signal)return;const text=signal.site?`${signal.dig?'强信号 · 点击挖掘':'金属信号'} ${signal.strength}%`:'探测中 · 暂无信号';if(signature!==text){signature=text;hud.innerHTML=inventoryIcon(itemDefinition('metal-detector'))+`<span>${text}<progress max="100" value="${signal.strength}"></progress></span>`;}}
 // 应用卸载释放节点及事件，探测开启状态不写入持久档。
 function dispose(){scope.dispose();panel.remove();hud.remove();game.detectorActive=false;}
 return {open,update,dispose};
}
