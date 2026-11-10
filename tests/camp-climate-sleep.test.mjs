// 针对预览隔离、地区天气概率、积雪连续性和指定时段睡眠的行为回归。
import test from 'node:test';
import assert from 'node:assert/strict';
import {previewEnvironment,actualEnvironment,beginEnvironmentTick,endEnvironmentTick,clearEnvironmentPreview} from '../src/world/environment-preview.js';
import {createNaturalClock} from '../src/world/natural-clock.js';
import {normalizeEnvironment} from '../src/world/environment.js';
import {normalizeChronicle} from '../src/world/play-chronicle.js';
import {REGIONAL_CAMPS} from '../src/config/regional-camps.js';
import {CAMP_CLIMATES,chooseCampWeather,updateCampClimate} from '../src/world/camp-climate.js';
import {advanceSnowCover,SNOW_BUILD_MS,SNOW_MELT_MS} from '../src/world/snow-cover.js';
import {cottageSleepTarget} from '../src/core/home/cottage.js';
import {LIVING_PHASES,LIVING_DAY_MS} from '../src/config/living-world.js';

test('Debug反复切换不改变真实时钟、天气统计与保存值，自然进度继续',()=>{
 const now=1000000,e=normalizeEnvironment({time:'day',forestSeason:'spring',weather:'sun'},now),r=normalizeChronicle(null),clock=createNaturalClock(e,r,now);
 const saved=structuredClone(e);
 previewEnvironment(e,{time:'night',forestSeason:'winter',weather:'snow'});
 previewEnvironment(e,{time:'dusk',weather:'rain'});
 assert.deepEqual(actualEnvironment(e),saved);
 beginEnvironmentTick(e);clock.advance(1000,now+1000);endEnvironmentTick(e);
 assert.equal(r.weatherMs.sun,1000);assert.equal(r.weatherMs.snow,0);assert.equal(r.weatherMs.rain,0);
 assert.equal(e.time,'dusk');assert.equal(e.forestSeason,'winter');assert.equal(r.days,0);assert.equal(r.years,0);
 clearEnvironmentPreview(e);assert.equal(e.time,'day');assert.equal(e.weather,'sun');assert.equal(r.cycles.day.elapsed,1000);
});
test('五地全年80%主气候，偏好可以连续出现',()=>{
 for(const [camp,weather] of Object.entries(CAMP_CLIMATES))for(const season of ['spring','summer','autumn','winter']){
  let hits=0;for(let i=0;i<1000;i++)if(chooseCampWeather(season,camp,weather,()=>i/1000)===weather)hits++;
  assert.equal(hits,800,camp+':'+season);
 }
});
test('抵达只抽一次，边界滞回、室内和离开地区气候正确',()=>{
 const camp=REGIONAL_CAMPS[2],e={forestSeason:'summer',weather:'sun'},g={mapId:'forest',player:{x:camp.x,y:camp.y}};
 assert.equal(updateCampClimate(e,g,10,()=>.1),true);assert.equal(e.weather,'snow');
 assert.equal(updateCampClimate(e,g,20,()=>.9),false);assert.equal(e.weatherAt,10);
 g.player.x+=1100;assert.equal(updateCampClimate(e,g,30),false);
 g.cottage={outside:{x:camp.x,y:camp.y}};g.player={x:10,y:10};assert.equal(updateCampClimate(e,g,40),false);
 g.cottage=null;assert.equal(updateCampClimate(e,g,50,()=>.1),true);assert.equal(e.climateCamp,null);assert.notEqual(e.weather,'snow');
});
test('积雪增厚、晴天渐融、暂停不变且快速反向连续',()=>{
 const half=advanceSnowCover(0,'snow',SNOW_BUILD_MS/2);assert.equal(half,.5);
 assert.equal(advanceSnowCover(half,'cloud',100000),half);assert.equal(advanceSnowCover(half,'sun',0),half);
 assert.equal(advanceSnowCover(half,'sun',SNOW_MELT_MS/4),.25);
 assert.equal(advanceSnowCover(.25,'snow',SNOW_BUILD_MS/4),.5);
 assert.equal(advanceSnowCover(1,'sun',SNOW_MELT_MS),0);assert.equal(advanceSnowCover(0,'snow',1e9),1);
});
test('指定早晨黄昏夜晚落在下一次目标，跨日和季末不倒退，不修改原日期',()=>{
 for(const phase of LIVING_PHASES)for(const elapsed of [0,phase.start,phase.start+100,LIVING_DAY_MS-1]){
  const calendar={day:13,elapsed},mode=phase.id==='day'?'morning':phase.id,target=cottageSleepTarget(calendar,mode);
  assert.equal(target.elapsed,phase.start);assert.equal(target.day,calendar.day+(phase.start<=elapsed?1:0));assert.deepEqual(calendar,{day:13,elapsed});
 }
});
