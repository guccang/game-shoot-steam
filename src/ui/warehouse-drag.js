// 仓库双区拖拽：图标负责拖动，名称区域保留手机原生滚动。
import {createEventScope} from '../platform/events.js';
// 仅松手于另一库存区才提出转移请求，取消与区域外松手均不改变库存。
export function createWarehouseDrag({panel,onTransfer}){
 const scope=createEventScope();let gesture=null,suppressUntil=0,pending=null;
 // 清除捕获、浮动图标和高亮，关闭页面或切换来源时也可安全调用。
 function cancel(){if(pending!==null){clearTimeout(pending);pending=null;}const g=gesture;gesture=null;if(!g)return;g.ghost?.remove();g.card.classList.remove('warehouse-dragging');panel.querySelectorAll('[data-warehouse-zone]').forEach(n=>n.removeAttribute('data-over'));if(panel.hasPointerCapture(g.pointer))panel.releasePointerCapture(g.pointer);}
 // 用屏幕坐标命中目标，避免浮动图标和指针捕获干扰落点。
 function targetAt(x,y){return [...panel.querySelectorAll('[data-warehouse-zone]')].find(n=>{const r=n.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom&&n.dataset.warehouseZone!==gesture.direction;});}
 // 拖动图标自管轻触，按下即阻止兼容点击穿透到松手时新开的数量层。
 scope.on(panel,'pointerdown',e=>{const card=e.target.closest('[data-warehouse-grip]')?.closest('[data-item]');if(!card||card.disabled||e.button!==0||!e.isPrimary)return;e.preventDefault();cancel();gesture={card,id:card.dataset.item,direction:card.dataset.direction,pointer:e.pointerId,x:e.clientX,y:e.clientY};panel.setPointerCapture(e.pointerId);});
 scope.on(panel,'pointermove',e=>{const g=gesture;if(!g||g.pointer!==e.pointerId)return;if(!g.ghost&&Math.hypot(e.clientX-g.x,e.clientY-g.y)<8)return;e.preventDefault();if(!g.ghost){g.ghost=g.card.cloneNode(true);g.ghost.removeAttribute('data-item');g.ghost.setAttribute('aria-hidden','true');g.ghost.tabIndex=-1;g.ghost.classList.add('warehouse-ghost');panel.append(g.ghost);g.card.classList.add('warehouse-dragging');}g.ghost.style.left=e.clientX+'px';g.ghost.style.top=e.clientY+'px';const target=targetAt(e.clientX,e.clientY);panel.querySelectorAll('[data-warehouse-zone]').forEach(n=>n.toggleAttribute('data-over',n===target));});
 // 等触摸序列结束再显示顶层确认框，避免浏览器将本次触摸重新命中弹窗。
 scope.on(panel,'pointerup',e=>{const g=gesture;if(!g||g.pointer!==e.pointerId)return;const accept=!g.ghost||!!targetAt(e.clientX,e.clientY);suppressUntil=Date.now()+500;cancel();e.preventDefault();if(accept)pending=setTimeout(()=>{pending=null;if(panel.open)onTransfer(g.id,g.direction);},50);});
 scope.on(panel,'click',e=>{if(Date.now()<suppressUntil&&(e.target===panel||e.target.closest('[data-item]'))){e.preventDefault();e.stopImmediatePropagation();}},true);
 for(const event of ['pointercancel','close'])scope.on(panel,event,cancel);
 scope.on(panel,'lostpointercapture',()=>{if(gesture)cancel();});
 scope.on(panel.ownerDocument.defaultView,'blur',cancel);
 // 销毁页面时移除所有手势监听器。
 function dispose(){cancel();scope.dispose();}
 return {cancel,dispose};
}
