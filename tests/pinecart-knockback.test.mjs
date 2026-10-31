// 松果机枪原版手感回归：连续命中继续补充推力和向上速度，不添加专属抑制。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {vehicleWeapon,vehicleDamage} from '../src/config/vehicles.js';
import {fireBallistics} from '../src/combat/ballistics.js';
import {stepBodies} from '../src/physics/motion.js';
import {WORLD,worldDistance} from '../src/world/coordinates.js';
// 开放平台隔离弹道与物理，持续受击时不受自然地形提前截停。
function scene(mass=1){const p=freshProgress();p.vehicleHulls[0]=1;const g=new Game(p,()=>.5);g.state='playing';g.trees=[];g.enemies=[];Object.assign(g.player,{x:2000,y:2000,arena:{x:2000,y:2000,radius:5000}});const e=g.spawnEnemy(0,0,{x:2120,y:2000});Object.assign(e,{hp:100000,maxHp:100000,mass,speed:0,arena:g.player.arena});return {g,e};}
// 使用真实飞行弹命中，发射点跟随目标以隔离射程和脱靶。
function shot(g,e,w,angle=0){const direction={x:Math.cos(angle),y:Math.sin(angle)},muzzle={x:e.x-direction.x*36,y:e.y-8-direction.y*36};fireBallistics(g,{...w,weaponIndex:17},muzzle,direction,18,false,true);for(let i=0;i<12&&g.projectiles.length;i++)g.updateProjectiles(1/120);}

test('松果单发恢复原冲量、腾空与硬直，伤害和射速不变',()=>{
 const {g,e}=scene(),w=vehicleWeapon(g.progress,17),start={x:e.x,y:e.y};shot(g,e,w);
 assert.equal(w.impulse,80);assert.equal(e.hp,99982);assert.ok(e.flash>0&&e.knockTime>0&&e.vz>0);assert.ok(e.pushX>400);
 for(let i=0;i<360;i++)stepBodies([e],1/120,WORLD);
 assert.ok(worldDistance(e,start)>190&&worldDistance(e,start)<210);
 assert.equal(w.damage,18);assert.equal(w.interval,.16);assert.equal(vehicleDamage(g.progress,17),18);
});
for(const dt of [1/30,1/120])test(`连续命中补充向上速度和推力，停火后自然落地恢复 ${dt}`,()=>{
 const {g,e}=scene(.3),w=vehicleWeapon(g.progress,17),start={x:e.x,y:e.y};let timer=0,hits=0,height=0;
 for(let time=0;time<1.2;time+=dt){timer-=dt;if(timer<=0){const before=e.vz||0;shot(g,e,w,Math.PI/4);assert.ok(e.vz>=before);assert.ok(e.vz>=109);timer+=w.interval;hits++;}stepBodies([e],dt,WORLD);height=Math.max(height,e.z);assert.ok(e.knockTime>0);assert.ok(Math.abs(e.pushX)<=520&&Math.abs(e.pushY)<=520);}
 assert.equal(e.hp,100000-18*hits);assert.ok(height>50);assert.ok(worldDistance(e,start)>400);
 for(let i=0;i<600;i++)stepBodies([e],1/120,WORLD);assert.equal(e.knockTime,0);assert.equal(e.z,0);assert.ok(Math.hypot(e.pushX,e.pushY)<1);
});
test('在途子弹保持原冲量，不随切枪重新使用削弱上限',()=>{
 const {g,e}=scene(),w=vehicleWeapon(g.progress,17);fireBallistics(g,{...w,weaponIndex:17},{x:e.x-100,y:e.y-8},{x:1,y:0},18,false,true);
 assert.equal(g.projectiles[0].impulse,80);assert.equal(g.projectiles[0].pushLimit,undefined);g.progress.weapon=3;
 for(let i=0;i<60;i++)g.updateProjectiles(1/120);assert.equal(e.hp,99982);assert.ok(e.pushX>400&&e.knockTime>0&&e.vz>0);
});
