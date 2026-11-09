// 浮空命中专项回归：高度不产生无敌或减伤；保持原射程与原版连续击飞。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {WEAPONS} from '../src/config/weapons.js';
import {VEHICLE_ARMAMENTS} from '../src/config/vehicle-armaments.js';
import {fireBallistics} from '../src/combat/ballistics.js';
import {cutWithChainsaw} from '../src/combat/melee.js';
import {explodeGrenade} from '../src/combat/grenades.js';
import {updateVehicle} from '../src/combat/vehicle.js';
import {updateEnemies} from '../src/core/battle/enemy-manager.js';
import {worldDistance} from '../src/world/coordinates.js';
const heights=[0,80,300,600];
// 开放平台隔离地形与故事，在相同水平坐标对比不同高度，保留正式弹道和伤害入口。
function scene(hull=0,radius=170){
 const p=freshProgress();p.vehicleHulls[hull]=1;p.vehicleIndex=hull;const g=new Game(p,()=>.5);g.state='playing';g.trees=[];g.enemies=[];g.boss=null;
 Object.assign(g.player,{x:2000,y:2000,arena:{x:2000,y:2000,radius},invincible:999});g.summonVehicle();
 const e=g.spawnEnemy(0,0,{x:2120,y:2000});Object.assign(e,{mass:1,hp:10000,maxHp:10000,damage:0,speed:48,arena:g.player.arena});return {g,e};
}
// 清理上一轮的飞行弹与动量，避免改变高度时意外改变实际水平轨迹。
function reset(g,e,z){Object.assign(e,{x:2120,y:2000,hp:10000,z,vz:0,pushX:0,pushY:0,knockTime:0});g.enemies=[e];g.projectiles=[];g.shots=[];g.fx.items=[];}

test('普通枪械、射线、电弧及车炮对不同高度目标造成相同伤害',()=>{
 const {g,e}=scene();
 for(const [index,w] of [...WEAPONS,...VEHICLE_ARMAMENTS].entries()){
  if(w.controller==='mechanical'||w.attackKind==='melee')continue;const damages=[];
  for(const z of heights){reset(g,e,z);fireBallistics(g,{...w,weaponIndex:index},{x:2084,y:1992},{x:1,y:0},11,false,true);for(let i=0;i<120&&g.projectiles.length;i++)g.updateProjectiles(1/120);damages.push(10000-e.hp);}
  assert.ok(damages[0]>0,w.id);assert.ok(damages.every(n=>n===damages[0]),`${w.id}: ${damages}`);
 }
});
test('电锯和榴弹范围伤害也不会因高度增加而漏伤',()=>{
 const {g,e}=scene();const melee=[],blast=[];
 for(const z of heights){reset(g,e,z);cutWithChainsaw(g,{...WEAPONS[14],weaponIndex:14},{x:2090,y:1992},{x:1,y:0},11,false,true);melee.push(10000-e.hp);
  reset(g,e,z);explodeGrenade(g,{x:2120,y:1992,amount:44,radius:110,impulse:78,weaponIndex:6,dx:1,dy:0});blast.push(10000-e.hp);}
 assert.deepEqual(melee,[11,11,11,11]);assert.deepEqual(blast,[44,44,44,44]);
});
test('穿透弹已命中目标改变高度后不会重复计伤，后方目标仍可命中',()=>{
 const {g,e}=scene();reset(g,e,300);const second={...e,id:e.id+1,x:2180,z:600};g.enemies.push(second);
 fireBallistics(g,{...WEAPONS[9],weaponIndex:9},{x:2084,y:1992},{x:1,y:0},100,false,true);
 for(let i=0;i<120&&g.projectiles.length;i++){e.z=heights[i%heights.length];g.updateProjectiles(1/120);}
 assert.equal(e.hp,9900);assert.equal(second.hp,9905);
});
test('浮空目标仍遵守树干遮挡，不会为了命中而隔物扣血',()=>{
 const {g,e}=scene();reset(g,e,300);const tree={id:e.id+1,type:'tree',x:2070,y:2000,radius:22,hp:100,maxHp:100};g.trees=[tree];
 fireBallistics(g,{...WEAPONS[0],weaponIndex:0},{x:2030,y:1992},{x:1,y:0},11,false,true);
 for(let i=0;i<120&&g.projectiles.length;i++)g.updateProjectiles(1/120);
 assert.equal(e.hp,10000);assert.equal(tree.hp,89);
});
// 正式炮塔持续射击、弹道、敌人 AI 与物理依次推进；地面对照只取消受击后的位移和腾空。
function fight(hull,dt,grounded=false){
 const {g,e}=scene(hull);e.hp=e.maxHp=400;let time=0,lastHit=0,hits=0,shots=0,airHits=0,peakHeight=0,maxGap=0;
 const original=g.hit.bind(g);g.hit=(target,amount,critical,impact)=>{if(target===e){hits++;airHits+=e.z>1?1:0;maxGap=Math.max(maxGap,time-lastHit);lastHit=time;}original(target,amount,critical,impact);if(grounded&&target===e)Object.assign(e,{z:0,vz:0,pushX:0,pushY:0,knockTime:0});};
 g.onEvent=name=>{if(name==='shot')shots++;};
 for(;time<8&&e.hp>0;time+=dt){updateVehicle(g,dt);g.updateProjectiles(dt);updateEnemies(g,dt,g.player);peakHeight=Math.max(peakHeight,e.z||0);}
 return {seconds:+time.toFixed(3),hp:e.hp,shots,hits,airHits,peakHeight:+peakHeight.toFixed(2),maxGap:+maxGap.toFixed(3)};
}
for(const hull of [0,2,3])for(const fps of [30,120])test(`车炮 ${hull} 连续击飞保持正常掉血速度 ${fps} 帧`,t=>{
 const ground=fight(hull,1/fps,true),air=fight(hull,1/fps);assert.ok(air.hp<=0);assert.ok(air.airHits>=5);assert.ok(air.peakHeight>40);assert.ok(air.seconds<=ground.seconds+.55);assert.ok(air.maxGap<(hull===3?.55:.3));
 t.diagnostic(JSON.stringify({hull,fps,ground,air}));
});
test('浮空超出原射程不继续开火，玩家靠近后立即恢复命中',()=>{
 const {g,e}=scene(0,900);reset(g,e,300);e.x=2400;const ammo=g.vehicle.module.magazine.ammo;
 for(let i=0;i<60;i++)updateVehicle(g,1/120);
 assert.equal(g.vehicle.module.magazine.ammo,ammo);assert.equal(g.projectiles.length,0);assert.equal(e.hp,10000);
 g.player.x=2240;assert.ok(worldDistance(g.player,e)<380);
 for(let i=0;i<60;i++){updateVehicle(g,1/120);g.updateProjectiles(1/120);}
 assert.ok(e.hp<10000);assert.ok(g.vehicle.module.magazine.ammo<ammo);assert.ok(e.z>=300);
});
