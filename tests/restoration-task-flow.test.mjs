// 建筑修复后的主线就地接取：覆盖正式存档、失败回滚、旧档和清缴入口。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {validateProgress} from '../src/progression/progress.js';
import {TOWN_RESTORATIONS,RESTORATION_SECONDS} from '../src/config/town-restoration.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {repairFacility,updateRestoration} from '../src/core/town-restoration.js';
import {updateMainline,mainlineObjective} from '../src/core/mainline-manager.js';
import {acceptClearingPost} from '../src/core/clearing-guide.js';
import {restoredTaskToStart,startRestoredTask} from '../src/progression/restoration-task.js';

// 使用真实任务顺序和设施坐标，保持玩家位于修复现场。
function scene(id='clearing'){
 const f=TOWN_RESTORATIONS.find(f=>f.id===id),p=freshProgress();
 p.mainline.completed=MAINLINE_IDS.slice(0,f.order);p.mainline.currentId=f.before;p.mainline.phase='meet';
 p.restoration.repaired=TOWN_RESTORATIONS.filter(x=>x.order<f.order).map(x=>x.id);p.restoration.cottageRested=true;p.wood=1000;
 const g=new Game(p,()=>.5);g.start();Object.assign(g.player,f.site);g.enemies=[];g.boss=null;g.vehicle.active=false;g.mainlineSpeech=null;g.restorationPersist=()=>true;g.mainlinePersist=()=>true;g.livingPersist=()=>true;
 return {g,f};
}

test('清缴告示牌完成修复即接主线，可原地接清缴且不会发放完成奖励',()=>{
 const {g,f}=scene(),before={coins:g.progress.coins,completed:[...g.progress.mainline.completed]},saved=[];
 g.restorationPersist=p=>{saved.push(structuredClone(p));return true;};
 assert.equal(repairFacility(g,f.id).ok,true);assert.equal(g.progress.mainline.phase,'meet');
 updateRestoration(g,RESTORATION_SECONDS);
 assert.equal(g.progress.mainline.phase,'doing');assert.equal(g.progress.mainline.currentId,'first-patrol');
 assert.equal(saved.at(-1).mainline.phase,'doing');assert.ok(saved.at(-1).restoration.repaired.includes('clearing'));
 assert.equal(g.progress.coins,before.coins);assert.deepEqual(g.progress.mainline.completed,before.completed);assert.equal(g.progress.wood,1000-f.wood);
 assert.equal(mainlineObjective(g).key,'clearing-post');assert.equal(acceptClearingPost(g).ok,true);assert.equal(g.progress.living.patrolActive,true);
 assert.equal(mainlineObjective(g).key,'boss-clearing');
});

test('所有绑定建筑的当前主线只接取一次，普通任务和待领奖阶段不变',()=>{
 for(const f of TOWN_RESTORATIONS){const {g}=scene(f.id);g.progress.restoration.repaired.push(f.id);
  assert.equal(startRestoredTask(g.progress,f.id)?.id,f.before,f.id);assert.equal(startRestoredTask(g.progress,f.id),null);
  g.progress.mainline.phase='report';assert.equal(startRestoredTask(g.progress,f.id),null);assert.equal(g.progress.mainline.phase,'report');
 }
 const {g}=scene();g.progress.mainline.completed=[];g.progress.mainline.currentId=MAINLINE_IDS[0];g.progress.restoration.repaired.push('clearing');assert.equal(restoredTaskToStart(g.progress),null);
});

test('施工完成保存失败时建筑和接取都不生效，重试不重复扣料',()=>{
 const {g,f}=scene();repairFacility(g,f.id);const paid=g.progress.wood;
 g.restorationPersist=()=>false;updateRestoration(g,RESTORATION_SECONDS);
 assert.equal(g.progress.mainline.phase,'meet');assert.ok(!g.progress.restoration.repaired.includes(f.id));assert.ok(g.progress.restoration.build);
 g.restorationPersist=()=>true;updateRestoration(g,1.1);assert.equal(g.progress.mainline.phase,'doing');assert.equal(g.progress.wood,paid);assert.equal(g.progress.restoration.repaired.filter(id=>id===f.id).length,1);
});

test('已修复旧档在当前任务接取时就地衔接，保存失败可重试且不循环写盘',()=>{
 const {g}=scene();g.progress.restoration.repaired.push('clearing');g.progress=validateProgress(structuredClone(g.progress));let writes=0;
 g.mainlinePersist=()=>{writes++;throw Error('存储失败');};updateMainline(g,.1);assert.equal(g.progress.mainline.phase,'meet');assert.equal(writes,1);
 updateMainline(g,.1);assert.equal(writes,1);
 g.mainlinePersist=()=>{writes++;return true;};updateMainline(g,1);assert.equal(g.progress.mainline.phase,'doing');assert.equal(writes,2);
 updateMainline(g,.1);assert.equal(writes,2);assert.equal(mainlineObjective(g).key,'clearing-post');
});

test('提前修复其他建筑不跳过当前任务，未修复不接取，暂停不补跑',()=>{
 const {g}=scene();assert.equal(startRestoredTask(g.progress),null);
 g.progress.restoration.repaired.push('garage');assert.equal(startRestoredTask(g.progress,'garage'),null);assert.equal(g.progress.mainline.phase,'meet');
 g.progress.restoration.repaired.push('clearing');g.state='paused';updateMainline(g,2);assert.equal(g.progress.mainline.phase,'meet');
});
