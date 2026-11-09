// 统一物品表与实际负重的行为验收，覆盖所有持有类型、弹药守恒及活动隔离。
import test from 'node:test';
import assert from 'node:assert/strict';
import {ITEM_TABLE,FARM_ITEMS} from '../src/config/items.js';
import {backpackEntries} from '../src/progression/inventory/backpack.js';
import {catLoad,vehicleLoad} from '../src/progression/inventory/load-weight.js';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {takeSupplyAmmo,syncSupplyAmmo} from '../src/combat/supply-ammo.js';
import {WEAPONS} from '../src/config/weapons.js';
import {CAMP_CHARACTERS} from '../src/config/monster-camps.js';
// 创建真实猫猫与存档，只持有一把普通枪，去掉过场以启用实际弹药。
function scene(){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.weapons.fill(0);p.weapons[0]=1;p.weapon=0;const g=new Game(p);g.state='playing';return g;}
test('目录所有物品都有分类图标用途和非负千克重量',()=>{for(const [id,r] of Object.entries(ITEM_TABLE)){assert.equal(r.id,id);for(const key of ['name','description','use','category','icon'])assert.ok(r[key],id+':'+key);assert.ok(Number.isFinite(r.mass)&&r.mass>=0,id);}assert.equal(Object.keys(FARM_ITEMS).length,3);});
test('所有持有物品自然扩展，武器等级不变成数量，空物品和货舱不混入',()=>{const g=scene(),p=g.progress;p.weapons[1]=5;p.supplies.items.medkit=2;p.supplies.items.gunKit=1;p.supplies.hand.shell=3;p.farm.inventory[0]=2;p.farm.seeds[1]=4;p.monsterCamps.items.push(CAMP_CHARACTERS[0].id);p.supplies.vehicles[5].heavy=10;p.logistics.builds[5].cargo[2]=20;const entries=backpackEntries(g),ids=new Set(entries.map(r=>r.id));assert.ok(entries.length>9);for(const id of ['weapon:0','weapon:1','supply:medkit','ammo:shell','crop:0','seed:1','tool:hoe','tool:sickle','tool:water','elder-letter','house-key','patrol-phone','camp-relic-'+CAMP_CHARACTERS[0].id])assert.ok(ids.has(id),id);assert.ok(!ids.has('supply:engineKit'));assert.ok(!ids.has('ammo:heavy'));assert.ok(!ids.has('crop:2'));assert.equal(entries.find(r=>r.id==='weapon:1').count,1);assert.ok(Math.abs(catLoad(g).weight-entries.reduce((sum,r)=>sum+r.weight,0))<1e-6);const before=catLoad(g).weight;p.farm.inventory[0]--;assert.equal(before-catLoad(g).weight,ITEM_TABLE['crop:0'].mass);});
test('装填只搬运子弹不增加重量，射击消耗重量，活动弹匣不污染背包',()=>{const g=scene();g.magazines[0].ammo=0;g.progress.supplies.hand.light=50;const initial=catLoad(g).weight;g.magazines[0].ammo+=takeSupplyAmmo(g,WEAPONS[0],10);assert.equal(catLoad(g).weight,initial);assert.match(backpackEntries(g).find(r=>r.id==='ammo:light').note,/备用 40 发 · 已装填 10 发/);g.magazines[0].ammo--;assert.ok(Math.abs(initial-catLoad(g).weight-ITEM_TABLE['ammo:light'].mass)<1e-6);syncSupplyAmmo(g);const normal=catLoad(g).weight;g.realm={};g.magazines[0].ammo=99999;assert.equal(catLoad(g).weight,normal);});
test('随身物品重量跟随驾驶员进入车辆，货舱保持独立',()=>{const g=scene();g.vehicle.active=true;const car=vehicleLoad(g),bag=catLoad(g);g.progress.supplies.items.engineKit=2;assert.equal(catLoad(g).weight-bag.weight,8);assert.equal(vehicleLoad(g).mass-car.mass,8);assert.equal(vehicleLoad(g).payload,car.payload);assert.equal(vehicleLoad(g,g.vehicle.index,{driver:false}).driver,0);});
