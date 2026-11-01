// 主线种子谢礼共用正式入库与解锁；领取标记跟随候选存档提交。
import {grantFarmSeeds} from './farm.js';

// 同一份谢礼只领取一次，满仓仍保留品种解锁，不冒充柜台购买次数。
export function grantMainlineSeeds(progress,task){
 const gift=task?.seedReward;
 if(!gift||progress.mainline.seedRewards.includes(task.id))return 0;
 const count=grantFarmSeeds(progress.farm,gift.crop,gift.count);
 progress.mainline.seedRewards.push(task.id);return count;
}
