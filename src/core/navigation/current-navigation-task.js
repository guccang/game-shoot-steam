// 手机展示当前要执行的任务；取消是一次性操作，不提供重新开启旧目标的开关。
import {gameSource} from '../game-source.js';
import {worldTaskObjective,worldNavigationDiagnostics} from './world-navigation.js';
import {trackedLivingRequest} from './task-tracking.js';
import {selectMainlineTask} from '../story/mainline-selection.js';
// 自动行进和主动目的地优先，普通任务随后；名称只用于展示，不参与业务判定。
export function currentNavigationTask(game){
 game=gameSource(game);
 const station=game.waystationTravel&&game.progress.waystations?.sites.find(s=>s.id===game.waystationTravel.id);
 if(station)return {kind:'waystation',label:'前往'+station.name};
 const intent=worldNavigationDiagnostics(game).intent;if(intent)return {kind:'visit',label:intent.label};
 const objective=worldTaskObjective(game);if(objective)return {kind:'task',label:objective.label||objective.task.title};
 const request=trackedLivingRequest(game);return request?{kind:'task',label:request.title}:null;
}
// 使用原有任务事务先保存取消结果，成功后才清除目标和行进；失败保留当前任务。
export function cancelCurrentTask(game){
 game=gameSource(game);
 if(!currentNavigationTask(game))return {ok:false,message:'当前没有任务。'};
 if(!selectMainlineTask(game,null,{cancelNavigation:true}))return {ok:false,message:game.mainlineError||'当前任务暂时不能取消，请先结束战斗或活动。'};
 return {ok:true,message:'已取消当前任务。'};
}
