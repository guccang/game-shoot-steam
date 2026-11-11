// SE 运行控制：自动运动只输出输入向量，伤害与火箭沿用正式战斗链。
import {seActive,seBuild} from '../config/vehicle-se.js';
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
import {attackTargetKnown} from './perception.js';
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
 if(!result.ok)game.onEvent?.('story-hint',{text:result.message});
}
// 自动模式互斥；暂停页面可提交，实际行动仅在关闭页面后推进。
export function startSEControl(g,mode){
 if(mode==='stop'){g.seControl=null;return {ok:true,message:'已切换手动驾驶。'};}
 if(!['combat','autopilot'].includes(mode)||!seActive(g,mode)||g.cottage||g.parking||!['playing','paused'].includes(g.state))return {ok:false,message:'请驾驶安装并开启对应装置的载具，在室外启动。'};
 if(movementLoadFactor(g)<=0)return {ok:false,message:'车辆当前无法移动，请先维修或减重。'};
 const destination=mode==='autopilot'?drivingDestination(g):null;
 const goal=destination?.site;
 if(mode==='autopilot'&&(!goal||goal.mapId&&goal.mapId!==g.mapId))return {ok:false,message:'请先在地图或任务中选择当前地图的导航目标。'};
 g.waystationTravel=null;g.sceneApproach=null;g.seControl={mode,taskId:destination?.taskId,taskRoute:destination?.route,hull:g.vehicle.index,mapId:g.mapId,player:g.player,anchor:canonical(g.player),radius:seBuild(g.progress,g.vehicle.index).radius,goal:goal?canonical(goal):null,clock:0,still:0,last:canonical(g.player),status:mode==='combat'?'圈内巡战':'规划路线'};
 return {ok:true,message:mode==='combat'?'巡战已启动，手动走位后松开即可继续巡战。':'自动驾驶已启动，手动移动可立即接管。'};
}
// 选择可见敌人，圈外敌人不作为主动追击目标。
export function seTargetAllowed(g,t){const s=g.seControl;return !s||s.mode!=='combat'||worldDistance(t,s.anchor)<=s.radius;}
// 统一取消临时驾驶状态并显示停止原因。
function stop(g,text){g.seControl=null;g.onEvent?.('story-hint',{text});return {x:0,y:0};}
// 预测短时间来弹与敌人接触风险；十二方向加原地候选遵守地形、树干与巡战圆边界。
export function combatSteering(g,s){
 const p=g.player,body=playerNavigationBody(g),targets=[...(g.enemies||[]),...(g.boss?[g.boss]:[])].filter(t=>t.hp>0&&seTargetAllowed(g,t)&&attackTargetKnown(g,t)).sort((a,b)=>worldDistance(p,a)-worldDistance(p,b)),target=targets[0];
 let best={x:0,y:0},bestScore=-Infinity;
 for(let i=-1;i<12;i++){const angle=i*Math.PI/6,v=i<0?{x:0,y:0}:{x:Math.cos(angle),y:Math.sin(angle)},q={x:p.x+v.x*55,y:p.y+v.y*55};
  if(worldDistance(q,s.anchor)>s.radius-25||blocked(q.x,q.y,body.radius||18,g.trees||[],body)||!questLineClear(p,q,body,treeGrid(g.trees||[])))continue;
  let score=target?-Math.abs(worldDistance(q,target)-150)*.1:-worldDistance(q,s.anchor)*.03;
  for(const e of targets.slice(0,16))score-=Math.max(0,95-worldDistance(q,e))*3;
  for(const b of (g.enemyBolts||[]).slice(0,24)){const point=nearest(b,p),vx=b.dx*b.speed,vy=b.dy*b.speed,t=Math.max(0,Math.min(.6,((q.x-point.x)*vx+(q.y-point.y)*vy)/Math.max(1,vx*vx+vy*vy))),d=Math.hypot(q.x-point.x-vx*t,q.y-point.y-vy*t);score-=Math.max(0,70+(b.radius||0)-d)*5;}
  if(i<0)score+=2;if(score>bestScore){bestScore=score;best=v;}
 }
 s.status=target?'接敌 / 预测避弹':'圈内待命';return best;
}
// 巡战让出手动移动输入；自动驾驶遇到手动输入结束行程。暂停冻结两种控制。
export function updateSEControl(g,dt,input){const s=g.seControl;if(!s)return input;

 if(!seActive(g,s.mode)||s.hull!==g.vehicle.index||s.mapId!==g.mapId||s.player!==g.player||g.cottage||g.parking||g.player.hp<=0||g.waystationTravel||g.sceneApproach){g.seControl=null;return input;}
 if(g.state!=='playing'||dt<=0)return input;
 if(Math.hypot(input.x,input.y)>.01){
  if(s.mode==='combat'){
   s.manual=true;
   s.status='手动走位 · 巡战中';
   if(worldDistance(g.player,s.anchor)>s.radius)s.anchor=canonical(g.player);
  }else g.seControl=null;
  return input;
 }
 if(s.manual){
  if(worldDistance(g.player,s.anchor)>s.radius-25)s.anchor=canonical(g.player);
  s.manual=false;
 }
 if(movementLoadFactor(g)<=0)return stop(g,'SE驾驶停止：车辆无法移动。');
 s.clock+=dt;if(s.mode==='combat'){if(worldDistance(g.player,s.anchor)>s.radius)return stop(g,'已离开巡战范围，恢复手动驾驶。');return combatSteering(g,s);}
 let route;
 if(s.taskId){
  const target=drivingDestination(g);
  if(!target || target.taskId!==s.taskId || target.route!==s.taskRoute || (target.site.mapId && target.site.mapId!==g.mapId)){
   return stop(g,'任务指引已结束或目标已切换。');
  }
  s.goal=canonical(target.site);
  route=s.taskRoute==='living'?livingRouteStates(g)[0]:storyRouteState(g);
  if(route?.near)return stop(g,'自动驾驶已到达任务地点。');
  if(!route)return stop(g,'当前任务路线已结束。');
 }else if(worldDistance(g.player,s.goal)<35)return stop(g,'自动驾驶已到达目标附近。');
 if(!route){
  const body=playerNavigationBody(g);
  s.session??=createVisualRouteSession(body,s.goal,createPlayerNavigationIndex(g.trees||[]),s.clock,null,{budget:120000});
  route=advanceVisualRouteSession(s.session,body,s.clock);
 }
 if(!route.reachable){if(!route.planning||s.clock>120)return stop(g,'自动驾驶未找到可通行路线，请调整目标。');return {x:0,y:0};}
 s.still=worldDistance(g.player,s.last)<.1?s.still+dt:0;s.last=canonical(g.player);if(s.still>2)return stop(g,'自动驾驶前方受阻，请手动调整。');
 const q=nearest(route.points[1]||s.goal,g.player),dx=q.x-g.player.x,dy=q.y-g.player.y,d=Math.hypot(dx,dy);s.status='沿路线驾驶';return {x:dx/Math.max(1,d),y:dy/Math.max(1,d)};
}
// 护罩承伤先于车体，等待与剩余容量持久保存，反复装卸不能瞬间充满。
export function absorbSEShield(g,amount){if(!seActive(g,'shield')||amount<=0)return amount;const b=seBuild(g.progress,g.vehicle.index),n=Math.min(amount,b.shield);b.shield-=n;b.shieldWait=8;if(n>0){g.seShieldFlash=.25;g.float?.(g.player.x,g.player.y-40,'SE护罩 −'+Math.ceil(n),'#a4dacd');}return amount-n;}
// 火箭以两发重炮弹驱动独立双联炮口，正式弹道负责扫掠、遮挡、爆炸与统计。
export function updateSEDevices(g,dt){if(g.state!=='playing'||dt<=0||!g.vehicle.active||g.cottage)return;const b=seBuild(g.progress,g.vehicle.index);g.seShieldFlash=Math.max(0,(g.seShieldFlash||0)-dt);
 if(seActive(g,'shield')){const wait=Math.min(dt,b.shieldWait);b.shieldWait-=wait;b.shield=Math.min(180,b.shield+(dt-wait)*18);}
 if(!seActive(g,'rocket')||g.parking?.idle)return;b.rocketWait=Math.max(0,b.rocketWait-dt);const stock=g.progress.supplies.vehicles[g.vehicle.index];if(b.rocketWait>0||stock.heavy<2)return;
 const t=[...g.enemies,...(g.boss?[g.boss]:[])].filter(t=>t.hp>0&&seTargetAllowed(g,t)&&worldDistance(t,g.player)<360&&attackTargetKnown(g,t)&&(!g.combatLineClear||g.combatLineClear(g.player,nearest(t,g.player)))).sort((a,b)=>worldDistance(a,g.player)-worldDistance(b,g.player))[0];if(!t)return;
 const p=nearest(t,g.player),angle=Math.atan2(p.y-g.player.y,p.x-g.player.x);stock.heavy-=2;b.rocketWait=8;
 for(const side of [-1,1]){const a=angle+side*.035,d={x:Math.cos(a),y:Math.sin(a)},m={x:g.player.x-Math.sin(angle)*side*19,y:g.player.y+Math.cos(angle)*side*19-12};emitWeaponAttack(g,{id:'se-rocket',vehicleMounted:true,targetTrees:true,range:420,speed:720,pellets:1,spread:0,hitRadius:5,blastRadius:75,blastRatio:.65,impulse:250,color:'#efbb7c'},m,d,125,false,true);}
}
