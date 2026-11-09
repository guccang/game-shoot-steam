// 建筑前置完成后直接开始对应主线，只有接取阶段变化，不结算任务或发奖励。
import {currentMainlineTask} from '../../config/mainline.js';
import {TOWN_RESTORATIONS,facilityOpen,pendingRestoration} from '../../config/town-restoration.js';
import {beginGardeningLesson} from '../story/mainline-gardening.js';

// 限定当前任务对应的已修设施；提前修别的建筑和待交付任务不会被推进。
export function restoredTaskToStart(progress,facilityId) {
  if(progress.mainline?.trackingPaused||progress.mainline?.phase!=='meet'||pendingRestoration(progress))return null;
  const task=currentMainlineTask(progress.mainline);
  const facility=TOWN_RESTORATIONS.find(f=>f.before===task?.id&&(!facilityId||f.id===facilityId));
  return facility&&facilityOpen(progress,facility.id)?task:null;
}

// 调用方将接取与施工完成写进同一候选存档，失败时整体丢弃。
export function startRestoredTask(progress,facilityId) {
  const task=restoredTaskToStart(progress,facilityId);if(!task)return null;
  progress.mainline.currentId=task.id;progress.mainline.phase='doing';
  beginGardeningLesson(progress);return task;
}
