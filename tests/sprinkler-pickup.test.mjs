// 洒水器搬移回归：真实事务、临时携带、浇水停启与取消恢复。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {pickupSprinkler,carriedSprinkler,productionPlacement,placeProduction,updateProduction,removeProduction} from '../src/core/farm-production.js';
import {productionObjects} from '../src/rendering/farm-production.js';
// 清除战斗与教学阻塞，在真实地形中找到两处可用搬移位置。
function scene(){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.production.returned=true;p.production.minedOre=12;const g=new Game(p,()=>.5);g.state='playing';g.vehicle.active=false;g.trees=[];g.enemies=[];g.mainlineSpeech=null;
 for(let y=2000;y<4000;y+=104)for(let x=2000;x<4000;x+=112){Object.assign(g.player,{x,y});const a={x,y,mapId:g.mapId},b={...a,x:x+336};if(productionPlacement(g,a,'sprinkler').reason)continue;Object.assign(g.player,b);if(productionPlacement(g,b,'sprinkler').reason)continue;Object.assign(g.player,a);g.progress.production.sprinklers=[{...a,id:1}];return {g,a,b};}throw Error('没有合法搬移场地');}
// 拿起不改永久存档，放下才提交相同ID的新位置。
test('拿起后可走离原位，放下免费且仅保留一个设备',()=>{const {g,a,b}=scene(),before=structuredClone(g.progress);g.livingPersist=()=>true;assert.ok(pickupSprinkler(g,1).ok);assert.deepEqual(g.progress,before);assert.equal(pickupSprinkler(g,1).ok,false);const objects=productionObjects(g);assert.equal(objects.length,1);assert.ok(objects[0].carried);Object.assign(g.player,b);assert.equal(productionPlacement(g,b,'sprinkler',1).reason,null);assert.ok(placeProduction(g,'sprinkler',b,1).ok);assert.equal(g.productionCarry,null);assert.equal(g.progress.production.sprinklers.length,1);assert.equal(g.progress.production.sprinklers[0].id,1);assert.ok(g.progress.production.sprinklers[0].x>a.x+130);assert.equal(g.progress.mining.ore,before.mining.ore);assert.equal(g.progress.wood,before.wood);});
// 远程拿起、驾驶和切图不能绕过交互限制；取消直接恢复原位显示。
test('拿起范围与场景有效性正确，取消不会丢失原位设备',()=>{const {g,a,b}=scene();Object.assign(g.player,b);assert.equal(pickupSprinkler(g,1).ok,false);Object.assign(g.player,a);g.vehicle.active=true;assert.equal(pickupSprinkler(g,1).ok,false);g.vehicle.active=false;assert.ok(pickupSprinkler(g,1).ok);g.state='paused';assert.ok(carriedSprinkler(g));g.mapId='jiuzhaigou';assert.equal(carriedSprinkler(g),null);g.mapId=a.mapId;g.productionCarry=null;const objects=productionObjects(g);assert.equal(objects.length,1);assert.equal(objects[0].x,a.x);assert.ok(!objects[0].carried);assert.deepEqual(g.progress.production.sprinklers,[{...a,id:1}]);});
// 所有落点使用正式校验；存档失败维持携带状态，允许重试。
test('非法落点与保存失败不搬走设备，成功重试保持原ID',()=>{const {g,a,b}=scene();pickupSprinkler(g,1);Object.assign(g.player,b);g.progress.farm.plots=[{...b,id:1,crop:null,plantedAt:0,readyAt:0,watered:false}];assert.equal(placeProduction(g,'sprinkler',b,1).ok,false);g.progress.farm.plots=[];const before=structuredClone(g.progress);g.livingPersist=()=>false;assert.equal(placeProduction(g,'sprinkler',b,1).ok,false);assert.deepEqual(g.progress,before);assert.ok(carriedSprinkler(g));g.livingPersist=()=>true;assert.ok(placeProduction(g,'sprinkler',b,1).ok);assert.equal(g.productionCarry,null);assert.notEqual(g.progress.production.sprinklers[0].x,a.x);});
// 搬起后原位不会继续灌溉，取消后恢复，其他设备仍可正常工作。
test('拿起期间停止原位浇水，取消恢复并保持其他洒水器工作',()=>{const {g,a,b}=scene();g.livingPersist=()=>true;g.progress.production.sprinklers.push({...b,id:2});g.progress.farm.plots=[a,b].map((p,i)=>({...p,x:p.x+56,id:i+1,crop:1,plantedAt:1,readyAt:100000,watered:false}));pickupSprinkler(g,1);assert.ok(finishWatering(g,1000));assert.equal(g.progress.farm.plots[0].watered,false);assert.equal(g.progress.farm.plots[1].watered,true);assert.deepEqual(g.productionSpray.sprinklers,[2]);g.productionCarry=null;assert.ok(finishWatering(g,1000));assert.equal(g.progress.farm.plots[0].watered,true);});

