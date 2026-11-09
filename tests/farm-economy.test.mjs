// 世界农田回归：动作队列、坐标迁移、礼物种子、快递结算和既有奖励保留。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshProgress,freshRangerProgress,validateProgress} from '../src/progression/progress.js';
import {farmAction,setFarmTool,queueFarmWork,updateFarmWork,FARM_ACTION_TIMING} from '../src/core/farming/farm.js';
import {updateFarmDelivery,claimFarmParcel} from '../src/core/farming/farm-delivery.js';
import {farmGrowth,validateFarm,farmLesson} from '../src/progression/farming/farm.js';
import {farmApproach,farmLandReason,farmCovers} from '../src/world/farm-land.js';
import {FARM_CROPS,FARM_DELIVERY,farmCell} from '../src/config/farm.js';
import {WORLD} from '../src/world/coordinates.js';
import {RESOURCE_CAP} from '../src/config/resource-limits.js';
import {creditResource} from '../src/progression/economy/resource-wallet.js';
import {awardMainline} from '../src/progression/story/mainline-reward.js';
import {forestReward,mainlineReward,RECOMMENDED_ECONOMY} from '../src/config/economy.js';
import {MAINLINE_TASKS} from '../src/config/mainline.js';
import {clearingWaveBudget} from '../src/config/waves.js';
import {realmReward} from '../src/config/realms.js';
import {footballReward} from '../src/config/slime-football.js';
import {CAMP_DEFENSE} from '../src/config/camp-defense.js';
import {STORY_CAMPAIGN} from '../src/config/story-campaign.js';
import {STORY_POSTS} from '../src/config/story-posts.js';
import {debugGrantProgress} from '../src/progression/player/debug-grants.js';
import {simulateEconomy} from '../src/balance/model.js';
// 事务夹具使用道路东侧草地；旧版坐标迁移仍保留原farmCell目录。
function safeCell(){return {...farmCell(0),x:1005};}
// 可落脚的正式营地坐标用于基础事务，保存接口可替换为失败夹具。
function scene(){const progress=freshRangerProgress();progress.farm.seeds[0]=1;return {state:'playing',mapId:'forest',player:{...safeCell(),mapId:'forest',hp:100},trees:[],progress,onEvent:()=>{},livingPersist:()=>true,random:()=>.5};}
// 手动定位只用于事务单元测试，实际行走另由浏览器验证。
function dig(g,cell=safeCell()){g.player={...g.player,...cell};return farmAction(g,'dig',{point:{...cell,mapId:g.mapId}});}
// 将排队目标置于真实可站立操作位，按正常小步推进动作时钟。
function finishJob(g){const j=g.farmWork.job||g.farmWork.queue[0];Object.assign(g.player,farmApproach(g,j.point));for(let n=0;n<30&&(g.farmWork.job||g.farmWork.queue.length);n++)updateFarmWork(g,.05,{x:0,y:0});}
test('开地到收获闭环，动作命中前不结算，首次任务种子只发一次',()=>{
 const g=scene();setFarmTool(g,'hoe');queueFarmWork(g,'dig',{point:safeCell()});assert.equal(g.progress.farm.plots.length,0);finishJob(g);assert.equal(g.progress.farm.plots.length,1);
 queueFarmWork(g,'plant',{plot:0,crop:0});assert.equal(g.progress.farm.plots[0].crop,null);finishJob(g);assert.equal(g.progress.farm.plots[0].crop,0);
 const p=g.progress.farm.plots[0];p.plantedAt-=61000;p.readyAt-=61000;queueFarmWork(g,'harvest',{plot:0});assert.equal(g.progress.coins,0);
 updateFarmWork(g,.1,{x:0,y:0});assert.equal(g.progress.coins,0);finishJob(g);assert.equal(g.progress.coins,30);assert.equal(g.progress.farm.seeds[1],2);assert.ok(farmLesson(g.progress.farm).every(s=>s.done));
 assert.equal(farmAction(g,'harvest',{plot:0}).ok,false);assert.equal(g.progress.farm.seeds[1],2);assert.equal(g.farmSignals.filter(s=>s.action==='harvest').length,1);
});
test('远处播种和收割必须先走近，拖动排队不预扣费，手动移动取消待办',()=>{
 const g=scene();dig(g);g.progress.farm.xp=40;g.progress.coins=200;g.player.x-=250;setFarmTool(g,'seed');
 assert.equal(farmAction(g,'plant',{plot:0,crop:1}).ok,false);queueFarmWork(g,'plant',{plot:0,crop:1});queueFarmWork(g,'plant',{plot:0,crop:1});assert.equal(g.farmWork.queue.length,1);assert.equal(g.progress.coins,200);
 const move=updateFarmWork(g,.05,{x:0,y:0});assert.ok(Math.hypot(move.x,move.y)>0);assert.equal(g.progress.coins,200);
 updateFarmWork(g,.05,{x:1,y:0});assert.equal(g.farmWork.job,null);assert.equal(g.farmWork.queue.length,0);assert.equal(g.progress.coins,200);
});
test('世界坐标永久保存，跨接缝选择最近操作位，旧田不重置',()=>{
 const g=scene();const raw=g.progress;raw.farm={version:2,xp:35,harvested:1,inventory:[2],plots:[{id:7,crop:0,plantedAt:1000,readyAt:61000}]};g.progress=validateProgress(raw);
 assert.equal(g.progress.farm.version,6);assert.equal(g.progress.farm.plots[0].x,farmCell(7).x);assert.equal(g.progress.farm.inventory[0],2);assert.ok(g.progress.farm.lessonRewarded);
 const p=g.progress.farm.plots[0];g.player={...g.player,x:p.x+WORLD.width,y:p.y+38+WORLD.height};setFarmTool(g,'harvest');queueFarmWork(g,'harvest',{plot:7});finishJob(g);assert.equal(g.progress.coins,30);
 const saved=validateProgress(structuredClone(g.progress));assert.equal(saved.farm.plots[0].id,7);assert.equal(saved.farm.plots[0].crop,null);assert.equal(saved.farm.nextId,8);
});
test('种子礼物优先消耗，未解锁品种可用库存试种，耗尽后必须先补充库存',()=>{
 const g=scene();dig(g);g.progress.farm.seeds[7]=1;assert.ok(farmAction(g,'plant',{plot:0,crop:7}).ok);assert.equal(g.progress.coins,0);assert.equal(g.progress.farm.seeds[7],0);
 const p=g.progress.farm.plots[0];p.readyAt=0;p.plantedAt=0;assert.equal(farmAction(g,'harvest',{plot:0}).coins,FARM_CROPS[7].value);
 assert.equal(farmAction(g,'plant',{plot:0,crop:7}).ok,false);
});
test('保存失败保留种子、土地、作物和钱包，满钱包不吞收成',()=>{
 const g=scene();dig(g);g.progress.farm.seeds[1]=2;g.livingPersist=()=>false;const before=structuredClone(g.progress);
 assert.equal(farmAction(g,'plant',{plot:0,crop:1}).ok,false);assert.deepEqual(g.progress,before);
 assert.equal(dig(g,farmCell(1)).ok,false);assert.deepEqual(g.progress,before);
 g.livingPersist=()=>true;g.player=safeCell();farmAction(g,'plant',{plot:0,crop:0,now:1000});g.progress.coins=RESOURCE_CAP-(FARM_CROPS[0].value-1);const grown=structuredClone(g.progress);
 assert.equal(farmAction(g,'harvest',{plot:0,now:61000}).ok,false);assert.deepEqual(g.progress,grown);
 g.progress.coins=0;g.livingPersist=()=>{throw Error('无法存储');};assert.equal(farmAction(g,'harvest',{plot:0,now:61000}).ok,false);assert.equal(g.progress.coins,0);assert.equal(g.progress.farm.plots[0].crop,0);
});
test('野外有树先清理，既有田块禁止重叠，再生树木尊重已开垦土地',()=>{
 const g=scene(),point={...safeCell(),mapId:'forest'};g.trees=[{...point,id:4,type:'tree',hp:60,radius:14}];assert.match(farmLandReason(g,point),/电锯/);
 let hits=0;g.hit=(tree,damage)=>{tree.hp-=damage;hits++;};setFarmTool(g,'saw');queueFarmWork(g,'saw',{tree:g.trees[0]});finishJob(g);assert.equal(hits,1);assert.ok(g.trees[0].hp<=0);
 assert.ok(dig(g).ok);assert.ok(farmCovers(g,point));assert.match(farmLandReason(g,point),/已有田块/);
});
test('不定期快递先保存后通知，离线只补一封，领取不可重复',()=>{
 const g=scene();updateFarmDelivery(g,1000);assert.equal(g.progress.farm.delivery.nextAt,31000);
 updateFarmDelivery(g,31000);assert.equal(g.progress.farm.delivery.parcels.length,1);const parcel={...g.progress.farm.delivery.parcels[0]},nextAt=g.progress.farm.delivery.nextAt;
 updateFarmDelivery(g,31000);assert.equal(g.progress.farm.delivery.parcels.length,1);assert.ok(nextAt>=151000&&nextAt<=331000);
 assert.equal(claimFarmParcel(g,parcel.id).ok,false);g.player={...FARM_DELIVERY};g.livingPersist=()=>false;assert.equal(claimFarmParcel(g,parcel.id).ok,false);assert.equal(g.progress.farm.delivery.parcels.length,1);
 const before=g.progress.farm.seeds[parcel.crop];g.livingPersist=()=>true;assert.ok(claimFarmParcel(g,parcel.id).ok);assert.equal(g.progress.farm.seeds[parcel.crop],before+parcel.count);assert.equal(claimFarmParcel(g,parcel.id).ok,false);
 updateFarmDelivery(g,999999999);assert.equal(g.progress.farm.delivery.parcels.length,1);assert.equal(g.progress.farm.delivery.claimed,1);
});
test('快递存储失败不创建包裹，库存上限保留包裹，非法存档安全归一',()=>{
 const g=scene();g.progress.farm.delivery.nextAt=1;g.livingPersist=()=>false;updateFarmDelivery(g,1000);assert.equal(g.progress.farm.delivery.parcels.length,0);
 g.livingPersist=()=>true;updateFarmDelivery(g,7000);const p=g.progress.farm.delivery.parcels[0];g.player={...FARM_DELIVERY};g.progress.farm.seeds[p.crop]=999999;assert.equal(claimFarmParcel(g,p.id).ok,false);assert.equal(g.progress.farm.delivery.parcels.length,1);
 const raw=validateFarm({version:3,plots:[{id:0,x:NaN,y:0,mapId:'forest'}],seeds:[Infinity,-9],delivery:{parcels:[{id:1,crop:99,count:5},{id:1e8,crop:0,count:2},{id:2,crop:0,count:.5},{id:3,crop:0,count:Infinity}]}});assert.equal(raw.plots.length,0);assert.equal(raw.delivery.parcels.length,0);assert.ok(raw.seeds.every(n=>n===0));
});
test('只有怪物金币取消，任务、娱乐与采集奖励保持原值',()=>{
 const p=freshProgress();const before=p.coins;assert.equal(creditResource(p,'coins',999),999);assert.equal(p.coins,before+999);assert.equal(creditResource(p,'wood',8),8);assert.equal(creditResource(p,'parts',2),2);
 assert.equal(debugGrantProgress(p,'resources').coins,p.coins+9999);
 for(const kind of ['tree','enemy','boss'])assert.equal(forestReward(kind,100,p).coins,0);
 for(const wave of [1,5,6,50])assert.equal(clearingWaveBudget(wave,p).coins,0);
 for(const mode of ['rogue','tower','guardian']){assert.ok(realmReward(mode,10,0,p).coins>0);assert.ok(realmReward(mode,10,0,p).wood>0);}
 assert.equal(footballReward(10).coins,80);assert.equal(footballReward(10).wood,30);
 for(const r of Object.values(CAMP_DEFENSE.grades)){assert.ok(r.coins>0);assert.ok(r.wood>0);}
 assert.ok(MAINLINE_TASKS.some(t=>mainlineReward(t,p).coins>0));
 p.coins=0;const task=MAINLINE_TASKS[0],reward=awardMainline(p,task.id);assert.ok(reward.coins>0);assert.equal(p.coins,reward.coins);assert.equal(awardMainline(p,task.id),null);assert.equal(p.coins,reward.coins);
 assert.ok(Object.values(STORY_CAMPAIGN).some(c=>c.reward.coins>0));
 assert.ok(STORY_POSTS.some(post=>post.collection.duplicateCoins>0));
});
test('经济模拟使用真实农田结算，怪物不产金币且总账守恒',()=>{
 const r=simulateEconomy(1,RECOMMENDED_ECONOMY,{minutes:20});
 assert.ok(r.sources.farm.coins>0);assert.ok(r.activityTimes.farm>0);
 assert.equal(r.totals.income.coins,Object.values(r.sources).reduce((sum,r)=>sum+(r.coins||0),0));
 assert.equal(r.sources.forest?.coins||0,0);
 assert.equal(r.remaining.coins,r.initial.coins+r.totals.income.coins-(r.totals.expense.coins||0));
});
