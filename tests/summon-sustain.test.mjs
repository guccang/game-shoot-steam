import { legacyVehicleGame } from './helpers/legacy-vehicle.mjs';
import { companionEnemyTarget, damageCompanion } from '../src/combat/companion-targets.js';
// 逐只部署、持续回能和小蛛死亡爆炸的正式规则回归。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { freshProgress } from '../src/progression/progress.js';
import { updateMechanical, hurtMechanical, resetMechanicalFormation } from '../src/combat/mechanical.js';
import { updateSpider } from '../src/combat/spider.js';
import { advanceReload, consumeRound } from '../src/combat/magazine.js';
import { summonRegenRate } from '../src/config/summon-energy.js';
import { updateVehicle } from '../src/combat/vehicle.js';
import { vehicleCompanionContext } from '../src/combat/vehicle-companions.js';
import { hitCenter } from '../src/combat/collision.js';
// 开放场地隔离随机波次，保留正式属性和受击结算。
function arena(index=15,vehicle=false){
 const p=freshProgress();p.weapons.fill(1);p.vehicleWeapons.fill(1);p.vehicleHulls.fill(1);
 p.weapon=index;p.weaponParts[15].coordination=8;p.vehicleLoadouts[0]=index;
 const g=legacyVehicleGame(p,()=>.5);g.state='playing';g.trees=[];g.enemies=[];g.boss=null;g.updateWaves=()=>{};
 Object.assign(g.player,{x:900,y:800,arena:{x:900,y:800,radius:700}});g.vehicle.active=vehicle;return g;
}
// 定步长推进实际供给入口；只测部署时可关闭回能以核算一次扣费。
function step(g,seconds,update=updateMechanical,regen=true){for(let t=0;t<seconds-1e-8;t+=1/60){if(regen)advanceReload(g.magazines[g.progress.weapon],g.weapon(),1/60);update(g,1/60);}}
// 正式怪物保持静止，中心点按碰撞口径定位。
function enemyAt(g,x,y){const e=g.spawnEnemy(0,0,{x,y});Object.assign(e,{hp:10000,maxHp:10000,speed:0,flying:false,arena:g.player.arena});return e;}

