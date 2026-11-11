// 从正式建设事务验证世界选址、材料结算、等级和手建栅栏。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {CAMP_CONSTRUCTION,constructionState,buildCampAt} from '../src/core/camp/free-construction.js';
import {campBoundary,campBoundaryBlocked} from '../src/world/camp-boundary.js';
import {facilityOpen} from '../src/config/town-restoration.js';
import {COTTAGE} from '../src/config/cottage.js';
import {insideCampLand} from '../src/config/camp-land.js';

// 隔离存档的起始资金、树木和活动状态。
function setup(){
 const p=freshProgress();p.arrival={phase:'complete',keys:true,version:3};p.coins=5000;p.wood=5000;
 const g=new Game(p);g.state='playing';g.trees=[];g.mainlineSpeech=null;g.restorationPersist=()=>true;
 return g;
}
test('野外、未购地和跨界栅栏不扣资源，营地内可连续摆放',()=>{
 const g=setup(),before=g.progress.wood;
 for(const point of [{x:2200,y:8000},{x:300,y:500},{x:240,y:500}]){
  assert.equal(buildCampAt(g,'fence-h',point).ok,false);
 }
 assert.equal(g.progress.wood,before);
 const point={x:0,y:680};
 const r=buildCampAt(g,'fence-h',point);assert.ok(r.ok,r.message);
 assert.ok(buildCampAt(g,'fence-h',{x:60,y:680}).ok);
 assert.equal(g.progress.wood,before-8);
 assert.ok(campBoundaryBlocked(0,680,10,validateProgress(g.progress)));
});
test('旧档野外小屋保留位置和功能，周边不能继续建设',()=>{
 const g=setup(),point={x:2200,y:8000};
 g.progress.campLand.sites.cottage={...point,width:140,height:120};
 g.progress.campLayout.positions.cottage=point;g.progress.restoration.repaired.push('cottage');
 const loaded=new Game(validateProgress(g.progress));
 assert.ok(facilityOpen(loaded.progress,'cottage'));assert.equal(COTTAGE.door.x,point.x);
 assert.ok(constructionState(loaded.progress,CAMP_CONSTRUCTION.find(b=>b.id==='cottage')).built);
 assert.equal(insideCampLand(loaded.progress,2190,8010,2210,8030),false);
});

// 共界可跨越，四角在地契内而中间缺一块地时仍应拒绝。
test('只允许完整覆盖的占地跨越地契共界',()=>{
 const g=setup();
 assert.equal(insideCampLand(g.progress,230,400,260,460),false);
 g.progress.campLand.owned.push('quarter');
 assert.equal(insideCampLand(g.progress,230,400,260,460),true);
 g.progress.campLand.owned=['core','homes'];
 assert.equal(insideCampLand(g.progress,230,400,460,460),false);
});
