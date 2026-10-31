import {prepareBossNode} from './helpers/boss-node.mjs';
// 数值工具契约：候选隔离、真实交易、升级收益、时间预算、存档与报告可复现。
import test from 'node:test';
import assert from 'node:assert/strict';
import { RECOMMENDED_ECONOMY as C, ORIGINAL_ECONOMY, validateEconomy, bindEconomy, economyFor,
  economyUpgradeCost, challengeTier, requiredTier, weaponGrowth, heroHealth, RESOURCE_KEYS, forestReward } from '../src/config/economy.js';
import {MAINLINE_TASKS} from '../src/config/mainline.js';
import {clearingKillReward} from '../src/config/waves.js';
import { freshProgress, validateProgress } from '../src/progression/progress.js';
import { transactProgress } from '../src/progression/transactions.js';
import { transactVehicle } from '../src/progression/vehicles.js';
import { equipmentRecipe, equipmentRequirements } from '../src/progression/equipment-goals.js';
import { quoteWorkshop, workshopUpgrade } from '../src/progression/workshop.js';
import { realmReward } from '../src/config/realms.js';
import { expeditionEquipment } from '../src/config/expedition.js';
import { simulateEconomy, runBatch, summarize, reportCSV, validateScenario, growthCadence } from '../src/balance/model.js';
import { benchmarkGrowth } from '../src/balance/benchmark.js';
import { Game } from '../src/core/game.js';
import { recordEconomy, advanceLedger } from '../src/progression/economy-ledger.js';
import { awardMaterials } from '../src/progression/material-loot.js';

// 只提供测试所需资源，不影响游戏或模拟默认新档。
function funded(){const p=freshProgress();p.coins=p.wood=1000000;p.materials={parts:10000,crystal:10000,core:1000};p.mainline.completed=MAINLINE_TASKS.map(t=>t.id);p.mainline.phase='complete';p.restoration.repaired.push('garage');return p;}

test('配置往返严格校验，恶意/缺项/非有限数据不改变正式配置',()=>{
  assert.deepEqual(validateEconomy(JSON.parse(JSON.stringify(C))),C);
  for(const mutate of [v=>delete v.weapons,v=>v.weapons.splice(0,2),v=>v.drops.parts.chance=2,v=>v.drops.parts.pity=0,
    v=>v.enemy.coinScale=Infinity,v=>v.upgrades.catchup=-1,v=>v.challenges.realm=[5,5,10,20,40],v=>v.weapons[0].coins=.5]){
    const draft=structuredClone(C);mutate(draft);assert.throws(()=>validateEconomy(draft));
  }
  assert.throws(()=>validateEconomy({...C,unknown:1}));
  assert.ok(Object.isFrozen(C.weapons[0]));
});

test('候选报价与扣费同源，正式方案和玩家存档完全隔离',()=>{
  const config=structuredClone(C);config.upgrades.base.weapons=123;
  const p=bindEconomy(funded(),validateEconomy(config)),before=p.coins;
  const quote=quoteWorkshop(p,{kind:'weapons',index:0,action:'upgrade'});
  assert.equal(quote.rows.find(r=>r.key==='coins').need,123);
  assert.equal(economyFor(quote.next).upgrades.base.weapons,123);
  assert.equal(p.coins,before);assert.equal(quote.next.coins,before-123);
  assert.ok(transactProgress(p,'weapons',0,'upgrade'));assert.equal(p.coins,before-123);
  assert.equal(economyFor(freshProgress()),C);
  assert.ok(!JSON.stringify(p).includes('economyConfig'));
});

