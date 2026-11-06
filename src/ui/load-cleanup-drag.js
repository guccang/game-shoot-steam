// 物品图标使用统一指针手势，触屏直接拖动；文字区域保留原生列表滚动。
import {createEventScope} from '../platform/events.js';
import {paintInventoryIcons} from './inventory-icons.js';
// 拖出容器或放入清理区才提交选择，取消、失焦和关闭均只移除浮标。
export function createCleanupDrag({panel,root,game,onDrop}){
 const scope=createEventScope();let gesture=null,suppressUntil=0;
 // 高亮与松手共用清理区的屏幕边界，滚动列表可能在底栏后继续延伸。
 function overZone(event){const bounds=panel.querySelector('[data-cleanup-drop]').getBoundingClientRect();return event.clientX>=bounds.left&&event.clientX<=bounds.right&&event.clientY>=bounds.top&&event.clientY<=bounds.bottom;}
 // 释放捕获与浮标，保持原库存和物品卡片不变。
 function cancel(){const g=gesture;gesture=null;if(!g)return;g.ghost?.remove();g.card.classList.remove('cleanup-dragging');panel.removeAttribute('data-dragging');panel.querySelector('[data-cleanup-drop]')?.removeAttribute('data-over');if(panel.hasPointerCapture(g.pointer))panel.releasePointerCapture(g.pointer);}
 scope.on(panel,'pointerdown',e=>{const grip=e.target.closest('[data-cleanup-grip]'),card=grip?.closest('[data-cleanup-item]');if(!card||e.button!==0||!e.isPrimary)return;gesture={pointer:e.pointerId,card,id:card.dataset.cleanupItem,x:e.clientX,y:e.clientY};panel.setPointerCapture(e.pointerId);});
 scope.on(panel,'pointermove',e=>{
  const g=gesture;if(!g||g.pointer!==e.pointerId)return;
  if(!g.ghost&&Math.hypot(e.clientX-g.x,e.clientY-g.y)<8)return;e.preventDefault();
  if(!g.ghost){g.ghost=g.card.cloneNode(true);g.ghost.removeAttribute('data-cleanup-item');g.ghost.removeAttribute('aria-label');g.ghost.tabIndex=-1;g.ghost.setAttribute('aria-hidden','true');g.ghost.className='cleanup-ghost';panel.append(g.ghost);paintInventoryIcons(g.ghost,game.progress);g.card.classList.add('cleanup-dragging');panel.dataset.dragging='true';}
  g.ghost.style.left=e.clientX+'px';g.ghost.style.top=e.clientY+'px';
  const zone=panel.querySelector('[data-cleanup-drop]');zone.dataset.over=String(overZone(e));
 },{passive:false});
 scope.on(panel,'pointerup',e=>{const g=gesture;if(!g||e.pointerId!==g.pointer)return;const r=panel.querySelector('.cleanup-grid').getBoundingClientRect(),outside=e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom,dragged=!!g.ghost;cancel();if(dragged){suppressUntil=Date.now()+500;e.preventDefault();if(outside||overZone(e))onDrop(g.id);}else{onDrop(g.id);suppressUntil=Date.now()+500;}});
 scope.on(panel,'click',e=>{if(Date.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
 scope.on(panel,'pointercancel',cancel);scope.on(panel,'lostpointercapture',e=>{if(e.target===panel&&gesture?.pointer===e.pointerId)cancel();});scope.on(panel,'close',cancel);scope.on(root.defaultView,'blur',cancel);
 // 实例卸载不遗留监听、捕获或悬浮节点。
 function dispose(){cancel();scope.dispose();}return {cancel,dispose};
}
