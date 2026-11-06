// 怪潮守门专项：隔离、十波状态机、真实救场火力、存档与结算原子性。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {CAMP_GATES,CAMP_DEFENSE,campDefenseGrade} from '../src/config/camp-defense.js';
import {startCampDefense,updateCampDefense,rescueCampDefense,hurtCampBarricade,spawnCampBoss,claimCampDefense,syncCampDefense} from '../src/core/camp-defense.js';
import {capturePatrol} from '../src/core/patrol-session.js';
import {livingProtected,livingWaveAllowed} from '../src/core/living-safety.js';
import {updateEnemies} from '../src/core/enemy-manager.js';
import {updateBossHazards} from '../src/combat/bosses.js';
// 使用正式 Game，只有入场位置与已拥有装备作为检查点。
function setup(){const p=freshProgress();p.restoration.repaired.push('defense');const g=new Game(p,()=>.41);g.state='playing';Object.assign(g.player,CAMP_GATES.find(gate=>gate.id==='left'));g.mainlineTalkDelay=999;return g;}
// 测试用秒表仍使用正式游戏步长，不直接替换命中或救场实现。
function advance(g,seconds){for(let t=0;t<seconds&&g.state==='playing';t+=.05)g.update(.05);}

test('巨物重砸落点先预警，拒马与圈内角色各承伤一次，离开落点可躲避',()=>{
 for(const inside of [true,false]){
  const g=setup();startCampDefense(g,'left');
  const r=g.campDefense;r.phase='boss-ready';spawnCampBoss(g);
  const h={kind:'slam',family:'dumpling',owner:g.boss.id,x:r.barrier.x-90,y:r.barrier.y,radius:136,damage:32,color:'#90a875',age:0,warmup:.3,duration:.5};
  g.hazards=[h];g.player.x=h.x+(inside?0:180);g.player.y=h.y;g.player.invincible=0;
  const hp=g.player.hp;
  updateBossHazards(g,.2);assert.equal(g.player.hp,hp);assert.equal(r.gateHp,1500);
  updateBossHazards(g,.12);assert.equal(g.player.hp<hp,inside);assert.equal(r.gateHp,1468);
  const after=g.player.hp;updateBossHazards(g,.1);assert.equal(g.player.hp,after);assert.equal(r.gateHp,1468);
 }
});

test('两座开阔营门各自入场，远程与其他活动拒绝，普通清缴不会启动',()=>{
 for(const gate of CAMP_GATES){const g=setup();Object.assign(g.player,{x:gate.x,y:gate.y});assert.ok(startCampDefense(g,gate.id));assert.equal(g.campDefense.gateId,gate.id);assert.equal(livingProtected(g),false);assert.equal(livingWaveAllowed(g),false);assert.equal(g.enterRealm('guardian'),false);assert.equal(g.enterStory('sunleaf-01'),false);assert.equal(startCampDefense(g,gate.id),false);}
 for(const field of ['story','realm','boss','livingBattle']){const g=setup();g[field]={};assert.equal(startCampDefense(g,'left'),false);}
 const g=setup();g.player.x=2400;assert.equal(startCampDefense(g,'left'),false);g.player.x=120;g.progress.living.patrolActive=true;assert.equal(startCampDefense(g,'left'),false);
});

test('固定十波后自动开启 Boss，击杀只记本局，S 资源一次领取并恢复现场',()=>{
 const g=setup(),before=structuredClone(g.progress),player=g.player,trees=g.trees;assert.ok(startCampDefense(g,'left'));
 const r=g.campDefense;
 for(let wave=1;wave<=10;wave++){
  assert.equal(r.wave,wave);r.timer=0;
  for(let guard=0;r.cleared<wave&&guard<500;guard++){
   updateCampDefense(g,.2);for(const e of g.enemies)if(e.hp>0)g.hit(e,100000);g.enemies=g.enemies.filter(e=>e.hp>0);
  }assert.equal(r.cleared,wave);
 }
 assert.equal(r.phase,'boss');assert.ok(g.boss);assert.equal(g.progress.coins,before.coins);assert.equal(g.progress.bosses,before.bosses);assert.equal(spawnCampBoss(g),false);assert.equal(g.boss.kind,'dumpling');assert.equal(g.boss.radius,114);g.hit(g.boss,100000);assert.equal(r.phase,'spoils');assert.equal(g.progress.campDefense.run.phase,'result');assert.equal(claimCampDefense(g),false);updateCampDefense(g,2);assert.equal(r.phase,'result');assert.equal(campDefenseGrade(r),'S');
 g.campDefensePersist=()=>false;assert.equal(claimCampDefense(g),false);assert.equal(g.progress.campLevel.xp,0);assert.equal(g.progress.coins,before.coins);
 g.campDefensePersist=()=>true;assert.ok(claimCampDefense(g));assert.equal(g.progress.campLevel.xp,210);assert.equal(claimCampDefense(g),false);assert.equal(g.progress.campLevel.xp,210);assert.equal(g.progress.coins,before.coins+CAMP_DEFENSE.grades.S.coins+CAMP_DEFENSE.spoils.bonus.coins);assert.equal(g.progress.materials.crystal,before.materials.crystal+6);assert.equal(g.progress.materials.core,before.materials.core+1);assert.deepEqual(g.progress.weapons,before.weapons);assert.deepEqual(g.progress.vehicleHulls,before.vehicleHulls);assert.equal(g.player,player);assert.equal(g.trees,trees);assert.equal(g.campDefense,null);assert.equal(g.progress.bosses,before.bosses);
});

