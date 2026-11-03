// 手机地下探索地图复用正式弹窗暂停与统一底板；查看不提交任何游戏事务。
import {createEventScope} from '../platform/events.js';
import {currentMineLayer} from '../core/mine-layers.js';
import {buildMineMapModel,fitMineMap,clampMineMap,zoomMineMap} from '../world/mine-map.js';
import {drawMineExplorationMap} from '../rendering/mine-map.js';
// 独立控制器承载一次打开期间的地图快照、拖动与缩放，关闭时释放输入。
export function createMineMap({game,renderer,root,dialogs,input}){
 const scope=createEventScope(),win=root.defaultView,dialog=root.createElement('dialog');
 dialog.id='mine-map-dialog';dialog.className='ui-panel ui-panel--fullscreen';dialog.setAttribute('aria-labelledby','mine-map-title');
 dialog.innerHTML='<header class="ui-panel__header"><div><h2 id="mine-map-title" tabindex="-1">地下探索地图</h2><p id="mine-map-summary"></p></div><button class="ui-close" data-map-close aria-label="关闭地下地图">×</button></header><div class="ui-panel__body"><p class="mine-map-legend"><span>浅色：已探索</span><span>蓝色：水域</span><span>金线：铁轨</span><span>深绿：未探索</span></p><canvas id="mine-exploration-canvas" tabindex="0" role="img" aria-label="地下已探索区域和铁轨地图，可拖动或双指缩放，方向键移动，回车定位自己"></canvas><p class="mine-map-help">拖动查看 · 双指缩放 · 北方朝上</p></div><footer class="ui-panel__footer"><button class="ui-button" data-map-zoom="-1" aria-label="缩小地图">−</button><button class="ui-button" data-map-zoom="1" aria-label="放大地图">＋</button><button class="ui-button" data-map-locate>我的位置</button><button class="ui-button" data-map-fit>全部探索</button></footer>';
 root.body.append(dialog);const canvas=root.getElementById('mine-exploration-canvas'),points=new Map();let session=null,view=null,frame=0,gesture=null;
 // 同一显示帧合并所有触摸事件，关闭地图时不再绘制。
 function schedule(){if(!frame)frame=win.requestAnimationFrame(()=>{frame=0;draw();});}
 // 读取实际正文尺寸后再适配，避免showModal之前的零尺寸。
 function draw(){
  if(!dialog.open||!session)return;const r=canvas.getBoundingClientRect();if(r.width<1||r.height<1)return;
  view??=fitMineMap(session.model,r.width,r.height);clampMineMap(view,session.model,r.width,r.height);
  renderer.mineMapReview=drawMineExplorationMap(canvas,session.model,view,session.direction);
  root.getElementById('mine-map-summary').textContent='已记录 '+session.model.cells.length+' 格 · 铁轨 '+session.model.rails.length+' 格';
  dialog.querySelector('[data-map-zoom="-1"]').disabled=view.scale<=view.minScale+.001;dialog.querySelector('[data-map-zoom="1"]').disabled=view.scale>=64-.001;
 }
 // 打开只快照当前层，不把未探索天然地形加入图面。
 function open(){if(game.cottage?.kind!=='mine'||!['playing','paused'].includes(game.state))return;input.reset();dialogs.open(dialog.id);schedule();}
 dialogs.register(dialog.id,{focusId:'mine-map-title',onOpen:()=>{session={room:game.cottage,depth:game.cottage.depth||1,direction:game.cottage.direction,model:buildMineMapModel(currentMineLayer(game),game.player,game.cottage.depth||1)};view=null;root.getElementById('mine-map-title').textContent='地下 '+session.depth+' 层 · 探索地图';points.clear();gesture=null;renderer.mineMapReview=null;}});
 scope.on(root.getElementById('mine-map-open'),'click',open);
 // 双指使用中心点和间距，单指使用中心点；两者切换时不继承旧手势。
 function measure(){const p=[...points.values()];if(!p.length)return null;return p.length===1?{x:p[0].x,y:p[0].y,distance:0,count:1}:{x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2,distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),count:2};}
 // 缩放按钮、滚轮与双指共用同一焦点变换。
 function zoom(factor,x,y){if(!view)return;const r=canvas.getBoundingClientRect();zoomMineMap(view,factor,x??r.width/2,y??r.height/2,r.width,r.height);schedule();}
 // 所有地图指针被局部捕获，不传递到游戏摇杆。
 scope.on(canvas,'pointerdown',e=>{e.preventDefault();e.stopPropagation();const r=canvas.getBoundingClientRect();points.set(e.pointerId,{x:e.clientX-r.left,y:e.clientY-r.top});canvas.setPointerCapture(e.pointerId);gesture=measure();});
 scope.on(canvas,'pointermove',e=>{if(!points.has(e.pointerId)||!view)return;e.preventDefault();const r=canvas.getBoundingClientRect();points.set(e.pointerId,{x:e.clientX-r.left,y:e.clientY-r.top});const next=measure();
  if(gesture&&next.count===gesture.count){view.x-=(next.x-gesture.x)/view.scale;view.y-=(next.y-gesture.y)/view.scale;if(next.count===2&&gesture.distance>2)zoom(next.distance/gesture.distance,next.x,next.y);schedule();}gesture=next;
 });
 // 抬指、系统取消与失去捕获均重设基准，防止再次触摸时跳图。
 function release(e){points.delete(e.pointerId);gesture=measure();}
 for(const type of ['pointerup','pointercancel','lostpointercapture'])scope.on(canvas,type,release);
 scope.on(canvas,'wheel',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();zoom(Math.exp(-e.deltaY*.002),e.clientX-r.left,e.clientY-r.top);},{passive:false});
 // 定位保留放大级别；全部探索重新适配，不改变玩家在游戏中的位置。
 function locate(){if(!view)return;view.x=session.model.position.x;view.y=session.model.position.y;view.scale=Math.max(12,view.scale);schedule();}
 scope.on(dialog,'click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;if(b.hasAttribute('data-map-close'))dialogs.close(dialog.id);else if(b.dataset.mapZoom)zoom(Number(b.dataset.mapZoom)>0?1.5:1/1.5);else if(b.hasAttribute('data-map-fit')){view=null;schedule();}else if(b.hasAttribute('data-map-locate'))locate();});
 scope.on(canvas,'keydown',e=>{if(!view)return;const moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},move=moves[e.key];if(move){e.preventDefault();view.x+=move[0]*50/view.scale;view.y+=move[1]*50/view.scale;schedule();}else if(['+','=','-','Enter','Home'].includes(e.key)){e.preventDefault();if(e.key==='Enter'||e.key==='Home')locate();else zoom(e.key==='-'?1/1.5:1.5);}});
 scope.on(dialog,'close',()=>{if(dialog.open)return;canvas.width=canvas.height=1;points.clear();gesture=null;session=null;view=null;renderer.mineMapReview=null;});
 const observer=new win.ResizeObserver(schedule);observer.observe(canvas);
 // 页面切换、换层或退出矿区立即关闭旧图，避免把上一层记录错当当前层。
 function sync(){if(dialog.open&&session&&(game.cottage!==session.room||(game.cottage.depth||1)!==session.depth))dialogs.close(dialog.id);}
 // 卸载释放RAF、观察器、输入与画布。
 function dispose(){if(dialog.open)dialogs.close(dialog.id);if(frame)win.cancelAnimationFrame(frame);observer.disconnect();scope.dispose();dialog.remove();}
 return {open,sync,dispose};
}
