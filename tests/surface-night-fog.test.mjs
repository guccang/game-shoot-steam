import {fireTidePair,advanceTidePair} from '../src/combat/tide-cannon.js';
import {validateTideState} from '../src/config/tide-cannon.js';
import {playerThreatRange} from '../src/combat/threat-range.js';
// 夜间视野的真实交战回归，覆盖装备快照、旧目标、车炮、召唤物和敌方远程。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {surfaceWeapon,surfaceAttackRange,surfaceTargetVisible,surfaceNightStrength,surfaceLightSources} from '../src/world/surface-vision.js';
import {LIGHT_FIXTURES} from '../src/world/lighting.js';
import {WORLD} from '../src/world/coordinates.js';
import {attackTargetKnown,rememberCombatTarget} from '../src/combat/perception.js';
import {summonTargetPool} from '../src/combat/summons/targets.js';
import {fireBallistics} from '../src/combat/ballistics.js';
import {updateVehicle} from '../src/combat/vehicle.js';
import {vehicleWeapon} from '../src/config/vehicles.js';
import {updateRangedAttack} from '../src/combat/ranged-enemies.js';
import {RANGED_ENEMIES} from '../src/config/ranged-enemies.js';
// 正式游戏实例配固定空旷干地，不替换武器攻击和装填代码。
function scene(index=8){const p=freshProgress();p.weapon=index;p.weapons[index]=1;p.vehicleHulls[0]=1;p.vehicleIndex=0;p.vehicleWeapons[17]=1;p.vehicleLoadouts[0]=17;const g=new Game(p,()=>.5);g.state='playing';g.trees=[];g.enemies=[];g.boss=null;Object.assign(g.player,{x:9000,y:9000,angle:0});g.setViewport(390,844);g.arrivalView={left:-600,right:600,top:-600,bottom:600,width:390,height:844};return g;}
// 固定靶保留碰撞和高生命，避免死亡奖励干扰断言。
function target(g,x){return {id:1,type:'enemy',x:g.player.x+x,y:g.player.y,hp:10000,maxHp:10000,radius:17,mass:1,speed:0};}

test('昼夜连续收缩、反复调用不重复打折、清晨恢复且不修改原武器',()=>{const g=scene(),base=g.weapon(),range=base.range;for(const n of [0,.25,.5,1,.5,0]){g.surfaceNight=n;const w=g.weapon();assert.equal(w.range,surfaceAttackRange(g,range));assert.equal(surfaceWeapon(g,w).range,w.range);assert.equal(base.range,range);}g.surfaceNight=1;assert.ok(g.weapon().range<=170);g.surfaceNight=0;assert.equal(g.weapon().range,range);});
test('短兵器长度、室内、矿区、秘境和独立试验场不被地面夜雾改变',()=>{const g=scene(14),range=g.weapon().range;g.surfaceNight=1;assert.equal(g.weapon().range,range);for(const props of [{cottage:{kind:'mine'}},{realm:{}},{summonView:{}},{trees:Object.assign([],{mineScene:true})}]){const context=Object.assign(Object.create(g),props);assert.equal(surfaceNightStrength(context),0);assert.equal(surfaceAttackRange(context,1000),1000);}});
test('浓雾屏蔽记忆目标，回到光圈重新发现，白昼远程恢复',()=>{const g=scene(),e=target(g,300);g.enemies=[e];rememberCombatTarget(g,e);assert.equal(attackTargetKnown(g,e),true);assert.equal(g.findAttackTarget(),e);g.surfaceNight=1;assert.equal(attackTargetKnown(g,e),false);assert.equal(g.findAttackTarget(),null);const ammo=g.magazines[8].ammo;assert.equal(g.attack(),false);assert.equal(g.magazines[8].ammo,ammo);e.x=g.player.x+100;assert.equal(g.findAttackTarget(),e);g.surfaceNight=0;e.x=g.player.x+300;assert.equal(g.findAttackTarget(),e);});
test('夜间手持真实弹道缩短，白天已发出的弹丸不被追溯截断',()=>{const g=scene(11),w=g.weapon(),muzzle={x:g.player.x+30,y:g.player.y-8};fireBallistics(g,w,muzzle,{x:1,y:0},10,false);const old=g.projectiles.at(-1),before=old.remaining;g.surfaceNight=1;fireBallistics(g,w,muzzle,{x:1,y:0},10,false);assert.ok(g.projectiles.at(-1).remaining<before);assert.equal(old.remaining,before);assert.ok(g.projectiles.at(-1).remaining<=170);});
test('夜间车炮放弃远目标且不扣弹，近身重新射击',()=>{const g=scene(),e=target(g,300);g.enemies=[e];rememberCombatTarget(g,e);g.vehicle.active=true;g.surfaceNight=1;const mag=g.vehicle.module.magazine;Object.assign(mag,{ammo:vehicleWeapon(g.progress,g.vehicle.weaponIndex).magazineSize,remaining:0});const ammo=mag.ammo;for(let i=0;i<60;i++)updateVehicle(g,1/60);assert.equal(g.vehicle.targetId,null);assert.equal(mag.ammo,ammo);e.x=g.player.x+100;for(let i=0;i<60;i++)updateVehicle(g,1/60);assert.equal(g.vehicle.targetId,e.id);assert.ok(mag.ammo<ammo);assert.ok(g.projectiles.every(b=>b.remaining<=170));});
test('召唤物也只追踪近处可见敌人，不从远处穿雾锁定',()=>{const g=scene(),e=target(g,300);g.enemies=[e];assert.equal(summonTargetPool(g,g.player,800)[0],e);g.surfaceNight=1;assert.deepEqual(summonTargetPool(g,g.player,800),[]);e.x=g.player.x+100;assert.equal(summonTargetPool(g,g.player,800)[0],e);});
test('固定路灯形成同源光池、地面光源有上限、循环边界连续',()=>{const g=scene();g.surfaceNight=1;const l=LIGHT_FIXTURES[0];Object.assign(g.player,{x:l.x+400,y:l.y});assert.equal(surfaceTargetVisible(g,{x:l.x+l.offset,y:l.y-l.height+20}),true);const lights=surfaceLightSources(g.player,Array.from({length:80},()=>l));assert.equal(lights.length,40);assert.deepEqual(lights[1],{x:l.x+l.offset,y:l.y-l.height,radius:l.radius,kind:l.kind});Object.assign(g.player,{x:WORLD.width-40,y:9000});assert.equal(surfaceTargetVisible(g,{x:30,y:9000}),true);assert.equal(surfaceTargetVisible(g,{x:400,y:9000}),false);});
test('普通远程怪夜晚先接近再蓄力，已有前摇离开光圈取消',()=>{const g=scene();g.surfaceNight=1;const e=g.spawnEnemy(0,0,{x:g.player.x+300,y:g.player.y});Object.assign(e,{species:'spore-spitter',hp:1000,speed:0,damage:10,flying:false,arena:{x:g.player.x,y:g.player.y,radius:1000}});updateRangedAttack(g,e,g.player,.01);assert.equal(e.assault.phase,'chase');e.x=g.player.x+120;updateRangedAttack(g,e,g.player,.01);assert.equal(e.assault.phase,'windup');e.x=g.player.x+300;updateRangedAttack(g,e,g.player,2);assert.equal(e.assault.phase,'recovery');assert.equal(g.enemyBolts.length,0);e.assault.phase='chase';e.x=g.player.x+120;updateRangedAttack(g,e,g.player,.01);updateRangedAttack(g,e,g.player,RANGED_ENEMIES[e.species].windup+.01);assert.equal(g.enemyBolts.length,1);});

