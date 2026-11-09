// 仅验证新增任务路线、光点预算和任务状态清理，不重复测试战斗规则。
import test from 'node:test';
import assert from 'node:assert/strict';
import {planQuestRoute,questLineClear,QUEST_ROUTE_BUDGET} from '../src/physics/quest-route.js';
import {storyRouteState,storyRouteDots} from '../src/core/navigation/story-route.js';
import {WORLD} from '../src/world/coordinates.js';

// 所有返回边再次用正式碰撞扫掠，不能以折点不碰撞代替整段可通行。
function assertClear(result,body,trees=[]){assert.equal(result.reachable,true);assert.ok(result.visited<=QUEST_ROUTE_BUDGET);for(let i=1;i<result.points.length;i++)assert.equal(questLineClear(result.points[i-1],result.points[i],body,trees),true);}
test('直线路线与绕树路线均可通行，不修改树木',()=>{
 // 使用当前地图的开阔草地，避免新营门围栏让“直线”夹具实际需要绕行。
 const p={x:1600,y:400,mapId:'forest'},goal={x:1800,y:400},trees=[{x:1700,y:400,radius:35,hp:100}];
 assert.equal(planQuestRoute(p,goal).points.length,2);
 const result=planQuestRoute(p,goal,trees);assertClear(result,p,trees);assert.ok(result.points.length>2);assert.equal(trees[0].hp,100);
});
test('步行跨河绕桥，两栖和飞行读取各自实际通行能力',()=>{
 const p={x:900,y:1100,mapId:'forest'},goal={x:1450,y:1100};
 const land=planQuestRoute(p,goal);assertClear(land,p);assert.ok(land.points.length>2);
 const water={...p,amphibious:true};assertClear(planQuestRoute(water,goal),water);
 const air={...p,flying:true};assert.equal(planQuestRoute(air,goal).points.length,2);
});
test('世界镜像采用最近端点，战斗圈不可跨越',()=>{
 const p={x:WORLD.width-10,y:700,flying:true};const path=planQuestRoute(p,{x:10,y:700});assertClear(path,p);assert.equal(path.points.at(-1).x,WORLD.width+10);
 assert.equal(planQuestRoute({...p,arena:{x:WORLD.width-10,y:700,radius:60,terrain:'forest'}},{x:100,y:700}).reachable,false);
});
test('阻塞端点和耗尽搜索预算均不返回穿墙直线',()=>{
 const p={x:700,y:900,mapId:'forest'},trees=[{x:800,y:900,radius:35,hp:100}];
 assert.equal(planQuestRoute(p,{x:800,y:900},trees).reachable,false);
 const result=planQuestRoute(p,{x:900,y:900},trees,1);assert.equal(result.reachable,false);assert.equal(result.visited,1);assert.deepEqual(result.points,[]);
});
test('光点锚定终点，移动不整串滑动且长度与数量有上限',()=>{
 const first=storyRouteDots([{x:0,y:0},{x:2000,y:0}]),next=storyRouteDots([{x:10,y:0},{x:2000,y:0}]);
 assert.ok(first.length<=24);assert.ok(first.every(p=>p.distance<640));assert.ok(first.slice(1).every(p=>next.some(n=>n.x===p.x&&n.y===p.y)));
 assert.deepEqual(storyRouteDots([]),[]);
});
test('指路箭头沿折线转向且移动后仍锚定相同光点',()=>{
 const points=[{x:0,y:0},{x:180,y:0},{x:180,y:360}];
 const dots=storyRouteDots(points,36),moved=storyRouteDots([{x:10,y:0},...points.slice(1)],36);
 assert.ok(dots.some(p=>p.arrow&&p.y>0));
 for(const p of dots){assert.equal(p.angle,p.y>0?Math.PI/2:0);const other=moved.find(n=>Math.abs(n.x-p.x)<.001&&Math.abs(n.y-p.y)<.001);if(other)assert.equal(other.arrow,p.arrow);}
});
test('任务切换立即替换光点，抵达、对白、暂停、试射与离开均清理',()=>{
 let site='SIGN';const g={story:{chapterId:'sunleaf-01',stageId:'Q20',phase:'active',runId:'test'},player:{x:900,y:700},mapId:'forest',state:'playing',time:0,trees:[],storyObjective:()=>({site})};
 assert.equal(storyRouteState(g).site,'SIGN');site='MINT';assert.equal(storyRouteState(g).site,'MINT');
 g.player={x:700,y:2500};assert.deepEqual(storyRouteState(g).points,[]);
 g.story.phase='dialogue';assert.equal(storyRouteState(g),null);g.story.phase='active';g.state='paused';assert.equal(storyRouteState(g),null);
 g.state='playing';g.story.trial={};assert.equal(storyRouteState(g),null);g.story=null;assert.equal(storyRouteState(g),null);
});
