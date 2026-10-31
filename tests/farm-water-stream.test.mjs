// 浇水表现回归：左右壶嘴、水流切线、落地、动作连续性和真实站位共同约束。
import test from 'node:test';
import assert from 'node:assert/strict';
import {wateringPose,wateringDrop} from '../src/rendering/farm-water-tool.js';
import {farmApproach} from '../src/world/farm-land.js';

test('左右及斜上方站位的水滴从壶口向下出流，最终落在选中田块',()=>{
 const target={x:1700,y:1600};
 for(const [dx,dy] of [[-54,6],[54,6],[-42,-36],[42,-36]])for(const t of [.18,.3,.55,.78])for(const drift of [-4,0,4]){
  const player={x:target.x+dx,y:target.y+dy+drift},pose=wateringPose(player,target,t),{mouth,direction,hand,angle,facing}=pose;
  assert.ok(pose.pouring&&direction.y>0&&mouth.y<target.y);
  assert.ok(Math.abs(mouth.x-(hand.x+facing*(25.5*Math.cos(angle)+7.5*Math.sin(angle))))<1e-8);
  const first=wateringDrop(mouth,target,direction,0),next=wateringDrop(mouth,target,direction,1e-6);
  assert.equal(first.x,mouth.x);assert.equal(first.y,mouth.y);
  assert.ok(Math.abs((next.y-first.y)/(next.x-first.x)-direction.y/direction.x)<.001);
  let previous=mouth.y;for(let i=1;i<=100;i++){const p=wateringDrop(mouth,target,direction,i/100);assert.ok(p.y>previous);previous=p.y;}
  const end=wateringDrop(mouth,target,direction,1);assert.equal(end.x,target.x);assert.equal(end.y,target.y);
 }
});
test('提壶和收壶连续，出水窗口外不喷水，不生成向上的替代水流',()=>{
 const player={x:100,y:100},target={x:154,y:94};
 for(const t of [.18,.78]){const a=wateringPose(player,target,t-1e-7),b=wateringPose(player,target,t+1e-7);assert.ok(Math.hypot(a.mouth.x-b.mouth.x,a.mouth.y-b.mouth.y)<1e-5);}
 const idle=wateringPose(player,target,0),end=wateringPose(player,target,.95);assert.deepEqual(end,idle);
 assert.equal(wateringPose(player,target,.1).pouring,false);assert.equal(wateringPose(player,target,.85).pouring,false);
 assert.equal(wateringDrop({x:0,y:10},{x:0,y:0},{x:1,y:1},.5),null);
});
test('从田块下方接到浇水操作时走向安全侧边，其他农活保留原站位',()=>{
 const point={x:1700,y:1600},game={player:{x:1700,y:1662},mapId:'forest',trees:[]};
 const water=farmApproach(game,point,'water'),dig=farmApproach(game,point,'dig');
 assert.ok(water);assert.ok(water.y<=point.y+6);assert.deepEqual(dig,{x:1700,y:1662});
});
