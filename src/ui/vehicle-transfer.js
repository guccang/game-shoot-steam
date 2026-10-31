import {vehicleService,personalFleet} from '../core/vehicle-repair.js';
import {REPAIR_CENTER} from '../config/vehicle-repair.js';
// 载具页面的换乘状态与正式停车规则同源，场景任务借车不使用这个营地入口。
import {parkingFleetApplies,parkedOwned,vehicleParkingSite,canSelectParkingVehicle,boardParkedVehicle} from '../core/camp-parking.js';
import {requestWorldNavigation} from '../core/world-navigation.js';
// 当前随行车可原地上下车，其余车标明位置并引导到场。
export function vehicleTransferState(game,index){
 const owned=!!game.progress.vehicleHulls[index],current=game.vehicle.index===index;
 if(owned&&personalFleet(game)&&(game.vehicles[index].hp<=0||vehicleService(game,index)?.phase)){const phase=vehicleService(game,index)?.phase;return {site:REPAIR_CENTER,remote:true,label:phase==='ready'?'去维修中心取车':'前往维修中心',description:phase==='ready'?'维修已完成，请到中心领取。':phase&&phase!=='wrecked'?'救援维修进行中，关闭页面后继续作业。':'已报废，不能驾驶。可用手机呼叫救援，或到维修中心安排拖车。'};}
 const parked=game.progress.campParking.owned.some(s=>s.hull===index)||index===4&&game.fireGarageParked;
 const site=vehicleParkingSite(game,index),remote=parkingFleetApplies(game)&&(parked||!current)&&!canSelectParkingVehicle(game,index);
 return {site,remote,label:!owned?'购买后到停车位取车':current&&game.vehicle.active?'下车':remote?(site.name==='北门停车场'||site.name==='北停车场'?'去北停车场换乘':'前往停车位换乘'):current?'上车出发':'换乘这辆车',
  description:!owned?'新车送到营地空闲车位，每次只带一辆出发。':parked?'停在'+site.name+' · 到车旁换乘，旧车留在下车处。':'本次随行 · 更换载具请回北停车场。'};
}
// 前往按钮只导航；真正到场后才调用选车与上车，不提前改变随行车。
export function activateVehicleTransfer(game,index){
 const state=vehicleTransferState(game,index);
 if(state.remote){requestWorldNavigation(game,{...state.site,y:state.site.approachY??state.site.y},'前往'+state.site.name+'换乘',{direct:true});return true;}
 if(parkingFleetApplies(game)&&parkedOwned(game).some(s=>s.record.hull===index))return boardParkedVehicle(game,index);
 if(game.vehicle.index!==index&&!game.selectVehicle(index))return false;
 return game.vehicle.active?game.dismountVehicle():game.summonVehicle();
}
