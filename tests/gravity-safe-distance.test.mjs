// 引力枪安全距离与不伐木回归，使用正式选敌、弹道及循环地图距离。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {fireBallistics,updateBallistics} from '../src/combat/ballistics.js';
import {landGravityField,gravityPointSafe,updateGravityFields} from '../src/combat/gravity-field.js';
import {summonTargetPool} from '../src/combat/summons/targets.js';
import {sniperGuide} from '../src/combat/aim.js';
import {worldDistance,WORLD} from '../src/world/coordinates.js';

// 隔离场景不推进刷怪，伤害与位置仍交给真实战斗入口。
function scene(){
 const p=freshProgress();p.arrival=null;p.weapons[17]=1;p.weapon=17;
 const g=new Game(p,()=>.5);g.state='playing';g.workshopTrial=true;g.trees=[];g.enemies=[];g.boss=null;
 Object.assign(g.player,{x:900,y:750,arena:{x:900,y:750,radius:1200}});return g;
}
// 战斗靶与树木均使用真实扫圆中心，避免以枪口近似代替命中位置。
function target(g,x,type='enemy'){
 const t={id:g.nextId++,type,x,y:758,radius:15,hp:10000,maxHp:10000,arena:g.player.arena};
 (type==='tree'?g.trees:g.enemies).push(t);return t;
}
// 固定向右发射，允许独立炮口位于玩家前后两侧。
function fire(g,weapon=g.weapon(),x=925,dx=1){fireBallistics(g,weapon,{x,y:750},{x:dx,y:0},12,false,true);}
// 大步与正常帧均通过正式弹道内部小步，验证不会跨过安全距离判定。
function finish(g){updateBallistics(g,1);}

test('近敌优先在离身前方展开并被牵引，不再越过近敌打到远处',()=>{
 const g=scene(),near=target(g,940),tree=target(g,1200,'tree'),far=target(g,1230);
 fire(g);updateBallistics(g,.1);assert.equal(g.gravityFields.length,0);assert.equal(near.hp,10000);
 finish(g);assert.equal(tree.hp,10000);assert.equal(far.hp,10000);assert.equal(g.gravityFields.length,1);
 const field=g.gravityFields[0];assert.ok(worldDistance(field,g.player)>=150&&worldDistance(field,g.player)<165);
 const before=worldDistance(near,field);updateGravityFields(g,.1);assert.ok(worldDistance(near,field)<before);assert.equal(tree.hp,10000);
});
test('只有近敌时就近展开，广域套件扩大聚拢范围而不把中心推远',()=>{
 for(const radius of [190,237.5]){const g=scene();target(g,925);fire(g,{...g.weapon(),gravityRadius:radius});finish(g);
  assert.equal(g.gravityFields.length,1);const distance=worldDistance(g.gravityFields[0],g.player);assert.ok(distance>=150&&distance<165);
 }
});
test('只有远敌时仍能精准投送，途中树木不挡弹也不触发场',()=>{
 const g=scene(),tree=target(g,1100,'tree'),far=target(g,1230);fire(g);finish(g);
 assert.equal(tree.hp,10000);assert.ok(far.hp<10000);assert.equal(g.gravityFields.length,1);assert.ok(worldDistance(g.gravityFields[0],g.player)>290);
});
test('骑手长枪口越过贴身怪时仍就近展开，不转投后方远怪',()=>{
 const g=scene();target(g,940);target(g,1230);
 fireBallistics(g,g.weapon(),{x:980,y:750},{x:1,y:0},12,false);finish(g);
 assert.equal(g.gravityFields.length,1);assert.ok(worldDistance(g.gravityFields[0],g.player)<165);
});
test('飞行中玩家追到终点时消散，重复落地不能稍后补建',()=>{
 const g=scene();fire(g);const b=g.projectiles[0];g.player.x=1060;updateBallistics(g,.22);g.player.x=1325;finish(g);
 assert.equal(g.gravityFields.length,0);assert.equal(b.fieldCreated,true);g.player.x=900;landGravityField(g,b);assert.equal(g.gravityFields.length,0);
});
test('正常向前移动时延长少量飞行再展开，不失效、不突破原射程',()=>{
 const g=scene();target(g,940);fire(g);const b=g.projectiles[0];
 for(let i=0;i<120&&!g.gravityFields.length;i++){g.player.x+=200/120;updateBallistics(g,1/120);}
 assert.equal(g.gravityFields.length,1);assert.ok(worldDistance(g.gravityFields[0],g.player)>=150);assert.ok(b.travelled>126&&b.travelled<=400);
});
test('独立炮口朝玩家射击也不得在玩家旁落场',()=>{
 const g=scene();target(g,920);fire(g,g.weapon(),1220,-1);finish(g);
 assert.equal(g.gravityFields.length,0);
});
test('循环地图边缘按最近镜像拒绝贴身落场，远处落点保留',()=>{
 const g=scene();g.player.x=WORLD.width-20;
 const b={x:15,y:750,gravityRadius:190,gravityDuration:3,gravityPull:230};
 assert.equal(gravityPointSafe(g,b),false);landGravityField(g,b);assert.equal(g.gravityFields.length,0);
 landGravityField(g,{...b,x:300,fieldCreated:false});assert.equal(g.gravityFields.length,1);
});
test('引力枪和独立炮口跳过树木，换手持普通枪后恢复木材目标',()=>{
 const g=scene();target(g,1200,'tree');assert.equal(g.findAttackTarget(),null);assert.equal(sniperGuide(g).target,null);
 const ammo=g.magazines[17].ammo;assert.equal(g.attack(),false);assert.equal(g.magazines[17].ammo,ammo);
 assert.deepEqual(summonTargetPool(g,g.player,400,{targetTrees:g.weapon().targetTrees}),[]);
 assert.equal(summonTargetPool(g,g.player,400).length,0);
 g.progress.weapon=0;g.trees[0].x=1000;assert.equal(g.findAttackTarget(),g.trees[0]);
});
test('近敌预览终点与实际场一致，远敌仍标记命中，独立炮口的弹丸掠过树木',()=>{
 const g=scene();target(g,940);const tree=target(g,1200,'tree'),far=target(g,1230);
 const guide=sniperGuide(g);assert.equal(guide.hits.length,0);assert.ok(worldDistance(guide.end,g.player)>=150&&worldDistance(guide.end,g.player)<165);
 fireBallistics(g,g.weapon(),guide.muzzle,guide.direction,12,false);finish(g);assert.ok(worldDistance(g.gravityFields[0],guide.end)<.01);
 g.enemies=[far];const distant=sniperGuide(g);assert.equal(distant.target,far);assert.equal(distant.hits.length,1);
 g.enemies=[];fire(g,{...g.weapon(0),range:400,speed:650});finish(g);assert.equal(tree.hp,10000);assert.equal(far.hp,10000);
});
