// 当前任务与清缴合同回归：共享奖励、引导入口、存档兼容及真实交易的模拟守恒。
import {Game} from '../src/core/game.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {MAINLINE_TASKS,MAINLINE_IDS,MAINLINE_SITES} from '../src/config/mainline.js';
import {RECOMMENDED_ECONOMY as C,bindEconomy,validateEconomy,mainlineReward,RESOURCE_KEYS} from '../src/config/economy.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {awardMainline} from '../src/progression/mainline-reward.js';
import {completeMainline,mainlineCondition,mainlineOperation,mainlineAction,mainlineObjective} from '../src/core/mainline-manager.js';
import {nativeVehicleWeapon,grantVehicleArmament} from '../src/config/vehicle-armaments.js';
import {simulateEconomy} from '../src/balance/model.js';
// 仅将夹具放到指定任务，目标条件仍须真实满足。
function atTask(id){const p=freshProgress();p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf(id));p.mainline.phase='doing';return {progress:p};}

test('任务奖励候选共用且顺序防重，满仓只记实际收到的资源',()=>{
 const candidate=structuredClone(C);candidate.taskRewards['first-map'].coins=99;
 const p=bindEconomy(freshProgress(),validateEconomy(candidate)),before=p.coins;
 assert.equal(awardMainline(p,'first-patrol'),null);assert.equal(p.coins,before);
 assert.equal(mainlineReward(MAINLINE_TASKS[0],p).coins,99);
 assert.equal(awardMainline(p,'first-map').coins,99);assert.equal(p.coins,before+99);
 assert.equal(awardMainline(p,'first-map'),null);assert.equal(p.coins,before+99);
 p.coins=99989999;assert.equal(awardMainline(p,'first-patrol').coins,1);
 assert.equal(p.economyLog.income['mainline:first-patrol:coins'],1);
 assert.equal(C.taskRewards['first-map'].coins,60);
});

test('新预算必须完整且非负整数，旧候选迁移明确补当前预算',()=>{
 const old=structuredClone(C);old.version=2;delete old.upgrades.woodCeilings;delete old.clearing;delete old.taskRewards;
 assert.deepEqual(validateEconomy(old).clearing,C.clearing);
 for(const change of [v=>v.clearing.coins.pop(),v=>v.clearing.attempts[0]=.5,v=>v.clearing.maxGrowth=.5,v=>v.taskRewards['first-map'].wood=-1,v=>delete v.taskRewards['first-map']]){
  const c=structuredClone(C);change(c);assert.throws(()=>validateEconomy(c));
 }
});

test('已接清缴时仍能进入新增武器和角色升级步骤，主力达标才引导领主',()=>{
 const g=atTask('first-boss');g.progress.living.patrolActive=true;
 assert.equal(mainlineAction(g).kind,'weapons');assert.equal(mainlineObjective(g).key,'weaponsEntry');
 g.progress.weapons[3]=5;g.progress.weapon=3;
 assert.equal(mainlineAction(g).id,'heroes-button');
 g.progress.heroes[0]=5;g.progress.bosses=1;
 assert.equal(mainlineCondition(g,MAINLINE_TASKS.find(t=>t.id==='first-boss').goal),true);
});

test('末段车炮按所拥有车体引导，不能用手持所有权误选载具',()=>{
 const g=atTask('long-patrol');g.progress.vehicleHulls[0]=0;g.progress.vehicleHulls[2]=1;g.progress.vehicleIndex=2;grantVehicleArmament(g.progress,2);
 const operation=mainlineOperation(g);assert.equal(operation.kind,'vehicle');assert.equal(operation.native,true);assert.equal(operation.index,2);
 assert.deepEqual(operation.indices,[2]);
 g.progress.vehicleWeapons[nativeVehicleWeapon(2).weaponIndex]=12;
 assert.equal(mainlineAction(g).id,'heroes-button');
});

test('新任务门槛保留已完成前缀与原有资产，存档迁移不补发或追扣',()=>{
 const p=freshProgress();p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.weapons[3]=2;p.coins=123;p.materials.core=7;
 const restored=validateProgress(JSON.parse(JSON.stringify(p)));
 assert.deepEqual(restored.mainline.completed,MAINLINE_IDS);assert.equal(restored.weapons[3],2);assert.equal(restored.coins,123);assert.equal(restored.materials.core,7);
 assert.equal(awardMainline(restored,'long-patrol'),null);
});

test('当前任务模拟逐笔消费、五波才出领主，超时和失败仍占完整预算',()=>{
 const r=simulateEconomy(1,C,{minutes:40});
 assert.equal(r.activityTimes.logging,0);assert.ok(r.activityTimes.task>0&&r.activityTimes.workshop>0&&r.activityTimes.travel>0);
 assert.ok(Math.abs(Object.values(r.activityTimes).reduce((a,b)=>a+b)-2400)<1e-7);
 for(const k of RESOURCE_KEYS)assert.equal(r.initial[k]+(r.totals.income[k]||0)-(r.totals.expense[k]||0),r.remaining[k]);
 assert.ok(r.firstUpgrade<=6);assert.equal(r.completed,false);assert.equal(r.completionMinute,null);
 const boss=r.taskTimeline.find(t=>t.id==='first-boss');assert.ok(boss);
 for(const kind of ['weapons','heroes'])assert.ok(r.timeline.some(t=>t.kind===kind&&t.type==='upgrade'&&t.level===5&&t.minute<boss.minute));
 const bought=r.timeline.find(t=>t.kind==='weapons'&&t.index===3&&t.type==='buy');assert.ok(bought.minute>boss.minute);
 assert.ok(r.milestones.wave>=r.milestones.bosses*5);
 assert.equal(new Set(r.taskTimeline.map(t=>t.id)).size,r.taskTimeline.length);
});

// 正式交付会克隆存档，仍须保留候选配置绑定，保存失败不能污染原钱包。
test('正式交付的展示、候选副本与最终到账使用同一配置',()=>{
 const c=structuredClone(C);c.taskRewards['first-map'].coins=99;
 const g=new Game(freshProgress(),()=>.5);bindEconomy(g.progress,validateEconomy(c));g.start();
 g.progress.mainline.seen.map=1;g.progress.mainline.distance=200;g.progress.mainline.phase='report';
 Object.assign(g.player,MAINLINE_SITES.camp);const before=g.progress.coins;
 g.mainlinePersist=()=>false;assert.equal(completeMainline(g),false);assert.equal(g.progress.coins,before);
 g.mainlinePersist=()=>true;assert.equal(completeMainline(g),true);assert.equal(g.progress.coins,before+99);
});
