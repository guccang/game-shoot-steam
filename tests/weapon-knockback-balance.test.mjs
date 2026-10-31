// 原版击退回归：adc572d 冲量、失衡、连续腾空、碰撞传播及独立命中快照。
import test from 'node:test';
import assert from 'node:assert/strict';
import {WEAPONS} from '../src/config/weapons.js';
import {VEHICLE_ARMAMENTS} from '../src/config/vehicle-armaments.js';
import {Game,freshProgress} from '../src/game.js';
import {applyImpulse,stepBodies} from '../src/physics/motion.js';
import {fireBallistics} from '../src/combat/ballistics.js';
import {launchGrenade,explodeGrenade} from '../src/combat/grenades.js';
import {cutWithChainsaw} from '../src/combat/melee.js';
import {spiderMinionWeapon} from '../src/combat/spider.js';
import {fireTidePair,advanceTidePair} from '../src/combat/tide-cannon.js';
import {validateTideState} from '../src/config/tide-cannon.js';
import {WORLD} from '../src/world/coordinates.js';
import {updateEnemyAttack,attackProfile} from '../src/combat/enemy-attack.js';
const weapons=[...WEAPONS,...VEHICLE_ARMAMENTS];
// 对应正式命中入口的原版轻重炮和潮汐炮上限。
function pushLimit(w){return w.pushLimit??(w.id==='hover-tide'?620:w.impactScale>2?760:520);}
test('全目录恢复 adc572d 原冲量，没有额外逐武器削弱',()=>{
 assert.deepEqual(weapons.map(w=>w.impulse),[32,15,13,19,27,38,25,4,110,165,16,18,32,32,3,8,165,80,1150,45,340]);
 assert.equal(WEAPONS[6].grenade.impulse,78);
 for(const w of weapons){assert.equal(w.pushLimit,undefined,w.id);assert.notEqual(w.groundedPush,true,w.id);}
});
// 无地形平台只测击退，战斗圈边缘远离样本，避免被空气墙截停后误判通过。
function body(mass=1){return {id:1,type:'enemy',x:2000,y:2000,mass,radius:17,hp:1e6,maxHp:1e6,arena:{x:2000,y:2000,radius:5000}};}
// 完整积分到自然停止，保留实际腾空、落地和阻尼。
function settle(b,fps=120){let height=0;for(let i=0;i<fps*2;i++){stepBodies([b],1/fps,WORLD);height=Math.max(height,b.z||0);}return {distance:Math.hypot(b.x-2000,b.y-2000),height};}
// 以配置施加一轮齐射，模拟近距离所有散弹均命中一个目标的最坏情况。
function volley(b,w,angle=0){for(let i=0;i<(w.pellets||1);i++)applyImpulse(b,{x:Math.cos(angle),y:Math.sin(angle)},w.impulse,pushLimit(w),null,w.groundedPush);}

