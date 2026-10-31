// 货架按真实拥有状态筛选，保留排序与存档，购买后及时重新归类。
import test from 'node:test';
import assert from 'node:assert/strict';
import {workshopCatalog} from '../src/progression/workshop-catalog.js';
import {WEAPON_DISPLAY_ORDER} from '../src/config/weapons.js';
import {VEHICLE_DISPLAY_ORDER} from '../src/config/vehicles.js';
import {freshProgress} from '../src/progression/progress.js';

test('购买仅显示未拥有，升级改装成长共用已拥有目录且不改变存档',()=>{
 const p=freshProgress();p.weapons.fill(0);p.weapons[0]=3;p.weapons[14]=1;p.weapons[2]=2;const before=structuredClone(p);
 const owned=WEAPON_DISPLAY_ORDER.filter(i=>[0,2,14].includes(i));
 assert.deepEqual(workshopCatalog(p,'weapons','buy'),WEAPON_DISPLAY_ORDER.filter(i=>!owned.includes(i)));
 for(const page of ['upgrade','modify','unlock'])assert.deepEqual(workshopCatalog(p,'weapons',page),owned);
 assert.deepEqual(p,before);
});
test('购入或奖励获得武器后立即移出购买并加入成长目录',()=>{
 const p=freshProgress();p.weapons.fill(0);const i=3;assert.ok(workshopCatalog(p,'weapons','buy').includes(i));
 p.weapons[i]=1;assert.ok(!workshopCatalog(p,'weapons','buy').includes(i));
 for(const page of ['upgrade','modify','unlock'])assert.deepEqual(workshopCatalog(p,'weapons',page),[i]);
});
test('未拥有和全拥有均可返回空目录，载具同样按归属分区',()=>{
 const p=freshProgress();p.weapons.fill(0);
 for(const page of ['upgrade','modify','unlock'])assert.deepEqual(workshopCatalog(p,'weapons',page),[]);
 assert.deepEqual(workshopCatalog(p,'weapons','buy'),WEAPON_DISPLAY_ORDER);
 p.weapons.fill(1);assert.deepEqual(workshopCatalog(p,'weapons','buy'),[]);
 p.vehicleHulls.fill(0);p.vehicleHulls[0]=1;
 assert.deepEqual(workshopCatalog(p,'vehicle','buy'),VEHICLE_DISPLAY_ORDER.filter(i=>i!==0));
 for(const page of ['upgrade','modify','unlock'])assert.deepEqual(workshopCatalog(p,'vehicle',page),[0]);
 p.vehicleHulls.fill(1);assert.deepEqual(workshopCatalog(p,'vehicle','buy'),[]);
});
