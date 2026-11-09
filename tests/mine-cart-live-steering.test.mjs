// 实时驾驶输入在连接点选路的专项回归，沿用正式矿车循环。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {MINING as M,minePoint,mineKey} from '../src/config/mining.js';
import {freshMining,normalizeMining,openBasement} from '../src/progression/mining/mining.js';
import {railExits,nextCartExit} from '../src/config/mine-rail-routes.js';
import {enterMine,rideMineCart,toggleMineCart,updateMining} from '../src/core/mining/mining.js';
import {nearbyJunction,setMineCartDirection,setMineJunctionDirection,stoppedCartChoices} from '../src/core/mining/mine-cart-directions.js';
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

// 把已乘坐的矿车放到路口西侧，以固定时间步检验真实抵达和转弯。
function approach(g){
 rideMineCart(g);Object.assign(cart(g),{...minePoint({x:-1,y:0}),heading:1,departure:null,from:null,target:null});
 Object.assign(g.player,cart(g));toggleMineCart(g);
}
// 固定方向连续推进，不经过停车选向接口。
function steer(g,n,input){for(let i=0;i<n;i++)updateMining(g,.05,input);}
test('十字路口实时方向覆盖路口设置和停车预选，但不修改持久规则',()=>{
 const g=setup();g.progress.mining.junctions['0,0']=2;rideMineCart(g);setMineCartDirection(g,1);toggleMineCart(g);
 steer(g,1,{x:0,y:-1});assert.equal(cart(g).heading,0);assert.ok(cart(g).y<M.home.y);assert.equal(cart(g).x,M.home.x);assert.equal(g.progress.mining.junctions['0,0'],2);assert.equal(g.cottage.running,true);assert.match(g.cottage.notice,/行驶中/);
});
test('提前按住北向，先沿原轨到格心再转北，不跨格斜行',()=>{
 const g=setup();approach(g);steer(g,4,{x:0,y:-1});
 assert.equal(cart(g).y,M.home.y);assert.ok(cart(g).x<M.home.x);assert.equal(cart(g).heading,1);
 steer(g,6,{x:0,y:-1});assert.equal(cart(g).x,M.home.x);assert.ok(cart(g).y<M.home.y);assert.equal(cart(g).heading,0);
});
test('松开未到达路口的输入立即取消，仍使用已保存的南向路口',()=>{
 const g=setup();g.progress.mining.junctions['0,0']=2;approach(g);
 steer(g,3,{x:0,y:-1});steer(g,7,{x:0,y:0});assert.equal(cart(g).heading,2);assert.ok(cart(g).y>M.home.y);
});
test('没有输入、死区和无轨方向沿原规则选路，三岔仍能选有效出口',()=>{
 for(const input of [{x:0,y:0},{x:.1,y:.1},{x:0,y:-1}]){
  const g=setup();delete g.progress.mining.rails['0,-1'];approach(g);steer(g,10,input);
  assert.equal(cart(g).heading,1);assert.ok(cart(g).x>M.home.x);assert.equal(cart(g).y,M.home.y);
 }
 const g=setup();delete g.progress.mining.rails['0,-1'];approach(g);steer(g,10,{x:0,y:1});assert.equal(cart(g).heading,2);
});
test('轨段中反向不瞬移，到下个连接点才掉头，持续输入不反复写档',()=>{
 const g=setup();rideMineCart(g);toggleMineCart(g);tick(g,3);const x=cart(g).x;let saves=0;g.livingPersist=()=>{saves++;return true;};
 steer(g,1,{x:-1,y:0});assert.ok(cart(g).x>x);assert.equal(cart(g).heading,1);
 steer(g,6,{x:-1,y:0});assert.equal(cart(g).heading,3);assert.ok(cart(g).x<M.home.x+64);assert.equal(saves,0);
});
test('暂停不处理实时输入，恢复后的中立输入不会沿用旧方向',()=>{
 const g=setup();approach(g);g.state='paused';const before=structuredClone(cart(g));steer(g,20,{x:0,y:-1});assert.deepEqual(cart(g),before);
 g.state='playing';steer(g,10,{x:0,y:0});assert.equal(cart(g).heading,1);
});
test('手动选路仍执行前车碰撞保护，停车后保存的车位可正常重读',()=>{
 const g=setup();g.progress.mining.carts.push({id:2,x:M.home.x,y:M.home.y-50,heading:0,wheel:0});
 rideMineCart(g);toggleMineCart(g);steer(g,8,{x:0,y:-1});assert.equal(g.cottage.running,false);assert.ok(cart(g).y>M.home.y-13);
 const p={x:cart(g).x,y:cart(g).y};g.progress.mining=normalizeMining(g.progress.mining);assert.deepEqual({x:cart(g).x,y:cart(g).y},p);
});
