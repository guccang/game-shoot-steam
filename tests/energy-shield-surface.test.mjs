// 用真实怪物、弹丸和领主技能验证盾面拦截，避免仅移动特效而仍命中猫猫身体。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress,WORLD} from '../src/game.js';
import {updateEnemies} from '../src/core/battle/enemy-manager.js';
import {updateEnemyBolts} from '../src/combat/ranged-enemies.js';
import {updateBoss,updateBossHazards} from '../src/combat/bosses.js';
import {energyShieldShape,traceEnergyShield} from '../src/combat/energy-shield-surface.js';
import {advanceReload} from '../src/combat/magazine.js';

// 独立平台保留正式承伤与供给槽，停止随机刷怪和环境干扰。
function arena(mounted=false){
 const p=freshProgress();p.weapon=18;p.weapons[18]=1;p.vehicleIndex=0;p.vehicleHulls[0]=1;
 const g=new Game(p,()=>.5);g.state='playing';g.workshopTrial=true;g.trees=[];g.enemies=[];g.boss=null;g.updateWaves=()=>{};
 Object.assign(g.player,{x:2000,y:2000,arena:{x:2000,y:2000,radius:1000}});if(mounted)g.summonVehicle();return g;
}
// 从护盾右侧发射一颗实际敌方弹丸，此步只到盾面附近，还未到猫的碰撞体。
function incoming(g,splash=0){
 const s=energyShieldShape(g.player,g.vehicle.active),e=g.spawnEnemy(0,0,{x:s.x+s.rx+100,y:s.y});
 Object.assign(e,{hp:1000,maxHp:1000,arena:g.player.arena});
 g.enemyBolts=[{owner:e.id,x:s.x+s.rx+60,y:s.y,dx:-1,dy:0,radius:3,speed:500,remaining:600,damage:40,age:0,splash}];return s;
}
test('步行与驾驶弹丸在可见盾面提前消失，伤害数字从盾面浮出',()=>{
 for(const mounted of [false,true]){const g=arena(mounted),s=incoming(g),hp=g.player.hp,vhp=g.vehicle.hp;updateEnemyBolts(g,.2,g.player);
  assert.equal(g.enemyBolts.length,0);assert.equal(g.magazines[18].ammo,440);assert.equal(g.player.hp,hp);assert.equal(g.vehicle.hp,vhp);assert.equal(g.player.invincible,0);
  const n=g.numbers.find(n=>n.text.includes('护盾'));assert.ok(Math.abs((n.x-s.x)**2/s.rx**2+(n.y+28-s.y)**2/s.ry**2-1)<1e-8);
 }
});
test('前方树干优先挡弹，未装备或破盾不扩大受击范围',()=>{
 const g=arena(),s=incoming(g);g.trees=[{x:s.x+s.rx+30,y:s.y,radius:8,hp:100}];updateEnemyBolts(g,.2,g.player);assert.equal(g.magazines[18].ammo,480);
 for(const broken of [false,true]){const x=arena();incoming(x);if(broken)x.magazines[18].ammo=0;else x.progress.weapon=0;updateEnemyBolts(x,.2,x.player);assert.equal(x.enemyBolts.length,1);}
});
test('重炮在盾面引爆且只扣一次护盾，领主羽刃同样停止穿透',()=>{
 const g=arena(true);incoming(g,45);updateEnemyBolts(g,.2,g.player);assert.equal(g.magazines[18].ammo,440);assert.equal(g.enemyBolts.length,0);
 const x=arena(),s=energyShieldShape(x.player);x.boss={id:77,hp:100,x:s.x+s.rx+100,y:s.y};
 x.hazards=[{owner:77,kind:'feather',x:s.x+s.rx+60,y:s.y,dx:-1,dy:0,speed:500,length:600,radius:3,age:0,warmup:0,duration:2,damage:30,color:'#fff'}];
 updateBossHazards(x,.2,x.player);assert.equal(x.magazines[18].ammo,450);assert.equal(x.hazards.length,0);
});
test('近战真实扑击撞盾后回收，不能继续扑到猫身上',()=>{
 const g=arena(),e=g.spawnEnemy(0,0,{x:g.player.x+140,y:g.player.y});Object.assign(e,{hp:1000,maxHp:1000,speed:70,damage:20,flying:false,arena:g.player.arena});
 for(let i=0;i<240&&g.magazines[18].ammo===480;i++)updateEnemies(g,1/120,g.player);
 assert.equal(g.magazines[18].ammo,460);assert.equal(g.player.hp,g.maxHp());assert.equal(e.assault.phase,'returning');assert.ok(e.x-g.player.x>45);
 const first=e.x;for(let i=0;i<8;i++)updateEnemies(g,1/120,g.player);assert.ok(e.x>=first);assert.equal(g.magazines[18].ammo,460);
});
test('盾面扫掠包含玩家相对位移和世界接缝，不遗漏高速穿越',()=>{
 const g=arena();const old={...g.player};g.player.x+=30;
 assert.ok(traceEnergyShield(g,{x:old.x+120,y:old.y-32},{x:old.x-100,y:old.y-32},old,0));
 g.player.x=2;const hit=traceEnergyShield(g,{x:WORLD.width-150,y:g.player.y-32},{x:WORLD.width+100,y:g.player.y-32},g.player,0);assert.ok(hit);assert.ok(hit.t>0&&hit.t<1);
});

