// 首领三招循环、可躲避预警和召唤归属的正式战斗回归。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {BOSSES} from '../src/config/bosses.js';
import {BOSS_SPECIAL_SKILLS,nextBossSkill} from '../src/config/boss-skills.js';
import {bossSkillHazards,bossSkillTouches} from '../src/combat/boss-skills.js';
import {updateBoss,updateBossHazards} from '../src/combat/bosses.js';
import {beginBossSupport,updateBossSupport,dismissBossSummons} from '../src/core/boss-reinforcements.js';
import {summonClearingBossAtNode} from './helpers/clearing-scene.mjs';
import {STORY_CHAPTER} from '../src/config/story.js';
import {ARMORED} from '../src/config/armored-enemies.js';
import {attackProfile} from '../src/combat/enemy-attack.js';

// 沿用正式接单、节点和怪物工厂；测试仅关闭自动射击及随机障碍。
function scene(kind='boar'){
 const p=freshProgress();p.restoration.cottageRested=true;
 const g=new Game(p,()=>.5);g.start();g.trees=[];g.enemies=[];
 assert.ok(summonClearingBossAtNode(g));
 Object.assign(g.boss,{kind,x:g.player.x-150,y:g.player.y,hp:10000,maxHp:10000,blastDamage:40,attack:0,speed:0,
  arena:{x:g.player.x,y:g.player.y,radius:800}});
 g.player.invincible=999;g.attackTimer=999;return g;
}
// 固定有效时间步，暂停和施法采用生产调度入口。
function advanceSupport(g,seconds){for(let t=0;t<seconds-1e-8;t+=.05)updateBossSupport(g,.05);}

test('所有首领统一召唤高血量铁甲木卫，复用重盾实体而不改变普通脚本兵',()=>{
 for(const boss of BOSSES){
  const g=scene(boss.id),spot={x:g.player.x+300,y:g.player.y};
  const ordinary=g.spawnEnemy(0,0,spot,{bossOwner:g.boss.id,ordinaryDumpling:true});g.enemies=[];
  assert.ok(beginBossSupport(g));advanceSupport(g,4);assert.equal(g.enemies.length,2);
  for(const enemy of g.enemies){
   assert.equal(enemy.species,ARMORED.id);assert.equal(enemy.name,'铁甲木卫');assert.equal(enemy.flying,false);
   assert.equal(enemy.radius,ARMORED.radius);assert.equal(enemy.mass,30);assert.equal(enemy.bossSummon,true);
   assert.ok(enemy.maxHp>ordinary.maxHp*10);assert.equal(enemy.hp,enemy.maxHp);
   assert.deepEqual(attackProfile(enemy),{...ARMORED.attack,damage:enemy.damage});
   const hp=enemy.hp;g.hit(enemy,10);assert.equal(enemy.hp,hp-10);
  }
  assert.notEqual(ordinary.species,ARMORED.id);
 }
});

test('六种首领均按原招、召唤、专属循环，招式总数固定为三',()=>{
 for(const p of BOSSES){
  const g=scene(p.id),b=g.boss,seen=[];
  for(let i=0;i<3;i++){
   b.attack=0;b.x=g.player.x-150;b.y=g.player.y;updateBoss(g,.04);
   assert.equal(b.ai.phase,'windup');seen.push(b.ai.skill||'original');
   assert.ok(g.hazards.length<=24);
   for(let t=0;t<8&&b.ai.phase!=='chase';t+=.04){updateBossSupport(g,.04);updateBoss(g,.04);updateBossHazards(g,.04);}
   assert.equal(b.ai.phase,'chase');
  }
  assert.deepEqual(seen,['original','summon',BOSS_SPECIAL_SKILLS[p.id].id]);
  assert.equal(nextBossSkill(b),null);
 }
});

