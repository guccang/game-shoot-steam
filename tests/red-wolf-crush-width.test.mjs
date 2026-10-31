// 红狼完整接地矩形的方向、边界与零收益回归。
import test from 'node:test';
import assert from 'node:assert/strict';
import {RED_WOLF_HULL as hull} from '../src/config/red-wolf-geometry.js';
import {crushVehicleTrees} from '../src/combat/vehicle.js';
import {WORLD} from '../src/world/coordinates.js';
// 用正式碾压入口隔离移动几何，记录特效和树桩，奖励数据必须保持原样。
function scene(from,to,points){
 const g={player:{...to},vehicle:{active:true,index:6,angle:0},progress:{wood:30,coins:60},trees:points.map((p,i)=>({id:i,type:'tree',hp:100,radius:5,...p})),stumps:[],effects:0};
 g.fx={impact:()=>g.effects++};g.leaveStump=t=>g.stumps.push({...t});return g;
}
// 构建接地点中心，树干与车壳都使用同一世界坐标。
function point(x,y){return {x,y:y+hull.centerOffset};}

test('八个移动方向按车体长宽扫掠，两侧边缘压树，边界外不误伤',()=>{
 for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
  const length=Math.hypot(dx,dy),u={x:dx/length,y:dy/length},n={x:-u.y,y:u.x};
  const from={x:1000,y:1000},to={x:1000+500*u.x,y:1000+500*u.y};
  const side=Math.abs(n.x)*hull.width/2+Math.abs(n.y)*hull.length/2;
  const points=[];
  for(const sign of [-1,1])for(const extra of [4.8,5.2])points.push(point(from.x+250*u.x+sign*n.x*(side+extra),from.y+250*u.y+sign*n.y*(side+extra)));
  const g=scene(from,to,points);crushVehicleTrees(g,from);
  assert.deepEqual(g.trees.map(t=>t.hp),[0,100,0,100],`${dx},${dy}`);
  assert.equal(g.effects,2);assert.equal(g.stumps.length,2);assert.deepEqual(g.progress,{wood:30,coins:60});
 }
});

test('停车按真实长宽判定，角外的树不因大圆或大包围盒而被误伤',()=>{
 const p={x:1000,y:1000},g=scene(p,p,[point(1067.8,1000),point(1000,1043.8),point(1066,1042),point(1067,1043),point(1000,1050)]);
 crushVehicleTrees(g,p);assert.deepEqual(g.trees.map(t=>t.hp),[0,0,0,100,100]);
 g.vehicle.angle=Math.PI/2;crushVehicleTrees(g,p);assert.deepEqual(g.trees.map(t=>t.hp),[0,0,0,100,100]);assert.equal(g.stumps.length,3);
});

test('斜向扫掠不破坏轴对齐包围盒空角中的树，高速中途不会漏树',()=>{
 const from={x:1000,y:1000},to={x:1500,y:1500};
 const g=scene(from,to,[point(1100,1400),point(1400,1100),point(1250,1250)]);
 crushVehicleTrees(g,from);assert.deepEqual(g.trees.map(t=>t.hp),[100,100,0]);
});

test('宽车体在世界接缝压到两侧树，重复检测和下车不重复破坏',()=>{
 const from={x:WORLD.width-100,y:1000},to={x:100,y:1000};
 const g=scene(from,to,[point(0,1043.8),point(0,1044.2)]);
 crushVehicleTrees(g,from);assert.deepEqual(g.trees.map(t=>t.hp),[0,100]);
 crushVehicleTrees(g,from);assert.equal(g.stumps.length,1);
 g.vehicle.active=false;g.player.y+=100;crushVehicleTrees(g,from);assert.equal(g.stumps.length,1);
});
