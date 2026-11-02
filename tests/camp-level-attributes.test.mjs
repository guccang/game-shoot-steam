// 营地等级回归：正式出生、实际扣血、周边等级、世界镜像与独立清缴数值。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {MONSTER_CAMPS,MONSTER_CAMP_RULES as RULES,monsterCampTerritoryAt} from '../src/config/monster-camps.js';
import {monsterCampLevel,updateMonsterCamps} from '../src/core/monster-camps.js';
import {enemyIdentity} from '../src/world/biomes.js';
import {forestThreatAt} from '../src/world/forest-levels.js';
import {grantVehicleArmament} from '../src/config/vehicle-armaments.js';
import {summonVehicle} from '../src/combat/vehicle.js';
import {GAMEPLAY_TABLES} from '../src/config/gameplay-tables.js';
import {WORLD} from '../src/world/coordinates.js';

const camp=MONSTER_CAMPS.find(c=>c.id==='last-supper');
// 使用正式游戏工厂，只隔离保存；玩家装备和清缴进度可分别设置。
function scene(rounds=0,equipmentLevel=1){
 const p=freshProgress();p.bosses=rounds;p.weapons[0]=equipmentLevel;p.heroes[0]=equipmentLevel;
 const g=new Game(p,()=>.5);g.start();g.livingPersist=()=>true;g.enemies=[];Object.assign(g.player,camp);return g;
}

test('20级营地五种怪物使用实际20级属性，不随清缴轮数或装备降级',()=>{
 const expected=[['ironwood-bulwark',17762,106],['slime',3947,96],['stump-bombard',5723,130],['reed-archer',3552,82],['leaf-bat',2960,82]];
 for(const [rounds,equipment] of [[0,1],[19,20]]){
  const g=scene(rounds,equipment);updateMonsterCamps(g,.04);
  assert.equal(monsterCampLevel(camp),20);
  assert.deepEqual(g.enemies.map(e=>[e.species,e.maxHp,e.damage]),expected);
  for(const e of g.enemies){assert.equal(e.level,20);assert.equal(e.hp,e.maxHp);}
  const slime=g.enemies.find(e=>e.species==='slime');
  for(let i=0;i<4;i++)g.hit(slime,40);
  assert.equal(slime.hp,3787);assert.ok(g.enemies.includes(slime));
 }
});

test('20级营地各方向650单位内的真实野怪全部为20级，包含原19级区域',()=>{
 const g=scene();let oldLower=0;
 for(const radius of [0,200,340,600,649])for(let i=0;i<16;i++){
  const angle=i*Math.PI/8,point={x:camp.x+Math.cos(angle)*radius,y:camp.y+Math.sin(angle)*radius};
  if(forestThreatAt(point.x,point.y).level<20)oldLower++;
  const e=g.spawnEnemy(0,0,point,{ambient:true});
  assert.equal(e.level,20);assert.equal(e.hp,3947);assert.equal(e.maxHp,3947);assert.equal(e.damage,96);
 }
 assert.ok(oldLower>0,'必须覆盖此前会误刷19级怪的位置');
});

test('周边出生保留阶级倍率，固定等级清缴不套用20级属性',()=>{
 const p={x:camp.x-340,y:camp.y},g=scene();
 for(const roll of [0,.9,.999]){
  const expected=enemyIdentity(camp.x,camp.y,roll),actual=enemyIdentity(p.x,p.y,roll);
  for(const key of ['level','rank','hp','damage','speed'])assert.equal(actual[key],expected[key]);
 }
 const fixed=enemyIdentity(p.x,p.y,0,'forest',1);assert.equal(fixed.level,1);assert.equal(fixed.hp,36);
 const clearing=g.spawnEnemy(0,0,p);assert.equal(clearing.level,1);assert.ok(clearing.maxHp<36);
});

test('全部营地周边共用中心等级，重叠区域使用最近营地且不同地图隔离',()=>{
 for(const c of MONSTER_CAMPS){
  const point={x:c.x+300,y:c.y};assert.equal(monsterCampTerritoryAt(point.x,point.y,c.mapId)?.id,c.id);
  assert.equal(enemyIdentity(point.x,point.y,0,c.mapId).level,monsterCampLevel(c));
 }
 const [a,b]=MONSTER_CAMPS,mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
 assert.equal(monsterCampTerritoryAt(mid.x+1,mid.y)?.id,a.id);
 assert.equal(monsterCampTerritoryAt(mid.x-1,mid.y)?.id,b.id);
 assert.equal(monsterCampTerritoryAt(camp.x,camp.y,'jiuzhaigou'),null);
});

