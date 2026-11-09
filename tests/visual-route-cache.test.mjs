// 专项覆盖完整路线复用、局部绕障、可见光点及失效条件，不运行战斗测试。
import test from 'node:test';
import assert from 'node:assert/strict';
import {createVisualRouteSession,advanceVisualRouteSession,updateVisualRouteIndex} from '../src/core/navigation/visual-route-cache.js';
import {visibleRouteDots} from '../src/core/navigation/story-route.js';
import {SpatialGrid} from '../src/world/spatial-grid.js';
import {questLineClear} from '../src/physics/quest-route.js';
import {WORLD,worldDistance} from '../src/world/coordinates.js';

// 推进分帧搜索直至得到安全接入路线，时钟持续前进且限制总帧数。
function ready(session,body,view,time=0){for(let i=0;i<5000;i++){time+=1/60;const state=advanceVisualRouteSession(session,body,time,view);if(!state.planning)return {state,time};}throw Error('导航未完成');}
// 镜头使用世界坐标，跟随玩家移动以检验一屏距离阈值。
function camera(body){return {x:body.x-320,y:body.y-400,w:640,h:800,zoom:1};}

test('偏离128单位后仅搜索短接入段，搜索中仍显示缓存主路',()=>{
 const body={x:700,y:900,mapId:'forest'},session=createVisualRouteSession(body,{x:950,y:900},new SpatialGrid([]),0);
 const first=ready(session,body,camera(body));const original=session.points;body.y+=180;
 const pending=advanceVisualRouteSession(session,body,first.time,camera(body));
 assert.equal(pending.searchStarts,1);assert.equal(pending.joining,true);assert.ok(visibleRouteDots(pending,camera(body)).length>0);
 const {state}=ready(session,body,camera(body),first.time+1);assert.equal(state.searchStarts,1);assert.ok(state.localSearchStarts>=1);assert.equal(session.points,original);assert.ok(state.reachable);
 for(let i=1;i<state.points.length;i++)assert.ok(questLineClear(state.points[i-1],state.points[i],body,[]));
});
test('最近主路点隔着树时局部绕行，不清空全路线或穿过树干',()=>{
 const tree={x:700,y:1000,radius:30,hp:100},body={x:700,y:900,mapId:'forest'},index=new SpatialGrid([tree]);
 const session=createVisualRouteSession(body,{x:950,y:900},index,0);const first=ready(session,body,camera(body));body.y=1100;
 assert.equal(questLineClear(body,session.points[0],body,index),false);
 const {state}=ready(session,body,camera(body),first.time+1);assert.equal(state.searchStarts,1);assert.ok(state.localSearchStarts>=1);assert.ok(state.reachable);
 for(let i=1;i<state.points.length;i++)assert.ok(questLineClear(state.points[i-1],state.points[i],body,index));
});
test('长途搜索过程中玩家移动不重启主搜索，完成后从当前位置接入',()=>{
 const body={x:1600,y:400,mapId:'forest',livingCollision:true},session=createVisualRouteSession(body,{x:700,y:1600},new SpatialGrid([]),0);
 advanceVisualRouteSession(session,body,0,camera(body));body.x=1760;
 const {state}=ready(session,body,camera(body));assert.equal(state.searchStarts,1);assert.ok(state.reachable);assert.equal(state.points[0].x,1760);
});
test('沿路反向和跨世界接缝复用缓存，偏离一屏后才启动新主路线',()=>{
 const body={x:3500,y:700,flying:true},session=createVisualRouteSession(body,{x:200,y:700},new SpatialGrid([]),0);
 let {time}=ready(session,body,camera(body));
 for(const x of [3550,3610,3580,3500,7100]){body.x=x;const {state,time:next}=ready(session,body,camera(body),time);time=next;assert.equal(state.searchStarts,1);assert.ok(state.reachable);assert.ok(Math.abs(state.points[1].x-body.x)<128);}
 body.y+=850;const state=advanceVisualRouteSession(session,body,time+1,camera(body));assert.equal(state.searchStarts,2);assert.equal(state.planning,true);assert.ok(state.routePoints.length>1);
});

