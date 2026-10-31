// 只覆盖移动遭遇及直接相交的波次、领主、地图和专属战斗边界。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game, freshProgress} from '../src/game.js';
import {ENCOUNTERS} from '../src/config/encounters.js';
import {updateEncounters, resetEncounters} from '../src/core/encounter-manager.js';
import {recycleEnemies} from '../src/core/enemy-manager.js';
import {waveDifficulty} from '../src/config/waves.js';
import {arrivalRecycleRadius} from '../src/core/enemy-arrival.js';
import {terrainBlocked} from '../src/physics/terrain-navigation.js';
import {worldDistance} from '../src/world/coordinates.js';

// 使用真实怪物工厂，固定随机源便于比较独立计数和属性。
function arena(){const p=freshProgress();p.mapId='jiuzhaigou';const g=new Game(p,()=>.5);g.start();g.bossReady=true;g.trees=[];g.setViewport(390,844);g.attackTimer=999;return g;}
// 从正式遭遇调度触发一只，不直接伪造怪物对象。
function encounter(g){g.encounterTimer=0;updateEncounters(g,.1,true);return g.enemies.findLast(e=>e.ambient);}

test('主动实际移动才累计遭遇，停留和被动位移不触发；波次可在原地生成',()=>{
 const g=arena();g.bossReady=true;g.encounterTimer=.01;
 g.update(.1,{x:0,y:0});assert.equal(g.encounterSpawned,0);assert.equal(g.encounterTimer,.01);
 g.player.pushX=100;g.update(.1,{x:0,y:0});assert.equal(g.encounterSpawned,0);g.player.pushX=0;
 g.update(.1,{x:1,y:0});assert.equal(g.encounterSpawned,1);assert.equal(g.waveSpawned,0);
 g.bossReady=false;g.waveWarning=0;g.update(.1,{x:0,y:0});assert.equal(g.waveSpawned,1);assert.equal(g.encounterSpawned,1);
});

test('遭遇有独立4至8秒间隔与六只上限，低帧率不追补整批',()=>{
 const g=arena();for(const random of [0,1]){g.random=()=>random;resetEncounters(g);assert.equal(g.encounterTimer,random?8:4);}
 g.random=()=>.5;resetEncounters(g);updateEncounters(g,5.9,true);assert.equal(g.encounterSpawned,0);
 updateEncounters(g,.1,true);assert.equal(g.encounterSpawned,1);assert.equal(g.encounterTimer,6);
 updateEncounters(g,100,true);assert.equal(g.encounterSpawned,2);
 while(g.enemies.length<ENCOUNTERS.maxAlive)encounter(g);
 const timer=g.encounterTimer;updateEncounters(g,100,true);assert.equal(g.enemies.length,6);assert.equal(g.encounterTimer,timer);
});

test('遭遇击杀和远处回收不改波次名额、击杀、补兵等待或Boss资格',()=>{
 const g=arena(),e=encounter(g);g.bossReady=false;g.respawnDelay=7;const coins=g.progress.coins;
 assert.equal(e.wave,0);assert.equal(g.waveSpawned,0);g.hit(e,1e9);
 assert.equal(g.kills,1);assert.ok(g.progress.coins>coins);assert.equal(g.waveKills,0);assert.equal(g.waveSpawned,0);assert.equal(g.respawnDelay,7);assert.equal(g.bossReady,false);
 g.bossReady=true;const far=encounter(g);g.bossReady=false;Object.assign(far,{x:g.player.x+1700,y:g.player.y+1300});const kills=g.kills;
 assert.ok(worldDistance(far,g.player)>arrivalRecycleRadius(g));recycleEnemies(g);
 assert.equal(g.enemies.length,0);assert.equal(g.waveSpawned,0);assert.equal(g.kills,kills);
});

test('遭遇怪不占波次存活上限，也不阻挡清波与手动节点',()=>{
 const g=arena();g.wave=2;for(let i=0;i<6;i++)encounter(g);
 g.bossReady=false;for(let i=0;i<12;i++)g.spawnEnemy(i,100);g.waveWarning=0;g.waveElapsed=0;g.spawnTimer=0;
 g.updateWaves(.2);assert.equal(g.waveSpawned,13);
 g.enemies=g.enemies.filter(e=>e.ambient);g.wave=g.bossWave;g.waveKills=g.waveSpawned=waveDifficulty(g.wave).total;
 g.updateWaves(.1);assert.equal(g.bossReady,true);assert.equal(g.enemies.length,6);
 const coins=g.progress.coins,kills=g.kills,waveKills=g.waveKills;assert.equal(g.summonBoss(),true);
 assert.equal(g.enemies.length,6);assert.equal(g.progress.coins,coins);assert.equal(g.kills,kills);assert.equal(g.waveKills,waveKills);
});

test('等待Boss仍可移动遭遇，暂停、死亡、Boss、剧情、秘境均冻结遭遇',()=>{
 const g=arena();g.bossReady=true;assert.ok(encounter(g));
 for(const key of ['boss','story','realm']){g[key]={};g.encounterTimer=3;updateEncounters(g,100,true);assert.equal(g.encounterTimer,3);g[key]=null;}
 for(const state of ['paused','dead']){g.state=state;updateEncounters(g,100,true);assert.equal(g.encounterTimer,3);}
 assert.equal(g.encounterSpawned,1);
});

