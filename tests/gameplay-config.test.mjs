// 配置合同回归：默认行为保持旧基线，修改配置真正影响公式、战斗、交易和存档。
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GAMEPLAY_VALUES as V} from '../src/config/gameplay-values.js';
import {GAMEPLAY_TABLES as T} from '../src/config/gameplay-tables.js';
import {GAMEPLAY_VALUE_SCHEMA} from '../src/config/gameplay-value-schema.js';
import {validateGameplayConfig} from '../src/config/gameplay-validation.js';
import {loadGameplayCatalog} from '../src/config/gameplay-catalog.js';
import {waveDifficulty} from '../src/config/waves.js';
import {realmStageSpec} from '../src/config/realms.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {transactProgress} from '../src/progression/economy/transactions.js';
import {awardMastery} from '../src/progression/player/mastery.js';
import {MASTERY_THRESHOLDS} from '../src/config/weapon-mods.js';
import {footballReward} from '../src/config/slime-football.js';
import {fireBallistics} from '../src/combat/ballistics.js';
import {WEAPONS} from '../src/config/weapons.js';
import {applyImpulse} from '../src/physics/motion.js';
import {blessingSummary} from '../src/config/blessing-summary.js';
import {gameplaySnapshot} from './helpers/gameplay-snapshot.mjs';
import {auditGameplay} from '../scripts/gameplay-audit.mjs';
import {calendarView,projectLivingCalendar} from '../src/world/living-calendar.js';
import {LIVING_DAY_MS} from '../src/config/living-world.js';
import {validateRealmVehicles} from '../src/progression/realms/realm-vehicles.js';
import {VEHICLE_WEAPONS} from '../src/config/vehicle-armaments.js';
import {funnelEngagement} from '../src/combat/funnel-movement.js';
import {queueDroneManeuver} from '../src/combat/drone-movement.js';

// 每个用例恢复原对象，配置变异不会污染后续测试或模拟。
function withValue(object,key,value,run) {
  const previous=object[key];object[key]=value;
  try{return run();}finally{object[key]=previous;}
}
// 候选包含两种数据形态；完整往返 JSON 后仍能通过同一合同。
function candidate() {return JSON.parse(JSON.stringify({values:V,tables:T}));}

// 推导常量可能改变末位浮点舍入；只允许机器精度量级差异，结构和非数值必须完全一致。
function assertBaseline(actual,expected,path='root') {
  if(typeof actual==='number'&&typeof expected==='number') {
    assert.ok(Math.abs(actual-expected)<=Number.EPSILON*8*Math.max(1,Math.abs(expected)),`${path}：${actual} ≠ ${expected}`);
    return;
  }
  if(actual&&expected&&typeof actual==='object'&&typeof expected==='object') {
    assert.deepEqual(Object.keys(actual),Object.keys(expected),path);
    for(const key of Object.keys(expected))assertBaseline(actual[key],expected[key],`${path}.${key}`);
    return;
  }
  assert.equal(actual,expected,path);
}

test('默认公式、各级装备和全部弹道档位与重构前主分支基线一致',async()=>{
  const baseline=JSON.parse(await readFile(new URL('fixtures/gameplay-baseline.json',import.meta.url),'utf8'));
  assertBaseline(await gameplaySnapshot(),baseline);
});
test('键值与玩法表能够无损导出，拒绝缺字段、未知字段和非法数值',()=>{
  let c=candidate();assert.equal(validateGameplayConfig(c.values,c.tables),c.values);
  for(const value of [NaN,Infinity,-.1,1.01,'0.2']) {
    c=candidate();c.values.combat.criticalChance=value;
    assert.throws(()=>validateGameplayConfig(c.values,c.tables),/combat.criticalChance/);
  }
  c=candidate();delete c.values.wave.firstInterval;assert.throws(()=>validateGameplayConfig(c.values,c.tables),/缺少字段/);
  c=candidate();c.values.player.unused=10;assert.throws(()=>validateGameplayConfig(c.values,c.tables),/未知字段/);
  c=candidate();c.values.progress.maxEquipmentLevel=20.5;assert.throws(()=>validateGameplayConfig(c.values,c.tables),/安全整数/);
  c=candidate();c.tables.enemyAttacks.normal.lunge=0;assert.throws(()=>validateGameplayConfig(c.values,c.tables),/lunge/);
  c=candidate();c.tables.enemyMassByRank.pop();assert.throws(()=>validateGameplayConfig(c.values,c.tables),/enemyMassByRank/);
  c=candidate();c.tables.projectileProfiles.default.extra=2;assert.throws(()=>validateGameplayConfig(c.values,c.tables),/未知字段/);
});
test('跨字段验证拒绝会导致配额失效、负散布和供给缺项的候选',()=>{
  for(const mutate of [
    c=>c.values.ranged.every=c.values.ranged.ordinalRemainder,
    c=>c.values.fire.initialLitPerGroup=c.values.fire.treesPerGroup+1,
    c=>c.values.blessings.offerCount=7,
    c=>c.values.wave.firstBatch=c.values.wave.maxBatch+1,
    c=>c.values.parts.accuracyPerLevel=1,
    c=>c.values.mechanical.capacity=2,
  ]) {const c=candidate();mutate(c);assert.throws(()=>validateGameplayConfig(c.values,c.tables));}
});
test('只改怪潮与秘境参数即可改变正式配额和成长结果',()=>{
  const before=waveDifficulty(20).health;
  withValue(V.wave,'healthPerWave',.3,()=>assert.ok(waveDifficulty(20).health>before));
  withValue(V.realm,'firstCount',37,()=>assert.equal(realmStageSpec('tower',1).total,37));
  withValue(T.waveEarlyHealth,0,.3,()=>assert.equal(waveDifficulty(1).health,.3));
});
test('最高等级同时影响交易和读档，熟练度顶点直接来自已有成长表',()=>{
  withValue(V.progress,'maxEquipmentLevel',25,()=>{
    const p=freshProgress();p.weapons[0]=20;p.coins=p.wood=100000;
    assert.equal(transactProgress(p,'weapons',0,'upgrade'),true);assert.equal(p.weapons[0],21);
    p.weapons[0]=80;assert.equal(validateProgress(p).weapons[0],25);
  });
  withValue(MASTERY_THRESHOLDS,MASTERY_THRESHOLDS.length-1,700,()=>{
    const p=freshProgress();p.mastery[0]=699;awardMastery(p,0,'enemy');
    assert.equal(p.mastery[0],700);assert.equal(validateProgress(p).mastery[0],700);
  });
});
test('玩法奖励、弹丸运动及物理冲量实际消费配置',()=>{
  withValue(V.football,'coinsPerGoal',11,()=>assert.equal(footballReward(4).coins,44));
  withValue(T.projectileProfiles.default,'drag',.5,()=>{
    const game={trees:[],enemies:[],boss:null,player:{x:0,y:0},random:()=>.5,shots:[],projectiles:[]};
    fireBallistics(game,WEAPONS[0],{x:30,y:0},{x:1,y:0},18,false);
    assert.equal(game.projectiles[0].drag,.5);
  });
  withValue(V.physics,'impulseScale',2,()=>{
    const body={type:'enemy',mass:1};applyImpulse(body,{x:1,y:0},10);
    assert.equal(body.pushX,20);
  });
});
test('祝福摘要跟随配置并消除浮点尾数',()=>{
  const state={stage:1,cleared:0,buffs:{power:3},blessingCounts:{power:3}};
  assert.equal(blessingSummary('power',state).effect,'所有武器伤害 +60%');
  withValue(V.blessings,'powerPerStack',.15,()=>assert.equal(blessingSummary('power',state).effect,'所有武器伤害 +45%'));
});

