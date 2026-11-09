// 容量不足只影响收纳，开采仍可完成；自动装车守恒、原子且不反复写盘。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {openBasement} from '../src/progression/mining/mining.js';
import {freshMineLayer} from '../src/progression/mining/mine-layers.js';
import {minePoint,mineKey} from '../src/config/mining.js';
import {mineCellArea,mineTerrain} from '../src/config/mine-ecology.js';
import {oreCount,ORE_KEYS,MINE_FREIGHT_LOADING,CART_CAPACITY} from '../src/config/mine-freight.js';
import {catLoad} from '../src/progression/inventory/load-weight.js';
import {WOOD_ITEM} from '../src/config/wood-storage.js';
import {mineFreightReward,autoLoadMineFreight} from '../src/core/mining/mine-transactions.js';
import {updateMining,selectMineTool} from '../src/core/mining/mining.js';
// 远离升井且有足够已开掘空间，直接走正式背包重量和货运保存。
function scene(){
 const p=freshProgress();p.homeDecor.basement=true;openBasement(p.mining);p.mining.seed=1847;
 const g=new Game(p,()=>.5);g.state='playing';g.vehicle.active=false;g.livingPersist=()=>true;g.mainlineSpeech=null;
 g.cottage={kind:'mine',depth:1,direction:1,ride:null,scanWait:99999,hurtWait:99999,attackWait:99999};Object.assign(g.player,minePoint({x:20,y:20}));
 for(let x=16;x<=25;x++)for(let y=16;y<=24;y++){const k=mineKey({x,y});g.progress.mining.dug[k]=g.progress.mining.bridges[k]=true;}
 g.progress.mining.carts=[];return g;
}
// 填入真实木材，余量处于指定重量到额外一份木材之间，可验证半千克矿物边界。
function bagRoom(g,kg){const l=catLoad(g);g.progress.logistics.bagWood+=Math.max(0,Math.floor((l.capacity-l.weight-kg)/WOOD_ITEM.mass+1e-6));}
// 正式开采回调，与矿物收纳同笔事务开通矿格并记录采矿量。
function reward(g,amount,cell={x:21,y:20}){return mineFreightReward(g,amount,(m,p,l)=>{l.dug[mineKey(cell)]=true;p.production.minedOre+=amount;},'挖通矿道',{cell});}
// 矿车停在玩家侧方，不进入一秒自动上车的小范围。
function cart(g,id,cargo={},offset=100,leader=null){const c={id,x:g.player.x+offset,y:g.player.y,wheel:0,cargo,leader};g.progress.mining.carts.push(c);return c;}

