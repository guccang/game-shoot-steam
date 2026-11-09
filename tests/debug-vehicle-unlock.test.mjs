// 一键解锁必须在本次会话补齐配套主炮，不依赖下一次读取存档修复。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {debugGrantProgress} from '../src/progression/player/debug-grants.js';
import {createProgressController} from '../src/app/progress-controller.js';
import {VEHICLE_ARMAMENTS} from '../src/config/vehicle-armaments.js';

test('一级解锁同时授予并挂载各车型主炮，重新读档不会再补内容',()=>{
 const p=freshProgress(),before=structuredClone(p),next=debugGrantProgress(p,'vehicles');
 for(const weapon of VEHICLE_ARMAMENTS.filter(w=>Number.isInteger(w.hullIndex))){assert.equal(next.vehicleWeapons[weapon.weaponIndex],1,weapon.id);assert.equal(next.vehicleLoadouts[weapon.hullIndex],weapon.weaponIndex,weapon.id);}
 assert.equal(next.vehicleLoadouts[4],null);assert.equal(next.vehicleWeapons[0],0);
 assert.equal(next.vehicleLoadouts[5],null);assert.equal(next.vehicleLoadouts[8],null);
 assert.deepEqual(validateProgress(next),next);assert.deepEqual(p,before);
});

test('保存失败不挂炮，成功后当场同步红狼等载具，保留已有改装、弹药与冷却',()=>{
 const p=freshProgress();p.vehicleHulls[1]=4;p.vehicleWeapons[18]=2;p.vehicleLoadouts[1]=18;
 const g=new Game(validateProgress(p),()=>.5);g.start();g.wave=3;
 const tank=g.vehicles[1],module=tank.module;tank.hp=tank.maxHp*.4;tank.cooldown=12;module.magazine.ammo=0;module.magazine.remaining=.9;
 const before=structuredClone(g.progress),oldHp=tank.hp,oldMax=tank.maxHp;let saved;
 const store={available:false,saveProgress:()=>false},controller=createProgressController({game:g,store,root:{getElementById:()=>({})},refresh(){}});
 assert.equal(controller.debugGrant('vehicles'),false);assert.deepEqual(g.progress,before);assert.equal(g.vehicles[6].weaponIndex,null);assert.equal(g.vehicles[6].module,null);
 store.saveProgress=next=>{saved=structuredClone(next);return true;};
 assert.equal(controller.debugGrant('vehicles'),true);
 for(const weapon of VEHICLE_ARMAMENTS.filter(w=>Number.isInteger(w.hullIndex))){if(weapon.hullIndex===1)continue;assert.equal(g.vehicles[weapon.hullIndex].weaponIndex,weapon.weaponIndex);assert.ok(g.vehicles[weapon.hullIndex].module);}
 assert.equal(saved.vehicleLoadouts[6],21);assert.equal(saved.vehicleWeapons[21],1);assert.equal(saved.patrol.wave,3);assert.equal(g.wave,3);
 assert.equal(tank.weaponIndex,18);assert.equal(tank.module,module);assert.deepEqual(module.magazine,{ammo:0,remaining:.9});assert.equal(tank.hp,oldHp);assert.equal(tank.maxHp,oldMax);assert.equal(tank.cooldown,12);
 assert.equal(g.vehicles[4].weaponIndex,null);assert.equal(g.vehicles[5].weaponIndex,null);assert.equal(g.vehicles[8].weaponIndex,null);
 const wolfModule=g.vehicles[6].module;assert.equal(controller.debugGrant('vehicles'),true);assert.equal(g.vehicles[6].module,wolfModule);
});
