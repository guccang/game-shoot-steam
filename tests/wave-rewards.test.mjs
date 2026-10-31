import {BOSS_CLEARING} from '../src/config/settlements.js';
// 短波奖励专项：正式击杀、整数预算、材料抽取及存档续接，不修改战斗配额。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {waveDifficulty,clearingWaveBudget,clearingKillReward} from '../src/config/waves.js';
import {forestReward} from '../src/config/economy.js';
import {awardMaterials} from '../src/progression/material-loot.js';
import {MATERIAL_CAP} from '../src/config/materials.js';
import {capturePatrol} from '../src/core/patrol-session.js';

// 固定同区域同阶级，排除怪物构成不同造成的收益差异。
function arena(wave=5){const g=new Game(freshProgress(),()=>.99);g.start();g.progress.living.patrolActive=true;Object.assign(g.player,{x:BOSS_CLEARING.x,y:BOSS_CLEARING.y});g.waveWarning=0;g.wave=wave;g.bossWave=wave;g.waveKills=g.waveSpawned=0;g.enemies=[];g.trees=[];return g;}
// 正式生成、命中和结算；同一尸体再次命中用于验证重复奖励保护。
function kill(g,context=null){const e=g.spawnEnemy(0,100,null,context);Object.assign(e,{reward:15,rank:0,biome:'meadow'});g.hit(e,1e9);g.hit(e,1e9);return e;}
// 固定随机流可比较少量怪多次抽取与原怪数单次抽取的完整结果。
function seeded(){let n=17;return()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/2**32);}

test('清缴不产金币，原木材与整波材料预算保留，后期仍有封顶',()=>{
 for(const wave of [1,2,3,4,5,6,10,15,25,100]){
  const budget=clearingWaveBudget(wave),total=waveDifficulty(wave).total;
  for(const key of ['coins','wood','attempts']){
   const shares=Array.from({length:total},(_,i)=>clearingKillReward(wave,i)[key]);
   assert.ok(shares.every(Number.isInteger));assert.equal(shares.reduce((a,b)=>a+b,0),budget[key]);
   assert.ok(Math.max(...shares)-Math.min(...shares)<=1);
   assert.equal(clearingKillReward(wave,total)[key],0);
  }
 }
 assert.equal([1,2,3,4,5].reduce((n,w)=>n+clearingWaveBudget(w).coins,0),0);
 assert.equal([96,97,98,99,100].reduce((n,w)=>n+clearingWaveBudget(w).coins,0),0);
 const g=arena(),before={coins:g.progress.coins,wood:g.progress.wood},total=waveDifficulty(5).total;
 for(let i=0;i<total;i++)kill(g);
 assert.equal(g.waveKills,total);assert.equal(g.kills,total);
 for(const key of ['coins','wood']){
  const n=clearingWaveBudget(5)[key];assert.equal(g.progress[key]-before[key],n);
  assert.equal(g.progress.economyLog.income['forest:enemy:'+key]||0,n);assert.equal(g.drops.reduce((n,d)=>n+d[key],0),n);
 }
});

test('材料预算与保底同源，零次抽取不误发，普通和精英序列守恒',()=>{
 for(const rank of [0,2])for(const biome of ['meadow','pine']){
  const a=freshProgress(),b=freshProgress(),ra=seeded(),rb=seeded(),target={type:'enemy',rank,biome};
  for(let i=0;i<waveDifficulty(5).total;i++)awardMaterials(a,target,ra,clearingKillReward(5,i).attempts);
  for(let i=0;i<clearingWaveBudget(5).attempts;i++)awardMaterials(b,target,rb);
  assert.deepEqual(a.materials,b.materials);assert.deepEqual(a.materialPity,b.materialPity);assert.equal(ra(),rb());
 }
 const p=freshProgress();p.materials.parts=MATERIAL_CAP-1;
 const r=awardMaterials(p,{type:'enemy',rank:2,biome:'pine'},()=>1,3);
 assert.equal(r.parts,1);assert.equal(p.materials.parts,MATERIAL_CAP);
});

test('中途刷新或死亡续接原分摊序号，剩余怪清完不漏奖也不重发',()=>{
 for(const death of [false,true]){
  let g=arena();const before={coins:g.progress.coins,wood:g.progress.wood},base=forestReward('enemy',15,g.progress);
  for(let i=0;i<4;i++)kill(g);
  if(death){g.hurt(1e9);g.start();}
  g.progress.patrol=capturePatrol(g);g=new Game(JSON.parse(JSON.stringify(g.progress)),()=>.99);g.pause();g.trees=[];
  assert.equal(g.waveKills,4);
  for(let i=4;i<waveDifficulty(5).total;i++)kill(g);
  for(const key of ['coins','wood'])assert.equal(g.progress[key]-before[key],clearingWaveBudget(5)[key]);
  assert.equal(g.progress.materials.core,0);
 }
});

test('波次回收不发奖，随机遭遇与领主援军只领取一份且不占分摊序号',()=>{
 const g=arena(),base=forestReward('enemy',15,g.progress),before=g.progress.coins;
 Object.assign(g.player,{x:450,y:1000});
 for(const context of [{ambient:true},{bossOwner:99}])kill(g,context);
 assert.equal(g.progress.coins-before,base.coins*2);assert.equal(g.waveKills,0);
 assert.deepEqual(g.progress.materialPity,{parts:2,crystal:2});
 const e=g.spawnEnemy(0,1700),coins=g.progress.coins;
 // 回收入口仅退还配额，避免远离地图反复领取预算。
 return import('../src/core/enemy-manager.js').then(({recycleEnemies})=>{
  recycleEnemies(g);assert.ok(!g.enemies.includes(e));assert.equal(g.progress.coins,coins);assert.equal(g.waveKills,0);
  Object.assign(g.player,{x:BOSS_CLEARING.x,y:BOSS_CLEARING.y});kill(g);assert.equal(g.progress.coins-coins,clearingKillReward(5,0).coins);
 });
});
