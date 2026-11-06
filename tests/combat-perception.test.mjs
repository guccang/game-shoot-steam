// 自动索敌与真实命中分离：覆盖手机镜头、循环边界、穿透锁定、车炮和连锁。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {attackTargetVisible,attackTargetKnown,updateCombatPerception} from '../src/combat/perception.js';
import {updateAimLock} from '../src/combat/targeting.js';
import {vehicleWeapon} from '../src/config/vehicles.js';
import {updateVehicle} from '../src/combat/vehicle.js';
import {fireBallistics} from '../src/combat/ballistics.js';
import {WORLD} from '../src/world/coordinates.js';
import {restoreBoss} from '../src/core/boss-manager.js';
import {stepBodies} from '../src/physics/motion.js';

// 使用正式战斗实例与有界镜头，只移除随机场景和自动刷怪。
function scene(index=0){
 const p=freshProgress();p.weapon=index;p.weapons[index]=1;p.vehicleHulls[0]=1;p.vehicleIndex=0;p.vehicleWeapons[17]=1;p.vehicleLoadouts[0]=17;
 const g=new Game(p,()=>.5);g.state='playing';g.trees=[];g.enemies=[];g.boss=null;
 Object.assign(g.player,{x:1200,y:2400,angle:0});g.setViewport(390,844);
 g.arrivalView={left:-195,right:195,top:-422,bottom:422,width:390,height:844};
 return g;
}
// 静止高生命靶保留正式碰撞中心，避免奖励与死亡回收干扰伤害断言。
function target(g,id,x,y=0){return {id,type:'enemy',x:g.player.x+x,y:g.player.y+y,hp:1000,maxHp:1000,radius:17,mass:1,speed:0};}

test('普通枪械、狙击和脉冲不锁未发现的屏外目标，身体露出即可发现',()=>{
 for(const index of [0,1,2,8,9,10,11]){
  const g=scene(index),e=target(g,1,220);g.enemies=[e];const ammo=g.magazines[index].ammo;
  assert.equal(g.findAttackTarget(),null,index);assert.equal(g.attack(),false,index);assert.equal(g.magazines[index].ammo,ammo);
  e.x=g.player.x+100;assert.equal(g.findAttackTarget(),e,index);
  e.x=g.player.x+180;assert.equal(g.findAttackTarget(),e,'身体露出就可锁定，不要求完整入屏');
 }
});
test('穿透锁定排除未发现目标，已锁定目标出屏后继续追踪',()=>{
 const g=scene(8),inside=target(g,1,100);g.enemies=[inside,target(g,2,-240),target(g,3,-280),target(g,4,-330)];
 updateAimLock(g);assert.deepEqual(g.aimLock.memberIds,[inside.id]);assert.equal(g.findAttackTarget(),inside);
 inside.x=g.player.x+220;updateAimLock(g);assert.deepEqual(g.aimLock.memberIds,[inside.id]);assert.equal(g.findAttackTarget(),inside);
 inside.x=g.player.x+g.weapon().range+inside.radius+1;updateAimLock(g);assert.equal(g.aimLock,null);assert.equal(g.findAttackTarget(),null);
});
test('镜头偏移、缩放、窗口变化和地图接缝均使用真实可见边界',()=>{
 const g=scene(8),e=target(g,1,290);assert.equal(attackTargetVisible(g,e),false);
 Object.assign(g.arrivalView,{left:-100,right:680});assert.equal(attackTargetVisible(g,e),true);
 g.setViewport(320,568);e.x=g.player.x+400;assert.equal(attackTargetVisible(g,e),false,'尺寸变化不沿用旧宽视野');
 g.setViewport(390,844);g.arrivalView={left:-195,right:195,top:-422,bottom:422,width:390,height:844};g.player.x=WORLD.width-40;e.x=30;
 assert.equal(attackTargetVisible(g,e),true);
 const local=Object.create(g);local.summonViewOrigin=g.player;local.player={...g.player,x:g.player.x-500};assert.equal(attackTargetVisible(local,e),true,'支架和援军使用玩家观察点');
});
test('视野与射程同时满足才攻击，不因广角镜头扩大武器射程',()=>{
 const g=scene(),e=target(g,1,500);g.enemies=[e];g.arrivalView.left=-700;g.arrivalView.right=700;
 assert.equal(attackTargetVisible(g,e),true);assert.equal(g.findAttackTarget(),null);
});
test('车炮不沿用屏外领主和敌人锁定，入屏后正常耗弹',()=>{
 const g=scene(),e=target(g,1,220),boss={...target(g,2,-230),type:'boss'};g.enemies=[e];g.boss=boss;g.vehicle.active=true;g.vehicle.targetId=e.id;
 // 车炮需先装弹，空弹仓不能验证射击耗弹。
 Object.assign(g.vehicle.module.magazine,{ammo:vehicleWeapon(g.progress,g.vehicle.weaponIndex).magazineSize,remaining:0});
 const ammo=g.vehicle.module.magazine.ammo;
 for(let i=0;i<120;i++)updateVehicle(g,1/60);
 assert.equal(g.vehicle.targetId,null);assert.equal(g.vehicle.module.magazine.ammo,ammo);
 e.x=g.player.x+100;for(let i=0;i<60;i++)updateVehicle(g,1/60);
 assert.equal(g.vehicle.targetId,e.id);assert.ok(g.vehicle.module.magazine.ammo<ammo);
 e.x=g.player.x+240;assert.equal(attackTargetVisible(g,e),false);
 for(let i=0;i<60;i++)updateVehicle(g,1/60);
 assert.equal(g.vehicle.targetId,e.id,'车炮继续跟踪已发现的出屏敌人');
});
test('已发出的电弧和弹射按真实链路距离延伸，跨越屏幕边缘继续命中',()=>{
 for(const index of [4,10])for(const x of [140,220]){
  const g=scene(index),first=target(g,1,80),next=target(g,2,x,75);g.enemies=[first,next];
  fireBallistics(g,{...g.weapon(),pellets:1,spread:0},{x:g.player.x+30,y:g.player.y-8},{x:1,y:0},100,false);
  g.updateProjectiles(.6);assert.ok(first.hp<1000);
  assert.ok(next.hp<1000,'连锁 '+index+' / '+x);
 }
});
test('已经发射的子弹仍可命中屏外目标，不创建屏幕边缘无敌墙',()=>{
 const g=scene(11),e=target(g,1,240);g.enemies=[e];
 assert.equal(g.findAttackTarget(),null);
 fireBallistics(g,g.weapon(),{x:g.player.x+30,y:g.player.y-8},{x:1,y:0},100,false);g.updateProjectiles(.6);
 assert.ok(e.hp<1000);
});
test('靶场沿用固定取景，无视口模拟不引入额外射程限制',()=>{
 const g=scene(8),e=target(g,1,350);g.summonView={left:-80,right:480,top:-150,bottom:120,width:600,height:300};
 g.setViewport(600,300);assert.equal(attackTargetVisible(g,e),true);
 delete g.summonView;delete g.viewport;delete g.arrivalView;assert.equal(attackTargetVisible(g,e),true);
});

