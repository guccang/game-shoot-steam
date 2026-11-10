// 场景摆放只维护预览草稿，确认后复用营地事务保存，触摸不会传给角色移动。
import {createEventScope} from '../platform/events.js';
import {campDecorDefinition} from '../config/camp-management.js';
import {campDecorPlacementError} from '../world/camp-decor.js';
import {placeCampDecor} from '../core/camp/camp-management.js';
import {drawCampDecoration} from '../rendering/camp-decor.js';
import {nearest} from '../world/coordinates.js';

// 透明模态层保留正式场景，操作栏使用统一手机底板和按钮。
export function createCampWorldPlacement({game,renderer,root,dialogs,onReturn}) {
  const scope=createEventScope(),dialog=root.createElement('dialog');
  dialog.id='camp-world-placement';dialog.setAttribute('aria-labelledby','camp-world-title');
  dialog.innerHTML=`<canvas tabindex="0" aria-label="点击或拖动场景选择装饰位置，方向键微调"></canvas><section class="ui-panel ui-panel--compact"><header class="ui-panel__header"><h2 id="camp-world-title">场景摆放</h2></header><div class="ui-panel__body"><p data-world-status role="status" aria-live="polite"></p></div><footer class="ui-panel__footer"><button class="ui-button" data-world-cancel>取消</button><button class="ui-button ui-button--primary" data-world-confirm>确认摆放</button></footer></section>`;
  root.body.append(dialog);
  const canvas=dialog.querySelector('canvas'),status=dialog.querySelector('[data-world-status]'),confirm=dialog.querySelector('[data-world-confirm]');
  let item=null,point=null,pointer=null,message='';
  dialogs.register(dialog.id,{});
  // 退出时先回到管理页再转交暂停归属，取消不写入物品位置。
  function finish(saved=false){onReturn(saved);dialogs.transferResume(dialog.id,'camp-management-dialog');dialogs.close(dialog.id);}
  // 镜头坐标换算为营地最近镜像，并保持原有十单位网格。
  function select(event){const r=canvas.getBoundingClientRect(),v=renderer.view;if(!v)return;const p=nearest({x:v.x+(event.clientX-r.left)/r.width*v.w,y:v.y+(event.clientY-r.top)/r.height*v.h},{x:0,y:700});point={x:Math.round(p.x/10)*10,y:Math.round(p.y/10)*10};message='';render();}
  // 预览与正式摆件共用尺寸、脚底和画笔，描边同时给出可用状态。
  function render(){
    if(!dialog.open||!item||!renderer.view)return;
    const r=renderer.canvas.getBoundingClientRect(),v=renderer.view,dpr=Math.min(root.defaultView.devicePixelRatio||1,2);
    for(const [key,value] of Object.entries({left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'}))if(dialog.style[key]!==value)dialog.style[key]=value;
    const w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;
    const c=canvas.getContext('2d'),d=campDecorDefinition(item.type),p=nearest(point,{x:v.x+v.w/2,y:v.y+v.h/2}),error=campDecorPlacementError(game,item.uid,point.x,point.y);
    c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,w,h);c.setTransform(w/v.w,0,0,h/v.h,-v.x*w/v.w,-v.y*h/v.h);
    c.globalAlpha=.8;drawCampDecoration(c,{...item,...p},renderer.light.sample(performance.now(),true).night,game.time,true);c.globalAlpha=1;
    c.strokeStyle=error?'#b65e48':'#315c43';c.lineWidth=3*v.w/r.width;c.setLineDash([6*v.w/r.width,4*v.w/r.width]);c.strokeRect(p.x-d.width/2-4,p.y-d.depth/2-4,d.width+8,d.depth+8);c.setLineDash([]);
    const text=message||error||'点击或拖动选择位置，确认后保存。';if(status.textContent!==text)status.textContent=text;confirm.disabled=!!error;canvas.dataset.x=point.x;canvas.dataset.y=point.y;
  }
  // 默认在当前镜头内展示原位置；未摆放物品从猫猫前方开始选择。
  function open(uid){
    item=game.progress.campManagement.items.find(i=>i.uid===uid);if(!item||!renderer.view)return false;
    const v=renderer.view,p=item.x===null?nearest({x:game.player.x+70,y:game.player.y+60},{x:0,y:700}):{x:item.x,y:item.y};
    const q=nearest(p,{x:v.x+v.w/2,y:v.y+v.h/2});point=q.x>=v.x&&q.x<=v.x+v.w&&q.y>=v.y&&q.y<v.y+v.h*.7?p:nearest({x:v.x+v.w/2,y:v.y+v.h*.45},{x:0,y:700});
    point={x:Math.round(point.x/10)*10,y:Math.round(point.y/10)*10};message='';dialog.querySelector('h2').textContent=campDecorDefinition(item.type).name+' · 场景摆放';
    dialogs.open(dialog.id);dialogs.transferResume('camp-management-dialog',dialog.id);dialogs.close('camp-management-dialog');render();canvas.focus({preventScroll:true});return true;
  }
  scope.on(canvas,'pointerdown',e=>{if(pointer!==null)return;e.preventDefault();pointer=e.pointerId;canvas.setPointerCapture(pointer);select(e);});
  scope.on(canvas,'pointermove',e=>{if(pointer===e.pointerId)select(e);});
  scope.on(canvas,'pointerup',e=>{if(pointer===e.pointerId){select(e);pointer=null;}});
  scope.on(canvas,'pointercancel',()=>{pointer=null;});
  scope.on(canvas,'keydown',e=>{const step={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]}[e.key];if(!step||!point)return;e.preventDefault();point.x+=step[0];point.y+=step[1];message='';render();});
  scope.on(dialog,'cancel',e=>{e.preventDefault();finish();});
  scope.on(dialog.querySelector('[data-world-cancel]'),'click',()=>finish());
  scope.on(confirm,'click',()=>{if(!point)return;const result=placeCampDecor(game,item.uid,point.x,point.y);if(result.ok)finish(true);else{message=result.message;render();}});
  scope.on(dialog,'close',()=>{if(!dialog.open){item=null;point=null;pointer=null;}});
  // 卸载时清理透明层及全部触摸监听。
  function dispose(){scope.dispose();dialog.remove();}
  return {open,render,dispose};
}
