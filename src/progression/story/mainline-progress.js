// 主线保存当前任务、已完成集合和真实操作记录。
import {CAMPAIGN_TASK_IDS} from '../../config/mainline-pacing.js';
import {LOGISTICS_LESSONS} from './mainline-logistics.js';
import {validateGardeningLesson} from './mainline-gardening.js';
import {MAINLINE_IDS,MAINLINE_TASKS} from '../../config/mainline.js';
export const MAINLINE_SEEN=[...Object.keys(LOGISTICS_LESSONS),'map','navigation','wave','trial','drive','dismount','blessing','defense','valley','track','config','companions','pineKills','pineWaves','westHorde','pistolField','weaponField','vehicleField','hoverHorde','aircraftField','controllerHorde','hoverTrial','aircraftTrial','controllerTrial'];
// 只读取当前结构；不重排历史任务或补领奖励。
export function validateMainline(raw){
 if(raw?.version!==12)raw=null;
 const ids=Array.isArray(raw?.completed)?raw.completed:[],completed=MAINLINE_IDS.filter(id=>ids.includes(id));
 const currentId=MAINLINE_IDS.includes(raw?.currentId)&&!completed.includes(raw.currentId)?raw.currentId:null;
 const seen=Object.fromEntries(MAINLINE_SEEN.map(k=>[k,Number.isFinite(raw?.seen?.[k])?Math.max(0,Math.min(1e7,raw.seen[k])):0]));
 const phase=!currentId&&CAMPAIGN_TASK_IDS.every(id=>completed.includes(id))?'complete':['meet','doing','report'].includes(raw?.phase)?raw.phase:'meet';
 const seedRewards=MAINLINE_TASKS.filter(t=>t.seedReward&&Array.isArray(raw?.seedRewards)&&raw.seedRewards.includes(t.id)).map(t=>t.id);
 const combatPractice=MAINLINE_TASKS.some(t=>t.id===raw?.combatPractice&&t.guide.steps.some(s=>s.operation?.kind==='vehicle'&&s.operation.record))?raw.combatPractice:null;
 // 暂存的自选体验逐项校验，园艺地块与待交付阶段随切换保存，绝不伪造完成或补发奖励。
 const suspended=Object.fromEntries(MAINLINE_IDS.filter(id=>!completed.includes(id)&&raw?.suspended?.[id]&&['meet','doing','report'].includes(raw.suspended[id].phase)).map(id=>[id,{phase:raw.suspended[id].phase,gardening:validateGardeningLesson(raw.suspended[id].gardening)}]));
 return {version:12,trackingPaused:raw?.trackingPaused===true,suspended,seedRewards,combatPractice,gardening:validateGardeningLesson(raw?.gardening),rewardVersion:5,completed,currentId,navigationEnabled:raw?.navigationEnabled!==false,phase,seen,distance:Number.isFinite(raw?.distance)?Math.max(0,Math.min(1e7,raw.distance)):0};
}
