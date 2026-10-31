// 可配置环境、累计历法和调试事务回归，覆盖新旧档案与独立周期。
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_TIMINGS, normalizeTimings, dayDuration } from '../src/world/environment-timing.js';
import { normalizeEnvironment, advanceEnvironment, dayPhaseRemaining, weatherRemaining, restartDayCycle } from '../src/world/environment.js';
import { seasonRemaining } from '../src/world/seasons.js';
import { normalizeChronicle, recordPlayTime, chronicleSummary } from '../src/world/play-chronicle.js';
import { freshProgress } from '../src/progression/progress.js';
import { debugGrantProgress } from '../src/progression/debug-grants.js';
import { createSaveStore } from '../src/platform/storage.js';
import { createProgressController } from '../src/app/progress-controller.js';
import { Game } from '../src/core/game.js';

test('旧档迁移默认每季5分/白昼2分/天气2分，非法配置限制范围',()=>{
  const state=normalizeEnvironment({time:'night',dayCycleAt:0,cycleVersion:2},1000000);
  assert.deepEqual(state.timings,DEFAULT_TIMINGS);assert.equal(dayPhaseRemaining(state,1000000),120000);
  assert.equal(dayDuration(state),300000);
  const t=normalizeTimings({season:NaN,day:1,dusk:Infinity,night:99999999,weather:45000});
  assert.equal(t.season,300000);assert.equal(t.day,30000);assert.equal(t.dusk,60000);assert.equal(t.night,3600000);assert.equal(t.weather,60000);
});

test('自定义周期驱动实际切换与圆环，三个时钟彼此独立',()=>{
  const state=normalizeEnvironment({forestSeason:'spring',autoWeather:false,timings:{season:60000,day:30000,dusk:60000,night:90000,weather:180000}},1000000);
  advanceEnvironment(state,1015000);assert.equal(dayPhaseRemaining(state,1015000),15000);assert.equal(seasonRemaining(state,1015000),45000);
  advanceEnvironment(state,1030000);assert.equal(state.time,'dusk');assert.equal(dayPhaseRemaining(state,1030000),60000);
  advanceEnvironment(state,1060000);assert.equal(state.forestSeason,'summer');assert.equal(state.time,'dusk');
  state.autoWeather=true;state.weatherAt=1060000;assert.equal(weatherRemaining(state,1150000),90000);
  state.time='night';const seasonAt=state.seasonAt,weatherAt=state.weatherAt;restartDayCycle(state,1100000);
  assert.equal(dayPhaseRemaining(state,1100000),90000);assert.equal(state.seasonAt,seasonAt);assert.equal(state.weatherAt,weatherAt);
});

test('天气时长不再折算历法，旧档保留天气并迁移真实轮转计数',()=>{
  const record=normalizeChronicle({version:1,days:365.5,weatherMs:{sun:1000}});
  assert.equal(record.years,0);assert.equal(record.days,0);
  recordPlayTime(record,300000*365,{weather:'sun'});
  recordPlayTime(record,150000,{weather:'rain'});
  const s=chronicleSummary(record);assert.equal(s.years,0);assert.equal(s.days,0);
  assert.ok(Math.abs(s.weather.reduce((sum,w)=>sum+w.percent,0)-100)<1e-8);
  const before=structuredClone(record);recordPlayTime(record,-5,{weather:'sun'});recordPlayTime(record,NaN,{weather:'sun'});assert.deepEqual(record,before);
  assert.deepEqual(normalizeChronicle({days:Infinity,weatherMs:{sun:-1}}),normalizeChronicle(null));
  assert.equal(normalizeChronicle({version:2,years:8,days:37}).years,8);
});

test('时长与累计档案独立保存恢复，离线读取不增加游玩统计',()=>{
  const memory=new Map(),store=createSaveStore(()=>({getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)}));
  const env=normalizeEnvironment({timings:{day:240000,weather:300000}},Date.now());store.saveEnvironment(env);
  assert.equal(store.loadEnvironment().timings.day,240000);
  const record=normalizeChronicle(null);recordPlayTime(record,1000,{weather:'rain'});store.saveChronicle(record);
  assert.deepEqual(store.loadChronicle(),record);assert.deepEqual(store.loadChronicle(),record);
});

test('Debug保留原等级和装备，资源增量有上限，失败不提交',()=>{
  const p=freshProgress();p.vehicleHulls[0]=7;p.coins=9999990;
  const vehicles=debugGrantProgress(p,'vehicles');assert.equal(vehicles.vehicleHulls[0],7);assert.ok(vehicles.vehicleHulls.every(v=>v>0));assert.equal(p.vehicleHulls[1],0);
  const resources=debugGrantProgress(p,'resources');assert.equal(resources.coins,9999999);assert.equal(resources.wood,p.wood+9999);assert.ok(Object.values(resources.materials).every(v=>v===9999));
  const game=new Game(p),original=structuredClone(game.progress),store={available:false,saveProgress:()=>false};
  const controller=createProgressController({game,store,root:{getElementById:()=>({textContent:''})},refresh(){}});
  assert.equal(controller.debugGrant('resources'),false);assert.deepEqual(structuredClone(game.progress),original);
  store.saveProgress=()=>true;assert.equal(controller.debugGrant('vehicles'),true);assert.ok(game.progress.vehicleHulls.every(v=>v>0));
});
