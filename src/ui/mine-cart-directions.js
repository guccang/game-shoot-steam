// 停车和路口选向共用手机紧凑底板，关闭弹窗后再提交正式规则。
import {createEventScope} from '../platform/events.js';
import {MINE_DIRECTIONS} from '../config/mining.js';
import {railExits} from '../config/mine-rail-routes.js';
import {currentMineLayer} from '../core/mine-layers.js';
import {nearbyJunction,stoppedCartChoices,setMineCartDirection,setMineJunctionDirection} from '../core/mine-cart-directions.js';
// 稳定节点承载方向和禁用状态，只有打开页面时读取候选出口。
export function createMineCartDirections({game,root,controls,input,dialogs}){
 const scope=createEventScope(),button=root.createElement('button'),dialog=root.createElement('dialog');
 let selection=null,pending=null;
 button.id='mine-route';button.className='ui-button';button.textContent='路口方向';controls.querySelector('.mine-actions').append(button);
 dialog.id='mine-direction-dialog';dialog.className='ui-panel ui-panel--compact';dialog.setAttribute('aria-labelledby','mine-direction-title');
 dialog.innerHTML=`<header class="ui-panel__header"><div><h2 id="mine-direction-title" tabindex="-1">路口方向</h2><p id="mine-direction-status"></p></div><button class="ui-close" data-route-close aria-label="关闭方向选择">×</button></header><div class="ui-panel__body"><section class="ui-section"><p id="mine-direction-help"></p><div class="mine-direction-grid">${MINE_DIRECTIONS.map((d,i)=>`<button class="ui-button" data-route-direction="${i}" aria-pressed="false">${['↑','→','↓','←'][i]} 向${d.name}</button>`).join('')}</div><button class="ui-button mine-route-auto" data-route-auto>恢复自动选路</button><p>北方朝上。自动选路：直行优先，没有直行则右转、左转，尽头折返。</p></section></div><footer class="ui-panel__footer"><button class="ui-button" data-route-close>返回矿道</button></footer>`;
 root.body.append(dialog);dialogs.register(dialog.id,{focusId:'mine-direction-title'});
 scope.on(button,'click',()=>{
  if(button.disabled||game.state!=='playing')return;
  const room=game.cottage,key=nearbyJunction(game),cart=currentMineLayer(game).carts.find(c=>c.id===room.ride);
  if(!cart&&!key)return;
  selection={room,depth:room.depth||1,cartId:cart?.id,key};
  const choices=cart?stoppedCartChoices(game):railExits(currentMineLayer(game),key),chosen=cart?(cart.departure??cart.heading):currentMineLayer(game).junctions?.[key];
  root.getElementById('mine-direction-title').textContent=cart?'停车 · 开车方向':'交叉路口方向';
  root.getElementById('mine-direction-status').textContent=cart?'选择后保持停车，点击「开车」出发。':`地下 ${room.depth||1} 层 · 路口 ${key} · ${Number.isInteger(chosen)?'当前向'+MINE_DIRECTIONS[chosen].name:'当前自动'}`;
  root.getElementById('mine-direction-help').textContent=cart?'选择本次起步方向，可沿轨道掉头。两格之间只能沿当前轨道前进或后退；到路口后可选择其他出口。':'选择方向后自动保存，所有矿车下次经过此路口都朝该方向移动；从所选方向驶入时会原路折返。';
  for(const b of dialog.querySelectorAll('[data-route-direction]')){const i=Number(b.dataset.routeDirection);b.disabled=!choices.some(n=>n.i===i);b.setAttribute('aria-pressed',String(i===chosen));}
  const auto=dialog.querySelector('[data-route-auto]');auto.hidden=!!cart;auto.setAttribute('aria-pressed',String(!cart&&!Number.isInteger(chosen)));
  input.reset();dialogs.open(dialog.id);
 });
 scope.on(dialog,'click',event=>{
  const b=event.target.closest('button');if(!b||b.disabled)return;
  if(b.hasAttribute('data-route-close')){dialogs.close(dialog.id);return;}
  if(b.hasAttribute('data-route-direction')||b.hasAttribute('data-route-auto')){
   pending={...selection,direction:b.hasAttribute('data-route-auto')?null:Number(b.dataset.routeDirection)};dialogs.close(dialog.id);
  }
 });
 // 切房间、切层或换车后废弃旧选择，不让过期弹窗修改另一个路口。
 function render(){
  const room=game.cottage;
  if(room?.kind!=='mine'){pending=null;selection=null;if(dialog.open)dialogs.close(dialog.id);return;}
  if(dialog.open&&(selection?.room!==room||selection.depth!==(room.depth||1))){dialogs.close(dialog.id);selection=null;}
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
