// 按层施工与场景乘梯共用手机底板，楼层再多也不创建全量按钮列表。
import {createEventScope} from '../platform/events.js';
import {buildHome,travelHomeFloor} from '../core/home-construction.js';
import {approachCottageTarget} from '../core/scene-approach.js';
import {HOME_BUILD_PRICES,HOME_DIRECTIONS,HOME_ELEVATOR,homeFloors,floorBalconies,elevatorFloors,hasHomeElevator} from '../config/home-construction.js';
import {cottageFloor} from '../config/cottage.js';

// 保存事务由规则层校验，面板保留按层费用、拆除确认及有效楼层输入。
export function createHomeConstruction({game,root,panel,dialogs,input,onChange}){
 const scope=createEventScope(),dialog=root.createElement('dialog'),entry=root.createElement('button');
 let mode='travel',message='',buildFloor=0,balconyFloor=1,balconySide='north',removeFloor=null,pendingWalk=null;
 entry.id='home-travel-open';entry.className='ui-button';entry.textContent='楼层设施';panel.querySelector('footer').append(entry);
 dialog.id='home-construction-dialog';dialog.className='ui-panel ui-page';dialog.setAttribute('aria-labelledby','home-construction-title');
 dialog.innerHTML='<header class="ui-panel__header"><div><h2 id="home-construction-title" tabindex="-1"></h2><p id="home-construction-summary"></p></div><button class="ui-close" data-build-close aria-label="关闭建筑服务">×</button></header><div class="ui-panel__body" id="home-construction-content"></div><footer class="ui-panel__footer"><p id="home-construction-message" role="status"></p></footer>';root.body.append(dialog);
 const get=id=>root.getElementById('home-construction-'+id);
 // 只在开页或操作后重画，输入过程中不被每帧覆盖。
 function paint(){
  const h=game.progress.homeDecor,floors=homeFloors(h),floor=cottageFloor(game.cottage);
  get('title').textContent=mode==='build'?'森筑建筑公司':'小屋楼层设施';
  get('summary').textContent=`已建 ${floors} 层 · ${mode==='build'?`金币 ${game.progress.coins} · 木材 ${game.progress.wood}`:`当前第 ${floor+1} 楼`}`;get('message').textContent=message;
  if(mode==='build'){
   const price=kind=>`${HOME_BUILD_PRICES[kind].coins} 金币 + ${HOME_BUILD_PRICES[kind].wood} 木材`;
   const valid=Number.isSafeInteger(buildFloor)&&buildFloor>=0&&buildFloor<floors,installed=valid&&hasHomeElevator(h,buildFloor),lifts=elevatorFloors(h);
   get('content').innerHTML=`<section class="ui-section"><h3>向上加盖</h3><p>每次增加一整层，默认接通上下楼梯。</p><button class="ui-button" data-build="floor">加盖第 ${floors+1} 楼 · ${price('floor')}</button></section>
    <section class="ui-section"><h3>本层电梯</h3><p>每层单独付费，安装后替换该层楼梯。可直达全部已建楼层，未安装的楼层仍用楼梯。</p><label>施工楼层 <input id="home-build-elevator-floor" type="number" inputmode="numeric" min="1" max="${floors}" value="${valid?buildFloor+1:''}" step="1"></label><p id="home-elevator-status">${valid?`第 ${buildFloor+1} 楼 · ${installed?'已安装电梯':'使用楼梯'}`:'请输入有效的已建楼层'}</p>
    <button class="ui-button" data-build="elevator" ${!valid||installed?'disabled':''}>安装本层电梯 · ${price('elevator')}</button>
    <button class="ui-button" data-remove-elevator ${installed?'':'hidden'}>拆除本层电梯</button>
    <div id="home-elevator-removal">${removeFloor===buildFloor&&installed?`<div class="ui-inset"><p>确认拆除第 ${buildFloor+1} 楼电梯？本层恢复楼梯，已花费的金币和木材不返还。</p><button class="ui-button ui-button--danger" data-build="remove-elevator">确认拆除第 ${buildFloor+1} 楼电梯</button><button class="ui-button" data-cancel-remove>保留电梯</button></div>`:''}</div>
    <p>已安装 ${lifts.length} 层${lifts.length?'：'+lifts.slice(0,8).map(f=>f+1+'楼').join('、')+(lifts.length>8?'…':''):''}</p></section>
    <section class="ui-section"><h3>四向大阳台</h3><p>每层可分别安装。走到门口即可出屋，眺望真实营地。</p><label>楼层 <input id="home-build-floor" type="number" inputmode="numeric" min="1" max="${floors}" value="${Math.min(floors,balconyFloor+1)}" step="1"></label><label>朝向 <select id="home-build-side">${Object.entries(HOME_DIRECTIONS).map(([id,d])=>`<option value="${id}" ${id===balconySide?'selected':''}>${d.name}侧</option>`).join('')}</select></label><button class="ui-button" data-build="balcony">加装大阳台 · ${price('balcony')}</button><p>已建阳台 ${Object.values(h.balconies||{}).reduce((n,s)=>n+s.length,0)} 处</p></section>`;
  }else{
   const lift=hasHomeElevator(h,floor),near=Math.hypot(game.player.x-HOME_ELEVATOR.landing.x,game.player.y-HOME_ELEVATOR.landing.y)<=HOME_ELEVATOR.radius;
   get('content').innerHTML=`<section class="ui-section"><h3>${lift?'本层电梯':'本层楼梯'}</h3>${lift?`<p>点击场景电梯会自动走近。电梯可前往全部已建楼层。</p><label>目标楼层 <input id="home-lift-floor" type="number" inputmode="numeric" min="1" max="${floors}" value="${floor+1<floors?floor+2:floor}" step="1"></label><button class="ui-button" ${near?'data-lift':'data-walk-elevator'}>${near?'乘电梯前往':'走到电梯门前'}</button>`:'<p>点击右侧上行踏步或下行梯井，猫猫会走到对应入口并站定一秒通行。也可直接走到入口，无需打开本页。</p><p>本层可在建筑公司付费安装电梯。</p>'}</section><section class="ui-section"><h3>本层阳台</h3><p>${floorBalconies(h,floor).map(s=>HOME_DIRECTIONS[s].name+'侧').join('、')||'尚未安装'}。走到对应门口站定一秒，走出后可在平台自由活动。</p></section>`;
  }
 }
 dialogs.register(dialog.id,{focusId:'home-construction-title',onOpen:paint});
 // 场景电梯候停与手动查看设施共用入口，阳台和睡眠不能远程乘梯。
 function open(next='build'){
  if(next==='build'?game.cottage?.kind!=='construction':game.cottage?.kind!=='cottage'||game.cottage.balcony||game.cottage.sleep||game.player.hp<=0)return;
  mode=next;message='';removeFloor=null;input.reset();dialogs.open(dialog.id);
 }
 scope.on(entry,'click',()=>open('travel'));
 // 输入楼层时只更新状态和按钮，保留输入框及点击目标，避免失焦后首次触摸丢失。
 scope.on(dialog,'input',event=>{
  if(event.target.id==='home-build-elevator-floor'){
   buildFloor=Number(event.target.value)-1;removeFloor=null;
   const valid=Number.isSafeInteger(buildFloor)&&buildFloor>=0&&buildFloor<homeFloors(game.progress.homeDecor),installed=valid&&hasHomeElevator(game.progress.homeDecor,buildFloor);
   root.getElementById('home-elevator-status').textContent=valid?`第 ${buildFloor+1} 楼 · ${installed?'已安装电梯':'使用楼梯'}`:'请输入有效的已建楼层';
   dialog.querySelector('[data-build="elevator"]').disabled=!valid||installed;dialog.querySelector('[data-remove-elevator]').hidden=!installed;root.getElementById('home-elevator-removal').replaceChildren();
  }else if(event.target.id==='home-build-floor')balconyFloor=Number(event.target.value)-1;
 });
 scope.on(dialog,'change',event=>{if(event.target.id==='home-build-side')balconySide=event.target.value;});
 scope.on(dialog,'click',event=>{
  const b=event.target.closest('button');if(!b||b.disabled)return;
  if(b.hasAttribute('data-build-close')){dialogs.close(dialog.id);return;}
  if(b.hasAttribute('data-remove-elevator')){removeFloor=buildFloor;paint();return;}
  if(b.hasAttribute('data-cancel-remove')){removeFloor=null;paint();return;}
  if(b.dataset.build){
   if(b.dataset.build==='remove-elevator'&&removeFloor!==buildFloor)return;
   const r=buildHome(game,b.dataset.build,{floor:b.dataset.build==='balcony'?balconyFloor:buildFloor,side:balconySide});message=r.message;if(r.ok){removeFloor=null;onChange();}paint();return;
  }
  if(b.hasAttribute('data-walk-elevator')){pendingWalk={room:game.cottage,floor:cottageFloor(game.cottage)};dialogs.close(dialog.id);return;}
  if(!b.hasAttribute('data-lift'))return;
  const target=Number(root.getElementById('home-lift-floor').value)-1;
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
 function dispose(){if(dialog.open)dialogs.close(dialog.id);scope.dispose();dialog.remove();entry.remove();}
 return {open,render,dispose};
}
