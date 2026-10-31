// 种地临时下车只记录本次会话的原车引用，不重建载具或覆盖耐久、弹药与装填进度。
import {canEnterFarm,canUseFarm,farmInteractionBlocked} from './farm.js';

// 下车成功才记录返车意图；切换农具或重复打开不会覆盖原来的车辆。
export function enterFarmVehicle(game){
 // 必须在尝试下车前拦截战斗，失败不改变载具、输入或原农活队列。
 if(farmInteractionBlocked(game))return {ok:false,message:'战斗中暂不可种地'};
 if(!canEnterFarm(game))return {ok:false,message:'请结束当前活动，再打开种地工具'};
 validateFarmVehicleReturn(game);
 if(!game.vehicle?.active)return {ok:canUseFarm(game)};
 const vehicle=game.vehicle;
 if(!game.dismountVehicle())return {ok:false,message:'这里暂时无法安全下车，请将载具移到空旷地面后再试'};
 game.farmVehicleReturn={vehicle,player:game.player,mapId:game.mapId};
 return {ok:canUseFarm(game),dismounted:true};
}

// 暂停保留会话；死亡、换车、换地图或进入其他活动后不自动召回旧车。
export function validateFarmVehicleReturn(game){
 const saved=game.farmVehicleReturn;
 if(saved&&(saved.vehicle!==game.vehicle||saved.player!==game.player||saved.mapId!==game.mapId||!canEnterFarm(game,true)||game.vehicle.active))game.farmVehicleReturn=null;
 return game.farmVehicleReturn;
}

// 仅显式退出种地才恢复乘坐，沿用正式上车权限，不能借退出修复损毁车辆。
export function restoreFarmVehicle(game){
 const saved=validateFarmVehicleReturn(game);game.farmVehicleReturn=null;
 if(!saved||saved.vehicle.hp<=0||saved.vehicle.cooldown>0)return false;
 return game.summonVehicle();
}
