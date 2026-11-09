import {enemyLevelHealth} from '../src/config/combat-levels.js';
// 兽潮独立成长回归：正式出生属性、场次结算、旧档比例迁移和数值边界。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {CAMP_GATES,CAMP_DEFENSE,campDefenseDifficulty,campDefenseWave,campDefenseBoss,CAMP_DEFENSE_GROWTH_VERSION} from '../src/config/camp-defense.js';
import {startCampDefense,updateCampDefense,spawnCampBoss,syncCampDefense,claimCampDefense,leaveCampDefense} from '../src/core/camp/camp-defense.js';
import {validateCampDefense} from '../src/progression/camp/camp-defense.js';
import {validateProgress} from '../src/progression/progress.js';
// 开场次数来自正式进度，位置使用真实营门，保留实际刷怪与结算入口。
function scene(rounds=0){const p=freshProgress();p.restoration.repaired.push('defense');p.campDefense.runs=rounds;const g=new Game(p,()=>.41);g.state='playing';Object.assign(g.player,CAMP_GATES[0]);assert.ok(startCampDefense(g,CAMP_GATES[0].id));return g;}

test('首场从原第五波开始，五波逐渐增加等级、数量与战斗压力',()=>{
 assert.deepEqual(Array.from({length:5},(_,i)=>campDefenseWave(i+1).hp),[30,33,36,39,42]);
 assert.deepEqual(Array.from({length:5},(_,i)=>campDefenseWave(i+1).damage),[3,4,4,4,5]);
 for(let wave=1;wave<=5;wave++){
  const g=scene(),r=g.campDefense;r.wave=wave;r.timer=0;updateCampDefense(g,.01);const e=g.enemies[0],i=wave+3;
  assert.equal(e.level,wave+4);assert.equal(e.hp,18+(wave+3)*3);assert.equal(e.damage,Math.round(2+i/3));
  assert.equal(e.speed,34+i*2);assert.equal(campDefenseWave(wave).count,18+i*5);
  if(wave>1)assert.ok(campDefenseWave(wave).spawnInterval<campDefenseWave(wave-1).spawnInterval);
 }
 assert.equal(CAMP_DEFENSE.limit,56);assert.equal(CAMP_DEFENSE.gateHp,1500);
});

test('所有场次五波普通怪采用独立线性生命，保留5%成长与领主强度',()=>{
 for(const rounds of [0,1,2,5,25,50,100]){
  const d=campDefenseDifficulty(rounds);assert.ok(Math.abs(d.health-1.05**rounds)<1e-8);assert.equal(d.damage,d.health);
  for(let wave=1;wave<=5;wave++)assert.equal(campDefenseWave(wave,rounds).hp,Math.round((18+(wave+3)*3)*1.05**rounds));
  for(const wave of [1,3,5]){const g=scene(rounds),r=g.campDefense;r.wave=wave;r.timer=0;updateCampDefense(g,.01);const e=g.enemies[0];
   assert.equal(e.hp,Math.round((18+(wave+3)*3)*1.05**rounds));assert.equal(e.damage,Math.round((2+(wave+3)/3)*1.05**rounds));assert.equal(e.speed,34+(wave+3)*2);
  }
  const g=scene(rounds);g.campDefense.phase='boss-ready';assert.ok(spawnCampBoss(g));
  assert.equal(g.boss.maxHp,Math.round(Math.round(1900*1.05**rounds)*115/100));assert.equal(g.boss.damage,Math.round(32*1.05**rounds));assert.equal(g.boss.blastDamage,Math.round(60*1.05**rounds));assert.equal(g.boss.speed,45);
 }
 assert.ok(campDefenseDifficulty(25).health>2);assert.ok(campDefenseDifficulty(25).damage>1.5);
});

test('当前场次固定快照，重复刷新与退出不加次数，下一场不重用波内倍率',()=>{
 const g=scene(4),r=g.campDefense;r.wave=4;r.timer=0;r.waveKills=r.spawned=12;syncCampDefense(g);
 const saved=validateProgress(structuredClone(g.progress)),again=validateProgress(structuredClone(saved));assert.deepEqual(again,saved);
 const restored=new Game(saved,()=>.41);assert.equal(restored.campDefense.rounds,4);assert.equal(restored.campDefense.wave,4);assert.equal(restored.campDefense.waveKills,12);
 restored.campDefense.timer=0;updateCampDefense(restored,.01);assert.equal(restored.enemies[0].hp,campDefenseWave(4,4).hp);
 assert.ok(leaveCampDefense(restored));assert.equal(restored.progress.campDefense.runs,4);
 Object.assign(restored.player,CAMP_GATES[0]);assert.ok(startCampDefense(restored,CAMP_GATES[0].id));assert.equal(restored.campDefense.wave,1);restored.campDefense.timer=0;updateCampDefense(restored,.01);assert.equal(restored.enemies[0].hp,campDefenseWave(1,4).hp);
});

