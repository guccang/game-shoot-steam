// 场景短按只安排真实行走；抵达后的入屋、上楼和睡眠仍由正式候停规则提交。
import {COTTAGE,COTTAGE_FURNITURE,COTTAGE_STAIRS,cottageFloor} from '../config/cottage.js';
import {interiorLayout} from '../config/workshop-interiors.js';
import {CLICK_BUILDINGS,SCENE_APPROACH as A} from '../config/scene-approach.js';
import {nearest,worldDistance} from '../world/coordinates.js';
import {canInspectBuilding} from './building-entry.js';
import {canEnterCottage,cottageBlocked} from './cottage.js';
import {facilityOpen} from '../config/town-restoration.js';
import {createQuestRouteSearch} from '../physics/quest-route.js';
import {playerNavigationBody} from './prepared-navigation.js';
import {farmMode} from './farm.js';

// 全部已有营业房共用目录，仓库保留室外存取事务，不另造库存或室内服务。
export {CLICK_BUILDINGS};
// 限制场景状态，保留修复、传奇解锁及活动中的原有权限。
export function clickableBuildings(game){return canInspectBuilding(game)&&canEnterCottage(game)&&game.state==='playing'&&!game.progress.restoration?.build&&!farmMode(game)?CLICK_BUILDINGS.filter(b=>b.id!=='legendary'||game.progress.vehicleHulls[6]):[];}
// 命中完整建筑和门前空地，循环世界边缘使用最近镜像。
export function buildingContains(building,point){const site=nearest(building.site,point),door=nearest(building.door,point);return Math.abs(point.x-site.x)<=building.site.width/2&&point.y>=site.y-building.site.height&&point.y<=site.y+20||Math.abs(point.x-door.x)<=A.doorHalfWidth&&Math.abs(point.y-door.y)<=A.doorDepth;}
// 当前楼层只暴露真实床和楼梯；阳台、死亡和睡眠不接受新的移动意图。
export function cottageClickTargets(game){
 const room=game.cottage;if(!room||room.kind!=='cottage'||room.balcony||room.sleep||game.player.hp<=0)return [];
 const bed=COTTAGE_FURNITURE[0];
 return [{id:'stairs',label:'走到楼梯上下楼',x:COTTAGE_STAIRS.x,y:COTTAGE_STAIRS.y,width:COTTAGE_STAIRS.width,height:COTTAGE_STAIRS.height+A.stairsExtraHeight,goal:COTTAGE_STAIRS.landing},...(!cottageFloor(room)?[{...bed,id:'bed',label:'走到床边睡觉',height:A.bedHeight,goal:COTTAGE.bed}]:[])];
}
// 一个意图只属于当前角色、地图和楼层；不写入存档，不跨场景继续移动。
function request(game,id,goal){
 if(game.state!=='playing'||game.player.hp<=0)return false;
 game.sceneApproach={id,goal:{...goal},player:game.player,room:game.cottage,floor:cottageFloor(game.cottage),mapId:game.mapId,search:null,points:null,index:1,frame:0,elapsed:0,still:0,last:{x:game.player.x,y:game.player.y}};
 return true;
}
// 主动点击可重新进入刚离开的门，不改变无点击时的防重复候停。
export function approachBuilding(game,id){
 const b=clickableBuildings(game).find(b=>b.id===id);if(!b||!facilityOpen(game.progress,id==='vehicle'?'garage':id))return false;
 if(!request(game,id,nearest(b.door,game.player)))return false;
 game.cottageDoorLatch=false;return true;
}
// 再次明确点击可重新上下楼或睡觉，切层与醒来仍自动锁住重复触发。
export function approachCottageTarget(game,id){
 const item=cottageClickTargets(game).find(item=>item.id===id);if(!item||!request(game,id,item.goal))return false;
 game.cottage.storageNotice='';game.cottage.restResult='';
 if(id==='stairs'){game.cottage.stairsLatch=false;game.cottage.stairsElapsed=null;}
 else {game.cottage.bedLatch=false;game.cottage.restElapsed=null;}
 return true;
}
// 手动方向立即接管，暂停冻结；搜索和跟随均有限，受阻时停止而不穿透家具或墙体。
export function updateSceneApproach(game,dt,input){
 const walk=game.sceneApproach;if(!walk)return input;
 const invalid=walk.player!==game.player||walk.room!==game.cottage||walk.floor!==cottageFloor(game.cottage)||walk.mapId!==game.mapId||game.player.hp<=0||game.cottage?.sleep||game.cottage?.balcony||(!game.cottage&&(!canInspectBuilding(game)||!canEnterCottage(game)||farmMode(game)||game.progress.restoration?.build));
 if(invalid||Math.hypot(input.x,input.y)>.01){game.sceneApproach=null;return input;}
 if(game.state!=='playing')return input;
 const p=game.player,goal=walk.goal,distance=worldDistance(p,goal);
 if(distance<=A.arrivalRadius){game.sceneApproach=null;if(walk.id==='warehouse')game.onEvent('scene-warehouse');return {x:0,y:0};}
 walk.elapsed+=dt;walk.still=worldDistance(p,walk.last)<.05?walk.still+dt:0;walk.last={x:p.x,y:p.y};
 if(walk.elapsed>A.maxTravel||walk.still>A.blockedWait){game.sceneApproach=null;return {x:0,y:0};}
 if(!walk.search){
  const layout=game.cottage&&interiorLayout(game.cottage);
  walk.search=createQuestRouteSearch(playerNavigationBody(game),goal,game.trees,A.searchBudget,layout?{bounds:{left:22,right:layout.width-22,top:76,bottom:layout.height-20},canOccupy:(x,y)=>!cottageBlocked(x,y,game)}:{});
 }
 if(!walk.points){const result=walk.search.advance(++walk.frame);if(!result)return {x:0,y:0};if(!result.reachable){game.sceneApproach=null;return {x:0,y:0};}walk.points=result.points;}
 while(walk.index<walk.points.length-1&&worldDistance(p,walk.points[walk.index])<A.waypointRadius)walk.index++;
 const point=nearest(walk.points[walk.index]||goal,p),dx=point.x-p.x,dy=point.y-p.y,d=Math.hypot(dx,dy),scale=Math.min(1,d/A.slowdownDistance);
 return {x:dx/Math.max(d,1)*scale,y:dy/Math.max(d,1)*scale};
}
