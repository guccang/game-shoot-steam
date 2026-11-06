import {createHomeFloorPicker} from './home-floor-picker.js';
import {constructionWood} from '../progression/resource-wallet.js';
// 按层施工与场景乘梯共用手机底板，楼层再多也不创建全量按钮列表。
import {createEventScope} from '../platform/events.js';
import {buildHome,travelHomeFloor} from '../core/home-construction.js';
import {approachCottageTarget} from '../core/scene-approach.js';
import {HOME_BUILD_PRICES,HOME_DIRECTIONS,HOME_ELEVATOR,homeFloors,floorBalconies,homeElevatorPlan,hasHomeElevator} from '../config/home-construction.js';
import {cottageFloor} from '../config/cottage.js';

// 保存事务由规则层校验，电梯自动按顺序施工与拆除，面板保留按层费用和拆除确认。
export function createHomeConstruction({game,root,panel,dialogs,input,onChange}){
 const scope=createEventScope(),dialog=root.createElement('dialog'),entry=root.createElement('button');
 let mode='travel',message='',balconyFloor=1,balconySide='north',removeFloor=null,pendingWalk=null,floorPicker=null,liftFloor=null;
 entry.id='home-travel-open';entry.className='ui-button';entry.textContent='楼层设施';panel.querySelector('footer').append(entry);
 dialog.id='home-construction-dialog';dialog.className='ui-panel ui-page';dialog.setAttribute('aria-labelledby','home-construction-title');
 dialog.innerHTML='<header class="ui-panel__header"><div><h2 id="home-construction-title" tabindex="-1"></h2><p id="home-construction-summary"></p></div><button class="ui-close" data-build-close aria-label="关闭建筑服务">×</button></header><div class="ui-panel__body" id="home-construction-content"></div><footer class="ui-panel__footer"><p id="home-construction-message" role="status"></p></footer>';root.body.append(dialog);
 const get=id=>root.getElementById('home-construction-'+id);
 // 只在开页或操作后重画，输入过程中不被每帧覆盖。
 function paint(){
  floorPicker?.dispose();floorPicker=null;dialog.querySelector('[data-lift],[data-walk-elevator]')?.remove();
  const h=game.progress.homeDecor,floors=homeFloors(h),floor=cottageFloor(game.cottage);
  get('title').textContent=mode==='build'?'森筑建筑公司':'小屋楼层设施';
  get('summary').textContent=`已建 ${floors} 层 · ${mode==='build'?`金币 ${game.progress.coins} · 木材 ${constructionWood(game.progress)}（背包 ${game.progress.logistics.bagWood}＋仓库 ${game.progress.wood}）`:`当前第 ${floor+1} 楼`}`;get('message').textContent=message;
  if(mode==='build'){
   const price=kind=>`${HOME_BUILD_PRICES[kind].coins} 金币 + ${HOME_BUILD_PRICES[kind].wood} 木材`;
   const {lifts,installFloor,removeFloor:highest}=homeElevatorPlan(h);
   get('content').innerHTML=`<section class="ui-section"><h3>地下室与矿道</h3><p>小屋一楼接通地下室，自带矿锄。可持续挖矿、开地表洞口、铺轨与驾驶矿车。</p><button class="ui-button" data-build="basement" ${h.basement?'disabled':''}>${h.basement?'地下室已建成':'创建地下室 · '+price('basement')}</button></section><section class="ui-section"><h3>向上加盖</h3><p>一、二楼留给栗子。三楼起，每位新伙伴需要一层房间。加盖后可到猫窝招募。</p><button class="ui-button" data-build="floor">加盖第 ${floors+1} 楼 · ${price('floor')}</button></section>
    <section class="ui-section" id="home-elevator-section"><h3>电梯施工</h3><p>每次安装一层，从最高已装电梯层继续向上；拆除从最高已装层向下进行。每层单独付费，安装后替换该层楼梯，可直达全部已建楼层。</p><p id="home-elevator-status">${installFloor!==null?`下一层施工：第 ${installFloor+1} 楼`:'电梯已装至最高楼层，继续施工请先加盖楼层。'}</p>
    <button class="ui-button" data-build="elevator" ${installFloor===null?'disabled':''}>${installFloor===null?'已装至最高楼层':`安装第 ${installFloor+1} 楼电梯 · ${price('elevator')}`}</button>
    <button class="ui-button" data-remove-elevator ${highest===null?'disabled':''}>${highest===null?'暂无电梯可拆除':`拆除第 ${highest+1} 楼电梯`}</button>
    <div id="home-elevator-removal">${removeFloor!==null&&removeFloor===highest?`<div class="ui-inset"><p>确认拆除第 ${removeFloor+1} 楼电梯？本层恢复楼梯，已花费的金币和木材不返还。</p><button class="ui-button ui-button--danger" data-build="remove-elevator">确认拆除第 ${removeFloor+1} 楼电梯</button><button class="ui-button" data-cancel-remove>保留电梯</button></div>`:''}</div>
    <p>已安装 ${lifts.length} 层${lifts.length?'：'+lifts.slice(0,8).map(f=>f+1+'楼').join('、')+(lifts.length>8?'…':''):''}</p></section>
    <section class="ui-section"><h3>四向大阳台</h3><p>每层可分别安装。走到门口即可出屋，眺望真实营地。</p><div id="home-balcony-floor-picker"></div><p id="home-balcony-status"></p><div id="home-build-side" class="home-balcony-directions" role="group" aria-label="阳台朝向" aria-describedby="home-balcony-status">${['east','south','west','north'].map(id=>`<button type="button" class="ui-button" data-balcony-side="${id}" aria-pressed="false"><span>${HOME_DIRECTIONS[id].name}</span><small></small></button>`).join('')}</div><button class="ui-button" data-build="balcony">加装大阳台 · ${price('balcony')}</button><p>已建阳台 ${Object.values(h.balconies||{}).reduce((n,s)=>n+s.length,0)} 处</p></section>`;
   // 施工窗口与乘梯窗口共用选择规则，重画时保留所选层与朝向。
   floorPicker=createHomeFloorPicker(root.getElementById('home-balcony-floor-picker'),{floors,value:balconyFloor,id:'home-build-floor',label:'阳台施工楼层',onChange:target=>{balconyFloor=target;updateBalconyDirections();}});
  }else{
   const lift=hasHomeElevator(h,floor),near=Math.hypot(game.player.x-HOME_ELEVATOR.landing.x,game.player.y-HOME_ELEVATOR.landing.y)<=HOME_ELEVATOR.radius;
   get('content').innerHTML=`<section class="ui-section"><h3>${lift?'本层电梯':'本层楼梯'}</h3>${lift?`<p>点击场景电梯会自动走近。电梯可前往全部已建楼层。</p><div id="home-floor-picker"></div>`:'<p>点击右侧上行踏步或下行梯井，猫猫会走到对应入口并站定一秒通行。也可直接走到入口，无需打开本页。</p><p>本层可在建筑公司付费安装电梯。</p>'}</section><section class="ui-section"><h3>本层阳台</h3><p>${floorBalconies(h,floor).map(s=>HOME_DIRECTIONS[s].name+'侧').join('、')||'尚未安装'}。走到对应门口站定一秒，走出后可在平台自由活动。</p></section>`;
   if(lift){
    // 乘梯操作固定在底栏，短屏滑动选层时也能直接出发。
    const button=root.createElement('button');button.className='ui-button ui-button--primary';button.setAttribute(near?'data-lift':'data-walk-elevator','');dialog.querySelector('footer').prepend(button);
    floorPicker=createHomeFloorPicker(root.getElementById('home-floor-picker'),{floors,current:floor,value:liftFloor??(floor+1<floors?floor+1:floor-1),onChange:target=>{liftFloor=target;button.disabled=target===floor;button.textContent=near?'乘电梯前往第 '+(target+1)+' 楼':'走到电梯门前';}});
   }
  }
 }
 // 当前施工楼层的四向状态直接读取存档；只更新按钮，不重画滑动窗口。
 function updateBalconyDirections(){
  const group=root.getElementById('home-build-side');if(!group)return;
  const built=floorBalconies(game.progress.homeDecor,balconyFloor),price=HOME_BUILD_PRICES.balcony;
  root.getElementById('home-balcony-status').textContent='第 '+(balconyFloor+1)+' 楼 · 已建 '+built.length+'/4 个方向';
  for(const button of group.querySelectorAll('[data-balcony-side]')){
   const side=button.dataset.balconySide,done=built.includes(side),status=done?'已建好':'可建造';
   button.dataset.built=String(done);button.setAttribute('aria-pressed',String(side===balconySide));button.setAttribute('aria-label',HOME_DIRECTIONS[side].name+'侧，'+status);button.querySelector('small').textContent=(done?'✓ ':'')+status;
  }
  const action=dialog.querySelector('[data-build="balcony"]'),done=built.includes(balconySide),place='第 '+(balconyFloor+1)+' 楼'+HOME_DIRECTIONS[balconySide].name+'侧';
  action.disabled=done;action.textContent=done?place+'阳台已建好':'加装'+place+'阳台 · '+price.coins+' 金币 + '+price.wood+' 木材';
 }
 dialogs.register(dialog.id,{focusId:'home-construction-title',onOpen:paint});
 // 场景电梯候停与手动查看设施共用入口，阳台和睡眠不能远程乘梯。
 function open(next='build'){
  if(next==='build'?game.cottage?.kind!=='construction':game.cottage?.kind!=='cottage'||game.cottage.balcony||game.cottage.sleep||game.player.hp<=0)return;
  // 手动选层也消费门前候停请求，关闭后须离开或再次点电梯才重新呼叫。
  if(next==='travel'&&hasHomeElevator(game.progress.homeDecor,cottageFloor(game.cottage))&&Math.hypot(game.player.x-HOME_ELEVATOR.landing.x,game.player.y-HOME_ELEVATOR.landing.y)<=HOME_ELEVATOR.radius){game.cottage.elevatorRequest=false;game.cottage.elevatorElapsed=null;game.cottage.elevatorLatch=true;}
  mode=next;message='';removeFloor=null;input.reset();dialogs.open(dialog.id);
 }
 scope.on(entry,'click',()=>open('travel'));

 scope.on(dialog,'click',event=>{
  const b=event.target.closest('button');if(!b||b.disabled)return;
  // 四向按钮直接选中，已建方向仍可查看，但施工按钮保持禁用。
  if(b.dataset.balconySide&&Object.hasOwn(HOME_DIRECTIONS,b.dataset.balconySide)){balconySide=b.dataset.balconySide;updateBalconyDirections();return;}
  if(b.hasAttribute('data-build-close')){dialogs.close(dialog.id);return;}
  if(b.hasAttribute('data-remove-elevator')){removeFloor=homeElevatorPlan(game.progress.homeDecor).removeFloor;paint();return;}
  if(b.hasAttribute('data-cancel-remove')){removeFloor=null;paint();return;}
  if(b.dataset.build){
   // 确认期间最高层发生变化时重新展示，不把旧确认用于另一层。
   if(b.dataset.build==='remove-elevator'&&(removeFloor===null||removeFloor!==homeElevatorPlan(game.progress.homeDecor).removeFloor)){removeFloor=null;message='电梯楼层已变化，请重新确认拆除。';paint();return;}
   const r=buildHome(game,b.dataset.build,{floor:b.dataset.build==='balcony'?balconyFloor:undefined,side:balconySide});message=r.message;if(r.ok){removeFloor=null;onChange();}paint();return;
  }
  if(b.hasAttribute('data-walk-elevator')){pendingWalk={room:game.cottage,floor:cottageFloor(game.cottage)};dialogs.close(dialog.id);return;}
  if(!b.hasAttribute('data-lift'))return;
  const target=floorPicker.value;
  if(travelHomeFloor(game,target,'elevator')){dialogs.close(dialog.id);onChange();}else{message='请靠近电梯，选择其他已建楼层。';get('message').textContent=message;}
 });
 // 关闭说明后由统一弹窗恢复游戏，再安排走近；正式候停请求只消费一次。
 function render(){
  const room=game.cottage;entry.hidden=room?.kind!=='cottage'||!!room.balcony;entry.disabled=!!room?.sleep;
  if(pendingWalk&&(pendingWalk.room!==room||pendingWalk.floor!==cottageFloor(room)))pendingWalk=null;
  if(pendingWalk&&!dialog.open&&game.state==='playing'){pendingWalk=null;approachCottageTarget(game,'elevator');}
  if(room?.elevatorRequest&&game.state==='playing'&&!root.querySelector('dialog[open]')){room.elevatorRequest=false;open('travel');}
  if(dialog.open&&!(mode==='build'?room?.kind==='construction':room?.kind==='cottage'&&!room.balcony&&!room.sleep))dialogs.close(dialog.id);
 }
 // 离开应用释放原生对话框与监听。
 function dispose(){floorPicker?.dispose();if(dialog.open)dialogs.close(dialog.id);scope.dispose();dialog.remove();entry.remove();}
 return {open,render,dispose};
}
