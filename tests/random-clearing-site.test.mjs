// 随机清缴覆盖真实地图选点、原子接取、导航、存档、整轮结算及历史任务。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {CLEARING_APPROACH,CLEARING_SITE_RULES} from '../src/config/clearing.js';
import {BOSS_CLEARING} from '../src/config/settlements.js';
import {worldDistance} from '../src/world/coordinates.js';
import {settlementAt} from '../src/world/settlements.js';
import {acceptClearingPost,clearingStage} from '../src/core/story/clearing-guide.js';
import {chooseClearingSite,clearingSiteOpen} from '../src/core/story/clearing-site.js';
import {clearingSite,normalizeClearingSite} from '../src/progression/story/clearing-site.js';
import {setLivingPatrol} from '../src/core/camp/living-world.js';
import {livingWaveAllowed} from '../src/core/camp/living-safety.js';
import {worldNavigationObjective} from '../src/core/navigation/world-navigation.js';
import {settlementObjects} from '../src/rendering/settlements.js';
import {planQuestRoute} from '../src/physics/quest-route.js';
import {capturePatrol} from '../src/core/battle/patrol-session.js';
import {biomeAt} from '../src/world/biomes.js';
// 可重复随机序列只服务测试，仍使用正式树木、地形与接取事务。
function scene(seed=9){const g=new Game(freshProgress(),()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32));g.start();g.mainlineSpeech=null;Object.assign(g.player,{x:CLEARING_APPROACH.x,y:CLEARING_APPROACH.y});return g;}
// 移动只写位置，不把地点半径覆盖到玩家碰撞尺寸。
function arrive(g,p=clearingSite(g.progress)){Object.assign(g.player,{x:p.x,y:p.y});}

