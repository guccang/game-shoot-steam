// 蜘蛛母巢与重装爪的正式规则：成长、定时补召、承伤、固定主炮和状态隔离。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { freshProgress, validateProgress } from '../src/progression/progress.js';
import { effectiveWeapon } from '../src/config/weapon-mods.js';
import { WEAPONS } from '../src/config/weapons.js';
import { updateSpider, resetSpiderFormation } from '../src/combat/spider.js';
import { updateMechanical, hurtMechanical } from '../src/combat/mechanical.js';
import { advanceReload } from '../src/combat/magazine.js';
import { companionTargets, companionEnemyTarget, damageCompanion } from '../src/combat/companion-targets.js';
import { workshopUpgrade, quoteWorkshop } from '../src/progression/workshop.js';
import { commitWorkshop } from '../src/core/workshop.js';
import { expeditionEquipment } from '../src/config/expedition.js';
import { vehicleCompanionContext } from '../src/combat/vehicle-companions.js';
import { updateVehicle } from '../src/combat/vehicle.js';
import { createWorkshopTrial } from '../src/core/workshop-trial.js';
import { prepareGuardianDefense, updateGuardianDefenses } from '../src/core/guardian-defense.js';
import { blocked } from '../src/physics/motion.js';

// 开放地面夹具仍调用真实战斗逻辑，不使用玩家存档。
function arena(index=16){const p=freshProgress();p.weapons.fill(1);p.vehicleWeapons.fill(1);p.vehicleHulls.fill(1);p.weapon=index;p.bosses=100;p.coins=p.wood=999999;p.materials={parts:9999,crystal:9999,core:9999};const g=new Game(p,()=>.5);g.trees=[];g.enemies=[];g.boss=null;g.state='playing';g.updateWaves=()=>{};Object.assign(g.player,{x:900,y:750,arena:{x:900,y:750,radius:700}});return g;}
// 与主循环一致：能源时钟只推进一次，再推进伙伴会话。
function step(g,seconds){for(let i=0;i<Math.ceil(seconds*60);i++){advanceReload(g.magazines[16],g.weapon(),1/60);updateSpider(g,1/60);}}
// 高耐久静止敌人便于验证真实索敌与伤害，避免提前回收。
function foe(g,x=1030,y=750){const e=g.spawnEnemy(0,0,{x,y});Object.assign(e,{hp:1e6,maxHp:1e6,speed:0,damage:0,flying:false,arena:g.player.arena});return e;}

