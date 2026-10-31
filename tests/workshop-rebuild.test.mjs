import {RESTORATION_FLIGHT} from '../src/config/town-restoration.js';
// 工坊三秒重建专项：成功外观、保存失败、暂停恢复与扣料共用正式导演状态。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshRangerProgress,freshProgress} from '../src/progression/progress.js';
import {RANGER} from '../src/config/ranger-arrival.js';
import {WORKSHOP} from '../src/world/workshop.js';
import {workshopBuildView,advanceArrival} from '../src/core/ranger-arrival.js';

// 从采料完成的真实门口检查点开工，保留正式费用和阶段提交。
function ready(){
 const p=freshRangerProgress(),wood=RANGER.repairWood+RANGER.pistolWood;
 Object.assign(p.arrival,{phase:'repair',keys:true,wood,x:WORKSHOP.x,y:WORKSHOP.y+25});p.wood=wood;
 const g=new Game(p,()=>.5);g.start();g.attackTimer=999;return g;
}
// 以正常帧步长累积时间，避免单个大步跨过更新器上限。
function tick(g,seconds){for(let i=0;i<Math.round(seconds/.05);i++)g.update(.05);}

test('破败外观贯穿初见和采集，三秒成功后才换新工坊',()=>{
 assert.equal(workshopBuildView(new Game(freshRangerProgress())).state,'ruined');
 assert.equal(workshopBuildView(new Game(freshProgress())).state,'ready');
 const g=ready(),before=g.progress.wood;assert.equal(workshopBuildView(g).state,'ruined');assert.ok(advanceArrival(g));
 assert.equal(RANGER.rebuildSeconds+RESTORATION_FLIGHT,3);assert.equal(workshopBuildView(g).seconds,3);tick(g,2.95);
 assert.equal(workshopBuildView(g).state,'rebuilding');assert.equal(workshopBuildView(g).seconds,1);assert.equal(g.progress.wood,before-RANGER.repairWood);
 tick(g,.05);assert.equal(workshopBuildView(g).state,'ready');assert.ok(workshopBuildView(g).success);assert.equal(g.progress.wood,before-RANGER.repairWood+RANGER.pistolWood);
 tick(g,1.25);assert.equal(workshopBuildView(g).success,false);assert.equal(g.progress.wood,8+RANGER.pistolWood);
});
test('重建暂停与刷新保留进度，保存失败不换新外观或重复扣料',()=>{
 const g=ready();advanceArrival(g);tick(g,2);g.pause();const snapshot=workshopBuildView(g);tick(g,3);assert.deepEqual(workshopBuildView(g),snapshot);
 const restored=new Game(structuredClone(g.progress),()=>.5);restored.start();restored.attackTimer=999;assert.equal(workshopBuildView(restored).seconds,1);
 restored.arrivalPersist=()=>false;tick(restored,3+RESTORATION_FLIGHT);assert.equal(workshopBuildView(restored).state,'rebuilding');assert.ok(workshopBuildView(restored).failed);assert.equal(restored.progress.wood,8);
 tick(restored,3);assert.equal(restored.progress.wood,8);restored.arrivalPersist=()=>true;advanceArrival(restored);tick(restored,.05);
 assert.equal(workshopBuildView(restored).state,'ready');assert.equal(restored.progress.wood,8+RANGER.pistolWood);tick(restored,6);assert.equal(restored.progress.wood,8+RANGER.pistolWood);
 assert.equal(workshopBuildView(new Game(structuredClone(restored.progress))).state,'ready');
});
