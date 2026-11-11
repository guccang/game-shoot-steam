import {mountedWeapon} from './mounted-weapon.js';
import {rearSEMount} from '../config/vehicle-se-mount.js';
// SE 运行控制：自动运动只输出输入向量，伤害与火箭沿用正式战斗链。
import {energyShieldPoint} from './energy-shield-surface.js';
import {recordShieldImpact,advanceShieldImpacts} from './energy-shield.js';
import {seActive,seBuild,seLevel,seShieldMax} from '../config/vehicle-se.js';
import {canonical,nearest,worldDistance} from '../world/coordinates.js';
import {trackedLivingRequest} from '../core/navigation/task-tracking.js';
import {livingRequestTarget} from '../core/camp/living-world.js';
import {storyRouteState} from '../core/navigation/story-route.js';
import {livingRouteStates} from '../core/navigation/living-route.js';
import {taskNavigationEnabled} from '../core/navigation/task-navigation.js';
import {worldNavigationObjective} from '../core/navigation/world-navigation.js';
import {playerNavigationBody,createPlayerNavigationIndex} from '../core/navigation/prepared-navigation.js';
import {createVisualRouteSession,advanceVisualRouteSession} from '../core/navigation/visual-route-cache.js';
import {movementLoadFactor} from '../progression/inventory/load-weight.js';
import {blocked} from '../physics/motion.js';
import {questLineClear} from '../physics/quest-route.js';
import {treeGrid} from '../world/spatial-grid.js';
import {emitWeaponAttack} from './weapon-fire.js';
import {attackTargetKnown,attackTargetVisible,combatView} from './perception.js';
// 与任务指引共用目的地优先级，邻里委托使用当前节点的实时位置。
function drivingDestination(game){
 if(!taskNavigationEnabled(game))return null;
 const objective=worldNavigationObjective(game);
 if(objective)return objective.navigation===false?null:{
  site:objective.site,taskId:objective.key==='visit'?null:objective.task.id,route:'mainline'
 };
 const request=trackedLivingRequest(game);
 const site=request && livingRequestTarget(game,request);
 return site?{site,taskId:request.id,route:'living'}:null;
}
// 主动前往任务时接入车载驾驶；正常步行仍由原有任务入口处理。
export function driveToTrackedTask(game){
 if(!seActive(game,'autopilot'))return;
 const result=startSEControl(game,'autopilot');
 if(result.ok)syncSEControl(game);
 else game.onEvent?.('story-hint',{text:result.message});
}
// 只有已经开始的倒车或停稳才占用驾驶；泊位附近的点击提示允许车辆自行驶离。
function parkingControlsVehicle(g){return ['align','reverse','parked'].includes(g.parking?.phase);}
// 临时访问点按地点区分，任务则按任务身份区分，移动中的居民不会反复重启导航。
function destinationKey(d){return [d.route,d.taskId||'visit',d.site.mapId,d.site.id??(d.site.x+','+d.site.y)].join(':');}
// 新的移动阶段从当前位置规划，战后绕开已偏离的旧路段。
function beginControl(g,mode,destination){
 g.seControl={mode,taskId:destination?.taskId,taskRoute:destination?.route,routeKey:destination?destinationKey(destination):null,
  hull:g.vehicle.index,mapId:g.mapId,player:g.player,anchor:canonical(g.player),radius:seBuild(g.progress,g.vehicle.index).radius,
  goal:destination?canonical(destination.site):null,clock:0,still:0,last:canonical(g.player),status:mode==='combat'?'圈内巡战':'规划路线'};
}
// 主动选择路线可解除对同一目标的手动接管。
export function startSEControl(g,mode){
 if(!['combat','autopilot'].includes(mode)||!seActive(g,mode)||g.cottage||parkingControlsVehicle(g)||!['playing','paused'].includes(g.state))return {ok:false,message:'请驾驶安装并开启对应装置的载具，在室外启动。'};
 if(movementLoadFactor(g)<=0)return {ok:false,message:'车辆当前无法移动，请先维修或减重。'};
 const destination=mode==='autopilot'?drivingDestination(g):null;
 if(mode==='autopilot'&&(!destination?.site||destination.site.mapId&&destination.site.mapId!==g.mapId))return {ok:false,message:'请先在地图或任务中选择当前地图的导航目标。'};
 g.sePausedRoute=null;
 beginControl(g,mode,destination);
 return {ok:true,message:mode==='combat'?'巡战已启动。':'已接管当前导航。'};
}
// 根据装置开关与当前目标确定走位优先级，临时交战期间保留正式导航意图。
export function syncSEControl(g){
 const combat=seActive(g,'combat'),drive=seActive(g,'autopilot'),old=g.seControl;
 if(old&&(old.hull!==g.vehicle.index||old.mapId!==g.mapId||old.player!==g.player)){
  g.seControl=null;g.sePausedRoute=null;return;
 }
 if((!combat&&!drive)||g.cottage||parkingControlsVehicle(g)||g.player.hp<=0||g.waystationTravel||g.sceneApproach||!['playing','paused'].includes(g.state)){
  g.seControl=null;if(!drive)g.sePausedRoute=null;return;
 }
 if(movementLoadFactor(g)<=0){g.seControl=null;return;}
 const dest=drive?drivingDestination(g):null;
 const key=dest?.site&&(!dest.site.mapId||dest.site.mapId===g.mapId)?destinationKey(dest):null;
 if(!key||g.sePausedRoute?.key!==key||g.sePausedRoute?.vehicle!==g.vehicle||g.sePausedRoute?.player!==g.player)g.sePausedRoute=null;
 const travelling=key&&!g.sePausedRoute;
 const radius=seBuild(g.progress,g.vehicle.index).radius;
 const anchor=old?.mode==='combat'?old.anchor:g.player;
 const engaged=combat&&travelling&&[...(g.enemies||[]),...(g.boss?[g.boss]:[])].some(t=>t.hp>0&&worldDistance(t,anchor)<=radius&&attackTargetKnown(g,t));
 const mode=travelling&&!engaged?'autopilot':combat?'combat':null;
 if(!mode){g.seControl=null;return;}
 if(old?.mode!==mode||(mode==='autopilot'&&old.routeKey!==key))beginControl(g,mode,mode==='autopilot'?dest:null);
 const s=g.seControl;s.radius=radius;
 if(mode==='autopilot')s.goal=canonical(dest.site);
}
// 选择可见敌人，圈外敌人不作为主动追击目标。
export function seTargetAllowed(g,t){const s=g.seControl;return !s||s.mode!=='combat'||worldDistance(t,s.anchor)<=s.radius;}
// 统一取消临时驾驶状态并显示停止原因。
function stop(g,text){if(g.seControl?.mode==='autopilot')g.sePausedRoute={key:g.seControl.routeKey,vehicle:g.vehicle,player:g.player};g.seControl=null;g.onEvent?.('story-hint',{text});return {x:0,y:0};}
// 预测短时间来弹与敌人接触风险；十二方向加原地候选遵守地形、树干与巡战圆边界。
export function combatSteering(g,s){
 const range=mountedWeapon(g)?.range||0;
 const p=g.player,body=playerNavigationBody(g),targets=[...(g.enemies||[]),...(g.boss?[g.boss]:[])].filter(t=>t.hp>0&&!t.equipmentObstacle&&(seTargetAllowed(g,t)||worldDistance(p,t)<=range)&&attackTargetKnown(g,t)).sort((a,b)=>worldDistance(p,a)-worldDistance(p,b));
 // 距离相近的敌人交错时维持当前走位目标，明显更近的威胁仍可立即接管。
 const closest=targets[0],previous=s.steeringTarget;
 const inRange=closest&&worldDistance(p,closest)<=range;
 const target=previous&&targets.includes(previous)&&(!inRange||worldDistance(p,previous)<=range)&&worldDistance(p,previous)<=worldDistance(p,closest)+30?previous:closest;
 s.steeringTarget=target;
 // 用镜头短边的世界长度计算交战距离，偏移镜头还要给目标留出可见边距。
 const view=target&&combatView(g);
 let spacing=range;
 const distance=target?worldDistance(p,target):0;
 if(view){
  const t=nearest(target,p),dx=t.x-p.x,dy=t.y-p.y;
  const edgeX=dx===0?Infinity:distance*Math.max(0,(dx>0?view.right:-view.left)-12)/Math.abs(dx);
  const edgeY=dy===0?Infinity:distance*Math.max(0,(dy>0?view.bottom:-view.top)-12)/Math.abs(dy);
  spacing=Math.min(range,(view.right-view.left)/2,(view.bottom-view.top)/2,edgeX,edgeY);
 }
 const inner=view?Math.max(0,spacing-Math.min(16,spacing*.1)):0;
 // 二分之一视野用于近身后撤；可见目标在炮程内时，整段安全距离都能驻车开火。
 const outer=target&&attackTargetVisible(g,target)?range:spacing;
 const error=d=>Math.max(0,d-outer,inner-d);
 const currentError=error(distance);
 const step=Math.min(55,currentError);
 const horizon=.6+.15*seLevel(seBuild(g.progress,g.vehicle.index),'combat');
 const nearby=targets.slice(0,16),trees=g.trees||[],grid=treeGrid(trees);
 const bolts=(g.enemyBolts||[]).slice(0,24).map(b=>({...nearest(b,p),vx:b.dx*b.speed,vy:b.dy*b.speed,radius:b.radius||0}));
 let best={x:0,y:0},bestScore=-Infinity;
 for(let i=-1;i<12;i++){const angle=i*Math.PI/6,v=i<0?{x:0,y:0}:{x:Math.cos(angle),y:Math.sin(angle)},q={x:p.x+v.x*55,y:p.y+v.y*55};
  if(i>=0&&(worldDistance(q,s.anchor)>s.radius-25||blocked(q.x,q.y,body.radius||18,trees,body)||!questLineClear(p,q,body,grid)))continue;
  // 距离修正仅向前预测所需步长，避弹与通行检查仍使用完整预测距离。
  const projected=target?worldDistance({x:p.x+v.x*step,y:p.y+v.y*step},target):0;
  const gap=error(projected);
  let score=target&&range>0?(currentError-gap)*.45:target?0:-worldDistance(q,s.anchor)*.03;
  if(target&&range>0&&currentError>0&&gap<=currentError*.1)score+=6;
  for(const e of nearby)score-=Math.max(0,Math.min(95,spacing||95)-worldDistance(q,e))*3;
  for(const b of bolts){const {vx,vy}=b,t=Math.max(0,Math.min(horizon,((q.x-b.x)*vx+(q.y-b.y)*vy)/Math.max(1,vx*vx+vy*vy))),d=Math.hypot(q.x-b.x-vx*t,q.y-b.y-vy*t);score-=Math.max(0,70+(b.radius||0)-d)*5;}
  // 停在合适射距内；移动方案接近时优先延续原方向，来弹风险仍逐帧比较。
  if(i<0)score+=inRange&&currentError===0?6:s.steeringDirection===null?3:2;
  else if(s.steeringDirection)score-=3*(1-v.x*s.steeringDirection.x-v.y*s.steeringDirection.y);
  if(score>bestScore){bestScore=score;best=v;}
 }
 // 自动巡战决定驻车时立即制动，保留击退等外部冲量。
 if(inRange&&!best.x&&!best.y)p.vx=p.vy=0;
 s.steeringDirection=best.x||best.y?best:null;
 s.status=target?'接敌 / 预测避弹':'圈内待命';return best;
}
// 巡战让出手动移动输入；自动驾驶遇到手动输入结束行程。暂停冻结两种控制。
export function updateSEControl(g,dt,input){syncSEControl(g);const s=g.seControl;if(!s)return input;
 if(g.state!=='playing'||dt<=0)return input;
 if(Math.hypot(input.x,input.y)>.01){
  if(s.mode==='combat'){
   s.manual=true;s.steeringDirection=null;s.steeringTarget=null;
   s.status='手动走位 · 巡战中';
   if(worldDistance(g.player,s.anchor)>s.radius)s.anchor=canonical(g.player);
  }else {g.sePausedRoute={key:s.routeKey,vehicle:g.vehicle,player:g.player};g.seControl=null;}
  return input;
 }
 if(s.manual){
  if(worldDistance(g.player,s.anchor)>s.radius-25)s.anchor=canonical(g.player);
  s.manual=false;
 }
 s.clock+=dt;if(s.mode==='combat'){if(worldDistance(g.player,s.anchor)>s.radius)return stop(g,'已离开巡战范围，恢复手动驾驶。');return combatSteering(g,s);}
 let route;
 if(s.taskId){
  route=s.taskRoute==='living'?livingRouteStates(g)[0]:storyRouteState(g);
  if(route?.near)return stop(g,'自动驾驶已到达任务地点。');
  if(!route)return stop(g,'当前任务路线已结束。');
 }else if(worldDistance(g.player,s.goal)<35)return stop(g,'自动驾驶已到达目标附近。');
 if(!route){
  const body=playerNavigationBody(g);
  s.session??=createVisualRouteSession(body,s.goal,createPlayerNavigationIndex(g.trees||[]),s.clock,null,{budget:120000});
  route=advanceVisualRouteSession(s.session,body,s.clock);
 }
 if(!route.reachable){s.planningTime=(s.planningTime||0)+dt;if(!route.planning||s.planningTime>120)return stop(g,'自动驾驶未找到可通行路线，请调整目标。');return {x:0,y:0};}
 s.planningTime=0;
 s.still=worldDistance(g.player,s.last)<.1?s.still+dt:0;s.last=canonical(g.player);if(s.still>2)return stop(g,'自动驾驶前方受阻，请手动调整。');
 const q=nearest(route.points[1]||s.goal,g.player),dx=q.x-g.player.x,dy=q.y-g.player.y,d=Math.hypot(dx,dy);s.status='沿路线驾驶';return {x:dx/Math.max(1,d),y:dy/Math.max(1,d)};
}
// 护罩承伤先于车体，等待与剩余容量持久保存，反复装卸不能瞬间充满。
export function absorbSEShield(g,amount,source=null){
 if(!seActive(g,'shield')||amount<=0)return amount;
 const build=seBuild(g.progress,g.vehicle.index),absorbed=Math.min(amount,build.shield);
 build.shield-=absorbed;
 build.shieldWait=8;
 if(absorbed>0){
  const point=energyShieldPoint(g,source);
  if(g.seShieldEffects?.vehicle!==g.vehicle)g.seShieldEffects={vehicle:g.vehicle};
  recordShieldImpact(g.seShieldEffects,point);
  g.float?.(point.x,point.y,'SE护罩 −'+Math.ceil(absorbed),'#a4dacd');
 }
 return amount-absorbed;
}
// 火箭以两发重炮弹驱动独立双联炮口，正式弹道负责扫掠、遮挡、爆炸与统计。
export function updateSEDevices(g,dt){
 if(g.seShieldEffects){
  if(g.seShieldEffects.vehicle!==g.vehicle||!seActive(g,'shield'))g.seShieldEffects=null;
  else if(g.state==='playing'&&dt>0)advanceShieldImpacts(g.seShieldEffects,dt);
 }
 if(g.state!=='playing'||dt<=0||!g.vehicle.active||g.cottage)return;const b=seBuild(g.progress,g.vehicle.index);
 if(seActive(g,'shield')){const wait=Math.min(dt,b.shieldWait);b.shieldWait-=wait;b.shield=Math.min(seShieldMax(b),b.shield+(dt-wait)*18);}
 if(!seActive(g,'rocket')||g.parking?.idle)return;b.rocketWait=Math.max(0,b.rocketWait-dt);const stock=g.progress.supplies.vehicles[g.vehicle.index];if(b.rocketWait>0||stock.heavy<2)return;
 const t=[...g.enemies,...(g.boss?[g.boss]:[])].filter(t=>t.hp>0&&worldDistance(t,g.player)<=360&&attackTargetKnown(g,t)&&(!g.combatLineClear||g.combatLineClear(g.player,nearest(t,g.player)))).sort((a,b)=>worldDistance(a,g.player)-worldDistance(b,g.player))[0];if(!t)return;
 const mount=rearSEMount(g.player,g.vehicle.index,b.installed,'rocket');
 const p=nearest(t,mount),angle=Math.atan2(p.y-mount.y,p.x-mount.x);stock.heavy-=2;b.rocketWait=8-seLevel(b,'rocket');
 for(const side of [-1,1]){const a=angle+side*.035,d={x:Math.cos(a),y:Math.sin(a)},m={x:mount.x+side*3,y:mount.y-5};emitWeaponAttack(g,{id:'se-rocket',vehicleMounted:true,targetTrees:true,range:420,speed:720,pellets:1,spread:0,hitRadius:5,blastRadius:75,blastRatio:.65,impulse:250,color:'#efbb7c'},m,d,125,false,true);}
}
