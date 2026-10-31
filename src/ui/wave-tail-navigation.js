import {displayMeters} from '../world/distance-units.js';
// 尾怪方向使用正式镜头投影，界面不改变镜头或输入；几何计算可独立验证。
import {nearest} from '../world/coordinates.js';
import {waveTailTargets} from '../core/wave-tail-targets.js';
import {WAVE_TAIL_NAVIGATION as STYLE} from '../config/wave-tail-navigation.js';

// 已经出现在视口中的怪物不用指向箭头；边缘身体露出也视为可见。
export function projectTailTarget(enemy,view){
 const p=nearest(enemy,{x:view.x+view.w/2,y:view.y+view.h/2}),x=(p.x-view.x)*view.zoom,y=(p.y-view.y)*view.zoom;
 const radius=((enemy.radius||20)+18)*view.zoom,width=view.w*view.zoom,height=view.h*view.zoom;
 return {x,y,visible:x+radius>=0&&x-radius<=width&&y+radius>=0&&y-radius<=height};
}

// 射线先落到屏幕内边缘，再选最近的无障碍边缘位置，同方向提示互相留距。
export function placeTailMarker(target,width,height,blocked=[]){
 const hx=STYLE.width/2,hy=STYLE.height/2,left=hx+STYLE.edge,right=width-hx-STYLE.edge,top=hy+STYLE.edge,bottom=height-hy-STYLE.edge;
 if(right<left||bottom<top)return null;
 const cx=width/2,cy=height/2,dx=target.x-cx,dy=target.y-cy;
 const t=Math.min(dx?((dx>0?right:left)-cx)/dx:Infinity,dy?((dy>0?bottom:top)-cy)/dy:Infinity);
 if(!Number.isFinite(t))return null;
 const ideal={x:cx+dx*t,y:cy+dy*t},candidates=[ideal];
 for(let x=left;x<=right;x+=10)candidates.push({x,y:top},{x,y:bottom});
 for(let y=top;y<=bottom;y+=10)candidates.push({x:left,y},{x:right,y});
 const free=candidates.filter(p=>!blocked.some(b=>p.x+hx+STYLE.gap>b.left&&p.x-hx-STYLE.gap<b.right&&p.y+hy+STYLE.gap>b.top&&p.y-hy-STYLE.gap<b.bottom));
 free.sort((a,b)=>(a.x-ideal.x)**2+(a.y-ideal.y)**2-((b.x-ideal.x)**2+(b.y-ideal.y)**2));
 const p=free[0];return p?{...p,angle:Math.atan2(target.y-p.y,target.x-p.x)*180/Math.PI+90}:null;
}

// 只复用三个只读提示，不添加按钮，不抢夺触控，也不持续播报距离变化。
export function createWaveTailNavigation({game,root,renderer}){
 const frame=root.getElementById('game-frame'),layer=root.createElement('div');
 layer.id='wave-tail-navigation';layer.hidden=true;frame.append(layer);
 const nodes=Array.from({length:STYLE.remaining},()=>{
  const node=root.createElement('div');node.className='wave-tail-marker';node.hidden=true;node.setAttribute('role','img');
  node.innerHTML='<svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="16"/><path d="M18 6 27 25 18 21 9 25Z"/></svg><span></span>';layer.append(node);return node;
 });
 // 读取正式控件的可见矩形，兼容手机菜单展开和任务卡高度变化。
 function blockers(canvas){
  return [...root.querySelectorAll('.hud-resources,.location-chip,#mainline-hud,#quest,#boss-hud,#equipment-goal,.field-menu button,.player-hud,#joystick,#toast.visible,#fire-notice')]
   .filter(n=>!n.hidden&&n.getClientRects().length&&root.defaultView.getComputedStyle(n).visibility!=='hidden')
   .map(n=>{const b=n.getBoundingClientRect();return {left:b.left-canvas.left,right:b.right-canvas.left,top:b.top-canvas.top,bottom:b.bottom-canvas.top};});
 }
 // 每帧在正式镜头更新后跟随目标，离开战斗立即清空旧提示。
 function renderFrame(){
  nodes.forEach(n=>n.hidden=true);layer.hidden=true;
  if(root.hidden||frame.dataset.page!=='game'||root.querySelector('dialog[open]')||!renderer.view)return;
  const targets=waveTailTargets(game);if(!targets.length)return;
  const view=renderer.view,c=renderer.canvas.getBoundingClientRect(),f=frame.getBoundingClientRect(),blocked=blockers(c);
  let shown=0;
  for(const {enemy,distance} of targets){
   const target=projectTailTarget(enemy,view);if(target.visible)continue;
   const point=placeTailMarker(target,c.width,c.height,blocked);if(!point)continue;
   const meters=displayMeters(distance),node=nodes[shown++];node.hidden=false;node.style.left=(point.x+c.left-f.left)+'px';node.style.top=(point.y+c.top-f.top)+'px';
   node.querySelector('path').setAttribute('transform',`rotate(${point.angle} 18 18)`);node.querySelector('span').textContent=meters+'米';
   node.dataset.enemy=String(enemy.id);node.dataset.angle=String(point.angle);node.dataset.distance=String(meters);node.setAttribute('aria-label','剩余怪物，直线距离'+meters+'米');
   blocked.push({left:point.x-STYLE.width/2,right:point.x+STYLE.width/2,top:point.y-STYLE.height/2,bottom:point.y+STYLE.height/2});
  }
  layer.hidden=shown===0;
 }
 // 应用重建时释放提示层，防止重复挂载。
 function dispose(){layer.remove();}
 return {renderFrame,dispose};
}
