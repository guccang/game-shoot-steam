import {escapeHtml as escape} from './shared/html.js';
import {transferItem} from '../core/inventory/inventory-transfer.js';
import {appendRangerLetter} from './ranger-letter.js';
import {drawPhoneResidentPortrait} from '../rendering/living-world.js';
import {drawVehicleIcon} from '../rendering/vehicle.js';
import {ITEM_CATEGORIES} from '../config/items.js';
import {backpackEntries} from '../progression/inventory/backpack.js';
import {catLoad} from '../progression/inventory/load-weight.js';
import {inventoryIcon,paintInventoryIcons} from './inventory-icons.js';
import {useSupplyItem} from '../core/vehicles/supplies.js';
import {vehicleLocations,locateVehicle} from '../core/vehicles/vehicle-location.js';
import {createMailbox} from './mailbox.js';
import {unreadMailCount} from '../progression/camp/mailbox.js';
import {CAMP_CHARACTERS,MONSTER_CAMPS} from '../config/monster-camps.js';
import {FARM_CROPS} from '../config/farm.js';
// 小背包复用手机底板、正式来信与地图，物品详情只在用户操作时更新。
import {createEventScope} from '../platform/events.js';
import {ownsKeepsake} from '../progression/inventory/keepsakes.js';
import {keepsakeIcon} from './keepsake-icons.js';
import {RANGER_LETTER} from '../config/ranger-arrival.js';
import {completeArrivalLetter} from '../core/camp/ranger-arrival.js';
import {facilityOpen} from '../config/town-restoration.js';
import {phoneContacts,phoneUnavailable,callNeighbor,navigatePhone} from '../core/battle/patrol-phone.js';
import {calendarView} from '../world/living-calendar.js';
// 运行时文本转义后插入，联系人、对白和存档内容不能变成HTML。

