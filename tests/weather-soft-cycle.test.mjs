// 天气强度与计时圆环的纯逻辑回归，验证快速反向时的连续性。
import test from 'node:test';
import assert from 'node:assert/strict';
import { EnvironmentTransition, weatherRemaining, WEATHER_INTERVAL, WEATHER_FADE_DURATION } from '../src/world/environment.js';
import { nextSeason } from '../src/world/seasons.js';
import { precipitationPresence, rainSample, rainVisibility } from '../src/world/precipitation.js';
import { SceneTone } from '../src/rendering/scene-tone.js';
test('季节按钮严格春夏秋冬循环，不依赖随机源',()=>{
  let current='spring';for(const next of ['summer','autumn','winter','spring','summer']){current=nextSeason(current);assert.equal(current,next);}
});
test('天气圆环覆盖完整周期，关闭自动天气不倒计时',()=>{
  const env={autoWeather:true,weatherAt:100};
  assert.equal(weatherRemaining(env,100),WEATHER_INTERVAL);assert.equal(weatherRemaining(env,60100),60000);
  assert.equal(weatherRemaining(env,130000),0);assert.equal(weatherRemaining(env,0),120000);
  env.autoWeather=false;assert.equal(weatherRemaining(env,100000),120000);
});
test('雨雪十五秒渐变，快速反向保持强度且总降水不超过原上限',()=>{
  const light=new EnvironmentTransition({time:'day',weather:'sun'},0);
  light.set({time:'day',weather:'rain'},0);
  assert.equal(WEATHER_FADE_DURATION,15000);assert.ok(light.sample(800).rain<.1);
  let previous=0;for(let t=0;t<=WEATHER_FADE_DURATION;t+=250){const value=light.sample(t).rain;assert.ok(value>=previous);previous=value;}
  assert.ok(light.sample(WEATHER_FADE_DURATION-1).rain<1);
  assert.equal(light.sample(WEATHER_FADE_DURATION).rain,1);
  const before=light.sample(9000);light.set({time:'day',weather:'snow'},9000);assert.deepEqual(light.sample(9000),before);
  for(let t=9000;t<=9000+WEATHER_FADE_DURATION;t+=100){const value=light.sample(t);assert.ok(value.rain+value.snow<=1.000000001);}
  assert.equal(light.sample(9000+WEATHER_FADE_DURATION).rain,0);assert.equal(light.sample(9000+WEATHER_FADE_DURATION).snow,1);
  light.set({time:'day',weather:'sun'},9000+WEATHER_FADE_DURATION);assert.ok(light.sample(9000+WEATHER_FADE_DURATION*1.5).snow>0);assert.equal(light.sample(9000+WEATHER_FADE_DURATION*2).snow,0);
});
test('晴阴光线柔和衔接，改变目标不跳回端点',()=>{
  const tone=new SceneTone({time:'day',weather:'sun'},0);tone.set({time:'day',weather:'cloud'},0);
  const before=tone.sample(6000);assert.ok(before.brightness<1&&before.brightness>.93);
  tone.set({time:'day',weather:'sun'},6000);assert.deepEqual(tone.sample(6000),before);assert.equal(tone.sample(6000+WEATHER_FADE_DURATION).brightness,1);
});
test('雨雪逐粒渐入，强度不重排世界落点/相位，角色附近降雨更淡',()=>{
  for(let seed=0;seed<100;seed++){
    assert.equal(precipitationPresence(0,seed),0);assert.equal(precipitationPresence(1,seed),1);
    let previous=0;for(let i=0;i<=100;i++){const value=precipitationPresence(i/100,seed);assert.ok(value>=previous);previous=value;}
  }
  for(let storm=0;storm<=1;storm+=.1){const a=rainSample(3,4,86400,0),b=rainSample(3,4,86400,storm);for(const key of ['x','y','dropY','falling','splash'])assert.equal(a[key],b[key]);}
  assert.equal(rainVisibility(0,0,{x:0,y:0}),.3);assert.equal(rainVisibility(200,0,{x:0,y:0}),1);
});
