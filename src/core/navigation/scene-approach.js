import {minePortals} from '../../world/mine-portals.js';
import {currentMineLayer} from '../mining/mine-layers.js';
import {mineBounds} from '../../config/mine-ecology.js';
import {mineOccupancy} from '../../physics/mine-motion.js';
import {ownsCampPoint} from '../../config/camp-land.js';
// 场景短按只安排真实行走；抵达后的入屋、上楼和睡眠仍由正式候停规则提交。
import {roomResident,RESIDENT_SPOT,RESIDENT_VISITOR} from '../../config/cottage-residents.js';
import {HEROES} from '../../config/heroes.js';
import {MINING} from '../../config/mining.js';
import {COTTAGE,COTTAGE_FURNITURE,cottageFloor} from '../../config/cottage.js';
import {interiorLayout,WORKSHOP_INTERIORS} from '../../config/workshop-interiors.js';
import {CLICK_BUILDINGS,SCENE_APPROACH as A} from '../../config/scene-approach.js';
import {nearest,worldDistance} from '../../world/coordinates.js';
import {canInspectBuilding} from '../camp/building-entry.js';
import {canEnterCottage,cottageBlocked} from '../home/cottage.js';
import {facilityOpen} from '../../config/town-restoration.js';
import {HOME_DIRECTIONS,cottageStreetExit,floorBalconies,homeExterior,HOME_ELEVATOR,hasHomeElevator,homeStairRoutes} from '../../config/home-construction.js';
import {createQuestRouteSearch} from '../../physics/quest-route.js';
import {playerNavigationBody} from './prepared-navigation.js';
import {farmMode,canEnterFarm,farmInteractionBlocked} from '../farming/farm.js';
import {boardingVehicles,vehicleBoardingPoint} from '../vehicles/vehicle-boarding.js';
import {mineEntrances} from '../../world/mine-entrances.js';