test('飞控配置改变正式交战距离和无人机射后变位节奏',()=>{
  withValue(V.flight,'rangedRangeRatio',.5,()=>assert.equal(funnelEngagement({range:400},{radius:16}).preferred,200));
  withValue(V.drone,'shotsPerManeuver',3,()=>{
    const node={flight:{shots:0,pending:0}};
    queueDroneManeuver(node);queueDroneManeuver(node);assert.equal(node.flight.pending,0);
    queueDroneManeuver(node);assert.equal(node.flight.pending,V.drone.maneuverDelay);
  });
});

test('季节表同时驱动生活日期和剩余时间，读档弹量跟随部件配置',()=>{
  withValue(T.calendarTimings,'season',LIVING_DAY_MS*5,()=>{
    assert.equal(calendarView({day:5,elapsed:0}).season,'summer');
    assert.equal(calendarView({day:4,elapsed:0}).market,true);
    const environment={};projectLivingCalendar(environment,{day:1,elapsed:100});
    assert.equal(environment.livingSeasonRemaining,LIVING_DAY_MS*4-100);
  });
  withValue(V.progress,'maxPartLevel',8,()=>{
    const raw={index:0,hulls:[{modules:{0:{magazine:{ammo:99999}}}}]};
    const weapon=VEHICLE_WEAPONS[0];
    const expected=Math.floor((weapon.magazineSize+7*Math.max(1,Math.floor(weapon.magazineSize*V.parts.capacityPerLevel)))*V.vehicle.ammoMultiplier);
    assert.equal(validateRealmVehicles(raw).hulls[0].modules[0].magazine.ammo,expected);
  });
});
test('统一目录包含现有源表及新字段合同，快照与正式数据隔离',async()=>{
  const catalog=await loadGameplayCatalog();
  assert.ok(catalog.entries.some(e=>e.id==='weapons'&&e.exports.WEAPONS.length===WEAPONS.length));
  const row=catalog.fields.find(f=>f.path==='gameplay-values.GAMEPLAY_VALUES.combat.criticalChance');
  assert.equal(row.constraint.label,'普通射击暴击概率');
  row.constraint.max=999;
  assert.equal(GAMEPLAY_VALUE_SCHEMA['combat.criticalChance'].max,1);
  catalog.entries[0].exports.GAMEPLAY_VALUES.combat.criticalChance=.99;
  assert.equal(V.combat.criticalChance,.13);
  assert.deepEqual(JSON.parse(JSON.stringify(catalog)),catalog);
});
test('全部键值字段都有实际消费引用，未知或拼错路径不能通过审计',async()=>{
  const report=await auditGameplay(),used=new Set();
  for(const ref of report.references) {
    assert.ok(Object.hasOwn(GAMEPLAY_VALUE_SCHEMA,ref.path),`${ref.file}:${ref.line} 未知配置 ${ref.path}`);
    used.add(ref.path);
  }
  for(const path of Object.keys(GAMEPLAY_VALUE_SCHEMA))assert.ok(used.has(path),`配置没有消费入口：${path}`);
});
