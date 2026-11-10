// 地貌团子针对性回归：自然选种、湖界、暂停、锁点、中断和共享弹量。
import test from 'node:test';
import assert from 'node:assert/strict';
import {BIOME_DUMPLINGS,dumplingShotAngles} from '../src/config/biome-dumplings.js';
import {NATURAL_TERRAIN} from '../src/world/natural-terrain.js';
import {regionalDumpling,dumplingWaterFits,nearbyWaterDumplingSpot} from '../src/world/dumpling-habitats.js';
import {updateBiomeDumpling} from '../src/combat/biome-dumplings.js';
import {updateEnemyAttack,createEnemyAttack} from '../src/combat/enemy-attack.js';
import {blocked,moveBody} from '../src/physics/motion.js';
import {WORLD} from '../src/world/coordinates.js';
import {RANGED_LIMITS} from '../src/config/ranged-enemies.js';
import {updateEnemyBolts} from '../src/combat/ranged-enemies.js';
import {Game,freshProgress} from '../src/game.js';

// 开放平台仅隔离弹道状态；水界测试另使用真实湖泊。
function fixture(p){const enemy={id:1,type:'enemy',species:'slime',dumplingVariant:p.id,x:2000,y:2000,hp:100,damage:8,speed:30,radius:16,arena:{x:2000,y:2000,radius:700},assault:{phase:'chase',elapsed:0}};const player={x:2080,y:2000,hp:100};return {enemy,player,game:{player,enemies:[enemy],trees:[],enemyBolts:[],rangedShotTimer:0}};}

test('十五种身份、结构和攻击组合唯一，真实地貌可选齐',()=>{
  assert.equal(BIOME_DUMPLINGS.length,15);
  for(const field of ['id','name','shape','attack'])assert.equal(new Set(BIOME_DUMPLINGS.map(p=>p[field])).size,15);
  for(const habitat of ['snowpeak','volcano','rainforest','strata','rift']){
    const f=NATURAL_TERRAIN.earth.find(f=>f.kind===habitat),seen=new Set();
    for(let i=0;i<6;i++)seen.add(regionalDumpling(f,i)?.id);
    assert.deepEqual([...seen].sort(),BIOME_DUMPLINGS.filter(p=>p.habitat===habitat).map(p=>p.id).sort());
  }
});

test('所有攻击锁点释放，暂停不推进，弹道角与预警一致',()=>{
  for(const p of BIOME_DUMPLINGS.filter(p=>p.pattern!=='charge')){const {game,enemy,player}=fixture(p);
    updateBiomeDumpling(game,enemy,player,.01);assert.equal(enemy.assault.phase,'windup');
    const locked={...enemy.assault};updateBiomeDumpling(game,enemy,player,0);assert.deepEqual(enemy.assault,locked);
    player.y+=100;updateBiomeDumpling(game,enemy,player,p.windup+.01);
    const angles=dumplingShotAngles(p,Math.atan2(locked.dirY,locked.dirX));
    assert.equal(game.enemyBolts.length,angles.length,p.id);assert.equal(enemy.assault.phase,'recovery');
    game.enemyBolts.forEach((b,i)=>{assert.ok(Math.abs(b.dx-Math.cos(angles[i]))<1e-8);assert.equal(b.endY,locked.endY);assert.equal(b.radius,p.radius);});
  }
});

test('击退中断施法，满弹量不会溢出，死亡不再释放',()=>{
  const p=BIOME_DUMPLINGS[0],{game,enemy,player}=fixture(p);
  updateBiomeDumpling(game,enemy,player,.01);enemy.knockTime=.1;updateBiomeDumpling(game,enemy,player,3);assert.equal(enemy.assault.phase,'recovery');assert.equal(game.enemyBolts.length,0);
  enemy.knockTime=0;enemy.assault.phase='chase';updateBiomeDumpling(game,enemy,player,.01);game.enemyBolts=Array(RANGED_LIMITS.bolts).fill({});updateBiomeDumpling(game,enemy,player,3);assert.equal(game.enemyBolts.length,RANGED_LIMITS.bolts);
  game.enemyBolts=[];enemy.hp=0;updateBiomeDumpling(game,enemy,player,3);assert.equal(game.enemyBolts.length,0);
});

