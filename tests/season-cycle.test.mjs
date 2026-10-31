// 四季时间顺序、入场随机和手动重新计时的行为回归。
import test from 'node:test';
import assert from 'node:assert/strict';
import { SEASONS, SEASON_DURATION, SEASON_CYCLE_DURATION, restartSeasonCycle, advanceSeasonCycle, seasonRemaining } from '../src/world/seasons.js';
import { beginEnvironmentVisit, normalizeEnvironment, advanceEnvironment } from '../src/world/environment.js';
import { SEASON_WEATHER_WEIGHTS } from '../src/world/season-weather.js';

test('每季五分钟按春夏秋冬循环，后台跳过整轮不漂移',()=>{
 const state={};restartSeasonCycle(state,'spring',1000);
 assert.equal(SEASON_DURATION,300000);assert.equal(SEASON_CYCLE_DURATION,1200000);
 assert.equal(advanceSeasonCycle(state,300999),false);assert.equal(state.forestSeason,'spring');
 for(let i=1;i<=8;i++) {
  const now=1000+i*SEASON_DURATION;assert.equal(advanceSeasonCycle(state,now),true);
  assert.equal(state.forestSeason,SEASONS[i%4]);assert.equal(state.seasonAt,now);assert.equal(seasonRemaining(state,now),SEASON_DURATION);
 }
 advanceSeasonCycle(state,1000+SEASON_DURATION*103+750);assert.equal(state.forestSeason,'winter');assert.equal(seasonRemaining(state,1000+SEASON_DURATION*103+750),SEASON_DURATION-750);
});
test('手动选择重新计时，系统回拨与旧锚点可恢复',()=>{
 const state=normalizeEnvironment({forestSeason:'winter'},1000);
 restartSeasonCycle(state,'summer',250000);assert.equal(advanceSeasonCycle(state,549999),false);
 assert.equal(advanceSeasonCycle(state,550000),true);assert.equal(state.forestSeason,'autumn');
 assert.equal(advanceSeasonCycle(state,200),false);assert.equal(state.seasonAt,200);assert.equal(seasonRemaining(state,200),300000);
});
test('每次进入均匀随机一个季节和匹配天气，保留昼夜与自动偏好',()=>{
 const counts=Object.fromEntries(SEASONS.map(s=>[s,0]));
 for(let i=0;i<100;i++) {
  let calls=0;const state={forestSeason:'winter',weather:'thunder',time:'night',autoTime:false,autoWeather:false};
  beginEnvironmentVisit(state,12345,()=>{calls++;return calls===1?i/100:.8;});
  counts[state.forestSeason]++;assert.ok(SEASON_WEATHER_WEIGHTS[state.forestSeason][state.weather]>0);
  assert.equal(state.seasonAt,12345);assert.equal(state.weatherAt,12345);assert.equal(calls,2);
  assert.equal(state.time,'night');assert.equal(state.autoTime,false);assert.equal(state.autoWeather,false);
 }
 assert.deepEqual(Object.values(counts),[25,25,25,25]);
});
test('自动换季先选新季天气且仅抽一次，手动天气保留',()=>{
 const state=normalizeEnvironment({forestSeason:'winter',weather:'snow',autoTime:false},0);
 let calls=0;advanceEnvironment(state,SEASON_DURATION,()=>{calls++;return .5;});
 assert.equal(state.forestSeason,'spring');assert.notEqual(state.weather,'snow');assert.equal(calls,1);assert.equal(state.weatherAt,SEASON_DURATION);
 const manual=normalizeEnvironment({forestSeason:'winter',weather:'snow',autoTime:false,autoWeather:false},0);
 advanceEnvironment(manual,SEASON_DURATION,()=>{throw Error('手动天气不应自动抽签');});assert.equal(manual.forestSeason,'spring');assert.equal(manual.weather,'snow');
});