test('移动绕到长墙另一侧时局部失败转完整搜索，屏内旧路点持续显示至新路线就绪',()=>{
 const wall={x:5000,y:5000,width:30,height:800},body={x:5100,y:5000,arena:{x:5000,y:5000,radius:1800},worldBarriers:[wall]};
 const index=new SpatialGrid([]),goal={x:5500,y:5000},session=createVisualRouteSession(body,goal,index,0),first=ready(session,body,camera(body));
 const original=session.points;body.x=4900;let state,time=first.time+4,replanning=false;
 for(let i=0;i<1000;i++){
  time+=1/60;state=advanceVisualRouteSession(session,body,time,camera(body));
  assert.ok(visibleRouteDots(state,camera(body)).length>0,'重新规划时不能清空仍在屏幕内的路线');
  if(state.searchStarts===2&&state.planning){replanning=true;assert.equal(session.points,original);assert.deepEqual(session.origin,{x:5100,y:5000});assert.deepEqual(session.searchOrigin,{x:4900,y:5000});}
  assert.ok(state.searchStarts<=2,'完整重算进行中不能重复启动或叠加局部搜索');
  for(let j=1;j<state.points.length;j++)assert.ok(questLineClear(state.points[j-1],state.points[j],body,index));
  if(replanning&&!state.planning)break;
 }
 assert.ok(replanning);assert.ok(state.reachable);assert.notEqual(session.points,original);assert.deepEqual(state.points.at(-1),goal);assert.deepEqual(session.origin,session.searchOrigin);
});

test('移动重算失败仍保留有效旧路线，但不绘制从受阻当前位置穿墙的连线',()=>{
 const body={x:5100,y:5000,arena:{x:5000,y:5000,radius:1800},worldBarriers:[{x:5000,y:5000,width:30,height:800}]};
 const session=createVisualRouteSession(body,{x:5500,y:5000},new SpatialGrid([]),0),first=ready(session,body,camera(body));
 body.x=5000;let state,time=first.time+4;
 for(let i=0;i<80;i++){time+=1/60;state=advanceVisualRouteSession(session,body,time,camera(body));assert.ok(visibleRouteDots(state,camera(body)).length>0);assert.equal(state.points.length,0);}
 assert.equal(session.search.result.reachable,false);assert.ok(state.routePoints.length>1);
});

test('沿原路线前进时身后出现停车障碍不重算，前方车体仍会使受阻路线失效',()=>{
 const body={x:5100,y:5000,arena:{x:5000,y:5000,radius:1800}},session=createVisualRouteSession(body,{x:6200,y:5000},new SpatialGrid([]),0);
 const first=ready(session,body,camera(body));body.x=5500;
 const before=advanceVisualRouteSession(session,body,first.time+1,camera(body));assert.ok(before.reachable);
 body.parkingBarriers=[{x:5160,y:5000,width:72,height:60}];
 const after=advanceVisualRouteSession(session,body,first.time+2,camera(body));
 assert.equal(after.searchStarts,1);assert.ok(after.reachable);assert.ok(visibleRouteDots(after,camera(body)).length>0);
 assert.ok(after.routePoints.every(p=>p.x>=body.x),'身后的失效历史路段应裁掉，不能反复显示穿车路点');
 for(let i=1;i<after.points.length;i++)assert.ok(questLineClear(after.points[i-1],after.points[i],body,[]));
 body.parkingBarriers.push({x:5800,y:5000,width:72,height:60});
 const blocked=advanceVisualRouteSession(session,body,first.time+3,camera(body));assert.equal(blocked.searchStarts,2);
 for(let i=1;i<blocked.routePoints.length;i++)assert.ok(questLineClear(blocked.routePoints[i-1],blocked.routePoints[i],body,[]));
});