test('水团在真实湖内出生，物理移动和击退均不能上岸，陆地单位仍不能入湖',()=>{
  const lake=NATURAL_TERRAIN.lakes.find(l=>dumplingWaterFits(l.x,l.y,20));assert.ok(lake);
  assert.ok(nearbyWaterDumplingSpot({x:lake.x-220,y:lake.y},0));
  assert.equal(blocked(lake.x,lake.y,16,[],{mapId:'forest'}),true);
  const body={...lake,type:'enemy',mapId:'forest',radius:16,amphibious:true,aquatic:true};
  moveBody(body,1500,0,WORLD,16,[]);assert.ok(dumplingWaterFits(body.x,body.y,16));assert.ok(body.x<lake.x+1500);
  const g=new Game(freshProgress(),()=>.5);g.start();g.enemies=[];
  const e=g.spawnEnemy(0,0,lake,{ambient:true,dumplingVariant:'bubble'});assert.equal(e.dumplingVariant,'bubble');assert.equal(e.aquatic,true);assert.equal(e.flying,false);
  const dry=g.spawnEnemy(0,0,{x:870,y:750},{ambient:true,dumplingVariant:'bubble'});assert.equal(dry.dumplingVariant,undefined);
});

// 黑曜团子走正式碰撞扑击，不靠射弹模拟冲锋。
test('黑曜冲刺有实际位移并沿锁定路线造成一次近战伤害',()=>{const p=BIOME_DUMPLINGS.find(p=>p.id==='obsidian'),{enemy,player}=fixture(p);enemy.assault=createEnemyAttack();updateEnemyAttack(enemy,player,player,.01,WORLD);assert.equal(enemy.assault.phase,'windup');const x=enemy.x;const damage=updateEnemyAttack(enemy,player,player,p.windup+p.lunge,WORLD);assert.ok(enemy.x>x+20);assert.equal(damage,enemy.damage);});

// 正式普通团子的历史数据没有species字段，自然出生仍须进入本地变体。
test('不传调试身份时，正式出生工厂会按雪山地貌生成团子',()=>{const g=new Game(freshProgress(),()=>.5);g.start();const f=NATURAL_TERRAIN.earth.find(f=>f.kind==='snowpeak');const point={x:f.x,y:f.y+f.ry+100};const e=g.spawnEnemy(0,0,point,{ambient:true,rangedEncounter:true});assert.ok(BIOME_DUMPLINGS.filter(p=>p.habitat==='snowpeak').some(p=>p.id===e.dumplingVariant));});

// 真正调用共用弹丸命中器，避免仅有发射动画而没有伤害或掩体拦截。
test('巨泡和落砸进入正式命中结算，树干阻挡且死亡弹丸立即回收',()=>{
  for(const id of ['bubble','lavapot'])for(const cover of [false,true]){
    const p=BIOME_DUMPLINGS.find(p=>p.id===id),{game,enemy,player}=fixture(p);let damage=0;
    Object.assign(game,{state:'playing',hurt:amount=>{damage+=amount;},fx:{add(){}}});
    updateBiomeDumpling(game,enemy,player,.01);updateBiomeDumpling(game,enemy,player,p.windup+.01);
    if(cover)game.trees=[{x:2040,y:1992,hp:100,radius:18}];
    for(let i=0;i<100;i++)updateEnemyBolts(game,.05,player);
    assert.equal(damage,cover?0:enemy.damage,id);assert.equal(game.enemyBolts.length,0);
    game.enemyBolts=[{owner:enemy.id,remaining:100,x:2000,y:2000,dx:1,dy:0,speed:100,radius:4}];enemy.hp=0;updateEnemyBolts(game,.05,player);assert.equal(game.enemyBolts.length,0);
  }
});
