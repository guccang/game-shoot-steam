// 驿站事务与自动行进共用正式碰撞和分帧寻路，绝不传送或修改地形。
import {WAYSTATIONS as W,waystationPurpose} from '../../config/waystations.js';
import {canonical,nearest,worldDistance} from '../../world/coordinates.js';
import {blocked} from '../../physics/motion.js';
import {questLineClear} from '../../physics/quest-route.js';
import {createVisualRouteSession,advanceVisualRouteSession} from './visual-route-cache.js';
import {playerNavigationBody,navigationBodyKey,createPlayerNavigationIndex} from './prepared-navigation.js';
import {treeGrid} from '../../world/spatial-grid.js';
import {outdoorBusy} from '../activities/outdoors.js';
import {normalizeWaystations,randomWaystationName} from '../../progression/navigation/waystations.js';
import {farmCovers} from '../../world/farm-land.js';
import {movementLoadFactor,vehicleLoad} from '../../progression/inventory/load-weight.js';
import {vehicleFaults} from '../../config/supplies.js';
import {waystationLandmarkName} from '../../world/waystation-landmarks.js';

// 自动导航遵守正式驾驶限制，不能把发动机、载荷或牵引导致的停驶误报为正在移动。
export function waystationMovementReason(g){
 if(movementLoadFactor(g)>0)return '';
 if(g.vehicle.active){
  if(vehicleFaults(g.progress,g.vehicle.index).engine>=100)return '发动机已损坏，维修后才能自动前往驿站。';
  if(vehicleLoad(g).overloaded)return '载具载荷已满，请卸货后再前往驿站。';
 }
 return '当前牵引负重过大，请解除牵引或减重后再前往驿站。';
}