test('矿车满后转放背包，有余量的背包不阻止整批开采',()=>{
 const g=scene();cart(g,1,{stone:CART_CAPACITY});const before=catLoad(g).weight;assert.ok(reward(g,4).ok);assert.equal(oreCount(g.progress.mining.bagOre),4);assert.equal(oreCount(g.progress.mining.carts[0].cargo),CART_CAPACITY);assert.equal(catLoad(g).weight,before+2);assert.match(g.cottage.notice,/背包收纳 4 份/);
});
test('矿车和背包按剩余容量分批收纳，超出的矿物不入库也不超重',()=>{
 const g=scene();cart(g,1,{iron:(CART_CAPACITY-1)});bagRoom(g,1);assert.ok(reward(g,6).ok);assert.equal(oreCount(g.progress.mining.carts[0].cargo),CART_CAPACITY);assert.equal(oreCount(g.progress.mining.bagOre),2);assert.ok(catLoad(g).weight<=catLoad(g).capacity);assert.match(g.cottage.notice,/3 份未收纳/);assert.equal(g.progress.production.minedOre,6);
});
test('背包余量不足一份时不塞入矿物，恰有半千克余量可以装一份',()=>{
 for(const [space,expected] of [[.25,0],[.5,1]]){const g=scene();bagRoom(g,space);assert.ok(reward(g,3).ok);assert.equal(oreCount(g.progress.mining.bagOre),expected);assert.ok(catLoad(g).weight<=catLoad(g).capacity);assert.equal(g.progress.production.minedOre,3);}
});
test('两边都满仍可连续开采，现有背包、车厢和仓库数量不变',()=>{
 for(const withCart of [false,true]){const g=scene();if(withCart)cart(g,1,{rareMetal:CART_CAPACITY});g.progress.mining.bagOre={copper:2};bagRoom(g,0);const before=structuredClone(g.progress);
  assert.ok(reward(g,4).ok);assert.ok(reward(g,3,{x:22,y:20}).ok);assert.deepEqual(g.progress.mining.bagOre,before.mining.bagOre);assert.deepEqual(g.progress.mining.carts,before.mining.carts);assert.equal(g.progress.mining.ore,before.mining.ore);assert.deepEqual(g.progress.industry.raw,before.industry.raw);assert.equal(g.progress.production.minedOre,7);assert.match(g.cottage.notice,/未收纳，可继续挖掘/);
 }
});
test('保存失败不会挖开矿格或分装部分货物，重试只结算一次',()=>{
 const g=scene();cart(g,1,{stone:(CART_CAPACITY-1)});bagRoom(g,.5);delete g.progress.mining.dug['21,20'];const before=structuredClone(g.progress);g.livingPersist=()=>false;assert.equal(reward(g,4).ok,false);assert.deepEqual(g.progress,before);
 g.livingPersist=()=>true;assert.ok(reward(g,4).ok);assert.equal(g.progress.mining.dug['21,20'],true);assert.equal(g.progress.production.minedOre,4);assert.equal(oreCount(g.progress.mining.bagOre),1);assert.equal(oreCount(g.progress.mining.carts[0].cargo),CART_CAPACITY);
});
test('背包四矿种自动装入同层整列，远端挂车可接矿，其他层和独立远车不变',()=>{
 const g=scene();cart(g,1,{stone:CART_CAPACITY-2});cart(g,2,{},250,1);cart(g,3,{},500);g.progress.mining.bagOre={stone:3,copper:2,iron:2,rareMetal:2};g.progress.mining.layers[2]=freshMineLayer(2,{x:20,y:20},()=>.5);g.progress.mining.layers[2].carts=[{id:1,x:g.player.x,y:g.player.y,cargo:{}}];
 const before=structuredClone(g.progress.mining.layers[2]);let saves=0;g.livingPersist=()=>{saves++;return true;};assert.equal(autoLoadMineFreight(g),true);assert.equal(saves,1);assert.deepEqual(g.progress.mining.bagOre,{});assert.equal(oreCount(g.progress.mining.carts[0].cargo),CART_CAPACITY);assert.equal(oreCount(g.progress.mining.carts[1].cargo),7);assert.deepEqual(g.progress.mining.carts[2].cargo,{});assert.deepEqual(g.progress.mining.layers[2],before);
 for(const key of ORE_KEYS)assert.equal(g.progress.mining.carts.reduce((n,c)=>n+(c.cargo[key]||0),0),({stone:CART_CAPACITY+1,copper:2,iron:2,rareMetal:2})[key]);
 for(let n=0;n<30;n++){g.time+=.05;autoLoadMineFreight(g);}assert.equal(saves,1);
});
test('自动装车只搬实际余量，剩余保留背包，满车或范围外不会写盘',()=>{
 const g=scene();cart(g,1,{copper:(CART_CAPACITY-1)});g.progress.mining.bagOre={stone:2,iron:2};let saves=0;g.livingPersist=()=>{saves++;return true;};assert.equal(autoLoadMineFreight(g),true);assert.deepEqual(g.progress.mining.bagOre,{stone:1,iron:2});
 for(let n=0;n<60;n++){g.time+=.05;autoLoadMineFreight(g);}assert.equal(saves,1);g.progress.mining.carts[0].cargo={};g.player.x-=MINE_FREIGHT_LOADING.radius+100;g.time+=1;assert.equal(autoLoadMineFreight(g),false);assert.equal(saves,1);
});
test('自动装车保存失败完整保留，限频重试，暂停不转移且换层不继承旧重试锁',()=>{
 const g=scene();cart(g,1);g.progress.mining.bagOre={rareMetal:5};const before=structuredClone(g.progress);let saves=0;g.livingPersist=()=>{saves++;return false;};assert.equal(autoLoadMineFreight(g),false);
 for(let n=0;n<30;n++){g.time+=.05;autoLoadMineFreight(g);}assert.equal(saves,1);assert.deepEqual(g.progress,before);g.state='paused';g.time+=5;assert.equal(autoLoadMineFreight(g),false);assert.equal(saves,1);
 g.state='playing';g.livingPersist=()=>true;g.progress.mining.layers[2]=freshMineLayer(2,{x:20,y:20},()=>.5);g.progress.mining.layers[2].carts=[{id:1,x:g.player.x,y:g.player.y,cargo:{}}];g.cottage.depth=2;assert.equal(autoLoadMineFreight(g),true);assert.deepEqual(g.progress.mining.layers[2].carts[0].cargo,{rareMetal:5});assert.deepEqual(g.progress.mining.carts[0].cargo,{});assert.deepEqual(validateProgress(g.progress).mining.bagOre,{});
});
test('正式地下循环靠近后搬运，暂停冻结，空背包后不连续保存',()=>{
 const g=scene();cart(g,1);g.progress.mining.bagOre={iron:4};let saves=0;g.livingPersist=()=>{saves++;return true;};g.state='paused';updateMining(g,.05,{x:0,y:0});assert.equal(saves,0);g.state='playing';updateMining(g,.05,{x:0,y:0});assert.deepEqual(g.progress.mining.carts[0].cargo,{iron:4});assert.deepEqual(g.progress.mining.bagOre,{});for(let n=0;n<20;n++)updateMining(g,.05,{x:0,y:0});assert.equal(saves,1);
});
test('满载时正式矿镐继续挖开真实岩壁，不因容量关闭作业',()=>{
 const g=scene(),l=g.progress.mining;let target;
 for(let y=5;y<60&&!target;y++)for(let x=5;x<60&&!target;x++){const cell={x,y};if(!mineTerrain(cell,l).natural&&mineCellArea(cell,l)>0&&!mineTerrain({x:x-1,y},l).water)target=cell;}
 assert.ok(target);const from={x:target.x-1,y:target.y};delete l.dug[mineKey(target)];l.dug[mineKey(from)]=true;l.bridges[mineKey(from)]=true;Object.assign(g.player,minePoint(from));cart(g,1,{stone:CART_CAPACITY},-100);bagRoom(g,0);selectMineTool(g,'pick');
 const bag=structuredClone(g.progress.mining.bagOre),raw=structuredClone(g.progress.industry.raw);for(let n=0;n<50&&!g.progress.mining.dug[mineKey(target)];n++)updateMining(g,.05,{x:1,y:0});
 assert.equal(g.progress.mining.dug[mineKey(target)],true);assert.equal(g.cottage.tool,'pick');assert.equal(g.cottage.autoDig,true);assert.deepEqual(g.progress.mining.bagOre,bag);assert.deepEqual(g.progress.industry.raw,raw);assert.equal(oreCount(g.progress.mining.carts[0].cargo),CART_CAPACITY);assert.match(g.cottage.notice,/未收纳/);
});
