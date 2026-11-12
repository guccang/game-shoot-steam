import {eraVehicle} from '../../config/vehicle-eras.js';
import {recordLogisticsLesson} from '../../progression/story/mainline-logistics.js';
import {assignRepairParking} from './repair-parking.js';
import {vehicleFaults} from '../../config/supplies.js';
import {repairParkingSpot} from '../../config/repair-parking.js';
import {parkingRecordSite} from '../../progression/vehicles/roadside-parking.js';
// 自有车辆报废、救援和维修的唯一业务入口；临时活动装备继续由各自会话管理。
import {blocked} from '../../physics/motion.js';
import {REPAIR_CENTER,REPAIR_BAY,REPAIR_LAYOUT_VERSION,TOW_TRUCK,vehicleRepairRate,VEHICLE_REPAIR as C} from '../../config/vehicle-repair.js';
import {economyFor} from '../../config/economy.js';
import {vehicleModel} from '../../config/vehicles.js';
import {worldDistance,canonical} from '../../world/coordinates.js';
import {planQuestRoute} from '../../physics/quest-route.js';
import {JIUZHAIGOU_SPAWN,jiuzhaigouTrees} from '../../world/jiuzhaigou.js';
import {forestLayout} from '../../world/biomes.js';
import {ownsKeepsake} from '../../progression/inventory/keepsakes.js';
// 借用车不覆盖玩家永久车队，普通森林与湖谷使用相同报废规则。
export function personalFleet(game){return !game.realm&&!game.story&&!game.fireActive&&!game.campDefense&&!game.workshopTrial&&!game.arrivalCinematic;}
// 消防任务若驾驶已拥有车辆，同样承担报废；首次借用消防车仍属于临时装备。
export function vehicleRequiresService(game,v=game.vehicle){return personalFleet(game)||!!(game.fireActive&&v?.index===4&&game.progress.vehicleHulls[4]);}
// 获取只读订单，所有入口据此禁止报废或在修车辆再次上路。
export function vehicleService(game,index){return game.progress.vehicleService?.[index];}
// 只保存实际车队；停车位与消防车库同样同步耐久，防止读档恢复旧值。
export function syncVehicleService(game){
 if(!personalFleet(game)||!game.vehicles)return;
 game.progress.vehicleService??=[];
 for(const v of game.vehicles){if(!game.progress.vehicleHulls[v.index])continue;
  const old=vehicleService(game,v.index),parked=game.progress.campParking?.owned.find(r=>r.hull===v.index);
  const r=game.progress.vehicleService[v.index]={hp:v.hp/v.maxHp,phase:null,mapId:game.mapId,position:canonical(game.player),...old};
  r.hp=v.hp/v.maxHp;if(parked)parked.hp=r.hp;
  if(v.index===4&&game.progress.fireDispatch.garage?.parked)game.progress.fireDispatch.garage.truckHp=r.hp;
 }
}
// 战场重建先恢复永久耐久；旧档停车记录作为迁移来源。
export function restoreVehicleService(game){
 if(!personalFleet(game))return;
 for(const v of game.vehicles){const r=vehicleService(game,v.index),parked=game.progress.campParking?.owned.find(p=>p.hull===v.index);
  if(r||parked)v.hp=v.maxHp*(r?.hp??parked.hp);
  if(v.hp<=0&&!r?.phase){game.progress.vehicleService[v.index]={hp:0,phase:'wrecked',mapId:parked?parkingRecordSite(parked).mapId:game.mapId,position:parked?canonical(parkingRecordSite(parked)):canonical(game.progress.living.position||game.player)};}
 }
 game.progress.campParking.owned=game.progress.campParking.owned.filter(p=>!vehicleService(game,p.hull)?.phase);
}
// 损毁地点在下车落地之前记录，安全下车不会把残骸挪到岸上。
export function markVehicleWreck(game,position){
 if(!vehicleRequiresService(game))return false;
 const v=game.vehicle;game.progress.vehicleService??=[];
 game.progress.vehicleService[v.index]={hp:0,phase:'wrecked',mapId:game.mapId,position:canonical(position),wheel:v.wheelPhase||0};
 game.progress.campParking.owned=game.progress.campParking.owned.filter(p=>p.hull!==v.index);
 return true;
}
// 保养与报废统一按损失耐久及故障比例乘车型维修费率，金币向上取整。
export function vehicleRepairQuote(game,index){
 const v=game.vehicles[index],price=economyFor(game.progress).vehicles[index]?.coins??vehicleModel(index).purchaseRecipe?.coins??(eraVehicle(index)?.payload||0)*4;
 if(!v||!game.progress.vehicleHulls[index])return 0;
 const f=vehicleFaults(game.progress,index),loss=Math.min(1,(1-Math.max(0,v.hp)/v.maxHp)+Math.max(f.gun,f.engine)/100*.2);
 return loss<=0?0:Math.max(1,Math.ceil(price*vehicleRepairRate(vehicleModel(index).id)*loss));
}
// 手机只提供救援；现场检查真实位置，禁用按钮不是业务权限边界。
export function repairUnavailable(game,remote=false){
 if(!personalFleet(game)||(game.cottage&&game.cottage.kind!=='repair'&&!remote)||!['playing','paused'].includes(game.state))return '请在自由巡林时使用维修服务。';
 if(remote&&!ownsKeepsake(game.progress,'patrol-phone'))return '需要巡林手机才能呼叫救援。';
 if(!remote&&(game.mapId!=='forest'||game.cottage?.kind!=='repair'&&worldDistance(game.player,REPAIR_CENTER)>C.radius&&worldDistance(game.player,REPAIR_BAY)>110))return '请先到载具维修中心。';
 return '';
}
// 先核对路线、所有权与金币，再一次扣费落单；重复点击不会二次收费。
export function requestVehicleRepair(game,index,remote=false){
 if(game.progress.logistics?.tow?.target===index)return {ok:false,message:'这辆车正在自行牵引，请到厂交车享受优惠，或先解除牵引再呼叫救援。'};
 const reason=repairUnavailable(game,remote);if(reason)return {ok:false,message:reason};
 const v=game.vehicles[index],old=vehicleService(game,index);
 if(!v||!game.progress.vehicleHulls[index])return {ok:false,message:'尚未拥有这辆载具。'};
 if(old?.phase&&old.phase!=='wrecked')return {ok:false,message:old.phase==='ready'?'车辆已修好，等待停车场空位。':'救援维修正在进行，请勿重复下单。'};
 const cost=vehicleRepairQuote(game,index);if(!cost)return {ok:false,message:'载具完好，无需维修。'};
 if(game.progress.coins<cost)return {ok:false,message:`金币不足，需要 ${cost} 金币。`};
 const wrecked=v.hp<=0||vehicleFaults(game.progress,index).engine>=100;
 if(remote&&!wrecked)return {ok:false,message:'日常保养请驾驶这辆车到维修中心。'};
 const parked=game.progress.campParking.owned.find(r=>r.hull===index),parkedSite=parked&&parkingRecordSite(parked);
 if(!wrecked&&!(game.vehicle===v&&v.active)&&!(parkedSite?.mapId==='forest'&&worldDistance(parkedSite,REPAIR_CENTER)<=C.radius))return {ok:false,message:'请驾驶这辆车到维修中心，再交车保养。'};
 let order;
 if(wrecked){
  const mapId=v.hp<=0?(old?.mapId||game.mapId):(parkedSite?.mapId||game.mapId),position=v.hp<=0?(old?.position||canonical(game.player)):canonical(parkedSite||game.cottage?.outside||game.player),depot=mapId==='forest'?REPAIR_BAY:JIUZHAIGOU_SPAWN;
  const trees=mapId===game.mapId?game.trees:(mapId==='forest'?forestLayout():jiuzhaigouTrees()).map(t=>({...t,hp:1,radius:t.radius||12}));
  const endpoint=serviceRouteAccess(position,mapId,trees);
  if(!endpoint)return {ok:false,message:'无法找到安全拖车接应点，请清理附近障碍后重试。'};
  const route=planQuestRoute({...depot,mapId,navigationRadius:TOW_TRUCK.navigationRadius,livingCollision:mapId==='forest'},endpoint,trees,24000);
  if(!route.reachable)return {ok:false,message:'拖车暂时无法通行，请清理沿途障碍后重试；未扣费。'};
  if(v.active&&!game.dismountVehicle())return {ok:false,message:'附近无法安全下车，请清理车辆周围空间。'};
  order={layoutVersion:REPAIR_LAYOUT_VERSION,hp:v.hp/v.maxHp,phase:'outbound',mapId,position,truck:{...route.points[0]},route:route.points,step:1,timer:0,wheel:0,angle:0};
 }else{
  if(v.active&&!game.dismountVehicle())return {ok:false,message:'附近无法安全下车，请移至门前空地。'};
  if(!game.cottage)Object.assign(game.player,{x:REPAIR_CENTER.x,y:REPAIR_CENTER.y+70,vx:0,vy:0});
  order={layoutVersion:REPAIR_LAYOUT_VERSION,hp:v.hp/v.maxHp,phase:'repairing',mapId:'forest',position:{...REPAIR_BAY},truck:{...REPAIR_BAY},timer:0,wheel:0};
 }
 game.progress.coins-=cost;game.progress.vehicleService??=[];game.progress.vehicleService[index]=order;
 game.progress.campParking.owned=game.progress.campParking.owned.filter(p=>p.hull!==index);
 if(index===4)game.progress.fireDispatch.garage=null;
 if(order.phase==='repairing')assignRepairParking(game,index);
 v.active=false;v.cooldown=0;game.onEvent('vehicle-service',{text:wrecked?'拖车已出发，收好手机可继续救援。':'已交车维修，离开页面后开始作业。'});
 return {ok:true,message:`已支付 ${cost} 金币。${wrecked?'拖车正在赶往损毁地点。':'维修已开始。'}`};
}
// 修好的车辆在原维修泊位交付，维修订单转为普通停车记录，不改变世界坐标。
export function collectRepairedVehicle(game,index){
 if(!personalFleet(game)||!['playing','paused'].includes(game.state))return {ok:false,message:'请在自由巡林时安排交车。'};
 const r=vehicleService(game,index);if(r?.phase!=='ready')return {ok:false,message:'车辆尚未修好或已交付停车场。'};
 if(!assignRepairParking(game,index))return {ok:false,message:'维修工坊车位已满，车辆已保管，空出车位后自动交付。'};
 const spot=repairParkingSpot(r);
 const v=game.vehicles[index];game.progress.supplies.engineFaults[index]=0;if(v.weaponIndex!==null)game.progress.supplies.gunFaults[v.weaponIndex]=0;v.hp=v.maxHp;v.active=false;r.phase=null;r.repairSpot=null;r.hp=1;r.mapId='forest';r.position=canonical(spot);
 game.progress.campParking.owned=game.progress.campParking.owned.filter(p=>p.hull!==index);
 game.progress.campParking.owned.push({hull:index,spot:spot.id,hp:1,ammo:v.module?.magazine.ammo||0,reload:v.module?.magazine.remaining||0,wheel:v.wheelPhase||0,track:0});
 game.parkingVisitors=(game.parkingVisitors||[]).filter(p=>p.spot!==spot.id);
 recordLogisticsLesson(game.progress,'repairChecked');
 game.onEvent('vehicle-service',{text:vehicleModel(index).name+'已修好，留在维修工坊原车位，可用手机定位。'});
 return {ok:true,message:'已在维修工坊原车位交付，请到车旁上车。'};
}
// 新围栏可能覆盖旧拖车落点；按加长拖车的车道余量找最近接应点，避免反复规划失败。
function serviceRouteAccess(point,mapId,trees){
 const body={mapId,livingCollision:mapId==='forest'};
 for(let radius=0;radius<=320;radius+=16){
  const count=Math.max(1,Math.ceil(Math.PI*2*radius/16));
  for(let i=0;i<count;i++){const angle=Math.PI*2*i/count,p={x:point.x+Math.cos(angle)*radius,y:point.y+Math.sin(angle)*radius};if(!blocked(p.x,p.y,TOW_TRUCK.navigationRadius,trees,body))return p;}
 }
 return null;
}
// 搬迁后从拖车当前位置重算路线，保留残骸、付款和工时；湖谷仍从原接驳点返回。
function refreshServiceRoute(game,r,dt){
 if(r.layoutVersion===REPAIR_LAYOUT_VERSION)return true;
 r.routeRetry=Math.max(0,(r.routeRetry||0)-dt);if(r.routeRetry>0)return false;
 const trees=r.mapId===game.mapId?game.trees:(r.mapId==='forest'?forestLayout():jiuzhaigouTrees()).map(t=>({...t,hp:1,radius:t.radius||12}));
 const target=r.phase==='outbound'?serviceRouteAccess(r.position,r.mapId,trees):(r.mapId==='forest'?REPAIR_BAY:JIUZHAIGOU_SPAWN);
 const start=serviceRouteAccess(r.truck,r.mapId,trees);
 if(!target||!start){r.routeRetry=1;return false;}
 const route=planQuestRoute({...start,mapId:r.mapId,navigationRadius:TOW_TRUCK.navigationRadius,livingCollision:r.mapId==='forest'},target,trees,24000);
 if(!route.reachable){r.routeRetry=1;return false;}
 r.truck={...route.points[0]};r.route=route.points;r.step=1;r.layoutVersion=REPAIR_LAYOUT_VERSION;return true;
}
// 拖车沿已验证的折线前进，车轮相位按真实路程累积，暂停不推进。
export function updateVehicleRepair(game,dt){
 if(game.state!=='playing'||!personalFleet(game))return;
 for(const [index,r] of (game.progress.vehicleService||[]).entries()){
  if(!r||!['outbound','hooking','towing','repairing','ready'].includes(r.phase))continue;
  if(r.phase==='ready'){collectRepairedVehicle(game,index);continue;}
  if(r.phase==='repairing'){const waiting=!r.repairSpot;if(!assignRepairParking(game,index))continue;if(waiting)game.onEvent('vehicle-service');}
  if(r.phase==='outbound'||r.phase==='towing'){
   if(!refreshServiceRoute(game,r,dt))continue;
   let distance=C.towSpeed*dt;
   while(distance>0&&r.step<r.route.length){const target=r.route[r.step],dx=target.x-r.truck.x,dy=target.y-r.truck.y,d=Math.hypot(dx,dy),step=Math.min(d,distance);
    if(d>0){r.truck.x+=dx/d*step;r.truck.y+=dy/d*step;r.angle=Math.atan2(dy,dx);r.wheel+=step/8;}distance-=step;if(step===d)r.step++;
   }
   if(r.step>=r.route.length){r.phase=r.phase==='outbound'?'hooking':'repairing';r.timer=0;if(r.phase==='repairing'){r.mapId='forest';r.position={...REPAIR_BAY};assignRepairParking(game,index);}game.onEvent('vehicle-service');}
  }else{
   r.timer+=dt;
   if(r.phase==='hooking'&&r.timer>=C.hookSeconds){r.phase='towing';r.layoutVersion=0;r.step=1;r.timer=0;game.onEvent('vehicle-service');}
   else if(r.phase==='repairing'&&r.timer>=C.repairSeconds){r.phase='ready';r.hp=1;game.vehicles[index].hp=game.vehicles[index].maxHp;const result=collectRepairedVehicle(game,index);if(!result.ok)game.onEvent('vehicle-service',{text:result.message});}
  }
 }
}
