import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
// 森林运动会通过正式Game更新验证计圈、竞争、体力、一次发奖和场景隔离。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {RACE,RACE_TURN,racePoint,raceReward} from '../src/config/forest-race.js';
import {finishRace} from '../src/core/forest-race.js';
import {syncRealm} from '../src/core/realm-manager.js';
// 跳过与比赛无关的入职对白，保留正式装备和森林对象。
function create(){const p=freshProgress();p.arrival=null;const g=new Game(p,()=>.5);g.state='playing';assert.ok((g.progress.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id),g.enterRealm('race')));return g;}
// 固定六十帧推进，暂停、倒计时与比赛共用公开更新方法。
function step(g,seconds,input={x:0,y:0}){for(let i=0;i<Math.ceil(seconds*60);i++)g.update(1/60,input);}
// 用普通方向输入沿中线跑完整比赛，不瞬移、不跳旗标或直接修改成绩。
function run(g,sprint=true,reverse=false,seconds=60){
 for(let i=0;i<seconds*60&&g.realm.phase==='combat';i++){
  const r=g.realm,p=g.player,a=Math.atan2((p.y-r.arena.y)/RACE.ry,(p.x-r.arena.x)/RACE.rx),target=racePoint(a+(reverse?-.09:.09),r.arena,-10),dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy);
  g.update(1/60,{x:dx/d,y:dy/d,sprint});
 }
}
test('旧档补齐运动会纪录，进入只统计一次，开赛不能重复',()=>{const g=create();assert.equal(g.progress.statistics.plays.race,1);assert.equal(g.realm.phase,'build');assert.equal(g.progress.realms.records.race.bestTimeMs,0);assert.ok(g.startRace());assert.equal(g.startRace(),false);assert.equal((g.progress.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id),g.enterRealm('race')),false);});
test('起跑预告不能抢跑，暂停同时冻结对手、身体时钟和体力',()=>{const g=create();g.startRace();const x=g.player.x;step(g,2,{x:-1,y:0,sprint:true});assert.equal(g.player.x,x);assert.equal(g.realm.elapsed,0);assert.equal(g.realm.rivals[0].progress,0);step(g,2,{x:-1,y:0,sprint:true});g.state='paused';const before=JSON.stringify({r:g.realm,p:g.player});step(g,3,{x:1,y:0,sprint:true});assert.equal(JSON.stringify({r:g.realm,p:g.player}),before);});
test('体力耗尽有恢复门槛，停下和慢跑恢复，不靠连点无限冲刺',()=>{const g=create();g.startRace();step(g,3.1);step(g,3,{x:-1,y:0,sprint:true});assert.ok(g.realm.exhausted);assert.ok(g.realm.stamina<25);step(g,2);assert.ok(g.realm.stamina>25);assert.equal(g.realm.exhausted,false);});
test('中场不能穿越，逆跑与跨起点往返不能刷圈',()=>{const g=create();g.startRace();step(g,3.1);step(g,4,{x:0,y:-1});const r=g.realm,p=g.player;assert.ok(Math.hypot(p.x-r.arena.x,p.y-r.arena.y)>=RACE.ry-RACE.halfWidth-.01);assert.equal(r.nextGate,1);run(g,false,true,22);assert.equal(r.cleared,0);assert.ok(r.distance<0);assert.equal(r.nextGate,1);});
test('真实两圈竞争产生名次与奖励，重复完成和读档不会二次发放',()=>{const g=create();g.startRace();const before=g.progress.coins;run(g);const r=g.realm;assert.equal(r.phase,'won');assert.ok(r.place>=1&&r.place<=4);assert.ok(r.nextGate>16);assert.ok(r.elapsed>10&&r.elapsed<60);assert.equal(g.progress.coins-before,raceReward(r.place).coins);assert.equal(g.progress.realms.records.race.clears,1);assert.ok(g.progress.realms.records.race.bestTimeMs>0);assert.equal(finishRace(g,true),false);syncRealm(g);const saved=validateProgress(g.progress),coins=saved.coins;const restored=new Game(saved,()=>.5);assert.equal(restored.realm.phase,'won');step(restored,2);assert.equal(restored.progress.coins,coins);assert.equal(restored.progress.realms.records.race.clears,1);});
test('提前退出零奖励且完整恢复森林血量、供给、载具及敌人',()=>{const p=freshProgress();p.arrival=null;p.vehicleHulls[7]=1;p.vehicleIndex=7;const g=new Game(p,()=>.5);g.state='playing';g.summonVehicle();g.player.hp=63;g.vehicle.hp-=25;g.vehicle.module.magazine.ammo=3;g.magazines[0].ammo=2;const forest={player:g.player,vehicle:g.vehicle,enemies:g.enemies,ammo:g.magazines,coins:g.progress.coins};(g.progress.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id),g.enterRealm('race'));g.startRace();assert.equal(g.summonVehicle(),false);step(g,6,{x:-1,y:0,sprint:true});g.leaveRealm();assert.equal(g.realm,null);assert.equal(g.player,forest.player);assert.equal(g.vehicle,forest.vehicle);assert.equal(g.enemies,forest.enemies);assert.equal(g.magazines,forest.ammo);assert.equal(g.player.hp,63);assert.equal(g.magazines[0].ammo,2);assert.equal(g.vehicle.module.magazine.ammo,3);assert.equal(g.progress.coins,forest.coins);assert.ok(g.vehicle.active);});
test('超时不发奖，比赛中刷新回准备页，不继承半圈或体力',()=>{const g=create();g.startRace();step(g,8,{x:-1,y:0,sprint:true});syncRealm(g);const saved=validateProgress(g.progress);assert.equal(saved.realms.run.phase,'build');const restored=new Game(saved);assert.equal(restored.realm.distance,0);assert.equal(restored.realm.stamina,100);const coins=g.progress.coins;step(g,100);assert.equal(g.realm.phase,'lost');assert.equal(g.progress.coins,coins);assert.equal(g.progress.realms.records.race.clears,0);});
test('比赛不发射武器、不召唤伙伴、不推进波次，角色成长不会改变跑速',()=>{const a=create(),b=create();b.progress.hero=4;b.progress.weapons.fill(20);b.progress.weapon=16;for(const g of [a,b])g.startRace();step(a,4,{x:-1,y:0});step(b,4,{x:-1,y:0});assert.equal(a.player.x,b.player.x);assert.equal(a.player.y,b.player.y);assert.equal(b.projectiles.length,0);assert.equal(b.enemies.length,0);assert.ok(!b.spider.mother.ready);assert.equal(b.waveSpawned,0);});