// 拆除与建设同样先保存后提交，且不能反复拆建刷种子或退款。
test('洒水器和加工台可移除，保留补给及赠种记录，不退款不重复删除',()=>{
 for(const kind of ['sprinkler','bench']){const {g,a}=scene();g.progress.production.bench=a;g.progress.production.seedGift=true;g.progress.production.stock.meal=3;g.progress.farm.inventory[1]=2;const id=kind==='bench'?'bench':1,before=structuredClone(g.progress);g.livingPersist=()=>false;assert.equal(removeProduction(g,kind,id).ok,false);assert.deepEqual(g.progress,before);g.livingPersist=()=>true;
 if(kind==='sprinkler')pickupSprinkler(g,1);assert.ok(removeProduction(g,kind,id).ok);assert.equal(kind==='bench'?g.progress.production.bench:g.progress.production.sprinklers.find(p=>p.id===1),kind==='bench'?null:undefined);assert.equal(removeProduction(g,kind,id).ok,false);assert.equal(g.progress.production.stock.meal,3);assert.equal(g.progress.farm.inventory[1],2);assert.equal(g.progress.production.seedGift,true);assert.equal(g.progress.wood,before.wood);assert.equal(g.progress.mining.ore,before.mining.ore);assert.ok(!carriedSprinkler(g));}
});
// 删除范围按每个设施真实位置校验，不允许跨地图或车上拆除。
test('移除必须在地面步行靠近，暂停确认允许提交',()=>{const {g,a,b}=scene();g.livingPersist=()=>true;Object.assign(g.player,b);assert.equal(removeProduction(g,'sprinkler',1).ok,false);Object.assign(g.player,a);g.vehicle.active=true;assert.equal(removeProduction(g,'sprinkler',1).ok,false);g.vehicle.active=false;g.mapId='jiuzhaigou';assert.equal(removeProduction(g,'sprinkler',1).ok,false);g.mapId=a.mapId;g.state='paused';assert.ok(removeProduction(g,'sprinkler',1).ok);});

// 删除形成编号空缺后，保存归一化不能改变剩余设备ID，否则后续操作会误选。
test('删除后的稀疏编号跨存档和连续移除保持稳定',()=>{const {g,a,b}=scene();g.livingPersist=()=>true;g.progress.production.sprinklers=[{...a,id:1},{...a,x:a.x+112,id:2},{...b,id:3}];assert.ok(removeProduction(g,'sprinkler',1).ok);assert.deepEqual(g.progress.production.sprinklers.map(p=>p.id),[2,3]);g.progress=validateProgress(g.progress);assert.deepEqual(g.progress.production.sprinklers.map(p=>p.id),[2,3]);Object.assign(g.player,b);assert.ok(pickupSprinkler(g,3).ok);assert.ok(removeProduction(g,'sprinkler',3).ok);assert.deepEqual(g.progress.production.sprinklers.map(p=>p.id),[2]);assert.equal(g.productionCarry,null);});

// 保留原事务断言，但通过真实扫描时钟等待一轮落水。
function finishWatering(g,now){const first=updateProduction(g,now);if(g.state!=='playing')return first;g.time+=1.25;return updateProduction(g,now)||first;}
