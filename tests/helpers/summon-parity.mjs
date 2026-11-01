// 固定场景回放召唤物，快照同时覆盖动作、伤害、供给和车载独立状态。
import { createHash } from 'node:crypto';
import { vehicleCombatFixture } from './vehicle-combat-fixture.mjs';
import { freshProgress } from '../../src/progression/progress.js';
import { updateMechanical } from '../../src/combat/mechanical.js';
import { updateSpider } from '../../src/combat/spider.js';
import { updateFunnel } from '../../src/combat/funnel.js';
import { updateVehicle } from '../../src/combat/vehicle.js';
import { advanceReload } from '../../src/combat/magazine.js';

// 对象字段排序只供测试签名使用，不改变运行时状态或随机调用顺序。
function ordered(value) {
  if(Array.isArray(value))return value.map(ordered);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,ordered(value[k])]));
  return value;
}

// 全部装备预先拥有，旧车载模块显式回放；新主炮规则由独立测试覆盖。
export function replaySummon(index,mounted,variable=false) {
  let seed=7291,shots=0;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const p=freshProgress();p.weapons.fill(3);p.vehicleWeapons.fill(2);p.vehicleHulls.fill(1);
  p.weapon=index;p.vehicleLoadouts[0]=index;p.funnelLoadout=[9,7,12];p.mechanicalLoadout=9;p.spiderLoadout=7;
  p.weaponParts[15].coordination=p.turretParts[15].coordination=8;
  const g=vehicleCombatFixture(p,random);g.fx.random=()=>.5;g.state='playing';g.enemies=[];g.trees=[];g.boss=null;
  Object.assign(g.player,{x:900,y:800,arena:{x:900,y:800,radius:900}});g.vehicle.active=mounted;
  g.onEvent=kind=>{if(kind==='shot')shots++;};
  for(let i=0;i<5;i++){const e=g.spawnEnemy(0,0,{x:960+i*45,y:780+i*24});Object.assign(e,{hp:100000,maxHp:100000,speed:0,flying:i===4,arena:g.player.arena});}
  const update=index===15?updateMechanical:index===16?updateSpider:updateFunnel;
  const samples=[];
  for(let frame=0;frame<720;frame++) {
    const dt=variable?[1/30,1/120,1/40][frame%3]:1/60;
    g.player.x+=frame<200?.3:frame<400?-.2:0;g.player.y+=frame<200?.1:frame<400?.25:0;
    if(frame===350)g.enemies[0].hp=0;
    if(mounted)updateVehicle(g,dt);
    else {advanceReload(g.magazines[index],g.weapon(),dt);update(g,dt);}
    g.fx.update(dt);g.time+=dt;
    if(frame%120===119)samples.push({state:structuredClone(mounted?g.vehicle.module.companions:g[g.weapon().controller]),
      magazines:structuredClone(mounted?g.vehicle.module.magazine:g.magazines[index]),shots,
      enemies:g.enemies.map(e=>({id:e.id,hp:e.hp})),bullets:structuredClone(g.bullets),fx:structuredClone({items:g.fx.items,shake:g.fx.shake}),seed});
  }
  return createHash('sha256').update(JSON.stringify(ordered(samples))).digest('hex');
}
