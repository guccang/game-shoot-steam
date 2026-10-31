// 验证真实刷怪工厂的五波配额、场景隔离与旧存档完成节点迁移。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {waveDifficulty,waveRewardAmount,waveRewardTotal,legacyWaveTotal} from '../src/config/waves.js';
import {validatePatrol} from '../src/progression/patrol-progress.js';
import {RANGED_ENEMIES,RANGED_LIMITS} from '../src/config/ranged-enemies.js';
import {ARMORED} from '../src/config/armored-enemies.js';

// 区域固定，保留工厂抽签、正式属性及同屏配额；每轮使用真实波次总数。
function wave(wave,roll=.5,flying=false){
 const g=new Game(freshProgress(),()=>roll);g.start();g.enemies=[];g.wave=wave;g.waveSpawned=0;
 Object.assign(g.player,{x:1600,y:400,flying});
 for(let i=0;i<waveDifficulty(wave).total;i++)g.spawnEnemy(0,0,{x:1700,y:400});
 return g.enemies;
}

test('每组五波重置种类，少量开局依次教学，成熟编成保留全部兵种',()=>{
 for(const start of [1,6,11,16,96]){
  assert.ok(wave(start,.99,true).every(e=>!e.flying&&!RANGED_ENEMIES[e.species]&&e.species!==ARMORED.id));
  const second=wave(start+1);if(second.length>=8)assert.ok(second.some(e=>e.flying));
  if(second.length>=16)assert.ok(second.some(e=>RANGED_ENEMIES[e.species]));
  assert.ok(second.every(e=>e.species!=='bramble-buggy'&&e.species!=='stump-bombard'&&e.species!==ARMORED.id));
  const third=wave(start+2);assert.ok(third.some(e=>['spore-spitter','acorn-slinger','reed-archer'].includes(e.species)));
  if(third.length>=16)assert.ok(third.some(e=>e.flying));
  if(third.length>=24)assert.ok(third.some(e=>e.species==='bramble-buggy'));
  if(third.length>=32)assert.ok(third.some(e=>e.species===ARMORED.id));
  const fourth=wave(start+3);assert.ok(fourth.some(e=>e.species===ARMORED.id));if(fourth.length>=16)assert.ok(fourth.some(e=>e.species==='bramble-buggy'));
  const fifth=wave(start+4);if(fifth.length>=16)assert.ok(fifth.some(e=>e.species==='stump-bombard'));
 }
});

test('极端随机、飞行载具及高波次下任意出生前缀都有至少七倍团子',()=>{
 for(const n of [1,2,3,4,5,6,17,50,100])for(const roll of [0,.5,.999]){
  let slime=0,special=0;
  const enemies=wave(n,roll,true);
  for(const e of enemies){if(e.flying||RANGED_ENEMIES[e.species]||e.species===ARMORED.id)special++;else slime++;assert.ok(slime>=special*7);}
  assert.ok(enemies.filter(e=>RANGED_ENEMIES[e.species]).length<=RANGED_LIMITS.alive);
  assert.ok(enemies.filter(e=>e.species===ARMORED.id).length<=ARMORED.maxAlive);
 }
});

test('增加普通怪不改变整波奖励预算，死亡与刷新不重置完成节点',()=>{
 for(let n=1;n<=25;n++)assert.equal(Array.from({length:waveDifficulty(n).total},(_,i)=>waveRewardAmount(n,i,3)).reduce((a,b)=>a+b,0),waveRewardTotal(n)*3);
 for(const n of [2,5,10,15,20])for(const state of ['active','dead']){
  const old={version:1,state,wave:n,waveKills:legacyWaveTotal(n),bossReady:n%5===0,waveRest:n%5?2:0,bossWave:Math.ceil(n/5)*5};
  const saved=validatePatrol(old);assert.equal(saved.wave,n);assert.equal(saved.waveKills,waveDifficulty(n).total);assert.equal(saved.bossReady,old.bossReady);
  assert.deepEqual(validatePatrol(saved),saved);
  const ongoing=validatePatrol({...old,bossReady:false,waveRest:0,waveKills:2});assert.equal(ongoing.waveKills,Math.ceil(2*waveDifficulty(n).total/legacyWaveTotal(n)));
 }
});