test('新增招式锁定位置且不误用野猪冲锋或团子跳跃位移',()=>{
 for(const kind of ['boar','dumpling'])for(const slot of [1,2]){
  const g=scene(kind),b=g.boss;b.skillCycle=slot;updateBoss(g,.04);
  const start={x:b.x,y:b.y},locked=g.hazards.map(h=>[h.x,h.y,h.dx,h.dy]);
  g.player.y+=100;updateBoss(g,b.ai.timing.windup+b.ai.timing.active+.1);
  assert.deepEqual({x:b.x,y:b.y},start);assert.equal(b.ai.phase,'recover');
  assert.deepEqual(g.hazards.map(h=>[h.x,h.y,h.dx,h.dy]),locked);
 }
});

test('所有新增危险区预警无伤，命中与离开危险区的结果在30/120帧一致',()=>{
 for(const profile of BOSSES)for(const fps of [30,120])for(const dodge of [false,true]){
  const g=scene(profile.id),skill=BOSS_SPECIAL_SKILLS[profile.id];
  const h=bossSkillHazards(g.boss,g.player,skill,profile.color)[0];g.hazards=[h];
  const point=h.kind==='cone'?{x:h.x+100,y:h.y}:h.kind==='lane'?{x:h.x+h.dx*150,y:h.y+h.dy*150}:
   h.kind==='wave'?{x:h.x+200,y:h.y}:h.kind==='feather'?{x:h.x+h.dx*130,y:h.y+h.dy*130}:{x:h.x,y:h.y};
  Object.assign(g.player,point);let hits=0;g.hurt=()=>hits++;
  updateBossHazards(g,h.warmup-.05);assert.equal(hits,0,profile.id+'预警');
  if(dodge)Object.assign(g.player,{x:h.x-600,y:h.y-600});
  for(let t=0;t<h.duration+.1;t+=1/fps)updateBossHazards(g,1/fps);
  assert.equal(hits>0,!dodge,profile.id+' '+fps+' dodge='+dodge);
  if(h.kind!=='spore')assert.ok(hits<=1);
 }
});

test('扇区侧后方与根刺间隙可躲避，边缘计入角色半径',()=>{
 const b={id:1,x:1000,y:1000,blastDamage:40},target={x:1200,y:1000};
 const cone=bossSkillHazards(b,target,BOSS_SPECIAL_SKILLS.boar,'#abc')[0];
 assert.equal(bossSkillTouches(cone,{x:900,y:1000},12),false);
 assert.equal(bossSkillTouches(cone,{x:1215,y:1000},12),true);
 assert.equal(bossSkillTouches(cone,{x:1230,y:1000},12),false);
 const roots=bossSkillHazards(b,target,BOSS_SPECIAL_SKILLS.moss,'#abc');
 const gap={x:b.x+250*Math.cos(.34),y:b.y+250*Math.sin(.34)};
 assert.ok(roots.every(h=>!bossSkillTouches(h,gap,12)));
 const spores=bossSkillHazards(b,target,BOSS_SPECIAL_SKILLS.mushroom,'#abc');
 assert.ok(spores.every(h=>Math.hypot(h.x-1325,h.y-1000)>h.radius+12));
});

test('三连震按编号错时爆发，回潮从外向内且不会重复命中',()=>{
 const g=scene('dumpling'),h=bossSkillHazards(g.boss,g.player,BOSS_SPECIAL_SKILLS.dumpling,'#abc');
 assert.deepEqual(h.map(v=>v.order),[1,2,3]);
 assert.deepEqual(h.map(v=>Math.round(v.warmup*100)),[120,155,190]);
 g.hazards=h;const hits=[];g.hurt=()=>hits.push(h.filter(v=>v.age>=v.warmup).length);
 Object.assign(g.player,h[2]);g.player.type='player';updateBossHazards(g,1.89);assert.equal(hits.length,0);
 updateBossHazards(g,.02);assert.equal(hits.length,1);
 const tide=bossSkillHazards(g.boss,g.player,BOSS_SPECIAL_SKILLS.turtle,'#abc')[0];
 assert.ok(tide.speed<0);assert.equal(tide.radius+tide.speed*tide.duration,60);
});

