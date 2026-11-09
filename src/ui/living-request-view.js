// 邻居交接筛选只读取正式任务和居民身份，不创建第二份进度。
import {LIVING_REQUESTS} from '../config/living-world.js';
import {livingRequestTarget,residentFor} from '../core/camp/living-world.js';
import {trackedLivingRequest} from '../core/navigation/task-tracking.js';

// 当前交谈对象关联的委托，使用角色替代后的真实居民身份。
export function residentRequestChoices(game,person){
 return LIVING_REQUESTS.filter(spec=>!person||residentFor(game,spec.host)?.id===person||
  livingRequestTarget(game,spec)?.step.resident&&residentFor(game,livingRequestTarget(game,spec).step.resident)?.id===person);
}
// 到点交接优先当前追踪任务；无追踪时选择该居民正在办理的委托。
export function focusedResidentRequest(game,person){
 if(!person)return null;
 const active=residentRequestChoices(game,person).filter(spec=>{const q=game.progress.living.requests[spec.id];return q.stage>=0&&!q.completed;});
 const tracked=trackedLivingRequest(game);
 return tracked?active.find(spec=>spec.id===tracked.id)||null:active[0]||null;
}
// 交接后仍保留本次委托的完成页，避免刚交午餐便弹出集市等新任务。
export function visibleResidentRequests(game,person,focusId=null){
 const state=game.progress.living;
 if(person&&focusId)return LIVING_REQUESTS.filter(spec=>spec.id===focusId);
 const tracked=person&&trackedLivingRequest(game);
 // 正在追踪委托时，其他居民不主动推荐新任务；玩家仍可从邻里目录切换。
 return residentRequestChoices(game,person).filter(spec=>(!tracked||spec.id===tracked.id)&&!state.requests[spec.id].completed&&
  (!person||spec.requires.every(id=>state.requests[id].completed))).sort((a,b)=>(state.requests[b.id].stage>=0)-(state.requests[a.id].stage>=0));
}
