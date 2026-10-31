// 大蜘蛛围栏拐角回归：使用正式跟随、体积碰撞和门洞，不瞬移越墙。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {updateSpider} from '../src/combat/spider.js';
import {worldDistance} from '../src/world/coordinates.js';
import {planQuestRoute,questLineClear} from '../src/physics/quest-route.js';
import {settlementBlocked} from '../src/world/settlements.js';
// 场景保留真实营地围栏，清空随机树木以独立验证围栏问题。
function scene(start,owner){const p=freshProgress();p.weapons[16]=1;p.weapon=16;const g=new Game(p,()=>.5);g.state='playing';g.trees=[];g.enemies=[];Object.assign(g.player,owner);Object.assign(g.spider.mother,start,{ready:true,mapId:'forest',arena:g.player.arena});return g;}
// 固定步长推进正式更新，每一步都检查碰撞、位移和步态，不使用传送救场。
function follow(g,seconds=20){const m=g.spider.mother;let distance=0;for(let i=0;i<seconds*60;i++){const old={x:m.x,y:m.y};g.time+=1/60;updateSpider(g,1/60,false);const step=worldDistance(m,old);assert.ok(step<12,'不得瞬移越墙');assert.equal(settlementBlocked(m.x,m.y,m.radius),false,'母体碰撞体不能进入围栏');distance+=step;}return distance;}
test('沿营地西南外角绕行到玩家身后，不在直角两侧来回顶墙',()=>{const g=scene({x:80,y:1080},{x:260,y:1220});follow(g);assert.ok(worldDistance(g.spider.mother,{x:178,y:1288})<15,JSON.stringify(g.spider.mother));});
test('玩家在围栏内侧时跟随点不能落到外侧，母体从西门正常入营',()=>{const g=scene({x:80,y:850},{x:200,y:850});follow(g,30);assert.ok(g.spider.mother.x>149);assert.ok(worldDistance(g.spider.mother,g.player)<120);});
test('拐角绕行完成后自然停步，暂停不推进位置和规划时钟',()=>{const g=scene({x:80,y:1080},{x:260,y:1220});follow(g);assert.ok(follow(g,3)<.1);const before=JSON.stringify(g.spider);g.state='paused';g.update(.1,{x:1,y:0});assert.equal(JSON.stringify(g.spider),before);});

test('母体按二十四单位脚底绕过营地内角，经门洞到达外侧',()=>{const g=scene({x:170,y:1080},{x:260,y:1220});follow(g,35);assert.ok(g.spider.mother.y>1159);assert.ok(worldDistance(g.spider.mother,{x:178,y:1288})<15);});
test('大蜘蛛寻路按真实半径检查狭缝，玩家的默认路线尺寸不变',()=>{
 const body={x:2000,y:2000,arena:{x:2100,y:2000,radius:300},worldBarriers:[{x:2100,y:1839,width:15,height:280},{x:2100,y:2161,width:15,height:280}]},goal={x:2200,y:2000};
 assert.equal(questLineClear(body,goal,body,[]),true);assert.equal(questLineClear(body,goal,{...body,navigationRadius:24},[]),false);
 assert.equal(planQuestRoute({...body,navigationRadius:24},goal,[],256).reachable,false);
});

test('玩家贴着栏杆时母体停在同侧可容纳大身体的位置',()=>{const g=scene({x:80,y:850},{x:140,y:850});follow(g,30);assert.ok(g.spider.mother.x>=149);assert.ok(worldDistance(g.spider.mother,g.player)<40);});
