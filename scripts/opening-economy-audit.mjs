// 按当前首轮怪数审计资源职责与教学消费：奖励、条件和升级共用正式规则，耗时明确列为假设。
import {freshRangerProgress} from '../src/progression/progress.js';
import {RANGER} from '../src/config/ranger-arrival.js';
import {waveDifficulty,WAVE_REST_SECONDS,clearingKillReward} from '../src/config/waves.js';
import {WAVE_WARNING_SECONDS} from '../src/core/wave-manager.js';
import {RECOMMENDED_ECONOMY,bindEconomy,forestReward,economyUpgradeCost} from '../src/config/economy.js';
import {awardMaterials} from '../src/progression/material-loot.js';
import {transactProgress} from '../src/progression/transactions.js';
import {quoteWorkshop,workshopUpgrade} from '../src/progression/workshop.js';
import {MAINLINE_TASKS} from '../src/config/mainline.js';
import {mainlineCondition} from '../src/core/mainline-manager.js';
import {awardMainline} from '../src/progression/mainline-reward.js';
import {countCampActivity} from '../src/progression/camp-level.js';
import {seededRandom} from '../src/balance/model-metrics.js';
import {writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

// 入职实际采集288木材并扣除修屋和造枪；新方案36棵树不再赠送144金币。
export function openingAuditProgress(config=RECOMMENDED_ECONOMY){
 const p=bindEconomy(freshRangerProgress(),config),tree=forestReward('tree',0,p),trees=Math.ceil((RANGER.repairWood+RANGER.pistolWood)/tree.wood);
 p.coins=trees*tree.coins;p.wood=trees*tree.wood-RANGER.repairWood-RANGER.pistolWood;countCampActivity(p,'trees',trees);
 Object.assign(p.arrival,{phase:'complete',keys:true,wood:trees*tree.wood});
 p.weapons[RANGER.saw]=p.weapons[0]=1;p.weapon=0;p.vehicleHulls[RANGER.giftHull]=1;return p;
}
// 上一版正式方案在当前怪数下重放，避免拿旧36只开局与当前2只开局混比。
export function previousSourceConfig(){
 const c=structuredClone(RECOMMENDED_ECONOMY);c.id='before-source-split';c.tree.coins=4;c.enemy.woodRatio=.45;c.boss.wood=85;
 c.clearing={perKill:false,coins:[250,250,300,300,400],woodRatio:.4,attempts:[4,4,5,5,6],groupGrowth:.1,maxGrowth:2};
 for(const key of Object.keys(c.upgrades.ceilings))c.upgrades.ceilings[key]=450;
 return c;
}
// 每波结束按实际资源整备；只养教学要求的双5级与两项2级部件，不提前领取领主任务奖励。
export function auditOpening({config=RECOMMENDED_ECONOMY,efficiency=1,seed=1,collect=true,includeTasks=true,treeRate=60,movementShare=.22}={}){
 const p=openingAuditProgress(config),random=seededRandom(seed),initial={coins:p.coins,wood:p.wood};
 const sources={clearing:{coins:0,wood:0},tasks:{coins:0,wood:0},logging:{coins:0,wood:0}},events=[],waves=[];
 let seconds=0,kills=0,trees=0,loggingSeconds=0,firstAffordable=null;
 // 所有到账按来源归档，任务事务已经入账时不重复发放。
 function receive(source,reward,already=false){for(const key of ['coins','wood']){const n=reward[key]||0;sources[source][key]+=n;if(!already)p[key]+=n;}}
 // 教学行为按顺序发生且校验正式任务条件，不把奖励预支给此前消费。
 function claim(id){if(!includeTasks)return;const task=MAINLINE_TASKS.find(t=>t.id===id);if(!mainlineCondition({progress:p},task.goal))return;
  const reward=awardMainline(p,id);if(reward){seconds+=15+40/efficiency;receive('tasks',reward,true);events.push({type:'task',id,seconds,reward});}}
 // 木材不足时只砍够本次升级，金币不足不会靠伐木绕过；采集和移动都计入时钟。
 function buyUpgrade(kind,index,part=null){
  const level=part?p.weaponParts[index][part]||1:p[kind][index],cost=economyUpgradeCost(p,kind,index,level,part);
  if(p.coins<cost.coins)return false;
  if(p.wood<cost.wood){if(!collect)return false;const reward=forestReward('tree',0,p),n=Math.ceil((cost.wood-p.wood)/reward.wood);
   const duration=n/(treeRate*efficiency*(1-movementShare))*60;seconds+=duration;loggingSeconds+=duration;trees+=n;
   receive('logging',{coins:n*reward.coins,wood:n*reward.wood});countCampActivity(p,'trees',n);events.push({type:'logging',seconds,trees:n});}
  if(part){const q=quoteWorkshop(p,workshopUpgrade(p,kind,index,part));if(!q.ok)throw Error(q.reason);Object.assign(p,q.next);}
  else if(!transactProgress(p,kind,index,'upgrade'))throw Error('审计报价与正式扣费不一致');
  seconds+=15;firstAffordable??={kills,seconds};events.push({type:'upgrade',kind,index,part,from:level,to:level+1,cost,seconds});return true;
 }
 // 先完成主线手枪3/角色2及两部件，再均衡推进双5级；不追求同时升级所有装备。
 function upgrade(){
  if(includeTasks&&p.mainline.completed.length<3){
   for(const [kind,target] of [['weapons',3],['heroes',2]])while(p[kind][0]<target)if(!buyUpgrade(kind,0))return;
   claim('pistol-upgrade');
  }
  if(includeTasks&&p.mainline.completed.length===3){
   for(const part of ['capacity','reload'])if((p.weaponParts[0][part]||1)<2&&!buyUpgrade('weapons',0,part))return;
   p.mainline.seen.trial=1;seconds+=30;claim('pistol-parts');
  }
  while(p.weapons[0]<5||p.heroes[0]<5){const kind=p.weapons[0]<=p.heroes[0]?'weapons':'heroes';if(!buyUpgrade(kind,0))break;}
 }
 if(includeTasks){p.mainline.seen.map=1;p.mainline.distance=80;seconds+=30/efficiency;claim('first-map');}
 for(let wave=1;wave<=5;wave++){
  const count=waveDifficulty(wave).total,income={coins:0,wood:0,parts:0,crystal:0,core:0};seconds+=WAVE_WARNING_SECONDS+(wave>1?WAVE_REST_SECONDS:0);
  for(let i=0;i<count;i++){seconds+=60/(16*efficiency);kills++;const r=clearingKillReward(wave,i,p),mat=awardMaterials(p,{type:'enemy',rank:0,biome:'meadow'},random,r.attempts);
   receive('clearing',r);for(const key of Object.keys(income))income[key]+=r[key]||mat[key]||0;}
  if(wave===1){p.mainline.seen.wave=1;claim('first-patrol');}
  seconds+=40/efficiency;upgrade();
  const spent={coins:0,wood:0};for(const e of events.filter(e=>e.type==='upgrade'))for(const key of Object.keys(spent))spent[key]+=e.cost[key];
  waves.push({wave,count,kills,seconds,income,sources:structuredClone(sources),spent,balance:{coins:p.coins,wood:p.wood},trees,loggingSeconds,
   levels:{weapon:p.weapons[0],hero:p.heroes[0],capacity:p.weaponParts[0].capacity||1,reload:p.weaponParts[0].reload||1},tasks:p.mainline.completed.length});
 }
 return {options:{efficiency,seed,collect,includeTasks,treeRate,movementShare},initial,firstAffordable,waves,events};
}
// 报告保留不伐木卡住的对照与低效率路线；不将模型耗时冒充真人连续试玩。
export function openingEconomyReport(){
 const before=previousSourceConfig();return {version:2,assumptions:['使用当前2/4/6/8/10只配额，奖励逐只分配且不重复。','按正式前四项任务条件和真实升级扣费，未计领主、野外额外怪或秘境收入。','时间从入职完成算起：16击杀/分×效率、60棵树/分×效率×78%、每次施工15秒、回营40秒÷效率；是路线假设。','只升手枪与角色至5级，以及弹匣和装填各2级，余款完整保留。'],
  before:auditOpening({config:before}),after:auditOpening(),zeroLogging:auditOpening({collect:false}),withoutTasks:auditOpening({includeTasks:false}),
  efficiencies:[.65,1,1.35].map(efficiency=>auditOpening({efficiency}))};
}
// 默认报告写入输出目录，显式路径才保存到仓库。
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const path=resolve(process.argv[2]||'output/opening-economy-audit/report.json');await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(openingEconomyReport(),null,2)+'\n');console.log('前五波资源职责审计已生成：'+path);
}
