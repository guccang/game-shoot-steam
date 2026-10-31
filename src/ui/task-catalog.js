// 任务目录只投影正式主线和邻里进度，不复制接取状态、目标坐标或奖励账本。
import {LIVING_REQUESTS} from '../config/living-world.js';
import {trackedLivingId} from '../progression/task-tracking.js';
import {mainlineTask,mainlineObjective} from '../core/mainline-manager.js';
import {livingRequestTarget} from '../core/living-world.js';

// 待办与完成状态均由同一请求记录计算，旧已完成故事迁移后不会又显示为可接取。
export function taskCatalog(game){
 const tracking=trackedLivingId(game.progress),task=mainlineTask(game);
 const mainline=task?{id:task.id,title:task.title,text:mainlineObjective(game,{ignoreTracking:true})?.label||task.text,tracked:!tracking}:null;
 const neighbors=LIVING_REQUESTS.map(spec=>{
  const record=game.progress.living.requests[spec.id],accepted=record.stage>=0&&!record.completed;
  const tracked=accepted&&tracking===spec.id,unlocked=spec.requires.every(id=>game.progress.living.requests[id].completed);
  return {id:spec.id,title:spec.title,tracked,accepted,completed:record.completed,
   state:record.completed?'已完成':tracked?'正在追踪':accepted?'已领取':unlocked?'可接取':'尚未开放',
   text:record.completed?spec.reply:accepted?livingRequestTarget(game,spec)?.text:spec.lead};
 });
 return {mainline,neighbors,current:neighbors.find(q=>q.tracked)||mainline};
}
