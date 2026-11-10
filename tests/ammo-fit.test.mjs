// 推荐必须与实际开火消耗一致，覆盖主炮换装、空炮位及共享图标。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {grantVehicleArmament} from '../src/config/vehicle-armaments.js';
import {ammoKind,AMMO_TYPES} from '../src/config/supplies.js';
import {vehicleWeapon} from '../src/config/vehicles.js';
import {RANGER} from '../src/config/ranger-arrival.js';
import {equippedAmmo} from '../src/progression/workshop/ammo-fit.js';
import {mountMainGun} from '../src/core/vehicles/supplies.js';
import {ammoIcon} from '../src/ui/ammo-icons.js';
import {inventoryIcon} from '../src/ui/inventory-icons.js';
import {itemDefinition} from '../src/config/items.js';
// 准备已拥有车辆，保留正式装备和换炮事务。
function scene(){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.vehicleHulls.fill(1);p.vehicleHulls.forEach((_,i)=>grantVehicleArmament(p,i));p.vehicleIndex=1;const g=new Game(p);g.state='playing';g.vehicle.active=false;g.livingPersist=()=>true;return g;}
test('所有车型推荐与当前主炮真实弹药类型一致，无炮位不推荐',()=>{const g=scene();for(const v of g.vehicles){g.vehicle=v;const fit=equippedAmmo(g,'vehicle');assert.equal(fit.key,ammoKind(vehicleWeapon(g.progress,v.weaponIndex)));if(fit.key)assert.equal(fit.ammo,AMMO_TYPES[fit.key].name);else assert.ok(fit.reason.length);}g.vehicle=g.vehicles[5];assert.equal(equippedAmmo(g,'vehicle').key,null);});
test('重坦换上红狼主炮后推荐重型炮弹，拆炮后清除推荐',()=>{const g=scene();assert.equal(equippedAmmo(g,'vehicle').key,'shell');g.cottage={kind:'vehicle'};assert.ok(mountMainGun(g,1,21).ok);assert.equal(equippedAmmo(g,'vehicle').key,'heavy');assert.match(equippedAmmo(g,'vehicle').weapon,/256/);assert.ok(mountMainGun(g,1,null).ok);assert.equal(equippedAmmo(g,'vehicle').key,null);});
test('猫猫推荐跟随手持装备，电锯不会标记通用子弹适用',()=>{const g=scene();g.progress.weapon=0;assert.equal(equippedAmmo(g,'hand').key,ammoKind(g.weapon()));assert.equal(equippedAmmo(g,'hand').key,'light');g.progress.weapon=RANGER.saw;assert.equal(equippedAmmo(g,'hand').key,null);assert.match(equippedAmmo(g,'hand').reason,/无需/);});
test('四类弹药剪影不同，背包目录与购买图标统一且未知类型不伪装',()=>{const icons=Object.keys(AMMO_TYPES).map(key=>{const svg=ammoIcon(key);assert.equal(inventoryIcon(itemDefinition('ammo:'+key)),svg);return svg.replace(/data-ammo-icon="[^"]+"/,'');});assert.equal(new Set(icons).size,Object.keys(AMMO_TYPES).length);assert.equal(ammoIcon('missing'),'');});
