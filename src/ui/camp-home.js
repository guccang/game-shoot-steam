// 营地停驻车点击与小屋操作层：实际移动仍由正式输入和核心规则处理。
import {createWorkshopRoomControls} from './workshop-room.js';
import {createHomeDecor} from './home-decor.js';
import {createRoomExit} from './room-exit.js';
import {interiorLayout} from '../config/workshop-interiors.js';
import {createEventScope} from '../platform/events.js';
import {sceneHit,placeSceneHit} from './scene-hit.js';
import {parkedOwned,boardParkedVehicle,campParkingVisible,arrivalParkingAllowed} from '../core/camp-parking.js';
import {sleepInCottage,cancelCottageRest} from '../core/cottage.js';
import {COTTAGE} from '../config/cottage.js';
import {nearest,worldDistance} from '../world/coordinates.js';
import {vehicleModel} from '../config/vehicles.js';
import {calendarView} from '../world/living-calendar.js';
import {cottageRestTimeView} from './cottage-rest-time.js';
import {prepareMobilePanel} from './mobile-panels.js';

// 热点只有靠近车辆时出现，不遮住建筑，也不让远处点击传送上车。
export function createCampHome({game,renderer,root,input,onChange,openWorkshop,dialogs,onDecorChange}){
 const scope=createEventScope(),frame=root.getElementById('game-frame'),hits=new Map(),panel=root.createElement('section');
 panel.id='cottage-controls';panel.hidden=true;panel.innerHTML='<header><b>巡林小屋</b><small id="cottage-date"></small></header><footer><p id="cottage-notice" role="status"></p></footer><dialog id="cottage-rest-dialog" aria-labelledby="cottage-rest-title" aria-describedby="cottage-rest-description"><small>巡林小屋</small><h2 id="cottage-rest-title">休息一下</h2><p id="cottage-rest-description">当前游戏时间</p><div class="cottage-rest-options"><button id="cottage-sleep-phase"><span>睡到下一时段</span><small id="cottage-phase-time"></small></button><button id="cottage-sleep-morning"><span>睡到明早</span><small id="cottage-morning-time"></small></button><button id="cottage-rest-cancel">暂不休息</button></div></dialog>';
 const restDialog=panel.querySelector('#cottage-rest-dialog');
 frame.append(panel);
 prepareMobilePanel(restDialog);
 const workshopRoom=createWorkshopRoomControls({game,renderer,root,panel,input,openWorkshop:(kind,index)=>['cottage','furniture'].includes(kind)?homeDecor.open():openWorkshop(kind,index),onChange});
 const roomExit=createRoomExit({game,renderer,root,panel,input,onChange});
 const homeDecor=createHomeDecor({game,root,panel,dialogs,input,onChange:onDecorChange});
 // 上下车后清掉摇杆残量，避免点击动作留下持续行走输入。
 function board(hull){input.reset();if(boardParkedVehicle(game,hull)){renderer.camera.time=null;onChange();}}
 // 取消按钮与Esc使用同一闩锁，防止关闭后下一帧立即再次打开。
 function dismissRest(){input.reset();cancelCottageRest(game);render();}
 scope.on(panel.querySelector('#cottage-rest-cancel'),'click',dismissRest);
 scope.on(restDialog,'cancel',e=>{e.preventDefault();dismissRest();});
 // 输入在关闭意图发起时清理，异步close事件不再清空玩家刚按下的新方向键。
 scope.on(restDialog,'close',()=>{cancelCottageRest(game);});
 for(const mode of ['phase','morning'])scope.on(panel.querySelector('#cottage-sleep-'+mode),'click',()=>{input.reset();sleepInCottage(game,mode);render();});
 // 场景短按命中真实车体，按住拖动不算上车。
 function tap(e){
  if(game.cottage){workshopRoom.tap(e);return true;}
  if(!campParkingVisible(game)||game.state!=='playing'||root.querySelector('dialog[open]')||!renderer.view)return false;
  const v=renderer.view,r=renderer.canvas.getBoundingClientRect(),point={x:v.x+(e.clientX-r.left)/r.width*v.w,y:v.y+(e.clientY-r.top)/r.height*v.h};
  const item=parkedOwned(game).find(s=>{const p=nearest(s,point);return worldDistance(s,game.player)<=155&&Math.abs(p.x-point.x)<48&&point.y>p.y-80&&point.y<p.y+22;});
  if(!item)return false;board(item.record.hull);return true;
 }
 // 世界热点和室内面板都从当前记录投影，不积累离场车辆或重复DOM。
 function render(){
  const room=game.cottage;frame.classList.toggle('inside-cottage',!!room);panel.hidden=!room;workshopRoom.render();roomExit.render();homeDecor.render();
  panel.dataset.room=room?.kind||'cottage';panel.querySelector('header b').textContent=interiorLayout(room).name;
  if(!room?.restOpen&&restDialog.open)restDialog.close();
  if(room?.restOpen&&!restDialog.open&&game.state==='playing'&&!root.querySelector('dialog[open]')){
   input.reset();restDialog.showModal();panel.querySelector('#cottage-sleep-phase').focus({preventScroll:true});
  }
  if(room){
   // 随历法刷新当前钟点与两个休息目标，保持按钮节点和键盘焦点稳定。
   if(room.restOpen){
    const times=cottageRestTimeView(game.progress.living.calendar);
    panel.querySelector('#cottage-rest-description').textContent='当前游戏时间 '+times.current+' · 睡醒恢复全部生命';
    for(const mode of ['phase','morning'])panel.querySelector('#cottage-'+mode+'-time').textContent=times[mode];
   }
   panel.querySelector('#cottage-date').textContent=calendarView(game.progress.living.calendar).label;
   const home=!room.kind||room.kind==='cottage';
   const near=home&&Math.hypot(game.player.x-COTTAGE.bed.x,game.player.y-COTTAGE.bed.y)<=COTTAGE.bedRadius;
   const notice=panel.querySelector('#cottage-notice');
   // 睡醒结果保留在屋内底部，独立纸色底板让回血和保存失败信息都清楚可读。
   notice.dataset.result=String(home&&!!room.restResult&&!room.sleep&&!room.exitElapsed);
   notice.textContent=room.sleep?room.notice:room.exitElapsed>0?'即将出门 · 移开可取消':!home?'点击屋内售货员打开服务；门口站定 1 秒出门。':room.restResult?room.restResult:near?'点击「休息一下」，睡醒恢复全部生命。':'床边可以休息，点击「装扮小屋」布置家具；门口站定 1 秒出门。';
   for(const mode of ['phase','morning'])panel.querySelector('#cottage-sleep-'+mode).disabled=!near||!!room.sleep||game.state!=='playing';
  }
  const list=campParkingVisible(game)&&game.state==='playing'&&!root.querySelector('dialog[open]')?parkedOwned(game).filter(s=>arrivalParkingAllowed(game,s.record.hull)&&worldDistance(s,game.player)<=155):[];
  for(const [hull,node] of hits)if(!list.some(s=>s.record.hull===hull)){node.remove();hits.delete(hull);}
  for(const s of list){let node=hits.get(s.record.hull);if(!node){node=root.createElement('button');sceneHit(node,'上车：'+vehicleModel(s.record.hull).shortName);node.classList.add('parked-vehicle-hit');node.dataset.parkedHull=s.record.hull;scope.on(node,'click',e=>{if(e.detail===0)board(s.record.hull);});frame.append(node);hits.set(s.record.hull,node);}node.setAttribute('aria-label',(game.vehicle.active?'换车：':'上车：')+vehicleModel(s.record.hull).shortName);placeSceneHit(node,s,renderer,frame,{width:90,height:86,foot:18});}
 }
 // 卸载清理动态热点，返回首页不能遗留室内样式。
 function dispose(){homeDecor.dispose();roomExit.dispose();workshopRoom.dispose();scope.dispose();if(restDialog.open)restDialog.close();cancelCottageRest(game);panel.remove();for(const node of hits.values())node.remove();frame.classList.remove('inside-cottage');}
 return {tap,render,dispose,openHomeDecor:homeDecor.open};
}
