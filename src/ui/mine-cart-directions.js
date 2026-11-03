// 停车和路口选向共用手机紧凑底板，关闭弹窗后再提交正式规则。
import {createEventScope} from '../platform/events.js';
import {MINE_DIRECTIONS} from '../config/mining.js';
import {railExits} from '../config/mine-rail-routes.js';
import {currentMineLayer} from '../core/mine-layers.js';
import {mineInputDirection,nearbyJunction,stoppedCartChoices,setMineCartDirection,setMineJunctionDirection} from '../core/mine-cart-directions.js';
// 稳定节点承载方向和禁用状态，只有打开页面时读取候选出口。
export function createMineCartDirections({game,root,controls,input,dialogs}){
 const scope=createEventScope(),button=root.createElement('button'),dialog=root.createElement('dialog');
 let selection=null,pending=null,pointer=null,stickDirection=null,heldKey=null;
 button.id='mine-route';button.className='ui-button';button.textContent='路口方向';controls.querySelector('.mine-actions').append(button);
 dialog.id='mine-direction-dialog';dialog.className='ui-panel ui-panel--compact';dialog.setAttribute('aria-labelledby','mine-direction-title');
 dialog.innerHTML=`<header class="ui-panel__header"><div><h2 id="mine-direction-title" tabindex="-1">路口方向</h2><p id="mine-direction-status"></p></div><button class="ui-close" data-route-close aria-label="关闭方向选择">×</button></header><div class="ui-panel__body"><section class="ui-section"><p id="mine-direction-help"></p><div class="mine-direction-grid"><div id="mine-direction-stick" role="group" aria-label="方向摇杆，拖向目标方向后松手"><span>拖动</span><i></i></div>${MINE_DIRECTIONS.map((d,i)=>`<button class="ui-button" data-route-direction="${i}" aria-pressed="false">${['↑','→','↓','←'][i]} 向${d.name}</button>`).join('')}</div><button class="ui-button mine-route-auto" data-route-auto>恢复自动选路</button><p class="mine-route-note">无轨方向不可选。自动选路：直行 → 右转 → 左转 → 折返。</p></section></div><footer class="ui-panel__footer"><button class="ui-button" data-route-close>返回矿道</button></footer>`;
 root.body.append(dialog);dialogs.register(dialog.id,{focusId:'mine-direction-title'});
 scope.on(button,'click',()=>{
  if(button.disabled||game.state!=='playing')return;
  const room=game.cottage,key=nearbyJunction(game),cart=currentMineLayer(game).carts.find(c=>c.id===room.ride);
  if(!cart&&!key)return;
  selection={room,depth:room.depth||1,cartId:cart?.id,key};
  const choices=cart?stoppedCartChoices(game):railExits(currentMineLayer(game),key),chosen=cart?(cart.departure??cart.heading):currentMineLayer(game).junctions?.[key];
  root.getElementById('mine-direction-title').textContent=cart?'停车 · 开车方向':'交叉路口方向';
  root.getElementById('mine-direction-status').textContent=cart?'选择后保持停车，点击「开车」出发。':`地下 ${room.depth||1} 层 · 路口 ${key} · ${Number.isInteger(chosen)?'当前向'+MINE_DIRECTIONS[chosen].name:'当前自动'}`;
  root.getElementById('mine-direction-help').textContent=cart?'拖动摇杆，或按方向键 / WASD 选择。停车时在矿道中也能直接选向。':'拖动摇杆、按方向键 / WASD 或点击方向。保存后矿车经过此路口时采用。';
  for(const b of dialog.querySelectorAll('[data-route-direction]')){const i=Number(b.dataset.routeDirection);b.disabled=!choices.some(n=>n.i===i);b.setAttribute('aria-pressed',String(i===chosen));}
  const auto=dialog.querySelector('[data-route-auto]');auto.hidden=!!cart;auto.setAttribute('aria-pressed',String(!cart&&!Number.isInteger(chosen)));
  resetStick();input.reset();dialogs.open(dialog.id);
 });
 scope.on(dialog,'click',event=>{
  const b=event.target.closest('button');if(!b||b.disabled)return;
  if(b.hasAttribute('data-route-close')){dialogs.close(dialog.id);return;}
  if(b.hasAttribute('data-route-direction')||b.hasAttribute('data-route-auto')){
   choose(b.hasAttribute('data-route-auto')?null:Number(b.dataset.routeDirection));
  }
 });
 const stick=root.getElementById('mine-direction-stick'),thumb=stick.querySelector('i');
 // 松手和键盘共用合法出口检查，无轨方向只提示，不关闭页面。
 function choose(direction){
  if(!selection||!dialog.open)return;
  const button=direction===null?dialog.querySelector('[data-route-auto]'):dialog.querySelector('[data-route-direction="'+direction+'"]');
  if(!button||button.hidden||button.disabled){root.getElementById('mine-direction-status').textContent='这个方向没有相连轨道，请选择可用方向。';return;}
  pending={...selection,direction};resetStick();input.reset();dialogs.close(dialog.id);
 }
 // 重置指针捕获和视觉偏移，关闭、取消与切层不会残留摇杆状态。
 function resetStick(){
  if(pointer!==null&&stick.hasPointerCapture(pointer))stick.releasePointerCapture(pointer);
  pointer=null;stickDirection=null;thumb.style.transform='translate(0,0)';
 }
 // 将指针相对摇杆中心的距离转换为归一化主方向。
 function moveStick(event){
  const r=stick.getBoundingClientRect(),x=(event.clientX-r.left-r.width/2)/28,y=(event.clientY-r.top-r.height/2)/28,length=Math.max(1,Math.hypot(x,y));
  stickDirection=mineInputDirection({x,y});thumb.style.transform='translate('+x/length*22+'px,'+y/length*22+'px)';
 }
 scope.on(stick,'pointerdown',event=>{if(pointer!==null||event.button!==0)return;event.preventDefault();pointer=event.pointerId;stick.setPointerCapture(pointer);moveStick(event);});
 scope.on(stick,'pointermove',event=>{if(event.pointerId===pointer)moveStick(event);});
 scope.on(stick,'pointerup',event=>{if(event.pointerId!==pointer)return;moveStick(event);const direction=stickDirection;resetStick();if(direction!==null)choose(direction);});
 scope.on(stick,'pointercancel',resetStick);
 scope.on(stick,'lostpointercapture',resetStick);
 scope.on(dialog,'close',()=>{if(!dialog.open){resetStick();input.reset();selection=null;}});
 // 用物理键位兼容中文输入法；重复按键不穿透到关闭后的世界输入。
 scope.on(root.defaultView,'keydown',event=>{
  const direction={ArrowUp:0,KeyW:0,ArrowRight:1,KeyD:1,ArrowDown:2,KeyS:2,ArrowLeft:3,KeyA:3}[event.code];
  if(direction===undefined||event.ctrlKey||event.altKey||event.metaKey)return;
  if(!dialog.open&&heldKey!==event.code)return;
  event.preventDefault();event.stopImmediatePropagation();if(dialog.open&&!event.repeat){heldKey=event.code;choose(direction);}
 },{capture:true});
 scope.on(root.defaultView,'keyup',event=>{if(event.code===heldKey)heldKey=null;});
 scope.on(root.defaultView,'blur',()=>{heldKey=null;resetStick();});
 // 切房间、切层或换车后废弃旧选择，不让过期弹窗修改另一个路口。
 function render(){
  const room=game.cottage;
  if(room?.kind!=='mine'){pending=null;selection=null;if(dialog.open)dialogs.close(dialog.id);return;}
  if(dialog.open&&(selection?.room!==room||selection.depth!==(room.depth||1)||selection.cartId&&selection.cartId!==room.ride)){dialogs.close(dialog.id);selection=null;}
  if(pending&&game.state==='playing'){
   const action=pending;pending=null;
   if(action.room===room&&action.depth===(room.depth||1)&&(!action.cartId||action.cartId===room.ride)){
    if(action.cartId)setMineCartDirection(game,action.direction);else setMineJunctionDirection(game,action.key,action.direction);
   }
  }
  button.textContent=room.ride?'开车方向':'路口方向';
  button.disabled=room.ride?!!room.running:!nearbyJunction(game);
  button.title=room.ride?'停车后选择起步方向':'下车并靠近三岔或十字路口后设置';
 }
 // 统一注销监听与弹窗，不留下额外输入或计时器。
 function dispose(){if(dialog.open)dialogs.close(dialog.id);scope.dispose();button.remove();dialog.remove();}
 return {render,dispose};
}