test('追赶30%按四类隔离，目标超过最高等级减二不打折，部件不打折',()=>{
  const p=funded();p.weapons[0]=10;p.weapons[3]=7;
  const discounted=economyUpgradeCost(p,'weapons',3,7),plain=economyUpgradeCost(freshProgress(),'weapons',3,7);
  assert.equal(discounted.coins,Math.ceil(plain.coins*.3));
  assert.deepEqual(economyUpgradeCost(p,'turret',3,7),economyUpgradeCost(freshProgress(),'turret',3,7));
  assert.deepEqual(economyUpgradeCost(p,'weapons',3,8),economyUpgradeCost(freshProgress(),'weapons',3,8));
  assert.deepEqual(economyUpgradeCost(p,'weapons',3,2,'rate'),economyUpgradeCost(freshProgress(),'weapons',3,2,'rate'));
  for(const [kind,field] of [['heroes','heroes'],['vehicle','vehicleHulls'],['turret','vehicleWeapons']]){
    const a=funded();a[field][0]=10;a[field][1]=7;
    assert.ok(economyUpgradeCost(a,kind,1,7).coins<economyUpgradeCost(freshProgress(),kind,1,7).coins);
  }
});

test('购买不再要求森林或秘境资格，营地经验独立于战绩且不被扣除',()=>{
 const p=funded();assert.ok(transactProgress(p,'weapons',12,'buy'));assert.equal(p.bosses,0);assert.equal(p.campLevel.xp,0);
 const f=funded();f.campLevel.xp=1800;assert.ok(transactVehicle(f,'vehicle',2,'buy'));assert.equal(f.campLevel.xp,1800);
});

test('每种完整配方恰好扣空，失败不污染账本或钱包',()=>{
  for(const [kind,count] of [['weapons',17],['turret',17],['vehicle',6]]){
    for(let index=kind==='turret'?0:1;index<count;index++){
      const p=funded(),r=equipmentRecipe(kind,index,p);if(kind==='vehicle')p.vehicleHulls[index]=0;
      Object.assign(p,{coins:r.coins,wood:r.wood,bosses:r.bosses});Object.assign(p.materials,{parts:r.parts,crystal:r.crystal,core:r.core});
      const fn=kind==='weapons'?transactProgress:transactVehicle;
      const original=JSON.stringify(p);p.coins--;const poor=JSON.stringify(p);
      assert.equal(fn(p,kind,index,'buy'),false);assert.equal(JSON.stringify(p),poor);p.coins++;
      assert.equal(JSON.stringify(p),original);assert.ok(fn(p,kind,index,'buy'));
      for(const k of RESOURCE_KEYS)assert.equal(k==='coins'||k==='wood'?p[k]:p.materials[k],0);
      assert.equal(equipmentRequirements(p,kind,index).find(r=>r.key==='bosses')?.missing||0,0);
    }
  }
});

test('关键等级25%且后期8%，角色生存提升；远征百级保持原线性曲线',()=>{
  const p=freshProgress();
  for(const level of [5,10,15,20])assert.ok(Math.abs(weaponGrowth(level,p)/weaponGrowth(level-1,p)-1.25)<1e-10);
  assert.ok(Math.abs(weaponGrowth(19,p)/weaponGrowth(18,p)-1.08)<1e-10);
  assert.ok(heroHealth(120,5,p)>heroHealth(120,4,p)*1.19);
  const local=expeditionEquipment(p,{weapon:0,vehicle:0,turret:0,modules:[0,0,0]},100);
  assert.equal(weaponGrowth(100,local),1+99*.22);assert.equal(p.weapons[0],1);
});

test('旧档库存与等级不变，账本往返不扩字段，事件限额不丢累计总额',()=>{
  const p=funded();p.weapons[3]=8;p.heroes[0]=7;
  for(let i=0;i<700;i++){advanceLedger(p,61,'forest');recordEconomy(p,'income','forest:enemy',{coins:20,wood:9});}
  assert.equal(p.economyLog.events.length,600);assert.equal(p.economyLog.income['forest:enemy:coins'],14000);
  const restored=validateProgress(JSON.parse(JSON.stringify(p)));assert.deepEqual(restored,p);
  delete p.economyLog;const legacy=validateProgress(p);assert.equal(legacy.coins,p.coins);assert.equal(legacy.weapons[3],8);
});