test('B、A、S领取成功各记一次，保存失败与重复领取均不增加场次',()=>{
 for(const [cleared,bossDefeated,reason] of [[2,false,'death'],[3,false,'barricade'],[5,true,null]]){
  const g=scene(2);Object.assign(g.campDefense,{phase:'result',cleared,bossDefeated,reason});syncCampDefense(g);
  g.campDefensePersist=()=>false;assert.equal(claimCampDefense(g),false);assert.equal(g.progress.campDefense.runs,2);
  g.campDefensePersist=()=>true;assert.ok(claimCampDefense(g));assert.equal(g.progress.campDefense.runs,3);assert.equal(claimCampDefense(g),false);assert.equal(g.progress.campDefense.runs,3);
  const saved=validateProgress(structuredClone(g.progress));assert.equal(saved.campDefense.runs,3);
  Object.assign(g.player,CAMP_GATES[0]);assert.ok(startCampDefense(g,CAMP_GATES[0].id));g.campDefense.timer=0;updateCampDefense(g,.01);assert.equal(g.enemies[0].hp,campDefenseWave(1,3).hp);
 }
});

test('在途守门领主恢复为团山，保留已存生命数值与守门次数',()=>{
 const g=scene(5);g.campDefense.phase='boss-ready';spawnCampBoss(g);syncCampDefense(g);
 const raw=structuredClone(g.progress);delete raw.campDefense.run.growthVersion;raw.campDefense.run.bossHp=1140;
 const saved=validateProgress(raw);assert.equal(saved.campDefense.runs,5);assert.equal(saved.campDefense.run.bossHp,1140);assert.equal(saved.campDefense.run.growthVersion,CAMP_DEFENSE_GROWTH_VERSION);
 assert.deepEqual(validateProgress(structuredClone(saved)),saved);
 const restored=new Game(saved,()=>.41);assert.equal(restored.boss.maxHp,campDefenseBoss(5).hp);assert.equal(restored.boss.hp,saved.campDefense.run.bossHp);assert.equal(restored.boss.speed,45);
 assert.equal(restored.boss.kind,'dumpling');assert.equal(restored.boss.radius,114);
});

test('损坏或极大次数保持有限整数属性，避免指数溢出破坏存档',()=>{
 for(const rounds of [-1,NaN,Infinity,999999])for(const wave of [1,10]){
  const w=campDefenseWave(wave,rounds),b=campDefenseBoss(rounds);
  for(const value of [w.hp,w.damage,b.hp,b.damage,b.blastDamage])assert.ok(Number.isSafeInteger(value)&&value>0);
 }
 const s=validateCampDefense({runs:999999,run:{gateId:CAMP_GATES[0].id,rounds:999999,wave:10,phase:'boss',growthVersion:2,bossHp:Number.MAX_SAFE_INTEGER}});
 assert.deepEqual(validateCampDefense(s),s);assert.equal(s.run.bossHp,Number.MAX_SAFE_INTEGER);
});

// 营门区域只决定原怪物配色，不得再次把首波标成区域高等级。
test('北门与西门首波都为五级，出生密度随波次增加',()=>{
 for(const gate of CAMP_GATES){const p=freshProgress();p.restoration.repaired.push('defense');const g=new Game(p,()=>.41);g.start();Object.assign(g.player,gate);assert.ok(startCampDefense(g,gate.id));const r=g.campDefense;
  for(const wave of [1,3,5]){g.enemies=[];Object.assign(r,{wave,spawned:0,waveKills:0,spawnTimer:0,timer:0});updateCampDefense(g,1);const expected=campDefenseWave(wave);assert.ok(g.enemies.length>=Math.floor(1/expected.spawnInterval));assert.ok(g.enemies.every(e=>e.level===wave+4&&e.maxHp===expected.hp));}
 }
});
// 下调单波数量后，旧档保留已获得成绩，重建时不补出多余旧配额。
test('旧在途高配额波次续档按新配额完成，不会卡波或重复结算',()=>{
 const g=scene(),r=g.campDefense;Object.assign(r,{wave:5,waveKills:80,kills:580});syncCampDefense(g);const restored=new Game(validateProgress(structuredClone(g.progress)),()=>.41);assert.equal(restored.campDefense.waveKills,58);assert.equal(restored.campDefense.kills,580);restored.campDefense.timer=0;updateCampDefense(restored,.01);assert.equal(restored.campDefense.phase,'boss');assert.ok(restored.boss);assert.equal(restored.enemies.length,0);assert.equal(restored.progress.campDefense.runs,0);
});

// 所有场次读档继续使用独立生命曲线，已击败数量及拒马伤势原样保留。
test('首场及后续场次第四五波续档不丢进度，独立曲线不改变野外生命',()=>{
 assert.equal(enemyLevelHealth(9),339);assert.equal(enemyLevelHealth(10),504);
 for(const rounds of [0,1,4])for(const wave of [4,5]){
  const g=scene(rounds),r=g.campDefense;Object.assign(r,{wave,cleared:wave-1,waveKills:12,spawned:12,kills:100,gateHp:900});syncCampDefense(g);
  const restored=new Game(validateProgress(structuredClone(g.progress)),()=>.41);
  assert.equal(restored.campDefense.waveKills,12);assert.equal(restored.campDefense.gateHp,900);
  restored.campDefense.timer=0;updateCampDefense(restored,.01);
  assert.equal(restored.enemies[0].hp,Math.round((wave===4?39:42)*1.05**rounds));
  assert.equal(restored.campDefense.rounds,rounds);
 }
});