// 使用正式领主工厂的野猪尺寸，覆盖旧版边缘留白与脚底判定造成的盲区。
test('野猪在窄屏两侧或脚底出屏但上半身可见时仍能进入射程索敌',()=>{
 for(const [x,y] of [[180,0],[-180,0],[0,480]]){
  const g=scene(8);g.progress.living.patrolActive=true;g.progress.bossChallenge={bosses:0,kind:'boar',maxHp:10000,speed:0,damage:0,blastDamage:0};
  assert.equal(restoreBoss(g,10000),true);const b=g.boss;assert.equal(b.kind,'boar');
  Object.assign(b,{x:g.player.x+x,y:g.player.y+y});
  assert.equal(attackTargetVisible(g,b),true,x+','+y);assert.equal(g.findAttackTarget(),b);
 }
});
test('真实重击将怪物推出画面后仍可继续攻击，但超出射程或死亡立即失效',()=>{
 const g=scene(8),e=target(g,1,188);g.enemies=[e];
 g.hit(e,1,false,{direction:{x:1,y:0},impulse:165,pushLimit:340,weaponIndex:8});
 for(let i=0;i<120;i++)stepBodies([e],1/120,WORLD);
 assert.equal(attackTargetVisible(g,e),false);assert.equal(g.findAttackTarget(),e);
 const hp=e.hp;
 fireBallistics(g,g.weapon(),{x:g.player.x+30,y:g.player.y-8},{x:1,y:0},10,false);
 g.updateProjectiles(.6);assert.ok(e.hp<hp);
 e.x=g.player.x+g.weapon().range+e.radius+1;assert.equal(g.findAttackTarget(),null);
 e.x=g.player.x+240;e.hp=0;assert.equal(g.findAttackTarget(),null);
});
test('正式观察保留普通枪械目标，未见过的新怪和新战场不会继承资格',()=>{
 const g=scene(2),e=target(g,1,100);g.enemies=[e];updateCombatPerception(g);
 e.x=g.player.x+220;assert.equal(attackTargetVisible(g,e),false);assert.equal(g.findAttackTarget(),e);
 const replacement={...e};assert.equal(attackTargetKnown(g,replacement),false);
 e.id=2;assert.equal(attackTargetKnown(g,e),false,'复用实体更换编号不能继承记忆');
 e.id=1;assert.equal(attackTargetKnown(g,e),true);g.reset();
 assert.equal(g.combatSight.has(e),false);
});
test('只读索敌不写观察状态，屏外树木不会因曾经采集而自动追踪',()=>{
 const g=scene(0),e=target(g,1,100);g.enemies=[e];
 g.findAttackTarget();assert.equal(g.combatSight.has(e),false);
 const tree={...e,id:2,type:'tree'};g.enemies=[];g.trees=[tree];
 g.hit(tree,1);tree.x=g.player.x+220;
 assert.equal(attackTargetKnown(g,tree),false);assert.equal(g.findAttackTarget(),null);
});
