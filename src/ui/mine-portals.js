// 地下透明入口热点只在可见光圈内启用，复用原输入短按与寻路，不拦截拖动。
import {minePortals} from '../world/mine-portals.js';
import {minePointLit} from '../world/mine-vision.js';
import {currentMineLayer} from '../core/mining/mine-layers.js';
import {approachMinePortal} from '../core/navigation/scene-approach.js';
import {sceneHit} from './scene-hit.js';
import {setHidden} from './shared/dom-state.js';
import {createEventScope} from '../platform/events.js';

// 每个真实入口复用一个无障碍按钮，离开矿区回收；屏外与雾中入口不暴露坐标。
export function createMinePortals({game,renderer,root,panel}){
 const scope=createEventScope(),nodes=new Map();let targets=[];
 // 世界入口的触区投影沿用矿区显示镜头，最小四十四像素。
 function bounds(p){const v=renderer.mineView,w=Math.max(44,60*v.zoom),h=Math.max(44,100*v.zoom);return {left:(p.hitX-v.x)*v.zoom-w/2,top:(p.hitY-v.y)*v.zoom-h/2,width:w,height:h};}
 // 短按命中入口才提交意图，角色继续沿真实矿道移动。
 function tap(event){if(game.cottage?.kind!=='mine'||game.state!=='playing'||root.querySelector('dialog[open]'))return false;const c=renderer.canvas.getBoundingClientRect();for(const p of targets){const b=bounds(p);if(event.clientX>=c.left+b.left&&event.clientX<=c.left+b.left+b.width&&event.clientY>=c.top+b.top&&event.clientY<=c.top+b.top+b.height)return approachMinePortal(game,p.id);}return false;}
 // 只测量一次容器，更新后的热点跟随每帧相机位置。
 function render(){
  targets=game.cottage?.kind==='mine'&&game.state==='playing'&&!root.querySelector('dialog[open]')&&renderer.mineView?minePortals(currentMineLayer(game),game.cottage.depth||1).filter(p=>minePointLit(p,renderer.mineFogReview?.sources||[])):[];
  const canvas=targets.length&&renderer.canvas.getBoundingClientRect(),parent=targets.length&&panel.getBoundingClientRect();
  for(const [id,node]of nodes)setHidden(node,!targets.some(p=>p.id===id));
  for(const p of targets){let node=nodes.get(p.id);if(!node){node=root.createElement('button');sceneHit(node,'走到'+p.label+'，站定1秒通行');node.dataset.minePortal=p.id;scope.on(node,'click',e=>{if(e.detail===0)approachMinePortal(game,p.id);});panel.append(node);nodes.set(p.id,node);}
   const label='走到'+p.label+'，站定1秒通行';if(node.getAttribute('aria-label')!==label)node.setAttribute('aria-label',label);
   const b=bounds(p);setHidden(node,b.left+b.width<0||b.left>renderer.width||b.top+b.height<0||b.top>renderer.height);Object.assign(node.style,{left:canvas.left-parent.left+b.left+'px',top:canvas.top-parent.top+b.top+'px',width:b.width+'px',height:b.height+'px',transform:'none'});
  }
  if(game.cottage?.kind!=='mine'){for(const node of nodes.values())node.remove();nodes.clear();}
 }
 // 卸载清理所有监听与透明节点，避免重新进入后叠加。
 function dispose(){scope.dispose();for(const node of nodes.values())node.remove();nodes.clear();}
 return {render,tap,dispose};
}