// 全部已有营业房共用目录，仓库保留室外存取事务，不另造库存或室内服务。
export {CLICK_BUILDINGS};
// 限制场景状态，保留修复、传奇解锁及活动中的原有权限。
export function clickableBuildings(game){return canInspectBuilding(game)&&canEnterCottage(game)&&game.state==='playing'&&!game.progress.restoration?.build&&!farmMode(game)?CLICK_BUILDINGS.filter(b=>ownsCampPoint(game.progress,b.site)&&(b.id!=='legendary'||game.progress.vehicleHulls[6])):[];}
// 命中完整建筑和门前空地，循环世界边缘使用最近镜像。
export function buildingContains(building,point,game){const site=nearest(building.site,point),door=nearest(building.door,point);return Math.abs(point.x-site.x)<=building.site.width/2&&point.y>=site.y-buildingClickHeight(building,game)&&point.y<=site.y+20||Math.abs(point.x-door.x)<=A.doorHalfWidth&&Math.abs(point.y-door.y)<=A.doorDepth;}
// 加盖后的整栋立面都可点击；未修复时继续使用原施工地块的范围。
export function buildingClickHeight(building,game){return building.id==='cottage'&&facilityOpen(game?.progress,'cottage')?homeExterior(game.progress.homeDecor).height:building.site.height;}
// 当前楼层只暴露真实床和楼梯；阳台、死亡和睡眠不接受新的移动意图。
export function cottageClickTargets(game){
 const room=game.cottage;if(!room||room.kind==='mine'||room.balcony||room.glide||room.arcade||room.sleep||game.player.hp<=0)return [];
 // 标牌按实际绘制位置命中，落脚点留在可走的门槛内侧，让原候停规则负责离开。
 const layout=interiorLayout(room),homeRoom=layout.id==='cottage';
 const door=homeRoom?cottageStreetExit(game.progress.homeDecor):layout.exit;
 const exit={id:'exit',label:'走到门口出门',x:door.x,y:homeRoom?door.y-7:layout.height-21,width:74,height:44,goal:{x:door.x,y:Math.min(door.y,layout.height-22)}};
 if(!homeRoom)return [exit];
 const bed=COTTAGE_FURNITURE[0];
 const floor=cottageFloor(room),home=game.progress.homeDecor,transit=hasHomeElevator(home,floor)?[{...HOME_ELEVATOR,label:'走到电梯乘坐',y:425,width:84,height:170,goal:HOME_ELEVATOR.landing}]:homeStairRoutes(home,floor);
 const balcony=floorBalconies(home,floor).map(side=>{
  const {name,door,frame,dx}=HOME_DIRECTIONS[side];
  return {id:'balcony-'+side,label:'走到'+name+'阳台门',x:frame.x-dx*26,y:frame.y-(dx?15:34),width:dx?92:72,height:78,goal:door};
 });
 const owner=roomResident(game.progress,floor);
 const resident=owner!==undefined&&owner!==game.progress.hero&&!room.arcade?[{...RESIDENT_SPOT,y:RESIDENT_SPOT.y+5,id:'resident',label:'和'+HEROES[owner].name+'聊天',width:86,height:96,goal:RESIDENT_VISITOR}]:[];
 return [...resident,...balcony,...transit,...(!floor&&home.basement?[{...MINING.hatch,label:'走到地下室梯口'}]:[]),...(!floor?[exit,{...bed,id:'bed',label:'走到床边睡觉',height:A.bedHeight,goal:COTTAGE.bed}]:[])];
}
// 一个意图只属于当前角色、地图和楼层；不写入存档，不跨场景继续移动。
function request(game,id,goal,allowPaused=false){
 if(!(game.state==='playing'||allowPaused&&game.state==='paused')||game.player.hp<=0)return false;
 game.mineWarehouseIntent=false;game.sceneApproach={id,goal:{...goal},player:game.player,room:game.cottage,floor:cottageFloor(game.cottage),depth:game.cottage?.depth,mapId:game.mapId,search:null,points:null,index:1,frame:0,elapsed:0,still:0,last:{x:game.player.x,y:game.player.y}};
 return true;
}
// 返车仅追踪实际停驻记录，沿步行碰撞寻路，暂停时保留意图。
export function approachParkedVehicle(game,hull){
 const site=boardingVehicles(game).find(s=>s.hull===hull);
 if(!site||!request(game,'farm-vehicle',nearest(vehicleBoardingPoint(site),game.player),true))return false;
 game.sceneApproach.vehicle={hull,site:{x:site.x,y:site.y}};
 game.vehicleBoarding=null;game.vehicleBoardingBlocked=null;
 return true;
}
// 主动点击可重新进入刚离开的门，不改变无点击时的防重复候停。
export function approachBuilding(game,id){
 const b=clickableBuildings(game).find(b=>b.id===id);if(!b||!facilityOpen(game.progress,id==='vehicle'?'garage':id))return false;
 if(!request(game,id,nearest(b.door,game.player)))return false;
 game.cottageDoorLatch=false;return true;
}
// 地表矿洞只提交寻路意图；抵达后由同一候停规则进入共享地下一层。
export function approachMineEntrance(game,key){
 const site=mineEntrances(game.progress.mining).find(s=>s.key===key);
 if(!site||game.farmWork?.tool||!game.progress.homeDecor.basement||!clickableBuildings(game).length)return false;
 if(!request(game,'mine:'+key,nearest(site,game.player)))return false;
 game.mineEntranceLatch=null;game.mineEntranceWait=0;game.mineEntranceKey=null;return true;
}
// 仓库升井由明确点击启动，沿原门前落脚点行走，再与矿洞共用一秒候停。
export function approachWarehouseMine(game){
 if(game.cottage||game.vehicle.active||!game.progress.homeDecor.basement||!request(game,'mine-warehouse',nearest(WORKSHOP_INTERIORS.warehouse.door,game.player)))return false;
 game.mineWarehouseIntent=true;game.mineEntranceWait=0;return true;
}
// 地下入口走实际可通行矿道；点击只安排移动，抵达后交给一秒候停。
export function approachMinePortal(game,id){
 const room=game.cottage;if(room?.kind!=='mine'||room.ride||game.fishing)return false;
 const target=minePortals(currentMineLayer(game),room.depth||1).find(p=>p.id===id);
 if(!target||!request(game,'underground:'+id,target))return false;
 room.portalIntent=id;room.portalLatch=null;room.portalWait=null;room.tool=null;room.autoDig=false;room.shaftWork=0;room.combatWork=null;return true;
}
// 再次明确点击可重新上下楼或睡觉，切层与醒来仍自动锁住重复触发。
export function approachCottageTarget(game,id){
 // 旧调用的楼梯标识只作兼容；正式场景始终分别给出向上与向下的目标。
 if(id==='stairs'){const targets=cottageClickTargets(game);id=targets.find(t=>t.id==='stairs-up')?.id||'stairs-down';}
 const item=cottageClickTargets(game).find(item=>item.id===id);if(!item||!request(game,id,item.goal))return false;
 game.cottage.storageNotice='';game.cottage.restResult='';
 if(id.startsWith('balcony-')){game.cottage.balconyLatch=false;game.cottage.balconyElapsed=0;}
 else if(id==='basement'){game.cottage.basementLatch=false;game.cottage.basementElapsed=0;}
 else if(id.startsWith('stairs-')){game.cottage.stairsLatch=false;game.cottage.stairsElapsed=null;game.cottage.stairsTarget=item.target;}
 else if(id==='elevator'){game.cottage.elevatorLatch=false;game.cottage.elevatorElapsed=null;game.cottage.elevatorRequest=false;}
 else if(id==='bed'){game.cottage.bedLatch=false;game.cottage.restElapsed=null;}
 return true;
}
// 手动方向立即接管，暂停冻结；搜索和跟随均有限，受阻时停止而不穿透家具或墙体。
export function updateSceneApproach(game,dt,input){
 const walk=game.sceneApproach;if(!walk)return input;
 const allowed=walk.vehicle?canEnterFarm(game,true)&&!farmInteractionBlocked(game):canInspectBuilding(game)&&canEnterCottage(game);
 const invalid=walk.player!==game.player||walk.room!==game.cottage||walk.floor!==cottageFloor(game.cottage)||walk.depth!==game.cottage?.depth||walk.mapId!==game.mapId||game.player.hp<=0||game.cottage?.sleep||game.cottage?.balcony||(!game.cottage&&(!allowed||farmMode(game)||game.progress.restoration?.build));
 const parked=walk.vehicle&&boardingVehicles(game).find(s=>s.hull===walk.vehicle.hull);
 if(invalid||walk.vehicle&&(!parked||worldDistance(parked,walk.vehicle.site)>.01)||Math.hypot(input.x,input.y)>.01){game.sceneApproach=null;game.mineWarehouseIntent=false;if(game.cottage?.kind==='mine'){game.cottage.portalIntent=null;game.cottage.portalWait=null;}return input;}
 if(game.state!=='playing')return input;
 const p=game.player,goal=walk.goal,distance=worldDistance(p,goal);
 if(distance<=A.arrivalRadius){
  // 进门要等惯性停稳；此间继续保留主动意图，旁边载具不能接管候停。
  if(!game.cottage&&walk.id!=='warehouse'&&CLICK_BUILDINGS.some(b=>b.id===walk.id)&&Math.hypot(p.vx||0,p.vy||0)>3)return {x:0,y:0};
  game.sceneApproach=null;if(walk.id==='warehouse')game.onEvent('scene-warehouse');
  // 点建筑抵达后把同一进门意图交给候停，防止门前货车的自动上车抢先启动。
  if(!game.cottage&&walk.id!=='warehouse'&&CLICK_BUILDINGS.some(b=>b.id===walk.id))game.cottageEntryKind=walk.id;
  if(walk.id==='resident')game.cottage.residentTalk=roomResident(game.progress,walk.floor);return {x:0,y:0};}
 walk.elapsed+=dt;walk.still=worldDistance(p,walk.last)<.05?walk.still+dt:0;walk.last={x:p.x,y:p.y};
 if(walk.elapsed>A.maxTravel||walk.still>A.blockedWait){game.sceneApproach=null;if(walk.vehicle)game.onEvent?.('story-hint',{text:'返车路线受阻，请靠近载具后上车。'});return {x:0,y:0};}
 if(!walk.search){
  const mine=game.cottage?.kind==='mine',layout=!mine&&game.cottage&&interiorLayout(game.cottage);
  walk.search=createQuestRouteSearch(playerNavigationBody(game),goal,game.trees,A.searchBudget,mine?{bounds:mineBounds(currentMineLayer(game)),canOccupy:(x,y)=>mineOccupancy(game,x,y)}:layout?{bounds:{left:22,right:layout.width-22,top:76,bottom:layout.height-20},canOccupy:(x,y)=>!cottageBlocked(x,y,game)}:{});
 }
 if(!walk.points){const result=walk.search.advance(++walk.frame);if(!result)return {x:0,y:0};if(!result.reachable){game.sceneApproach=null;if(walk.vehicle)game.onEvent?.('story-hint',{text:'暂时找不到返车路线，请先清理障碍。'});return {x:0,y:0};}walk.points=result.points;}
 while(walk.index<walk.points.length-1&&worldDistance(p,walk.points[walk.index])<A.waypointRadius)walk.index++;
 const point=nearest(walk.points[walk.index]||goal,p),dx=point.x-p.x,dy=point.y-p.y,d=Math.hypot(dx,dy),scale=Math.min(1,d/A.slowdownDistance);
 return {x:dx/Math.max(d,1)*scale,y:dy/Math.max(d,1)*scale};
}