// 双发会经过可保存快照，不能把已经缩短的射程当成原值再乘一次。
test('双喷口序列化后保留射程基值，控制器威胁半径不沿用部署距离',()=>{const g=scene();g.surfaceNight=1;const w=surfaceWeapon(g,{id:'hover-tide',range:260}),snapshot=validateTideState({pending:{weapon:w}}).pending.weapon;assert.equal(surfaceWeapon(g,snapshot).range,w.range);g.weapon=()=>({controller:'funnel',range:900});g.vehicle.active=false;g.funnel={nodes:[{weapon:{range:700}}]};assert.equal(playerThreatRange(g),170);});
test('九寨沟没有森林路灯，不能通过另一张地图的灯位穿雾发现目标',()=>{const g=scene(),l=LIGHT_FIXTURES[0];g.surfaceNight=1;g.mapId='jiuzhaigou';Object.assign(g.player,{x:l.x+400,y:l.y});assert.equal(surfaceTargetVisible(g,{x:l.x+l.offset,y:l.y-l.height+20}),false);});

// 通过真实双喷口调度验证两颗水弹行程一致，不只检查保存字段。
test('夜间潮汐双发都使用同一射程且第二发不再次打折',()=>{const g=scene();g.surfaceNight=1;const weapon=surfaceWeapon(g,{id:'hover-tide',range:260,speed:500,spread:0,hitRadius:5,impulse:0}),mag={};const muzzle={x:g.player.x+25,y:g.player.y-8};fireTidePair(g,weapon,muzzle,{x:1,y:0},10,false,mag);advanceTidePair(g,mag,.13,muzzle,{x:1,y:0});assert.equal(g.projectiles.length,2);assert.equal(g.projectiles[0].remaining,156);assert.equal(g.projectiles[1].remaining,156);});

// 巨型首领不能因中心还在雾里而让已露出的近侧身体失去交战资格。
test('巨型目标近侧进入光池即可发现，整只仍在雾内时不可见',()=>{const g=scene();g.surfaceNight=1;assert.equal(surfaceTargetVisible(g,{...target(g,300),radius:120}),true);assert.equal(surfaceTargetVisible(g,{...target(g,350),radius:120}),false);});
