// 历法与图标使用同一自然时钟，覆盖完整轮转、手动跳转、暂停及离线边界。
import test from 'node:test';
import assert from 'node:assert/strict';
import { createNaturalClock } from '../src/world/natural-clock.js';
import { normalizeChronicle, chronicleSummary } from '../src/world/play-chronicle.js';
import { normalizeEnvironment, restartDayCycle, dayPhaseRemaining, beginEnvironmentVisit } from '../src/world/environment.js';
import { restartSeasonCycle, seasonRemaining, nextSeason } from '../src/world/seasons.js';
import { createSaveStore } from '../src/platform/storage.js';

// 测试使用可控墙钟，逐步推进真实入口函数，避免等待数分钟。
function fixture(extra={}) {
  let now=1000000;
  const env=normalizeEnvironment({forestSeason:'spring',time:'day',weather:'sun',autoWeather:false,...extra},now);
  const record=normalizeChronicle(null),clock=createNaturalClock(env,record,now);
  return {env,record,clock,get now(){return now;},tick(ms,active=true){now+=ms;clock.advance(active?ms:0,now,()=>0);}};
}

test('四季自然回到起点记一年；完整昼夜记一天，两个计数独立',()=>{
  const f=fixture();
  f.tick(120000);assert.equal(f.env.time,'dusk');assert.equal(f.record.days,0);
  f.tick(60000);assert.equal(f.env.time,'night');assert.equal(f.record.days,0);
  f.tick(120000);assert.equal(f.env.time,'day');assert.equal(f.record.days,1);assert.equal(f.env.forestSeason,'summer');
  f.tick(899999);assert.equal(f.record.years,0);
  f.tick(1);assert.equal(f.env.forestSeason,'spring');assert.equal(f.record.years,1);assert.equal(f.record.days,4);
  assert.equal(chronicleSummary(f.record).totalMs,1200000);
  assert.equal(seasonRemaining(f.env,f.now),300000);assert.equal(dayPhaseRemaining(f.env,f.now),120000);
});

test('从秋季/夜晚开始也必须自然经过整圈，不能在冬转春或夜转昼时提前入账',()=>{
  const f=fixture({forestSeason:'autumn',time:'night'});
  f.tick(120000);assert.equal(f.env.time,'day');assert.equal(f.record.days,0);
  f.tick(180000);assert.equal(f.env.time,'night');assert.equal(f.record.days,1);
  f.tick(300000);assert.equal(f.env.forestSeason,'spring');assert.equal(f.record.years,0);
  f.tick(600000);assert.equal(f.env.forestSeason,'autumn');assert.equal(f.record.years,1);
});

test('暂停和后台时间同时冻结圆环、历法与天气时长，恢复只计算新时间',()=>{
  const f=fixture();f.tick(110000);
  const before=structuredClone(f.record),seasonLeft=seasonRemaining(f.env,f.now),dayLeft=dayPhaseRemaining(f.env,f.now);
  f.tick(86400000,false);
  assert.deepEqual(f.record,before);assert.equal(seasonRemaining(f.env,f.now),seasonLeft);assert.equal(dayPhaseRemaining(f.env,f.now),dayLeft);
  f.tick(190000);assert.equal(f.record.days,1);assert.equal(f.env.time,'day');
});

test('反复手动跳转不入账、不补算跳过的阶段，随后自然整圈才增加',()=>{
  const f=fixture();f.tick(900000);
  const old={years:f.record.years,days:f.record.days};
  for(let i=0;i<8;i++){
    restartSeasonCycle(f.env,nextSeason(f.env.forestSeason),f.now);f.clock.restart('season');
    f.env.time=['day','dusk','night'][i%3];restartDayCycle(f.env,f.now);f.clock.restart('day');
  }
  assert.equal(f.record.years,old.years);assert.equal(f.record.days,old.days);
  f.tick(299999);assert.equal(f.record.days,old.days);assert.equal(f.record.years,0);
  f.tick(1);assert.equal(f.record.days,old.days+1);
  f.tick(900000);assert.equal(f.record.years,1);
});

