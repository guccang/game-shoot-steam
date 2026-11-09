import {worldBuildingBlocked} from '../../world/building-collision.js';
// 靠近自有停驻载具一秒自动上车，倒计时只存在本次游玩，不写入存档。
import {parkedOwned,parkingFleetApplies,campParkingVisible,boardParkedVehicle} from './camp-parking.js';
import {boardFireGarage} from '../activities/fire-rescue.js';
import {FIRE_GARAGE} from '../../world/fire-navigation.js';
import {nearest,worldDistance} from '../../world/coordinates.js';
import {vehicleService} from './vehicle-repair.js';
export const VEHICLE_BOARDING=Object.freeze({wait:1,front:55,radius:90,indoorRadius:60,maxDistance:155});
// 定位路线与徽记保留安全落点；自动上车范围不再要求玩家到达该点。
export function vehicleBoardingPoint(site){return {...site,x:site.x,y:site.indoor?(site.disembarkY??site.y+VEHICLE_BOARDING.front):site.y+VEHICLE_BOARDING.front};}
// 只读实际停驻记录，消防库内自有车同样参与，不包括访客、残骸或维修车辆。
export function boardingVehicles(game){
 if(!campParkingVisible(game)||!parkingFleetApplies(game)||game.arrivalCinematic)return [];
 const sites=parkedOwned(game).map(s=>({...s,hull:s.record.hull}));
 if(game.fireGarageParked&&game.mapId==='forest'&&!sites.some(s=>s.hull===4))sites.push({...FIRE_GARAGE,id:'fire-garage',mapId:'forest',name:'消防站车库',hull:4,fireGarage:true});
 return sites.filter(s=>game.progress.vehicleHulls[s.hull]&&game.vehicles[s.hull]?.hp>0&&!game.vehicles[s.hull].active&&game.vehicles[s.hull].cooldown<=0&&s.record?.hp!==0&&!vehicleService(game,s.hull)?.phase);
}
// 车身四周均可接近；库内从门前触发，线段采样避免隔着建筑墙体登乘。
export function nearVehicle(game,site){
 const center=site.indoor?vehicleBoardingPoint(site):site,radius=site.indoor?VEHICLE_BOARDING.indoorRadius:VEHICLE_BOARDING.radius;
 if(worldDistance(center,game.player)>radius||worldDistance(site,game.player)>VEHICLE_BOARDING.maxDistance)return false;
 const target=nearest(site,game.player),dx=target.x-game.player.x,dy=target.y-game.player.y,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/8));
 for(let i=0;i<=steps;i++)if(worldBuildingBlocked(game.player.x+dx*i/steps,game.player.y+dy*i/steps,2,{mapId:game.mapId}))return false;
 return true;
}
// 返回最近的合法车辆；驾驶、室内、剧情和种地作业期间不抢占其他操作。
export function vehicleBoardingTarget(game){
 if(game.vehicle.active||game.player.hp<=0||game.mainlineSpeech||game.progress.restoration?.build||game.farmWork||game.cottage||game.sceneApproach||game.cottageEntryKind)return null;
 return boardingVehicles(game).filter(s=>nearVehicle(game,s)).sort((a,b)=>worldDistance(a,game.player)-worldDistance(b,game.player))[0]||null;
}
// 范围内移动仍计时，离开或切换目标从零开始；暂停冻结，完成后复用正式上车事务。
export function updateVehicleBoarding(game,dt){
 const target=vehicleBoardingTarget(game),old=game.vehicleBoarding;
 if(game.vehicleBoardingBlocked){const blocked=boardingVehicles(game).find(s=>s.hull===game.vehicleBoardingBlocked.hull&&s.mapId===game.vehicleBoardingBlocked.mapId);if(!blocked||!nearVehicle(game,blocked))game.vehicleBoardingBlocked=null;}
 if(!target||!['playing','paused'].includes(game.state)||game.vehicleBoardingBlocked?.hull===target.hull){game.vehicleBoarding=null;return;}
 const same=old?.hull===target.hull&&old.mapId===target.mapId&&worldDistance(old.site,target)<.01;
 if(game.state!=='playing'){if(!same)game.vehicleBoarding=null;return;}
 // 首次靠近只显示零进度，不能把靠近之前的帧时间算进等待；长帧也不能瞬间完成。
 const tick=Number.isFinite(dt)?Math.min(.05,Math.max(0,dt)):0;
 const state=game.vehicleBoarding={hull:target.hull,mapId:target.mapId,site:target,elapsed:same?old.elapsed+tick:0};
 if(state.elapsed+1e-9<VEHICLE_BOARDING.wait)return;
 game.vehicleBoarding=null;
 if(target.fireGarage){if(game.vehicle.index!==4&&!game.selectVehicle(4))return;boardFireGarage(game);}
 else boardParkedVehicle(game,target.hull);
}
