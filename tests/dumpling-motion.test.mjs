// 团子软体动作的定点规则回归：不改变战斗数值、暂停与正式落地时序。
import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceDumplingMotion,markDumplingHit,dumplingPose} from '../src/combat/dumpling-motion.js';
import {dumplingSizeName} from '../src/config/monster-families.js';
import {RANGED_ENEMIES,rangedMuzzle} from '../src/config/ranged-enemies.js';
import {ARMORED} from '../src/config/armored-enemies.js';
import {Game,freshProgress} from '../src/game.js';
import {updateBossHazards} from '../src/combat/bosses.js';
import {enemyIdentity} from '../src/world/biomes.js';

// 小型实体固定出生坐标，让测试只观察实际行程和受击时钟。
function actor(species='slime'){return {type:'enemy',species,x:1600,y:400,speed:40,hp:100,maxHp:100,radius:17};}

test('真实位移推进弹跳，停止保留相位并自然收势，零时间不推进',()=>{
 const e=actor();for(let i=0;i<12;i++){const from={...e};e.x+=2;advanceDumplingMotion(e,from,.05);}
 assert.ok(e.gelMove>.9);const phase=e.gelStep;assert.notEqual(dumplingPose(e).squash,0);
 for(let i=0;i<20;i++)advanceDumplingMotion(e,e,.05);
 assert.equal(e.gelStep,phase);assert.ok(e.gelMove<.001);const before=JSON.stringify(e);advanceDumplingMotion(e,e,0);assert.equal(JSON.stringify(e),before);
});
test('轻武器实际命中也压缩回弹，密集连击不锁在压扁姿态',()=>{
 const g=new Game(freshProgress(),()=>.5);g.start();const e=actor();g.enemies=[e];g.hit(e,1,false,{direction:{x:1,y:0},impulse:0});
 assert.equal(e.gelHitAge,0);assert.ok(dumplingPose(e).squash>.2);
 for(let i=0;i<18;i++){advanceDumplingMotion(e,e,.01);markDumplingHit(e);}
 assert.ok(dumplingPose(e).squash<0);assert.ok(e.gelHitAge>.17);assert.equal(e.hp,99);
 advanceDumplingMotion(e,e,.5);assert.equal(dumplingPose(e).squash,0);
});
test('车团只动软体，盾团减幅，枪口和所有逻辑属性不受动作更新影响',()=>{
 for(const species of ['bramble-buggy','ironwood-bulwark','spore-spitter']){
  const e=actor(species),before={hp:e.hp,radius:e.radius,x:e.x,y:e.y},muzzle=RANGED_ENEMIES[species]?rangedMuzzle(e):null;
  markDumplingHit(e);advanceDumplingMotion(e,e,.02);const pose=dumplingPose(e);
  assert.deepEqual({hp:e.hp,radius:e.radius,x:e.x,y:e.y},before);
  if(muzzle)assert.deepEqual(rangedMuzzle(e),muzzle);
  if(species==='bramble-buggy')assert.equal(pose.lift,0);
  if(species==='ironwood-bulwark')assert.ok(pose.squash<.13);
  assert.deepEqual(dumplingPose(e,true),{squash:0,lift:0,sway:0});
 }
 const boar={kind:'boar',x:1600,y:400};markDumplingHit(boar);advanceDumplingMotion(boar,boar,.1);assert.equal(boar.gelHitAge,undefined);
});
test('普通三级改名，车团盾团等特色名称保持不变',()=>{
 assert.deepEqual([0,1,2].map(dumplingSizeName),['小团子','中团子','大团子']);
 assert.equal(RANGED_ENEMIES['bramble-buggy'].name,'装甲车团');assert.equal(ARMORED.name,'铁甲盾团');
 for(const roll of [0,.65,.99]){const e=enemyIdentity(1600,400,roll);assert.equal(e.name,dumplingSizeName(e.rank));}
});
test('正式落地只生成一次有界胶质特效，不新增伤害或随机调用，暂停冻结',()=>{
 const g=new Game(freshProgress(),()=>.5);g.start();g.trees=[];g.boss={id:55,arena:{x:1600,y:400,radius:500}};g.player.x=1700;g.player.y=400;
 g.hazards=[{owner:55,kind:'slam',family:'dumpling',x:1500,y:400,age:0,warmup:.1,duration:.35,radius:68,color:'#90a875',damage:1}];
 let hits=0;g.hurt=()=>hits++;g.random=()=>{throw Error('不可消耗战斗随机');};g.fx.random=()=>{throw Error('复合特效无需随机');};
 updateBossHazards(g,.11);updateBossHazards(g,.11);assert.equal(g.fx.items.filter(p=>p.kind==='gel-impact').length,1);assert.equal(hits,0);
 const item=g.fx.items[0];assert.equal(item.duration,.7);assert.equal(item.size,68);g.state='paused';const before=JSON.stringify(g.hazards);updateBossHazards(g,1);assert.equal(JSON.stringify(g.hazards),before);
 g.fx.update(.8);assert.equal(g.fx.items.length,0);
});
