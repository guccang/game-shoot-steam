// 南桥必须是正式可通行地形，过桥与导航不能依赖贴图或瞬移。
import test from 'node:test';
import assert from 'node:assert/strict';
import {BRIDGE,BRIDGES,SOUTH_BRIDGE,isWaterBlocked,isWaterScenery,riverXAt} from '../src/world/river-geometry.js';
import {WORLD} from '../src/world/coordinates.js';
import {PATHS,pathDistance} from '../src/world/paths.js';
import {moveBody,navigationTarget,clearWaterPath} from '../src/physics/motion.js';
import {terrainBlocked,naturalWaypoint} from '../src/physics/terrain-navigation.js';
import {planQuestRoute,questLineClear} from '../src/physics/quest-route.js';
import {coversScenery} from '../src/world/forest-clearings.js';

test('两桥板可通行且桥外仍阻挡水面，周期镜像共用相同边界',()=>{
 assert.deepEqual(BRIDGE,{x:1185,y:690,width:220,height:78});assert.equal(BRIDGES.length,2);
 for(const bridge of BRIDGES)for(const shift of [{x:0,y:0},{x:-WORLD.width,y:WORLD.height}]){
  const y=bridge.y+bridge.height/2+shift.y;
  for(let x=bridge.x-32;x<=bridge.x+bridge.width+32;x+=4){assert.equal(isWaterBlocked(x+shift.x,y,22),false);assert.equal(terrainBlocked(x+shift.x,y,12),false);}
  for(const edge of [bridge.y-8,bridge.y+bridge.height+8])assert.equal(isWaterBlocked(riverXAt(edge)+shift.x,edge+shift.y,12),true);
 }
});

test('南桥两岸引路准确接上已有道路且桥口避让完整树冠',()=>{
 const road=PATHS.at(-1),y=SOUTH_BRIDGE.y+SOUTH_BRIDGE.height/2;
 assert.deepEqual(road[0],PATHS[1][y/20]);assert.deepEqual(road.at(-1),PATHS[2][y/20]);
 for(let x=road[0].x;x<road.at(-1).x;x+=12){assert.ok(pathDistance(x,y)<1e-6);assert.equal(terrainBlocked(x,y,12),false);}
 for(const x of [SOUTH_BRIDGE.x-20,SOUTH_BRIDGE.x+SOUTH_BRIDGE.width+20]){
  assert.equal(isWaterScenery(x,y),true);assert.equal(coversScenery(x,SOUTH_BRIDGE.y+140),true);
 }
});

test('南桥使用真实移动从东西两侧往返，脚底沿桥边也能通过',()=>{
 const b=SOUTH_BRIDGE;
 for(const side of [-1,1])for(const offset of [6,b.height-6]){
  const body={x:side<0?b.x-40:b.x+b.width+40,y:b.y+offset,mapId:'forest'};
  for(let step=0;step<80;step++)moveBody(body,-side*4,0,WORLD,12,[]);
  assert.ok(side<0?body.x>b.x+b.width+20:body.x<b.x-20);
 }
});

test('附近追击与自然绕行选择南桥，桥上偏离中线不会掉头去北桥',()=>{
 const b=SOUTH_BRIDGE,y=b.y+b.height/2;
 for(const side of [-1,1])for(const shift of [0,WORLD.height,-WORLD.height]){
  const body={x:side<0?b.x-60:b.x+b.width+60,y:y+160+shift},target={x:side<0?b.x+b.width+60:b.x-60,y:y+160+shift};
  const goal=navigationTarget(body,target);assert.ok(Math.abs(goal.y-y-shift)<80);assert.ok(clearWaterPath(body,goal));
  const onDeck={x:b.x+b.width/2,y:y+17+shift},exit=navigationTarget(onDeck,target,false);assert.ok((exit.x-onDeck.x)*(target.x-onDeck.x)>0);assert.ok(clearWaterPath(onDeck,exit));
  const natural=naturalWaypoint(body,target);assert.ok(Math.abs(natural.y-y-shift)<240);assert.ok(clearWaterPath(body,natural));
 }
});

test('任务路线从南侧绕上南桥，每段均通过正式碰撞',()=>{
 const b=SOUTH_BRIDGE,body={x:b.x-70,y:b.y+180,mapId:'forest'},target={x:b.x+b.width+70,y:b.y+180};
 const route=planQuestRoute(body,target,[],4096,{shortEdges:true});assert.equal(route.reachable,true);assert.ok(route.points.some(p=>p.y>=b.y&&p.y<=b.y+b.height));assert.ok(route.points.every(p=>Math.abs(p.y-6000)<400));
 for(let i=1;i<route.points.length;i++)assert.ok(questLineClear(route.points[i-1],route.points[i],body,[]));
});
