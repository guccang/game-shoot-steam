// 主线种子谢礼共用正式入库与解锁；领取标记跟随候选存档提交。
import {MAINLINE_TASKS,currentMainlineTask} from '../config/mainline.js';
import {grantFarmSeeds} from './farm.js';

// 同一份谢礼只领取一次，满仓仍保留品种解锁，不冒充柜台购买次数。
export function grantMainlineSeeds(progress,task){
 const gift=task?.seedReward;
 if(!gift||progress.mainline.seedRewards.includes(task.id))return 0;
 const count=grantFarmSeeds(progress.farm,gift.crop,gift.count);
 progress.mainline.seedRewards.push(task.id);return count;
}

// 旧版直接续接首次播种却没有种子时，补发遗漏谢礼；已有播种进度或领过的不再发。
export function restoreFirstPlantSeeds(progress){
 if(currentMainlineTask(progress.mainline)?.id!=='first-farm'||progress.farm.planted>0||progress.farm.seeds.some(n=>n>0))return;
 if(!progress.mainline.completed.includes('first-map'))return;
 grantMainlineSeeds(progress,MAINLINE_TASKS.find(t=>t.id==='neighbor-seed-shop'));
}