test('统一召唤不造成伤害，后台不刷怪，暂停冻结且召唤期间不能重复排队',()=>{
 const g=scene();advanceSupport(g,60);assert.equal(g.enemies.length,0);
 g.boss.skillCycle=1;updateBoss(g,.04);assert.equal(g.boss.ai.skill,'summon');
 let hits=0;g.hurt=()=>hits++;Object.assign(g.player,{x:g.boss.x,y:g.boss.y});updateBossHazards(g,3);assert.equal(hits,0);
 assert.equal(beginBossSupport(g),false);const state=structuredClone(g.boss.support);
 g.state='paused';advanceSupport(g,10);assert.deepEqual(g.boss.support,state);
 g.state='playing';advanceSupport(g,1.9);assert.equal(g.enemies.length,0);
 advanceSupport(g,2);assert.equal(g.enemies.length,2);advanceSupport(g,60);assert.equal(g.enemies.length,2);
});

test('无安全落点的召唤到期取消，不从竞技场外补兵',()=>{
 const g=scene();g.boss.arena={...g.player,radius:50};assert.ok(beginBossSupport(g));
 advanceSupport(g,10);assert.equal(g.enemies.length,0);assert.equal(g.boss.support.pending,0);
});

test('剧情、秘境与守门召唤物不推进任务或领取额外奖励，首领死亡统一清理',()=>{
 for(const [key,mode] of [['story',null],['realm','rogue'],['realm','tower'],['realm','guardian'],['campDefense',null]]){
  const g=scene(),b=g.boss;g[key]={phase:key==='story'?'active':key==='realm'?'combat':'boss',kills:0,mode,stageId:Object.keys(STORY_CHAPTER.nodes)[0]};
  assert.ok(beginBossSupport(g));advanceSupport(g,4);assert.equal(g.enemies.length,2,key);
  const [add]=g.enemies,coins=g.progress.coins,kills=g.kills;
  assert.ok(add.maxHp>=1000);assert.equal(add.species,'ironwood-bulwark');assert.equal(add.reward,0);g.hit(add,1e6);
  if(mode==='guardian')assert.equal(add.goddessTarget,true);
  assert.equal(g[key].kills,0);assert.equal(g.kills,kills);assert.equal(g.progress.coins,coins);
  const original=g.spawnEnemy(0,0,{x:b.x+400,y:b.y},{ordinaryDumpling:true});
  dismissBossSummons(g,b.id);assert.deepEqual(g.enemies,[original]);
 }
});

test('首领死亡或离开后危险区与召唤物清理，满员时召唤位改用专属攻击',()=>{
 const g=scene();assert.ok(beginBossSupport(g));advanceSupport(g,4);
 g.hazards=bossSkillHazards(g.boss,g.player,BOSS_SPECIAL_SKILLS.boar,'#abc');
 g.boss.hp=0;updateBossHazards(g,.04);updateBossSupport(g,.04);assert.equal(g.hazards.length,0);assert.equal(g.enemies.length,0);
 const full=scene();for(let i=0;i<6;i++)full.spawnEnemy(0,0,{x:full.player.x+300,y:full.player.y+i*30},{bossOwner:full.boss.id,ordinaryDumpling:true});
 full.boss.skillCycle=1;updateBoss(full,.04);assert.equal(full.boss.ai.skill,'tusk-sweep');assert.equal(full.boss.support.pending,0);
});

test('守护模式新增地面技能命中祭坛而非玩家',()=>{
 const g=scene();g.realm={mode:'guardian',phase:'combat',goddess:{type:'goddess',x:g.boss.x+150,y:g.boss.y,radius:30}};g.boss.realm=true;
 g.hazards=bossSkillHazards(g.boss,g.realm.goddess,BOSS_SPECIAL_SKILLS.boar,'#abc');
 let altar=0,player=0;g.hurtGoddess=()=>altar++;g.hurt=()=>player++;
 updateBossHazards(g,1.2);assert.equal(altar,1);assert.equal(player,0);
});
