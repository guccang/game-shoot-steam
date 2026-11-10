import {TRADE_ESCORT} from '../config/trade-escort.js';
import {WORKSHOP_INTERIORS} from '../config/workshop-interiors.js';
import {MINING} from '../config/mining.js';
import {MINE_ENTRANCE,mineEntrances} from '../world/mine-entrances.js';
import {HOME_DIRECTIONS,HOME_BALCONY,HOME_ELEVATOR} from '../config/home-construction.js';
import {COTTAGE,COTTAGE_STAIRS,cottageFloor} from '../config/cottage.js';
import {VEHICLE_BOARDING,vehicleBoardingPoint} from '../core/vehicles/vehicle-boarding.js';
// 房间与地图共用门口徽记，固定屏幕尺寸和目标门的位置。
import {drawActionCountdown} from './action-countdown.js';
import {interiorLayout,SHOPKEEPER_ENTRY} from '../config/workshop-interiors.js';
import {doorwayInteractionAnchor,projectInteractionAnchor} from '../world/interaction-anchors.js';

// 房屋入室与出门均站定一秒共用正式进度，绘制不改变计时或房间状态。
export function playerActionCountdown(game){
 // 商队夜宿共用睡眠圆环，固定在玩家身旁。
 if(game.tradeRest)return {elapsed:game.tradeRest.elapsed,wait:TRADE_ESCORT.restSeconds,icon:'bed',anchor:{x:game.player.x+65,y:game.player.y-50,space:'world'}};
 const room=game.cottage;
 if(room?.basementElapsed>0)return {elapsed:room.basementElapsed,wait:1,icon:'stairs-down',anchor:{x:MINING.hatch.goal.x-62,y:MINING.hatch.goal.y-15,space:'room'}};
 if(room?.balcony)return room.balconyExitElapsed>0?{elapsed:room.balconyExitElapsed,wait:1,icon:'home',anchor:{...HOME_BALCONY.exit,space:'room'}}:null;
 if(room?.balconyElapsed>0){const side=Object.keys(HOME_DIRECTIONS).find(s=>Math.hypot(game.player.x-HOME_DIRECTIONS[s].door.x,game.player.y-HOME_DIRECTIONS[s].door.y)<=32);if(side)return {elapsed:room.balconyElapsed,wait:1,icon:'exit',anchor:{...HOME_DIRECTIONS[side].door,space:'room'}};}
 // 楼梯徽记固定在落脚点左前方，避免猫猫身体和扶手盖住数字。
 if(room?.kind==='cottage'&&!room.sleep&&room.stairsElapsed!=null){const down=room.stairsTarget<cottageFloor(room),goal=down?COTTAGE_STAIRS.downLanding:COTTAGE_STAIRS.landing;return {elapsed:room.stairsElapsed,wait:COTTAGE_STAIRS.wait,icon:down?'stairs-down':'stairs-up',anchor:{x:goal.x-105,y:goal.y-12,space:'room'}};}
 if(room?.kind==='cottage'&&!room.sleep&&room.elevatorElapsed!=null)return {elapsed:room.elevatorElapsed,wait:COTTAGE_STAIRS.wait,icon:'board',anchor:{x:HOME_ELEVATOR.landing.x-105,y:HOME_ELEVATOR.landing.y-12,space:'room'}};
 // 床和柜台徽记固定在目标侧边，避免盖住正在停留的猫猫。
 if(room&&!room.sleep&&room.restElapsed!=null)return {elapsed:room.restElapsed,wait:COTTAGE.bedWait,icon:'bed',anchor:{x:COTTAGE.bed.x+85,y:COTTAGE.bed.y-65,space:'room'}};
 if(room?.displayEntry&&!room.sleep)return {elapsed:room.displayEntry.elapsed,wait:SHOPKEEPER_ENTRY.wait,icon:'board',anchor:{x:room.displayEntry.site.x-90,y:room.displayEntry.site.y-60,space:'room'}};
 if(room)return !room.sleep&&room.exitElapsed?{elapsed:room.exitElapsed,wait:interiorLayout(room).exitWait,icon:'exit'}:null;
 // 矿洞沿用入室倒计时，徽记放在洞口侧边，步行和战车均可辨认。
 if(game.mineEntranceWait>0){const site=game.mineEntranceKey==='warehouse'?WORKSHOP_INTERIORS.warehouse.door:mineEntrances(game.progress.mining).find(s=>s.key===game.mineEntranceKey);if(site)return {elapsed:game.mineEntranceWait,wait:MINE_ENTRANCE.wait,icon:'stairs-down',anchor:{x:site.x+68,y:site.y-36,space:'world'}};}
 // 驾驶时也显示房门候停进度，载具自身的上车徽记仍只用于步行状态。
 if(game.vehicle.active&&!game.cottageEntry)return null;
 // 车头侧边徽记避开猫猫身体和短屏顶部HUD，仍固定于车辆而不随玩家漂移。
 if(game.vehicleBoarding){const front=vehicleBoardingPoint(game.vehicleBoarding.site);return {elapsed:game.vehicleBoarding.elapsed,wait:VEHICLE_BOARDING.wait,icon:'vehicle',anchor:{x:front.x+65,y:front.y+50,space:'world'}};}
 if(!game.cottageEntry)return null;
 const layout=interiorLayout({kind:game.cottageEntryKind});
 // 驾驶进门圆环放在门前侧边，避免屋顶位置被短屏HUD和驾驶员遮挡。
 return {elapsed:game.cottageEntry,wait:layout.wait,icon:'home',...(game.vehicle.active?{anchor:{x:layout.door.x+70,y:layout.door.y+70,space:'world'}}:{})};
}
// 在最终屏幕层绘制，避免天气、家具、出口地垫和场景色调把徽记盖住。
export function drawPlayerActionCountdown(renderer){
 const game=renderer.game,action=playerActionCountdown(game);renderer.actionCountdownView=null;
 if(!action||!['playing','paused'].includes(game.state))return;
 const point=projectInteractionAnchor(action.anchor||doorwayInteractionAnchor(game),renderer.view,renderer.cottageView),c=renderer.c;if(!point)return;
 const seconds=Math.max(1,Math.ceil(action.wait-action.elapsed)),label=action.icon==='wood'?Math.max(.1,Math.ceil((action.wait-action.elapsed)*10-1e-9)/10).toFixed(1)+'s':(['vehicle','bed','board'].includes(action.icon)||action.icon.startsWith('stairs-'))?seconds+'s':seconds;renderer.actionCountdownView={...point,width:action.width||68,height:34,icon:action.icon,label,progress:action.elapsed/action.wait};
 c.save();c.setTransform(renderer.dpr,0,0,renderer.dpr,0,0);c.translate(point.x,point.y);drawActionCountdown(c,{...action,progress:action.elapsed/action.wait,label});c.restore();
}
