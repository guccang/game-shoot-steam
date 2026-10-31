import {clearingSite} from '../src/progression/clearing-site.js';
import {acceptClearingPost} from '../src/core/clearing-guide.js';
import {CLEARING_APPROACH} from '../src/config/clearing.js';
import {BOSS_CLEARING} from '../src/config/settlements.js';
// 组进度回归覆盖清波、保存、领主重试和换组；不运行无关战斗数值测试。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {waveDifficulty} from '../src/config/waves.js';
import {CLEARING_DENSITY} from '../src/config/clearing-difficulty.js';
import {livingProtected,livingWaveAllowed} from '../src/core/living-safety.js';
import {setLivingPatrol} from '../src/core/living-world.js';
import {capturePatrol} from '../src/core/patrol-session.js';
import {validatePatrol} from '../src/progression/patrol-progress.js';
import {waveProgressState} from '../src/ui/wave-progress.js';

// 正式致死结算清除一波，跳过等待动画以专门验证进度状态。
function clearWave(g) {
  g.enemies=[];g.waveSpawned=g.waveKills=0;
  for(let i=0;i<waveDifficulty(g.wave).total;i++)g.hit(g.spawnEnemy(0,100),1e9);
  g.updateWaves(.01);
}
// JSON往返模拟浏览器存档，改变随机源验证不会重抽当前组。
function reload(g) {
  g.progress.patrol=capturePatrol(g);
  return new Game(JSON.parse(JSON.stringify(g.progress)),()=>.99);
}
test('所有随机源均保持五个节点，当前波清怪连续填充，休整只完成一次',()=>{
  for(const random of [0,.5,.99]){
    const g=new Game(clearingProgress(),()=>random);startAtClearing(g);
    const count=g.bossWave;
    assert.equal(count,5);assert.equal(waveProgressState(g).count,count);
    g.waveKills=waveDifficulty(g.wave).total/2;
    assert.equal(waveProgressState(g).progress,.5/count);
    assert.equal(waveProgressState(g).nodes[0].state,'current');
    clearWave(g);
    assert.equal(waveProgressState(g).completed,1);
    assert.equal(waveProgressState(g).progress,1/count);
    g.updateWaves(3);
    const s=waveProgressState(g);
    assert.equal(s.count,count);assert.equal(s.completed,1);assert.equal(s.remaining,count-1);
    assert.deepEqual(s.nodes.slice(0,2).map(n=>n.state),['done','current']);
    const restored=reload(g);
    assert.deepEqual(waveProgressState(restored),s);
  }
});
test('Boss节点、死亡重试保留完成勾，胜利休整与刷新从新组零进度开始',()=>{
  let g=new Game(clearingProgress(),()=>.5);startAtClearing(g);
  for(let i=0;i<5;i++){clearWave(g);if(i<4)g.updateWaves(3);}
  assert.equal(waveProgressState(g).completed,5);assert.equal(waveProgressState(g).progress,1);
  g.summonBoss();g.hurt(1e9);assert.equal(g.state,'dead');g=reload(g);assert.equal(g.state,'dead');startAtClearing(g);
  assert.equal(g.waveGroupStart,1);assert.equal(waveProgressState(g).completed,5);
  assert.equal(g.summonBoss(),true);const boss=g.boss;g.hit(boss,1e9);g.hit(boss,1e9);
  const s=waveProgressState(g);
  assert.equal(s.start,6);assert.equal(s.completed,0);assert.equal(s.waiting,true);assert.equal(s.progress,0);
  g=reload(g);assert.deepEqual(waveProgressState(g),s);
  startAtClearing(g);g.updateWaves(3);assert.equal(g.progress.living.patrolActive,false);acceptNextClearing(g);g.updateWaves(3);
  assert.equal(waveProgressState(g).nodes[0].state,'current');
  assert.equal(waveProgressState(g).progress,0);
  assert.equal(g.wave,6);assert.equal(g.bossWave,10);assert.equal(g.progress.bosses,1);assert.equal(g.progress.campLevel.xp,180);
});
test('剧情与秘境往返保留组起点；旧档与坏字段生成有限的节点',()=>{
  const g=new Game(clearingProgress(),()=>.5);startAtClearing(g);clearWave(g);g.updateWaves(3);
  const s=waveProgressState(g);
  g.enterStory();g.leaveStory();assert.deepEqual(waveProgressState(g),s);
  startAtClearing(g);g.enterRealm('tower');g.leaveRealm();assert.deepEqual(waveProgressState(g),s);
  const raw={version:1,state:'active',wave:8,bossWave:10};
  assert.equal(validatePatrol(raw).waveGroupStart,8);
  for(const start of [-100,NaN,Infinity,1e12]){
    const saved=validatePatrol({...raw,waveGroupStart:start});
    assert.ok(saved.waveGroupStart>=1&&saved.waveGroupStart<=8);
    assert.ok(waveProgressState(saved).count<=6);
  }
});

