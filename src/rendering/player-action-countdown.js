// 房间与地图共用门口徽记，固定屏幕尺寸和目标门的位置。
import {drawActionCountdown} from './action-countdown.js';
import {interiorLayout} from '../config/workshop-interiors.js';
import {doorwayInteractionAnchor,projectInteractionAnchor} from '../world/interaction-anchors.js';

// 房屋入室与出门均站定一秒共用正式进度，绘制不改变计时或房间状态。
export function playerActionCountdown(game){
 const room=game.cottage;
 if(room)return !room.sleep&&!room.restOpen&&room.exitElapsed?{elapsed:room.exitElapsed,wait:interiorLayout(room).exitWait,icon:'exit'}:null;
 if(game.vehicle.active||!game.cottageEntry)return null;
 return {elapsed:game.cottageEntry,wait:interiorLayout({kind:game.cottageEntryKind}).wait,icon:'home'};
}
// 在最终屏幕层绘制，避免天气、家具、出口地垫和场景色调把徽记盖住。
export function drawPlayerActionCountdown(renderer){
 const game=renderer.game,action=playerActionCountdown(game);renderer.actionCountdownView=null;
 if(!action||!['playing','paused'].includes(game.state))return;
 const point=projectInteractionAnchor(doorwayInteractionAnchor(game),renderer.view,renderer.cottageView),c=renderer.c;if(!point)return;
 const label=Math.max(1,Math.ceil(action.wait-action.elapsed));renderer.actionCountdownView={...point,width:68,height:34,icon:action.icon,label,progress:action.elapsed/action.wait};
 c.save();c.setTransform(renderer.dpr,0,0,renderer.dpr,0,0);c.translate(point.x,point.y);drawActionCountdown(c,{...action,progress:action.elapsed/action.wait,label});c.restore();
}
