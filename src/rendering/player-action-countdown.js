import {WOOD_GROUND} from '../config/wood-storage.js';
import {VEHICLE_BOARDING,vehicleBoardingPoint} from '../core/vehicle-boarding.js';
// 房间与地图共用门口徽记，固定屏幕尺寸和目标门的位置。
import {drawActionCountdown} from './action-countdown.js';
import {interiorLayout} from '../config/workshop-interiors.js';
import {doorwayInteractionAnchor,projectInteractionAnchor} from '../world/interaction-anchors.js';

// 房屋入室与出门均站定一秒共用正式进度，绘制不改变计时或房间状态。
export function playerActionCountdown(game){
 const room=game.cottage;
 if(room)return !room.sleep&&!room.restOpen&&room.exitElapsed?{elapsed:room.exitElapsed,wait:interiorLayout(room).exitWait,icon:'exit'}:null;
 if(game.woodPickup&&game.woodPickup.elapsed>=0){const p=game.woodPickup;return {elapsed:p.elapsed,wait:WOOD_GROUND.wait,icon:'wood',width:78,anchor:{x:p.x+60,y:p.y+40,space:'world'}};}
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
 const seconds=Math.max(1,Math.ceil(action.wait-action.elapsed)),label=action.icon==='wood'?Math.max(.1,Math.ceil((action.wait-action.elapsed)*10-1e-9)/10).toFixed(1)+'s':action.icon==='vehicle'?seconds+'s':seconds;renderer.actionCountdownView={...point,width:action.width||68,height:34,icon:action.icon,label,progress:action.elapsed/action.wait};
 c.save();c.setTransform(renderer.dpr,0,0,renderer.dpr,0,0);c.translate(point.x,point.y);drawActionCountdown(c,{...action,progress:action.elapsed/action.wait,label});c.restore();
}
