// 战车生命独立回归：角色升级不抬高车体 HP，装甲升级、损毁修复和读档仍使用正式规则。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {HEROES} from '../src/config/heroes.js';
import {COLLECTED_VEHICLES,vehicleMaxHp} from '../src/config/vehicles.js';
import {createVehicle,summonVehicle,dismountVehicle} from '../src/combat/vehicle.js';
import {armorHealth} from '../src/config/economy.js';

// 已完成入职、拥有所有车体且材料充足，用真实事务验证角色和车体升级。
function scene(hero=0){
 const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.restoration.repaired.push('garage');p.hero=hero;p.heroes.fill(5);p.vehicleHulls.fill(3);p.vehicleIndex=0;p.coins=p.wood=1000000;for(const key of Object.keys(p.materials))p.materials[key]=100000;
 const g=new Game(p,()=>.5);g.start();return g;
}

test('全部车型固定车体等级时，所有驾驶员从1升到20级均不改变最大耐久',()=>{
 for(const hero of HEROES.keys())for(const [index,model] of COLLECTED_VEHICLES.entries())for(const hullLevel of [1,5,20]){
  const p=freshProgress();p.hero=hero;p.vehicleIndex=index;p.vehicleHulls[index]=hullLevel;p.heroes[hero]=1;
  const expected=vehicleMaxHp(p);
  for(const level of [1,5,10,20]){p.heroes[hero]=level;assert.equal(vehicleMaxHp(p,1e9),expected,`${model.id} / 角色${hero} / ${level}级`);assert.equal(createVehicle(p,index).maxHp,expected);}
 }
});

test('车型基础 HP 与装甲成长由配置独立决定，剧情专用耐久保留',()=>{
 for(const [index,model] of COLLECTED_VEHICLES.entries()){
  const p=freshProgress();p.vehicleIndex=index;p.vehicleHulls[index]=1;assert.equal(vehicleMaxHp(p),model.baseHp);
  p.vehicleHulls[index]=2;assert.equal(vehicleMaxHp(p),model.baseHp+model.hpGrowth);
  p.vehicleHulls[index]=20;assert.equal(vehicleMaxHp(p),armorHealth(model.baseHp,model.hpGrowth,20,p));
  p.storyHull=777;assert.equal(vehicleMaxHp(p),777);
 }
});

test('真实角色升级保持所有车体当前 HP、上限、损毁冷却和弹药',()=>{
 for(const hero of HEROES.keys()){
  const g=scene(hero);g.vehicles.forEach((v,i)=>{v.hp=i===1?0:v.maxHp*.4;v.cooldown=i===1?21:0;if(v.module){v.module.magazine.ammo=3;v.module.magazine.remaining=1.2;}});
  const before=g.vehicles.map(v=>({hp:v.hp,maxHp:v.maxHp,cooldown:v.cooldown,ammo:v.module?.magazine.ammo,remaining:v.module?.magazine.remaining})),heroHp=g.maxHp();
  assert.ok(g.transact('heroes',hero,'upgrade'));assert.ok(g.maxHp()>heroHp);
  assert.deepEqual(g.vehicles.map(v=>({hp:v.hp,maxHp:v.maxHp,cooldown:v.cooldown,ammo:v.module?.magazine.ammo,remaining:v.module?.magazine.remaining})),before);
 }
});

test('装甲升级仍提高上限并保留受损比例，上下车不补血，重建不继承角色生命',()=>{
 const g=scene();g.vehicle.hp=g.vehicle.maxHp*.4;const hp=g.vehicle.maxHp;
 assert.ok(g.upgradeVehicle());assert.ok(g.vehicle.maxHp>hp);assert.equal(g.vehicle.hp,g.vehicle.maxHp*.4);
 const damaged=g.vehicle.hp;assert.ok(summonVehicle(g));assert.ok(dismountVehicle(g));assert.equal(g.vehicle.hp,damaged);
 g.vehicle.hp=0;g.vehicle.cooldown=0;assert.ok(summonVehicle(g));assert.equal(g.vehicle.hp,vehicleMaxHp(g.progress));
 const saved=validateProgress(JSON.parse(JSON.stringify(g.progress))),loaded=new Game(saved,()=>.5);assert.equal(loaded.vehicle.maxHp,g.vehicle.maxHp);
 loaded.realm={buffs:{vitality:1000}};assert.equal(createVehicle(loaded.progress, 0).maxHp,g.vehicle.maxHp);
});
