// 循环探索、生态分区、弹道物理与多体碰撞的行为回归。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress,WEAPONS} from '../src/game.js';
import {WORLD,canonical,nearest,worldDistance} from '../src/world/coordinates.js';
import {moveBody,stepBodies,applyImpulse} from '../src/physics/motion.js';
import {BIOMES,biomeAt,forestLayout,pathDistance,enemyIdentity} from '../src/world/biomes.js';
import {isWaterBlocked,riverPoint,riverXAt} from '../src/world/river-geometry.js';
import {FOREST_VARIANTS} from '../src/world/landscape-variants.js';
import {parkingClearing} from '../src/world/forest-clearings.js';
import {monsterFrame} from '../src/rendering/monster-atlas.js';
import {fireBallistics} from '../src/combat/ballistics.js';
import {updateEnemyAttack,createEnemyAttack} from '../src/combat/enemy-attack.js';

// 创建无自动刷怪与射击干扰的实验战场。
function arena() {const g=new Game(freshProgress(),()=>.5);g.trees=[];g.enemies=[];g.attackTimer=g.spawnTimer=999;g.start();return g;}
// 碰撞测试的同质量基础怪。
function body(id,x,y,mass=1) {return {id,type:'enemy',x,y,hp:999,maxHp:999,radius:17,mass,speed:44,assault:createEnemyAttack()};}

