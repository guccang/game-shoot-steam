// 武器工坊旧屋与完工墙体共用碰撞，历史墙内站位在完工和读档时安全恢复。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshRangerProgress,validateProgress} from '../src/progression/progress.js';
import {WORKSHOP} from '../src/world/workshop.js';
import {RANGER} from '../src/config/ranger-arrival.js';
import {RESTORATION_FLIGHT,facilityOpen} from '../src/config/town-restoration.js';
import {worldBuildingBlocked} from '../src/world/building-collision.js';
import {blocked,moveBody} from '../src/physics/motion.js';
import {WORLD,worldDistance} from '../src/world/coordinates.js';
import {updateArrival} from '../src/core/camp/ranger-arrival.js';

// 使用旧存档可能进入的北墙内部坐标，真实Game恢复不伪造墙体。
const trapped={x:WORKSHOP.x,y:WORKSHOP.y-60};
function scene(phase='repairing',point=trapped){
 const p=freshRangerProgress();Object.assign(p.arrival,{phase,keys:true,elapsed:0,...point});p.wood=RANGER.repairWood;
 const g=new Game(p,()=>.5);g.start();g.arrivalPersist=()=>true;g.enemies=[];g.boss=null;g.attackTimer=9999;return g;
}
// 安全落点必须能继续走动；检查真实逐步碰撞而非只看一个布尔标记。
function canLeave(g){
 const body={...g.player,mapId:'forest',campProgress:g.progress,livingCollision:true};
 assert.equal(blocked(body.x,body.y,12,g.trees,body),false);
 assert.ok([[1,0],[-1,0],[0,1],[0,-1]].some(([x,y])=>{const p={...body};moveBody(p,x*32,y*32,WORLD,12,g.trees);return worldDistance(p,body)>20;}));
}
test('工坊修复前后北墙、侧墙、门前通路与周期镜像完全一致',()=>{
 const before=freshRangerProgress(),after=validateProgress(structuredClone(before));before.arrival.phase='repair';after.arrival.phase='craft';
 for(const offset of [0,WORLD.width])for(let x=-100;x<=100;x+=10)for(let y=-130;y<=40;y+=10){
  const at={x:WORKSHOP.x+x+offset,y:WORKSHOP.y+y};assert.equal(worldBuildingBlocked(at.x,at.y,12,{mapId:'forest',campProgress:before}),worldBuildingBlocked(at.x,at.y,12,{mapId:'forest',campProgress:after}));
 }
 assert.equal(worldBuildingBlocked(trapped.x,trapped.y,12,{mapId:'forest',campProgress:before}),true);
 assert.equal(worldBuildingBlocked(WORKSHOP.x,WORKSHOP.y+25,12,{mapId:'forest',campProgress:before}),false);
 assert.equal(facilityOpen(before,'weapons'),false);assert.equal(facilityOpen(after,'weapons'),true);
});
test('北墙旧档在修复中和修复后均就近解困，入职坐标同步且重载不回墙内',()=>{
 for(const phase of ['repair','repairing','craft']){
  const g=scene(phase);canLeave(g);assert.ok(worldDistance(g.player,trapped)<130);assert.ok(worldDistance(g.progress.arrival,g.player)<1e-7);
  const restored=new Game(validateProgress(structuredClone(g.progress)),()=>.5);assert.ok(worldDistance(restored.player,g.player)<1e-7);canLeave(restored);
 }
});
test('旧版施工中墙内站位完工时就近移出，安全坐标与完工状态一起落盘',()=>{
 const g=scene();Object.assign(g.player,trapped);Object.assign(g.progress.arrival,trapped);g.progress.arrival.elapsed=RANGER.rebuildSeconds+RESTORATION_FLIGHT-.01;let saved;
 g.arrivalPersist=next=>{saved=structuredClone(next);return true;};updateArrival(g,.02);
 assert.equal(g.progress.arrival.phase,'craft');canLeave(g);assert.equal(saved.arrival.x,g.player.x);assert.equal(saved.arrival.y,g.player.y);assert.deepEqual(saved.living.position,{x:g.player.x,y:g.player.y});
});
test('完工保存失败不提前移动或发奖励，重试后一次完成解困',()=>{
 const g=scene();Object.assign(g.player,trapped);g.progress.arrival.elapsed=RANGER.rebuildSeconds+RESTORATION_FLIGHT;const wood=g.progress.wood;g.arrivalPersist=()=>false;updateArrival(g,.02);
 assert.equal(g.progress.arrival.phase,'repairing');assert.equal(g.player.x,trapped.x);assert.equal(g.player.y,trapped.y);assert.equal(g.progress.wood,wood);
 g.arrivalPersist=()=>true;g.arrivalError=false;updateArrival(g,.02);assert.equal(g.progress.arrival.phase,'craft');assert.equal(g.progress.wood,wood+RANGER.pistolWood);canLeave(g);
});
test('正常门前施工完工不挪动猫猫，修复仍扣料一次',()=>{
 const at={x:WORKSHOP.x,y:WORKSHOP.y+25},g=scene('repair',at),wood=g.progress.wood;updateArrival(g,.01);assert.equal(g.progress.arrival.phase,'repairing');
 for(let i=0;i<70;i++)updateArrival(g,.05);assert.equal(g.progress.arrival.phase,'craft');assert.equal(g.player.x,at.x);assert.equal(g.player.y,at.y);assert.equal(g.progress.wood,wood-RANGER.repairWood+RANGER.pistolWood);canLeave(g);
});
