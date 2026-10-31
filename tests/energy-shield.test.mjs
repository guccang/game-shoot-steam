// 能量盾覆盖正式伤害入口、供给时钟、载具火力、购买成长与旧档兼容。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {advanceReload} from '../src/combat/magazine.js';
import {updateVehicle} from '../src/combat/vehicle.js';
import {effectiveWeapon} from '../src/config/weapon-mods.js';
import {equipmentParts} from '../src/config/equipment-parts.js';
import {transactProgress} from '../src/progression/transactions.js';
import {equipmentRecipe} from '../src/progression/equipment-goals.js';
import {RECOMMENDED_ECONOMY,validateEconomy} from '../src/config/economy.js';
import {canMountMechanical} from '../src/config/mechanical-loadout.js';
import {guardianCanDeploy} from '../src/config/guardian.js';
import {footballGuns} from '../src/config/slime-football.js';
import {createWeaponTrialScene} from '../src/core/weapon-trial-scene.js';
import {workshopMastery} from '../src/ui/workshop/mastery.js';
import {workshopResultChanges} from '../src/ui/workshop/results.js';
import {workshopUpgrade,applyPartPreview} from '../src/progression/workshop.js';
import {workshopCatalog} from '../src/progression/workshop-catalog.js';
import {ammoRingState} from '../src/ui/status-rings.js';
// 关闭外围任务与随机波次，保留真正的 Game、车体、怪物与弹道。
function arena(){
 const p=freshProgress();p.arrival=null;p.weapon=18;p.weapons[18]=1;p.vehicleHulls[0]=1;p.vehicleIndex=0;
 const g=new Game(p,()=>.5);g.state='playing';g.workshopTrial=true;g.trees=[];g.enemies=[];g.boss=null;g.updateWaves=()=>{};
 Object.assign(g.player,{x:900,y:750,arena:{x:900,y:750,radius:1000}});return g;
}
test('步行连续攻击逐次扣盾，完整格挡不产生无敌，破盾溢出扣血',()=>{
 const g=arena(),hp=g.player.hp,m=g.magazines[18];g.hurt(80);
 assert.equal(m.ammo,400);assert.equal(g.player.hp,hp);assert.equal(m.remaining,3);
 g.hurt(80);assert.equal(m.ammo,320);assert.equal(g.player.invincible,0);
 g.hurt(340);assert.equal(m.ammo,0);assert.equal(g.player.hp,hp-20);assert.equal(m.remaining,6);
 assert.ok(g.player.invincible>0);g.hurt(20);assert.equal(g.player.hp,hp-20);
});

test('驾驶连续格挡与恢复延迟逐次结算，只有车体实际受伤产生无敌',()=>{
 const g=arena();g.summonVehicle();const m=g.magazines[18],hp=g.vehicle.hp;
 g.hurt(80);advanceReload(m,g.weapon(),1);assert.equal(m.remaining,2);
 g.hurt(80);assert.equal(m.ammo,320);assert.equal(m.remaining,3);assert.equal(g.player.invincible,0);
 g.hurt(340);assert.equal(m.ammo,0);assert.equal(g.vehicle.hp,hp-20);assert.equal(m.remaining,6);
 assert.ok(g.player.invincible>0);g.hurt(20);assert.equal(g.vehicle.hp,hp-20);
});

