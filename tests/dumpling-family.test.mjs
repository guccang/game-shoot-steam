// 团子领主使用正式工厂、存档与攻击入口，验证轮换兼容、真实落点和伤害时序。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {BOSSES,nextBoss,bossProfile} from '../src/config/bosses.js';
import {updateBoss,updateBossHazards} from '../src/combat/bosses.js';
import {riverXAt,isWaterBlocked} from '../src/world/river-geometry.js';
import {restoreBoss} from '../src/core/boss-manager.js';

// 测试在干地隔离刷怪与自动攻击，但保留正式攻击状态机和危险区判定。
function arena(){
 const g=new Game(freshProgress(),()=>.5);g.start();g.trees=[];g.enemies=[];
 Object.assign(g.player,{x:1700,y:400,arena:{x:1600,y:400,radius:1000}});
 g.progress.bossChallenge={bosses:0,kind:'dumpling',maxHp:1200,damage:20,blastDamage:40,speed:34};
 assert.ok(restoreBoss(g,1200));Object.assign(g.boss,{x:1500,y:400,attack:0,speed:0,arena:g.player.arena});
 g.hits=[];g.hurt=n=>g.hits.push(n);return g;
}
// 小步推进实际技能时钟，不以绘制结果推断命中。
function advance(g,seconds){for(let t=0;t<seconds-1e-8;t+=.01){const dt=Math.min(.01,seconds-t);updateBoss(g,dt,{...g.player});updateBossHazards(g,dt,{...g.player});}}

test('六个领主循环不重复，团子率先登场，未知旧实体仍回落苔藓巨兽',()=>{
 assert.equal(BOSSES.length,6);assert.equal(nextBoss({bosses:0}).id,'dumpling');
 assert.equal(new Set(Array.from({length:6},(_,bosses)=>nextBoss({bosses}).id)).size,6);
 assert.equal(nextBoss({bosses:6}).id,'dumpling');assert.equal(bossProfile({}).id,'moss');
});
test('旧挑战继续原五领主，新团子挑战保存恢复不换身份也不补血',()=>{
 for(const [bosses,kind] of ['boar','mushroom','owl','turtle','moss'].entries()){
  const raw=freshProgress();raw.bosses=bosses;raw.bossChallenge={bosses,maxHp:1800,damage:20,blastDamage:40,speed:34};
  assert.equal(nextBoss(validateProgress(raw)).id,kind);
 }
 const g=arena();g.progress=validateProgress(JSON.parse(JSON.stringify(g.progress)));assert.equal(nextBoss(g.progress).id,'dumpling');
 restoreBoss(g,437);assert.equal(g.boss.kind,'dumpling');assert.equal(g.boss.hp,437);
});
test('落点固定，起跳和前摇零伤害，落地仅命中一次并进入恢复',()=>{
 const g=arena();advance(g,.01);const h=g.hazards[0],target={x:h.x,y:h.y};
 assert.ok(Math.abs(h.warmup-1.8)<1e-8);assert.equal(h.radius,68);advance(g,1.7);assert.equal(g.hits.length,0);
 assert.ok(g.boss.x>1500&&g.boss.x<1700);advance(g,.2);assert.deepEqual(g.hits,[40]);
 assert.deepEqual({x:g.boss.x,y:g.boss.y},target);advance(g,.5);assert.equal(g.boss.ai.phase,'recover');assert.equal(g.hits.length,1);
});
test('离开落点可躲开攻击，暂停冻结，击败后危险区清除',()=>{
 const g=arena();advance(g,.01);const h=g.hazards[0];g.player.y+=150;advance(g,2.2);assert.equal(g.hits.length,0);assert.equal(h.y,400);
 g.state='paused';const before=JSON.stringify([g.boss,g.hazards]);advance(g,1);assert.equal(JSON.stringify([g.boss,g.hazards]),before);
 g.state='playing';g.boss=null;advance(g,.1);assert.equal(g.hazards.length,0);
});
test('隔河不能发起重砸，跃迁与落点不穿过河岸',()=>{
 const g=arena(),x=riverXAt(1000);delete g.player.arena;delete g.boss.arena;
 Object.assign(g.player,{x:x+90,y:1000});Object.assign(g.boss,{x:x-90,y:1000});advance(g,1);
 assert.equal(g.hazards.length,0);assert.equal(isWaterBlocked(g.boss.x,g.boss.y),false);
});

// 营地入口真实创建快照，再经过白名单存档恢复，确保不会走回旧领主目录。
test('营地首次正式召唤锁定团子身份，旧材料领取记录不误标新领主',()=>{
 const g=new Game(freshProgress(),()=>.5);g.start();g.progress.living.patrolActive=true;
 Object.assign(g.player,{x:1600,y:400});g.bossReady=true;g.bossWave=g.wave=5;
 assert.ok(g.summonBoss());assert.equal(g.boss.kind,'dumpling');assert.equal(g.progress.bossChallenge.kind,'dumpling');
 const p=validateProgress(JSON.parse(JSON.stringify(g.progress)));assert.equal(nextBoss(p).id,'dumpling');
 const old={...freshProgress(),bosses:6};delete old.materialBosses;assert.ok(!validateProgress(old).materialBosses.includes('dumpling'));
});
