// 验证真实水界、战斗补水及持久化弹药，避免仅复述界面状态。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {WEAPONS} from '../src/config/weapons.js';
import {ammoKind} from '../src/config/supplies.js';
import {effectiveWeapon} from '../src/config/weapon-mods.js';
import {equipmentParts} from '../src/config/equipment-parts.js';
import {GAMEPLAY_VALUES} from '../src/config/gameplay-values.js';
import {createMagazines,consumeRound,advanceReload} from '../src/combat/magazine.js';
import {supplyAmmoCount,takeSupplyAmmo,syncSupplyAmmo} from '../src/combat/supply-ammo.js';
import {nearWaterBagSource,updateWaterBag} from '../src/core/fishing/water-bag.js';
import {riverXAt,riverHalfWidth} from '../src/world/river-geometry.js';
import {NATURAL_TERRAIN} from '../src/world/natural-terrain.js';
import {JIUZHAIGOU_LAKES} from '../src/world/jiuzhaigou.js';
import {ammoRingState} from '../src/ui/status-rings.js';
import {workshopResultChanges} from '../src/ui/workshop/results.js';
const index=WEAPONS.findIndex(w=>w.id==='water');
// 使用正式游戏状态，站在河岸外侧而非伪造水源标记。
function scene(){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.weapons[index]=1;p.weapon=index;const g=new Game(p);g.state='playing';g.vehicle.active=false;g.player.y=1800;g.player.x=riverXAt(1800)+riverHalfWidth(1800,1)+25;g.enemies=[];g.boss=null;return g;}
// 按正式固定步长累积，检查不同帧率不改变补满时长。
function step(g,seconds,dt=.05){for(let i=0;i<Math.round(seconds/dt);i++)updateWaterBag(g,dt);}
test('水袋使用真实河流、湖泊与九寨沟水界，室内不能从地表取水',()=>{const g=scene();assert.ok(nearWaterBagSource(g));g.player.x+=120;assert.equal(nearWaterBagSource(g),false);Object.assign(g.player,NATURAL_TERRAIN.lakes[0]);assert.ok(nearWaterBagSource(g));g.mapId='jiuzhaigou';Object.assign(g.player,JIUZHAIGOU_LAKES[0]);assert.ok(nearWaterBagSource(g));g.cottage={kind:'mine'};assert.equal(nearWaterBagSource(g),false);});
test('空水袋基础四秒补满，射击不消耗通用子弹，离岸不会自动装填',()=>{const g=scene(),w=g.weapon(),m=g.magazines[index],light=g.progress.supplies.hand.light;assert.equal(ammoKind(w),'water');step(g,2);assert.equal(m.ammo,20);assert.ok(m.waterFilling);step(g,2);assert.equal(m.ammo,40);assert.ok(m.waterComplete>0);for(let i=0;i<40;i++)assert.ok(consumeRound(m,w));g.player.x+=120;updateWaterBag(g,.05);advanceReload(m,w,30,null,n=>takeSupplyAmmo(g,w,n),supplyAmmoCount(g,w));assert.equal(m.ammo,0);assert.equal(m.remaining,0);assert.equal(g.progress.supplies.hand.light,light);});
test('敌人靠近、实际受击和清缴中均持续补水',()=>{const g=scene(),m=g.magazines[index];g.enemies=[{x:g.player.x+100,y:g.player.y,hp:100,type:'enemy'}];step(g,1);assert.equal(m.ammo,10);const hp=g.player.hp;g.player.invincible=0;g.hurt(1);assert.ok(g.player.hp<hp);step(g,1);assert.equal(m.ammo,20);g.livingBattle={};step(g,2);assert.equal(m.ammo,40);});
test('离岸与切枪保留水量，暂停不推进，退出存档不能免费回满',()=>{const g=scene(),m=g.magazines[index];step(g,1);g.player.x+=120;step(g,4);assert.equal(m.ammo,10);g.player.x-=120;g.state='paused';step(g,4);assert.equal(m.ammo,10);g.state='playing';g.progress.weapon=0;step(g,4);assert.equal(m.ammo,10);assert.equal(m.waterFilling,false);g.progress.weapon=index;syncSupplyAmmo(g);assert.equal(createMagazines(g.progress)[index].ammo,10);});
test('扩容增加喷射次数但仍四秒补满，水泵逐级缩短且满级三秒',()=>{const g=scene(),p=g.progress;const before=structuredClone(p);p.weaponParts[index].capacity=5;assert.ok(g.weapon().magazineSize>40);step(g,4);assert.equal(g.magazines[index].ammo,g.weapon().magazineSize);let previous=4;for(let lv=2;lv<=GAMEPLAY_VALUES.progress.maxPartLevel;lv++){p.weaponParts[index].reload=lv;const t=effectiveWeapon(p,index).reloadTime;assert.ok(t<previous);previous=t;}assert.equal(previous,3);g.magazines[index].ammo=0;step(g,3,.025);assert.equal(g.magazines[index].ammo,g.weapon().magazineSize);assert.match(workshopResultChanges(before,p,{kind:'weapons',index,part:'reload'},100)[0].label,/补满/);assert.equal(equipmentParts('weapons',index).find(x=>x.key==='capacity').name,'水袋');});
test('HUD 使用水袋图标与真实百分比，活动及伙伴独立供给保持可用',()=>{const g=scene(),m=g.magazines[index];step(g,2);const ring=ammoRingState(m,g.weapon());assert.equal(ring.icon,'waterbag');assert.equal(ring.count,'50%');assert.match(ring.label,/水袋 20 \/ 40/);g.story={};m.ammo=0;m.remaining=4;advanceReload(m,g.weapon(),4,null,n=>takeSupplyAmmo(g,g.weapon(),n),supplyAmmoCount(g,g.weapon()));assert.equal(m.ammo,40);m.ammo=0;m.remaining=4;advanceReload(m,g.weapon(),4);assert.equal(m.ammo,40);});
// 取水和水罐装填同时推进时，只能选择一条补给路径，库存与水量守恒。
function supplyStep(g,seconds){for(let i=0;i<Math.round(seconds/.05);i++){updateWaterBag(g,.05);advanceReload(g.magazines[index],g.weapon(),.05,null,n=>takeSupplyAmmo(g,g.weapon(),n),supplyAmmoCount(g,g.weapon()));}}
test('远离水源用背包水罐装填，真实扣水罐而非通用子弹',()=>{
 const g=scene(),m=g.magazines[index];g.player.x+=120;g.progress.supplies.hand.water=45;const light=g.progress.supplies.hand.light;supplyStep(g,2);assert.equal(m.ammo,0);assert.ok(m.remaining>0);assert.match(ammoRingState(m,g.weapon()).label,/水罐装填/);supplyStep(g,2);assert.equal(m.ammo,40);assert.equal(g.progress.supplies.hand.water,5);assert.equal(g.progress.supplies.hand.light,light);for(let i=0;i<40;i++)consumeRound(m,g.weapon());supplyStep(g,4);assert.equal(m.ammo,5);assert.equal(g.progress.supplies.hand.water,0);
});
test('背包水罐耗尽后从当前载具补给，数量不足只装现有量',()=>{
 const g=scene(),m=g.magazines[index];g.player.x+=120;g.progress.vehicleHulls[g.vehicle.index]=1;g.progress.supplies.hand.water=2;g.progress.supplies.vehicles[g.vehicle.index].water=7;supplyStep(g,4);assert.equal(m.ammo,9);assert.equal(g.progress.supplies.hand.water,0);assert.equal(g.progress.supplies.vehicles[g.vehicle.index].water,0);
});
test('岸边战斗取水优先，边喷射边补水不扣备用水罐',()=>{
 const g=scene(),m=g.magazines[index];g.progress.supplies.hand.water=80;g.livingBattle={};for(let i=0;i<80;i++){supplyStep(g,.05);if(i%5===4)assert.ok(consumeRound(m,g.weapon()));}assert.equal(m.ammo,24);assert.equal(g.progress.supplies.hand.water,80);assert.equal(m.waterComplete,0);supplyStep(g,2);assert.equal(m.ammo,40);
});
test('水罐装填途中到岸边改为免费取水，离岸保存水量与装填进度',()=>{
 const g=scene(),m=g.magazines[index];g.player.x+=120;g.progress.supplies.hand.water=40;supplyStep(g,2);assert.ok(Math.abs(m.remaining-2)<1e-8);g.player.x-=120;supplyStep(g,1);assert.equal(m.ammo,10);assert.equal(m.remaining,0);assert.equal(g.progress.supplies.hand.water,40);g.player.x+=120;supplyStep(g,2);assert.equal(m.ammo,10);for(let i=0;i<10;i++)consumeRound(m,g.weapon());supplyStep(g,1);syncSupplyAmmo(g);const restored=createMagazines(g.progress)[index];assert.equal(restored.ammo,0);assert.ok(Math.abs(restored.remaining-3)<.001);assert.equal(g.progress.supplies.hand.water,40);
});
test('水罐可从手持弹药页购买并推荐给潮汐水枪',async()=>{
 const {equippedAmmo}=await import('../src/progression/workshop/ammo-fit.js'),{tradeSupply}=await import('../src/core/vehicles/supplies.js'),g=scene();g.progress.coins=100;g.progress.vehicleHulls.fill(0);g.cottage={kind:'ammo'};g.livingPersist=()=>true;assert.equal(equippedAmmo(g,'hand').key,'water');const result=tradeSupply(g,{kind:'ammo',id:'water',target:'hand'});assert.ok(result.ok,result.message);assert.equal(g.progress.supplies.hand.water+g.progress.warehouse.ammo.water,200);assert.equal(g.progress.coins,80);
});
// 正式攻击入口也必须允许补水中和补满提示期间射击，避免只验证弹药辅助函数。
test('正式攻击不会被补水状态与补满提示阻止',()=>{
 const g=scene(),m=g.magazines[index];g.spawnEnemy(0,0,{x:g.player.x+110,y:g.player.y});m.ammo=20;m.remaining=0;m.waterFilling=true;assert.equal(g.attack(),true);assert.equal(m.ammo,19);m.waterFilling=false;m.waterComplete=1.5;assert.equal(g.attack(),true);assert.equal(m.ammo,18);assert.equal(m.waterComplete,0);
});