test('重复秘境奖励规则与森林重复致命命中保护保持，挑战快照不被新难度覆盖',()=>{
  assert.equal(realmReward('tower',5,0).core,1);assert.equal(realmReward('tower',5,5).core,0);
  assert.equal(realmReward('rogue',5,5).core,1);
  const g=new Game(freshProgress(),()=>.5);g.start();g.enemies=[];g.trees=[];
  const e=g.spawnEnemy(0,100);e.reward=15;const before=g.progress.coins;
  g.hit(e,1e6);g.hit(e,1e6);assert.equal(g.progress.coins-before,clearingKillReward(1,0,g.progress).coins);
  g.progress.bosses=20;g.kills=12;g.waveWarning=0;g.player.x=1600;g.player.y=400;prepareBossNode(g);g.progress.living.patrolActive=true;Object.assign(g.player,{x:1600,y:400});assert.ok(g.summonBoss());const snapshot=structuredClone(g.progress.bossChallenge);
  assert.ok(snapshot.maxHp>850);g.boss=null;g.wave=99;prepareBossNode(g);g.progress.living.patrolActive=true;Object.assign(g.player,{x:1600,y:400});assert.ok(g.summonBoss());assert.deepEqual(g.progress.bossChallenge,snapshot);
});

test('时间预算互斥、每种资源守恒、固定种子复现、原版与推荐可同进程对比',()=>{
  for(const config of [ORIGINAL_ECONOMY,C]){
    const s=simulateEconomy(7,config,{minutes:60});
    assert.deepEqual(s,simulateEconomy(7,config,{minutes:60}));
    assert.ok(Math.abs(Object.values(s.activityTimes).reduce((a,b)=>a+b,0)-3600)<1e-7);
    for(const k of RESOURCE_KEYS)assert.equal(s.initial[k]+(s.totals.income[k]||0)-(s.totals.expense[k]||0),s.remaining[k]);
    assert.ok(s.activityTimes.logging>=0);assert.ok(s.upgrades>0);assert.ok(s.milestones.camp.xp>0&&s.milestones.camp.xp<=10800);
  }
  assert.throws(()=>validateScenario({weights:{forest:0,rogue:0,tower:0,guardian:0,logging:0}}));
  const summary=summarize([{completionMinute:10,completed:true,longestGap:1},{completionMinute:null,completed:false,longestGap:2}]);
  assert.equal(summary.p90,null);assert.equal(summary.incomplete,1);
});

test('100组标准少量采集完整路线P50在8–12小时，失败样本与CSV完整保留',()=>{
  const r=runBatch();assert.equal(r.results.length,100);
  assert.ok(r.summary.p50>=480&&r.summary.p50<=720,JSON.stringify(r.summary));
  assert.equal(r.summary.completed,100);
  assert.equal(r.summary.lateSamples,100);
  assert.equal(r.summary.lateGapOver12,0,JSON.stringify(r.summary));
  assert.ok(r.summary.longestLateGap<=12);
  assert.ok(r.representative.timeline.some(e=>e.type==='upgrade'));
  assert.equal(reportCSV(r).split('\r\n').length,101);
});

test('低效率少量采集100种子在25小时观察窗内完成，后期最坏空档不超过12分钟',()=>{
  const r=runBatch(C,{efficiency:.65,minutes:1500});
  assert.equal(r.summary.completed,100,JSON.stringify(r.summary));
  assert.ok(r.summary.p50<1200);assert.equal(r.summary.lateGapOver12,0,JSON.stringify(r.summary));
  assert.equal(r.results.length,100);assert.ok(r.representative.activityTimes.logging>0);
});

