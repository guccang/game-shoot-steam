// 建筑调试沿用保存事务：开放全部设施、终止施工，不能多扣材料或领取主线奖励。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {TOWN_RESTORATIONS,facilityOpen} from '../src/config/town-restoration.js';
import {debugGrantProgress,debugBuildingsUnlocked} from '../src/progression/player/debug-grants.js';
import {createProgressController} from '../src/app/progress-controller.js';
import {workshopBuildView} from '../src/core/camp/ranger-arrival.js';
test('新档与施工中解锁全部建筑，重复执行及刷新稳定，经济装备和主线不变',()=>{
 for(const phase of ['bus','gather','repairing','complete']){
  const p=validateProgress(freshProgress());p.arrival={version:3,phase,keys:true,elapsed:1,workWood:80};p.restoration.build={id:'cottage',elapsed:1,x:10,y:20};
  const before=structuredClone(p),next=debugGrantProgress(p,'buildings');assert.deepEqual(p,before);
  assert.ok(debugBuildingsUnlocked(next));assert.ok(facilityOpen(next,'weapons'));assert.equal(next.restoration.repaired.length,TOWN_RESTORATIONS.length);assert.equal(next.restoration.build,null);
  for(const key of ['coins','wood','materials','weapons','vehicleHulls','mainline','story','economyLog'])assert.deepEqual(next[key],p[key],key);
  assert.equal(workshopBuildView({progress:next}).state,'ready');assert.deepEqual(validateProgress(next),next);assert.deepEqual(debugGrantProgress(next,'buildings'),next);
 }
});
test('保存失败保持施工，成功才更新实际入口和清除演出状态',()=>{
 const g=new Game(freshProgress());g.start();g.arrivalScene={test:true};g.restorationError='旧错误';g.restorationRetry=1;
 const before=structuredClone(g.progress);let saved;const store={saveProgress:()=>false};
 const controller=createProgressController({game:g,store,root:{getElementById:()=>({})},refresh(){}});
 assert.equal(controller.debugGrant('buildings'),false);assert.deepEqual(g.progress,before);assert.deepEqual(g.arrivalScene,{test:true});
 store.saveProgress=p=>{saved=structuredClone(p);return true;};assert.equal(controller.debugGrant('buildings'),true);assert.ok(debugBuildingsUnlocked(saved));assert.equal(g.arrivalScene,null);assert.equal(g.restorationRetry,0);assert.equal(g.restorationError,'');
 const restored=new Game(saved);assert.ok(debugBuildingsUnlocked(restored.progress));assert.equal(restored.arrivalPending,false);
});
