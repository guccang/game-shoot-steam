// 种子购买调试只开放购买资格，沿用保存事务并保留原有价格、库存和掉落阶段。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {FARM_CROPS,FARM_SEED_DOOR} from '../src/config/farm.js';
import {debugGrantProgress,debugSeedsUnlocked} from '../src/progression/debug-grants.js';
import {createProgressController} from '../src/app/progress-controller.js';
import {buyFarmSeeds} from '../src/core/farm-seeds.js';

test('解锁所有种子购买不赠资源、不改任务，读档和重复执行保持一致',()=>{
 const p=validateProgress(freshProgress()),before=structuredClone(p);assert.equal(debugSeedsUnlocked(p),false);
 const next=debugGrantProgress(p,'seed-purchases');assert.equal(debugSeedsUnlocked(next),true);assert.equal(next.farm.unlocked.length,FARM_CROPS.length);assert.deepEqual(p,before);
 const expected=structuredClone(before);expected.farm.unlocked=FARM_CROPS.map(()=>true);assert.deepEqual(next,expected);
 assert.deepEqual(validateProgress(next),next);assert.deepEqual(debugGrantProgress(next,'seed-purchases'),next);
 next.farm.unlocked.pop();assert.equal(debugSeedsUnlocked(next),false);
});
test('保存失败不解锁，成功提交后刷新存档仍可购买全部品种',()=>{
 const g=new Game(freshProgress());g.start();const before=structuredClone(g.progress);let saved;const store={saveProgress:()=>false};
 const controller=createProgressController({game:g,store,root:{getElementById:()=>({})},refresh(){}});
 assert.equal(controller.debugGrant('seed-purchases'),false);assert.deepEqual(g.progress,before);
 store.saveProgress=p=>{saved=structuredClone(p);return true;};assert.equal(controller.debugGrant('seed-purchases'),true);
 assert.equal(debugSeedsUnlocked(g.progress),true);assert.equal(debugSeedsUnlocked(new Game(saved).progress),true);
});
test('零清缴轮数也能正常付费买高级种子，余额不足仍不能购买',()=>{
 const g=new Game(freshProgress());g.state='paused';Object.assign(g.player,FARM_SEED_DOOR);
 const index=FARM_CROPS.findIndex(c=>c.rounds>0),crop=FARM_CROPS[index];g.progress.coins=crop.cost;
 assert.equal(buyFarmSeeds(g,index).ok,false);
 g.progress=debugGrantProgress(g.progress,'seed-purchases');assert.equal(buyFarmSeeds(g,index).ok,true);
 assert.equal(g.progress.farm.seeds[index],1);assert.equal(g.progress.coins,0);assert.equal(g.progress.bosses,0);
 assert.equal(buyFarmSeeds(g,index).ok,false);assert.equal(g.progress.farm.seeds[index],1);
});
