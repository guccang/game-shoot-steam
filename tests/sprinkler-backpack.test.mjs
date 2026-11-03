// 洒水器收回和背包放置的持久事务、身份与库存守恒专项测试。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {storeSprinkler,placeProduction,productionPlacement,updateProduction,pickupSprinkler,carriedSprinkler} from '../src/core/farm-production.js';
import {backpackEntries} from '../src/progression/backpack.js';
import {productionObjects} from '../src/rendering/farm-production.js';
import {SPRINKLER,SPRINKLER_OFFSETS,sprinklerReach} from '../src/config/farm-production.js';
import {sprinklerCovers} from '../src/progression/farm-production.js';
// 使用真实游戏和真实地形，持久化由隔离事务钩子验证。
function scene(){
 const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';
 const g=new Game(p,()=>.5);g.state='playing';g.vehicle.active=false;g.vehicles=[];g.trees=[];g.enemies=[];g.mainlineSpeech=null;g.livingPersist=()=>true;g.progress.production.returned=true;g.progress.production.minedOre=12;g.progress.wood=100;g.progress.mining.ore=100;return g;
}
// 寻找不与真实道路、水域及建筑重叠的合法放置点。
function field(g){for(let y=1000;y<4000;y+=104)for(let x=500;x<4000;x+=112){Object.assign(g.player,{x,y});const point={x,y,mapId:g.mapId};if(!productionPlacement(g,point,'sprinkler').reason)return productionPlacement(g,point,'sprinkler').point;}throw Error('没有合法位置');}
test('旧档无库存，数量受总台数限制，稀疏编号经过重复保存仍稳定',()=>{
 const p=freshProgress();delete p.production.sprinklerInventory;p.production.sprinklers=[{id:3,mapId:'forest',x:1000,y:1000},{id:8,mapId:'forest',x:1200,y:1000}];
 let n=validateProgress(p);assert.equal(n.production.sprinklerInventory,0);assert.deepEqual(n.production.sprinklers.map(d=>d.id),[3,8]);
 n.production.sprinklerInventory=999;n=validateProgress(n);assert.equal(n.production.sprinklerInventory,30);assert.deepEqual(validateProgress(n).production.sprinklers.map(d=>d.id),[3,8]);
 n.production.sprinklerInventory=-2;assert.equal(validateProgress(n).production.sprinklerInventory,0);
});
test('收回入背包并停止地面浇水，保留其他设备编号和动画',()=>{
 const g=scene(),point=field(g);assert.ok(placeProduction(g,'sprinkler',point).ok);const d=g.progress.production.sprinklers[0];g.progress.production.sprinklers.push({...d,id:8,x:d.x+500});
 g.productionSpray={devices:[{...d,time:0},{...d,id:8,x:d.x+500,time:0}],sprinklers:[1,8]};
 const resources=[g.progress.wood,g.progress.mining.ore];assert.ok(storeSprinkler(g,1).ok);assert.equal(storeSprinkler(g,1).ok,false);
 assert.deepEqual(g.progress.production.sprinklers.map(d=>d.id),[8]);assert.deepEqual(g.productionSpray.sprinklers,[8]);assert.equal(backpackEntries(g).find(i=>i.id==='facility:sprinkler').count,1);assert.equal(productionObjects(g).length,1);
 assert.deepEqual([g.progress.wood,g.progress.mining.ore],resources);g.progress.farm.plots=[{...d,id:1,x:d.x+56,crop:1,plantedAt:1,readyAt:100000,watered:false}];assert.equal(updateProduction(g,1000),false);
 g.progress=validateProgress(g.progress);assert.equal(g.progress.production.sprinklerInventory,1);assert.deepEqual(g.progress.production.sprinklers.map(d=>d.id),[8]);
});
test('收回拒绝远程、异图、驾驶和地下，保存失败保持原设备及库存',()=>{
 const g=scene(),point=field(g);assert.ok(placeProduction(g,'sprinkler',point).ok);const before=structuredClone(g.progress);
 g.player.x+=500;assert.equal(storeSprinkler(g,1).ok,false);Object.assign(g.player,point);g.mapId='jiuzhaigou';assert.equal(storeSprinkler(g,1).ok,false);g.mapId='forest';g.vehicle.active=true;assert.equal(storeSprinkler(g,1).ok,false);g.vehicle.active=false;g.cottage={kind:'mine'};assert.equal(storeSprinkler(g,1).ok,false);g.cottage=null;
 g.livingPersist=()=>false;assert.equal(storeSprinkler(g,1).ok,false);g.livingPersist=()=>{throw Error('保存失败');};assert.equal(storeSprinkler(g,1).ok,false);assert.deepEqual(g.progress,before);
});
test('重新放置只扣一台库存，不要求再次解锁或支付建材，失败不丢设备',()=>{
 const g=scene(),point=field(g);g.progress.production.sprinklerInventory=1;g.progress.production.returned=false;g.progress.wood=g.progress.mining.ore=0;
 const before=structuredClone(g.progress);assert.equal(placeProduction(g,'sprinkler',{...point,x:point.x+500},null,true).ok,false);assert.deepEqual(g.progress,before);
 g.livingPersist=()=>false;assert.equal(placeProduction(g,'sprinkler',point,null,true).ok,false);assert.deepEqual(g.progress,before);
 g.livingPersist=()=>true;assert.ok(placeProduction(g,'sprinkler',point,null,true).ok);assert.equal(g.progress.production.sprinklerInventory,0);assert.equal(g.progress.production.sprinklers.length,1);assert.equal(g.progress.wood+g.progress.mining.ore,0);assert.equal(backpackEntries(g).some(i=>i.id==='facility:sprinkler'),false);
 assert.equal(placeProduction(g,'sprinkler',point,null,true).ok,false);
});
test('背包可跨地面地图重新布置，库存与地面台数合计仍受32台限制',()=>{
 const g=scene();g.progress.production.sprinklerInventory=32;let point=field(g);assert.equal(placeProduction(g,'sprinkler',point).ok,false);g.mapId='jiuzhaigou';point=field(g);
 assert.ok(placeProduction(g,'sprinkler',point,null,true).ok);assert.equal(g.progress.production.sprinklers[0].mapId,'jiuzhaigou');assert.equal(g.progress.production.sprinklerInventory,31);assert.ok(storeSprinkler(g,g.progress.production.sprinklers[0].id).ok);assert.equal(g.progress.production.sprinklerInventory,32);
});
test('二层20格包含第二层侧角，排除四角；喷水终点和覆盖判定相符',()=>{
 assert.equal(SPRINKLER_OFFSETS.length,20);const d={mapId:'forest',x:1000,y:1000};
 for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++)if(x||y)assert.equal(sprinklerCovers(d,{...d,x:d.x+x*56,y:d.y+y*52}),!(Math.abs(x)===2&&Math.abs(y)===2));
 for(let i=0;i<72;i++){const angle=i*Math.PI/36,r=sprinklerReach(angle),p={...d,x:d.x+Math.cos(angle)*r*SPRINKLER.cellWidth,y:d.y+Math.sin(angle)*r*SPRINKLER.cellHeight};assert.ok(sprinklerCovers(d,p));assert.equal(sprinklerCovers(d,{...p,x:d.x+(p.x-d.x)*1.001,y:d.y+(p.y-d.y)*1.001}),false);}
});

// 合法拿起后可随身收纳，失败不结束搬移，其他远处设备仍受距离保护。
test('拿起走远后可以收回，失败保留携带且不允许顺便收取远处其他设备',()=>{
 const g=scene(),point=field(g);assert.ok(placeProduction(g,'sprinkler',point).ok);
 g.progress.production.sprinklers.push({...point,id:2,x:point.x+56});assert.ok(pickupSprinkler(g,1).ok);g.player.x+=500;
 const before=structuredClone(g.progress);g.livingPersist=()=>false;assert.equal(storeSprinkler(g,1).ok,false);assert.deepEqual(g.progress,before);assert.ok(carriedSprinkler(g));
 g.livingPersist=()=>true;assert.equal(storeSprinkler(g,2).ok,false);assert.ok(storeSprinkler(g,1).ok);
 assert.equal(g.productionCarry,null);assert.equal(g.progress.production.sprinklerInventory,1);assert.deepEqual(g.progress.production.sprinklers.map(d=>d.id),[2]);assert.equal(storeSprinkler(g,1).ok,false);
});
