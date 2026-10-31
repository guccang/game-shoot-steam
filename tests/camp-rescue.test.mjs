// 伙伴分批出营与实弹节奏回归：不替换伤害、敌人更新或结算路径。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {CAMP_DEFENSE,CAMP_GATES,campDefenseGrade} from '../src/config/camp-defense.js';
import {startCampDefense,rescueCampDefense,syncCampDefense} from '../src/core/camp-defense.js';
import {campRescuePower} from '../src/core/camp-rescue.js';
import {campDefenseObjects} from '../src/rendering/camp-defense.js';
import {RESIDENT_CHATTER} from '../src/config/resident-chatter.js';
// 场地使用真实营门，玩家不射击，以便单独观察援军的出场与战斗效率。
function setup(seed=.41,count=24,hp=24,gateId='left'){
 const g=new Game(freshProgress(),()=>seed);g.state='playing';g.mainlineTalkDelay=999;
 const gate=CAMP_GATES.find(x=>x.id===gateId);Object.assign(g.player,{x:gate.x,y:gate.y});startCampDefense(g,gateId);
 const r=g.campDefense;r.timer=999;g.attackTimer=999;g.enemies=[];
 for(let i=0;i<count;i++){const lateral=(i%6-2.5)*25,depth=180+Math.floor(i/6)*30,e=g.spawnEnemy(0,0,{x:r.barrier.x+gate.nx*depth-gate.ny*lateral,y:r.barrier.y+gate.ny*depth+gate.nx*lateral},{ambient:true});Object.assign(e,{campDefense:true,arena:r.arena,hp,maxHp:hp,damage:5,speed:42});}
 return g;
}
// 逐帧记录真实剩余敌人数，确保不是延迟几秒后直接清空。
function advance(g,seconds){for(let t=0;t<seconds&&g.state==='playing';t+=.05)g.update(.05);}

test('逐个通过营门后才开火，等候伙伴不可见；暂停冻结出场',()=>{
 for(const gate of ['left','top']){
  const g=setup(.41,24,24,gate),before=g.enemies.reduce((s,e)=>s+e.hp,0);rescueCampDefense(g,'barricade');const r=g.campDefense;
  assert.equal(campDefenseObjects(g).filter(x=>x.kind==='ally').length,0);
  advance(g,1);assert.deepEqual(r.helpers.map(h=>h.entered),[true,false]);assert.equal(g.enemies.reduce((s,e)=>s+e.hp,0),before);assert.equal(g.projectiles.length,0);
  const clock=r.rescueTime,position=r.helpers[0].local.player.x;g.pause();advance(g,2);assert.equal(r.rescueTime,clock);assert.equal(r.helpers[0].local.player.x,position);g.pause();
  advance(g,3.5);assert.ok(r.helpers[0].ready);assert.ok(r.helpers[1].entered);assert.equal(r.helpers[1].ready,false);assert.ok(g.enemies.filter(e=>e.hp>0).length>5);
  assert.ok(r.helpers[0].local.player.bodyAnimation);assert.ok(r.helpers[0].local.vehicle.wheelPhase!==0||r.helpers[0].local.player.walkPhase>0);
 }
});

test('不同随机援军都逐步削减怪群，实战完成且不更改玩家装备或成绩',()=>{
 for(const seed of [0,.41,.99]){
  const g=setup(seed),equipment=JSON.stringify([g.progress.weapons,g.progress.vehicleHulls,g.progress.weaponParts]);rescueCampDefense(g,'barricade');const r=g.campDefense,counts=[];
  for(let i=0;i<60&&r.phase==='rescue';i++){advance(g,1);counts.push(g.enemies.filter(e=>e.hp>0).length);}
  assert.equal(r.phase,'result',JSON.stringify({seed,counts,power:r.rescuePower}));assert.ok(r.rescueTime>8);assert.ok(counts.some(n=>n>0&&n<24));assert.equal(r.kills,0);assert.equal(campDefenseGrade(r),'B');
  assert.equal(JSON.stringify([g.progress.weapons,g.progress.vehicleHulls,g.progress.weaponParts]),equipment);
 }
});

test('强敌提升救援战力，随机幅度有界且保存不重抽',()=>{
 const weak=setup(.41,24,18),strong=setup(.41,24,180);
 const a=campRescuePower(weak),b=campRescuePower(strong);assert.ok(b.level>a.level);assert.ok(b.dps>a.dps*5);assert.ok(a.roll>=.9&&a.roll<=1.1);
 rescueCampDefense(strong,'death');syncCampDefense(strong);assert.equal(strong.progress.campDefense.run.rescueRoll,b.roll);strong.random=()=>0;assert.equal(campRescuePower(strong).roll,b.roll);
});

test('领主救场仍通过真实命中结算，不瞬杀也不拖成持久战',()=>{
 for(const seed of [0,.41,.99]){
  const g=setup(seed,0),r=g.campDefense;r.phase='boss-ready';g.summonBoss=()=>{};
  g.boss={id:g.nextId++,type:'boss',kind:'boar',campDefense:true,x:r.barrier.x-220,y:r.barrier.y,hp:1900,maxHp:1900,radius:38,mass:8,attack:2,speed:45,damage:32,blastDamage:60,ai:{phase:'chase',elapsed:0},arena:r.arena};
  rescueCampDefense(g,'barricade');advance(g,5);assert.ok(g.boss?.hp>0);advance(g,65);assert.equal(r.phase,'result','seed '+seed);assert.equal(r.bossDefeated,false);assert.equal(r.kills,0);
 }
});

test('营地与救援短句能放进两行小气泡',()=>{
 for(const line of [...Object.values(RESIDENT_CHATTER).flat(),CAMP_DEFENSE.lines.death,CAMP_DEFENSE.lines.barricade])assert.ok([...line].length<=24,line);
});
