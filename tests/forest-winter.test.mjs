// 冬景持久化及跨地图缓存隔离回归，不依赖浏览器像素生成。
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSaveStore, STORAGE_KEYS } from '../src/platform/storage.js';
import { GroundCache } from '../src/rendering/ground-cache.js';

test('旧存档默认冬景，原景选择刷新后保留且非法值回退',()=>{
  const data=new Map();
  const store=createSaveStore(()=>({getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)}));
  assert.equal(store.loadEnvironment().forestSeason,'winter');
  const env=store.loadEnvironment();env.forestSeason='green';store.saveEnvironment(env);
  assert.equal(store.loadEnvironment().forestSeason,'summer');
  data.set(STORAGE_KEYS.environment,JSON.stringify({...env,forestSeason:'invalid'}));
  assert.equal(store.loadEnvironment().forestSeason,'winter');
});
test('切季释放旧分块，同季复用，九寨沟始终不使用冬景',()=>{
  const cache=new GroundCache(),day={width:388,height:388},night={width:388,height:388};
  cache.tiles.set('0:0',{day,night});cache.setSeason('winter');
  assert.equal(cache.tiles.size,0);assert.equal(day.width,1);assert.equal(night.width,1);
  cache.tiles.set('0:0',{day:{width:388,height:388}});cache.setSeason('winter');
  assert.equal(cache.tiles.size,1);
  cache.setMap('jiuzhaigou');cache.setSeason('winter');assert.equal(cache.winter,false);
  cache.setMap('forest');cache.setSeason('winter');assert.equal(cache.winter,true);
  cache.setSeason('green');assert.equal(cache.winter,false);
});
