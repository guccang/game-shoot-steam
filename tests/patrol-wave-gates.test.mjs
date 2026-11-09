// 分组怪潮、手动领主节点和外围波次刷新回归，不运行无关武器与美术测试。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {waveDifficulty,rollWaveGroup} from '../src/config/waves.js';
import {capturePatrol} from '../src/core/battle/patrol-session.js';
import {findArrivalSpot,arrivalRecycleRadius} from '../src/core/battle/enemy-arrival.js';
import {recycleEnemies} from '../src/core/battle/enemy-manager.js';
import {terrainBlocked} from '../src/physics/terrain-navigation.js';
import {worldDistance} from '../src/world/coordinates.js';
// 固定种子仅控制地点抽样，正式游戏负责出生、命中、结算和存档。
function arena(random=()=>.5){const g=new Game(freshProgress(),random);g.start();g.progress.living.patrolActive=true;Object.assign(g.player,{x:1600,y:400});g.trees=[];g.attackTimer=999;return g;}
// 用正式出生和致死命中清完一波，直接检查波次调度，不等待动画。
function clearWave(g){g.enemies=[];g.waveSpawned=g.waveKills=0;for(let i=0;i<waveDifficulty(g.wave).total;i++)g.hit(g.spawnEnemy(0,100),1e9);g.updateWaves(.01);}
// 模拟浏览器JSON持久化而非共享对象。
function reload(g){g.progress.patrol=capturePatrol(g);return new Game(JSON.parse(JSON.stringify(g.progress)),()=>.99);}

test('每组固定五波，逐波自动推进，清完节点只响应一次且自动出现领主',()=>{
 assert.deepEqual([0,.5,.999999].map(n=>rollWaveGroup(()=>n)),[5,5,5]);
 for(const seed of [0,.5,.99]){
  const length=5;
  const g=arena(()=>seed),events=[];g.onEvent=t=>events.push(t);assert.equal(g.bossWave,length);
  g.kills=1000;assert.equal(g.summonBoss(),false);
  for(let w=1;w<=length;w++){assert.equal(g.wave,w);clearWave(g);if(w<length){assert.equal(g.bossReady,false);assert.equal(g.summonBoss(),false);g.updateWaves(3);} }
  assert.equal(g.bossReady,true);assert.ok(g.boss);assert.equal(g.waveRest,0);
  for(let i=0;i<20;i++)g.updateWaves(10);assert.equal(g.wave,length);assert.equal(events.filter(e=>e==='boss-ready').length,1);
  assert.equal(g.enemies.filter(e=>e.hp>0).length,0);assert.equal(g.summonBoss(),false);
  const before=g.progress.coins,b=g.boss;g.hit(b,1e9);g.hit(b,1e9);assert.equal(g.progress.coins,before+180);
  assert.equal(g.bossReady,false);assert.equal(g.bossWave,length+length);assert.equal(g.summonBoss(),false);
  g.updateWaves(30);assert.equal(g.wave,length);assert.equal(g.progress.living.patrolActive,false);
 }
});

test('节点等待、领主血量、死亡自动重试与组长度跨刷新保留',()=>{
 const g=arena();for(let i=0;i<5;i++){clearWave(g);if(i<4)g.updateWaves(3);}
 let saved=reload(g);assert.equal(saved.bossReady,true);assert.equal(saved.bossWave,5);saved.start();saved.updateWaves(60);assert.equal(saved.wave,5);
 saved.summonBoss();saved.boss.hp-=10;saved=reload(saved);assert.equal(saved.bossReady,true);assert.ok(saved.boss.hp<saved.boss.maxHp);
 const hp=saved.boss.maxHp;saved.start();saved.hurt(1e9);saved=reload(saved);saved.start();Object.assign(saved.player,{x:1600,y:400});assert.equal(saved.wave,5);assert.equal(saved.boss,null);saved.updateWaves(.01);assert.ok(saved.boss);assert.equal(saved.boss.maxHp,hp);
 saved.hit(saved.boss,1e9);const target=saved.bossWave;saved=reload(saved);assert.equal(saved.bossWave,target);assert.equal(saved.bossReady,false);saved.start();saved.updateWaves(3);assert.equal(saved.wave,5);assert.equal(saved.progress.living.patrolActive,false);
});

test('旧击杀资格不绕过节点，旧的进行中领主迁移后仍可继续',()=>{
 const p=freshProgress();p.patrol={version:1,state:'active',wave:7,waveKills:5,kills:100,bossKillsAt:0,playerHp:120};
 const g=new Game(p,()=>.5);g.start();g.progress.living.patrolActive=true;Object.assign(g.player,{x:1600,y:400});assert.equal(g.bossWave,10);assert.equal(g.summonBoss(),false);
 clearWave(g);g.bossReady=true;g.summonBoss();g.progress.patrol=capturePatrol(g);delete g.progress.patrol.bossWave;delete g.progress.patrol.bossReady;
 const restored=new Game(g.progress);assert.ok(restored.boss);assert.equal(restored.bossReady,true);assert.equal(restored.waveKills,waveDifficulty(7).total);
});

test('波次怪在附近安全外围入场，切图节点仍保留',()=>{
 let seed=874;const g=arena(()=>((seed=(seed*1664525+1013904223)>>>0)/2**32));g.setViewport(390,844);
 for(const map of ['forest','jiuzhaigou']){
  if(map!==g.mapId)g.switchMap(map);g.enemies=[];g.trees=[];
  for(let i=0;i<20;i++){const p=findArrivalSpot(g);assert.ok(p);assert.equal(terrainBlocked(p.x,p.y,28,map),false);assert.ok(worldDistance(p,g.player)>=440);
   assert.ok(worldDistance(p,g.player)<arrivalRecycleRadius(g));g.spawnEnemy(0,0,p);}
  recycleEnemies(g);assert.equal(g.enemies.length,20);
 }
 g.switchMap('forest');Object.assign(g.player,{x:1600,y:400});g.enemies=[];g.bossWave=g.wave;clearWave(g);assert.equal(g.bossReady,true);g.updateWaves(100);assert.equal(g.enemies.filter(e=>e.hp>0).length,0);
});

test('暂停、剧情、秘境不推进普通节点，找不到安全点不消耗配额',()=>{
 const g=arena(),before=g.bossWave;g.pause();g.updateWaves(100);assert.equal(g.waveWarning,3);g.pause();
 g.story={};g.updateWaves(100);assert.equal(g.waveWarning,3);g.story=null;g.realm={};g.updateWaves(100);assert.equal(g.waveWarning,3);g.realm=null;
 g.setViewport(390,844);g.arrivalView={width:390,height:844,left:-2000,right:2000,top:-1600,bottom:1600};g.waveWarning=0;g.updateWaves(2);assert.equal(g.waveSpawned,0);assert.equal(g.bossWave,before);
});

test('等待领主时体验剧情或秘境，返回后仍停在同一个节点',()=>{
 const g=arena();for(let i=0;i<5;i++){clearWave(g);if(i<4)g.updateWaves(3);}const wave=g.wave,target=g.bossWave;
 Object.assign(g.player,{x:970,y:790});assert.equal(g.enterStory(),true);g.leaveStory();assert.equal(g.bossReady,true);assert.equal(g.wave,wave);assert.equal(g.bossWave,target);
 g.start();g.enterRealm('tower');assert.ok(g.realm);g.leaveRealm();assert.equal(g.bossReady,true);assert.equal(g.wave,wave);assert.equal(g.bossWave,target);
});