test('移动重算期间远处停车状态变化只更新搜索快照，不清空仍有效的显示路线',()=>{
 const body={x:5100,y:5000,arena:{x:5000,y:5000,radius:1800},worldBarriers:[{x:5000,y:5000,width:30,height:800}]};
 const session=createVisualRouteSession(body,{x:5500,y:5000},new SpatialGrid([]),0),first=ready(session,body,camera(body));body.x=4900;
 // 分帧搜索同时受时间预算限制，等待确实进入全程重算，不能假定本机一帧完成局部失败。
 let pending,time=first.time+4;
 for(let i=0;i<1000;i++){pending=advanceVisualRouteSession(session,body,time,camera(body));if(pending.searchStarts===2)break;time+=1/60;}
 assert.ok(pending.planning);assert.equal(pending.searchStarts,2);
 body.parkingBarriers=[{x:6000,y:6000,width:72,height:60}];
 const updated=advanceVisualRouteSession(session,body,time+.01,camera(body));assert.ok(visibleRouteDots(updated,camera(body)).length>0);assert.equal(updated.searchStarts,2);
 const finished=ready(session,body,camera(body),time+.02).state;assert.ok(finished.reachable);assert.equal(finished.searchStarts,2);
});
test('远处树木变化只更新索引，主路新增障碍才重新规划',()=>{
 const body={x:700,y:900,mapId:'forest'},session=createVisualRouteSession(body,{x:950,y:900},new SpatialGrid([]),0);const first=ready(session,body,camera(body));
 const far={x:700,y:1400,radius:30,hp:100};updateVisualRouteIndex(session,new SpatialGrid([far]),[far],body,first.time+1);
 assert.equal(session.searchStarts,1);updateVisualRouteIndex(session,new SpatialGrid([]),[],body,first.time+2);assert.equal(session.searchStarts,1);
 // 营地布局调整后路线会绕行，障碍必须放在实际主路上，而非旧版直线路径。
 const near={...session.points.find(p=>worldDistance(p,body)>96),radius:30,hp:100};updateVisualRouteIndex(session,new SpatialGrid([near]),[near],body,first.time+3);assert.equal(session.searchStarts,2);
 const {state}=ready(session,body,camera(body),first.time+3);assert.ok(state.reachable);for(let i=1;i<state.points.length;i++)assert.ok(questLineClear(state.points[i-1],state.points[i],body,[near]));
});
test('长途移动超过起点半个世界宽度仍接回身边主路，不误判偏离一屏',()=>{
 const body={x:0,y:200,flying:true},session=createVisualRouteSession(body,{x:1750,y:200},new SpatialGrid([]),0);const first=ready(session,body,camera(body));body.x=1900;
 const {state}=ready(session,body,camera(body),first.time+1);assert.equal(state.searchStarts,1);assert.ok(state.reachable);assert.equal(state.points.at(-1).x,1750);
});
test('同帧重复调用不会叠加局部搜索工作，原地等待不重新搜索',()=>{
 const body={x:700,y:900,mapId:'forest'},session=createVisualRouteSession(body,{x:950,y:900},new SpatialGrid([]),0);const first=ready(session,body,camera(body));body.y+=180;
 advanceVisualRouteSession(session,body,first.time,camera(body));const local=session.local.search,before=local.steps;
 for(let i=0;i<10;i++)advanceVisualRouteSession(session,body,first.time,camera(body));assert.equal(local.steps,before);
 const {state,time}=ready(session,body,camera(body),first.time+1);for(let i=1;i<40;i++){const next=advanceVisualRouteSession(session,body,time+i,camera(body));assert.equal(next.localSearchStarts,state.localSearchStarts);assert.equal(next.searchStarts,1);}
});
test('视野内的远段不受近端640单位截断，裁剪后才限制光点数量',()=>{
 const points=[{x:0,y:500},{x:1500,y:500}],route={points},view={x:800,y:300,w:600,h:400};const dots=visibleRouteDots(route,view);
 assert.ok(dots.length>0);assert.ok(dots.every(p=>p.x>=782&&p.x<=1418));assert.ok(dots.some(p=>p.x>1000));
 const moved=visibleRouteDots({points:[{x:10,y:500},points[1]]},view);assert.deepEqual(moved.map(p=>[p.x,p.y]),dots.map(p=>[p.x,p.y]));
 const wrapped=visibleRouteDots(route,{...view,x:view.x+WORLD.width});assert.deepEqual(wrapped.map(p=>[p.x-WORLD.width,p.y]),dots.map(p=>[p.x,p.y]));
 assert.ok(visibleRouteDots(route,{x:0,y:0,w:7200,h:5600},4).length<=96);
});