test('手枪打断扑击，阈值以下的弱击退也不会被锁定轨迹吞掉',()=>{
 for(const force of [32,3]){
  const b=body(),control=body(),p={x:2070,y:2000};
  for(const e of [b,control]){
   e.speed=48;e.assault={phase:'lunge',elapsed:.05,hit:false,originX:2000,originY:2000,endX:2040,endY:2000,dirX:1,dirY:0};
   e.x+=40*(1-(1-.05/attackProfile(e).lunge)**2);
  }
  const start=b.x;applyImpulse(b,{x:-1,y:0},force);stepBodies([b],1/60,WORLD);const pushed=b.x;
  updateEnemyAttack(control,p,p,1/60,WORLD);updateEnemyAttack(b,p,p,1/60,WORLD);
  if(force===32){assert.equal(b.assault.phase,'chase');assert.equal(b.x,pushed);assert.ok(b.knockTime>0);}
  else {assert.equal(b.assault.phase,'lunge');assert.ok(Math.abs((control.x-b.x)-(start-pushed))<1e-8);}
 }
});
test('全武器轻重齐射恢复原上限与腾空，30和120帧结果一致',()=>{
 for(const w of weapons){
  for(const mass of [.3,1,3]){const distances=[];for(const [angle,fps] of [[0,120],[Math.PI/4,120],[Math.PI/4,30]]){
   const b=body(mass);volley(b,w,angle);assert.ok(Math.max(Math.abs(b.pushX),Math.abs(b.pushY))<=pushLimit(w)+1e-6,w.id);
   const result=settle(b,fps);assert.ok(result.distance>0&&result.distance<600,`${w.id}: ${result.distance}`);
   if(w.groundedPush)assert.equal(result.height,0,w.id);distances.push(result.distance);
  }assert.ok(Math.abs(distances[1]-distances[2])<.01,w.id);}
 }
 const pine=VEHICLE_ARMAMENTS[0],b=body();volley(b,pine);const d=settle(b).distance;assert.ok(d>195&&d<210);
 const cannon=body();volley(cannon,VEHICLE_ARMAMENTS[1]);assert.ok(settle(cannon).distance>d*1.5);
});
test('高速连射和散弹叠加遵守原版逐轴上限，停火后自然停止',()=>{
 for(const w of weapons){const b=body(.3);for(let i=0;i<120;i++){volley(b,w,Math.PI/4);assert.ok(Math.max(Math.abs(b.pushX),Math.abs(b.pushY))<=pushLimit(w)+1e-6,w.id);stepBodies([b],1/120,WORLD);if(w.groundedPush)assert.equal(b.z,0,w.id);}
  settle(b);stepBodies([b],1,WORLD);assert.ok(Math.hypot(b.pushX,b.pushY)<1,w.id);
 }
});
test('机枪恢复怪群连锁腾空，重炮仍能继续补充冲击',()=>{
 const list=[body(),{...body(),id:2,x:2036},{...body(),id:3,x:2072}];volley(list[0],VEHICLE_ARMAMENTS[0]);
 let chain=false;for(let i=0;i<120;i++){stepBodies(list,1/120,WORLD);chain ||= list[1].z>1&&list[1].knockTime>0;}assert.ok(chain);
 assert.ok(list[1].x>2036);volley(list[1],VEHICLE_ARMAMENTS[1]);assert.ok(list[1].knockTime>0&&list[1].vz>0);
});
test('正式弹道、射线、电弧和电锯恢复统一受击机制',()=>{
 const g=new Game(freshProgress(),()=>.5);g.state='playing';g.trees=[];Object.assign(g.player,{x:1960,y:2000,angle:0});
 for(const [index,w] of weapons.entries()){
  if(w.controller==='mechanical')continue;
  const b=body(.3);g.enemies=[b];g.projectiles=[];g.boss=null;const weapon={...w,weaponIndex:index};
  if(w.id==='chainsaw')cutWithChainsaw(g,weapon,{x:1960,y:1992},{x:1,y:0},1,false,true);
  else fireBallistics(g,weapon,{x:1960,y:1992},{x:1,y:0},1,false,true);
  for(let i=0;i<120&&g.projectiles.length;i++)g.updateProjectiles(1/120);
  assert.ok(b.hp<1e6,w.id);assert.ok(Math.max(Math.abs(b.pushX||0),Math.abs(b.pushY||0))<=pushLimit(w)+1e-6,w.id);
  if(w.impulse>=13)assert.ok(b.knockTime>0&&b.vz>0,w.id);
 }
 const minion=spiderMinionWeapon(WEAPONS[16]);assert.notEqual(minion.groundedPush,true);assert.equal(minion.impulse,8);
});
test('榴弹恢复原冲量，救援弹显式覆盖上限仍传到范围伤害',()=>{
 const g=new Game(freshProgress(),()=>.5);g.state='playing';g.trees=[];const b=body(.3);g.enemies=[b];
 for(const limit of [520,50]){
  b.pushX=b.pushY=b.z=b.vz=b.knockTime=0;
  launchGrenade(g,{...WEAPONS[6],weaponIndex:6},{x:1960,y:1992},b,1);const grenade=g.projectiles.at(-1);assert.equal(grenade.impulse,78);
  Object.assign(grenade,{x:1990,y:1992,pushLimit:limit});explodeGrenade(g,grenade);assert.ok(Math.hypot(b.pushX,b.pushY)<=limit+1e-6);
 }
});
test('轻重武器打领主仍保留抗击退和技能前摇',()=>{
 const g=new Game(freshProgress(),()=>.5);g.state='playing';g.trees=[];
 for(const [index,w] of weapons.entries()){
  const b={...body(6),type:'boss',ai:{phase:'windup',elapsed:.2}};
  g.hit(b,1,false,{direction:{x:.6,y:.8},kind:w.id,weaponIndex:index,impulse:w.impulse,pushLimit:w.pushLimit,groundedPush:w.groundedPush});
  const d=settle(b).distance;assert.ok(d>0&&d<27,w.id);assert.equal(b.ai.phase,'windup');assert.ok(!(b.z>0)&&!(b.knockTime>0));
 }
});

// 两喷口均走快照校验，检查点序列化不能吞掉新加入的物理参数。
test('潮汐炮两次正式发射及检查点恢复保留原冲量与腾空机制',()=>{
 const g=new Game(freshProgress(),()=>.5);g.state='playing';g.enemies=[];g.trees=[];const magazine={},w=VEHICLE_ARMAMENTS[3];
 fireTidePair(g,w,{x:1960,y:1992},{x:1,y:0},32,false,magazine);
 magazine.tide=validateTideState(JSON.parse(JSON.stringify(magazine.tide)));
 advanceTidePair(g,magazine,.12,{x:1960,y:1992},{x:1,y:0});
 assert.equal(g.projectiles.length,2);for(const b of g.projectiles){assert.equal(b.pushLimit,undefined);assert.notEqual(b.groundedPush,true);assert.equal(b.impulse,340);assert.equal(b.amount,32);}
});
