// 返营回血走正式受击和状态更新，验证离屏保留、暂停、重新接敌及死亡边界。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {MONSTER_CAMPS,MONSTER_CAMP_RULES as RULES} from '../src/config/monster-camps.js';
import {updateMonsterCamps,monsterCampObjects} from '../src/core/monster-camps.js';

// 进入营地正式受伤，再把交战位置移到驻地附近，确保观察到实际返程。
function woundedScene(index=0){
 const camp=MONSTER_CAMPS[index],g=new Game(freshProgress(),()=>.5);g.start();g.livingPersist=()=>true;g.enemies=[];
 Object.assign(g.player,camp);g.arrivalView={left:-160,right:160,top:-284,bottom:284};updateMonsterCamps(g,.04);
 const actor=g.enemies.find(e=>e.species==='slime');g.hit(actor,actor.maxHp*.6);actor.x-=70;
 return {g,camp,actor};
}
// 玩家离开视野，等待怪物沿正式移动逻辑走回家，不直接改写返营状态。
function returnHome(g,camp,actor){
 Object.assign(g.player,{x:camp.x+700,y:camp.y});
 for(let i=0;i<400&&actor.campState!=='idle';i++)updateMonsterCamps(g,.05);
 assert.equal(actor.campState,'idle');assert.ok(actor.hp<actor.maxHp);
}

test('追击及返营途中不回血，到家后按最大生命每秒3%恢复且不超过上限',()=>{
 for(const index of [0,6]){
  const {g,camp,actor}=woundedScene(index),hp=actor.hp;updateMonsterCamps(g,.5);assert.equal(actor.hp,hp);
  Object.assign(g.player,{x:camp.x+700,y:camp.y});updateMonsterCamps(g,.9);
  assert.equal(actor.campState,'returning');assert.equal(actor.hp,hp);
  returnHome(g,camp,actor);const homeHp=actor.hp;updateMonsterCamps(g,.5);
  assert.ok(Math.abs(actor.hp-homeHp-actor.maxHp*RULES.healPerSecond*.5)<1e-8);
  for(let i=0;i<800;i++)updateMonsterCamps(g,.05);
  assert.equal(actor.hp,actor.maxHp);
 }
});

test('离屏受伤居民保留原身份和剩余生命，重新接敌立即停止回血',()=>{
 const {g,camp,actor}=woundedScene();returnHome(g,camp,actor);updateMonsterCamps(g,.5);
 assert.ok(monsterCampObjects(g).some(e=>e.id===actor.id));const hp=actor.hp;
 Object.assign(g.player,camp);updateMonsterCamps(g,.5);
 assert.ok(g.enemies.includes(actor));assert.equal(actor.campState,'chasing');assert.equal(actor.hp,hp);
 g.hit(actor,1);updateMonsterCamps(g,.5);assert.equal(actor.hp,hp-1);
});

test('暂停冻结回血，回营后的警觉驻足可恢复，离开地图不刷新满血',()=>{
 const {g,camp,actor}=woundedScene();returnHome(g,camp,actor);const hp=actor.hp;
 g.state='paused';updateMonsterCamps(g,10);assert.equal(actor.hp,hp);g.state='playing';
 g.mapId='jiuzhaigou';updateMonsterCamps(g,1);assert.equal(actor.hp,hp);
 g.mapId='forest';Object.assign(g.player,{x:camp.x,y:camp.y-RULES.radius-10});updateMonsterCamps(g,.1);
 assert.ok(monsterCampObjects(g).some(e=>e.id===actor.id));
 for(let i=0;i<40&&actor.campState==='returning';i++)updateMonsterCamps(g,.05);
 assert.equal(actor.campState,'alert');const before=actor.hp;updateMonsterCamps(g,.5);assert.ok(actor.hp>before);
});

test('阵亡名额不被回血复活，部分清场记录和种子奖励保持原样',()=>{
 const {g,camp,actor}=woundedScene(),dead=g.enemies.find(e=>e!==actor),seeds=[...g.progress.farm.seeds];g.hit(dead,999999);
 const record={...g.progress.monsterCamps.camps[camp.id]};returnHome(g,camp,actor);
 for(let i=0;i<800;i++)updateMonsterCamps(g,.05);
 Object.assign(g.player,camp);updateMonsterCamps(g,.05);
 assert.equal(g.enemies.filter(e=>e.monsterCamp===camp.id).length,4);
 assert.ok(!g.enemies.some(e=>e.campSlot===dead.campSlot));assert.ok(dead.hp<=0);
 assert.deepEqual(g.progress.monsterCamps.camps[camp.id],record);assert.deepEqual(g.progress.farm.seeds,seeds);
});
