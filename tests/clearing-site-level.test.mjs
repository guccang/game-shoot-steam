// 清缴落点等级回归：使用真实森林、随机选点与正式步行路线，避免低级委托引到高级野外。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {CLEARING_APPROACH,CLEARING_SITE_RULES} from '../src/config/clearing.js';
import {ENCOUNTERS} from '../src/config/encounters.js';
import {chooseClearingSite} from '../src/core/clearing-site.js';
import {forestThreatAt} from '../src/world/forest-levels.js';
import {enemyIdentity} from '../src/world/biomes.js';
import {worldDistance} from '../src/world/coordinates.js';

// 同一组随机种子复现原三级委托抽到九级野外地点的问题。
function scene(level,seed){
 const p=freshProgress();p.bosses=level-1;
 const g=new Game(p,()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32));g.start();
 Object.assign(g.player,{x:CLEARING_APPROACH.x,y:CLEARING_APPROACH.y});return g;
}
// 检查圈内及附近刷新点的真实怪物等级，而非只检查任务显示数字。
function safe(point,radius,level){
 for(let i=0;i<16;i++){const angle=i*Math.PI/8,x=point.x+Math.cos(angle)*radius,y=point.y+Math.sin(angle)*radius;
  assert.ok(enemyIdentity(x,y,0).level<=Math.max(3,level),`任务${level}级，(${x},${y})怪物${enemyIdentity(x,y,0).level}级`);
 }
}
for(const level of [1,2,3,4,6,9,20])test(`${level}级委托地点及赶路刷怪范围符合等级，仍可重复选点`,()=>{
 for(const seed of [1,5,9,12]){
  const g=scene(level,seed);let route;
  for(let repeat=0;repeat<2;repeat++){
   const site=chooseClearingSite(g,r=>{route=r;});assert.ok(site,`等级${level}种子${seed}重接${repeat}`);
   assert.ok(forestThreatAt(site.x,site.y).level<=Math.max(3,level));safe(site,site.radius,level);
   for(let i=1;i<route.points.length;i++){
    const a=route.points[i-1],b=route.points[i],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/32));
    for(let n=0;n<=steps;n++)safe({x:a.x+(b.x-a.x)*n/steps,y:a.y+(b.y-a.y)*n/steps},ENCOUNTERS.maxDistance,level);
   }
   if(g.progress.living.clearingSite)assert.ok(worldDistance(site,g.progress.living.clearingSite)>=(level<=3?250:CLEARING_SITE_RULES.minSeparation));
   g.progress.living.clearingSite=site;
  }
 }
});

// 已接取的历史地点不擅自搬动；回营暂停重接保留战斗进度并获得安全新地点。
test('旧三级高等级地点重接后降到合适区域，波次和已击杀进度保留',async()=>{
 const {setLivingPatrol}=await import('../src/core/living-world.js');
 const {acceptClearingPost}=await import('../src/core/clearing-guide.js');
 const g=scene(3,5);g.progress.arrival=null;g.arrivalScene=null;g.mainlineSpeech=null;g.progress.restoration.repaired.push('clearing');
 g.progress.living.patrolActive=true;
 g.progress.living.clearingSite={id:'patrol-clearing',name:'本次清缴地点',mapId:'forest',x:2752.656031214032,y:2823.036705239221,radius:300,origin:{x:CLEARING_APPROACH.x,y:CLEARING_APPROACH.y}};
 assert.equal(forestThreatAt(g.progress.living.clearingSite.x,g.progress.living.clearingSite.y).level,9);
 g.wave=12;g.waveGroupStart=11;g.bossWave=15;g.waveKills=2;g.waveSpawned=2;
 assert.ok(setLivingPatrol(g,false).ok);assert.ok(acceptClearingPost(g).ok);
 const site=g.progress.living.clearingSite;safe(site,site.radius,3);
 assert.equal(g.wave,12);assert.equal(g.waveKills,2);assert.equal(g.progress.bosses,2);
 // 进入实际新场地后，五批任务怪始终显示三级，属性仍走原清缴成长。
 Object.assign(g.player,{x:site.x,y:site.y});
 for(let wave=11;wave<=15;wave++){g.wave=wave;g.waveSpawned=0;g.enemies=[];for(let i=0;i<8;i++)assert.equal(g.spawnEnemy(0,0,{x:site.x,y:site.y}).level,3);}
});
