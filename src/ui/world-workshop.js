// 建筑本体与门前空地都是透明入口，短按走到门口，拖动继续使用摇杆。
import {CLICK_BUILDINGS,clickableBuildings,buildingContains,buildingClickHeight,approachBuilding} from '../core/scene-approach.js';
import {SCENE_APPROACH} from '../config/scene-approach.js';
import {facilityOpen} from '../config/town-restoration.js';
import {sceneHit,placeSceneHit} from './scene-hit.js';
import {createEventScope} from '../platform/events.js';

// 两个既有工坊组件按目录分工，所有营业建筑只注册一次热点。
export function createWorldWorkshop({game,renderer,root,kind,onLocked}){
 const scope=createEventScope(),frame=root.getElementById('game-frame'),layer=root.createElement('div');
 layer.className='world-building-entrances';layer.style.pointerEvents='none';
 const buildings=CLICK_BUILDINGS.filter(b=>kind==='vehicle'?b.id==='vehicle':b.id!=='vehicle');
 // 门前优先于相邻告示牌向上扩出的透明边缘，固定HUD仍在更高层。
 const buttons=buildings.map(b=>{const button=root.createElement('button');sceneHit(button,'进入'+b.name);button.dataset.buildingEntry=b.id;button.style.pointerEvents='auto';button.style.zIndex='5';scope.on(button,'click',event=>{if(event.detail===0)activate(b);});layer.append(button);return button;});
 renderer.canvas.after(layer);
 // 激活时重查权限，修复页继续由原事务处理，不用点击绕过建筑解锁。
 function activate(building){
  if(root.hidden||root.querySelector('dialog[open]')||!clickableBuildings(game).some(b=>b.id===building.id))return false;
  const id=building.id==='vehicle'?'garage':building.id;
  if(!facilityOpen(game.progress,id)){onLocked?.(id);return true;}
  return approachBuilding(game,building.id);
 }
 // 画布短按和透明按钮使用同一世界坐标，门前无需命中文字。
 function tap(event){
  if(!renderer.view||root.querySelector('dialog[open]'))return false;
  const r=renderer.canvas.getBoundingClientRect(),v=renderer.view,point={x:v.x+(event.clientX-r.left)/r.width*v.w,y:v.y+(event.clientY-r.top)/r.height*v.h};
  const building=buildings.find(b=>buildingContains(b,point,game));return building?activate(building):false;
 }
 // 屋顶至门前合并为透明触控区，保留中文无障碍名称与44像素最小边界。
 function render(){
  const available=clickableBuildings(game);layer.hidden=root.hidden||!!root.querySelector('dialog[open]')||!available.length;
  if(layer.hidden)return;
  buildings.forEach((b,i)=>{const button=buttons[i];if(!available.some(item=>item.id===b.id)){button.hidden=true;return;}const foot=b.door.y-b.site.y+SCENE_APPROACH.doorDepth;placeSceneHit(button,b.site,renderer,frame,{width:b.site.width,height:buildingClickHeight(b,game)+foot,foot});});
 }
 // 离场销毁热点及监听，不保留旧建筑的点击接线。
 function dispose(){scope.dispose();layer.remove();}
 return {tap,render,dispose};
}