test('扩展森林四个象限都有可采集林团，路网与河道贯穿完整地图',()=>{
  assert.deepEqual(WORLD,{width:10800,height:8400});
  const g=new Game(freshProgress(),()=>.5);
  for(let column=0;column<2;column++)for(let row=0;row<2;row++){
    const trees=g.trees.filter(t=>Math.floor(t.x/(WORLD.width/2))===column&&Math.floor(t.y/(WORLD.height/2))===row);
    // 营地、生活道路与停车场净空后左上保留22棵；用20棵下限保留少量调整余地。
    const minimum=column===0&&row===0?20:70;
    assert.ok(trees.length>=minimum,`象限 ${column},${row} 实际 ${trees.length} 棵，要求至少 ${minimum} 棵`);
    assert.ok(trees.every(t=>!isWaterBlocked(t.x,t.y)));
    assert.ok(trees.every(t=>!parkingClearing(t.x,t.y)),'可采集树不得侵入停车位与倒车通道');
    const tree=trees[0],wood=g.progress.wood;
    g.hit(tree,tree.hp);
    assert.ok(g.progress.wood>wood,'每个象限的树必须可以正常采集木头');
  }
  assert.equal(biomeAt(g.player.x,g.player.y).id,'meadow');
  assert.equal(pathDistance(WORLD.width,729),0);
  assert.equal(pathDistance(630,WORLD.height),0);
  for(const y of [1500,2100,2700])assert.ok(isWaterBlocked(riverXAt(y),y));
});
test('四边与角落连续移动，地形周期一致，最近镜像保留短距离',()=>{
  for(const [x,y,dx,dy] of [[WORLD.width - 2,700,20,0],[2,700,-20,0],[900,WORLD.height - 2,0,20],[900,2,0,-20],[WORLD.width - 2,WORLD.height - 2,20,20]]){
    const p={x,y};moveBody(p,dx,dy,WORLD);assert.ok(Math.abs(p.x-x-dx)<1e-8);assert.ok(Math.abs(p.y-y-dy)<1e-8);const q=canonical(p);assert.ok(q.x>=0&&q.x<WORLD.width&&q.y>=0&&q.y<WORLD.height);
  }
  assert.equal(worldDistance({x:WORLD.width - 10,y:700},{x:10,y:700}),20);
  assert.equal(riverPoint(0).x,riverPoint(1).x);assert.equal(riverPoint(1).y-riverPoint(0).y,WORLD.height);
  for(const p of [{x:1240,y:1000},{x:900,y:700}])assert.equal(isWaterBlocked(p.x,p.y),isWaterBlocked(p.x+WORLD.width,p.y-WORLD.height));
});
test('跨边界瞄准、实弹、激光与资源吸附不沿远路跳跃',()=>{
  for(const weapon of [0,1,4]){
    const g=arena();g.player.x=WORLD.width - 10;g.player.y=700;g.progress.weapon=weapon;g.progress.weapons[weapon]=1;const e=body(1,90,700);g.enemies=[e];g.attack();g.updateProjectiles(.3);assert.ok(e.hp<999);assert.ok(Math.abs(g.player.angle)<.01);
    g.hit(e,9999);const coins=g.progress.coins;g.hit(e,9999);assert.equal(g.progress.coins,coins);const before=worldDistance(g.drops.at(-1),g.player);g.update(.05);assert.ok(worldDistance(g.drops.at(-1),g.player)<before);
  }
});
test('怪物跨地图接缝前摇扑击仍能命中，玩家横移能躲避',()=>{
  for(const dodge of [false,true]){const e=body(1,WORLD.width - 20,700),p={x:40,y:700};let damage=0;for(let i=0;i<70;i++){const previous={...p};if(dodge)p.y+=2;damage+=updateEnemyAttack(e,p,previous,.01,WORLD);}assert.equal(damage,dodge?0:8);}
});
test('林团布局可复现、主路留空、六种树木与生态等级解耦且等级逐区增长',()=>{
  const layout=forestLayout();assert.deepEqual(layout,forestLayout());assert.ok(layout.length>100);
  for(const t of layout){assert.ok(pathDistance(t.x,t.y)>=66);assert.ok(FOREST_VARIANTS.some(v=>v.id===t.variant));assert.equal(t.biome,biomeAt(t.x,t.y).id);assert.ok(t.palette>=0&&t.palette<=3);assert.ok(t.x>=0&&t.x<WORLD.width&&t.y>=0&&t.y<WORLD.height);}
  let hp=0,damage=0;
  for(const z of BIOMES){const e=enemyIdentity(z.x,z.y,.5);assert.ok(e.level>=z.level&&e.level<=z.level+2);assert.ok(e.hp>hp&&e.damage>damage);hp=e.hp;damage=e.damage;assert.equal(biomeAt(z.x+WORLD.width,z.y-WORLD.height).id,z.id);}
  const base=enemyIdentity(900,700,.5),advanced=enemyIdentity(900,700,.8),elite=enemyIdentity(900,700,.99);assert.deepEqual([base.rank,advanced.rank,elite.rank],[0,1,2]);assert.deepEqual([base.mass,advanced.mass,elite.mass],[3,3,3]);assert.ok(base.hp<advanced.hp&&advanced.hp<elite.hp);
});
test('一只怪物撞动第二第三只，碰撞后仍可再次受击滚地，最终停止',()=>{
  const bodies=[body(1,700,700),body(2,740,700),body(3,780,700)];let impacts=0;applyImpulse(bodies[0],{x:1,y:0},75);
  for(let i=0;i<60;i++)stepBodies(bodies,1/120,WORLD,(_,b)=>{if(b)impacts++;});
  assert.ok(impacts>=2);assert.ok(bodies[2].x>785);assert.ok(bodies.some(b=>Math.abs(b.rollAngle)>1));
  applyImpulse(bodies[2],{x:-1,y:0},80);assert.ok(bodies[2].knockTime>0);assert.equal(bodies[2].reactionTime,0);
  for(let i=0;i<600;i++)stepBodies(bodies,1/120,WORLD);
  for(const b of bodies){assert.ok(Math.hypot(b.pushX,b.pushY)<1);assert.equal(b.z,0);assert.equal(b.knockTime,0);}
});
test('重怪击退更短，跨边界撞击不漏判，30和120帧结果接近',()=>{
  const light=body(1,700,700),heavy=body(2,700,800,3);applyImpulse(light,{x:1,y:0},50);applyImpulse(heavy,{x:1,y:0},50);stepBodies([light,heavy],.2,WORLD);assert.ok(light.x>heavy.x);
  const a=body(1,WORLD.width - 20,700),b=body(2,22,700);applyImpulse(a,{x:1,y:0},70);for(let i=0;i<40;i++)stepBodies([a,b],1/120,WORLD);assert.ok(b.x>25);
  const positions=[];for(const dt of [1/30,1/120]){const list=[body(1,700,700),body(2,740,700),body(3,780,700)];applyImpulse(list[0],{x:1,y:0},70);for(let t=0;t<1-1e-8;t+=dt)stepBodies(list,dt,WORLD);positions.push(list.map(b=>b.x));}positions[0].forEach((x,i)=>assert.ok(Math.abs(x-positions[1][i])<1));
});
test('弹丸具有阻力和高度变化，落地回弹减能且仍能扫掠近处目标',()=>{
  const g=arena();fireBallistics(g,WEAPONS[5],{x:800,y:700},{x:1,y:0},6,false);const b=g.projectiles[0];g.updateProjectiles(.15);assert.ok(b.speed<540);assert.ok(b.z>9);assert.ok(b.x>800&&b.x<881);
  const r=arena();fireBallistics(r,WEAPONS[4],{x:800,y:700},{x:1,y:0},19,false);const ball=r.projectiles[0];ball.z=.1;ball.vz=-100;r.updateProjectiles(.01);assert.ok(ball.vz>0);assert.equal(ball.groundBounces,1);assert.ok(ball.speed<690);
});
test('暂停冻结滚地与爆裂，帧清单24FPS变化且末帧不循环，死亡仅奖励一次',()=>{
  assert.notEqual(monsterFrame('roll',0).index,monsterFrame('roll',.05).index);assert.equal(monsterFrame('burst',10).index,7);
  const g=arena();g.enemies=[body(1,1000,700)];g.hit(g.enemies[0],1);g.update(.05);g.pause();const snapshot=JSON.stringify(g.enemies);g.update(.05);assert.equal(JSON.stringify(g.enemies),snapshot);g.pause();g.hit(g.enemies[0],2000);assert.equal(g.remnants.length,1);const coins=g.progress.coins;g.hit(g.enemies[0],2000);assert.equal(g.progress.coins,coins);for(let i=0;i<20;i++)g.update(.05);assert.equal(g.remnants.length,0);
});
