// 正式死亡时钟、局部预算与重击延迟回归，不用截图替代逻辑边界验证。
import test from 'node:test';
import assert from 'node:assert/strict';
import {monsterDeathPose,monsterDeathFragments} from '../src/config/monster-death.js';
import {Game,freshProgress} from '../src/game.js';
import {CombatFX} from '../src/combat/effects.js';
import {leaveEnemyRemnant,updateEnemies} from '../src/core/battle/enemy-manager.js';
test('亮芯、烟团与碎屑按正式寿命分段，结束不残留，减少动态不飞散',()=>{
 const e={burst:true,duration:.6,life:.6};const first=monsterDeathPose(e);assert.ok(first.flash>0);assert.equal(first.chips,10);assert.equal(first.puffs,5);
 e.life=.4;const mid=monsterDeathPose(e);assert.equal(mid.flash,0);assert.ok(mid.spread>first.spread);assert.ok(mid.smoke>0);
 e.life=.05;assert.equal(monsterDeathPose(e).smoke,0);assert.ok(monsterDeathPose(e).alpha<1);
 const reduced=monsterDeathPose(e,true);assert.equal(reduced.chips,0);assert.equal(reduced.arcs,0);assert.equal(reduced.flash,0);assert.equal(reduced.puffs,3);
 e.life=0;assert.equal(monsterDeathPose(e).active,false);assert.equal(monsterDeathPose({...e,burst:false,life:.5}).active,false);
});
test('碎屑沿上下左右及斜向弹道快速射出，八前两后，重击更远且拖尾有界',()=>{
 for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2,.7]){
  const e={burst:true,duration:.6,life:.5,hitX:Math.cos(angle),hitY:Math.sin(angle)},chips=monsterDeathFragments(e);
  assert.equal(chips.filter(p=>p.forward).length,8);assert.equal(chips.filter(p=>!p.forward).length,2);
  for(const p of chips){const along=p.x*e.hitX+p.y*e.hitY;assert.ok(p.forward?along>25:along<0);assert.ok(Math.hypot(p.tailX-p.x,p.tailY-p.y)<=20.001);}
  const heavy=monsterDeathFragments({...e,deathPower:3});assert.ok(Math.hypot(heavy[3].x,heavy[3].y)>Math.hypot(chips[3].x,chips[3].y)*1.2);
  assert.deepEqual(monsterDeathFragments(e,true),[]);
  assert.deepEqual(monsterDeathFragments({...e,rollAngle:2.4}),chips,'身体旋转不能改变弹道方向');
 }
});
test('正式子弹死亡记录发射方向，玩家中途转身和死亡后重复命中不改变爆裂',()=>{
 const g=new Game(freshProgress(),()=>.5);g.start();g.trees=[];g.enemies=[];Object.assign(g.player,{x:1600,y:400});
 const e=g.spawnEnemy(0,0,{x:1690,y:400},{ambient:true});e.hp=1;g.attack();g.player.angle=Math.PI;g.updateProjectiles(.3);
 const corpse=g.remnants.at(-1);assert.ok(corpse);assert.ok(corpse.hitX>.9);assert.ok(Math.abs(corpse.hitY)<.1);
 const before={x:corpse.hitX,y:corpse.hitY,power:corpse.deathPower};g.hit(e,100,false,{direction:{x:-1,y:0},power:3});
 assert.deepEqual({x:corpse.hitX,y:corpse.hitY,power:corpse.deathPower},before);
});
test('真实死亡残影保留重击延迟、20个预算及清理，不产生额外奖励',()=>{
 const g=new Game(freshProgress());const coins=g.progress.coins,wood=g.progress.wood;
 for(let i=0;i<25;i++)leaveEnemyRemnant(g,{id:i,type:'enemy',hp:0,x:1600,y:400,vx:0,vy:0,radius:17},{power:2});
 assert.equal(g.remnants.length,20);assert.equal(monsterDeathPose(g.remnants[0]).active,false);
 updateEnemies(g,.2,{...g.player});assert.equal(monsterDeathPose(g.remnants[0]).active,true);
 updateEnemies(g,1,{...g.player});assert.equal(g.remnants.length,0);assert.equal(g.progress.coins,coins);assert.equal(g.progress.wood,wood);
});
test('普通怪致命命中只保留短火花，活体与伐木仍保留原命中反馈',()=>{
 const fx=new CombatFX(()=>.5),direction={x:1,y:0};
 fx.impact({target:{type:'enemy'},x:0,y:0},direction,false,false,true);
 assert.equal(fx.items.length,3);assert.ok(fx.items.every(p=>p.kind==='spark'&&p.duration<.25));fx.update(.25);assert.equal(fx.items.length,0);
 fx.impact({target:{type:'enemy'},x:0,y:0},direction,false,false,false);assert.ok(fx.items.some(p=>p.kind==='chip'));
 fx.items=[];fx.impact({target:{type:'tree'},x:0,y:0},direction,false,false,true);assert.ok(fx.items.some(p=>p.kind==='chip'&&p.material==='wood'));
});