test('营地等级范围使用循环世界距离，范围外恢复原地区等级',()=>{
 for(const dx of [-WORLD.width,0,WORLD.width])for(const dy of [-WORLD.height,0,WORLD.height]){
  const e=enemyIdentity(camp.x-340+dx,camp.y+dy,0);assert.equal(e.level,20);assert.equal(e.hp,3947);
 }
 const edge={x:camp.x-RULES.territoryRadius,y:camp.y};assert.equal(enemyIdentity(edge.x,edge.y,0).level,20);
 const outside={x:edge.x-1,y:edge.y};assert.equal(monsterCampTerritoryAt(outside.x,outside.y),null);
 assert.equal(enemyIdentity(outside.x,outside.y,0).level,forestThreatAt(outside.x,outside.y).level);
 assert.equal(RULES.radius,150*Math.sqrt(1.3)*1.3);assert.equal(RULES.warningRadius,RULES.radius+35);
});

// 对照真实地图出生入口，确保攻击加成不会串入指定等级活动或低级营地。
test('营地攻击按等级平滑提升，低级营地、固定等级活动和范围外野怪保留原攻击',()=>{
 for(const c of MONSTER_CAMPS){
  const e=enemyIdentity(c.x,c.y,0,c.mapId),fixed=enemyIdentity(c.x,c.y,0,c.mapId,e.level);
  if(e.level<=5)assert.equal(e.damage,fixed.damage);
  else assert.ok(e.damage>fixed.damage);
  for(let level=1;level<=20;level++)for(const [rank,roll] of [0,.9,.999].entries()){
   assert.equal(enemyIdentity(c.x,c.y,roll,c.mapId,level).damage,Math.round((8+(level-1)*1.6)*GAMEPLAY_TABLES.enemyDamageByRank[rank]));
  }
 }
 const outside={x:camp.x-RULES.territoryRadius-1,y:camp.y},e=enemyIdentity(outside.x,outside.y,0);
 assert.equal(e.damage,Math.round(8+(e.level-1)*1.6));
});

// 使用实际受伤和载具损毁入口验证有效命中数；每次清除无敌代表间隔后的独立命中。
test('装甲、引擎和主炮均Lv4气垫船受到20级营地攻击会正常扣甲、保护驾驶员并损毁',()=>{
 for(const [hero,hullHp,slimeHits] of [[1,450,5],[4,630,7]]){
  const p=freshProgress();p.heroes[p.hero]=hero;p.vehicleIndex=3;p.vehicleHulls[3]=4;
  p.vehicleParts[3]={engine:4};grantVehicleArmament(p,3);p.vehicleWeapons[20]=4;
  const g=new Game(p,()=>.5);g.start();Object.assign(g.player,camp);g.enemies=[];
  updateMonsterCamps(g,.04);assert.equal(summonVehicle(g),true);assert.equal(g.vehicle.maxHp,hullHp);
  const driverHp=g.player.hp;
  for(const enemy of g.enemies){
   g.vehicle.hp=hullHp;g.player.invincible=0;g.hurt(enemy.damage);
   assert.equal(g.vehicle.hp,hullHp-enemy.damage);assert.equal(g.player.hp,driverHp);
   g.hurt(enemy.damage);assert.equal(g.vehicle.hp,hullHp-enemy.damage,'同一无敌窗口不重复扣甲');
  }
  g.vehicle.hp=hullHp;
  const slime=g.enemies.find(e=>e.species==='slime');let hits=0;
  while(g.vehicle.active&&hits<20){g.player.invincible=0;g.hurt(slime.damage);hits++;}
  assert.equal(hits,slimeHits);assert.equal(g.vehicle.hp,0);assert.equal(g.vehicle.active,false);
  assert.equal(g.vehicle.cooldown,60);assert.equal(g.player.hp,driverHp);
 }
});