test('关闭自动昼夜不会累计天；改时长不重算历史，按新阶段完整计数',()=>{
  const f=fixture({autoTime:false});f.tick(1200000);assert.equal(f.record.days,0);assert.equal(f.record.years,1);
  f.env.autoTime=true;f.env.timings={season:30000,day:30000,dusk:60000,night:90000,weather:30000};
  restartDayCycle(f.env,f.now);restartSeasonCycle(f.env,f.env.forestSeason,f.now);f.clock.restart('day');f.clock.restart('season');
  f.tick(120000);assert.equal(f.record.years,2);assert.equal(f.record.days,0);
  f.tick(60000);assert.equal(f.record.days,1);assert.equal(f.env.time,'day');
});

test('离线重新入场恢复阶段内进度，不用旧锚点补算，天气边界分别统计',()=>{
  const f=fixture({autoWeather:true});f.tick(120001);
  assert.equal(f.record.weatherMs.sun,120000);assert.equal(chronicleSummary(f.record).totalMs,120001);
  const old=structuredClone(f.record),arrival=f.now+86400000;
  beginEnvironmentVisit(f.env,arrival,()=>0);
  const clock=createNaturalClock(f.env,f.record,arrival);clock.advance(0,arrival);
  assert.deepEqual(f.record,old);assert.equal(seasonRemaining(f.env,arrival),179999);assert.equal(dayPhaseRemaining(f.env,arrival),59999);
});

test('经真实存储反复退出，最后十秒接着完成这一年和这一天，离线不计',()=>{
  const f=fixture();f.tick(1190000);
  const memory=new Map(),store=createSaveStore(()=>({getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)}));
  store.saveChronicle(f.record);store.saveEnvironment(f.env);
  let now=f.now,record,env,clock;
  for(let i=0;i<3;i++){
    now+=86400000;
    record=store.loadChronicle();const before=structuredClone(record);
    env=beginEnvironmentVisit(store.loadEnvironment(),now,()=>0,record.cycles.season?.phase);
    clock=createNaturalClock(env,record,now);clock.advance(0,now);
    assert.deepEqual(record,before);assert.equal(env.forestSeason,'winter');assert.equal(env.time,'night');
    assert.equal(seasonRemaining(env,now),10000-i*1000);assert.equal(dayPhaseRemaining(env,now),10000-i*1000);
    now+=1000;clock.advance(1000,now);store.saveChronicle(record);store.saveEnvironment(env);
  }
  now+=6999;clock.advance(6999,now);assert.equal(record.years,0);assert.equal(record.days,3);
  now++;clock.advance(1,now);assert.equal(record.years,1);assert.equal(record.days,4);
  assert.equal(env.forestSeason,'spring');assert.equal(env.time,'day');
  assert.equal(chronicleSummary(record).totalMs,1200000);
});

test('手动切季后退出只恢复新起点，完整昼夜的未完成进度独立保留',()=>{
  const f=fixture();f.tick(1190000);
  restartSeasonCycle(f.env,'summer',f.now);f.clock.restart('season');
  const record=normalizeChronicle(JSON.parse(JSON.stringify(f.record))),arrival=f.now+86400000;
  const env=beginEnvironmentVisit({},arrival,()=>0,record.cycles.season.phase),clock=createNaturalClock(env,record,arrival);
  assert.equal(env.forestSeason,'summer');assert.equal(seasonRemaining(env,arrival),300000);
  assert.equal(dayPhaseRemaining(env,arrival),10000);clock.advance(10000,arrival+10000);
  assert.equal(record.years,0);assert.equal(record.days,4);
});

test('旧档缺失进度兼容，损坏阶段不会产生计数，合法进度白名单保存',()=>{
  const record=normalizeChronicle({version:2,years:5,days:27,cycles:{
    season:{phase:'winter',steps:4,elapsed:Infinity,duration:300000},
    day:{phase:'night',steps:2,elapsed:119000,duration:120000,extra:'discard'}
  }});
  assert.equal(record.years,5);assert.equal(record.days,27);assert.equal(record.cycles.season,null);
  assert.equal(record.cycles.day.extra,undefined);
  const env=normalizeEnvironment({forestSeason:'spring'},1000000),clock=createNaturalClock(env,record,1000000);
  clock.advance(1000,1001000);assert.equal(record.years,5);assert.equal(record.days,28);
  assert.deepEqual(normalizeChronicle({version:2,years:5,days:27}).cycles,{season:null,day:null});
});
