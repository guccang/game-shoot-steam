// 团子固定质量验收：真实出生、各阶级、正式子弹命中与完整物理位移。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {enemyIdentity} from '../src/world/biomes.js';
import {armoredIdentity} from '../src/config/armored-enemies.js';
import {rangedIdentity} from '../src/config/ranged-enemies.js';
import {enemyMass} from '../src/config/enemy-mass.js';
import {GAMEPLAY_TABLES} from '../src/config/gameplay-tables.js';
import {WEAPONS} from '../src/config/weapons.js';
import {fireBallistics} from '../src/combat/ballistics.js';
import {applyImpulse,stepBodies} from '../src/physics/motion.js';
import {WORLD} from '../src/world/coordinates.js';
import {updateRealm} from '../src/core/realms/realm-manager.js';

// 清缴第三批的稳定编号覆盖普通、车载及铁甲；随机值补偿本批阶级加成。
function setup(roll=.5){const g=new Game(freshProgress(),()=>roll);g.start();g.wave=38;g.enemies=[];g.trees=[];return g;}
// 保留真实工厂的类型、阶级和质量，仅排除地形与致死效果对位移测量的干扰。
function unit(g,ordinal){g.waveSpawned=ordinal-1;const e=g.spawnEnemy(0,0,{x:2000,y:2000});Object.assign(e,{hp:1e6,maxHp:1e6,arena:{x:2000,y:2000,radius:5000}});return e;}
// 同一物体推进到冲量基本衰减完毕，记录实际位移及最高腾空高度。
function settle(e,fps=120){let height=0;for(let i=0;i<fps*4;i++){stepBodies([e],1/fps,WORLD);height=Math.max(height,e.z||0);}return {distance:Math.hypot(e.x-2000,e.y-2000),height};}

test('基础、精英、强敌普通团子均为3，铁甲与车载均为30，生命阶级仍有差异',()=>{
 
 for(const [rank,roll] of [[0,.5],[1,.65],[2,.99]]){
  const g=setup(roll),normal=unit(g,1),car=unit(g,4),iron=unit(g,8);
  assert.equal(normal.rank,rank);assert.equal(car.species,'bramble-buggy');assert.equal(iron.species,'ironwood-bulwark');
  assert.deepEqual([normal.mass,iron.mass,car.mass],[3,30,30]);
  const base=enemyIdentity(2000,2000,[.5,.8,.99][rank]);assert.equal(base.mass,3);
  assert.equal(armoredIdentity({...base,mass:999}).mass,30);assert.equal(rangedIdentity({...base,mass:999},'bramble-buggy').mass,30);
 }
 const base=[.5,.8,.99].map(roll=>enemyIdentity(2000,2000,roll));assert.ok(base[0].hp<base[1].hp&&base[1].hp<base[2].hp);
});
test('旧质量表的精英和强敌槽位不再参与质量计算',()=>{
 const saved=[...GAMEPLAY_TABLES.enemyMassByRank];
 try{GAMEPLAY_TABLES.enemyMassByRank[1]=100;GAMEPLAY_TABLES.enemyMassByRank[2]=1000;for(const roll of [.5,.8,.99])assert.equal(enemyIdentity(2000,2000,roll).mass,3);}
 finally{GAMEPLAY_TABLES.enemyMassByRank.splice(0,3,...saved);}
});
test('正式手枪子弹命中后，铁甲与车载位移显著小于普通团子，各阶级位移近似一致',t=>{
 const samples=[];
 for(const roll of [.5,.65,.99]){
  const g=setup(roll);Object.assign(g.player,{x:1960,y:2000,angle:0});
  const row=[];
  for(const ordinal of [1,8,4]){
   g.random=()=>roll;const e=unit(g,ordinal);g.enemies=[e];g.projectiles=[];g.random=()=>.5;
   fireBallistics(g,{...WEAPONS[0],weaponIndex:0},{x:1960,y:1992},{x:1,y:0},1,false,true);
   for(let i=0;i<120&&g.projectiles.length;i++)g.updateProjectiles(1/120);
   assert.ok(e.hp<1e6);const result=settle(e);assert.ok(result.distance>0);row.push({...result,mass:e.mass});
  }
  assert.ok(row[1].distance<row[0].distance*.2);assert.ok(Math.abs(row[1].distance-row[2].distance)<1e-8);assert.equal(row[1].height,0);assert.equal(row[2].height,0);samples.push(row);
 }
 // 阶级仍保留不同碰撞半径，因此实际命中位置可引起不到0.02单位的位移差。
 for(const row of samples.slice(1))for(let i=0;i<3;i++)assert.ok(Math.abs(row[i].distance-samples[0][i].distance)<.02);
 t.diagnostic(JSON.stringify(samples[0]));
});
test('固定质量的受击积分在30帧与120帧一致，重炮仍可产生有限击退',()=>{
 for(const ordinal of [1,8,4]){
  const g=setup(),a=unit(g,ordinal),b=unit(g,ordinal);applyImpulse(a,{x:1,y:0},340);applyImpulse(b,{x:1,y:0},340);
  const x=settle(a,30),y=settle(b,120);assert.ok(x.distance>0);assert.ok(Math.abs(x.distance-y.distance)<.01);
 }
});
test('秘境普通与精英团子共用固定质量，守护兵种不再用阶级覆盖质量',()=>{
 for(const mode of ['tower','guardian']){
  const g=setup();assert.ok(g.enterRealm(mode));if(mode==='guardian')g.continueRealm();
  const r=g.realm;r.phase='combat';r.spec={...r.spec,total:2,boss:false,elite:true};r.spawned=0;r.spawnTimer=0;r.warning=0;
  for(let i=0;i<2;i++){r.spawnTimer=0;updateRealm(g,.05);}
  assert.ok(g.enemies.length>=2);for(const e of g.enemies)assert.equal(e.mass,e.flying?enemyMass()*.8:enemyMass(e.species));
 }
});