// 普通怪潮也保留整组节点与部分清怪，随机源变化或刷新不能把进度变回第一点。
test('普通波死亡、刷新和复活保留完成勾、当前清怪与领主节点',()=>{
 let g=new Game(clearingProgress(),()=>.99);startAtClearing(g);
 for(let i=0;i<2;i++){clearWave(g);g.updateWaves(3);}
 g.waveKills=3;g.waveSpawned=6;g.kills+=3;
 const before=waveProgressState(g),bossWave=g.bossWave;
 g.hurt(1e9);assert.equal(g.state,'dead');g=reload(g);assert.equal(g.state,'dead');startAtClearing(g);
 assert.deepEqual(waveProgressState(g),before);assert.equal(g.bossWave,bossWave);assert.equal(g.waveSpawned,3);
 const coins=g.progress.coins;startAtClearing(g);g=reload(g);startAtClearing(g);
 assert.deepEqual(waveProgressState(g),before);assert.equal(g.progress.coins,coins);
 // 复活先走完预警，再按当前小队配置补怪；不能沿用旧版每次仅生成一只的断言。
 g.updateWaves(10);assert.equal(g.waveSpawned,3);g.updateWaves(.01);
 const batch=Math.min(CLEARING_DENSITY.openingBatch,waveDifficulty(g.wave).total-3);
 assert.equal(g.waveSpawned,3+batch);assert.equal(g.enemies.filter(e=>e.hp>0&&e.wave===g.wave).length,batch);
 assert.deepEqual(waveProgressState(g),before);assert.equal(g.progress.coins,coins);
});

// 领主击败后已创建下一组，过渡时倒下不可把前组末波塞入新组。
test('领主胜利休整死亡保持新组起点且只推进一次',()=>{
 let g=new Game(clearingProgress(),()=>0);startAtClearing(g);
 for(let i=0;i<5;i++){clearWave(g);if(i<4)g.updateWaves(3);}
 g.summonBoss();g.hit(g.boss,1e9);
 const before=waveProgressState(g);g.hurt(1e9);assert.equal(g.state,'dead');g=reload(g);assert.equal(g.state,'dead');startAtClearing(g);
 assert.deepEqual(waveProgressState(g),before);acceptNextClearing(g);g.updateWaves(3);
 assert.equal(g.wave,g.waveGroupStart);assert.equal(waveProgressState(g).completed,0);
 assert.equal(g.wave,6);assert.equal(g.bossWave,10);assert.equal(g.progress.bosses,1);assert.equal(g.progress.campLevel.xp,180);
 const resumed=waveProgressState(g);g=reload(g);startAtClearing(g);g.updateWaves(3);
 assert.deepEqual(waveProgressState(g),resumed);assert.equal(g.progress.bosses,1);assert.equal(g.progress.campLevel.xp,180);
});

