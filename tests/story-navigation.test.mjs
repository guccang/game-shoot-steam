// 方向契约覆盖屏幕坐标、地图镜像、临近与重合，避免导航误导玩家。
import test from 'node:test';
import assert from 'node:assert/strict';
import { storyBearing } from '../src/ui/story-navigation.js';
test('圆盘箭头指向四向和斜向，不依赖角色朝向',()=>{
  for(const [x,y,angle] of [[0,-100,0],[100,-100,45],[100,0,90],[100,100,135],[0,100,180],[-100,100,225],[-100,0,270],[-100,-100,315]]) {
    assert.equal(storyBearing({x:0,y:0},{x,y}).angle,angle);
  }
});
test('循环边界采用最近镜像，附近阈值与章节交互一致',()=>{
  assert.equal(storyBearing({x:3590,y:700},{x:10,y:700}).angle,90);
  assert.equal(storyBearing({x:10,y:700},{x:3590,y:700}).angle,270);
  assert.equal(storyBearing({x:700,y:2790},{x:700,y:10}).angle,180);
  assert.equal(storyBearing({x:700,y:10},{x:700,y:2790}).angle,0);
  assert.equal(storyBearing({x:0,y:0},{x:48,y:0}).near,true);
  assert.equal(storyBearing({x:0,y:0},{x:48.1,y:0}).near,false);
  assert.equal(storyBearing({x:900,y:700},{x:900,y:700}).coincident,true);
  assert.equal(storyBearing({x:4500,y:3500},{x:900,y:700}).coincident,true);
});
