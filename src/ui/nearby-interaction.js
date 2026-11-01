// 靠近后的明确点击入口：复用手机按钮材质，鼠标、触屏和键盘共用一次动作。
import {nearbyInteraction} from '../core/nearby-interaction.js';
import {createEventScope} from '../platform/events.js';
import {nearbyInteractionAnchor,projectInteractionAnchor} from '../world/interaction-anchors.js';
import {sceneLayout} from './scene-layout.js';
import {placeSceneHit} from './scene-hit.js';

// 移动时只写变化的位置，稳定提示不重复触发样式更新。
function position(button,left,top){
 const x=left+'px',y=top+'px';
 if(button.style.left!==x)button.style.left=x;
 if(button.style.top!==y)button.style.top=y;
}

// 单个持久节点保持焦点稳定；点击时重新取目标，防止过期提示执行其他动作。
export function createNearbyInteraction({game,renderer,root,input,activate}){
 const scope=createEventScope(),frame=root.getElementById('game-frame'),button=root.createElement('button');
 // 场景弹出入口统一用奶油底深绿字，目标切换时不再翻转主按钮的底色和字色。
 button.id='nearby-interaction';button.className='ui-button';button.type='button';button.hidden=true;frame.append(button);
 // 按下与抬起之间换了目标时取消动作，避免移动中的按钮误修另一座建筑。
 let pressedTarget=null;
 scope.on(button,'pointerdown',()=>{pressedTarget=button.dataset.target;});
 scope.on(button,'pointercancel',()=>{pressedTarget=null;});
 scope.on(button,'keydown',event=>{if(event.key==='Enter'||event.key===' ')pressedTarget=button.dataset.target;});
 const title=root.createElement('span'),detail=root.createElement('small');
 // 停车使用独立P形标识，保留完整无障碍名称，避免长文案遮住车位。
 const parkingIcon=root.createElement('span');parkingIcon.className='parking-hint-icon';parkingIcon.hidden=true;parkingIcon.setAttribute('aria-hidden','true');
 parkingIcon.innerHTML='<svg viewBox="0 0 28 28" fill="none"><rect x="2" y="2" width="24" height="24" rx="6" stroke="currentColor" stroke-width="2"/><path d="M10 21V7h5a4 4 0 0 1 0 8h-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
 button.append(parkingIcon,title,detail);
 scope.on(button,'click',()=>{
  const target=pressedTarget??button.dataset.target;pressedTarget=null;
  if(root.hidden||root.querySelector('dialog[open]')||target!==button.dataset.target)return;
  const entry=nearbyInteraction(game);if(!entry||entry.id!==button.dataset.target)return;
  input.reset();activate(entry);render();
 });
 // 所有附近操作固定到对应建筑、泊位或家具，玩家位置只参与核心交互资格判断。
 function render(){
  const entry=!root.hidden&&!root.querySelector('dialog[open]')&&nearbyInteraction(game);
  // 短暂收起仓库浮动按钮，避免挡住从猫猫和载具飞向门口的木材。
  if(entry?.type==='warehouse'&&game.drops.some(d=>d.warehouseWood&&d.life>0)){button.hidden=true;return;}
  let anchor=entry&&nearbyInteractionAnchor(game,entry);
  // 短横屏中工坊本体可能被固定HUD覆盖，维修入口改为安全区内的明确按钮。
  if(entry?.type==='vehicle-repair'&&root.defaultView.innerHeight<480){anchor={...anchor,hitbox:false};entry.presentation='task-entry';}
  const point=projectInteractionAnchor(anchor,renderer.view,renderer.cottageView);
  if(!point){if(!button.hidden)button.hidden=true;return;}
  // 文案和辅助名称仅在内容改变时更新，避免每帧重建文字节点后强制重新排版。
  if(button.dataset.target!==entry.id)button.dataset.target=entry.id;
  if(button.dataset.interaction!==entry.type)button.dataset.interaction=entry.type;
  // 房屋本体复用透明命中区；泊位、家具和居民保留原来的操作按钮。
  const house=!!anchor.hitbox,campSign=entry.presentation==='camp-sign',presentation=house?'building':campSign?'camp-sign':'action';
  if(button.dataset.presentation!==presentation){
   button.dataset.presentation=presentation;
   for(const name of ['width','height','transform'])button.style.removeProperty(name);
  }
  button.classList.toggle('scene-hit',house);button.classList.toggle('ui-button',!campSign&&!house);
  button.toggleAttribute('data-world-movement',house);
  if(campSign){for(const [key,value] of [['--camp-sign-width',Math.max(44,108*renderer.view.zoom)+'px'],['--camp-sign-height',Math.max(44,36*renderer.view.zoom)+'px']])if(button.style.getPropertyValue(key)!==value)button.style.setProperty(key,value);}
  const label='点击 · '+entry.label,description=entry.detail||'',accessible=label+(description?'。'+description.replace('\n','。'):'');
  const parking=['parking','fire-parking'].includes(entry.type),visibleLabel=parking?'':label;
  if(parkingIcon.hidden!==!parking)parkingIcon.hidden=!parking;
  if(title.textContent!==visibleLabel)title.textContent=visibleLabel;
  if(detail.textContent!==description)detail.textContent=description;
  if(detail.hidden!==!description)detail.hidden=!description;
  if(button.getAttribute('aria-label')!==accessible)button.setAttribute('aria-label',accessible);
  if(house){button.hidden=false;placeSceneHit(button,anchor,renderer,frame,anchor);return;}
  const {frame:r,canvas}=sceneLayout(renderer,frame);
  const left=canvas.left-r.left+point.x,top=canvas.top-r.top+point.y;
  // 任务站牌提示覆盖导航抵达范围；短屏将文字留在HUD下方，不因牌顶出画而消失。
  if(entry.presentation==='task-entry'){
   if(button.hidden)button.hidden=false;
   const width=button.offsetWidth,height=button.offsetHeight;
   const heads=[...root.querySelectorAll('.hud-resources,#quest,#mainline-hud,#boss-hud')].filter(n=>!n.hidden).map(n=>n.getBoundingClientRect()).filter(b=>b.width&&b.height);
   const edge=Math.max(8,...heads.map(b=>b.bottom-r.top+8));
   position(button,Math.max(width/2+8,Math.min(r.width-width/2-8,left)),Math.max(edge+height/2,Math.min(r.height-height/2-64,top)));
   return;
  }
  // 泊位和家具提示保持在可见范围内。
  if(left<0||left>r.width||top<0||top>r.height){if(!button.hidden)button.hidden=true;return;}
  if(button.hidden)button.hidden=false;
  position(button,left,top);
 }
 // 卸载时移除事件和按钮，重新进入游戏不叠加交互层。
 function dispose(){scope.dispose();button.remove();}
 return {render,dispose};
}
