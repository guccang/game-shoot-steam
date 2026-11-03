import {constructionWood,spendConstructionWood} from '../progression/resource-wallet.js';
import {MINING} from '../config/mining.js';
import {placedDecor} from '../progression/home-decor.js';
// 加盖事务先保存再扣款，通行只访问已建楼层和已装设施。
import {openBasement,freshMining} from '../progression/mining.js';
import {HOME_BUILD_PRICES,HOME_DIRECTIONS,HOME_ELEVATOR,HOME_BALCONY,homeFloors,floorBalconies,elevatorFloors,homeElevatorPlan,hasHomeElevator,homeStairRoutes} from '../config/home-construction.js';
import {COTTAGE_STAIRS,cottageFloor} from '../config/cottage.js';
import {bindEconomy,economyFor} from '../config/economy.js';
import {capturePatrol} from './patrol-session.js';

// 公司柜台提供施工服务，重复装配、越界层号和保存失败都不产生扣费。
export function buildHome(game,kind,{floor,side='south'}={}){
 if(game.cottage?.kind!=='construction'||!['playing','paused'].includes(game.state))return {ok:false,message:'请到建筑公司办理。'};
 const removing=kind==='remove-elevator',price=removing?{coins:0,wood:0}:Object.hasOwn(HOME_BUILD_PRICES,kind)?HOME_BUILD_PRICES[kind]:null,home=game.progress.homeDecor;
 if(!price||!home)return {ok:false,message:'请选择有效的施工项目。'};
 // 未指定层号的正式施工入口自动接续，保留显式层号供旧存档工具和已有规则调用。
 if(floor===undefined){const plan=homeElevatorPlan(home);floor=kind==='elevator'?plan.installFloor:removing?plan.removeFloor:0;if(floor===null)return {ok:false,message:removing?'没有已安装的电梯可拆除。':'电梯已装至最高楼层，请先加盖楼层。'};}
 if(kind==='basement'&&home.basement)return {ok:false,message:'地下室已经建好，请从小屋一楼梯口下去。'};
 if(kind==='floor'&&!Number.isSafeInteger(homeFloors(home)+1))return {ok:false,message:'当前楼层编号超出数字表示范围。'};
 if((kind==='elevator'||removing)&&(!Number.isSafeInteger(floor)||floor<0||floor>=homeFloors(home)))return {ok:false,message:'请选择已建楼层。'};
 if(kind==='elevator'&&hasHomeElevator(home,floor))return {ok:false,message:'这一层已经安装电梯。'};
 if(removing&&!hasHomeElevator(home,floor))return {ok:false,message:'这一层没有电梯可拆除。'};
 if(kind==='balcony'&&(!Number.isSafeInteger(floor)||floor<0||floor>=homeFloors(home)||!Object.hasOwn(HOME_DIRECTIONS,side)))return {ok:false,message:'请选择已建楼层和阳台朝向。'};
 if(kind==='balcony'&&floorBalconies(home,floor).includes(side))return {ok:false,message:'这一侧已经有大阳台。'};
 if(game.progress.coins<price.coins||constructionWood(game.progress)<price.wood)return {ok:false,message:'金币或背包与仓库的合计木材不足。'};
 const next=bindEconomy(structuredClone(game.progress),economyFor(game.progress)),h=next.homeDecor;
 next.coins-=price.coins;spendConstructionWood(next,price.wood);
 if(kind==='basement'){
  // 新梯口占用已有家具区域时，把原实例移入收纳，不删除或重复赠送家具。
  const blockedIds=new Set(placedDecor(h,0).filter(i=>i.layer==='floor'&&Math.abs(i.x-MINING.hatch.x)<i.width/2+40&&Math.abs(i.y-460)<i.height/2+60).map(i=>i.uid));
  for(const item of h.items)if(blockedIds.has(item.uid)){item.x=null;item.y=null;}
  h.basement=true;next.mining??=freshMining();openBasement(next.mining);
 }
 if(kind==='floor')h.floors=homeFloors(h)+1;
 if(kind==='elevator'||removing){h.elevators=removing?elevatorFloors(h).filter(f=>f!==floor):[...elevatorFloors(h),floor].sort((a,b)=>a-b);h.version=2;delete h.elevator;}
 if(kind==='balcony'){h.balconies??={};h.balconies[floor]=[...floorBalconies(h,floor),side];}
 const snapshot=Object.create(game);snapshot.progress=next;next.patrol=capturePatrol(snapshot);
 try{if(game.livingPersist&&game.livingPersist(next)!==true)return {ok:false,message:'保存失败，费用与设施均未改变。'};}catch{return {ok:false,message:'保存失败，费用与设施均未改变。'};}
 game.progress=next;game.onEvent?.('home-construction');return {ok:true,message:kind==='basement'?'地下室已建好，矿锄已备齐。回小屋一楼点击梯口下矿；梯口原有家具保留在收纳。':kind==='floor'?`已加盖第 ${h.floors} 楼，楼梯已接通。`:kind==='elevator'?`第 ${floor+1} 楼电梯已安装。`:removing?`第 ${floor+1} 楼电梯已拆除，楼梯已恢复。`:`第 ${floor+1} 楼${HOME_DIRECTIONS[side].name}侧大阳台已建好。`};
}
// 楼梯和电梯均要求到达设施前；只改变局部落点，绝不把室内坐标写回营地。
export function travelHomeFloor(game,target,mode='stairs'){
 const room=game.cottage,home=game.progress.homeDecor,from=cottageFloor(room),lift=mode==='elevator',route=homeStairRoutes(home,from).find(r=>r.target===target),goal=lift?HOME_ELEVATOR.landing:route?.goal;
 if(room?.kind!=='cottage'||room.balcony||room.sleep||!['playing','paused'].includes(game.state)||game.player.hp<=0||!Number.isSafeInteger(target)||target<0||target>=homeFloors(home)||target===from)return false;
 if(!['stairs','elevator'].includes(mode)||lift&&!hasHomeElevator(home,from)||!goal||Math.hypot(game.player.x-goal.x,game.player.y-goal.y)>COTTAGE_STAIRS.radius)return false;
 room.floor=target;room.stairsElapsed=null;room.stairsTarget=null;room.stairsLatch=true;room.elevatorElapsed=null;room.elevatorLatch=true;room.elevatorRequest=false;room.exitElapsed=0;room.restElapsed=null;room.restResult='';room.storageNotice='';room.notice=`已到第 ${target+1} 楼。`;game.sceneApproach=null;
 // 上楼从目标层北侧下行口落地，下楼从南侧上行口落地；已装层统一落在电梯门前。
 const landing=hasHomeElevator(home,target)?HOME_ELEVATOR.landing:target>from?COTTAGE_STAIRS.downLanding:COTTAGE_STAIRS.landing;
 Object.assign(game.player,landing,{vx:0,vy:0,pushX:0,pushY:0});game.onEvent?.('cottage-change');return true;
}
// 从真实门口走入阳台；保留方向和返回点，使四向景色与营地方位一致。
export function enterHomeBalcony(game,side){
 const room=game.cottage,door=HOME_DIRECTIONS[side]?.door;
 if(room?.kind!=='cottage'||room.balcony||room.sleep||game.state!=='playing'||!door||!floorBalconies(game.progress.homeDecor,cottageFloor(room)).includes(side)||Math.hypot(game.player.x-door.x,game.player.y-door.y)>38)return false;
 room.balcony=side;room.balconyExitElapsed=0;room.balconyLatch=true;room.exitElapsed=0;Object.assign(game.player,HOME_BALCONY.spawn,{vx:0,vy:0});game.onEvent?.('cottage-change');return true;
}
// 阳台门槛返回当前楼层，退出闩锁防止在原门口反复进出。
export function leaveHomeBalcony(game){
 const room=game.cottage;if(!room?.balcony||game.state!=='playing'||Math.hypot(game.player.x-HOME_BALCONY.exit.x,game.player.y-HOME_BALCONY.exit.y)>HOME_BALCONY.radius)return false;
 const door=HOME_DIRECTIONS[room.balcony].door;room.balcony=null;room.balconyLatch=true;room.balconyExitElapsed=0;room.exitElapsed=0;Object.assign(game.player,door,{vx:0,vy:0});game.onEvent?.('cottage-change');return true;
}