test('拒马承受真实敌人扑击，被破坏后随机伙伴匹配火力实弹清场并结算 B',()=>{
 const g=setup();startCampDefense(g,'left');const r=g.campDefense;r.gateHp=1;r.barrier.hp=1;r.timer=0;updateCampDefense(g,.1);
 const e=g.enemies[0];Object.assign(e,{x:r.barrier.x-70,y:r.barrier.y,damage:10,campRaider:false});
 for(let t=0;t<5&&r.phase!=='rescue';t+=.05)updateEnemies(g,.05,{x:g.player.x,y:g.player.y});
 assert.equal(r.reason,'barricade');assert.equal(r.helpers.length,2);assert.notEqual(r.allies[0],r.allies[1]);const frozen=r.kills;
 advance(g,35);assert.equal(r.phase,'result');assert.equal(g.enemies.filter(e=>e.hp>0).length,0);assert.equal(r.kills,frozen);assert.equal(campDefenseGrade(r),'B');assert.ok(claimCampDefense(g));assert.equal(g.progress.campLevel.xp,0);
});

test('玩家致命伤进入救场不触发死亡，暂停冻结援军和波次',()=>{
 const g=setup(),events=[];g.onEvent=t=>events.push(t);startCampDefense(g,'left');g.player.invincible=0;g.player.hp=1;g.hurt(999);assert.equal(g.campDefense.reason,'death');assert.equal(g.state,'playing');assert.ok(!events.includes('death'));const r=g.campDefense;g.pause();advance(g,2);assert.equal(r.rescueTime,0);g.pause();advance(g,12);assert.equal(r.phase,'result');
});

test('检查点恢复已杀配额、拒马和原清缴；结算刷新不会重复发奖',()=>{
 const g=setup();g.wave=4;g.waveKills=2;startCampDefense(g,'left');const r=g.campDefense;Object.assign(r,{wave:4,cleared:3,waveKills:9,kills:100,gateHp:870});syncCampDefense(g);g.progress.patrol=capturePatrol(g);
 const restored=new Game(structuredClone(g.progress),()=>.7);assert.equal(restored.campDefense.wave,4);assert.equal(restored.campDefense.spawned,9);assert.equal(restored.campDefense.gateHp,870);assert.equal(restored.campDefense.patrol.wave,4);hurtCampBarricade(restored,2000);advance(restored,12);assert.equal(restored.campDefense.phase,'result');syncCampDefense(restored);
 const result=new Game(structuredClone(restored.progress),()=>.2);assert.equal(result.campDefense.phase,'result');assert.ok(claimCampDefense(result));assert.equal(result.wave,4);assert.equal(result.waveKills,2);const again=new Game(structuredClone(result.progress));assert.equal(again.campDefense,null);assert.equal(again.progress.campDefense.runs,1);
});

test('评分三档仅由玩家守门成绩与破损决定，援军不提升通关标记',()=>{
 assert.equal(campDefenseGrade({cleared:10,gateHp:750,bossDefeated:true}),'S');assert.equal(campDefenseGrade({cleared:10,gateHp:749,bossDefeated:true}),'A');assert.equal(campDefenseGrade({cleared:6,gateHp:0,reason:'barricade'}),'A');assert.equal(campDefenseGrade({cleared:5,gateHp:1500,reason:'death'}),'B');
 const g=setup();startCampDefense(g,'left');hurtCampBarricade(g,2000);const grade=campDefenseGrade(g.campDefense);assert.equal(rescueCampDefense(g,'death'),false);assert.equal(campDefenseGrade(g.campDefense),grade);
});
