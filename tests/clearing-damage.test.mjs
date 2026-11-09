// 清缴伤害回归：真实出生、轮数成长、特殊兵种封顶、续档和场景隔离。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {clearingEnemyDamage} from '../src/config/clearing-damage.js';
import {clearingDifficulty} from '../src/config/clearing-difficulty.js';
import {GAMEPLAY_VALUES} from '../src/config/gameplay-values.js';
import {waveDifficulty} from '../src/config/waves.js';
import {updateRangedAttack} from '../src/combat/ranged-enemies.js';
import {RANGED_ENEMIES} from '../src/config/ranged-enemies.js';
import {attackProfile} from '../src/combat/enemy-attack.js';
import {capturePatrol} from '../src/core/battle/patrol-session.js';
import {prepareBossNode} from './helpers/boss-node.mjs';
import {clearingIdentity} from '../src/config/clearing-enemies.js';
import {enemyIdentity} from '../src/world/biomes.js';

// 固定同一区域和随机源，排除装备成长和位置变化对伤害比较的影响。
function arena(rounds=7){
 const p=freshProgress();p.bosses=rounds;
 const g=new Game(p,()=>.99);g.start();g.progress.living.patrolActive=true;Object.assign(g.player,{x:1600,y:400});g.wave=rounds*5+1;g.enemies=[];return g;
}
// 正式工厂从指定编号生成对应兵种，避免随机编成使测试漏掉重装与炮兵。
function spawn(g,wave,ordinal=1,spot={x:1715,y:677},context=null){
 g.wave=wave;g.waveSpawned=ordinal-1;g.enemies=[];return g.spawnEnemy(0,0,spot,context);
}
test('入门伤害保留，第八轮上限72，长期最高270且不随装备变化',()=>{
 assert.equal(clearingEnemyDamage(1000,0),30);assert.equal(clearingEnemyDamage(1000,7),72);
 for(let rounds=0;rounds<=100;rounds++){
  const cap=Math.round(30*clearingDifficulty(rounds).damage);
  assert.equal(clearingEnemyDamage(1e6,rounds),cap);
  assert.equal(clearingEnemyDamage(18,rounds),Math.round(18*clearingDifficulty(rounds).damage));
 }
 assert.equal(clearingEnemyDamage(1000,1000000),270);
});
test('第八轮五批同种怪伤害不递增，全部兵种不超过同轮领主技能伤害',()=>{
 const g=arena(),damage=[],species=new Set();
 for(let wave=36;wave<=40;wave++){
  damage.push(spawn(g,wave).damage);
  for(let ordinal=1;ordinal<=24;ordinal++){
   const e=spawn(g,wave,ordinal);species.add(e.species||'slime');assert.ok(e.damage>0&&e.damage<=72);
   assert.equal(attackProfile(e).damage,e.damage);
  }
 }
 assert.deepEqual(damage,[20,20,20,20,20]);
 for(const id of ['slime','ironwood-bulwark','bramble-buggy','stump-bombard','leaf-bat'])assert.ok(species.has(id),id);
 prepareBossNode(g);assert.ok(g.summonBoss());assert.equal(g.boss.blastDamage,72);assert.equal(g.boss.damage,43);
 const support=spawn(g,40,1,undefined,{bossOwner:g.boss.id});assert.ok(support.damage<=g.boss.blastDamage);
 g.player.hp=g.maxHp();g.player.invincible=0;g.vehicle.active=false;const before=g.player.hp;g.hurt(damage[0]);assert.equal(before-g.player.hp,20);
});
test('强度读取永久清缴胜场，旧档累计批次不会额外增加伤害',()=>{
 const g=arena();for(const wave of [1,8,36,40,100000])assert.ok(spawn(g,wave).damage<=72);
 assert.equal(spawn(g,40).damage,20);
 g.progress.bosses=25;assert.equal(spawn(g,100000).damage,68);
 g.progress.bosses=10000;assert.equal(spawn(g,100000).damage,76);
});
test('续档和失败重试不增加轮数，原前三批死亡缓和保留',()=>{
 const g=arena();g.wave=38;g.bossWave=40;g.waveGroupStart=36;const expected=spawn(g,38).damage;
 g.progress.patrol=capturePatrol(g);const restored=new Game(structuredClone(g.progress),()=>.99);restored.start();
 assert.equal(spawn(restored,38).damage,expected);restored.recoveryRun=true;assert.equal(spawn(restored,38).damage,expected);assert.equal(restored.progress.bosses,7);
 assert.equal(clearingEnemyDamage(20,0,1,true),16);assert.equal(clearingEnemyDamage(20,0,2,true),18);assert.equal(clearingEnemyDamage(20,0,3,true),19);assert.equal(clearingEnemyDamage(20,0,4,true),20);
});
test('野外移动遭遇与独立地图保留原伤害规则，清缴数量按分批上限封顶',()=>{
 const g=arena();const ambient=spawn(g,1,1,undefined,{ambient:true});assert.equal(spawn(g,100000,1,undefined,{ambient:true}).damage,ambient.damage);
 g.mapId='jiuzhaigou';g.random=()=>.5;const a=spawn(g,1),b=spawn(g,40);assert.equal(b.damage,Math.round(a.damage*waveDifficulty(40).damage));
 assert.deepEqual([36,37,38,39,40].map(w=>waveDifficulty(w).total),[34,38,42,46,52]);
});

// 远程投射物必须继承已封顶伤害，不能发射时再乘旧波次或兵种系数。
test('车载与炮兵正式发射的弹丸使用清缴伤害上限',()=>{
 const g=arena();
 for(const [wave,ordinal] of [[39,16],[40,16]]){
  const e=spawn(g,wave,ordinal);Object.assign(g.player,{x:e.x+60,y:e.y});
  g.enemyBolts=[];g.rangedShotTimer=0;
  Object.assign(e.assault,{phase:'windup',elapsed:RANGED_ENEMIES[e.species].windup,dirX:1,dirY:0,endX:g.player.x,endY:g.player.y});
  updateRangedAttack(g,e,g.player,.01);assert.equal(g.enemyBolts.length,1);assert.equal(g.enemyBolts[0].damage,e.damage);assert.ok(g.enemyBolts[0].damage<=72);
 }
});

test('各类清缴怪与领主援兵不随波次加速，普通地图保留原规则',()=>{
 const g=arena();g.random=()=>0;const spot={x:1700,y:400},base=enemyIdentity(spot.x,spot.y,0,'forest',1);
 for(const wave of [5,40,100,100000])for(const ordinal of [1,4,8,12,16,20]){
  const e=spawn(g,wave,ordinal,spot),identity=clearingIdentity(base,wave,ordinal,[],0);
  assert.equal(e.rank,base.rank);assert.equal(e.species,identity.species);assert.equal(e.speed,identity.speed);
 }
 const early=spawn(g,5,1,spot,{bossOwner:7}),late=spawn(g,100000,1,spot,{bossOwner:7});
 assert.equal(early.species,late.species);assert.equal(early.speed,late.speed);
 g.mapId='jiuzhaigou';const a=spawn(g,5,1,spot),b=spawn(g,100000,1,spot);
 assert.ok(b.speed>a.speed);
});
