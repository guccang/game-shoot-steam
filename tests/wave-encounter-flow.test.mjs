// 近距刷怪、随机怪共用波次名额与奖励、区域属性及安全边界的针对性回归。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {BOSS_CLEARING} from '../src/config/settlements.js';
import {waveDifficulty,clearingWaveBudget,WAVE_ARRIVAL} from '../src/config/waves.js';
import {ENCOUNTERS} from '../src/config/encounters.js';
import {updateEncounters,resetEncounters} from '../src/core/encounter-manager.js';
import {findNearbyArrivalSpot} from '../src/core/enemy-arrival.js';
import {worldDistance} from '../src/world/coordinates.js';
import {terrainLineClear,terrainBlocked} from '../src/physics/terrain-navigation.js';
import {BIOMES,enemyIdentity,biomeAt} from '../src/world/biomes.js';
import {livingSafePoint} from '../src/world/living-spaces.js';
import {recycleEnemies} from '../src/core/enemy-manager.js';
import {forestReward} from '../src/config/economy.js';
import {CLEARING_DENSITY} from '../src/config/clearing-difficulty.js';
// 使用实际清缴场与正式游戏工厂，不绕过真实奖励和死亡流程。
function scene(){let n=53;const g=new Game(freshProgress(),()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/2**32));g.start();g.trees=[];g.progress.living.patrolActive=true;Object.assign(g.player,BOSS_CLEARING);g.waveWarning=0;g.wave=5;g.bossWave=6;g.waveKills=g.waveSpawned=0;g.enemies=[];return g;}
// 同一区域同阶级的固定奖励用于验证分摊守恒，不依赖抽签构成。
function kill(g,ambient=false){const e=g.spawnEnemy(0,0,{x:1600,y:450},ambient?{ambient:true}:null);Object.assign(e,{reward:15,rank:0,biome:'meadow'});g.hit(e,1e9);g.hit(e,1e9);return e;}
test('手机、广角和循环地图都在180至300范围入场，落点干燥且能直达',()=>{
 const g=scene();for(const width of [320,390,1280]){g.setViewport(width,900);for(const p of [BOSS_CLEARING,{x:3590,y:2790},{x:1900,y:600}]){Object.assign(g.player,p);for(let i=0;i<12;i++){const s=findNearbyArrivalSpot(g,i,WAVE_ARRIVAL);assert.ok(s);const d=worldDistance(s,g.player);assert.ok(d>=180&&d<=300);assert.ok(!livingSafePoint(s));assert.ok(!terrainBlocked(s.x,s.y,28,'forest'));assert.ok(terrainLineClear({...g.player,mapId:'forest'},s,20));}}}
});
test('无近处安全落点时不远距兜底，不占配额；末尾补兵不再等待十秒',()=>{
 const g=scene();g.trees=Array.from({length:40},(_,i)=>({x:g.player.x+Math.cos(i)*240,y:g.player.y+Math.sin(i)*240,radius:400,hp:1}));g.updateWaves(.2);assert.equal(g.waveSpawned,0);
 // 补兵等待已由正式调度控制，检查下一次更新实际生成敌人。
 g.trees=[];g.waveKills=g.waveSpawned=waveDifficulty(g.wave).total-3;kill(g);g.updateWaves(CLEARING_DENSITY.spawnInterval);assert.ok(g.enemies.some(e=>e.hp>0));
});
test('混合击杀共用名额与原奖励预算，重复命中不重复计数或发奖',()=>{
 const g=scene(),before={coins:g.progress.coins,wood:g.progress.wood},base=forestReward('enemy',15,g.progress),total=waveDifficulty(g.wave).total;
 for(let i=0;i<total;i++)kill(g,i%2===0);
 assert.equal(g.waveKills,total);assert.equal(g.waveSpawned,total);for(const key of ['coins','wood'])assert.equal(g.progress[key]-before[key],clearingWaveBudget(g.wave)[key]);
});
test('计数达标立即休整，余怪保留为地图怪；下一波可以继续计数',()=>{
 const g=scene(),total=waveDifficulty(g.wave).total;g.waveKills=total-1;g.waveSpawned=total;
 const leftover=g.spawnEnemy(0,0,{x:1800,y:400}),hp=leftover.hp;kill(g,true);g.updateWaves(.1);
 assert.equal(g.waveRest,3);assert.ok(g.enemies.includes(leftover));assert.equal(leftover.hp,hp);assert.equal(leftover.ambient,true);assert.equal(leftover.wave,0);
 g.updateWaves(3);g.updateWaves(3);g.hit(leftover,1e9);assert.equal(g.waveKills,1);
});
test('组末达标直接亮Boss节点；休整预警Boss和任务怪均不能冒充清缴击杀',()=>{
 const g=scene();g.bossWave=g.wave;g.waveKills=waveDifficulty(g.wave).total-1;kill(g,true);g.updateWaves(.1);assert.ok(g.bossReady||g.boss);
 const count=g.waveKills;kill(g,true);assert.equal(g.waveKills,count);
 for(const phase of ['rest','warning','boss','outside','mission','fire','support']){const s=scene();if(phase==='rest')s.waveRest=3;if(phase==='warning')s.waveWarning=3;if(phase==='boss')s.boss={hp:10};if(phase==='outside')s.player.x=2200;
 const e=s.spawnEnemy(0,0,{x:1600,y:450},{ambient:true});if(phase==='mission')e.livingRequest='neighbors-night';if(phase==='fire')e.fireEvent=true;if(phase==='support')e.bossOwner=8;s.hit(e,1e9);assert.equal(s.waveKills,0,phase);}
});
test('野外每2至4秒入场，上限14只；波次、安全区、停止移动及专属战斗不刷',()=>{
 const g=scene();Object.assign(g.player,{x:1900,y:600});g.progress.living.patrolActive=false;for(const r of [0,1]){g.random=()=>r;resetEncounters(g);assert.equal(g.encounterTimer,r?4:2);}
 g.random=()=>.5;g.encounterTimer=.1;updateEncounters(g,.1,false);assert.equal(g.enemies.length,0);updateEncounters(g,.1,true);assert.equal(g.enemies.length,1);
 // 上限只依赖存活数量，不以累计生成量判定。
 while(g.enemies.length<14)g.spawnEnemy(0,0,{x:1900+g.enemies.length*4,y:600},{ambient:true});g.encounterTimer=0;updateEncounters(g,100,true);assert.equal(g.enemies.length,14);
 g.enemies=[];Object.assign(g.player,{x:900,y:900});updateEncounters(g,100,true);assert.equal(g.enemies.length,0);
 Object.assign(g.player,BOSS_CLEARING);g.progress.living.patrolActive=true;updateEncounters(g,100,true);assert.equal(g.enemies.length,0);
 g.progress.living.patrolActive=false;g.fireRescue={phase:'active'};updateEncounters(g,100,true);assert.equal(g.enemies.length,0);
});
test('随机怪等级生命攻击按出生区域，不取玩家区域且不随波次增强',()=>{
 const g=scene();g.random=()=>.5;for(const zone of BIOMES){const expected=enemyIdentity(zone.x,zone.y,.5);const a=g.spawnEnemy(0,0,zone,{ambient:true});g.wave=80;const b=g.spawnEnemy(0,0,zone,{ambient:true});for(const key of ['level','biome','hp','damage','speed']){assert.equal(a[key],expected[key]);assert.equal(a[key],b[key]);}assert.ok(a.level>=zone.level&&a.level<=zone.level+2);assert.equal(biomeAt(a.x,a.y).id,a.biome);}
});
test('远处回收随机怪不记击杀也不发奖，继续移动不会无限堆怪',()=>{
 const g=scene(),e=g.spawnEnemy(0,0,{x:3300,y:1700},{ambient:true}),coins=g.progress.coins;recycleEnemies(g);assert.ok(!g.enemies.includes(e));assert.equal(g.waveKills,0);assert.equal(g.kills,0);assert.equal(g.progress.coins,coins);
});

// 飞行玩家越过河面时仍有干燥落点，不能把地面直线路径误用为空中限制。
test('飞行越河时允许近处陆地入场，地面玩家仍拒绝隔河直达',()=>{
 const g=scene();Object.assign(g.player,{x:1300,y:900,flying:true});
 const spot=findNearbyArrivalSpot(g,0,WAVE_ARRIVAL);assert.ok(spot);assert.ok(!terrainBlocked(spot.x,spot.y,28,'forest'));
 assert.ok(worldDistance(g.player,spot)<=300);
 g.player.flying=false;assert.equal(findNearbyArrivalSpot(g,0,WAVE_ARRIVAL),null);
});
