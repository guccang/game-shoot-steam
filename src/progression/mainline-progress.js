// 主线保存已完成任务集合和旧档正在进行的任务，重排不重领奖也不丢进度。
import {LOGISTICS_LESSONS} from './mainline-logistics.js';
import {validateGardeningLesson} from './mainline-gardening.js';
import {MAINLINE_IDS,MAINLINE_TASKS} from '../config/mainline.js';
import {MAINLINE_V3_IDS,MAINLINE_V7_IDS,MAINLINE_V8_IDS} from '../config/mainline-legacy.js';
export const MAINLINE_SEEN=[...Object.keys(LOGISTICS_LESSONS),'map','navigation','wave','trial','drive','dismount','blessing','defense','valley','track','config','companions','pineKills','pineWaves','westHorde','pistolField','weaponField','vehicleField','hoverHorde','aircraftField','controllerHorde','hoverTrial','aircraftTrial','controllerTrial'];
// 三版以前先恢复合法旧前缀，四版以后按稳定 ID 保留完成集合与当前任务。
export function validateMainline(raw){
 const version=Number(raw?.version||1),ids=Array.isArray(raw?.completed)?[...raw.completed]:[];
 let completed=[],currentId=null,inserted=false;
 if(version<4){
  const oldOrder=MAINLINE_V3_IDS.filter(id=>id!=='pine-patrol');let count=0;
  if(version<2){
   while(count<oldOrder.length&&ids.includes(oldOrder[count]))count++;
   if(count>oldOrder.indexOf('vehicle-service'))ids.push('pine-patrol');
   inserted=count===oldOrder.indexOf('vehicle-service');
  }
  for(const id of MAINLINE_V3_IDS){if(!ids.includes(id))break;completed.push(id);}
  currentId=MAINLINE_V3_IDS[completed.length]||null;
  completed=MAINLINE_IDS.filter(id=>completed.includes(id));
 }else{
  completed=MAINLINE_IDS.filter(id=>ids.includes(id));
  if(MAINLINE_IDS.includes(raw?.currentId)&&!completed.includes(raw.currentId))currentId=raw.currentId;
  // v4–v6 可能未显式保存当前任务；新增邻里委托不能顶替正在做或待领奖的任务。
  if(version<8&&!currentId){
   currentId=MAINLINE_V7_IDS.find(id=>(version>=7||!['neighbor-seeds','neighbor-seed-shop','neighbor-garden'].includes(id))&&(version>=6||id!=='first-farm')&&(version!==4||id!=='weapon-field')&&!completed.includes(id))||null;
   if(!currentId)inserted=true;
  }
 }
 // 删除收获委托时重置为下一项见面阶段，不能继承旧的待领奖状态。
 if(version<9){
  const previous=raw?.currentId||(version===8?MAINLINE_V8_IDS.find(id=>!ids.includes(id)&&(id!=='first-harvest'||raw?.harvestReady)):currentId);
  if(previous==='first-harvest'||previous==='neighbor-garden'&&raw?.phase==='meet'){currentId=null;inserted=true;}
  else if(version===8&&!currentId&&MAINLINE_IDS.includes(previous))currentId=previous;
 }
 // 新增整备收获只补给正在升级的旧档；已进入后续主线的玩家不倒退、不补领奖励。
 let harvestInserted=false;
 if(raw&&version<10){
  const upgradeIndex=MAINLINE_IDS.indexOf('pistol-upgrade');
  if(completed.includes('pistol-upgrade')||MAINLINE_IDS.indexOf(currentId)>upgradeIndex||currentId==='pistol-upgrade'&&raw.phase==='report')completed=MAINLINE_IDS.filter(id=>id==='upgrade-harvest'||completed.includes(id));
  else if(currentId==='pistol-upgrade'){currentId='upgrade-harvest';harvestInserted=true;}
 }
 const seen=Object.fromEntries(MAINLINE_SEEN.map(k=>[k,Number.isFinite(raw?.seen?.[k])?Math.max(0,Math.min(1e7,raw.seen[k])):0]));
 if(version<3&&!completed.length&&raw?.phase==='report')seen.navigation=1;
 // 无旧数据的新建进度不固定任务；旧版全通后以新任务的见面阶段继续。
 if(!raw)currentId=null;
 const phase=completed.length===MAINLINE_IDS.length?'complete':harvestInserted?'doing':inserted||version<4&&!currentId?'meet':['meet','doing','report'].includes(raw?.phase)?raw.phase:'meet';
 const seedRewards=MAINLINE_TASKS.filter(t=>t.seedReward&&Array.isArray(raw?.seedRewards)&&raw.seedRewards.includes(t.id)).map(t=>t.id);
 const combatPractice=MAINLINE_TASKS.some(t=>t.id===raw?.combatPractice&&t.guide.steps.some(s=>s.operation?.kind==='vehicle'&&s.operation.record))?raw.combatPractice:null;
 return {version:11,seedRewards,combatPractice,gardening:validateGardeningLesson(harvestInserted?{taskId:'upgrade-harvest'}:raw?.gardening),rewardVersion:5,completed,currentId,navigationEnabled:raw?.navigationEnabled!==false,phase,seen,distance:Number.isFinite(raw?.distance)?Math.max(0,Math.min(1e7,raw.distance)):0};
}
