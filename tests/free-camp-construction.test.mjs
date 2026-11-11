// 从正式建设事务验证世界选址、材料结算、等级和手建栅栏。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {CAMP_CONSTRUCTION,constructionState,buildCampAt} from '../src/core/camp/free-construction.js';
import {campBoundary,campBoundaryBlocked} from '../src/world/camp-boundary.js';
import {facilityOpen} from '../src/config/town-restoration.js';
import {COTTAGE} from '../src/config/cottage.js';
import {ownsCampPoint} from '../src/config/camp-land.js';

// 隔离存档的起始资金、树木和活动状态。
function setup(){
 const p=freshProgress();p.arrival={phase:'complete',keys:true,version:3};p.coins=5000;p.wood=5000;
 const g=new Game(p);g.state='playing';g.trees=[];g.mainlineSpeech=null;g.restorationPersist=()=>true;
 return g;
}
test('任选空地直接建设，扣费与读档一致，原地契不变',()=>{
 const g=setup(),p=g.progress,b=CAMP_CONSTRUCTION.find(b=>b.id==='cottage');
 const point={x:2200,y:8000};
 assert.equal(buildCampAt(g,b.id,point,()=>false).ok,false);assert.equal(g.progress,p);
 const result=buildCampAt(g,b.id,point);assert.ok(result.ok,result.message);
 assert.deepEqual(g.progress.campLand.owned,['core']);assert.equal(g.progress.coins,5000-b.cost.coins);assert.equal(g.progress.wood,5000-b.cost.wood);
 assert.ok(facilityOpen(g.progress,'cottage'));assert.equal(COTTAGE.door.x,point.x);assert.ok(ownsCampPoint(g.progress,point));
 assert.equal(buildCampAt(g,b.id,{x:100,y:100}).ok,false);
 const loaded=new Game(validateProgress(structuredClone(g.progress)));
 assert.ok(constructionState(loaded.progress,b).built);assert.deepEqual(loaded.progress.campLayout.positions.cottage,point);
});
test('建筑按营地等级开放，手建栏段可连续放置并保存碰撞',()=>{
 const g=setup(),before=g.progress.wood;
 assert.equal(buildCampAt(g,'seWorkshop',{x:2220,y:8000}).ok,false);
 assert.equal(g.progress.wood,before);g.progress.campLevel.xp=10800;
 assert.ok(buildCampAt(g,'seWorkshop',{x:2220,y:8000}).ok);
 assert.equal(campBoundary(g.progress).objects.some(f=>f.settlement==='sunleaf'),false);
 for(const x of [2600,2660])assert.ok(buildCampAt(g,'fence-h',{x,y:8000}).ok);
 assert.equal(buildCampAt(g,'fence-h',{x:2600,y:8000}).ok,false);
 const loaded=validateProgress(g.progress);assert.equal(loaded.campLand.fences.length,2);
 assert.ok(campBoundaryBlocked(2600,8000,10,loaded));assert.equal(campBoundaryBlocked(2600,8080,10,loaded),false);
});