test('领主冲锋被盾面截停，剩余冲锋不会继续穿过猫猫',()=>{
 const g=arena(true),s=energyShieldShape(g.player,true);
 const b=g.boss={id:77,kind:'boar',x:s.x+240,y:s.y,hp:1000,maxHp:1000,radius:30,speed:0,blastDamage:40,attack:0,arena:g.player.arena};
 updateBoss(g,.01);assert.equal(b.ai.phase,'windup');
 for(let i=0;i<120&&!b.ai.shieldBlocked;i++)updateBoss(g,.025,g.player);
 assert.equal(b.ai.shieldBlocked,true);assert.equal(g.magazines[18].ammo,440);assert.ok(b.x>s.x+s.rx);
 const contact={x:b.x,y:b.y};updateBoss(g,.05,g.player);assert.equal(b.x,contact.x);assert.equal(b.y,contact.y);assert.equal(g.magazines[18].ammo,440);
});
test('冲击按来袭方向保留且有界，破盾溢出仍播放实际身体受伤',()=>{
 const g=arena(),s=energyShieldShape(g.player);g.hurt(20,{x:s.x+s.rx+50,y:s.y});assert.equal(g.magazines[18].shieldImpacts[0].angle,0);
 for(let i=0;i<6;i++)g.hurt(20,{x:s.x-s.rx-50,y:s.y});assert.equal(g.magazines[18].shieldImpacts.length,4);assert.equal(g.magazines[18].ammo,340);
 g.hurt(360,{x:s.x,y:s.y-s.ry-50});assert.ok(g.player.invincible>0);assert.equal(g.player.hp,g.maxHp()-20);
 advanceReload(g.magazines[18],g.weapon(),.5);assert.equal(g.magazines[18].shieldImpacts.length,0);
});

test('同帧多颗弹丸分别扣盾，各颗只结算一次命中',()=>{
 for(const mounted of [false,true]){
  const g=arena(mounted);incoming(g);const bolt=g.enemyBolts[0],hp=g.player.hp,vhp=g.vehicle.hp;
  g.enemyBolts=Array.from({length:3},()=>({...bolt}));updateEnemyBolts(g,.2,g.player);
  assert.equal(g.enemyBolts.length,0);assert.equal(g.magazines[18].ammo,360);assert.equal(g.magazines[18].shieldImpacts.length,3);
  assert.equal(g.player.invincible,0);assert.equal(g.player.hp,hp);assert.equal(g.vehicle.hp,vhp);
  updateEnemyBolts(g,.2,g.player);assert.equal(g.magazines[18].ammo,360);
 }
});
