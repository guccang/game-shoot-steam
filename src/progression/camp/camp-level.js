import {awardHeroXp,HERO_TASK_XP} from '../player/hero-experience.js';
// 营地经验、存档校验与首次购买报价共用规则，不改变战斗强度。
import {CAMP_LEVELS,CAMP_ACTIVITY_XP,CAMP_BATCHES,CAMP_STORY_XP} from '../../config/camp-level.js';
// 损坏值和旧档缺项从零开始，不根据历史战绩补发经验。
function integer(value,max){return Number.isFinite(value)?Math.min(max,Math.max(0,Math.floor(value))):0;}
// 白名单恢复经验和两个计数余数。
export function validateCampLevel(raw){return {xp:integer(raw?.xp,CAMP_LEVELS.at(-1).xp),trees:integer(raw?.trees,CAMP_BATCHES.trees.count-1),enemies:integer(raw?.enemies,CAMP_BATCHES.enemies.count-1)};}
// 返回当前档位和下一档累计门槛，满级时没有下一档。
export function campProgress(progress){
 const xp=integer(progress?.campLevel?.xp,CAMP_LEVELS.at(-1).xp);
 const index=CAMP_LEVELS.findLastIndex(row=>xp>=row.xp),row=CAMP_LEVELS[index];
 return {tier:index+1,xp,percent:row.percent,start:row.xp,nextXp:CAMP_LEVELS[index+1]?.xp??null};
}
// 统一折扣文案：98% 显示 9.8 折，90% 显示 9 折。
export function campDiscountText(percent){return `${percent/10}折`;}
// 只用于首次购买，整数百分比向上取整，材料及零价保持不变。
export function campPurchasePrice(progress,base){const {percent}=campProgress(progress);return {...base,coins:Math.ceil(base.coins*percent/100),wood:Math.ceil(base.wood*percent/100)};}
// 发放返回实际经验差额，封顶与资源钱包互相独立；调用方负责完成事件的一次性保护。
export function awardCampXp(progress,activity,chapterId=null,taskTitle=''){
 // 任务和挑战已完成的一次性事务同时发放角色经验，营地满级也继续成长。
 awardHeroXp(progress,HERO_TASK_XP[activity]||0);
 const state=progress.campLevel=validateCampLevel(progress.campLevel),before=state.xp;
 const amount=activity==='story'?(chapterId?.startsWith('neighbors-')?CAMP_ACTIVITY_XP.living:CAMP_STORY_XP[chapterId]??240):CAMP_ACTIVITY_XP[activity]??0;
 state.xp=Math.min(CAMP_LEVELS.at(-1).xp,before+amount);
 return state.xp-before;
}
// 伐木和野外击杀按批积累，余数随存档保留，不要求连续完成。
export function countCampActivity(progress,kind,count=1){
 const batch=CAMP_BATCHES[kind];if(!batch)return 0;
 const state=progress.campLevel=validateCampLevel(progress.campLevel),before=state.xp,total=state[kind]+integer(count,99999999);
 state[kind]=total%batch.count;state.xp=Math.min(CAMP_LEVELS.at(-1).xp,before+Math.floor(total/batch.count)*batch.xp);return state.xp-before;
}