// 已走过的路段不能在局部接入搜索的空档被整条历史缓存重新画出。
test('向前走后偏离路线，接入等待与恢复均只显示剩余路线',()=>{
 const body={x:5100,y:5000,arena:{x:5600,y:5000,radius:1800}},session=createVisualRouteSession(body,{x:6200,y:5000},new SpatialGrid([]),0);
 let {time}=ready(session,body,camera(body));body.x=5500;
 const forward=advanceVisualRouteSession(session,body,time+1,camera(body));assert.ok(forward.reachable);
 const remaining=structuredClone(forward.points),dots=visibleRouteDots(forward,camera(body));
 body.y+=180;
 // 模拟本帧主搜索已占预算，接入必须留到下一帧，稳定覆盖真实出现闪回的等待窗口。
 session.search.lastFrame=time+1;
 const pending=advanceVisualRouteSession(session,body,time+1,camera(body));
 assert.ok(pending.joining);assert.equal(pending.points.length,0);
 assert.deepEqual(pending.routePoints,remaining,'等待接入时必须保留上一次剩余路线，不能恢复出发点');
 assert.deepEqual(visibleRouteDots(pending,camera({x:5500,y:5000})),dots,'切换到缓存显示不能突然增加身后光点');
 const resumed=ready(session,body,camera(body),time+2);assert.ok(resumed.state.reachable);
 assert.ok(resumed.state.points.every(p=>p.x>=5500));assert.equal(resumed.state.searchStarts,1);
 // 玩家再次偏离时保留已经续接过的显示路线，包括有效接入段。
 const connected=structuredClone(resumed.state.points);body.y+=200;
 session.search.lastFrame=resumed.time;
 const again=advanceVisualRouteSession(session,body,resumed.time,camera(body));
 assert.equal(again.points.length,0);assert.deepEqual(again.routePoints,connected);
});

// 完整重算同样有等待帧，保留主路供搜索复用和保留剩余路线供显示不能混为一份数据。
test('移动触发全程重算时不回显走过的路线，新障碍仍清空失效缓存',()=>{
 const body={x:5100,y:5000,arena:{x:5600,y:5000,radius:2200}},index=new SpatialGrid([]);
 const session=createVisualRouteSession(body,{x:6200,y:5000},index,0),first=ready(session,body,camera(body));body.x=5500;
 const forward=advanceVisualRouteSession(session,body,first.time+1,camera(body));body.y+=850;
 const pending=advanceVisualRouteSession(session,body,first.time+2,camera(body));
 assert.equal(pending.searchStarts,2);assert.ok(pending.planning);assert.deepEqual(pending.routePoints,forward.points);
 const tree={x:5800,y:5000,radius:40,hp:100};updateVisualRouteIndex(session,new SpatialGrid([tree]),[tree],body,first.time+3);
 const blocked=advanceVisualRouteSession(session,body,first.time+3,camera(body));
 for(let i=1;i<blocked.routePoints.length;i++)assert.ok(questLineClear(blocked.routePoints[i-1],blocked.routePoints[i],body,[tree]));
});

// 环形世界换镜像只平移剩余路线，不重新取整条主路的历史起点。
test('跨世界接缝后等待接入保留同一镜像的剩余路线',()=>{
 const body={x:3500,y:700,flying:true},session=createVisualRouteSession(body,{x:500,y:700},new SpatialGrid([]),0),first=ready(session,body,camera(body));
 body.x=3650;const forward=advanceVisualRouteSession(session,body,first.time+1,camera(body));
 body.x-=WORLD.width;body.y+=180;
 session.search.lastFrame=first.time+1;
 const pending=advanceVisualRouteSession(session,body,first.time+1,camera(body));
 assert.ok(pending.joining);assert.deepEqual(pending.routePoints,forward.points.map(p=>({x:p.x-WORLD.width,y:p.y})));
});
