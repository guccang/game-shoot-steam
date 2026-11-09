import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {mainlineConditionCost} from '../src/progression/story/mainline-cost.js';
// 当前任务经济审计：直接读取正式内容表、奖励和交易；成本台账与战斗采样分开，不伪造完整主线通关耗时。
import {MAINLINE_TASKS} from '../src/config/mainline.js';
import {STORY_CAMPAIGN} from '../src/config/story-campaign.js';
import {STORY_POSTS} from '../src/config/story-posts.js';
import {economyUpgradeCost,RECOMMENDED_ECONOMY,RESOURCE_KEYS} from '../src/config/economy.js';
import {waveDifficulty,waveRewardTotal,clearingWaveBudget} from '../src/config/waves.js';
import {equipmentRecipe} from '../src/progression/workshop/equipment-goals.js';
import {transactProgress} from '../src/progression/economy/transactions.js';
import {transactVehicle} from '../src/progression/vehicles/vehicles.js';
import {quoteWorkshop,workshopUpgrade} from '../src/progression/workshop/workshop.js';
import {nativeVehicleWeapon} from '../src/config/vehicle-armaments.js';
import {openingAuditProgress} from './opening-economy-audit.mjs';
import {sampleClearing} from './clearing-timing.mjs';
import {wallet} from '../src/balance/model.js';
import {writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

// 只汇总实际资源字段，不把门槛、赠送装备或未选中的二选一奖励当成现金。
export function sumResources(rows){return Object.fromEntries(RESOURCE_KEYS.map(k=>[k,rows.reduce((s,r)=>s+(r[k]||0),0)]));}
// 独立单件从一级升级，不带同类追赶折扣；用于判断固定等级费用能吸收多少收入。
export function upgradeBudget(kind,index,target){
 const p=openingAuditProgress(),cost=[];
 for(let l=1;l<target;l++)cost.push(economyUpgradeCost(p,kind,index,l));
 return sumResources(cost);
}
// 教学最低消费通过正式交易逐笔计算；资格与资金预置仅用于报价，不代表玩家已经获得这些进度。
export function taskBudget(){
 let p=openingAuditProgress();p.coins=p.wood=1000000;for(const k of Object.keys(p.materials))p.materials[k]=1000000;
 p.bosses=18;p.mainline.completed=MAINLINE_TASKS.map(t=>t.id);
 // 只为报价开放已有建筑，不把修复材料或任务胜利计为经济收入。
 p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;
 const events=[];
 // 购买与主等级升级由正式事务决定费用与车载主炮所有权。
 function own(kind,index,target){const field={heroes:'heroes',weapons:'weapons',vehicle:'vehicleHulls',turret:'vehicleWeapons'}[kind];
  const transact=['heroes','weapons'].includes(kind)?transactProgress:transactVehicle;
  if(!p[field][index]&&!transact(p,kind,index,'buy'))throw Error('报价购买失败：'+kind+index);
  while(p[field][index]<target)if(!transact(p,kind,index,'upgrade'))throw Error('报价升级失败：'+kind+index);
 }
 // 附属部件复用工坊校验及最终扣费；不手算另一套费用公式。
 function part(kind,index,key,target){while(true){const plan=workshopUpgrade(p,kind,index,key);if(plan.original>=target)return;
  const quote=quoteWorkshop(p,plan);if(!quote.ok)throw Error(quote.reason);p=quote.next;}}
 // 从任务目标读取最低拥有/等级要求；非消费目标仅记录，不当成已完成的挑战。
 function consume(goal){if(goal.all){goal.all.forEach(consume);return;}if(goal.any){
   // 优先选择真实报价最低的分支，免费演练不再被误算为购买高级装备。
   const choices=goal.any.map(condition=>({condition,cost:mainlineConditionCost(p,condition)}));
   choices.sort((a,b)=>RESOURCE_KEYS.reduce((n,k)=>n+a.cost[k]-b.cost[k],0));consume(choices[0].condition);return;
  }
  if(goal.controllerLevel){own('weapons',12,goal.controllerLevel);return;}
  if(goal.nativeLevel!==undefined){own('turret',nativeVehicleWeapon(goal.nativeLevel).weaponIndex,goal.min);return;}
  const keys=goal.path?.split('.')||[],[,field,index,key]=keys;
  const kind={heroes:'heroes',weapons:'weapons',vehicleHulls:'vehicle',vehicleWeapons:'turret'}[field];
  if(kind)own(kind,Number(index),goal.min);
  if(['weaponParts','vehicleParts'].includes(field))part(field==='weaponParts'?'weapons':'vehicle',Number(index),key,goal.min);
  if(field==='mods'){
   // 熟练度是教学的前置条件，这里只核算一次有效改装的正式成本。
   p.mastery[Number(index)]=550;const q=quoteWorkshop(p,{kind:'weapons',index:Number(index),action:'modify',choice:1,original:p.mods[Number(index)]});
   if(!q.ok)throw Error(q.reason);p=q.next;
  }
 }
 for(const [i,t] of MAINLINE_TASKS.entries()){const before=wallet(p);consume(t.goal);const after=wallet(p);
  const cost=Object.fromEntries(RESOURCE_KEYS.map(k=>[k,before[k]-after[k]]));
  events.push({step:i+1,id:t.id,title:t.title,goal:t.goal,reward:t.reward,cost,cumulativeIncome:sumResources(MAINLINE_TASKS.slice(0,i+1).map(t=>t.reward)),cumulativeCost:sumResources([...events.map(e=>e.cost),cost])});
 }
 return {route:'按各条件最低资源报价规划；高级载具和控制器走免费演练，沿用已有装备；仅核算强制消费，不代表自然通关或收入时长',events,totalIncome:sumResources(events.map(e=>e.reward)),totalCost:sumResources(events.map(e=>e.cost))};
}
// 成功与失败全部保留；均值收入/全部耗时不会将死亡样本从收益率分母剔除。
export function summarizeSamples(samples){
 const seconds=samples.reduce((s,r)=>s+r.seconds,0),income=sumResources(samples.map(r=>r.income));
 const done=samples.filter(r=>r.completed).map(r=>r.seconds).sort((a,b)=>a-b);
 return {samples:samples.length,completed:done.length,failed:samples.filter(r=>r.state==='dead').length,unfinished:samples.filter(r=>!r.completed&&r.state!=='dead').length,
  successSeconds:done,meanSeconds:seconds/samples.length,meanIncome:Object.fromEntries(RESOURCE_KEYS.map(k=>[k,income[k]/samples.length])),
  resourcesPerCombatMinute:Object.fromEntries(RESOURCE_KEYS.map(k=>[k,income[k]*60/seconds]))};
}
// 静态台账不依赖采样执行，可由测试单独检查正式配方与当前任务数。
export function staticAudit(){return {tasks:taskBudget(),
 upgrades:['heroes','weapons','turret','vehicle'].map(kind=>({kind,index:0,levels:Object.fromEntries([5,10,15,20].map(n=>[n,upgradeBudget(kind,0,n)]))})),
 waveBudgets:Array.from({length:15},(_,i)=>({wave:i+1,enemies:waveDifficulty(i+1).total,legacyRewardUnits:waveRewardTotal(i+1),budget:clearingWaveBudget(i+1)})),
 storyRewards:Object.values(STORY_CAMPAIGN).map(c=>({id:c.id,title:c.title,reward:c.reward})),
 collections:STORY_POSTS.map(p=>({id:p.id,chapters:p.chapters,collection:p.collection})),
 purchases:[['weapons',3],['vehicle',0],['vehicle',3],['vehicle',2],['weapons',12]].map(([kind,index])=>({kind,index,...equipmentRecipe(kind,index)})),
 upgradeCap:RECOMMENDED_ECONOMY.upgrades.ceilings};}
// 命令行报告包括最新正式战斗，多种等级夹具不会拼接为一条虚构的连续玩家路线。
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report={version:1,date:'2026-10-25',evidence:'当前正式 Game 固定步长自动走位采样；不含往返工坊、阅读与重试恢复时间；不是真人通关或8–12小时验证',...staticAudit(),combat:[]};
 for(const [group,level,heroLevel] of [[1,1,1],[1,3,2],[1,7,7],[2,7,7],[3,7,7]]){
  const samples=Array.from({length:20},(_,i)=>sampleClearing(group,level,i+1,{heroLevel,maxSeconds:600}));
  const entry={group,weaponLevel:level,heroLevel,summary:summarizeSamples(samples),samples};report.combat.push(entry);
  console.log(JSON.stringify({group,level,...entry.summary}));
 }
 const path=resolve(process.argv[2]||'output/task-economy-audit/report.json');await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(report,null,2)+'\n');
}
