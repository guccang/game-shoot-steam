// 售货员本体和名牌共用透明热点，短按开店、拖动行走、键盘激活遵循同一入口。
import {createEventScope} from '../platform/events.js';
import {sceneHit} from './scene-hit.js';
import {interiorShopkeeper} from '../config/workshop-interiors.js';
import {requestShopkeeperService} from '../core/workshop-display-entry.js';

// 热点只存在于当前营业房，面板关闭与倒计时共用防重开状态。
export function createShopkeeperInteraction({game,renderer,root,panel,input,openService,onTalk}){
 const scope=createEventScope(),button=root.createElement('button');
 sceneHit(button,'与售货员交互');button.dataset.roomItem='shopkeeper';button.hidden=true;panel.append(button);
 // 屏幕命中和热点布局共用同一矩形，包含人物头顶的正式名牌。
 function bounds(){
  const seller=game.cottage&&interiorShopkeeper(game.cottage),v=renderer.cottageView;
  if(!seller||!v)return null;
  const width=Math.max(44,80*v.zoom),height=Math.max(44,94*v.zoom),left=v.x+seller.x*v.zoom-width/2,top=v.y+(seller.y+16)*v.zoom-height;
  const canvas=renderer.canvas.getBoundingClientRect(),clip=v.clip||{x:0,y:0,width:canvas.width,height:canvas.height};
  if(left<clip.x||left+width>clip.x+clip.width||top<clip.y||top+height>clip.y+clip.height)return null;
  return {seller,canvas,left,top,width,height};
 }
 // 提交时重查房间、状态和距离，主动点击不受上一次候停闩锁阻挡。
 function activate(){
  if(root.hidden||root.querySelector('dialog[open]')||!game.cottage||game.state!=='playing')return;
  const service=requestShopkeeperService(game);
  if(!service){game.cottage.storageNotice='请靠近售货员，再点击交互。';return;}
  input.reset();if(onTalk)onTalk('shop:'+service.kind,()=>openService(service.kind,service.index));else openService(service.kind,service.index);
 }
 scope.on(button,'click',event=>{if(event.detail===0)activate();});
 // 普通触摸只接收输入系统确认的短按，避免从售货员身上拖动时误开页面。
 function tap(event){
  const b=bounds();if(!b||button.hidden)return false;
  const x=event.clientX-b.canvas.left,y=event.clientY-b.canvas.top;
  if(x<b.left||x>b.left+b.width||y<b.top||y>b.top+b.height)return false;
  activate();return true;
 }
 // 跟随室内滚动镜头裁切，不把画外售货员变成固定在屏幕上的按钮。
 function render(){
  const b=bounds();button.hidden=!b||game.state!=='playing'||!!game.cottage?.sleep||!!root.querySelector('dialog[open]');
  if(button.hidden)return;
  const panelBounds=panel.getBoundingClientRect();button.setAttribute('aria-label','点击与'+b.seller.label+'交互');
  Object.assign(button.style,{left:b.canvas.left-panelBounds.left+b.left+'px',top:b.canvas.top-panelBounds.top+b.top+'px',width:b.width+'px',height:b.height+'px',transform:'none'});
 }
 // 卸载时释放监听与节点，避免重新进店叠加点击区域。
 function dispose(){scope.dispose();button.remove();}
 return {tap,render,dispose};
}
