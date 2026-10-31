// 室内出口文字的透明点击区，随正式房间镜头投影，复用原有出门规则。
import {createEventScope} from '../platform/events.js';
import {sceneHit} from './scene-hit.js';
import {interiorLayout} from '../config/workshop-interiors.js';
import {leaveCottage} from '../core/cottage.js';

// 短按出口立即离开；拖动沿用统一摇杆，键盘和辅助操作也可激活按钮。
export function createRoomExit({game,renderer,root,panel,input,onChange}){
 const scope=createEventScope(),button=root.createElement('button');
 button.id='cottage-exit';button.type='button';button.hidden=true;sceneHit(button,'出门');panel.append(button);
 scope.on(button,'click',()=>{
  if(button.hidden||game.state!=='playing'||game.cottage?.sleep||root.querySelector('dialog[open]'))return;
  input.reset();if(leaveCottage(game)){renderer.camera.time=null;onChange();}
 });
 // 热点与原“出门”地垫重合，最小触控区44像素；屏外出口不留下隐形按钮。
 function render(){
  const room=game.cottage,v=renderer.cottageView;
  button.hidden=!room||!v||game.state!=='playing'||!!room.sleep||!!root.querySelector('dialog[open]');if(button.hidden)return;
  const layout=interiorLayout(room),home=!room.kind||room.kind==='cottage';
  const canvas=renderer.canvas.getBoundingClientRect(),parent=panel.getBoundingClientRect();
  const clip=v.clip||{x:0,y:0,width:canvas.width,height:canvas.height};
  const x=v.x+layout.exit.x*v.zoom,y=v.y+(home?331:layout.height-21)*v.zoom;
  if(x<clip.x||x>clip.x+clip.width||y<clip.y||y>clip.y+clip.height){button.hidden=true;return;}
  const width=Math.max(44,74*v.zoom),height=Math.max(44,22*v.zoom);
  const left=Math.max(clip.x,Math.min(clip.x+clip.width-width,x-width/2)),top=Math.max(clip.y,Math.min(clip.y+clip.height-height,y-height/2));
  Object.assign(button.style,{left:canvas.left-parent.left+left+'px',top:canvas.top-parent.top+top+'px',width:width+'px',height:height+'px'});
 }
 // 页面卸载时撤销事件与热点，避免残留出口接收点击。
 function dispose(){scope.dispose();button.remove();}
 return {render,dispose};
}
