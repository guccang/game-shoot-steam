// 自有停驻载具正面站定一秒上车；工时只存在本次游玩，不写入存档。
import {parkedOwned,parkingFleetApplies,campParkingVisible,boardParkedVehicle} from './camp-parking.js';
import {boardFireGarage} from './fire-rescue.js';
import {FIRE_GARAGE} from '../world/fire-navigation.js';
import {nearest,worldDistance} from '../world/coordinates.js';
import {vehicleService} from './vehicle-repair.js';
export const VEHICLE_BOARDING=Object.freeze({wait:1,front:55,halfWidth:28,halfDepth:25,stopSpeed:3});
// 统一朝下车头的可站位置；库内车延伸至门外，避开车身与门框碰撞。
export function vehicleBoardingPoint(site){return {...site,x:site.x,y:site.indoor?(site.disembarkY??site.y+VEHICLE_BOARDING.front):site.y+VEHICLE_BOARDING.front};}
// 只读实际停驻记录，消防库内自有车同样参与，不包括访客、残骸或维修车辆。
export function boardingVehicles(game){
 if(!campParkingVisible(game)||!parkingFleetApplies(game)||game.arrivalCinematic)return [];
 const sites=parkedOwned(game).map(s=>({...s,hull:s.record.hull}));
 if(game.fireGarageParked&&game.mapId==='forest'&&!sites.some(s=>s.hull===4))sites.push({...FIRE_GARAGE,id:'fire-garage',mapId:'forest',name:'消防站车库',hull:4,fireGarage:true});
 return sites.filter(s=>game.progress.vehicleHulls[s.hull]&&game.vehicles[s.hull]?.hp>0&&!game.vehicles[s.hull].active&&game.vehicles[s.hull].cooldown<=0&&s.record?.hp!==0&&!vehicleService(game,s.hull)?.phase);
}
// 正面使用窄矩形，左右侧与车尾不触发；周期地图取离玩家最近的同一车体。
export function atVehicleFront(game,site){const p=nearest(vehicleBoardingPoint(site),game.player);return Math.abs(p.x-game.player.x)<=VEHICLE_BOARDING.halfWidth&&Math.abs(p.y-game.player.y)<=VEHICLE_BOARDING.halfDepth;}
// 返回最近的合法车辆；驾驶、室内、剧情和种地作业期间不抢占其他操作。
export function vehicleBoardingTarget(game){
 if(game.vehicle.active||game.player.hp<=0||game.mainlineSpeech||game.progress.restoration?.build||game.farmWork||game.cottage)return null;
 return boardingVehicles(game).filter(s=>atVehicleFront(game,s)).sort((a,b)=>worldDistance(vehicleBoardingPoint(a),game.player)-worldDistance(vehicleBoardingPoint(b),game.player))[0]||null;
}
// 离开或切换目标从零开始；暂停只冻结同一目标，完成后复用真实车队的上车入口。
export function updateVehicleBoarding(game,dt,input={x:0,y:0}){
 const target=vehicleBoardingTarget(game),old=game.vehicleBoarding;
 if(game.vehicleBoardingBlocked){const blocked=boardingVehicles(game).find(s=>s.hull===game.vehicleBoardingBlocked.hull&&s.mapId===game.vehicleBoardingBlocked.mapId);if(!blocked||!atVehicleFront(game,blocked))game.vehicleBoardingBlocked=null;}
 if(!target||!['playing','paused'].includes(game.state)||game.vehicleBoardingBlocked?.hull===target.hull||Math.hypot(input.x,input.y)>.01||Math.hypot(game.player.vx||0,game.player.vy||0)>VEHICLE_BOARDING.stopSpeed){game.vehicleBoarding=null;return;}
 const same=old?.hull===target.hull&&old.mapId===target.mapId&&worldDistance(old.site,target)<.01;
 if(game.state!=='playing'){if(!same)game.vehicleBoarding=null;return;}
 const state=game.vehicleBoarding={hull:target.hull,mapId:target.mapId,site:target,elapsed:(same?old.elapsed:0)+Math.max(0,dt)};
 if(state.elapsed+1e-9<VEHICLE_BOARDING.wait)return;
 game.vehicleBoarding=null;
 if(target.fireGarage){if(game.vehicle.index!==4&&!game.selectVehicle(4))return;boardFireGarage(game);}
 else boardParkedVehicle(game,target.hull);
}
