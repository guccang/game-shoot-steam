// 三秒修复统一回归：首座工坊、全部后续建筑、旧施工存档与暂停恢复。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,freshRangerProgress,validateProgress} from '../src/progression/progress.js';
import {RANGER} from '../src/config/ranger-arrival.js';
import {WORKSHOP} from '../src/world/workshop.js';
import {TOWN_RESTORATIONS,RESTORATION_SECONDS,RESTORATION_FLIGHT,facilityOpen} from '../src/config/town-restoration.js';
import {advanceArrival,updateArrival,workshopBuildView} from '../src/core/camp/ranger-arrival.js';
import {repairFacility,updateRestoration} from '../src/core/camp/town-restoration.js';

// 从真实工坊修复检查点开始，材料与钥匙沿用正式存档。
function workshop(){
 const p=freshRangerProgress();Object.assign(p.arrival,{phase:'repair',keys:true,x:WORKSHOP.x,y:WORKSHOP.y+25});p.wood=RANGER.repairWood;
 const g=new Game(p,()=>.5);g.start();g.arrivalPersist=()=>true;assert.ok(advanceArrival(g));return g;
}
// 固定帧增量与正常更新一致，专门暴露三秒附近的浮点误差。
function tick(g,update,count){for(let i=0;i<count;i++)update(g,.05);}

test('首次武器工坊包含投料共三秒，2.95秒仍施工，3秒开放且只结算一次',()=>{
 assert.equal(RESTORATION_SECONDS,3);assert.equal(RANGER.rebuildSeconds+RESTORATION_FLIGHT,3);
 const g=workshop();assert.equal(workshopBuildView(g).seconds,3);tick(g,updateArrival,59);
 assert.equal(workshopBuildView(g).state,'rebuilding');assert.equal(workshopBuildView(g).seconds,1);
 updateArrival(g,.05);assert.ok(facilityOpen(g.progress,'weapons'));assert.equal(workshopBuildView(g).state,'ready');
 const wood=g.progress.wood;tick(g,updateArrival,70);assert.equal(g.progress.wood,wood);
});

test('全部后续设施总修复时间为三秒，暂停冻结，保存失败不提前开放',()=>{
 for(const f of TOWN_RESTORATIONS){
  const p=freshProgress();p.wood=f.wood;const g=new Game(p,()=>.5);g.state='playing';g.mainlineSpeech=null;g.restorationPersist=()=>true;Object.assign(g.player,f.site);
  assert.ok(repairFacility(g,f.id).ok,f.id);assert.equal(g.progress.wood,0);tick(g,updateRestoration,30);
  g.state='paused';tick(g,updateRestoration,100);assert.ok(Math.abs(g.progress.restoration.build.elapsed-1.5)<1e-8);
  g.state='playing';g.progress=validateProgress(structuredClone(g.progress));tick(g,updateRestoration,29);assert.equal(facilityOpen(g.progress,f.id),false,f.id);
  g.restorationPersist=()=>false;updateRestoration(g,.05);assert.equal(facilityOpen(g.progress,f.id),false,f.id);
  g.restorationPersist=()=>true;g.restorationRetry=0;updateRestoration(g,0);assert.ok(facilityOpen(g.progress,f.id),f.id);assert.equal(g.progress.restoration.build,null);
  assert.equal(g.progress.wood,0);
 }
});

test('旧存档已施工超过三秒可直接完工，不重新扣料',()=>{
 const g=workshop();g.progress.arrival.elapsed=4;g.progress=validateProgress(g.progress);updateArrival(g,0);assert.ok(facilityOpen(g.progress,'weapons'));
 const p=freshProgress();p.restoration.build={id:'cottage',elapsed:3.1,x:0,y:0};const other=new Game(validateProgress(p),()=>.5);other.state='playing';other.restorationPersist=()=>true;
 const wood=other.progress.wood;updateRestoration(other,0);assert.ok(facilityOpen(other.progress,'cottage'));assert.equal(other.progress.wood,wood);
});
