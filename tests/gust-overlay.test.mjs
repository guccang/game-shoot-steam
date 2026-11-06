// 共存、暂停和旧档迁移均从正式环境与局部风场入口验证。
import test from 'node:test';
import assert from 'node:assert/strict';
import {GustCycle,gustStrength} from '../src/world/gust.js';
import {WEATHER_TYPES,normalizeEnvironment,EnvironmentTransition} from '../src/world/environment.js';
import {SEASON_WEATHER_WEIGHTS} from '../src/world/season-weather.js';
import {WORLD} from '../src/world/coordinates.js';
import {createSaveStore} from '../src/platform/storage.js';

test('每种主天气均可起风，起停与局部延迟独立于降水和昼夜',()=>{
 for(const weather of WEATHER_TYPES){
  const env=normalizeEnvironment({weather,time:'night',autoWeather:false},0);
  const light=new EnvironmentTransition(env).sample(0),cycle=new GustCycle(()=>.5);
  assert.equal(cycle.sample(0,400,env.randomGusts),null);
  const wave=cycle.sample(cycle.nextAt,400,true),peak=wave.start+.5+wave.duration/2;
  assert.ok(gustStrength(peak,400,wave)>.6);
  assert.equal(gustStrength(peak,400,wave),gustStrength(peak,400+WORLD.width,wave));
  assert.ok(gustStrength(wave.start+1,600,wave)>gustStrength(wave.start+1,200,wave));
  assert.equal(cycle.sample(peak,400,true),wave);
  assert.equal(cycle.sample(peak+8,400,true),null);
  assert.equal(light.rain,Number(weather==='rain'||weather==='thunder'));
  assert.equal(light.snow,Number(weather==='snow'));assert.equal(light.night,1);
  assert.equal(env.weather,weather);
 }
});
test('每阵重新抽取间隔、时长和峰值，关闭与重开局均清除旧风',()=>{
 const rolls=[0,.2,.3,.4,.6,.7,.8,0],cycle=new GustCycle(()=>rolls.shift()??.5);
 cycle.sample(0,0,true);const first=cycle.sample(cycle.nextAt,0,true),next=cycle.nextAt;
 assert.ok(next-first.start-first.duration>18);
 const second=cycle.sample(next,0,true);assert.notEqual(first.duration,second.duration);assert.notEqual(first.peak,second.peak);
 assert.equal(cycle.sample(0,0,true),null);assert.equal(cycle.sample(100,0,false),null);
 assert.equal(cycle.sample(100,0,true),null);
});
test('旧阵风转换为带随机阵风的晴天，手动关风可随环境设置保存',()=>{
 const env=normalizeEnvironment({weather:'gust',autoWeather:false});
 assert.equal(env.weather,'sun');assert.equal(env.randomGusts,true);
 for(const row of Object.values(SEASON_WEATHER_WEIGHTS))assert.ok(!('gust' in row));
 const memory=new Map(),store=createSaveStore(()=>({getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)}));
 env.randomGusts=false;assert.ok(store.saveEnvironment(env));assert.equal(store.loadEnvironment().randomGusts,false);
});