test('已有身体无敌时仍逐次扣盾，但破盾溢出保留身体保护且不刷新时长',()=>{
 for(const mounted of [false,true]){
  const g=arena();if(mounted)g.summonVehicle();const hp=g.player.hp,vhp=g.vehicle.hp,m=g.magazines[18];
  g.player.invincible=.2;g.hurt(80);g.hurt(80);assert.equal(m.ammo,320);assert.equal(g.player.invincible,.2);
  g.hurt(340);assert.equal(m.ammo,0);assert.equal(g.player.hp,hp);assert.equal(g.vehicle.hp,vhp);assert.equal(g.player.invincible,.2);
  g.player.invincible=0;g.hurt(10);assert.equal(mounted?g.vehicle.hp:g.player.hp,(mounted?vhp:hp)-10);
 }
});
test('驾驶优先格挡，溢出只扣车体，主炮继续造成真实伤害',()=>{
 const g=arena();assert.ok(g.summonVehicle());const hp=g.vehicle.hp,playerHp=g.player.hp;
 g.hurt(500);assert.equal(g.vehicle.hp,hp-20);assert.equal(g.player.hp,playerHp);
 const e=g.spawnEnemy(0,0,{x:1080,y:750});Object.assign(e,{hp:10000,maxHp:10000,speed:0,damage:0,arena:g.player.arena});
 assert.equal(g.attack(),false);
 for(let i=0;i<240;i++){updateVehicle(g,1/60);g.updateProjectiles(1/60);}
 assert.ok(e.hp<10000);assert.ok(g.projectiles.every(b=>b.kind!=='energy-shield'));
});
test('恢复延迟按剩余帧计时，逐点恢复且封顶，破盾不瞬间回满',()=>{
 const g=arena(),m=g.magazines[18],w=g.weapon();g.hurt(100);advanceReload(m,w,2.9);assert.equal(m.ammo,380);
 advanceReload(m,w,.2);assert.ok(Math.abs(m.ammo-386)<1e-6);advanceReload(m,w,20);assert.equal(m.ammo,480);
 g.player.invincible=0;g.hurt(480);advanceReload(m,w,6);assert.equal(m.ammo,0);advanceReload(m,w,.5);assert.equal(m.ammo,30);
});
test('切枪、上下车不补盾，暂停不恢复，卸下护盾正常受伤',()=>{
 const g=arena(),m=g.magazines[18];g.hurt(90);const remaining=m.remaining;
 g.progress.weapon=0;g.player.invincible=0;const hp=g.player.hp;g.hurt(10);assert.equal(g.player.hp,hp-10);
 g.progress.weapon=18;assert.equal(m.ammo,390);g.summonVehicle();g.dismountVehicle();assert.equal(m.ammo,390);
 g.pause();for(let i=0;i<100;i++)g.update(.05);assert.equal(m.ammo,390);assert.equal(m.remaining,remaining);
});
test('盾故事交付后可购买和升级防御属性，旧存档及经济方案补目录不赠送',()=>{
 const p=freshProgress();p.coins=p.wood=999999;p.materials={parts:9999,crystal:9999,core:9999};
 assert.equal(transactProgress(p,'weapons',18,'buy'),false);p.story.chapters['equipment-shield'].completed=true;
 assert.ok(transactProgress(p,'weapons',18,'buy'));assert.equal(p.weapon,18);assert.equal(equipmentRecipe('weapons',18,p).core,0);
 const before=effectiveWeapon(p);assert.ok(transactProgress(p,'weapons',18,'upgrade'));p.weaponParts[18].reload=2;
 const after=effectiveWeapon(p);assert.equal(after.magazineSize,528);assert.ok(after.shieldRegen>before.shieldRegen);assert.equal(after.damage,0);
 assert.deepEqual(equipmentParts('weapons',18).map(p=>p.key),['damage','reload']);
 p.weapons=p.weapons.slice(0,18);p.weapon=0;const restored=validateProgress(p);assert.equal(restored.weapons[18],0);
 const old=structuredClone(RECOMMENDED_ECONOMY);old.weapons.pop();assert.equal(validateEconomy(old).weapons.length,19);
 assert.equal(restored.vehicleWeapons.length,p.vehicleWeapons.length);
});
test('纯防具不能装在攻击召唤物、守护炮塔或球赛中',()=>{
 const g=arena(),p=g.progress;assert.equal(canMountMechanical(p,18),false);assert.equal(guardianCanDeploy(p,'weapon',18,18),false);assert.ok(!footballGuns(p).includes(18));
});
test('HUD 显示护盾余量和恢复等待，不显示弹药装填进度',()=>{
 const g=arena();g.hurt(80);const r=ammoRingState(g.magazines[18],g.weapon());assert.equal(r.icon,'shield');assert.equal(r.count,400);assert.equal(r.max,480);assert.match(r.label,/3.0秒后恢复/);assert.equal(r.fill,400/480);
});
test('正式护盾演练由怪物攻击触发格挡，永久存档不被修改',()=>{
 const p=freshProgress(),before=JSON.stringify(p),s=createWeaponTrialScene(p,'weapons',18);for(let i=0;i<1200;i++)s.advance(1/30);
 assert.ok(s.absorbed>0,'来敌必须实际击中护盾');assert.ok(s.damage>0,'借车主炮必须继续攻击');assert.equal(JSON.stringify(p),before);
});

// 工坊实际升级摘要必须使用防御数值，不能仍显示零伤害或无效装填属性。
test('防御部件预览和成长说明采用容量与充能速度',()=>{
 const p=arena().progress;assert.ok(!workshopCatalog(p,'weapons','modify').includes(18));assert.ok(workshopCatalog(p,'weapons','upgrade').includes(18));assert.equal(workshopMastery(p,{kind:'weapons',index:18}).supported,false);
 for(const [part,label] of [['damage','护盾容量'],['reload','每秒恢复']]){const plan=workshopUpgrade(p,'weapons',18,part),next=structuredClone(p);applyPartPreview(next,plan);const [row]=workshopResultChanges(p,next,plan,120);assert.equal(row.label,label);assert.ok(row.value>row.old);}
});
