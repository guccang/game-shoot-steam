import {vehicleBoardingPoint} from '../core/vehicles/vehicle-boarding.js';
import {vehicleService,personalFleet} from '../core/vehicles/vehicle-repair.js';
import {REPAIR_CENTER} from '../config/vehicle-repair.js';
// 载具页面的换乘状态与正式停车规则同源，场景任务借车不使用这个营地入口。
import {parkingFleetApplies,vehicleParkingSite,canSelectParkingVehicle} from '../core/vehicles/camp-parking.js';
import {requestWorldNavigation} from '../core/navigation/world-navigation.js';
// 驾驶时可下车，步行时只标明实际位置并引导到车旁。
export function vehicleTransferState(game,index){
 const owned=!!game.progress.vehicleHulls[index],current=game.vehicle.index===index;
 if(owned&&personalFleet(game)&&(game.vehicles[index].hp<=0||vehicleService(game,index)?.phase)){const phase=vehicleService(game,index)?.phase;return {site:REPAIR_CENTER,remote:true,label:phase==='ready'?'去维修中心取车':'前往维修中心',description:phase==='ready'?'维修已完成，请到中心领取。':phase&&phase!=='wrecked'?'救援维修进行中，关闭页面后继续作业。':'已报废，不能驾驶。可用手机呼叫救援，或到维修中心安排拖车。'};}
 const parked=game.progress.campParking.owned.some(s=>s.hull===index)||index===4&&game.fireGarageParked;
 const site=vehicleParkingSite(game,index),remote=parkingFleetApplies(game)&&(parked||!current)&&!canSelectParkingVehicle(game,index);
 return {site,remote,label:!owned?'购买后到停车位取车':current&&game.vehicle.active?'下车':remote?(site.name==='北门停车场'||site.name==='北停车场'?'去北停车场换乘':'前往停车位换乘'):current?'定位载具':'靠近载具换乘',
  description:!owned?'新车送到营地空闲车位，每次只带一辆出发。':parked?'停在'+site.name+' · 旧车留在下车处。':'本次随行 · 更换载具请回北停车场。'};
}
// 自有停驻车按钮只导航，靠近上车由正式游戏时钟完成。
export function activateVehicleTransfer(game,index){
 const state=vehicleTransferState(game,index);
 if(parkingFleetApplies(game)&&game.progress.vehicleHulls[index]&&(vehicleService(game,index)?.phase||game.vehicles[index].hp<=0)){requestWorldNavigation(game,state.site,'前往维修中心',{direct:true});game.onEvent('story-hint',{text:state.description});return true;}
 if(parkingFleetApplies(game)&&game.progress.vehicleHulls[index]&&!(game.vehicle.active&&game.vehicle.index===index)){const site=state.site,front=vehicleService(game,index)?.phase?site:vehicleBoardingPoint(site);requestWorldNavigation(game,front,'前往载具位置',{direct:true});return true;}
 if(state.remote){requestWorldNavigation(game,{...state.site,y:state.site.approachY??state.site.y},'前往'+state.site.name+'换乘',{direct:true});return true;}
 if(game.vehicle.index!==index&&!game.selectVehicle(index))return false;
 return game.vehicle.active?game.dismountVehicle():game.summonVehicle();
}