test('追加编号16、旧档补齐，协同模块8至20只且秘境不继承永久成长',()=>{
 assert.equal(WEAPONS[15].id,'mechanical-core');assert.equal(WEAPONS[16].id,'mechanical-spider');const p=arena().progress;
 const old={...p,weapons:p.weapons.slice(0,16),weapon:0,weaponParts:undefined};const restored=validateProgress(old);assert.equal(restored.weapons[16],0);assert.equal(restored.weaponParts[16].coordination,1);
 for(let level=1;level<=13;level++){p.weaponParts[16].coordination=level;assert.equal(effectiveWeapon(p,16).summonCount,level+7);}
 assert.equal(effectiveWeapon(expeditionEquipment(p,{weapon:16,vehicle:null,turret:null,modules:[0,0,0]},1),16).summonCount,8);
});
test('重装原生爪300生命、低移速，换枪保持受损比例且不能复活',()=>{
 const g=arena(15);updateMechanical(g,0);const n=g.mechanical.nodes[0],heavy=g.weapon();assert.equal(n.maxHp,300);assert.equal(heavy.moveSpeed,120);n.hp=90;
 g.progress.mechanicalLoadout=0;updateMechanical(g,0);assert.equal(n.hp,18);assert.equal(n.maxHp,60);assert.ok(g.weapon().interval<heavy.interval);assert.equal(g.weapon().moveSpeed,200);
 g.progress.mechanicalLoadout=null;updateMechanical(g,0);assert.equal(n.hp,90);hurtMechanical(g,n,999);g.progress.mechanicalLoadout=0;updateMechanical(g,0);assert.equal(n.hp,0);
});
test('母体原生脉冲且不继承其他枪械配置，正式弹丸伤害归属新核心',()=>{
 const g=arena();g.progress.mechanicalLoadout=1;g.progress.weapons[9]=20;foe(g);let hits=0;const hit=g.hit.bind(g);g.hit=(...args)=>{hits++;hit(...args);};
 for(let i=0;i<420;i++)g.update(1/60);assert.equal(g.spider.mother.gun.weapon.weaponIndex,9);assert.equal(g.spider.gun.ownerIndex,16);assert.equal(g.spider.gun.damage,Math.round(g.damage(16)*1.5));assert.ok(hits>0);assert.ok(g.spider.nodes.filter(n=>n.spawned).every(n=>!n.gun));
});
test('每两秒出一只、满编不积攒，死亡回收名额后只按周期补一只',()=>{
 const g=arena();step(g,1.9);assert.equal(g.spider.nodes.filter(n=>n.spawned).length,0);step(g,.2);assert.equal(g.spider.nodes.filter(n=>n.spawned).length,1);step(g,16);assert.equal(g.spider.nodes.filter(n=>n.spawned&&n.hp>0).length,8);
 const n=g.spider.nodes[0];hurtMechanical(g,n,999);step(g,2.1);assert.equal(n.hp,0);step(g,1.7);assert.equal(n.hp,0);step(g,.4);assert.equal(n.hp,90);assert.equal(g.spider.nodes.filter(n=>n.hp>0).length,8);
});
test('母体与小蛛均是怪物独立目标，母体倒下暂停主炮及出舱',()=>{
 const g=arena();step(g,4.2);const e=foe(g,g.spider.mother.x+10,g.spider.mother.y),targets=companionTargets(g);assert.equal(targets.length,3);
 const t=companionEnemyTarget(g,e,targets);assert.equal(t.node,g.spider.mother);assert.ok(damageCompanion(t,500));assert.equal(g.spider.mother.hp,0);
 const charge=g.spider.gun.pulse.charge,count=g.spider.nodes.filter(n=>n.spawned).length;step(g,5.8);assert.equal(g.spider.mother.hp,0);assert.equal(g.spider.gun.pulse.charge,charge);assert.equal(g.spider.nodes.filter(n=>n.spawned).length,count);step(g,.3);assert.equal(g.spider.mother.hp,480);
});
test('协同升级只扩大上限，不瞬间生成；失败回滚、上限与重复提交明确拒绝',()=>{
 const g=arena();step(g,17);const before=JSON.stringify(g.spider),plan=workshopUpgrade(g.progress,'weapons',16,'coordination');assert.ok(quoteWorkshop(g.progress,plan).ok);assert.equal(commitWorkshop(g,plan,()=>false).ok,false);assert.equal(JSON.stringify(g.spider),before);assert.ok(commitWorkshop(g,plan,()=>true).ok);assert.equal(g.spider.nodes.filter(n=>n.spawned).length,8);assert.equal(commitWorkshop(g,plan,()=>true).ok,false);
 step(g,2.1);assert.equal(g.spider.nodes.filter(n=>n.spawned).length,9);g.progress.weaponParts[16].coordination=13;step(g,40);assert.equal(g.spider.nodes.filter(n=>n.spawned&&n.hp>0).length,20);assert.equal(quoteWorkshop(g.progress,workshopUpgrade(g.progress,'weapons',16,'coordination')).ok,false);
});
test('收起、暂停与波间不推进召唤或回血，重新部署保持生命能源和冷却',()=>{
 const g=arena();step(g,4.2);g.spider.mother.hp=123;const energy=g.magazines[16].ammo,timer=g.spider.spawnTimer;updateSpider(g,5,false);assert.equal(g.spider.spawnTimer,timer);assert.equal(g.magazines[16].ammo,energy);
 resetSpiderFormation(g.spider);step(g,0);assert.equal(g.spider.mother.hp,123);g.transact('weapons',0,'equip');const frozen=JSON.stringify(g.spider);updateSpider(g,10);assert.equal(JSON.stringify(g.spider),frozen);g.transact('weapons',16,'equip');assert.equal(g.spider.mother.hp,123);
 g.state='paused';const paused=JSON.stringify(g.spider);g.update(2);assert.equal(JSON.stringify(g.spider),paused);
});
test('森林母体与小蛛保持合法脚底，八足不改变树干和水界',()=>{
 const g=arena();g.player.arena=null;g.player.x=1050;g.player.y=710;
 for(let i=0;i<500;i++){updateSpider(g,1/60);for(const n of [g.spider.mother,...g.spider.nodes].filter(n=>n.active&&n.ready))assert.equal(blocked(n.x,n.y,n.radius,g.trees,n),false);}
});
test('四种车载来源均独立，守护支架保持自己的母体与波间暂停',()=>{
 for(let hull=0;hull<4;hull++){const g=arena(0);g.progress.vehicleIndex=hull;g.progress.vehicleLoadouts[hull]=16;g.reset();g.state='playing';g.trees=[];g.enemies=[];g.vehicle.active=true;const hand=JSON.stringify(g.spider);for(let i=0;i<310;i++)updateVehicle(g,1/60);const local=vehicleCompanionContext(g);assert.ok(local.spider.mother.ready);assert.equal(local.spider.nodes.filter(n=>n.spawned).length,2);assert.equal(JSON.stringify(g.spider),hand);}
 const g=arena();g.realm={mode:'guardian',phase:'combat',buffs:{},arena:g.player.arena,defenses:[]};const tower={slot:0,kind:'weapon',index:16,weaponIndex:16,level:1};g.realm.defenses.push(tower);const local=prepareGuardianDefense(g,tower);for(let i=0;i<310;i++)updateGuardianDefenses(g,1/60);assert.notEqual(local.spider,g.spider);assert.equal(local.spider.nodes.filter(n=>n.spawned).length,2);g.realm.phase='rest';const saved=JSON.stringify(local.spider);updateGuardianDefenses(g,5);assert.equal(JSON.stringify(local.spider),saved);
});
test('正式试射脉冲击破靶标且按周期出舱，原始进度与资源不变',()=>{
 const p=arena().progress,saved=JSON.stringify(p),trial=createWorkshopTrial(p,'weapons',16);for(let i=0;i<300;i++)trial.advance(1/30);assert.ok(trial.destroyed>0);assert.equal(trial.game.spider.nodes.filter(n=>n.spawned).length,5);assert.equal(JSON.stringify(p),saved);
});
