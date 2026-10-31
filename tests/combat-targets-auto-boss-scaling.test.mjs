import {groundDestination} from '../src/combat/summons/ground-motion.js';
import {worldDistance} from '../src/world/coordinates.js';
// 战斗边界、地面可达性和难度快照的针对性回归，使用正式选敌与活动调度入口。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {summonTargetPool,allocateGroundTargets} from '../src/combat/summons/targets.js';
import {summonGroundReachable,summonGroundWaypoint} from '../src/combat/summons/reachability.js';
import {encounterDifficulty} from '../src/config/encounter-difficulty.js';
import {campDefenseBoss,campDefenseWave} from '../src/config/camp-defense.js';
import {startCampDefense,updateCampDefense,syncCampDefense,leaveCampDefense} from '../src/core/camp-defense.js';
import {capturePatrol} from '../src/core/patrol-session.js';
// 使用跨世界边缘的圆圈复现西门，视口省略以隔离几何资格。
function arena(){return {player:{x:0,y:700,arena:{x:-100,y:700,radius:300}},time:0,enemies:[],trees:[],boss:null};}
// 简单实体只提供共用选敌所需字段。
function entity(id,x,type='tree'){return {id,x,y:700,hp:100,radius:12,type};}
test('任务和兽潮圈排除圈外树与敌人，保留循环世界内的圈内目标和普通伐木',()=>{
 for(const mode of ['story','campDefense']){const g=arena();g[mode]={};const inside=entity(1,3550),outside=entity(2,220);g.trees=[inside,outside];assert.deepEqual(summonTargetPool(g,g.player,900),[inside]);g.enemies=[entity(3,240,'enemy')];assert.deepEqual(summonTargetPool(g,g.player,900),[inside]);g.boss=entity(4,250,'boss');assert.deepEqual(summonTargetPool(g,g.player,900,{bossFirst:true}),[inside]);g.player.arena=null;assert.equal(summonTargetPool(g,g.player,900)[0],g.enemies[0]);g.enemies=[];g.boss=null;assert.equal(summonTargetPool(g,g.player,900).length,2);}
});
test('分配目标时取消不可达旧锁定，选择可达对象；全不可达则归队',()=>{
 const a=entity(1,100,'enemy'),b=entity(2,120,'enemy'),node={x:0,y:700,hp:100,targetId:1};
 assert.deepEqual(allocateGroundTargets([node],[a,b],(n,t)=>t===b),[b]);assert.deepEqual(allocateGroundTargets([node],[a],()=>false),[null]);
});
test('近战拒绝隔着封闭护栏的目标，空地目标可达',()=>{
 const g=arena();g.player={x:2000,y:2000,arena:{x:2000,y:2000,radius:120},worldBarriers:[{x:2040,y:2000,width:10,height:300}]};
 const node={x:2000,y:2000,radius:9,mapId:'forest',arena:g.player.arena},target={...entity(1,2080,'enemy'),y:2000};
 for(let i=0;i<120;i++){g.time+=.016;assert.equal(summonGroundReachable(g,node,target,20),false);}
 target.x=2020;assert.equal(summonGroundReachable(g,node,target,20),true);
});
test('历史遭遇曲线保留原上限，不被兽潮独立成长改写',()=>{
 assert.deepEqual(encounterDifficulty(0),{health:1,damage:1});assert.deepEqual(encounterDifficulty(1),{health:1.04,damage:1.02});assert.deepEqual(encounterDifficulty(1000),{health:2,damage:1.5});
});
test('兽潮十波自动出 Boss，成长快照和受伤血量跨刷新保留，退出不加次数',()=>{
 const p=freshProgress();p.campDefense.runs=5;const g=new Game(p,()=>.5);g.state='playing';Object.assign(g.player,{x:120,y:729});assert.ok(startCampDefense(g,'left'));
 const r=g.campDefense;assert.equal(r.rounds,5);r.timer=0;updateCampDefense(g,.01);assert.equal(g.enemies[0].maxHp,campDefenseWave(1,5).hp);
 g.enemies=[];Object.assign(r,{wave:10,waveKills:86,spawned:86,timer:0});updateCampDefense(g,.01);assert.equal(r.phase,'boss');assert.equal(g.boss.maxHp,campDefenseBoss(5).hp);const id=g.boss.id;updateCampDefense(g,.01);assert.equal(g.boss.id,id);g.boss.hp-=200;syncCampDefense(g);g.progress.patrol=capturePatrol(g);
 const restored=new Game(structuredClone(g.progress));assert.equal(restored.boss.maxHp,campDefenseBoss(5).hp);assert.equal(restored.boss.hp,campDefenseBoss(5).hp-200);assert.equal(restored.campDefense.rounds,5);assert.ok(leaveCampDefense(restored));assert.equal(restored.progress.campDefense.runs,5);
});

test('西门战斗圈跨世界接缝时，归队落点不会被错误夹到另一侧边界',()=>{
 const g=arena(),node={x:3510,y:700,radius:9,arena:{x:-100,y:700,radius:300}};
 const goal={x:3480,y:720},point=groundDestination(g,node,goal);assert.ok(worldDistance(point,goal)<.01);
});
test('障碍可绕行时保留目标资格，不把非直线道路误判为不可达',()=>{
 const g=arena();g.player={x:2000,y:2000,arena:{x:2000,y:2000,radius:250},worldBarriers:[{x:2040,y:2000,width:10,height:70}]};
 const node={x:2000,y:2000,radius:9,arena:g.player.arena},target={...entity(1,2120,'enemy'),y:2000};let reachable=false;
 for(let i=0;i<500&&!reachable;i++){g.time+=.016;reachable=summonGroundReachable(g,node,target,20);}assert.equal(reachable,true);
 const first=summonGroundWaypoint(node,target,target);Object.assign(node,first);const second=summonGroundWaypoint(node,target,target);assert.ok(worldDistance(first,second)>16);
 Object.assign(node,second);const third=summonGroundWaypoint(node,target,target);assert.notDeepEqual(third,first);
});
