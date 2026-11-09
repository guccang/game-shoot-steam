// 经济审计专项：核对真实报价、任务前缀和失败样本，避免用静态奖励总额冒充通关模拟。
import test from 'node:test';
import assert from 'node:assert/strict';
import {staticAudit,upgradeBudget,sumResources,summarizeSamples} from '../scripts/task-economy-audit.mjs';
import {sampleClearing} from '../scripts/clearing-timing.mjs';
import {openingAuditProgress} from '../scripts/opening-economy-audit.mjs';
import {transactProgress} from '../src/progression/economy/transactions.js';
import {transactVehicle} from '../src/progression/vehicles/vehicles.js';
import {MAINLINE_TASKS} from '../src/config/mainline.js';
import {nativeVehicleWeapon} from '../src/config/vehicle-armaments.js';

test('任务每步最低消费由事务核算，前缀守恒且赠礼不重复算现金',()=>{
 const a=staticAudit(),rows=a.tasks.events;
 assert.equal(rows.length,MAINLINE_TASKS.length);
 for(let i=0;i<rows.length;i++){
  assert.deepEqual(rows[i].cumulativeCost,sumResources(rows.slice(0,i+1).map(r=>r.cost)));
  assert.deepEqual(rows[i].cumulativeIncome,sumResources(MAINLINE_TASKS.slice(0,i+1).map(t=>t.reward)));
 }
 assert.equal(rows.find(r=>r.id==='own-hover').cost.coins,0);
 assert.equal(rows.find(r=>r.id==='own-aircraft').cost.coins,0);
 assert.equal(rows.find(r=>r.id==='own-controller').cost.coins,0);
 assert.equal(rows.find(r=>r.id==='vehicle-service').cost.coins,170);
 assert.equal(a.tasks.totalCost.coins,4415);assert.equal(a.tasks.totalIncome.coins,14710);
 assert.equal(a.storyRewards.find(r=>r.id==='sunleaf-02').reward.coins,undefined);
});

test('各类别一级至二十级报价与正式累计扣费一致',()=>{
 for(const kind of ['heroes','weapons','turret','vehicle']){
  const p=openingAuditProgress(),index=kind==='turret'?nativeVehicleWeapon(0).weaponIndex:0;
  p.coins=p.wood=100000;p.vehicleHulls[0]=1;p.vehicleWeapons[index]=1;p.restoration.repaired.push('garage');
  const before={coins:p.coins,wood:p.wood},transaction=['heroes','weapons'].includes(kind)?transactProgress:transactVehicle;
  for(let l=1;l<20;l++)assert.ok(transaction(p,kind,index,'upgrade'));
  const budget=upgradeBudget(kind,index,20);
  assert.equal(before.coins-p.coins,budget.coins);assert.equal(before.wood-p.wood,budget.wood);
 }
});

test('死亡与超时的耗时和已入账收入不会从统计中消失',()=>{
 const s=summarizeSamples([{seconds:60,income:{coins:600},completed:true,state:'playing'},
  {seconds:120,income:{coins:300},completed:false,state:'dead'},
  {seconds:120,income:{coins:100},completed:false,state:'playing'}]);
 assert.equal(s.completed,1);assert.equal(s.failed,1);assert.equal(s.unfinished,1);
 assert.equal(s.resourcesPerCombatMinute.coins,200);assert.deepEqual(s.successSeconds,[60]);
});

test('正式战斗采样可导入且短时未完成样本不会伪报清关',()=>{
 const s=sampleClearing(1,1,1,{maxSeconds:.1});
 assert.equal(s.completed,false);assert.equal(s.seconds,.1);assert.equal(s.state,'playing');
 assert.ok(Object.values(s.income).every(n=>Number.isFinite(n)&&n>=0));
});
