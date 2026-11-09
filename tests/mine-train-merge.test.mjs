// 两列已编组矿车从任意首尾合并，覆盖实际停车、驾驶、货物与持久化。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {openBasement,normalizeMining} from '../src/progression/mining/mining.js';
import {minePoint,mineKey} from '../src/config/mining.js';
import {coupleMineCart,mineTrain,mineCartCanDrive} from '../src/core/mining/mine-train.js';
import {toggleMineCart,updateMining,rideMineCart,updateMineCartBoarding} from '../src/core/mining/mining.js';
import {setMineCartDirection,stoppedCartChoices} from '../src/core/mining/mine-cart-directions.js';
// 使用完整游戏对象与独立轨网，七辆车各自携带可核对的货物。
function setup(front=true,otherFront=true,curve=false){
 const p=freshProgress();openBasement(p.mining);const l=p.mining;
 for(let y=-1;y<=3;y++)for(let x=-12;x<=15;x++){const k=mineKey({x,y});l.dug[k]=l.rails[k]=l.bridges[k]=true;}
 const a=[{x:-2,y:0},{x:-1,y:0},{x:0,y:0}],b=curve?[{x:0,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:2}]:[1,2,3,4].map(x=>({x,y:0}));
 if(front)a.reverse();if(!otherFront)b.reverse();
 l.carts=[...a,...b].map((cell,i)=>({id:i+1,...minePoint(cell),leader:i===0||i===3?null:i,wheel:0,heading:front?1:3,cargo:{iron:i+1},lubrication:i+1}));l.nextCart=8;
 const g=new Game(p,()=>.5);g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.livingPersist=()=>true;
 g.cottage={kind:'mine',depth:1,ride:1,running:false,direction:front?1:3,scanWait:99999,hurtWait:999,attackWait:999,outside:minePoint({x:0,y:0})};Object.assign(g.player,l.carts[0]);g.player.hp=120;return g;
}
// 经过正式矿区更新，不直接挪动车厢来伪造跟车结果。
function tick(g,n){for(let i=0;i<n;i++)updateMining(g,.05,{x:0,y:0});}
// 读取事务产生的新车辆对象，校验合并后的链条无丢车或分叉。
function train(g){const l=g.progress.mining;return mineTrain(l,l.carts.find(c=>c.id===g.cottage.ride));}
// 用户自行下车并走到端部登乘，不依靠挂接操作换座。
function boardEnd(g,index=0){const target=train(g).at(index);assert.ok(rideMineCart(g));Object.assign(g.player,{x:target.x,y:target.y});assert.ok(rideMineCart(g,target.id));}
for(const front of [true,false])for(const otherFront of [true,false])test(`3+4首尾挂接：本列${front?'首':'尾'}端、对方${otherFront?'首':'尾'}端，完整合并并继续行驶`,()=>{
 const g=setup(front,otherFront),before=structuredClone(g.progress.mining.carts);const result=coupleMineCart(g);assert.ok(result.ok);assert.match(result.message,/7 辆/);
 assert.equal(train(g).length,7);assert.equal(g.cottage.ride,1);assert.equal(g.cottage.direction,front?1:3);assert.equal(g.player.x,before[0].x);assert.equal(g.player.y,before[0].y);tick(g,2);assert.equal(g.player.x,before[0].x);assert.equal(g.player.y,before[0].y);
 assert.deepEqual(g.progress.mining.carts.map(c=>({id:c.id,x:c.x,y:c.y,cargo:c.cargo,lubrication:c.lubrication})),before.map(c=>({id:c.id,x:c.x,y:c.y,cargo:c.cargo,lubrication:c.lubrication})));
 const normalized=normalizeMining(g.progress.mining);assert.deepEqual(mineTrain(normalized,normalized.carts.find(c=>c.id===g.cottage.ride)).map(c=>c.id),train(g).map(c=>c.id));
 boardEnd(g);const oldX=train(g)[0].x;toggleMineCart(g);tick(g,10);assert.ok(train(g)[0].x<oldX-64);assert.equal(g.cottage.running,true);
 for(let i=1;i<7;i++)assert.ok(Math.abs(train(g)[i].x-train(g)[i-1].x-64)<.001);assert.equal(g.player.x,train(g)[0].x);
});
test('两组已挂接矿车迎面靠近自动停车后，可直接合成七辆并驶离',()=>{
 const g=setup();toggleMineCart(g);tick(g,8);assert.equal(g.cottage.running,false);assert.ok(train(g)[0].target);
 const position={x:g.player.x,y:g.player.y};assert.ok(coupleMineCart(g).ok);assert.equal(train(g).length,7);assert.deepEqual({x:g.player.x,y:g.player.y},position);tick(g,3);assert.deepEqual({x:g.player.x,y:g.player.y},position);boardEnd(g);toggleMineCart(g);tick(g,12);assert.equal(g.cottage.running,true);assert.equal(train(g).length,7);
});
test('合并保存失败不改变两组车、货物、驾驶端及玩家位置，重试和解挂均正常',()=>{
 const g=setup(),before=structuredClone(g.progress),position={x:g.player.x,y:g.player.y};
 for(const persist of [()=>false,()=>{throw Error('模拟保存失败');}]){g.livingPersist=persist;assert.equal(coupleMineCart(g).ok,false);assert.deepEqual(g.progress,before);assert.equal(g.cottage.ride,1);assert.deepEqual({x:g.player.x,y:g.player.y},position);}
 g.livingPersist=()=>true;assert.ok(coupleMineCart(g).ok);assert.equal(train(g).length,7);const merged=structuredClone(g.progress.mining.carts);
 assert.equal(coupleMineCart(g).ok,false);assert.deepEqual(g.progress.mining.carts,merged);
 assert.ok(coupleMineCart(g,true).ok);assert.ok(g.progress.mining.carts.every(c=>!c.leader));assert.deepEqual(g.progress.mining.carts.map(c=>c.cargo),before.mining.carts.map(c=>c.cargo));
});
test('弯轨两列可合并，七辆车沿原轨段跟随而非穿过弯角',()=>{
 const g=setup(true,true,true);assert.ok(coupleMineCart(g).ok);assert.equal(train(g).length,7);boardEnd(g);const before=train(g).map(c=>({x:c.x,y:c.y}));toggleMineCart(g);tick(g,1);
 const cars=train(g);assert.ok(cars[3].y<before[3].y&&cars[3].x===before[3].x);assert.ok(cars[6].x<before[6].x&&cars[6].y===before[6].y);
 assert.equal(new Set(cars.map(c=>`${c.x},${c.y}`)).size,7);
});
test('中间车厢可手动或候停登乘，不翻转编组，按钮与方向输入都不能开车',()=>{
 for(const automatic of [false,true]){const g=setup();g.progress.mining.carts=g.progress.mining.carts.slice(0,3);rideMineCart(g);const seat=g.progress.mining.carts[1],before=structuredClone(g.progress.mining.carts);Object.assign(g.player,{x:seat.x,y:seat.y});
  if(automatic)for(let n=0;n<21;n++)updateMineCartBoarding(g,.05);else assert.ok(rideMineCart(g,seat.id));
  assert.equal(g.cottage.ride,2);assert.equal(mineCartCanDrive(g),false);assert.deepEqual(g.progress.mining.carts,before);assert.equal(train(g).length,3);assert.equal(toggleMineCart(g),false);assert.equal(setMineCartDirection(g,3).ok,false);assert.deepEqual(stoppedCartChoices(g),[]);
  const position={x:g.player.x,y:g.player.y};for(let n=0;n<10;n++)updateMining(g,.05,{x:-1,y:0});assert.equal(g.cottage.running,false);assert.deepEqual({x:g.player.x,y:g.player.y},position);assert.deepEqual(g.progress.mining.carts,before);
 }
});
test('车头和车尾都能开车，尾端换向只改挂钩和轨段，不改乘员位置',()=>{
 for(const end of [0,-1]){const g=setup();g.progress.mining.carts=g.progress.mining.carts.slice(0,3);boardEnd(g,end);const seat=g.progress.mining.carts.find(c=>c.id===g.cottage.ride),position={x:g.player.x,y:g.player.y};assert.equal(mineCartCanDrive(g),true);assert.equal(seat.leader,null);assert.ok(toggleMineCart(g));assert.deepEqual({x:g.player.x,y:g.player.y},position);tick(g,2);assert.equal(g.cottage.running,true);assert.ok(Math.hypot(g.player.x-position.x,g.player.y-position.y)>0);}
});
test('尾车已就座时直接开车也会成为驾驶端，保存失败不翻转或启动',()=>{
 const g=setup();g.progress.mining.carts=g.progress.mining.carts.slice(0,3);g.cottage.ride=3;Object.assign(g.player,{x:g.progress.mining.carts[2].x,y:g.progress.mining.carts[2].y});const before=structuredClone(g.progress),position={x:g.player.x,y:g.player.y};g.livingPersist=()=>false;
 assert.equal(toggleMineCart(g),false);assert.deepEqual(g.progress,before);assert.equal(g.cottage.running,false);g.livingPersist=()=>true;assert.equal(toggleMineCart(g),true);assert.equal(train(g)[0].id,3);assert.deepEqual({x:g.player.x,y:g.player.y},position);
});
test('断轨、第三列占位及行驶状态不允许强行合并',()=>{
 for(const mode of ['断轨','占位','行驶']){const g=setup();if(mode==='断轨')delete g.progress.mining.rails['1,0'];if(mode==='占位')g.progress.mining.carts.push({id:8,...minePoint({x:0,y:0}),leader:null,wheel:0});if(mode==='行驶')g.cottage.running=true;
 const before=structuredClone(g.progress.mining.carts);assert.equal(coupleMineCart(g).ok,false,mode);assert.deepEqual(g.progress.mining.carts,before);}
});
test('深层整列合并只改变当前层，重载仍保留七辆及货物',()=>{
 const g=setup();g.progress.mining.layers[2]={...structuredClone(g.progress.mining),layers:{}};g.cottage.depth=2;const surface=structuredClone(g.progress.mining.carts);
 assert.ok(coupleMineCart(g).ok);assert.deepEqual(g.progress.mining.carts,surface);const restored=normalizeMining(g.progress.mining),l=restored.layers[2];assert.equal(mineTrain(l,l.carts.find(c=>c.id===g.cottage.ride)).length,7);assert.deepEqual(l.carts.map(c=>c.cargo),surface.map(c=>c.cargo));
});