test('高等级委托在1000–3000真实距离内生成可步行到达的战场，安全圈不侵入聚落',()=>{
 const points=new Set();for(let i=1;i<=12;i++){
  const g=scene(i);g.progress.bosses=8;const site=chooseClearingSite(g);assert.ok(site);const distance=worldDistance(g.player,site);assert.ok(distance>=1000&&distance<=3000);assert.equal(settlementAt(site,site.radius),null);assert.ok(clearingSiteOpen(site,g.trees));
  assert.ok(planQuestRoute({...g.player,flying:false,amphibious:false,arena:null,mapId:'forest',livingCollision:true},site,g.trees,16000).reachable);points.add(`${site.x},${site.y}`);
 }assert.ok(points.size>=10);
});
test('新手首轮地点及完整步行路线留在草甸，暂停重接仍可找到安全新点',()=>{
 const points=new Set();
 for(let seed=1;seed<=32;seed++){
  const g=scene(seed);
  for(let attempt=0;attempt<2;attempt++){
   const site=chooseClearingSite(g);assert.ok(site,`种子 ${seed} 第 ${attempt} 次`);
   assert.equal(biomeAt(site.x,site.y).id,'meadow');assert.ok(clearingSiteOpen(site,g.trees));
   const distance=worldDistance(g.player,site);assert.ok(distance>=600&&distance<=1300);
   const route=planQuestRoute({...g.player,mapId:'forest',livingCollision:true},site,g.trees,16000);assert.ok(route.reachable);
   for(let i=1;i<route.points.length;i++){
    const a=route.points[i-1],b=route.points[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/8);
    for(let j=0;j<=steps;j++)assert.equal(biomeAt(a.x+(b.x-a.x)*j/steps,a.y+(b.y-a.y)*j/steps).id,'meadow');
   }
   if(attempt)assert.ok(worldDistance(site,g.progress.living.clearingSite)>=250);
   g.progress.living.clearingSite=site;points.add(`${site.x},${site.y}`);
  }
 }
 assert.ok(points.size>=24);
});
test('重复确认及刷新固定地点，到新场地才刷怪，旧东林点不再启动新任务',()=>{
 const g=scene();g.progress.bosses=1;assert.ok(acceptClearingPost(g).ok);const site=structuredClone(clearingSite(g.progress));assert.equal(clearingStage(g),'travel');assert.deepEqual(worldNavigationObjective(g).site,site);
 assert.ok(acceptClearingPost(g).ok);assert.deepEqual(clearingSite(g.progress),site);arrive(g,BOSS_CLEARING);assert.equal(livingWaveAllowed(g),false);g.updateWaves(20);assert.equal(g.enemies.length,0);
 arrive(g);assert.ok(livingWaveAllowed(g));g.updateWaves(10);g.updateWaves(1);assert.ok(g.enemies.some(e=>e.wave===g.wave));
 const saved=validateProgress({...g.progress,patrol:capturePatrol(g)}),loaded=new Game(saved,()=>.8);loaded.start();assert.deepEqual(clearingSite(loaded.progress),site);assert.ok(livingWaveAllowed(loaded));assert.ok(settlementObjects(loaded).some(o=>o.id===site.id&&o.x===site.x&&o.y===site.y));
});
test('整轮五波和领主在随机场地完成，下一次重新选点且没有重复结算',()=>{
 const g=scene();assert.ok(acceptClearingPost(g).ok);const first=structuredClone(clearingSite(g.progress));arrive(g);let killed=0;
 for(let i=0;i<600&&!g.boss;i++){g.updateWaves(.5);for(const e of g.enemies.filter(e=>e.hp>0)){g.hit(e,1e9);killed++;}}
 assert.ok(g.boss,'五波结束自动领主');assert.equal(killed,30);const boss=g.boss;g.hit(boss,1e9);g.hit(boss,1e9);assert.equal(g.progress.bosses,1);assert.equal(g.progress.campLevel.xp,180);assert.equal(g.progress.living.patrolActive,false);assert.ok(!settlementObjects(g).some(o=>o.id===first.id));
 arrive(g,CLEARING_APPROACH);assert.ok(acceptClearingPost(g).ok);assert.ok(worldDistance(first,clearingSite(g.progress))>=CLEARING_SITE_RULES.minSeparation);assert.equal(g.progress.campLevel.xp,180);
});
test('暂停后重接更换地点但保留波次计数，死亡和受伤领主续档不换点',()=>{
 const g=scene();assert.ok(acceptClearingPost(g).ok);const first=clearingSite(g.progress);g.waveKills=g.waveSpawned=1;assert.ok(setLivingPatrol(g,false).ok);assert.ok(acceptClearingPost(g).ok);assert.equal(g.waveKills,1);assert.ok(worldDistance(first,clearingSite(g.progress))>=250);
 arrive(g);const site=structuredClone(clearingSite(g.progress));g.hurt(1e9);assert.equal(g.state,'dead');g.start();assert.deepEqual(clearingSite(g.progress),site);arrive(g);g.wave=g.bossWave;g.bossReady=true;assert.ok(g.summonBoss());g.boss.hp=Math.floor(g.boss.maxHp/2);
 const saved=validateProgress({...g.progress,patrol:capturePatrol(g)});delete saved.living.position;const loaded=new Game(validateProgress(saved),()=>.2);assert.deepEqual(clearingSite(loaded.progress),site);assert.ok(worldDistance(loaded.player,site)<1);assert.equal(loaded.boss.hp,g.boss.hp);
});
test('写盘失败或没有可达地点时原任务和追踪不变',()=>{
 const g=scene(),before=structuredClone(g.progress);g.livingPersist=()=>false;assert.equal(acceptClearingPost(g).ok,false);assert.deepEqual(g.progress,before);
 g.livingPersist=()=>true;g.trees=[{x:g.player.x,y:g.player.y,radius:10000,hp:1}];assert.equal(acceptClearingPost(g).ok,false);assert.deepEqual(g.progress,before);
});
test('旧在途清缴保留东林位置，坏坐标不进入新存档',()=>{
 const p=freshProgress();p.living.patrolActive=true;delete p.living.clearingSite;const old=validateProgress(p);assert.deepEqual(clearingSite(old),BOSS_CLEARING);
 for(const raw of [{x:NaN,y:0,origin:{x:0,y:0}},{x:3600,y:0,origin:{x:0,y:0}},{x:50,y:0,origin:{x:0,y:0}}])assert.equal(normalizeClearingSite(raw),null);
 const g=scene();assert.ok(acceptClearingPost(g).ok);const saved=validateProgress(JSON.parse(JSON.stringify(g.progress)));assert.deepEqual(validateProgress(saved),saved);
});
