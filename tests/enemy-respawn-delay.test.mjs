// 清缴连续入场回归：击杀不暂停，保留五波编成、单帧上限和旧档进度。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {recordWaveKill} from '../src/core/wave-manager.js';
import {waveDifficulty} from '../src/config/waves.js';
import {clearingSpawnKind} from '../src/config/clearing-enemies.js';
import {RANGED_ENEMIES} from '../src/config/ranged-enemies.js';
import {capturePatrol} from '../src/core/patrol-session.js';
import {validatePatrol} from '../src/progression/patrol-progress.js';

// 清缴场使用正式出生与击杀，只禁用自动射击和树木对采样时刻的干扰。
function arena(wave=2){
 const p=freshProgress();p.living.patrolActive=true;p.living.position={x:1600,y:400};
 const g=new Game(p,()=>.5);g.start();g.trees=[];g.enemies=[];g.wave=wave;g.bossWave=5;
 g.waveKills=g.waveSpawned=g.waveWarning=g.waveRest=g.spawnTimer=0;g.attackTimer=999;return g;
}
// 按真实兵种读取配比，不以显示名称判断分类。
function kind(e){return e.flying?'flying':e.species==='bramble-buggy'?'vehicle':e.species==='stump-bombard'?'heavy':e.species==='ironwood-bulwark'?'armored':RANGED_ENEMIES[e.species]?'ranged':'slime';}

test('连续击杀不重置入场节拍，残留旧等待也不能暂停本波',()=>{
 const g=arena();g.updateWaves(.01);assert.equal(g.waveSpawned,1);const timer=g.spawnTimer;
 g.hit(g.enemies[0],1e9);assert.equal(g.spawnTimer,timer);assert.equal(g.respawnDelay,0);
 g.respawnDelay=10;g.updateWaves(timer-.01);assert.equal(g.waveSpawned,1);g.updateWaves(.011);assert.equal(g.waveSpawned,2);
 g.hit(g.enemies.at(-1),1e9);g.updateWaves(.21);assert.equal(g.waveSpawned,3);assert.equal(g.waveKills,2);assert.equal(g.respawnDelay,0);
});
test('击杀登记不抽取额外随机数，也不改变出生节拍',()=>{
 const g=arena();g.spawnTimer=.15;g.random=()=>{throw Error('击杀不应再抽取补刷等待');};
 recordWaveKill(g,{type:'enemy',wave:2});assert.equal(g.waveKills,1);assert.equal(g.spawnTimer,.15);
});
test('五波边刷边击杀仍保持4/8/16/20/24配额、原编成和有限间隔',()=>{
 const g=arena(1),totals=[4,8,16,20,24];
 for(let wave=1;wave<=5;wave++){
  assert.equal(g.wave,wave);const kinds=[],times=[];let time=0;
  for(let i=0;i<400&&g.waveSpawned<totals[wave-1];i++){
   time+=.05;const before=g.waveSpawned;g.updateWaves(.05);
   assert.ok(g.waveSpawned-before<=1);
   if(g.waveSpawned>before){const e=g.enemies.find(e=>e.hp>0);kinds.push(kind(e));times.push(time);g.hit(e,1e9);}
  }
  assert.equal(g.waveSpawned,totals[wave-1]);assert.equal(g.waveKills,totals[wave-1]);
  assert.deepEqual(kinds,Array.from({length:totals[wave-1]},(_,i)=>clearingSpawnKind(wave,i+1)));
  assert.ok(times.every((t,i)=>!i||t-times[i-1]<.3));
  g.updateWaves(.01);
  if(wave<5){assert.equal(g.waveRest,3);g.updateWaves(2.99);assert.equal(g.wave,wave);g.updateWaves(.01);assert.equal(g.wave,wave+1);assert.equal(g.waveWarning,0);}
  else {assert.ok(g.boss);assert.equal(g.waveRest,0);assert.equal(g.bossReady,true);}
 }
});
test('低帧率不瞬间追补整批，配额已满不额外生成',()=>{
 const g=arena();g.updateWaves(20);assert.equal(g.waveSpawned,1);
 for(let i=0;i<12;i++)g.updateWaves(20);
 assert.equal(g.waveSpawned,waveDifficulty(2).total);assert.equal(g.enemies.length,8);
});
test('暂停、死亡和离开清缴场冻结出怪计时，回来后仍正常入场',()=>{
 const g=arena();g.spawnTimer=.12;
 for(const state of ['paused','dead']){g.state=state;g.updateWaves(10);assert.equal(g.spawnTimer,.12);assert.equal(g.waveSpawned,0);}
 g.state='playing';g.player.x=2200;g.updateWaves(10);assert.equal(g.spawnTimer,.12);
 g.player.x=1600;g.updateWaves(.13);assert.equal(g.waveSpawned,1);
});
test('旧档各类击杀等待都清零，休整只续剩余时间且不丢击杀',()=>{
 const g=arena();g.waveKills=g.waveSpawned=waveDifficulty(2).total;g.waveRest=1.2;g.respawnDelay=9;
 const snapshot=capturePatrol(g);assert.equal(snapshot.respawnDelay,0);
 g.progress.patrol={...snapshot,respawnDelay:9};const restored=new Game(JSON.parse(JSON.stringify(g.progress)),()=>.5);
 assert.equal(restored.state,'paused');assert.equal(restored.wave,2);assert.equal(restored.waveKills,8);assert.equal(restored.waveRest,1.2);assert.equal(restored.waveWarning,0);assert.equal(restored.respawnDelay,0);
 restored.start();restored.updateWaves(1.19);assert.equal(restored.wave,2);restored.updateWaves(.01);assert.equal(restored.wave,3);assert.equal(restored.waveWarning,0);
 for(const value of [undefined,NaN,Infinity,-3,999,4.25])assert.equal(validatePatrol({...snapshot,respawnDelay:value}).respawnDelay,0);
});