test('十只小狗逐只部署，集中死亡仍按一秒逐只补召，重复更新不多扣能量',()=>{
 const g=arena(),count=()=>g.mechanical.nodes.filter(n=>n.active&&n.ready&&n.hp>0).length;
 updateMechanical(g,0);assert.equal(count(),1);updateMechanical(g,0);assert.equal(count(),1);
 step(g,.9);assert.equal(count(),1);step(g,.1);assert.equal(count(),2);step(g,8);assert.equal(count(),10);
 g.mechanical.nodes.forEach(n=>hurtMechanical(g,n,1000));const m=g.magazines[15];m.ammo=36;
 step(g,2,updateMechanical,false);assert.equal(count(),1);assert.equal(m.ammo,30);
 step(g,1,updateMechanical,false);assert.equal(count(),2);assert.equal(m.ammo,24);
 updateMechanical(g,0);assert.equal(count(),2);assert.equal(m.ammo,24);
});
test('欠能量逐格恢复直到能补召；暂停不推进，回收后逐只归队且不回血',()=>{
 const g=arena();step(g,10);const n=g.mechanical.nodes[0],m=g.magazines[15];hurtMechanical(g,n,1000);m.ammo=0;
 updateMechanical(g,20,false);assert.equal(n.deadTime,2);assert.equal(m.ammo,0);
 step(g,1.5);assert.equal(n.hp,0);assert.equal(m.remaining,0);step(g,.6);assert.equal(n.hp,n.maxHp);assert.ok(m.ammo<6);
 n.hp=77;const before=m.ammo;resetMechanicalFormation(g.mechanical);updateMechanical(g,0);
 assert.equal(g.mechanical.nodes.filter(n=>n.active&&n.ready).length,1);assert.equal(n.hp,77);assert.equal(m.ammo,before);
});
test('各召唤核心未满即恢复，分步与整步一致，不储存满能源溢出，不影响普通枪装填',()=>{
 for(const index of [12,13,15,16]){
  const g=arena(index),w=g.weapon(),a={ammo:2,remaining:0},b={...a};
  advanceReload(a,w,1);for(let i=0;i<120;i++)advanceReload(b,w,1/120);
  assert.equal(a.ammo,2+Math.floor(summonRegenRate(w)));assert.equal(a.ammo,b.ammo);assert.equal(a.remaining,0);
  a.ammo=0;a.remaining=w.reloadTime;advanceReload(a,w,.1);assert.equal(a.remaining,0);assert.ok(a.ammo<=1);
  advanceReload(a,w,100);assert.equal(a.ammo,w.magazineSize);assert.equal(a.regenProgress,0);
  consumeRound(a,w);advanceReload(a,w,.001);assert.equal(a.ammo,w.magazineSize-1);
 }
 const w=arena(0).weapon(),m={ammo:1,remaining:0};consumeRound(m,w);assert.equal(m.remaining,w.reloadTime);
 advanceReload(m,w,w.reloadTime);assert.equal(m.ammo,w.magazineSize);
});
test('小蛛死亡范围爆炸每条生命一次，近敌高伤害，远敌、主人和伙伴无损',()=>{
 const g=arena(16);step(g,2.1,updateSpider);const n=g.spider.nodes[0],c=hitCenter(n);
 const near=enemyAt(g,n.x,n.y),edge=enemyAt(g,n.x+70,n.y),far=enemyAt(g,n.x+200,n.y);
 // 地面敌人和机械小蛛的中心高度不同，直接按真实中心计算期望衰减。
 const damage=Math.round(g.damage(16)*g.weapon().minionDamageRatio)*2;
 const expected=Math.round(damage*(1-.45*Math.min(1,Math.hypot(hitCenter(near).x-c.x,hitCenter(near).y-c.y)/80)));
 const hp=g.player.hp,motherHp=g.spider.mother.hp;
 hurtMechanical(g,n,999);assert.equal(10000-near.hp,expected);assert.ok(near.hp<edge.hp&&edge.hp<10000);assert.equal(far.hp,10000);
 assert.equal(g.player.hp,hp);assert.equal(g.spider.mother.hp,motherHp);assert.equal(g.fx.items.filter(p=>p.kind==='blast').length,1);
 assert.equal(hurtMechanical(g,n,999),false);assert.equal(10000-near.hp,expected);
 step(g,4.1,updateSpider);assert.equal(n.deathExploded,false);assert.ok(n.hp>0);
 hurtMechanical(g,g.spider.mother,9999);assert.equal(g.fx.items.filter(p=>p.kind==='blast').length,1);
});
test('车载核心逐只召唤且独立回能，车载小蛛爆炸使用炮塔伤害，不借手持等级',()=>{
 const g=arena(15,true);g.progress.weapon=0;updateVehicle(g,.01);const local=vehicleCompanionContext(g),m=local.magazines[15];
 assert.equal(local.mechanical.nodes.filter(n=>n.active&&n.ready).length,1);m.ammo=0;
 const hand=structuredClone(g.magazines[15]);for(let i=0;i<60;i++)updateVehicle(g,1/60);
 assert.ok(m.ammo>0);assert.deepEqual(g.magazines[15],hand);
 const s=arena(16,true);s.progress.weapon=0;s.progress.vehicleWeapons[16]=10;
 for(let i=0;i<130;i++)updateVehicle(s,1/60);
 const source=vehicleCompanionContext(s),n=source.spider.nodes[0];const target=enemyAt(s,n.x,n.y);let dealt=0;
 source.hit=(_,amount)=>{dealt+=amount;};hurtMechanical(source,n,999);
 assert.ok(dealt>0);assert.equal(target.hp,10000);assert.equal(s.spider.nodes[0].spawned,false);
});

// 车载收起时保留敌人锁定的旧位置，但不能继续伤害休眠队伍或借手持属性自爆。
test('扑击中收起车载伙伴，不将伤害转给玩家，也不触发休眠小蛛爆炸',()=>{
 const g=arena(16,true);g.progress.weapon=0;for(let i=0;i<130;i++)updateVehicle(g,1/60);
 const local=vehicleCompanionContext(g),n=local.spider.nodes[0],e=enemyAt(g,n.x+10,n.y);
 e.companionTarget=n;e.assault.phase='windup';g.vehicle.active=false;
 const target=companionEnemyTarget(g,e),hp=n.hp;assert.equal(target.node,n);assert.equal(target.source,null);
 assert.equal(damageCompanion(target,999),false);assert.equal(n.hp,hp);assert.equal(n.deathExploded,false);
});
// 同时死亡的上限队伍仍复用粒子预算，并不会形成跨帧重复范围伤害。
test('二十蛛同时死亡的伤害及粒子数量有界，重复受击不重复爆炸',()=>{
 const g=arena(16);g.progress.weaponParts[16].coordination=13;step(g,42,updateSpider);
 const alive=g.spider.nodes.filter(n=>n.active&&n.ready&&n.hp>0);assert.equal(alive.length,20);
 let blasts=0;g.onEvent=type=>{if(type==='explosion')blasts++;};
 alive.forEach(n=>hurtMechanical(g,n,999));assert.equal(blasts,20);assert.ok(g.fx.items.length<=260);
 alive.forEach(n=>hurtMechanical(g,n,999));assert.equal(blasts,20);
});
