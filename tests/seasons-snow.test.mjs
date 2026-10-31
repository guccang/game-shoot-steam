// 四季迁移、随机切换与大雪互斥的行为回归。
import test from 'node:test';
import assert from 'node:assert/strict';
import { SEASONS, normalizeSeason, differentChoice } from '../src/world/seasons.js';
import { WEATHER_TYPES, normalizeEnvironment, EnvironmentTransition } from '../src/world/environment.js';
import { createSaveStore } from '../src/platform/storage.js';
import { GroundCache } from '../src/rendering/ground-cache.js';

test('入场季节与天气的随机选择工具排除指定当前值',()=>{
  for(const values of [SEASONS,WEATHER_TYPES])for(const current of values){
    const seen=new Set();
    for(let i=0;i<100;i++){const choice=differentChoice(values,current,()=>i/100);assert.notEqual(choice,current);seen.add(choice);}
    assert.deepEqual(seen,new Set(values.filter(v=>v!==current)));
  }
});
test('旧原景迁移到夏季，四季与大雪刷新保存互不覆盖',()=>{
  assert.equal(normalizeSeason('green'),'summer');assert.equal(normalizeSeason(null),'winter');
  const data=new Map(),store=createSaveStore(()=>({getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)}));
  for(const forestSeason of SEASONS){
    const env=normalizeEnvironment({forestSeason,weather:'snow',autoTime:false,autoWeather:false});store.saveEnvironment(env);
    assert.equal(store.loadEnvironment().forestSeason,forestSeason);assert.equal(store.loadEnvironment().weather,'snow');
  }
});
test('大雪使用独立渐变，稳定雪天没有降雨或雷暴，减少动态立即切换',()=>{
  const light=new EnvironmentTransition({time:'day',weather:'sun'},0);
  light.set({time:'day',weather:'snow'},0);assert.ok(light.sample(400).snow>0&&light.sample(400).snow<1);
  const snow=light.sample(20000);assert.equal(snow.snow,1);assert.equal(snow.rain,0);assert.equal(snow.storm,0);
  light.set({time:'day',weather:'rain'},21000);assert.equal(light.sample(41000).snow,0);assert.equal(light.sample(41000).rain,1);
  light.set({time:'day',weather:'snow'},42000);assert.equal(light.sample(42000,true).snow,1);
});
test('四季更换都会清理地块，九寨沟不受森林物候选择影响',()=>{
  const ground=new GroundCache();
  for(const season of SEASONS){ground.tiles.set('old',{day:{width:388,height:388}});ground.setSeason(season);assert.equal(ground.tiles.size,0);assert.equal(ground.season,season);}
  ground.setMap('jiuzhaigou');ground.setSeason('autumn');assert.equal(ground.season,'summer');assert.equal(ground.winter,false);
});
