// 后勤教学只登记当前任务接取后的真实操作，事务调用方把标记与物品一起保存。
import {currentMainlineTask} from '../../config/mainline.js';

export const LOGISTICS_LESSONS=Object.freeze({
 ammoPurchased:'supply-ammo',warehouseWithdrawn:'warehouse-lesson',warehouseDeposited:'warehouse-lesson',
 bagCleaned:'bag-cleanup',vehicleLoadViewed:'vehicle-weight',cargoLoaded:'vehicle-weight',
 cargoCleaned:'cargo-cleanup',repairVisited:'repair-center',repairChecked:'repair-center',
});

// 预览、失败交易、未接取和其他任务都不能预先满足教学条件。
export function recordLogisticsLesson(progress,key){
 const run=progress?.mainline;
 if(!run||run.phase!=='doing'||currentMainlineTask(run)?.id!==LOGISTICS_LESSONS[key])return false;
 run.seen[key]=1;return true;
}

// 界面浏览只在永久巡林状态登记，活动借用车不会贡献学习进度。
export function inspectLogisticsLesson(game,key){
 if(game.story||game.realm||game.fireActive||game.campDefense||game.workshopTrial||game.arrivalCinematic||!['playing','paused'].includes(game.state))return false;
 return recordLogisticsLesson(game.progress,key);
}
