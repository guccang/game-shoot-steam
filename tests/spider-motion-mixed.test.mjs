// 混编猫群与蜘蛛出舱/分散攻击回归，全部推进正式战斗状态。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { freshProgress } from '../src/progression/progress.js';
import { updateMechanical, hurtMechanical } from '../src/combat/mechanical.js';
import { updateSpider } from '../src/combat/spider.js';
import { updateVehicle } from '../src/combat/vehicle.js';
import { vehicleCompanionContext } from '../src/combat/vehicle-companions.js';
import { worldDistance } from '../src/world/coordinates.js';
// 开放平台隔离环境碰撞，固定敌人生命使多目标分配可重复观察。
function arena(index=16) {
 const p=freshProgress();p.weapons.fill(1);p.vehicleWeapons.fill(1);p.vehicleHulls.fill(1);p.weapon=index;
 p.mechanicalLoadout=0;p.weaponParts[index].coordination=index===16?13:8;p.turretParts[15].coordination=8;
 const g=new Game(p,()=>.5);g.trees=[];g.enemies=[];g.boss=null;g.state='playing';g.updateWaves=()=>{};
 Object.assign(g.player,{x:900,y:750,arena:{x:900,y:750,radius:900}});return g;
}
// 目标处于主角前方，后方母体不能缩短小蛛的进攻半径。
function targets(g,count=5) {
 for(let i=0;i<count;i++){const e=g.spawnEnemy(0,0,{x:1080+(i%2)*60,y:620+i*55});Object.assign(e,{hp:1e8,maxHp:1e8,speed:0,damage:0,mass:1e6,flying:false,arena:g.player.arena});}
}
// 小步走真实供给、命中与敌人逻辑，避免大步跨过出舱和攻击前摇。
function step(g,seconds){for(let i=0;i<seconds*60;i++)g.update(1/60);}

test('满编固定3枪7重装，后排独立索敌，不继承飞行目标',()=>{
 const g=arena(15);targets(g);g.enemies[0].flying=true;step(g,5);
 assert.equal(g.mechanical.nodes.filter(n=>n.gun).length,3);
 assert.ok(g.mechanical.nodes.slice(0,3).every(n=>n.maxHp===60&&worldDistance(n,g.player)<140));
 assert.ok(g.mechanical.nodes.slice(3).every(n=>n.maxHp===300&&!n.gun&&n.targetId!==g.enemies[0].id));
 assert.ok(g.mechanical.nodes.slice(3).some(n=>worldDistance(n,g.player)>150));
 const dead=g.mechanical.nodes[0];hurtMechanical(g,dead,999);updateMechanical(g,.1);
 assert.ok(g.mechanical.nodes.slice(3).every(n=>!n.gun),'死亡不转移远程资格');
});
test('后七槽旧枪仓冻结，切换和数量成长不补给、不改变重装生命比例',()=>{
 const g=arena(15);updateMechanical(g,0);const n=g.mechanical.nodes[5];
 n.hp=120;n.guns={0:{magazine:{ammo:2,remaining:1},cooldown:.5}};const saved=JSON.stringify(n.guns);
 g.progress.mechanicalLoadout=null;updateMechanical(g,0);g.progress.mechanicalLoadout=9;updateMechanical(g,.1);
 assert.equal(n.hp,120);assert.equal(JSON.stringify(n.guns),saved);assert.equal(n.gun,null);
 g.progress.weaponParts[15].coordination=1;updateMechanical(g,0);g.progress.weaponParts[15].coordination=8;updateMechanical(g,0);
 assert.equal(n.hp,120);assert.equal(g.mechanical.nodes.filter(n=>n.gun).length,3);
});
test('四种车载混编与手持状态独立，各自最多3个枪架',()=>{
 for(let hull=0;hull<4;hull++){
  const g=arena(15);g.progress.vehicleIndex=hull;g.progress.vehicleLoadouts[hull]=15;g.reset();g.trees=[];g.enemies=[];g.vehicle.active=true;
  updateMechanical(g,0);for(let i=0;i<660;i++)updateVehicle(g,1/60);const local=vehicleCompanionContext(g);
  assert.equal(local.mechanical.nodes.filter(n=>n.active&&n.gun).length,3);
  assert.ok(local.mechanical.nodes.slice(3).every(n=>!n.gun&&n.maxHp===300));assert.notEqual(local.mechanical,g.mechanical);
 }
});
test('真实侧舱出生、先行走再攻击，暂停出舱不推进',()=>{
 const g=arena();targets(g);step(g,2.1);const n=g.spider.nodes[0],start={x:n.x,y:n.y};
 assert.equal(n.mode,'emerge');assert.ok(n.emerge>0);assert.ok(worldDistance(n,g.spider.mother)<60);assert.equal(n.targetId,null);
 const timer=n.emerge;updateSpider(g,.3,false);assert.equal(n.emerge,timer);
 step(g,.45);assert.ok(worldDistance(n,start)>20);step(g,.5);assert.equal(n.emerge,0);assert.ok(n.targetId);
});
test('二十蛛均分五敌并真正近战，母体周围不聚团',()=>{
 const g=arena();targets(g);const meleeHits=new Set(),modes=new Set(),hit=g.hit.bind(g);
 g.hit=(target,damage,critical,info)=>{if(info?.power===.65)meleeHits.add(target.id);hit(target,damage,critical,info);};
 for(let i=0;i<55*60;i++){g.update(1/60);g.spider.nodes.forEach(n=>modes.add(n.mode));}
 const nodes=g.spider.nodes.filter(n=>n.active&&n.hp>0),claims=new Map();for(const n of nodes)claims.set(n.targetId,(claims.get(n.targetId)||0)+1);
 assert.equal(nodes.length,20);assert.equal(claims.size,5,JSON.stringify({enemies:g.enemies.map(e=>[e.id,e.x,e.y,e.hp]),claims:[...claims],player:[g.player.x,g.player.y]}));assert.ok([...claims.values()].every(n=>n===4));assert.equal(meleeHits.size,5);
 assert.ok(nodes.every(n=>worldDistance(n,g.spider.mother)>63));assert.ok(modes.has('windup')&&modes.has('strike'));
 for(const a of nodes)for(const b of nodes)if(a!==b)assert.ok(worldDistance(a,b)>27,JSON.stringify({a:a.index,b:b.index,d:worldDistance(a,b),modes:[a.mode,b.mode],targets:[a.targetId,b.targetId]}));
});