// 串联正式接取、击杀、暂停、死亡和读档，验证换场不清空已完成的波次。
test('部分清怪暂停重接、死亡读档后继续完成本轮，下一轮不重复结算',()=>{
 let g=new Game(clearingProgress(),()=>.5);startAtClearing(g);clearWave(g);g.updateWaves(3);
 for(let i=0;i<2;i++)g.hit(g.spawnEnemy(0,100),1e9);
 const before=waveProgressState(g),kills=g.kills,oldSite=structuredClone(clearingSite(g.progress));
 assert.equal(before.completed,1);assert.equal(g.waveKills,2);
 Object.assign(g.player,CLEARING_APPROACH);assert.ok(setLivingPatrol(g,false).ok);
 assert.equal(g.progress.living.patrolActive,false);g.updateWaves(30);assert.deepEqual(waveProgressState(g),before);
 acceptNextClearing(g);const site=structuredClone(clearingSite(g.progress));assert.notDeepEqual(site,oldSite);
 g=reload(g);startAtClearing(g);assert.deepEqual(waveProgressState(g),before);assert.deepEqual(clearingSite(g.progress),site);
 g.hurt(1e9);assert.equal(g.state,'dead');const coins=g.progress.coins;
 g=reload(g);assert.equal(g.state,'dead');assert.equal(g.progress.coins,coins);startAtClearing(g);
 assert.deepEqual(waveProgressState(g),before);assert.deepEqual(clearingSite(g.progress),site);assert.equal(g.kills,kills);
 assert.equal(g.progress.coins,coins);assert.equal(g.waveSpawned,g.waveKills);
 // 使用真实补怪与击杀推进剩余波次，不能只改计数把测试推进到胜利。
 for(let step=0;step<600&&!g.boss;step++){
  g.updateWaves(.5);
  for(const enemy of g.enemies.filter(e=>e.hp>0))g.hit(enemy,1e9);
  assert.ok(g.waveSpawned<=waveDifficulty(g.wave).total,'补怪不能超过本波配额');
 }
 assert.ok(g.boss,'剩余波次完成后应自动进入领主战');assert.equal(waveProgressState(g).completed,5);
 const boss=g.boss;g.hit(boss,1e9);g.hit(boss,1e9);
 assert.equal(g.progress.bosses,1);assert.equal(g.progress.campLevel.xp,180);assert.equal(g.progress.living.patrolActive,false);
 const completed=waveProgressState(g);g.updateWaves(30);assert.deepEqual(waveProgressState(g),completed);
 acceptNextClearing(g);g.updateWaves(3);
 assert.equal(g.wave,6);assert.equal(g.waveGroupStart,6);assert.equal(g.bossWave,10);
 assert.equal(waveProgressState(g).completed,0);assert.equal(g.progress.bosses,1);assert.equal(g.progress.campLevel.xp,180);
});

// 节点测试使用已修复告示牌、已接取的真实清缴场，不能在安全营地推进怪潮。
function clearingProgress(){const p=freshProgress();p.restoration.repaired.push('clearing');p.living.patrolActive=true;p.living.position={x:BOSS_CLEARING.x,y:BOSS_CLEARING.y};return p;}

// 死亡会按正式规则回安全营地；计时专项模拟再次走到清缴场，不要求营地刷怪。
function startAtClearing(g){
 const dead=g.state==='dead';g.start();
 if(dead){assert.equal(g.state,'playing');assert.ok(g.player.hp>0);assert.ok(livingProtected(g),'复活应先回到安全营地');}
 const site=clearingSite(g.progress);Object.assign(g.player,{x:site.x,y:site.y});
}

// 下一组必须回到告示牌重新接取，再模拟走回清缴场。
function acceptNextClearing(g){
 const before=waveProgressState(g);Object.assign(g.player,CLEARING_APPROACH);
 const result=acceptClearingPost(g);assert.ok(result.ok,result.message);assert.deepEqual(waveProgressState(g),before);
 assert.equal(livingWaveAllowed(g),false);const site=structuredClone(clearingSite(g.progress));
 assert.ok(acceptClearingPost(g).ok);assert.deepEqual(clearingSite(g.progress),site);assert.deepEqual(waveProgressState(g),before);
 Object.assign(g.player,{x:site.x,y:site.y});assert.equal(livingWaveAllowed(g),true);
}
