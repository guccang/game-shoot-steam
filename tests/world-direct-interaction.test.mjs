// 直接点击身份和现场推进回归：禁止最近邻居抢走点击、远程交付及替身身份错配。
import test from 'node:test';
import assert from 'node:assert/strict';
import {requestWorldNavigation,worldNavigationObjective} from '../src/core/navigation/world-navigation.js';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {livingResidents,residentInteraction,residentFor,interactLivingRequest} from '../src/core/camp/living-world.js';
// 创建正式森林会话，测试只设置位置和已接任务阶段。
function world(){const g=new Game(freshProgress(),()=>.5);g.start();g.livingPersist=()=>true;return g;}
test('点击稍远的邻居仍打开本人，远距离或已隐藏居民不允许交互',()=>{
 const g=world(),r=livingResidents(g);Object.assign(g.player,{x:900,y:900});Object.assign(r[0],{x:905,y:900});Object.assign(r[1],{x:960,y:900});
 assert.equal(residentInteraction(g,r[1].id).resident,r[1].id);Object.assign(r[1],{x:1300,y:900});assert.equal(residentInteraction(g,r[1].id),null);assert.equal(residentInteraction(g,'missing'),null);
});
test('只有点到当前委托指定人物才推进，同处附近的邻居仍是闲聊',()=>{
 const g=world();g.progress.living.requests['neighbors-night'].stage=0;g.progress.taskTracking={kind:'living',id:'neighbors-night'};
 const bat=residentFor(g,'bat'),snow=residentFor(g,'snow');Object.assign(g.player,{x:800,y:1600});Object.assign(bat,{x:820,y:1600});Object.assign(snow,{x:805,y:1600});
 assert.equal(residentInteraction(g,'snow').resident,'snow');const target=residentInteraction(g,'bat');assert.equal(target.id,'neighbors-night');assert.ok(target.step);assert.equal(interactLivingRequest(g,target.id).ok,true);assert.equal(g.progress.living.requests['neighbors-night'].stage,1);
});
test('玩家扮演雪团时本人不重复出现，薄荷在地图边缘仍可交谈',()=>{
 const g=world();g.progress.hero=4;g.progress.living.requests['neighbors-night'].stage=1;g.progress.taskTracking={kind:'living',id:'neighbors-night'};
 const target=residentFor(g,'snow');assert.equal(target.id,'mint');Object.assign(g.player,{x:10,y:500});Object.assign(target,{x:3590,y:500});
 assert.equal(residentInteraction(g,'snow'),null);assert.equal(residentInteraction(g,'mint').resident,'mint');
});

test('主动点击远处邻居允许临时导航，完成靠近后恢复主线',()=>{
 const g=world();g.progress.mainline.completed=['first-map'];g.progress.mainline.phase='doing';Object.assign(g.player,{x:1030,y:850});
 const resident=residentFor(g,'mint');Object.assign(resident,{x:790,y:1540});requestWorldNavigation(g,resident,'去找薄荷',{direct:true});assert.equal(worldNavigationObjective(g).site.id,'mint');
 Object.assign(g.player,{x:resident.x,y:resident.y});worldNavigationObjective(g);assert.equal(worldNavigationObjective(g).key,'clearing-post');
});
