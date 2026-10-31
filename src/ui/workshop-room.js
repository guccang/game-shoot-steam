import {interiorShopkeeper} from '../config/workshop-interiors.js';
// 室内售货员热点只负责打开原工坊，购买、改装、试射和挑战门槛仍走正式界面。
import {latchWorkshopDisplayEntry} from '../core/workshop-display-entry.js';
import {createEventScope} from '../platform/events.js';
import {sceneHit} from './scene-hit.js';

// 热点随室内等比投影，保留键盘操作；触屏拖动继续交给原移动输入。
export function createWorkshopRoomControls({game,renderer,root,panel,input,openWorkshop}){
 const scope=createEventScope(),hits=root.createElement('div');hits.className='workshop-room-hits';panel.append(hits);let signature='';
 // 每间房屋仅售货员提供操作入口。
 function items(){if(!game.cottage)return [];const seller=interiorShopkeeper(game.cottage);return seller?[seller]:[];}

 // 通过售货员打开对应服务；关闭原工坊后仍站在室内原位置。
 function activate(item){if(game.state!=='playing'||!game.cottage||root.querySelector('dialog[open]'))return;latchWorkshopDisplayEntry(game,item);input.reset();game.cottage.exitElapsed=0;openWorkshop(game.cottage.kind,item.index);}
 scope.on(hits,'click',event=>{const b=event.target.closest('[data-room-item]');if(event.detail===0&&b){const item=items().find(s=>s.id===b.dataset.roomItem);if(item)activate(item);}});
 // 触屏只消费短按，按住经过陈列柜仍可自由移动。
 function tap(event){
  if(!interiorShopkeeper(game.cottage))return false;
  const v=renderer.cottageView,r=renderer.canvas.getBoundingClientRect();if(!v)return true;
  const screen={x:event.clientX-r.left,y:event.clientY-r.top},clip=v.clip;
  if(clip&&(screen.x<clip.x||screen.x>clip.x+clip.width||screen.y<clip.y||screen.y>clip.y+clip.height))return true;
  const point={x:(screen.x-v.x)/v.zoom,y:(screen.y-v.y)/v.zoom};
  const item=items().find(s=>Math.abs(point.x-s.x)<=s.width/2&&point.y>s.y-s.height+14&&point.y<s.y+14);if(item)activate(item);return true;
 }
 // 只在货架/泊位变化时重建按钮，每帧仅更新位置，避免丢失键盘焦点。
 function render(){
  const room=game.cottage,list=items(),active=!!room&&list.length>0&&!root.querySelector('dialog[open]'),key=room?.kind+':'+list.map(s=>s.id+':'+s.index).join('|');
  hits.hidden=!active;
  if(key!==signature){signature=key;hits.replaceChildren();for(const item of list){const button=root.createElement('button');button.type='button';sceneHit(button,item.label);button.dataset.roomItem=item.id;button.dataset.roomIndex=String(item.index);hits.append(button);}}
  const v=renderer.cottageView;if(!v)return;
  const canvas=renderer.canvas.getBoundingClientRect(),parent=panel.getBoundingClientRect();
  for(const button of hits.children){
   const item=list.find(s=>s.id===button.dataset.roomItem);if(!item)continue;
   const width=Math.max(44,item.width*v.zoom),height=Math.max(44,item.height*v.zoom),clip=v.clip||{x:0,y:0,width:canvas.width,height:canvas.height};
   // 透明按钮与正式场景共同裁切，屏外陈列不截获移动，也不能覆盖标题和出门按钮。
   const left=Math.max(clip.x,v.x+item.x*v.zoom-width/2),top=Math.max(clip.y,v.y+(item.y+14)*v.zoom-height);
   const right=Math.min(clip.x+clip.width,v.x+item.x*v.zoom+width/2),bottom=Math.min(clip.y+clip.height,v.y+(item.y+14)*v.zoom);
   // 边缘不足一个完整触控尺寸时先隐藏按钮，避免 CSS 最小高度把热点撑出视窗。
   button.hidden=right-left<44||bottom-top<44;if(button.hidden)continue;
   Object.assign(button.style,{left:canvas.left-parent.left+left+'px',top:canvas.top-parent.top+top+'px',width:right-left+'px',height:bottom-top+'px',transform:'none'});
  }
 }
 // 卸载释放交互和小幅画像缓存，下一次挂载不继承旧货架。
 function dispose(){scope.dispose();hits.remove();renderer.interiorArt=null;}
 return {tap,render,dispose};
}
