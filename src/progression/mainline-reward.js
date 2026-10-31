import {awardCampXp} from './camp-level.js';
import {grantMainlineSeeds} from './mainline-seeds.js';
import {beginGardeningLesson} from './mainline-gardening.js';
import {creditResource} from './resource-wallet.js';
// 主线资源事务共用规则：调用方先核验任务条件；稳定顺序、封顶和记录负责防止重复交付。
import {MAINLINE_TASKS,currentMainlineTask} from '../config/mainline.js';
import {mainlineReward} from '../config/economy.js';
import {recordEconomy} from './economy-ledger.js';
// 只提交当前任务；存储失败的正式入口会丢弃整个候选进度。
export function awardMainline(progress,id){
 const task=currentMainlineTask(progress.mainline);if(!task||task.id!==id)return null;
 awardCampXp(progress,'mainline');
 const reward={};
 for(const [key,n] of Object.entries(mainlineReward(task,progress)))reward[key]=creditResource(progress,key,n);
 grantMainlineSeeds(progress,task);
 progress.mainline.completed.push(id);progress.mainline.currentId=null;progress.mainline.phase=progress.mainline.completed.length===MAINLINE_TASKS.length?'complete':'meet';
 // 交接时确定下一项，随后成熟的作物不会把已经接上的委托挤走。
 progress.mainline.currentId=currentMainlineTask(progress.mainline)?.id||null;
 // 收获段落前后直接接续实际操作，省去在田地和工坊师傅之间交任务的往返。
 if(task.goal.harvestFor||currentMainlineTask(progress.mainline)?.goal.harvestFor){progress.mainline.phase='doing';beginGardeningLesson(progress);}
 recordEconomy(progress,'income','mainline:'+id,reward);return reward;
}
