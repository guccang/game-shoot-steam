// 世界任务入口共用追踪选择；章节、秘境等活动暂时接管，退出后恢复原任务。
import {LIVING_REQUESTS} from '../config/living-world.js';
import {livingForest} from '../world/living-spaces.js';
import {trackedLivingId} from '../progression/task-tracking.js';
// 当前护路战斗优先完成，不让面板切换把进行中的战斗指引覆盖。
export function trackedLivingRequest(game){
  if(!livingForest(game))return null;
  const id=game.livingBattle||trackedLivingId(game.progress);
  return LIVING_REQUESTS.find(q=>q.id===id)||null;
}