test('费用封顶先于同类追赶，部件报价提交一致，旧版候选迁移不改变价格',()=>{
  const c=structuredClone(C);for(const key of Object.keys(c.upgrades.ceilings))c.upgrades.ceilings[key]=450;
  const p=bindEconomy(funded(),c);p.weapons[0]=20;p.weapons[3]=14;
  assert.deepEqual(economyUpgradeCost(p,'weapons',3,14),{coins:135,wood:30});
  assert.deepEqual(economyUpgradeCost(p,'vehicle',1,19),{coins:450,wood:113});
  c.upgrades.base.part=100;p.weaponParts[3].rate=4;
  const q=quoteWorkshop(p,workshopUpgrade(p,'weapons',3,'rate'));
  assert.equal(q.rows.find(r=>r.key==='coins').need,450);assert.equal(q.next.coins,p.coins-450);
  assert.equal(q.next.weaponParts[3].rate,5);
  const old=structuredClone(C);old.version=1;delete old.upgrades.woodCeilings;delete old.upgrades.ceilings;delete old.clearing;delete old.taskRewards;
  const migrated=validateEconomy(old);assert.equal(migrated.version,4);
  assert.ok(economyUpgradeCost(bindEconomy(funded(),migrated),'vehicle',1,19).coins>450);
  for(const cap of [0,-1,1.5,Infinity]){const invalid=structuredClone(C);invalid.upgrades.ceilings.vehicle=cap;assert.throws(()=>validateEconomy(invalid));}
  const malformed=structuredClone(C);delete malformed.upgrades.ceilings;assert.throws(()=>validateEconomy(malformed));
});

test('后期指标包含跨180分钟边界、未完成尾段及零成长的长空档',()=>{
  const a=growthCadence([{minute:175},{minute:194}],210);
  assert.equal(a.late.max,16);assert.deepEqual(a.late.worst,{start:194,end:210,minutes:16});
  assert.equal(growthCadence([],240).late.max,60);
  assert.equal(growthCadence([{minute:20}],60).late.max,null);
  const s=summarize([{completionMinute:null,completed:false,longestGap:240,cadence:growthCadence([],240)}]);
  assert.equal(s.lateGapOver12,1);assert.equal(s.p50,null);
});

test('短途秘境逐关结算、返回才交易、退出后重开，所有耗时仍守恒',()=>{
  const initial=funded();initial.coins=initial.wood=0;initial.weapons[3]=1;initial.weapon=3;const r=simulateEconomy(8,C,{initial,route:[['weapons',3]],minutes:90,weights:{forest:.1,rogue:.9,tower:0,guardian:0,logging:0}});
  assert.ok(r.outings.length>3);assert.ok(r.outings.some(o=>o.cleared>1));
  for(const o of r.outings){
    assert.ok(o.end-o.start<=7,'开下一关之前返回，而非截断战斗');
    assert.ok(!r.timeline.some(e=>e.minute>o.start&&e.minute<o.end),'秘境中不能永久升级');
  }
  assert.ok(Math.abs(Object.values(r.activityTimes).reduce((a,b)=>a+b,0)-5400)<1e-7);
  assert.ok(r.milestones.records.rogue.best<10,'退出后不能保留关卡刷最高进度');
  for(const invalid of [{workshopMinutes:0},{expeditionMinutes:-1},{expeditionMinutes:Infinity}])assert.throws(()=>validateScenario(invalid));
});

test('正式靶场关键升级提高领主耐久靶有效输出，不用面板DPS替代',()=>{
  const result=benchmarkGrowth(C,0,4),boss=result.results.find(r=>r.id==='boss');
  assert.ok(boss.after.effectiveDps>boss.before.effectiveDps*1.15);
  assert.ok(result.results.find(r=>r.id==='group').before.kills>2);
});

test('可调炮塔配方独立生效，原版部件费用不随车型翻倍，满仓只记录实收材料',()=>{
  const c=structuredClone(C);Object.assign(c.turrets[0],{coins:7,wood:3,parts:0});
  const p=bindEconomy(freshProgress(),validateEconomy(c));p.coins=p.wood=10;
  assert.equal(transactVehicle(p,'turret',0,'buy'),true);assert.equal(p.coins,3);
  assert.deepEqual(economyUpgradeCost(bindEconomy(freshProgress(),ORIGINAL_ECONOMY),'vehicle',1,2,'engine'),{coins:70,wood:30});
  p.materials={parts:9999999,crystal:9999999,core:9999999};
  assert.deepEqual(awardMaterials(p,{type:'boss',kind:'test'},()=>0),{parts:0,crystal:0,core:0});
  assert.throws(()=>validateScenario({priority:['weapons','weapons','turret','vehicle']}));
  p.realms.records.football.best=40;assert.equal(challengeTier(p),0,'球赛分数不是秘境通关层数');
});
