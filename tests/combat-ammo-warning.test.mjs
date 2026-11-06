// 缺弹提醒使用实际弹匣与实物库存，记录玩家收到的提示次数。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {updateAmmoWarning} from '../src/combat/ammo-warning.js';

// 手持手枪和坦克炮分别消耗通用子弹与标准炮弹。
function scene(){
 const p=freshProgress();p.vehicleHulls[1]=1;p.vehicleIndex=1;p.vehicleLoadouts[1]=18;p.vehicleWeapons[18]=1;
 const messages=[],g=new Game(p,()=>.5,(type,data)=>{if(type==='story-hint')messages.push(data.text);});
 g.state='playing';g.magazines[g.loadout.weapon].ammo=0;g.progress.supplies.hand.light=0;
 return {g,messages};
}
test('进战和耗尽时提醒，连续交战不刷屏，短暂脱离射程不重复',()=>{
 const {g,messages}=scene();updateAmmoWarning(g,.05,false);assert.equal(messages.length,0);
 updateAmmoWarning(g,.05,true);assert.match(messages[0],/通用子弹用完/);
 updateAmmoWarning(g,.05,false);updateAmmoWarning(g,.05,true);assert.equal(messages.length,1);
 g.magazines[g.loadout.weapon].ammo=1;updateAmmoWarning(g,.05,true);
 g.magazines[g.loadout.weapon].ammo=0;updateAmmoWarning(g,.05,true);assert.equal(messages.length,2);
 updateAmmoWarning(g,1,false);updateAmmoWarning(g,.05,true);assert.equal(messages.length,3);
});
test('换弹、车内备用、借用武器和近战免提示，车内有弹但包满时说明原因',()=>{
 const {g,messages}=scene();g.magazines[g.loadout.weapon].remaining=.2;
 g.progress.supplies.hand.light=1;updateAmmoWarning(g,.05,true);
 g.progress.supplies.hand.light=0;g.progress.supplies.vehicles[1].light=3;updateAmmoWarning(g,.05,true);
 assert.equal(messages.length,0);g.progress.logistics.bagWood=100;updateAmmoWarning(g,.05,true);
 assert.match(messages[0],/背包腾出空间/);
 g.realm={};updateAmmoWarning(g,.05,true);g.realm=null;g.weapon=()=>({id:'chainsaw'});updateAmmoWarning(g,.05,true);
 assert.equal(messages.length,1);
});
test('人车同时缺弹只出一条，有炮弹可装时只提醒手持枪',()=>{
 const {g,messages}=scene();g.vehicle.active=true;g.vehicle.module.magazine.ammo=0;
 updateAmmoWarning(g,.05,true);assert.equal(messages.length,1);assert.match(messages[0],/手持.*通用子弹.*载具主炮.*标准炮弹/);
 g.progress.supplies.vehicles[1].shell=1;updateAmmoWarning(g,1,false);updateAmmoWarning(g,.05,true);
 assert.equal(messages.length,2);assert.doesNotMatch(messages[1],/主炮/);
});
