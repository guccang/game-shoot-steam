// 季节概率与统一随机入口回归，确保手动设置仍可保留非当季天气。
import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseSeasonWeather, SEASON_WEATHER_WEIGHTS } from '../src/world/season-weather.js';
import { normalizeEnvironment, advanceEnvironment, WEATHER_INTERVAL } from '../src/world/environment.js';

test('排除当前天气后按季节权重抽取，冬雪与春夏晴雨占主导',()=>{
 for(const [season,weights] of Object.entries(SEASON_WEATHER_WEIGHTS))for(const current of Object.keys(weights)) {
  const counts=Object.fromEntries(Object.keys(weights).map(id=>[id,0]));
  for(let i=0;i<10000;i++)counts[chooseSeasonWeather(season,current,()=>i/10000)]++;
  assert.equal(counts[current],0);
  const total=Object.entries(weights).reduce((s,[id,w])=>s+(id===current?0:w),0);
  for(const [id,w] of Object.entries(weights))assert.ok(Math.abs(counts[id]-(id===current?0:w/total*10000))<=2);
  if(season==='winter'&&current!=='snow')assert.ok(counts.snow>=6000);
  if(['spring','summer'].includes(season)){assert.equal(counts.snow,0);assert.ok(counts.sun+counts.rain>=6000);}
 }
});
test('自动天气调用季节分布，关闭自动后指定夏雪仍保留',()=>{
 for(const season of Object.keys(SEASON_WEATHER_WEIGHTS)) {
  const state=normalizeEnvironment({forestSeason:season,weather:'cloud',autoTime:false},0);
  advanceEnvironment(state,WEATHER_INTERVAL,()=>.8);
  assert.equal(state.weather,chooseSeasonWeather(season,'cloud',()=>.8));
 }
 const manual=normalizeEnvironment({forestSeason:'summer',weather:'snow',autoWeather:false,autoTime:false},0);
 advanceEnvironment(manual,WEATHER_INTERVAL*10);assert.equal(manual.weather,'snow');
});
