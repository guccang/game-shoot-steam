// 床、上下楼梯及电梯共用透明触控层，正式设施绘制、碰撞与动作时钟保持同源。
import {cottageClickTargets,approachCottageTarget} from '../core/navigation/scene-approach.js';
import {sceneHit} from './scene-hit.js';
import {createEventScope} from '../platform/events.js';

// 按当前室内镜头投影，短屏裁切热点，不把画外家具变成固定屏幕按钮。
export function createCottageApproach({game,renderer,root,panel}){
 const scope=createEventScope(),buttons=new Map();
 for(const id of ['exit','resident','stairs-up','stairs-down','elevator','bed','basement','balcony-north','balcony-east','balcony-south','balcony-west']){const button=root.createElement('button');sceneHit(button,'室内设施');if(id==='exit')button.id='cottage-exit';button.dataset.cottageTarget=id;button.hidden=true;scope.on(button,'click',event=>{if(event.detail===0)activate(id);});panel.append(button);buttons.set(id,button);}
 // 原输入确认短按后才提交；暂停与弹窗不会产生潜伏的移动指令。
 function activate(id){return !root.hidden&&!root.querySelector('dialog[open]')&&approachCottageTarget(game,id);}
 // 同一矩形服务画布短按与DOM热点，最小44像素并裁切到房间视窗。
 function bounds(item){
  const v=renderer.cottageView;if(!v)return null;
  const canvas=renderer.canvas.getBoundingClientRect(),clip=v.clip||{x:0,y:0,width:canvas.width,height:canvas.height},width=Math.max(44,item.width*v.zoom),height=Math.max(44,item.height*v.zoom);
  // 门牌位于房间下边缘；中心可见时向内收住触区，避免窄屏裁掉最后几像素后整块失效。
  if(item.id==='exit'){
   const center=v.y+item.y*v.zoom;
   if(center<clip.y||center>clip.y+clip.height||clip.height<height)return null;
   return {canvas,left:v.x+item.x*v.zoom-width/2,top:Math.max(clip.y,Math.min(center-height/2,clip.y+clip.height-height)),width,height};
  }
  const left=Math.max(clip.x,v.x+item.x*v.zoom-width/2),top=Math.max(clip.y,v.y+item.y*v.zoom-height/2),right=Math.min(clip.x+clip.width,v.x+item.x*v.zoom+width/2),bottom=Math.min(clip.y+clip.height,v.y+item.y*v.zoom+height/2);
  return right-left>=44&&bottom-top>=44?{canvas,left,top,width:right-left,height:bottom-top}:null;
 }
 // 真实触摸短按命中可见家具，拖动与长按仍归移动系统处理。
 function tap(event){for(const item of cottageClickTargets(game)){const b=bounds(item);if(b&&event.clientX>=b.canvas.left+b.left&&event.clientX<=b.canvas.left+b.left+b.width&&event.clientY>=b.canvas.top+b.top&&event.clientY<=b.canvas.top+b.top+b.height)return activate(item.id);}return false;}
 // 每层只暴露实际存在的设施，双向楼梯有独立触点，电梯不与楼梯重叠。
 function render(){
  const targets=game.state==='playing'&&!root.querySelector('dialog[open]')?cottageClickTargets(game):[];
  // 屋外没有家具触点，离开房间时收起一次，后续野外帧不读取室内面板布局。
  const panelBounds=targets.length?panel.getBoundingClientRect():null;
  for(const [id,button] of buttons){const item=targets.find(t=>t.id===id),b=item&&bounds(item);if(button.hidden!==!b)button.hidden=!b;if(b){button.setAttribute('aria-label',item.label);Object.assign(button.style,{left:b.canvas.left-panelBounds.left+b.left+'px',top:b.canvas.top-panelBounds.top+b.top+'px',width:b.width+'px',height:b.height+'px',transform:'none'});}}
 }
 // 清理监听和热点，重新进屋不会叠加触控层。
 function dispose(){scope.dispose();for(const button of buttons.values())button.remove();}
 return {tap,render,dispose};
}
