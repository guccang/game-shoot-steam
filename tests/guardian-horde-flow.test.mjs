// 守护渐进怪潮与休整动作：验证密度、低帧率补兵、飞行连续性及战斗资源隔离。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {realmStageSpec, REALM_RADIUS} from '../src/config/realms.js';
import {updateRealm} from '../src/core/realms/realm-manager.js';
import {CombatCamera} from '../src/rendering/camera.js';

// 固定随机数使出生位置和正式波次状态可重现。
function guardian() {
  const g=new Game(undefined,()=>.45);
  g.progress.weapons.fill(1);g.progress.vehicleHulls.fill(1);
  g.enterRealm('guardian');g.realm.realmCoins=3000;
  return g;
}

test('守护从12只和4个同屏名额逐波增长，普通模式与血量不变',()=>{
  for(const stage of [1,2,5,6,20,100]){
    const n=stage-1, g=realmStageSpec('guardian',stage), oldHp=Math.round(32*(1+n*.14+n*n*.012));
    assert.equal(g.total,12+n*6);assert.equal(g.alive,Math.min(72,4+n*2));
    assert.equal(g.hp,Math.round(oldHp*.55));assert.ok(Math.abs(g.spacing-Math.max(.35,1.8/(1+n*.12)))<1e-12);
    assert.equal(g.boss,stage%5===0);
    const rogue=realmStageSpec('rogue',stage),tower=realmStageSpec('tower',stage);
    assert.equal(rogue.total,24+n*6);assert.equal(rogue.hp,oldHp);assert.equal(tower.alive,Math.min(72,18+n*2));
  }
});

test('正式补兵在20帧与60帧下保持密度，并严格遵守同屏上限与配额',()=>{
  for(const dt of [1/20,1/60]){
    const g=guardian();let seed=12345;g.random=()=>((seed=(1664525*seed+1013904223)>>>0)/2**32);g.continueRealm();g.realm.warning=0;
    for(let i=0;i<Math.round(2/dt);i++)updateRealm(g,dt);
    assert.ok(g.realm.spawned===2);
    for(let i=0;i<Math.round(10/dt);i++)updateRealm(g,dt);
    assert.equal(g.enemies.length,4);
    // 满场等待不累积刷怪债务，释放一个名额后只补一只。
    g.enemies.pop();updateRealm(g,dt);assert.equal(g.enemies.length,4);
    g.enemies=[];g.realm.stage=20;g.realm.spec=realmStageSpec('guardian',20);g.realm.spawned=0;g.realm.spawnTimer=0;
    for(let i=0;i<Math.round(2/dt);i++)updateRealm(g,dt);
    assert.ok(g.realm.spawned===4);
    g.enemies=[];g.realm.spawned=g.realm.spec.total-1;g.realm.spawnTimer=0;
    updateRealm(g,.05);assert.equal(g.realm.spawned,g.realm.spec.total);assert.ok(g.boss);
    updateRealm(g,.05);assert.equal(g.realm.spawned,g.realm.spec.total);
  }
});

test('守护手动全景贴近完整边界，手动缩放及普通镜头保持可用',()=>{
  const arena={x:900,y:700,radius:REALM_RADIUS},c=new CombatCamera();
  for(const [w,h] of [[320,568],[390,844],[844,390],[1280,900]])for(const step of [0,2.5,6]){
    c.setZoomStep(step);const v=c.update(arena,w,h,null,0,false,{mode:'guardian',arena});
    const fit=Math.min(w-48,h-Math.min(140,h*.22)-Math.min(200,h*.3))/(REALM_RADIUS*2+80);
    const span=Math.min(w-48,h-Math.min(140,h*.22)-Math.min(200,h*.3));
    const overview=Math.min(fit*1.3,(span-2)/(REALM_RADIUS*2));
    assert.equal(v.zoom,Math.min(1.25,overview*1.35**step));
    if(step===0){
      assert.ok(v.zoom>.7*fit*1.3,'必须明显拉近误缩小后的镜头');
      assert.ok((arena.x-REALM_RADIUS-v.x)*v.zoom>=24);
      assert.ok((arena.x+REALM_RADIUS-v.x)*v.zoom<=w-24);
    }
    assert.equal(c.update(arena,w,h).zoom,w<500?.85:1.05);
  }
});

test('清波后玩家及支架飞行持续，供给与伤害冻结，暂停与开波姿态连续',()=>{
  const g=guardian();g.progress.weapon=12;
  g.guardianDefense('deploy',0,'weapon',12);g.guardianDefense('deploy',1,'weapon',13);g.guardianDefense('deploy',2,'weapon',0);
  g.continueRealm();g.realm.warning=999;
  for(let i=0;i<10;i++)g.update(.05);
  g.enemies=[];g.realm.kills=g.realm.spec.total;updateRealm(g,0);
  const f=g.realm.defenses[0].runtime.funnel,d=g.realm.defenses[1].runtime.drone;
  f.nodes[0].cooldown=3;f.nodes[0].magazine.remaining=2;f.nodes[0].magazine.ammo=0;f.nodes[0].charging=true;
  const before={x:f.nodes[1].x,y:f.nodes[1].y,phase:f.orbitPhase,drone:d.time,player:g.funnel.time,time:g.time,health:g.realm.goddess.hp};
  const mag=JSON.stringify(f.nodes[0].magazine), supply=g.realm.defenses[2].runtime.vehicle.module;
  supply.magazine.remaining=1;const ammo=JSON.stringify(supply);
  for(let i=0;i<40;i++)g.update(.05);
  assert.notEqual(f.nodes[1].x,before.x);assert.notEqual(f.nodes[1].y,before.y);assert.notEqual(f.orbitPhase,before.phase);
  assert.ok(d.time>before.drone && g.funnel.time>before.player);assert.equal(g.time,before.time);assert.ok(g.realm.idleTime>=2-1e-8);
  assert.equal(g.realm.goddess.hp,before.health);assert.equal(JSON.stringify(f.nodes[0].magazine),mag);
  assert.equal(f.nodes[0].cooldown,3);assert.equal(JSON.stringify(supply),ammo);assert.equal(g.projectiles.length,0);
  const idle=g.realm.idleTime,orbit=f.orbitPhase;g.pause();g.update(.05);
  assert.equal(g.realm.idleTime,idle);assert.equal(f.orbitPhase,orbit);g.start();
  const pose=f.nodes.map(n=>[n.x,n.y,n.angle]);g.continueRealm();
  const resumed=g.realm.defenses[0].runtime.funnel;
  assert.deepEqual(resumed.nodes.map(n=>[n.x,n.y,n.angle]),pose);assert.equal(resumed.orbitPhase,orbit);
  assert.equal(g.realm.idleTime,idle);assert.equal(g.realm.stage,2);
});
