// 开垦预览复用正式选址和地图镜像；纯显示，不排队、不扣费或改变摇杆手势。
import {farmDigTarget} from '../world/farm-land.js';
import {nearest} from '../world/coordinates.js';
import {FARM_MAX_PLOTS} from '../config/farm.js';
import {createEventScope} from '../platform/events.js';

// 一个世界矩形随指针预选；触屏未选位置时显示角色前方地面。
export function createFarmPlacement({game,root,renderer,frame,layer}){
 const scope=createEventScope(),node=root.createElement('div');node.id='farm-placement';node.hidden=true;node.setAttribute('aria-hidden','true');
 // 种子袋是空田的选种提示，复用原预览层并让触摸穿透到正式田块。
 node.innerHTML='<svg class="farm-placement-seed" viewBox="0 0 40 44" aria-hidden="true"><g stroke="#365a42" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M12 4Q20 7 28 4L25 14Q34 24 34 33Q34 40 20 40Q6 40 6 33Q6 24 15 14Z" fill="#f7e5b1"/><path d="M15 14Q20 16 25 14M14 17Q20 19 26 17" fill="none"/><path d="M24 16q8-3 8 2m-8-2 5 6" fill="none" stroke="#b58b51"/><path d="M20 33V25m0 4Q11 29 12 22Q19 21 20 29m0-3Q20 19 28 20Q29 27 20 27" fill="#92b477"/></g></svg><span></span>';layer.append(node);
 let enabled=false,point=null;
 // 捕获阶段只观察输入，保留短按开地、拖动移动和多指缩放的现有规则。
 function select(event){
  if(!enabled||!renderer.view||event.isPrimary===false)return;
  if(event.target.closest('button,[role="button"],dialog,.hud-resources,.player-hud,.task-route-anchor')&&!event.target.closest('[data-farm-cell]'))return;
  // 田格热点包含手机最小触控边缘，预览与点击必须识别同一块田。
  const cell=event.target.closest('[data-farm-cell]'),plot=cell&&game.progress.farm.plots.find(p=>p.id===Number(cell.dataset.farmCell)&&p.mapId===game.mapId);
  if(plot){point={x:plot.x,y:plot.y,mapId:plot.mapId};return;}
  const v=renderer.view,r=renderer.canvas.getBoundingClientRect();
  point={x:v.x+(event.clientX-r.left)/r.width*v.w,y:v.y+(event.clientY-r.top)/r.height*v.h,mapId:game.mapId};
 }
 scope.on(frame,'pointerdown',select,{capture:true});scope.on(frame,'pointermove',select,{capture:true});
 scope.on(frame,'pointercancel',()=>{point=null;},{capture:true});
 // 每次刷新重新核对土地，砍树、开地、切图后颜色不会停留在旧状态。
 function render(show){
  enabled=show;node.hidden=!show||!renderer.view;
  if(node.hidden){point=null;return;}
  const v=renderer.view,raw=point?.mapId===game.mapId?point:{x:game.player.x,y:game.player.y-68};
  const target=farmDigTarget(game,raw,v),reason=target.reason||(game.progress.farm.plots.length>=FARM_MAX_PLOTS?'田块数量已达上限':null);
  if(!target.point){node.hidden=true;return;}
  const plot=game.progress.farm.plots.find(p=>p.id===target.point.id&&p.mapId===game.mapId),seed=plot?.crop===null;
  const p=nearest(target.point,{x:v.x+v.w/2,y:v.y+v.h/2}),c=renderer.canvas.getBoundingClientRect(),f=frame.getBoundingClientRect(),sx=c.width/v.w,sy=c.height/v.h;
  node.style.left=(p.x-v.x)*sx+c.left-f.left+'px';node.style.top=(p.y-v.y)*sy+c.top-f.top+'px';
  node.style.width=50*sx+'px';node.style.height=36*sy+'px';node.dataset.mode=seed?'seed':'dig';node.dataset.valid=String(seed||!reason);node.dataset.reason=seed?'':reason||'';
  node.dataset.worldX=String(target.point.x);node.dataset.worldY=String(target.point.y);
  node.querySelector('span').textContent=seed?'点击选种':reason?'× 不可开垦':'✓ 可开垦';
 }
 // 跟随农活面板销毁，避免重新进入后重复观察指针。
 function dispose(){scope.dispose();node.remove();}
 return {render,dispose};
}
