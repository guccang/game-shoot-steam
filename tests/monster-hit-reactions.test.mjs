// 验证物种受击分类、局部姿态和正式冲量路径，避免改动作时意外改变战斗数值。
import test from 'node:test';
import assert from 'node:assert/strict';
import {monsterHitProfile} from '../src/config/monster-hit-reactions.js';
import {monsterHitPose,hitFoot} from '../src/rendering/monster-hit-reactions.js';
import {applyImpulse,stepBodies} from '../src/physics/motion.js';
import {WORLD} from '../src/world/coordinates.js';
import {Game,freshProgress} from '../src/game.js';
const species=['ironwood-bulwark','spore-spitter','acorn-slinger','reed-archer','stump-bombard','bramble-buggy','leaf-bat'];
// 使用同一无地形位置与质量，隔离物种姿态和实际物理规则。
function body(id){return {id:1,type:'enemy',species:id,biome:'meadow',rank:0,x:2000,y:2000,hp:10000,maxHp:10000,radius:17,mass:1,arena:{x:2000,y:2000,radius:5000},assault:{phase:'windup',elapsed:.2}};}
test('仅默认团怪与圆形史莱姆翻滚，非圆形物种及领主不翻滚',()=>{
 for(const id of [undefined,'slime'])assert.ok(monsterHitProfile(body(id)).roll);
 for(const id of [...species,'future-standing-monster'])assert.equal(monsterHitProfile(body(id)).roll,false,id);
 assert.equal(monsterHitProfile({...body(),type:'boss'}).roll,false);
});
test('各物种保留同质量下的位移、腾空、控制与速度衰减，只有团子累计翻滚角度',()=>{
 for(const grounded of [false,true])for(const direction of [{x:1,y:0},{x:-.6,y:.8},{x:0,y:-1}]){
  const base=body(),list=species.map(body);for(const e of [base,...list])applyImpulse(e,direction,140,320,null,grounded);
  let roll=0;
  for(let frame=0;frame<240;frame++){
   for(const e of [base,...list])stepBodies([e],1/120,WORLD);
   roll=Math.max(roll,Math.abs(base.rollAngle));
   for(const e of list){for(const key of ['x','y','z','vz','pushX','pushY','knockTime'])assert.equal(e[key],base[key],e.species+key);assert.equal(e.rollAngle,0);}
  }
  assert.ok(roll>1);assert.ok(list.every(e=>e.hitStep>0));
 }
});
test('连锁碰撞仍能传递冲量，站立目标不会因碰撞恢复翻滚',()=>{
 const a=body('slime'),b={...body('ironwood-bulwark'),id:2,x:2036};applyImpulse(a,{x:1,y:0},140,320);
 for(let i=0;i<90;i++)stepBodies([a,b],1/120,WORLD);
 assert.ok(b.x>2036);assert.equal(b.rollAngle,0);assert.ok(b.hitStep>0);
});
test('连续命中不重置后撤相位，身体倾斜有界，左右和纵向均有局部动作',()=>{
 for(const id of species)for(const direction of [{x:1,y:0},{x:-1,y:0},{x:0,y:1}]){
  const e=body(id);for(let i=0;i<20;i++){const previous=e.hitStep||0;applyImpulse(e,direction,45,320,null,true);stepBodies([e],1/60,WORLD);assert.ok(e.hitStep>=previous);}
  if(id==='bramble-buggy')assert.ok(Math.abs(e.hitWheel)>0);
  const p=monsterHitPose(e);assert.ok(p.strength>0);assert.ok(Math.abs(p.lean)<=.18);assert.ok(hitFoot(p,-1).lift!==hitFoot(p,1).lift);assert.equal(monsterHitPose(e,true).strength,0);
  for(let i=0;i<360;i++)stepBodies([e],1/120,WORLD);assert.ok(monsterHitPose(e).strength<.001);
 }
});
test('正式命中重装保留伤害、击退和控制，死亡残块也没有整体翻滚',()=>{
 const g=new Game(freshProgress(),()=>.5);g.state='playing';g.trees=[];const e=body('ironwood-bulwark');e.mass=3.2;g.enemies=[e];
 g.hit(e,25,false,{direction:{x:1,y:0},impulse:140,power:2});assert.equal(e.hp,9975);assert.ok(e.knockTime>0);stepBodies([e],.1,WORLD);assert.equal(e.rollAngle,0);
 g.hit(e,20000,false,{direction:{x:-1,y:0},impulse:140,power:2});const corpse=g.remnants.at(-1);assert.ok(corpse);stepBodies([corpse],.1,WORLD);assert.equal(corpse.rollAngle,0);
});