// 非自由地表场景不允许建站或出发，弹窗暂停仍可提交操作。
export function waystationUnavailable(g){
 if(g.mapId!=='forest'||g.cottage||g.realm||g.story||g.campDefense||g.fireActive||g.fireTransit||g.workshopTrial||g.arrivalCinematic)return '请回到森林地表使用驿站。';
 if(g.player.hp<=0||!['playing','paused'].includes(g.state))return '当前无法使用驿站。';
 if(g.farmWork?.tool||outdoorBusy(g)||g.parking||g.progress.restoration?.build)return '请先结束当前操作。';
 return '';
}
// 建站落脚点留足余量，水上、飞行中及已有实体内不能生成假可达地点。
export function waystationBuildReason(g){
 const reason=waystationUnavailable(g);if(reason)return reason;
 if(g.player.flying)return '请降落后建立驿站。';
 const sites=g.progress.waystations?.sites||[];
 if(sites.length>=W.limit)return `最多建立${W.limit}座驿站。`;
 if(sites.some(s=>worldDistance(s,g.player)<W.spacing))return '离已有驿站太近，请走远一些。';
 if([0,-42,-78].some(dy=>farmCovers(g,{x:g.player.x,y:g.player.y+dy})))return '请避开农田和农具，选择旁边的空地。';
 if(g.progress.outdoors?.camp&&worldDistance(g.progress.outdoors.camp,g.player)<120)return '请给露营地留出空间。';
 const body={...playerNavigationBody(g),flying:false,amphibious:false,treePass:false};
 if(blocked(g.player.x,g.player.y,W.clearance,g.trees||[],body))return '这里空间不足，请在岸上的开阔地建立。';
 return '';
}
// 再次检查当前位置后才写入；编号不使用玩家名称作为逻辑键。
export function buildWaystation(g,options={}){
 const message=waystationBuildReason(g);if(message)return {ok:false,message};
 const data=g.progress.waystations??=normalizeWaystations(null),id=data.nextId++;
 const site={id,style:'wood',name:waystationLandmarkName(g.player)||randomWaystationName(data.sites,g.random||Math.random),purpose:waystationPurpose(options?.purpose).id,...canonical(g.player),mapId:'forest'};
 data.sites.push(site);return {ok:true,message:`已建立${site.name}。`,site};
}
// 手机可远程移除记录，落盘成功后才终止相关行程；失败不改变站点、编号或运动。
export function removeWaystation(g,id,persist=()=>true){
 if(g.player.hp<=0||!['playing','paused'].includes(g.state))return {ok:false,message:'当前无法移除驿站。'};
 const old=g.progress.waystations,site=old?.sites.find(s=>s.id===id);
 if(!site)return {ok:false,message:'找不到这座驿站，可能已经移除。'};
 g.progress.waystations={...old,sites:old.sites.filter(s=>s.id!==id)};
 try{
  if(!persist(g.progress))throw Error('保存失败');
 }catch{
  g.progress.waystations=old;return {ok:false,message:'保存失败，驿站未移除，请重试。'};
 }
 if(g.waystationTravel?.id===id)stopWaystationTravel(g,'目的驿站已移除，已停止自动行进。');
 return {ok:true,message:`已移除${site.id}号驿站 · ${site.name}。`,site};
}
// 终止时清除惯性，手动接管仍由当前帧的真实方向输入继续驱动。
export function stopWaystationTravel(g,message='已停止驿站导航。'){
 g.waystationTravel=null;g.waystationMessage=message;g.player.vx=g.player.vy=0;
}
// 选择站点只创建临时行程；正式更新循环负责搜索、避障和到达。
export function travelToWaystation(g,id){
 const reason=waystationUnavailable(g)||waystationMovementReason(g);if(reason)return {ok:false,message:reason};
 const site=g.progress.waystations?.sites.find(s=>s.id===id);if(!site)return {ok:false,message:'找不到这座驿站。'};
 if(worldDistance(g.player,site)<=W.arrival)return {ok:false,message:'已经到达这座驿站。'};
 g.sceneApproach=null;g.waystationMessage='';g.player.vx=g.player.vy=0;
 g.waystationTravel={id,player:g.player,mapId:g.mapId,frame:0,clock:0,retries:0,last:{x:g.player.x,y:g.player.y},still:0,elapsed:0,phase:'planning',moving:false,checkAt:0};
 return {ok:true,message:`正在规划前往${site.name}的路线。`};
}
// 暂停不消耗搜索预算；能力变化和新障碍会触发有限重规划，无法到达时明确停止。
export function updateWaystationTravel(g,dt,input){
 const trip=g.waystationTravel;if(!trip)return input;
 if(Math.hypot(input.x,input.y)>.01){stopWaystationTravel(g,'已切换为手动行进。');return input;}
 const site=g.progress.waystations?.sites.find(s=>s.id===trip.id);
 if(!site||trip.player!==g.player||trip.mapId!==g.mapId||waystationUnavailable(g)){stopWaystationTravel(g,'当前行程已结束。');return input;}
 if(g.state!=='playing'||dt<=0)return {x:0,y:0};
 const movementReason=waystationMovementReason(g);if(movementReason){stopWaystationTravel(g,movementReason);return {x:0,y:0};}
 if(worldDistance(g.player,site)<=W.arrival){stopWaystationTravel(g,`已到达${site.name}。`);return {x:0,y:0};}
 const body=playerNavigationBody(g),key=navigationBodyKey(body,{parking:false}),trees=g.trees||[];
 if(trip.key&&trip.key!==key){trip.session=null;trip.elapsed=trip.still=0;}
 trip.key=key;
 trip.clock+=dt;trip.frame++;
 // 与任务使用同一32单位网格、1.5ms/256批次、完整主路和局部接入缓存。
 if(!trip.session){trip.session=createVisualRouteSession(body,site,createPlayerNavigationIndex(trees),trip.clock,null,{budget:W.routeBudget});trip.phase='planning';trip.elapsed=0;trip.checkAt=0;}
 const route=advanceVisualRouteSession(trip.session,body,trip.clock);
 trip.points=route.points;
 if(!route.reachable){
  trip.elapsed+=dt;trip.still=0;trip.phase='planning';trip.moving=false;g.player.vx=g.player.vy=0;
  if(!route.planning)stopWaystationTravel(g,'没有找到可通行路线，请调整位置或换一辆载具。');
  else if(trip.elapsed>W.searchSeconds)stopWaystationTravel(g,'路线规划超时，请调整位置后重试。');
  return {x:0,y:0};
 }
 if(trip.phase==='planning'){trip.last={x:g.player.x,y:g.player.y};trip.still=0;}
 trip.phase='moving';trip.elapsed=0;
 trip.moving=worldDistance(g.player,trip.last)>=.1;
 trip.still=trip.moving?0:trip.still+dt;trip.last={x:g.player.x,y:g.player.y};
 const goal=nearest(route.points[1],g.player);
 // 实际移动仍碰撞；新增树木只检查眼前短段，每四分之一秒一次，不每帧扫整段或重建索引。
 let obstructed=false;if(trip.clock>=trip.checkAt){trip.checkAt=trip.clock+W.obstacleCheck;obstructed=!questLineClear(g.player,goal,body,treeGrid(trees));}
 if(trip.still>W.stuckSeconds||obstructed){
  if(++trip.retries>W.retries){stopWaystationTravel(g,'前方持续受阻，已停止自动行进。');return {x:0,y:0};}
  trip.session=null;trip.points=null;trip.still=0;trip.phase='planning';trip.moving=false;g.player.vx=g.player.vy=0;return {x:0,y:0};
 }
 const dx=goal.x-g.player.x,dy=goal.y-g.player.y,d=Math.hypot(dx,dy);
 // 中途路点保持速度，只有靠近最终驿站才刹车，避免每经过短路段都停顿。
 const speed=Math.min(1,worldDistance(g.player,site)/W.slowdownDistance);
 return {x:dx/Math.max(d,1)*speed,y:dy/Math.max(d,1)*speed};
}
