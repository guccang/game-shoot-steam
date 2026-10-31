// 季节外观重定向必须连续，时间与空间规则保持独立。
import test from 'node:test';
import assert from 'node:assert/strict';
import { SeasonTransition, SEASON_FADE_DURATION } from '../src/world/season-transition.js';
import { GroundCache } from '../src/rendering/ground-cache.js';
test('初次季节无过渡，换季十五秒内单调变化且权重守恒',()=>{
  assert.equal(SEASON_FADE_DURATION,15000);
  const fade=new SeasonTransition('autumn',100);
  assert.equal(fade.sample(100).active,false);
  fade.set('winter',1000);
  let previous=0;
  for(let t=0;t<=SEASON_FADE_DURATION;t+=100) {
    const s=fade.sample(1000+t);
    assert.ok(s.weights.winter>=previous);previous=s.weights.winter;
    assert.ok(Math.abs(Object.values(s.weights).reduce((a,b)=>a+b,0)-1)<1e-12);
  }
  assert.equal(fade.sample(1000+SEASON_FADE_DURATION/2).weights.winter,.5);
  assert.equal(fade.sample(1000+SEASON_FADE_DURATION-1).active,true);
  assert.equal(fade.sample(1000+SEASON_FADE_DURATION).active,false);
});
test('快速切季从当前颜色继续，回头与后台完成均无跳变',()=>{
  const fade=new SeasonTransition('winter',0);fade.set('spring',100);
  for(const [season,now] of [['summer',3000],['autumn',6000],['winter',7000],['spring',8000]]) {
    const before=fade.sample(now).weights;fade.set(season,now);
    assert.deepEqual(fade.sample(now).weights,before);
  }
  assert.deepEqual(fade.sample(999999).weights,{spring:1,summer:0,autumn:0,winter:0});
});
test('地面完成渐变仅释放来源快照，保留目标缓存；切地图全部释放',()=>{
  const fade=new SeasonTransition('summer');fade.set('winter',0);
  const cache=new GroundCache();cache.setSeason('winter',fade.sample(100));
  const day={width:388,height:388},fromDay={width:388,height:388};
  cache.tiles.set('0:0',{day,fromDay});
  cache.setSeason('winter',fade.sample(200));assert.equal(fromDay.width,388);
  cache.setSeason('winter',fade.sample(SEASON_FADE_DURATION));assert.equal(fromDay.width,1);assert.equal(day.width,388);assert.equal(cache.tiles.size,1);
  cache.setMap('jiuzhaigou');assert.equal(day.width,1);assert.equal(cache.tiles.size,0);
});
