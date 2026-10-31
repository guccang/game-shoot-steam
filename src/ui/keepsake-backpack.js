import {vehicleLocations,locateVehicle} from '../core/vehicle-location.js';
import {createMailbox} from './mailbox.js';
import {unreadMailCount} from '../progression/mailbox.js';
import {CAMP_CHARACTERS,MONSTER_CAMPS} from '../config/monster-camps.js';
import {FARM_CROPS} from '../config/farm.js';
// 小背包复用手机底板、正式来信与地图，物品详情只在用户操作时更新。
import {createEventScope} from '../platform/events.js';
import {KEEPSAKES} from '../config/keepsakes.js';
import {ownsKeepsake} from '../progression/keepsakes.js';
import {keepsakeIcon} from './keepsake-icons.js';
import {RANGER_LETTER} from '../config/ranger-arrival.js';
import {completeArrivalLetter} from '../core/ranger-arrival.js';
import {facilityOpen} from '../config/town-restoration.js';
import {phoneContacts,phoneUnavailable,callNeighbor,navigatePhone} from '../core/patrol-phone.js';
import {calendarView} from '../world/living-calendar.js';
// 运行时文本转义后插入，联系人、对白和存档内容不能变成HTML。
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// 背包格子、物品详情和手机使用独立弹窗，逐层返回时保留暂停归属。
export function createKeepsakeBackpack({game,root,dialogs,onChange,onNotice,onRepair,onCargo}){
 const scope=createEventScope(),trigger=root.getElementById('backpack-button'),phoneTrigger=root.getElementById('phone-button');
 // 所有层级共用统一底板，关闭只退出当前层，不用隐藏正文模拟弹窗。
 function panel(id,title,subtitle){
  const node=root.createElement('dialog');node.id=id+'-dialog';node.className='ui-panel ui-page keepsake-backpack';node.setAttribute('aria-labelledby',id+'-title');
  node.innerHTML=`<header class="ui-panel__header"><div><h2 id="${id}-title">${title}</h2><p>${subtitle}</p></div><button type="button" class="ui-close" id="${id}-close" aria-label="关闭${title}">×</button></header><div class="ui-panel__body"><div class="keepsake-content"></div><p class="keepsake-message" role="status" hidden></p></div><footer class="ui-panel__footer"></footer>`;
  root.body.append(node);scope.on(node.querySelector('.ui-close'),'click',()=>dialogs.close(node.id));return node;
 }
 const bag=panel('backpack','小背包','点击格子，查看随身物品。'),itemPanel=panel('keepsake','物品详情','重要的东西，随身带好。'),phone=panel('phone','巡林手机','查看季节、时间、天气，或联系邻居。');
 // 搬移原环境节点，保留圆环、实时状态及已有监听；通讯录重绘不会重建图标。
 const environmentStatus=root.getElementById('phone-environment');
 phone.querySelector('.ui-panel__body').prepend(environmentStatus);
 trigger.querySelector('.backpack-symbol').innerHTML=keepsakeIcon('bag');phoneTrigger.querySelector('.phone-symbol').innerHTML=keepsakeIcon('patrol-phone');
 let selected='elder-letter',call=null,node=itemPanel,detail,actions,message;
 const mailbox=createMailbox({game,root,dialogs,onChange,onClose:()=>{if(phone.open&&!call)render();}});
 // 切换渲染目标仅发生在打开详情时，不干扰底层背包格子。
 function selectPanel(){node=selected==='patrol-phone'?phone:itemPanel;detail=node.querySelector('.keepsake-content');actions=node.querySelector('.ui-panel__footer');message=node.querySelector('.keepsake-message');}
 // 动作名称固定，操作区不随着长正文一起滚出屏幕。
 function button(action,label,primary=false){return `<button type="button" class="ui-button${primary?' ui-button--primary':''}" data-pack-action="${action}">${escape(label)}</button>`;}
 // 背包只展示持有的物品；留空格表达收纳空间，不伪造未获得的道具。
 function renderBag(){
  const items=[...KEEPSAKES.filter(item=>ownsKeepsake(game.progress,item.id)),...CAMP_CHARACTERS.filter(n=>game.progress.monsterCamps.items.includes(n.id)).map(n=>({id:'camp-relic-'+n.id,name:n.item,action:'查看奇物来历与效果',campRelic:true}))];
  bag.querySelector('.keepsake-content').innerHTML='<div class="keepsake-pockets" aria-label="随身物品">'+items.map(item=>`<button type="button" class="keepsake-pocket" data-keepsake="${item.id}" aria-haspopup="dialog" aria-controls="${item.id==='patrol-phone'?'phone-dialog':'keepsake-dialog'}" aria-label="${item.name}，${item.action}">${item.campRelic?'<span aria-hidden="true">✦</span>':keepsakeIcon(item.id)}<span>${item.name}</span></button>`).join('')+'<div class="keepsake-empty" aria-hidden="true"></div>'.repeat(Math.max(0,9-items.length))+'</div>'+(!items.length?'<p>松伯交接后，重要物品会收在这里。</p>':'');
  bag.querySelector('.ui-panel__footer').innerHTML=button('cargo','负重与货舱')+button('close','收好背包',true);
 }
 // 物品详情与手机按用户操作更新，正文不再常驻背包页。
 function render(){
  selectPanel();
  environmentStatus.hidden=selected!=='patrol-phone'||!!call||!ownsKeepsake(game.progress,'patrol-phone');
  message.hidden=true;message.textContent='';
  // 奇物以营地账本判断持有，不依靠松伯交接状态补发。
  const relic=CAMP_CHARACTERS.find(n=>'camp-relic-'+n.id===selected&&game.progress.monsterCamps.items.includes(n.id));
  if(relic){const camp=MONSTER_CAMPS.find(c=>c.id===relic.camp);detail.innerHTML='<section class="ui-section"><h3>'+escape(relic.item)+'</h3><p>'+escape(relic.reply)+'</p><p>永久效果：清空'+escape(camp.name)+'时，已开放的'+FARM_CROPS[relic.seed].name+'种子额外获得一粒。</p><p>来自'+escape(relic.name)+'的怪线索。物品不会消耗。</p></section>';actions.innerHTML=button('close','收好奇物',true);return;}
  if(!ownsKeepsake(game.progress,selected)){detail.innerHTML='<p>拿到松伯留下的手机后，就能查看地图、联系邻居。</p>';actions.innerHTML=button('close','返回',true);return;}
  if(selected==='elder-letter'){
   detail.innerHTML=`<article class="keepsake-letter"><small>一直留着的叮嘱</small><h3>${escape(RANGER_LETTER.title)}</h3>${RANGER_LETTER.paragraphs.map(p=>`<p>${escape(p)}</p>`).join('')}<p class="keepsake-signature">${escape(RANGER_LETTER.signature)}</p></article>`;
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
   detail.innerHTML=`<section class="keepsake-phone"><div class="keepsake-phone-heading">${keepsakeIcon('patrol-phone')}<div><h3>巡林手机</h3><p>${escape(calendar.label)}</p></div></div><div class="keepsake-apps">${button('map','看地图')}${button('home','回小屋')}${button('repair','载具救援')}</div><h3>载具定位</h3><div class="keepsake-contacts">${vehicleLocations(game).map(v=>`<button type="button" class="ui-choice" data-locate-vehicle="${v.hull}"><span><b>${escape(v.name)}</b><small>${escape(v.status)} · ${v.mapId==='forest'?'晴叶森林':'九寨沟'} (${Math.round(v.x)}, ${Math.round(v.y)})</small></span><span>定位</span></button>`).join('')||'<p>还没有自有载具。</p>'}</div><h3>邻居通讯录</h3>${reason?`<p class="ui-inset">${escape(reason)}</p>`:''}<div class="keepsake-contacts">${phoneContacts(game).map(r=>`<button type="button" class="ui-choice" data-call="${r.id}" ${reason?'disabled':''}><span><b>${escape(r.name)}</b><small>${escape(r.job)}</small></span><span>打电话</span></button>`).join('')}</div></section>`;
   detail.querySelector('.keepsake-apps').insertAdjacentHTML('afterbegin',button('mail',`邮件${unreadMailCount(game.progress)?' · '+unreadMailCount(game.progress)+' 未读':''}`));
   actions.innerHTML=button('close',bag.open?'返回背包':'收好手机',true);
  }
 }
 // 同一物品切换重置正文位置；不会每帧重建通讯录或打断阅读。
 function resetView(){render();node.querySelector('.ui-panel__body').scrollTop=0;}
 // 导航成功后收起背包，失败保留页面并给出可读原因。
 function navigate(id){const result=navigatePhone(game,id);if(!result.ok){message.textContent=result.message;message.hidden=false;message.scrollIntoView({block:'nearest'});return;}for(const panel of [phone,itemPanel,bag])if(panel.open)dialogs.close(panel.id);onNotice(result.message);onChange();}
 dialogs.register(bag.id,{focusId:'backpack-close',onOpen:renderBag});
 dialogs.register(itemPanel.id,{focusId:'keepsake-close',onOpen:resetView});
 dialogs.register(phone.id,{focusId:'phone-close',onOpen:()=>{selected='patrol-phone';call=null;resetView();}});
 scope.on(trigger,'click',()=>{if(!game.arrivalCinematic)dialogs.open(bag.id);});
 scope.on(phoneTrigger,'click',()=>{if(!game.arrivalCinematic)dialogs.open(phone.id);});
 // 格子打开真实弹窗；返回后原背包的滚动与焦点由原生dialog保留。
 scope.on(bag,'click',event=>{
  const item=event.target.closest('[data-keepsake]');if(item){selected=item.dataset.keepsake;call=null;dialogs.open(selected==='patrol-phone'?phone.id:itemPanel.id);return;}
  if(event.target.closest('[data-pack-action="close"]'))dialogs.close(bag.id);
  if(event.target.closest('[data-pack-action="cargo"]'))onCargo();
 });
 // 详情与手机共享已存在的业务动作，地图仍是手机中的子页面。
 function act(event){
  node=event.currentTarget;selectPanel();
  const vehicle=event.target.closest('[data-locate-vehicle]');
  if(vehicle){const result=locateVehicle(game,Number(vehicle.dataset.locateVehicle));if(result.ok){for(const p of [phone,itemPanel,bag])if(p.open)dialogs.close(p.id);onNotice(result.message);onChange();}else{message.textContent=result.message;message.hidden=false;}return;}
  const contact=event.target.closest('[data-call]');if(contact){const result=callNeighbor(game,contact.dataset.call);if(result.ok){call=result;resetView();}else{message.textContent=result.message;message.hidden=false;}return;}
  const action=event.target.closest('[data-pack-action]')?.dataset.packAction;if(!action)return;
  if(action==='mail'&&ownsKeepsake(game.progress,'patrol-phone')){mailbox.open();return;}
  if(action==='repair'&&ownsKeepsake(game.progress,'patrol-phone')){onRepair();return;}
  if(action==='map'&&ownsKeepsake(game.progress,'patrol-phone')){dialogs.open('map-dialog');return;}
  if(action==='home'||action==='visit'){navigate(action==='home'?'home':call.id);return;}
  if(action==='hangup'){call=null;resetView();return;}
  if(action==='letter'&&game.progress.arrival?.phase==='letter'&&!completeArrivalLetter(game)){message.textContent='阅读进度保存失败，请重试。';message.hidden=false;message.scrollIntoView({block:'nearest'});return;}
  dialogs.close(node.id);onChange();
 }
 scope.on(itemPanel,'click',act);scope.on(phone,'click',act);
 // 应用销毁清除本实例节点与监听，重载存档不会沿用旧通话。
 function dispose(){scope.dispose();environmentStatus.hidden=true;root.getElementById('game-frame').append(environmentStatus);for(const panel of [bag,itemPanel,phone])panel.remove();trigger.querySelector('.backpack-symbol').replaceChildren();phoneTrigger.querySelector('.phone-symbol').replaceChildren();}
 return {dispose:()=>{mailbox.dispose();dispose();}};
}