test('遭遇属性与波次和配额无关，按玩家所在区域使用当地基础属性',()=>{
 const a=arena(),b=arena();b.wave=30;b.waveSpawned=99;b.recoveryRun=true;
 const x=encounter(a),y=encounter(b);for(const key of ['name','hp','damage','speed','flying','rank'])assert.equal(x[key],y[key],key);
 assert.equal(b.waveSpawned,99);b.player.flying=true;assert.equal(encounter(b).flying,true);
});

test('森林和九寨沟遭遇落点安全且在周围，切图只清理当地遭遇',()=>{
 const g=arena();const waveEnemy=g.spawnEnemy(0,100);waveEnemy.hp=5;const quota=g.waveSpawned;
 for(const map of ['forest','jiuzhaigou']){
  if(g.mapId!==map){g.switchMap(map);assert.equal(g.enemies.some(e=>e.ambient),false);assert.ok(g.encounterTimer>=4);}
  if(map==='forest')Object.assign(g.player,{x:450,y:1000});
  for(let i=0;i<6;i++){const e=encounter(g);assert.ok(e);assert.equal(terrainBlocked(e.x,e.y,28,map),false);assert.ok(worldDistance(e,g.player)>=440);assert.ok(worldDistance(e,g.player)<arrivalRecycleRadius(g));}
 }
 assert.equal(waveEnemy.hp,5);assert.equal(g.waveSpawned,quota);
});

test('没有画外安全落点则重试，不贴脸兜底或占用任何配额',()=>{
 const g=arena();g.arrivalView={width:390,height:844,left:-2000,right:2000,top:-1600,bottom:1600};
 assert.equal(encounter(g),undefined);assert.equal(g.encounterSpawned,0);assert.equal(g.waveSpawned,0);assert.equal(g.encounterTimer,1);
 g.arrivalView=null;updateEncounters(g,1,true);assert.equal(g.encounterSpawned,1);
});

test('剧情和秘境往返恢复原遭遇状态，不串入专属战场',()=>{
 const g=arena(),e=encounter(g);g.mapId='forest';Object.assign(g.player,{x:970,y:790});g.encounterTimer=2;assert.ok(g.enterStory());assert.equal(g.enemies.includes(e),false);
 g.leaveStory();assert.ok(g.enemies.includes(e));assert.equal(g.encounterTimer,2);
 g.start();g.enterRealm('tower');assert.ok(g.realm);assert.equal(g.enemies.includes(e),false);
 g.leaveRealm();assert.ok(g.enemies.includes(e));assert.equal(g.encounterTimer,2);
});

// 移动遭遇有独立远程名额，不依赖近战存活，也不改变波次计数。
test('野外每三个遭遇名额可混入一只远程，仍以近战为主',()=>{
 const g=arena();g.random=()=>0;for(let i=0;i<6;i++)encounter(g);
 assert.equal(g.enemies.filter(e=>['spore-spitter','acorn-slinger','reed-archer','bramble-buggy','stump-bombard'].includes(e.species)).length,2);
 assert.equal(g.waveSpawned,0);assert.equal(g.encounterSpawned,6);
});

// 波次预警、组内休整和正式刷怪统一关闭随机刷怪；计时冻结而非积累后补刷。
test('整组波次暂停随机刷怪，进入等待节点后恢复原剩余计时',()=>{
 const g=arena(),existing=encounter(g);g.bossReady=false;g.encounterTimer=.5;
 for(const phase of [{waveWarning:3,waveRest:0},{waveWarning:0,waveRest:0},{waveWarning:0,waveRest:3}]){
  Object.assign(g,phase);updateEncounters(g,100,true);
  assert.equal(g.encounterTimer,.5);assert.equal(g.encounterSpawned,1);assert.ok(g.enemies.includes(existing));
 }
 g.waveRest=0;g.wave=g.bossWave;g.waveKills=g.waveSpawned=waveDifficulty(g.wave).total;
 g.updateWaves(.1);assert.equal(g.bossReady,true);assert.ok(g.enemies.includes(existing));
 updateEncounters(g,.4,true);assert.equal(g.encounterSpawned,1);
 updateEncounters(g,.1,true);assert.equal(g.encounterSpawned,2);
});

// 从真实召唤、领主末击到下一波入口，已有怪物保持原实体和血量，不参与额外结算。
test('开Boss及下一组波次保留已有怪物，实际移动也不再随机补怪',()=>{
 const g=arena(),existing=encounter(g);existing.hp=7;
 g.wave=g.bossWave;g.waveKills=g.waveSpawned=waveDifficulty(g.wave).total;
 const kills=g.kills,coins=g.progress.coins;assert.ok(g.summonBoss());
 assert.ok(g.enemies.includes(existing));assert.equal(existing.hp,7);assert.equal(g.progress.coins,coins);
 g.encounterTimer=.01;updateEncounters(g,100,true);assert.equal(g.encounterSpawned,1);
 g.hit(g.boss,1e9);assert.equal(g.progress.coins,coins+180);assert.equal(g.kills,kills);assert.ok(g.enemies.includes(existing));
 const wave=g.wave;g.updateWaves(3);assert.equal(g.wave,wave+1);assert.equal(g.waveWarning,3);
 g.player.invincible=999;g.update(.1,{x:1,y:0});assert.equal(g.encounterSpawned,1);assert.equal(g.encounterTimer,.01);
 assert.ok(g.enemies.includes(existing));assert.equal(existing.hp,7);assert.equal(g.waveKills,0);
 g.hit(existing,1e9);assert.equal(g.kills,kills+1);assert.equal(g.waveKills,0);assert.equal(g.bossReady,false);
});
