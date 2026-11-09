// 资源分工专项：按正式2/4/6/8/10配额、当前入职成本和完整教学支出验收。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshRangerProgress} from '../src/progression/progress.js';
import {RANGER} from '../src/config/ranger-arrival.js';
import {skipArrivalJourney} from '../src/core/camp/ranger-arrival.js';
import {WORKSHOP} from '../src/world/workshop.js';
import {BOSS_CLEARING} from '../src/config/settlements.js';
import {waveDifficulty} from '../src/config/waves.js';
import {RECOMMENDED_ECONOMY as C,forestReward,economyUpgradeCost,bindEconomy,validateEconomy} from '../src/config/economy.js';
import {auditOpening,openingAuditProgress,previousSourceConfig} from '../scripts/opening-economy-audit.mjs';
// 入职施工使用正式时间步，不改余额或跳过扣费。
function tick(g,seconds){for(let i=0;i<Math.ceil(seconds/.05);i++)g.update(.05);}

test('入职36棵树只给288木材，修屋造枪后0金币0木材',()=>{
 const g=new Game(freshRangerProgress(),()=>.5);g.start();skipArrivalJourney(g);g.attackTimer=999;
 for(const tree of g.trees.filter(t=>t.hp>0).slice(0,36))g.hit(tree,1e9,false,{weaponIndex:RANGER.saw});
 assert.deepEqual([g.progress.coins,g.progress.wood],[0,288]);
 Object.assign(g.player,{x:WORKSHOP.x,y:WORKSHOP.y+25});assert.ok(g.advanceArrival());tick(g,RANGER.rebuildSeconds+.1);assert.ok(g.advanceArrival());tick(g,RANGER.workSeconds+.1);
 assert.equal(g.progress.arrival.phase,'complete');const p=openingAuditProgress();
 for(const key of ['coins','wood','weapons','heroes','vehicleHulls','vehicleWeapons'])assert.deepEqual(g.progress[key],p[key]);
});

test('第一波每只28金币且不掉木材，重复命中不会重复领取',()=>{
 const g=new Game(openingAuditProgress(),()=>.5);g.start();g.progress.living.patrolActive=true;g.waveWarning=0;g.attackTimer=999;Object.assign(g.player,BOSS_CLEARING);
 for(let i=0;i<waveDifficulty(1).total;i++){const e=g.spawnEnemy(0,100);g.hit(e,1e9);g.hit(e,1e9);assert.deepEqual([g.progress.coins,g.progress.wood],[(i+1)*28,0]);}
 assert.equal(g.waveKills,2);assert.deepEqual(forestReward('enemy',15,g.progress),{coins:21,wood:0});assert.deepEqual(forestReward('boss',0,g.progress),{coins:180,wood:0});
});

test('首轮840金币与教学420金币覆盖双5级和两部件，额外40棵树后仅余60金币6木材',()=>{
 const r=auditOpening(),last=r.waves.at(-1);
 assert.deepEqual(r.waves.map(w=>w.count),[2,4,6,8,10]);assert.deepEqual(r.waves.map(w=>w.income.coins),[56,112,168,224,280]);assert.ok(r.waves.every(w=>w.income.wood===0));
 assert.deepEqual(last.levels,{weapon:5,hero:5,capacity:2,reload:2});assert.deepEqual(last.spent,{coins:1200,wood:484});assert.deepEqual(last.balance,{coins:60,wood:6});assert.equal(last.trees,40);
 for(const row of r.waves)for(const key of ['coins','wood'])assert.equal(r.initial[key]+Object.values(row.sources).reduce((n,s)=>n+s[key],0)-row.spent[key],row.balance[key]);
 assert.deepEqual(economyUpgradeCost(openingAuditProgress(),'weapons',0,1),{coins:35,wood:14});
});

test('低效率不减少奖励；不采集的纯森林路线明确报告木材卡点',()=>{
 for(const efficiency of [.65,1,1.35]){const r=auditOpening({efficiency}),last=r.waves.at(-1);assert.deepEqual(last.balance,{coins:60,wood:6});assert.equal(last.trees,40);}
 assert.ok(auditOpening({efficiency:.65}).waves.at(-1).seconds>auditOpening().waves.at(-1).seconds);
 const zero=auditOpening({collect:false}).waves.at(-1);assert.equal(zero.tasks,2);assert.deepEqual(zero.balance,{coins:872,wood:8});assert.equal(zero.levels.hero,1);
});

test('独立金币上限保留手持与角色前五级价格，各类木材费用不变',()=>{
 for(const [kind,field] of [['weapons','weapons'],['heroes','heroes'],['vehicle','vehicleHulls'],['turret','vehicleWeapons']]){
  const p=openingAuditProgress(),old=openingAuditProgress(previousSourceConfig());p[field][0]=old[field][0]=20;
  for(let level=1;level<20;level++)for(const part of [null,'rate']){
   const next=economyUpgradeCost(p,kind,1,level,part),before=economyUpgradeCost(old,kind,1,level,part);
   assert.equal(next.wood,before.wood);if(level<5&&!part&&['weapons','heroes'].includes(kind))assert.deepEqual(next,before);
  }
 }
 const c=structuredClone(C);c.upgrades.woodCeilings.weapons=0;assert.throws(()=>validateEconomy(c));
});

test('版本3整波预算和旧木材规则导入保留，版本4严格校验单怪模式',()=>{
 const old=previousSourceConfig();old.version=3;delete old.clearing.perKill;delete old.upgrades.woodCeilings;
 const restored=validateEconomy(old);assert.equal(restored.version,4);assert.equal(restored.clearing.perKill,false);assert.equal(restored.tree.coins,4);assert.deepEqual(restored.clearing.coins,[250,250,300,300,400]);
 const invalid=structuredClone(C);invalid.clearing.perKill=1;assert.throws(()=>validateEconomy(invalid));
 assert.deepEqual(validateEconomy(JSON.parse(JSON.stringify(C))),C);
});
