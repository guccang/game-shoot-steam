// 满载提示使用实际负重，不把发动机故障或牵引不足误报为背包已满。
import {catLoad,vehicleLoad} from '../progression/load-weight.js';
import {personalFleet} from './vehicle-repair.js';
// 首次满载立即提醒；持续尝试移动每四秒提醒一次，清理恢复后重置。
export function updateLoadWarning(game,dt,input){
 if(game.state!=='playing')return;
 if(!personalFleet(game)){game.loadWarning=null;return;}
 const load=game.vehicle.active?vehicleLoad(game):catLoad(game);
 if(!load.overloaded){game.loadWarning=null;return;}
 const key=game.vehicle.active?'vehicle:'+game.vehicle.index:'bag',previous=game.loadWarning,remaining=Math.max(0,(previous?.remaining||0)-dt);
 game.loadWarning={key,remaining};
 if(previous?.key===key&&(remaining>0||Math.hypot(input.x,input.y)<.01))return;
 game.loadWarning.remaining=4;
 game.onEvent('story-hint',{text:game.vehicle.active?'载具载荷已满，无法移动。请打开载具页面清理货舱。':'背包载荷已满，只能缓慢行走。请到仓库存放物品或清理背包，减重后恢复正常速度。'});
}