// 随身格子嵌入角色页，物品详情和手机使用子弹窗，逐层返回保留暂停归属。
export function createKeepsakeBackpack({onWaystations,onTrade,game,root,dialogs,savePreferences,onChange,onNotice,onRepair,onTreasure,onPlaceSprinkler,onTransfer,onCargo}){
 const scope=createEventScope(),phoneTrigger=root.getElementById('phone-button');
 // 所有层级共用统一底板，关闭只退出当前层，不用隐藏正文模拟弹窗。
 function panel(id,title,subtitle){
  const node=root.createElement('dialog');node.id=id+'-dialog';node.className='ui-panel ui-page keepsake-backpack';node.setAttribute('aria-labelledby',id+'-title');
  node.innerHTML=`<header class="ui-panel__header"><div><h2 id="${id}-title">${title}</h2><p>${subtitle}</p></div><button type="button" class="ui-close" id="${id}-close" aria-label="关闭${title}">×</button></header><div class="ui-panel__body"><div class="keepsake-content"></div><p class="keepsake-message" role="status" hidden></p></div><footer class="ui-panel__footer"></footer>`;
  root.body.append(node);scope.on(node.querySelector('.ui-close'),'click',()=>dialogs.close(node.id));return node;
 }
 const bag=root.getElementById('current-cat-dialog'),itemPanel=panel('keepsake','物品详情','重要的东西，随身带好。'),phone=panel('phone','巡林手机','查看季节、时间、天气，或联系邻居。');
 // 搬移原环境节点，保留圆环、实时状态及已有监听；通讯录重绘不会重建图标。
 const environmentStatus=root.getElementById('phone-environment');
 // 手机接管原钱包节点，金额刷新和资源说明沿用既有入口，不创建第二份余额。
 const wallet=root.getElementById('phone-wallet');wallet.hidden=false;
 phone.querySelector('.ui-panel__body').prepend(wallet,environmentStatus);
 phoneTrigger.querySelector('.phone-symbol').innerHTML=keepsakeIcon('patrol-phone');
 let selected='elder-letter',call=null,node=itemPanel,detail,actions,message,inventoryView=false;
 const mailbox=createMailbox({game,root,dialogs,onChange,onClose:()=>{if(phone.open&&!call)render();}});
 // 切换渲染目标仅发生在打开详情时，不干扰底层背包格子。
 function selectPanel(){node=selected==='patrol-phone'&&!inventoryView?phone:itemPanel;detail=node.querySelector('.keepsake-content');actions=node.querySelector('.ui-panel__footer');message=node.querySelector('.keepsake-message');}
 // 动作名称固定，操作区不随着长正文一起滚出屏幕。
 function button(action,label,primary=false){return `<button type="button" class="ui-button${primary?' ui-button--primary':''}" data-pack-action="${action}">${escape(label)}</button>`;}
 // 实际库存按分类自然扩展，不限制格子，也不显示空物品。
 function renderBag(){
  const items=backpackEntries(game),load=catLoad(game);
  bag.querySelector('.keepsake-content').innerHTML=`<section class="ui-inset inventory-load"><b>背包 ${load.weight.toFixed(2)} / ${load.capacity} kg</b><p>${load.overloaded?'载荷已满，只能缓慢行走；存放或清理物品后恢复正常速度。':'随身物品均计入负重。'}载具货舱另计。</p><button class="ui-button" data-pack-cargo>查看载具仓库</button></section>`+Object.entries(ITEM_CATEGORIES).map(([category,name])=>{const group=items.filter(r=>r.category===category);return group.length?`<section class="inventory-group"><h3>${name} <small>${group.length} 种</small></h3><div class="keepsake-pockets" aria-label="${name}">`+group.map(item=>`<button type="button" class="keepsake-pocket" data-keepsake="${item.id}" aria-haspopup="dialog" aria-controls="keepsake-dialog" aria-label="${escape(item.name)}，数量${item.count}，查看信息与重量">${inventoryIcon(item)}<span>${escape(item.name)}</span><small>×${item.count} · ${item.weight.toFixed(2)} kg</small></button>`).join('')+'</div></section>':'';}).join('');
  paintInventoryIcons(bag,game.progress);
 }
 // 每个物品都先展示目录说明、用途和重量；重要物品原有功能保留为详情操作。
 function renderInventoryItem(){
  const item=backpackEntries(game).find(r=>r.id===selected);if(!item)return false;
  detail.innerHTML=`<section class="ui-section inventory-detail"><div class="inventory-detail-icon">${inventoryIcon(item)}</div><small>${ITEM_CATEGORIES[item.category]}</small><h3>${escape(item.name)}</h3><p>${escape(item.description)}</p><div class="ui-inset"><p>数量 ${item.count} · 单件 ${item.mass.toFixed(2)} kg</p><b>总重 ${item.weight.toFixed(2)} kg</b>${item.note?`<p>${escape(item.note)}</p>`:''}</div><h3>用途</h3><p>${escape(item.use)}</p></section>`;
  actions.innerHTML=(selected==='facility:sprinkler'?button('place-sprinkler','选择位置放置',true):item.category==='supply'?button('use-item','使用'+item.name,true):selected==='patrol-phone'?button('open-phone','打开手机',true):selected==='elder-letter'?button('read-letter','阅读来信',true):selected==='house-key'?button('home','标出回家的路',true):'')+(transferItem(selected)?button('transfer','移到载具'): '')+button('close','返回随身物品');paintInventoryIcons(detail,game.progress);return true;
 }
 // 物品详情与手机按用户操作更新，正文不再常驻背包页。
 function render(){
  selectPanel();
  environmentStatus.hidden=inventoryView||selected!=='patrol-phone'||!!call||!ownsKeepsake(game.progress,'patrol-phone');
  message.hidden=true;message.textContent='';
  if(inventoryView){if(!renderInventoryItem()){detail.innerHTML='<p>这件物品已用完。</p>';actions.innerHTML=button('close','返回随身物品',true);}return;}
  // 奇物以营地账本判断持有，不依靠松伯交接状态补发。
  const relic=CAMP_CHARACTERS.find(n=>'camp-relic-'+n.id===selected&&game.progress.monsterCamps.items.includes(n.id));
  if(relic){const camp=MONSTER_CAMPS.find(c=>c.id===relic.camp);detail.innerHTML='<section class="ui-section"><h3>'+escape(relic.item)+'</h3><p>'+escape(relic.reply)+'</p><p>永久效果：清空'+escape(camp.name)+'时，已开放的'+FARM_CROPS[relic.seed].name+'种子额外获得一粒。</p><p>来自'+escape(relic.name)+'的怪线索。物品不会消耗。</p></section>';actions.innerHTML=button('close','收好奇物',true);return;}
  if(!ownsKeepsake(game.progress,selected)){detail.innerHTML='<p>拿到松伯留下的手机后，就能查看地图、联系邻居。</p>';actions.innerHTML=button('close','返回',true);return;}
  if(selected==='elder-letter'){
   detail.innerHTML=`<article class="keepsake-letter"><small>一直留着的叮嘱</small><h3>${escape(RANGER_LETTER.title)}</h3></article>`;
   appendRangerLetter(detail.querySelector('.keepsake-letter'),game.progress);
   actions.innerHTML=button('letter',game.progress.arrival?.phase==='letter'?'读完了，开始巡林':'收好来信',true);
  }else if(selected==='house-key'){
   const repaired=facilityOpen(game.progress,'cottage');
   detail.innerHTML=`<section class="keepsake-key">${keepsakeIcon(selected)}<h3>总有一扇门为你留着</h3><p>松伯留下的房子钥匙。木牌被摸得光滑，绳结还是新的。</p><div class="ui-inset"><b>${repaired?'小屋已经修好了':'小屋还需要修缮'}</b><p>${repaired?'下车后走到门前，站定1秒就能进屋歇脚。':'带上木头来修复小屋。任务修复靠近自动开工，提前修复请在修复页确认。钥匙会一直留在包里。'}</p></div></section>`;
   actions.innerHTML=button('home','标出回家的路',true);
  }else if(call){
   detail.innerHTML=`<section class="keepsake-call" aria-live="polite"><small>${escape(call.status)}</small><h3>${escape(call.name)}</h3><p class="keepsake-location">${escape(call.location)}</p><blockquote>${escape(call.message)}</blockquote><p class="keepsake-help">电话可以问候和问路，交付还要当面完成。</p></section>`;
   actions.innerHTML=button('hangup','挂断')+button('visit','去找'+call.name,true);
  }else{
   const calendar=calendarView(game.progress.living.calendar),reason=phoneUnavailable(game);
   const residents=phoneContacts(game);
   const avatar='<canvas class="phone-avatar" width="80" height="80" aria-hidden="true"></canvas>';
   const vehicles=vehicleLocations(game).map(v=>`
    <button type="button" class="ui-choice" data-locate-vehicle="${v.hull}">${avatar}
     <span><b>${escape(v.name)}</b><small>${escape(v.status)} · ${v.mapId==='forest'?'晴叶森林':'九寨沟'} (${Math.round(v.x)}, ${Math.round(v.y)})</small></span><span>定位</span>
    </button>`).join('');
   const contacts=residents.map(r=>`
    <button type="button" class="ui-choice" data-call="${r.id}" ${reason?'disabled':''}>${avatar}
     <span><b>${escape(r.name)}</b><small>${escape(r.job)}</small></span><span>打电话</span>
    </button>`).join('');
   detail.innerHTML=`<section class="keepsake-phone">
    <div class="keepsake-phone-heading">${keepsakeIcon('patrol-phone')}<div><h3>巡林手机</h3><p>${escape(calendar.label)}</p></div></div>
    <div class="keepsake-apps">${button('trade','订单与商路')}${button('treasure','寻宝')}${button('map','看地图')}${button('waystations','驿站')}${button('home','回小屋')}${button('repair','载具救援')}</div>
    <h3>索敌设定</h3>
    <label class="ui-choice phone-wood"><input type="checkbox" data-target-wood aria-labelledby="phone-wood-label" aria-describedby="phone-wood-help" ${game.gameplayPreferences.targetWood?'checked':''}>
     <span><b id="phone-wood-label">木材</b><small id="phone-wood-help">勾选后，手持枪械优先打敌人，周围没有敌人时打树。手持电锯优先锯树。</small></span></label>
    <label class="ui-choice phone-wood"><input type="checkbox" data-vehicle-target-wood aria-labelledby="phone-vehicle-wood-label" aria-describedby="phone-vehicle-wood-help" ${game.gameplayPreferences.vehicleTargetWood!==false?'checked':''}>
     <span><b id="phone-vehicle-wood-label">车载武器攻击树木</b><small id="phone-vehicle-wood-help">射程内没有敌人时，车载武器会自动攻击树木。</small></span></label>
    <h3>载具定位</h3><div class="keepsake-contacts">${vehicles||'<p>还没有自有载具。</p>'}</div>
    <h3>邻居通讯录</h3>${reason?`<p class="ui-inset">${escape(reason)}</p>`:''}<div class="keepsake-contacts">${contacts}</div>
   </section>`;
   for(const row of detail.querySelectorAll('[data-locate-vehicle]'))drawVehicleIcon(row.querySelector('canvas').getContext('2d'),Number(row.dataset.locateVehicle));
   for(const resident of residents)drawPhoneResidentPortrait(detail.querySelector(`[data-call="${resident.id}"] canvas`),resident);
   detail.querySelector('.keepsake-apps').insertAdjacentHTML('afterbegin',button('mail',`邮件${unreadMailCount(game.progress)?' · '+unreadMailCount(game.progress)+' 未读':''}`));
   actions.innerHTML=button('close',bag.open?'返回随身物品':'收好手机',true);
  }
 }
 // 同一物品切换重置正文位置；不会每帧重建通讯录或打断阅读。
 function resetView(){render();node.querySelector('.ui-panel__body').scrollTop=0;}
 // 导航成功后收起背包，失败保留页面并给出可读原因。
 function navigate(id){const result=navigatePhone(game,id);if(!result.ok){message.textContent=result.message;message.hidden=false;message.scrollIntoView({block:'nearest'});return;}for(const panel of [phone,itemPanel,bag])if(panel.open)dialogs.close(panel.id);onNotice(result.message);onChange();}

 dialogs.register(itemPanel.id,{focusId:'keepsake-close',onOpen:resetView});
 dialogs.register(phone.id,{focusId:'phone-close',onOpen:()=>{selected='patrol-phone';call=null;inventoryView=false;resetView();}});
 // 子页移到父页之后，触控焦点与暂停层级按打开顺序管理。
 function show(panel){if(!panel.open)root.body.append(panel);dialogs.open(panel.id);}
 // 成功保存后立即更新战斗偏好，失败则恢复勾选。
 scope.on(phone,'change',event=>{
  const input=event.target;if(!input.matches('[data-target-wood],[data-vehicle-target-wood]'))return;
  const key=input.hasAttribute('data-vehicle-target-wood')?'vehicleTargetWood':'targetWood';
  if(savePreferences({...game.gameplayPreferences,[key]:input.checked})){
   game.gameplayPreferences[key]=input.checked;
  }else{input.checked=game.gameplayPreferences[key]!==false;onNotice('索敌设定保存失败，请重试。');}
 });
 scope.on(phoneTrigger,'click',()=>{if(!game.arrivalCinematic)show(phone);});
 // 格子打开真实弹窗；返回后原背包的滚动与焦点由原生dialog保留。
 scope.on(bag,'click',event=>{
  if(event.target.closest('[data-pack-cargo]')){onCargo();return;}
  const item=event.target.closest('[data-keepsake]');if(item){selected=item.dataset.keepsake;call=null;inventoryView=true;show(itemPanel);return;}

 });
 // 详情与手机共享已存在的业务动作，地图仍是手机中的子页面。
 function act(event){
  node=event.currentTarget;selectPanel();
  const vehicle=event.target.closest('[data-locate-vehicle]');
  if(vehicle){const result=locateVehicle(game,Number(vehicle.dataset.locateVehicle));if(result.ok){for(const p of [phone,itemPanel,bag])if(p.open)dialogs.close(p.id);onNotice(result.message);onChange();}else{message.textContent=result.message;message.hidden=false;}return;}
  const contact=event.target.closest('[data-call]');if(contact){const result=callNeighbor(game,contact.dataset.call);if(result.ok){call=result;resetView();}else{message.textContent=result.message;message.hidden=false;}return;}
  const action=event.target.closest('[data-pack-action]')?.dataset.packAction;if(!action)return;

  // 先验证选址资格，再退出背包层级；此时设备仍保存在背包。
  if(action==='place-sprinkler'){if(onPlaceSprinkler?.()){for(const p of [itemPanel,bag])if(p.open)dialogs.close(p.id);}return;}
  if(action==='transfer'){onTransfer(selected,'load');return;}
  if(action==='use-item'){const item=backpackEntries(game).find(r=>r.id===selected);if(!item||item.category!=='supply')return;const result=useSupplyItem(game,item.key);renderBag();render();message.textContent=result.message;message.hidden=false;if(result.ok)onChange();return;}
  if(action==='open-phone'){dialogs.close(itemPanel.id);show(phone);return;}
  if(action==='read-letter'){inventoryView=false;resetView();return;}
  if(action==='trade'){onTrade();return;}
  if(action==='waystations'){onWaystations?.();return;}
  if(action==='treasure'&&ownsKeepsake(game.progress,'patrol-phone')){onTreasure();return;}
  if(action==='mail'&&ownsKeepsake(game.progress,'patrol-phone')){mailbox.open();return;}
  if(action==='repair'&&ownsKeepsake(game.progress,'patrol-phone')){onRepair();return;}
  if(action==='map'&&ownsKeepsake(game.progress,'patrol-phone')){show(root.getElementById('map-dialog'));return;}
  if(action==='home'||action==='visit'){navigate(action==='home'?'home':call.id);return;}
  if(action==='hangup'){call=null;resetView();return;}
  if(action==='letter'&&game.progress.arrival?.phase==='letter'&&!completeArrivalLetter(game)){message.textContent='阅读进度保存失败，请重试。';message.hidden=false;message.scrollIntoView({block:'nearest'});return;}
  dialogs.close(node.id);onChange();
 }
 // 装卸货舱后返回随身物品，立即同步真实库存与负重。
 scope.on(root,'close',event=>{if(bag.open&&['logistics-dialog','field-equipment-dialog','load-cleanup-dialog','inventory-transfer-dialog'].includes(event.target.id)){renderBag();if(itemPanel.open&&inventoryView)render();}},true);
 scope.on(itemPanel,'click',act);scope.on(phone,'click',act);
 // 应用销毁清除本实例节点与监听，重载存档不会沿用旧通话。
 function dispose(){scope.dispose();environmentStatus.hidden=true;wallet.hidden=true;root.getElementById('game-frame').append(wallet,environmentStatus);for(const panel of [itemPanel,phone])panel.remove();phoneTrigger.querySelector('.phone-symbol').replaceChildren();}
 return {render:renderBag,dispose:()=>{mailbox.dispose();dispose();}};
}
