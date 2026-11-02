import {awardCampXp} from './camp-level.js';
import {grantMainlineSeeds} from './mainline-seeds.js';
import {creditResource} from './resource-wallet.js';
// 主线资源事务共用规则：调用方先核验任务条件；稳定顺序、封顶和记录负责防止重复交付。
import {currentMainlineTask} from '../config/mainline.js';
import {mainlineReward} from '../config/economy.js';
import {recordEconomy} from './economy-ledger.js';
// 只提交当前任务；存储失败的正式入口会丢弃整个候选进度。
export function awardMainline(progress,id){
 const task=currentMainlineTask(progress.mainline);if(!task||task.id!==id)return null;
 awardCampXp(progress,'mainline',null,task.title);
 const reward={};
 for(const [key,n] of Object.entries(mainlineReward(task,progress)))reward[key]=creditResource(progress,key,n);
 grantMainlineSeeds(progress,task);
 progress.mainline.completed.push(id);delete progress.mainline.suspended?.[id];progress.mainline.currentId=null;
 // 交接时确定下一项，随后成熟的作物不会把已经接上的委托挤走。
 progress.mainline.currentId=currentMainlineTask(progress.mainline)?.id||null;
 const resumed=progress.mainline.suspended?.[progress.mainline.currentId];
 progress.mainline.phase=resumed?.phase||(progress.mainline.currentId?'meet':'complete');
 if(resumed)progress.mainline.gardening=structuredClone(resumed.gardening);
 // 阶段与自选体验结算后都停止催促；下一任务和已有进度仍留在巡林簿中。
 progress.mainline.trackingPaused=true;progress.taskTracking={kind:'none'};
 recordEconomy(progress,'income','mainline:'+id,reward);return reward;
}
