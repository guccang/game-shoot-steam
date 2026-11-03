// 针对正式矿车循环、持久路口及事务失败的专项回归，不运行全量测试。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {MINING as M,minePoint,mineKey} from '../src/config/mining.js';
import {freshMining,normalizeMining,openBasement} from '../src/progression/mining.js';
import {railExits,nextCartExit} from '../src/config/mine-rail-routes.js';
import {enterMine,rideMineCart,toggleMineCart,updateMining} from '../src/core/mining.js';
import {nearbyJunction,setMineCartDirection,setMineJunctionDirection,stoppedCartChoices} from '../src/core/mine-cart-directions.js';
// 构造隔离十字轨道，外部进度完成入职，不改用户存档。
function setup(){
 const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.homeDecor.basement=true;openBasement(p.mining);
 for(let i=-4;i<=4;i++)for(const cell of [{x:i,y:0},{x:0,y:i}]){const k=mineKey(cell);p.mining.dug[k]=true;p.mining.bridges[k]=true;p.mining.rails[k]=true;}
 p.mining.carts=[{id:1,...M.home,heading:1,departure:null,previous:null,wheel:0}];
 const g=new Game(p,()=>.5);g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.livingPersist=()=>true;g.cottage={kind:'cottage',floor:0,outside:M.home};Object.assign(g.player,M.hatch.goal);assert.ok(enterMine(g));g.cottage.scanWait=999;return g;
}
// 固定步长经过正式循环，距离与轮毂相位由游戏计算。
function tick(g,n){for(let i=0;i<n;i++)updateMining(g,.05,{x:0,y:0});}
// 获取事务后替换的新车对象，避免断言引用旧存档。
function cart(g){return g.progress.mining.carts[0];}
test('默认十字路口直行，三岔右转优先，其次左转，末端折返',()=>{
 const g=setup(),l=g.progress.mining,c=cart(g);c.heading=1;c.previous='-1,0';
 assert.equal(nextCartExit(l,c).i,1);delete l.rails['1,0'];assert.equal(nextCartExit(l,c).i,2);delete l.rails['0,1'];assert.equal(nextCartExit(l,c).i,0);delete l.rails['0,-1'];assert.equal(nextCartExit(l,c).i,3);
});
test('停车在格心可选北和反向，保持停车且起步真实沿所选轨道',()=>{
 const g=setup();rideMineCart(g);assert.equal(stoppedCartChoices(g).length,4);
 assert.ok(setMineCartDirection(g,0).ok);assert.equal(g.cottage.running,false);toggleMineCart(g);tick(g,2);assert.ok(g.player.y<M.home.y);assert.equal(g.player.x,M.home.x);
 toggleMineCart(g);const p={x:cart(g).x,y:cart(g).y},wheel=cart(g).wheel;
 assert.ok(setMineCartDirection(g,2).ok);assert.deepEqual({x:cart(g).x,y:cart(g).y},p);assert.equal(cart(g).wheel,wheel);toggleMineCart(g);tick(g,1);assert.ok(g.player.y>p.y);
});
test('轨段两边均可掉头，不因跨过半格或刷新而瞬移',()=>{
 for(const ticks of [2,5]){
  const g=setup();rideMineCart(g);setMineCartDirection(g,1);toggleMineCart(g);tick(g,ticks);toggleMineCart(g);
  const x=cart(g).x;assert.ok(setMineCartDirection(g,3).ok);assert.equal(cart(g).x,x);
  assert.deepEqual(stoppedCartChoices(g).map(n=>n.i).sort(),[1,3]);assert.equal(setMineCartDirection(g,0).ok,false);
  g.progress.mining=normalizeMining(g.progress.mining);assert.equal(cart(g).x,x);assert.equal(cart(g).heading,3);toggleMineCart(g);tick(g,1);assert.ok(cart(g).x<x);
 }
});
test('行驶时禁止改向，暂停和保存失败不污染选向或路口',()=>{
 const g=setup();assert.ok(setMineJunctionDirection(g,'0,0',0).ok);g.livingPersist=()=>false;const before=structuredClone(g.progress);
 assert.equal(setMineJunctionDirection(g,'0,0',2).ok,false);assert.deepEqual(g.progress,before);g.livingPersist=()=>true;rideMineCart(g);
 const stopped=structuredClone(cart(g));g.livingPersist=()=>{throw Error('失败');};assert.equal(setMineCartDirection(g,3).ok,false);assert.deepEqual(cart(g),stopped);
 g.livingPersist=()=>true;toggleMineCart(g);assert.equal(setMineCartDirection(g,3).ok,false);g.state='paused';const frozen=structuredClone(cart(g));tick(g,20);assert.deepEqual(cart(g),frozen);
});
test('下车近处设置持久路口，多次驶入均服从方向，包括反向来车',()=>{
 const g=setup();assert.equal(nearbyJunction(g),'0,0');assert.ok(setMineJunctionDirection(g,'0,0',0).ok);
 for(const heading of [0,1,2,3]){
  g.progress.mining=normalizeMining(g.progress.mining);const c=cart(g);Object.assign(c,M.home,{heading,target:null,departure:null});
  assert.ok(rideMineCart(g));toggleMineCart(g);tick(g,1);assert.ok(cart(g).y<M.home.y);rideMineCart(g);
  Object.assign(g.player,M.home);
 }
 assert.ok(setMineJunctionDirection(g,'0,0',null).ok);assert.deepEqual(g.progress.mining.junctions,{});
});
test('停车显式选择只覆盖一次起步，不修改路口设置',()=>{
 const g=setup();setMineJunctionDirection(g,'0,0',0);rideMineCart(g);setMineCartDirection(g,1);g.progress.mining=normalizeMining(g.progress.mining);assert.equal(cart(g).departure,1);toggleMineCart(g);tick(g,1);
 assert.ok(cart(g).x>M.home.x);assert.equal(cart(g).departure,null);assert.equal(g.progress.mining.junctions['0,0'],0);
});
test('远处、在车上、两出口和无轨方向均不能设置路口',()=>{
 const g=setup();Object.assign(g.player,minePoint({x:2,y:0}));assert.equal(nearbyJunction(g),null);assert.equal(setMineJunctionDirection(g,'0,0',1).ok,false);
 Object.assign(g.player,M.home);rideMineCart(g);assert.equal(setMineJunctionDirection(g,'0,0',1).ok,false);rideMineCart(g);
 delete g.progress.mining.rails['0,-1'];assert.equal(setMineJunctionDirection(g,'0,0',0).ok,false);delete g.progress.mining.rails['0,1'];assert.equal(setMineJunctionDirection(g,'0,0',1).ok,false);
});
test('层间路口隔离，旧档自动默认，损坏设置和轨段被清理',()=>{
 const g=setup();setMineJunctionDirection(g,'0,0',0);const m=g.progress.mining;m.layers[2]={...structuredClone(m),layers:{},junctions:{}};g.cottage.depth=2;assert.ok(setMineJunctionDirection(g,'0,0',2).ok);
 assert.equal(g.progress.mining.junctions['0,0'],0);assert.equal(g.progress.mining.layers[2].junctions['0,0'],2);
 const restored=normalizeMining(g.progress.mining);assert.equal(restored.layers[2].junctions['0,0'],2);
 const legacy=structuredClone(g.progress.mining);delete legacy.junctions;assert.deepEqual(normalizeMining(legacy).junctions,{});
 legacy.junctions={'0,0':99,'1,0':1,'bad':0};legacy.carts[0].from='0,0';legacy.carts[0].target='4,0';legacy.carts[0].heading=99;
 const cleaned=normalizeMining(legacy);assert.deepEqual(cleaned.junctions,{});assert.equal(cleaned.carts[0].target,null);assert.equal(cleaned.carts[0].heading,1);assert.deepEqual(freshMining().junctions,{});
 legacy.carts[0].from=['0,0'];legacy.carts[0].target=['1,0'];assert.equal(normalizeMining(legacy).carts[0].target,null);
});
test('选向后遇其他矿车仍安全停车，不能穿车或离轨',()=>{
 const g=setup();g.progress.mining.carts.push({id:2,x:M.home.x-50,y:M.home.y,wheel:0});rideMineCart(g);setMineCartDirection(g,3);toggleMineCart(g);tick(g,10);
 assert.equal(g.cottage.running,false);assert.ok(cart(g).x>M.home.x-13);assert.equal(cart(g).y,M.home.y);
});
