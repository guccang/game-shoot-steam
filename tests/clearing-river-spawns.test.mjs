// 清缴离岸刷怪回归：两岸、桥面、周期坐标与连续补兵共用正式出生逻辑。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {findNearbyArrivalSpot} from '../src/core/battle/enemy-arrival.js';
import {WAVE_ARRIVAL,waveDifficulty} from '../src/config/waves.js';
import {riverXAt,riverHalfWidth,isWaterBlocked} from '../src/world/river-geometry.js';
import {canonical,WORLD,worldDistance} from '../src/world/coordinates.js';
import {beginBossSupport,updateBossSupport} from '../src/core/battle/boss-reinforcements.js';
import {normalizeClearingSite} from '../src/progression/story/clearing-site.js';

// 不替换地形，只提供出生查询所需的场景与可重复随机序列。
function sampleGame(x,y){let seed=37;return {mapId:'forest',player:{x,y},trees:[],enemies:[],random:()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32)};}
// 从实际河道几何核对岸距，包含瀑布及循环世界镜像。
function assertInland(point){
 const p=canonical(point),dx=p.x-riverXAt(p.y);
 assert.ok(Math.abs(dx)-riverHalfWidth(p.y,dx<0?-1:1)>=80-1e-8,JSON.stringify(point));
 assert.equal(isWaterBlocked(p.x,p.y,80),false);
}

test('两岸和周期镜像的清缴出生点远离河岸，仍在原接敌范围',()=>{
 for(const y of [350,900,1200,1900])for(const side of [-1,1])for(const shift of [0,WORLD.width]){
  const g=sampleGame(riverXAt(y)+side*150+shift,y),spots=[];
  for(let i=0;i<40;i++){
   const spot=findNearbyArrivalSpot(g,i,WAVE_ARRIVAL);if(!spot)continue;
   assertInland(spot);assert.ok(worldDistance(g.player,spot)>=180-1e-8&&worldDistance(g.player,spot)<=300+1e-8);spots.push(spot);
  }
  assert.ok(spots.length>=20,`两岸仍有足够落点 ${y}/${side}/${shift}: ${spots.length}`);
 }
});

test('干地修正后贴岸及桥面点被拒绝，未配置离岸距离的其他刷怪保留原规则',()=>{
 for(const y of [729,1200]){
  const target={x:riverXAt(y)+(y===729?0:70),y},g=sampleGame(target.x+200,y);
  const range={minDistance:200,maxDistance:200,angle:Math.PI,spread:0};
  assert.ok(findNearbyArrivalSpot(g,0,range),'原规则仍可使用桥面或近岸');
  assert.equal(findNearbyArrivalSpot(g,0,{...range,riverClearance:80}),null);
 }
});

// 旧清缴场可能紧邻河岸，完整波次必须能换方向补齐且不改变配额。
function riverClearing(side){
 const p=freshProgress(),y=1500,x=riverXAt(y)+side*160;
 p.living.patrolActive=true;p.living.position={x,y};p.living.clearingSite=normalizeClearingSite({x,y,origin:{x:x+1100,y}});
 const g=new Game(p,()=>.5);g.start();g.trees=[];g.enemies=[];Object.assign(g.player,{x,y});
 g.wave=2;g.bossWave=5;g.waveSpawned=g.waveKills=g.waveWarning=g.waveRest=g.spawnTimer=0;return g;
}

test('旧河岸场地转向陆地补齐整波，不额外计数或少刷',()=>{
 for(const side of [-1,1]){
  const g=riverClearing(side),total=waveDifficulty(g.wave).total;let seen=0;
  for(let i=0;i<300&&g.waveKills<total;i++){
   g.updateWaves(.2);
   for(const enemy of g.enemies.filter(e=>e.hp>0)){assertInland(enemy);seen++;g.hit(enemy,1e9);}
  }
  assert.equal(seen,total);assert.equal(g.waveSpawned,total);assert.equal(g.waveKills,total);
 }
});

test('清缴领主召唤的援兵也在陆地内侧出现',()=>{
 const g=riverClearing(1);g.boss={id:999,hp:100,maxHp:100};assert.ok(beginBossSupport(g));
 for(let i=0;i<60;i++)updateBossSupport(g,.1);
 assert.ok(g.enemies.length>0);for(const enemy of g.enemies){assert.equal(enemy.bossOwner,999);assertInland(enemy);}
});
