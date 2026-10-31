// 连续资源反馈只检查时序、轨迹、预算与清理；钱包封顶另由正式资源测试验证。
import test from 'node:test';
import assert from 'node:assert/strict';
import {createResourceDrop,resourcePickupPoses} from '../src/combat/resource-pickup.js';
import {RESOURCE_PICKUP} from '../src/config/resource-pickup.js';
import {updateCombatTraces} from '../src/combat/transient-effects.js';
import {WORLD} from '../src/world/coordinates.js';
import {Game,freshProgress} from '../src/game.js';

// 使用正式短时效果更新，避免依赖渲染帧数推进动画。
function scene(){return {player:{x:180,y:100},drops:[createResourceDrop({x:60,y:100},80,40)],numbers:[],shots:[],particles:[]};}

test('正式击杀与采集只入账一次，多枚动画和重复命中不会重复发奖',()=>{
 for(const kind of ['tree','enemy']){
  const g=new Game(freshProgress(),()=>.5);g.start();g.trees=[];g.enemies=[];
  const target=kind==='tree'?(g.addTree(950,760),g.trees[0]):g.spawnEnemy(0,100,{x:950,y:760},{ambient:true});
  const before={coins:g.progress.coins,wood:g.progress.wood};g.hit(target,1e6);
  const earned={coins:g.progress.coins-before.coins,wood:g.progress.wood-before.wood};
  // 当前经济规则下野怪不产币木，伐木仍应实际获得木材。
  if(kind==='tree')assert.ok(earned.wood>0);else assert.deepEqual(earned,{coins:0,wood:0});assert.equal(g.drops.length,1);
  assert.equal(g.drops[0].coins,earned.coins);assert.equal(g.drops[0].wood,earned.wood);
  const wallet={coins:g.progress.coins,wood:g.progress.wood};
  for(let i=0;i<30;i++){updateCombatTraces(g,.1);resourcePickupPoses(g.drops,g.player);}
  g.hit(target,1e6);assert.deepEqual({coins:g.progress.coins,wood:g.progress.wood},wallet);assert.equal(g.drops.length,0);
 }
});

test('金币连续发射、木材短促收束，混合批次只保留一份奖励',()=>{
 const g=scene();let elapsed=0;
 for(const target of [.3,.65,1,1.4,1.7,1.85]){
  updateCombatTraces(g,target-elapsed);elapsed=target;
  const icons=resourcePickupPoses(g.drops,g.player);
  assert.ok(icons.some(p=>p.kind==='coins'),`${target}秒缺少金币`);
  assert.equal(icons.some(p=>p.kind==='wood'),target<.6,'木材应在0.6秒内收完，金币继续播放');
  assert.equal(g.drops.length,1);assert.equal(g.drops[0].coins,80);assert.equal(g.drops[0].wood,40);
 }
 updateCombatTraces(g,1);assert.equal(g.drops.length,0);
});

test('木材不论收益大小仅用2至3枚图标，0.6秒收完且及时清理',()=>{
 for(const amount of [1,5,40,100000]){
  const g=scene();g.drops=[createResourceDrop({x:60,y:100},0,amount)];updateCombatTraces(g,.255);
  const icons=resourcePickupPoses(g.drops,g.player);assert.ok(icons.length>=2&&icons.length<=3);
  assert.equal(resourcePickupPoses(g.drops,g.player,true).length,1);
  updateCombatTraces(g,.345);assert.equal(resourcePickupPoses(g.drops,g.player).length,0);
  assert.equal(resourcePickupPoses(g.drops,g.player,true).length,0);
  updateCombatTraces(g,.11);assert.equal(g.drops.length,0);
 }
});

test('角色移动和循环边界使用最近镜像，末段收束到当前位置',()=>{
 const d=createResourceDrop({x:WORLD.width-30,y:100},1,0);d.age=.30;
 const a=resourcePickupPoses([d],{x:20,y:100}),b=resourcePickupPoses([d],{x:50,y:100});
 assert.ok(a.length);assert.ok(a.every(p=>Math.abs(p.x-20)<100));
 assert.ok(b[0].x>a[0].x,'移动后飞行终点应跟随角色');
 assert.ok(Math.hypot(b[0].x-50,b[0].y-80)<30,'末段应接近角色');
});

test('单枚图标起步即前进并加速吸入，0.3秒内接近角色且拖尾有上限',()=>{
 const d=createResourceDrop({x:0,y:20},1,0),player={x:160,y:20},samples=[];
 for(const age of [.08,.16,.24,.3]){d.age=age;const icon=resourcePickupPoses([d],player)[0];assert.ok(icon);samples.push(icon);}
 assert.ok(samples[0].x>20,'起步不应长时间悬浮');
 assert.ok(samples[2].x-samples[1].x>samples[1].x-samples[0].x,'中段应继续加速');
 assert.ok(Math.hypot(samples[3].x-player.x,samples[3].y-(player.y-20))<20,'0.3秒应已靠近身体');
 for(const p of samples)assert.ok(Math.hypot(p.tailX-p.x,p.tailY-p.y)<=18.001);
 d.age=.3;const reduced=resourcePickupPoses([d],player,true)[0];
 assert.equal(reduced.tailX,reduced.x);assert.equal(reduced.tailY,reduced.y);
});

test('满仓种类不显示，减少动态降低密度，密集奖励有绘制上限',()=>{
 const d=createResourceDrop({x:0,y:0},0,20);d.age=.3;
 const player={x:120,y:0},normal=resourcePickupPoses([d],player),reduced=resourcePickupPoses([d],player,true);
 assert.ok(normal.length>reduced.length);assert.ok(normal.every(p=>p.kind==='wood'));
 assert.equal(resourcePickupPoses([createResourceDrop(player,0,0)],player).length,0);
 assert.equal(resourcePickupPoses(Array.from({length:1000},()=>({...d})),player).length,RESOURCE_PICKUP.drawLimit);
});

test('动画只随逻辑时间推进，重复绘制不消耗状态，分帧清理一致',()=>{
 const a=scene(),b=scene();updateCombatTraces(a,.8);for(let i=0;i<8;i++)updateCombatTraces(b,.1);
 const one=resourcePickupPoses(a.drops,a.player),two=resourcePickupPoses(b.drops,b.player);
 assert.equal(one.length,two.length);one.forEach((p,i)=>assert.ok(Math.abs(p.x-two[i].x)<1e-8));
 const before=JSON.stringify(a);assert.deepEqual(resourcePickupPoses(a.drops,a.player),one);assert.equal(JSON.stringify(a),before);
});
