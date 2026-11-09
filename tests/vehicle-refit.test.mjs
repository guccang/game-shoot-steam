import {createVehicle} from '../src/combat/vehicle.js';
import {vehicleCompanionContext} from '../src/combat/vehicle-companions.js';
// 区域方案覆盖存档、实际能力、边界与原子保存，不依赖界面缓存。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {vehicleRefitStats,redistributeVehicleZones,validVehicleZones} from '../src/config/vehicle-refit.js';
import {configureVehicleBuild} from '../src/core/vehicles/vehicle-build.js';
import {vehicleLoad} from '../src/progression/inventory/load-weight.js';
import {vehicleWeapon} from '../src/config/vehicles.js';
// 在正式工坊上下文建立隔离车辆，记录持久化候选。
function scene(){const p=freshProgress();p.vehicleHulls[0]=1;p.vehicleIndex=0;p.vehicleWeapons[17]=1;p.vehicleLoadouts[0]=17;p.coins=10000000;const g=new Game(p);g.state='playing';g.cottage={kind:'vehicle'};g.livingPersist=()=>true;return g;}
test('旧档默认无增益，分配反复触边仍守恒，坏档恢复均分',()=>{const g=scene();assert.equal(vehicleRefitStats(g.progress).power,1);let z=vehicleRefitStats(g.progress).zones;for(let i=0;i<100;i++){z=redistributeVehicleZones(z,['engine','living','ammo','secondary','storage'][i%5],i%2?80:5);assert.ok(validVehicleZones(z));}g.progress.logistics.builds[0].refit={zones:{engine:100},chassisLevel:Infinity};assert.equal(vehicleRefitStats(validateProgress(g.progress)).space,100);});
test('强化运力、底盘扩容及区域能力真正进入正式计算并持久化',()=>{const g=scene(),old=vehicleLoad(g,0);assert.ok(configureVehicleBuild(g,0,'upgrade-engine').ok);assert.ok(vehicleLoad(g,0).capacity>old.capacity);assert.ok(vehicleLoad(g,0).towCapacity>old.towCapacity);assert.ok(configureVehicleBuild(g,0,'upgrade-chassis').ok);const r=vehicleRefitStats(g.progress);assert.equal(r.space,120);const w=vehicleWeapon(g.progress),z=redistributeVehicleZones(r.zones,'ammo',60);assert.ok(configureVehicleBuild(g,0,'zones',z).ok);assert.ok(w);assert.ok(vehicleWeapon(g.progress).reloadTime<w.reloadTime);assert.deepEqual(vehicleRefitStats(validateProgress(structuredClone(g.progress))).zones,z);});
test('坏方案、过载、保存失败与等级上限均不扣费或改变已存方案',()=>{const g=scene(),before=structuredClone(g.progress);assert.equal(configureVehicleBuild(g,0,'zones',{engine:100}).ok,false);g.livingPersist=()=>false;assert.equal(configureVehicleBuild(g,0,'upgrade-chassis').ok,false);assert.deepEqual(g.progress,before);g.livingPersist=()=>true;g.progress.logistics.builds[0].wood=1e8;assert.equal(configureVehicleBuild(g,0,'zones',redistributeVehicleZones(vehicleRefitStats(g.progress).zones,'living',80)).ok,false);g.progress.logistics.builds[0].wood=0;g.progress.logistics.builds[0].refit.engineLevel=10;assert.equal(configureVehicleBuild(g,0,'upgrade-engine').ok,false);});

// 使用正式车载伙伴上下文验证伤害，不只核对展示倍率。
test('副武器空间强化既有伙伴和外挂枪，不创造装备',()=>{const g=scene();g.progress.vehicleWeapons[22]=1;g.progress.vehicleLoadouts[0]=22;g.vehicle=g.vehicles[0]=createVehicle(g.progress,0);g.vehicle.active=true;const old=vehicleCompanionContext(g),damage=old.damage(),gun=old.mountedGunDamage(0);g.progress.logistics.builds[0].refit.zones={engine:5,living:5,ammo:5,secondary:80,storage:5};const next=vehicleCompanionContext(g);assert.equal(next.damage(),damage*2.5);assert.equal(next.mountedGunDamage(0),gun*2.5);});
