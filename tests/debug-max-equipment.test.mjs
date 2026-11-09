// Debug 满级通过正式部件目录与保存事务验证，不消耗玩家资源。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {debugGrantProgress,debugEquipmentMaxed} from '../src/progression/player/debug-grants.js';
import {createProgressController} from '../src/app/progress-controller.js';
import {equipmentParts,partLevel} from '../src/config/equipment-parts.js';
import {vehicleMaxHp,vehicleDamage} from '../src/config/vehicles.js';
import {weaponDamage} from '../src/config/weapon-mods.js';
// 所有部件采用各自上限，不能将射速或蜘蛛协同误设为伤害等级上限。
function assertMax(p,kind,field){for(let i=0;i<p[field].length;i++){assert.ok(p[field][i]>0);for(const part of equipmentParts(kind,i))assert.equal(partLevel(p,kind,i,part.key),part.max,`${kind}:${i}:${part.key}`);}}
test('全部武器解锁且各部件满级，载具、资源、角色和任务保持，重复执行稳定',()=>{
 const p=validateProgress(freshProgress()),before=structuredClone(p),next=debugGrantProgress(p,'max-weapons');assertMax(next,'weapons','weapons');assert.ok(debugEquipmentMaxed(next,'max-weapons'));assert.ok(!debugEquipmentMaxed(p,'max-weapons'));assert.deepEqual(p,before);assert.ok(weaponDamage(next,0)>weaponDamage(p,0));
 for(const k of ['coins','wood','materials','heroes','weapon','vehicleHulls','vehicleWeapons','vehicleParts','turretParts','mainline','campLevel','mastery','mods'])assert.deepEqual(next[k],p[k],k);
 assert.deepEqual(validateProgress(next),next);assert.deepEqual(debugGrantProgress(next,'max-weapons'),next);
});
test('全部车体及炮塔满级，配套主炮可用且电动车无挂载，手持武器独立',()=>{
 const p=validateProgress(freshProgress()),next=debugGrantProgress(p,'max-vehicles');assertMax(next,'vehicle','vehicleHulls');assertMax(next,'turret','vehicleWeapons');assert.ok(debugEquipmentMaxed(next,'max-vehicles'));assert.equal(next.vehicleLoadouts[5],null);assert.equal(next.vehicleLoadouts[0],17);assert.ok(vehicleDamage(next,17)>0);
 for(const k of ['weapons','weaponParts','weapon','vehicleIndex','coins','wood','materials','heroes','mainline','mastery'])assert.deepEqual(next[k],p[k],k);
 assert.deepEqual(validateProgress(next),next);assert.deepEqual(debugGrantProgress(next,'max-vehicles'),next);
});
test('写盘失败无部分升级，成功保存后即时同步车体并保留伤势、冷却及巡游',()=>{
 const g=new Game(freshProgress());g.start();g.player.x+=20;g.vehicles[0].hp=g.vehicles[0].maxHp*.4;g.vehicles[0].cooldown=12;g.wave=3;const before=structuredClone(g.progress),oldHp=g.vehicles[0].maxHp;let saved;
 const store={available:false,saveProgress:()=>false},controller=createProgressController({game:g,store,root:{getElementById:()=>({})},refresh(){}});
 for(const kind of ['max-weapons','max-vehicles']){assert.equal(controller.debugGrant(kind),false);assert.deepEqual(g.progress,before);assert.equal(g.vehicles[0].maxHp,oldHp);}
 store.saveProgress=p=>{saved=structuredClone(p);return true;};assert.ok(controller.debugGrant('max-vehicles'));assert.ok(debugEquipmentMaxed(saved,'max-vehicles'));assert.equal(saved.patrol.wave,3);assert.equal(g.wave,3);assert.equal(g.vehicles[0].maxHp,vehicleMaxHp({...g.progress,vehicleIndex:0},g.maxHp()));assert.equal(g.vehicles[0].hp,g.vehicles[0].maxHp*.4);assert.equal(g.vehicles[0].cooldown,12);assert.equal(g.vehicles[0].weaponIndex,17);
 const hp=g.vehicles[0].hp;assert.ok(controller.debugGrant('max-vehicles'));assert.equal(g.vehicles[0].hp,hp);assert.ok(controller.debugGrant('max-weapons'));assert.ok(debugEquipmentMaxed(g.progress,'max-weapons'));
 g.story={};assert.equal(controller.debugGrant('max-weapons'),false);
});
