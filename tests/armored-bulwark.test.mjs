// 重装怪使用正式工厂、伤害、攻击与物理入口，覆盖强度、配额及隔离。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {ARMORED,armoredSpawn} from '../src/config/armored-enemies.js';
import {RANGED_ENEMIES} from '../src/config/ranged-enemies.js';
import {updateEnemyAttack,attackProfile} from '../src/combat/enemy-attack.js';
import {WORLD} from '../src/world/coordinates.js';
import {applyImpulse} from '../src/physics/motion.js';

// 固定陆地夹具避开生活区保护与随机战斗，保留正式属性计算。
function arena(){const g=new Game(freshProgress(),()=>0);g.start();g.enemies=[];g.trees=[];g.wave=3;Object.assign(g.player,{x:1600,y:400,arena:{x:1600,y:400,radius:1000}});return g;}
// 第八个名额通过正常工厂生成重装，首个名额用于同地区同阶级比较。
function pair(){const g=arena(),normal=g.spawnEnemy(0,0,{x:1700,y:400});g.waveSpawned=7;const heavy=g.spawnEnemy(0,0,{x:1700,y:400});return {g,normal,heavy};}

test('重装生命4.5倍、半速、高质量且有额外奖励',()=>{
 const {normal,heavy}=pair();assert.equal(heavy.species,ARMORED.id);assert.ok(Math.abs(heavy.hp-normal.hp*4.5)<=2);assert.equal(heavy.speed,normal.speed*.5);assert.equal(normal.mass,3);assert.equal(heavy.mass,30);assert.equal(heavy.radius,25);assert.equal(heavy.reward,Math.round(normal.reward*1.5));
});
test('正式武器伤害不被隐藏减免，重装可承受更多次同等命中',()=>{
 const {g,normal,heavy}=pair(),hp=heavy.hp;g.hit(heavy,10);assert.equal(heavy.hp,hp-10);
 while(normal.hp>0)g.hit(normal,10);assert.ok(heavy.hp>0);
 let hits=1;while(heavy.hp>0){g.hit(heavy,10);hits++;}assert.equal(hits,Math.ceil(hp/10));assert.ok(g.remnants.some(e=>e.species===ARMORED.id));
});
test('同等冲量下重装只短退，足够强的重击仍可打断',()=>{
 const {normal,heavy}=pair();applyImpulse(normal,{x:1,y:0},100);applyImpulse(heavy,{x:1,y:0},100);
 assert.ok(heavy.pushX>0&&Math.abs(heavy.pushX)<Math.abs(normal.pushX));assert.ok(!(heavy.knockTime>0));
 applyImpulse(heavy,{x:1,y:0},400);assert.ok(heavy.knockTime>0);
});
test('前三波循序引入，存活限额不抢远程和飞行名额',()=>{
 for(const stage of [1,2])for(let i=1;i<=40;i++)assert.equal(armoredSpawn(stage,i,0,[]),false);
 assert.equal(armoredSpawn(3,3,.79,[]),true);assert.equal(armoredSpawn(3,3,.8,[]),false);
 assert.equal(armoredSpawn(3,3,0,Array.from({length:3},()=>({species:ARMORED.id,hp:1}))),false);
 const g=arena();g.wave=10;for(let i=0;i<80;i++)g.spawnEnemy(0,0,{x:1700,y:400});
 assert.equal(g.waveSpawned,80);assert.equal(g.enemies.filter(e=>e.species===ARMORED.id).length,3);assert.ok(g.enemies.some(e=>RANGED_ENEMIES[e.species]));assert.ok(g.enemies.some(e=>e.flying));
});
test('剧情、秘境和借用领主归属的普通脚本不随机混入重装，野外遭遇可出现',()=>{
 for(const mode of ['story','realm','boss','ambient']){
  const g=arena();g.wave=10;g.waveSpawned=2;if(['story','realm'].includes(mode))g[mode]={};
  const e=g.spawnEnemy(0,0,{x:2400,y:1000},mode==='boss'?{bossOwner:1}:mode==='ambient'?{ambient:true}:null);assert.notEqual(e.species,ARMORED.id);
 }
 const g=arena();g.encounterSpawned=2;assert.equal(g.spawnEnemy(0,0,{x:2400,y:1000},{ambient:true,rangedEncounter:true}).species,ARMORED.id);assert.equal(g.waveSpawned,0);
});
test('长前摇盾击只伤害一次，横向走位可躲，冷却中不接触伤害',()=>{
 for(const dodge of [false,true]){
  const {g,heavy:e}=pair();e.x=g.player.x+65;e.arena=g.player.arena;const p=attackProfile(e);
  assert.equal(p.windup,.95);updateEnemyAttack(e,g.player,g.player,.01,WORLD);assert.equal(e.assault.phase,'windup');
  assert.equal(updateEnemyAttack(e,g.player,g.player,.94,WORLD),0);
  if(dodge)g.player.y+=150;let damage=0;for(let i=0;i<125;i++)damage+=updateEnemyAttack(e,g.player,g.player,1/60,WORLD);
  assert.equal(damage,dodge?0:e.damage);
 }
});
test('实际追击带动步相，停止和暂停步相不跳变',()=>{
 const {g,heavy:e}=pair();e.x=1850;e.arena=g.player.arena;const start=e.x;
 updateEnemyAttack(e,g.player,g.player,.5,WORLD);assert.ok(start-e.x>0);assert.ok(e.armoredWalk>0);
 const phase=e.armoredWalk;updateEnemyAttack(e,g.player,g.player,0,WORLD);assert.equal(e.armoredWalk,phase);
 e.x=g.player.x+70;updateEnemyAttack(e,g.player,g.player,.01,WORLD);updateEnemyAttack(e,g.player,g.player,.2,WORLD);assert.equal(e.armoredWalk,phase);
});
