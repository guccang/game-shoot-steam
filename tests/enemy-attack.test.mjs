// 怪物攻击回归：固定预警、走位躲避、单次伤害、回位安全和帧率一致性。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, freshProgress, WORLD } from '../src/game.js';
import { attackProfile, createEnemyAttack, updateEnemyAttack } from '../src/combat/enemy-attack.js';
// 关闭自动射击和刷怪，让一只耐打怪物独立演示完整攻击周期。
function arena(tough = false, distance = 80) {
  const g = new Game(freshProgress(), () => tough ? .8 : .5);g.start();g.trees=[];g.enemies=[];g.spawnTimer=g.attackTimer=99;
  // 明确使用开放平台，避免营地安全区让怪物停在门外而无法进入本测试的攻击周期。
  Object.assign(g.player,{x:2000,y:2000,arena:{x:2000,y:2000,radius:900}});
  g.spawnEnemy(0,distance,{x:2000+distance,y:2000});const e=g.enemies[0];e.arena=g.player.arena;e.hp=e.maxHp=1000;g.update(.01);return {g,e,p:attackProfile(e)};
}
// 精确推进指定时长，允许以不同帧率验证攻击状态。
function advance(g, duration, input = {x:0,y:0}, step = 1/120) {
  let remaining=duration;while(remaining>1e-8){const dt=Math.min(step,remaining);g.update(dt,input);remaining-=dt;}
}
test('前摇时停步并锁定路线，贴身也不会接触扣血',()=>{
  for(const tough of [false,true]){
    const {g,e,p}=arena(tough,10),origin={x:e.x,y:e.y},end={x:e.assault.endX,y:e.assault.endY},hp=g.player.hp;
    assert.equal(e.assault.phase,'windup');advance(g,p.windup-.02,{x:0,y:1});
    assert.equal(g.player.hp,hp);assert.deepEqual({x:e.x,y:e.y},origin);assert.deepEqual({x:e.assault.endX,y:e.assault.endY},end);
  }
});
test('不移动会在扑击去程受伤，同一扑击只伤害一次',()=>{
  for(const tough of [false,true]){
    const {g,e,p}=arena(tough),hp=g.player.hp;advance(g,p.windup);
    assert.equal(g.player.hp,hp);assert.equal(e.assault.phase,'lunge');
    for(let i=0;i<60;i++){g.player.invincible=0;g.update(p.lunge/60);}
    assert.equal(g.player.hp,hp-p.damage);assert.equal(e.assault.phase,'returning');
  }
});
test('看到前摇后横向移动可躲避，扑空后精确回到起点',()=>{
  for(const tough of [false,true]){
    const {g,e,p}=arena(tough),origin={x:e.x,y:e.y},hp=g.player.hp;
    advance(g,p.windup+p.lunge,{x:0,y:1});assert.equal(g.player.hp,hp);assert.equal(e.assault.hit,false);
    advance(g,p.returning);assert.deepEqual({x:e.x,y:e.y},origin);assert.equal(e.assault.phase,'recovery');
    advance(g,p.recovery);assert.equal(e.assault.phase,'chase');
  }
});
test('回程及收招重叠玩家也无伤害，收招完成才恢复追击',()=>{
  const {g,e,p}=arena();advance(g,p.windup+p.lunge,{x:0,y:1});const hp=g.player.hp;
  for(let t=0;t<p.returning+p.recovery-.02;t+=.01){g.player.x=e.x;g.player.y=e.y;g.player.invincible=0;g.update(.01);}
  assert.equal(g.player.hp,hp);assert.equal(e.assault.phase,'recovery');
  assert.equal(e.x,e.assault.originX);assert.equal(e.y,e.assault.originY);
});
test('低帧率使用相对轨迹扫掠，玩家快速横穿扑击路径仍能检测接触',()=>{
  const e={x:0,y:0,hp:100,radius:17,speed:48,tough:false,assault:{...createEnemyAttack(),phase:'lunge',originX:0,originY:0,endX:100,endY:0}};
  const damage=updateEnemyAttack(e,{x:24,y:80},{x:24,y:-80},.05,WORLD);
  assert.equal(damage,8);assert.ok(e.x>45);assert.equal(e.assault.hit,true);
});
test('30帧和120帧的扑击伤害、阶段及位置一致',()=>{
  const a=arena(),b=arena();advance(a.g,.73,{x:0,y:0},1/30);advance(b.g,.73,{x:0,y:0},1/120);
  assert.equal(a.g.player.hp,b.g.player.hp);assert.equal(a.e.assault.phase,b.e.assault.phase);
  assert.ok(Math.abs(a.e.x-b.e.x)<1e-7);assert.ok(Math.abs(a.e.y-b.e.y)<1e-7);
});
test('暂停冻结攻击，前摇或扑击中击杀立即取消伤害，重生清空状态',()=>{
  for(const duration of [.2,.5]){
    const {g,e}=arena();advance(g,duration);g.pause();const state=structuredClone(e);advance(g,.8,{x:1,y:0});assert.deepEqual(e,state);g.pause();
    const hp=g.player.hp;g.hit(e,10000);advance(g,.6);assert.equal(g.enemies.length,0);assert.ok(g.player.hp>=hp);
    g.hurt(10000);g.start();assert.ok(g.enemies.every(enemy=>enemy.assault.phase==='chase'));
  }
});
test('边缘和完全重叠目标不产生无效坐标，玩家倒下后不继续攻击',()=>{
  const {g,e,p}=arena(false,0);g.player.x=e.x=35;g.player.y=e.y=35;e.assault=createEnemyAttack();g.update(.01);
  advance(g,p.windup+p.lunge+p.returning);assert.ok(Number.isFinite(e.x)&&Number.isFinite(e.y));assert.ok(e.x>=35&&e.y>=35);
  g.player.invincible=0;g.hurt(999);const state=structuredClone(e);advance(g,1);assert.deepEqual(e,state);
});
