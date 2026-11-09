// 栅栏回归使用正式追击、刚体和出生入口，覆盖重叠解困、绕角及安全区保护。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {updateEnemies} from '../src/core/battle/enemy-manager.js';
import {findArrivalSpot,findNearbyArrivalSpot} from '../src/core/battle/enemy-arrival.js';
import {createEnemyAttack,updateEnemyAttack} from '../src/combat/enemy-attack.js';
import {releaseSettlementOverlap} from '../src/physics/settlement-pursuit.js';
import {blocked,stepBodies} from '../src/physics/motion.js';
import {settlementAt,settlementBlocked} from '../src/world/settlements.js';
import {WORLD,worldDistance} from '../src/world/coordinates.js';
import {SETTLEMENTS} from '../src/config/settlements.js';
import {ARMORED} from '../src/config/armored-enemies.js';

const camp=SETTLEMENTS[0];
// 固定随机数与真实森林边界；不依赖存档或玩家武器开火。
function scene(){let seed=71;const g=new Game(freshProgress(),()=>((seed=(seed*1664525+1013904223)>>>0)/2**32));g.state='playing';g.enemies=[];g.remnants=[];g.trees=[];g.player.x=camp.right+180;g.player.y=400;g.setViewport(390,844);return g;}
// 小团子保留正式扑击状态和脚底碰撞，避免测试直接修改移动结果。
function enemy(x,y){return {id:1,type:'enemy',mapId:'forest',x,y,radius:17,hp:100,maxHp:100,speed:60,damage:1,assault:createEnemyAttack()};}

test('出生选点为实体和栅栏留足间距，近距与画外刷怪均不落在栏杆内',()=>{
 const g=scene();g.player.x=camp.right+60;let count=0;
 for(let i=0;i<100;i++)for(const spot of [findArrivalSpot(g,i),findNearbyArrivalSpot(g,i,{minDistance:90,maxDistance:250})])if(spot){count++;assert.equal(settlementAt(spot),null);assert.equal(blocked(spot.x,spot.y,28,[],{mapId:'forest'}),false);}
 assert.ok(count>100);
});

test('栏杆内外两侧重叠怪物经正式更新脱困并继续追击，生命和名额不变',()=>{
 for(const offset of [-6,0,6]){
  const g=scene(),e=enemy(camp.right+offset,400);g.enemies=[e];assert.equal(settlementBlocked(e.x,e.y,e.radius),true);
  updateEnemies(g,1/60,g.player);assert.equal(settlementBlocked(e.x,e.y,e.radius),false);assert.equal(settlementAt(e),null);
  const distance=worldDistance(e,g.player);for(let i=0;i<120;i++)updateEnemies(g,1/60,g.player);
  assert.ok(worldDistance(e,g.player)<distance-50);assert.equal(e.hp,100);assert.equal(g.enemies.length,1);
 }
});

for(const dt of [1/30,1/120])for(const mirror of [0,1])test(`${Math.round(1/dt)}帧聚落拐角追击${mirror?'覆盖循环世界':''}`,()=>{
 const offset={x:mirror*WORLD.width,y:-mirror*WORLD.height},e=enemy(camp.right+30+offset.x,camp.top+90+offset.y),target={x:camp.right-90+offset.x,y:camp.top-40+offset.y,mapId:'forest'};
 let damage=0;
 for(let i=0;i<10/dt;i++){stepBodies([e],dt,WORLD);damage+=updateEnemyAttack(e,target,target,dt,WORLD);assert.equal(settlementAt(e),null);assert.equal(settlementBlocked(e.x,e.y,12),false);}
 assert.ok(damage>0,'必须绕过拐角后实际命中玩家');
});

test('群体推挤及击退后仍能沿外栏绕角，不能穿栏抄近路',()=>{
 const units=Array.from({length:5},(_,i)=>({...enemy(camp.right+20+i*25,camp.top+80+i*20),id:i+1,pushX:-40}));
 const target={x:camp.right-90,y:camp.top-40,mapId:'forest'},arrived=new Set();
 for(let i=0;i<600;i++){for(const e of units)releaseSettlementOverlap(e);stepBodies(units,1/30,WORLD);for(const e of units){if(updateEnemyAttack(e,target,target,1/30,WORLD))arrived.add(e.id);assert.equal(settlementAt(e),null);assert.equal(settlementBlocked(e.x,e.y,12),false);}}
 assert.equal(arrived.size,5);
});

test('目标进入安全区后不能隔栏扑击，离开后重新追击',()=>{
 const e=enemy(camp.right+24,400),target={x:camp.right-20,y:400,mapId:'forest'};let damage=0;
 for(let i=0;i<120;i++)damage+=updateEnemyAttack(e,target,target,1/60,WORLD);
 assert.equal(damage,0);assert.equal(e.assault.phase,'chase');assert.equal(settlementAt(e),null);
 target.x=camp.right+100;for(let i=0;i<240;i++)damage+=updateEnemyAttack(e,target,target,1/60,WORLD);assert.ok(damage>0);
});

test('铁甲木卫按自身较大碰撞半径脱困并绕栏，正常血量不受修正影响',()=>{
 const e={...enemy(camp.right+10,camp.top+90),species:ARMORED.id,radius:ARMORED.radius},target={x:camp.right-90,y:camp.top-60,mapId:'forest'};
 assert.equal(releaseSettlementOverlap(e),true);assert.equal(settlementBlocked(e.x,e.y,e.radius),false);
 let damage=0;for(let i=0;i<600;i++){damage+=updateEnemyAttack(e,target,target,1/60,WORLD);assert.equal(settlementBlocked(e.x,e.y,e.radius),false);}
 assert.ok(damage>0);assert.equal(e.hp,100);
});

test('脱困只处理普通森林栏杆重叠，不移动飞行、章节、秘境或正常站位',()=>{
 for(const extra of [{hp:0},{flying:true},{story:true},{arena:{x:camp.right,y:400,radius:500}},{mapId:'jiuzhaigou'},{x:camp.right+80}]){const e={...enemy(camp.right+5,400),...extra},before={x:e.x,y:e.y};assert.equal(releaseSettlementOverlap(e),false);assert.deepEqual({x:e.x,y:e.y},before);}
});
