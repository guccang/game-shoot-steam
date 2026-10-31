// 任务路程回归：比较真实循环世界坐标与导航读数，不用固定显示数字冒充距离变化。
import test from 'node:test';
import assert from 'node:assert/strict';
import {STORY_CAMPAIGN} from '../src/config/story-campaign.js';
import {worldDistance, WORLD} from '../src/world/coordinates.js';
import {storyBearing} from '../src/ui/story-navigation.js';

// 覆盖外出、分支、往返和交付；渡口上下岸及同地点交谈不属于长途节点。
const journeys = [
  ['sunleaf-01', ['CAMP','SIGN','ROAD1','ROAD2','MINT','RELAY','BOSS','RELAY','CAMP']],
  ['sunleaf-01', ['SIGN','SHORT1','MINT']],
  ...['sunleaf-03','sunleaf-04'].map(id=>[id,['CAMP','FIRST','SECOND','THIRD','CAMP']]),
  ['sunleaf-05', ['CAMP','WATER','FAR','LIGHT','CAMP']],
  ['sunleaf-06', ['CAMP','DOCK','WATER','FAR','STATION','CALIBRATE','CAMP']],
  ...['neighbors-lunch','neighbors-night','neighbors-market'].map(id=>[id,['CAMP','FIRST','SECOND','THIRD','CAMP']]),
  ['neighbors-night', ['THIRD','SECOND','CAMP']],
];

test('主要任务路段在1000–2000米之间，每条线路都有明显长短变化',()=>{
  for(const [id,keys] of journeys){
    const sites=STORY_CAMPAIGN[id].world.sites,distances=[];
    for(let i=1;i<keys.length;i++){
      const distance=worldDistance(sites[keys[i-1]],sites[keys[i]]);
      assert.ok(distance>=1000&&distance<=2000,`${id} ${keys[i-1]}→${keys[i]}：${distance}米`);
      distances.push(distance);
    }
    assert.ok(Math.max(...distances)-Math.min(...distances)>=100,`${id} 路段长度不能雷同`);
  }
});

test('导航显示实际坐标距离，跨循环边界仍与节点距离一致',()=>{
  for(const [id,keys] of journeys){
    const sites=STORY_CAMPAIGN[id].world.sites;
    for(let i=1;i<keys.length;i++){
      const from=sites[keys[i-1]],to=sites[keys[i]],expected=worldDistance(from,to);
      assert.equal(storyBearing(from,to).distance,expected);
      const mirror={x:from.x+WORLD.width,y:from.y-WORLD.height};
      assert.equal(storyBearing(mirror,to).distance,expected);
    }
  }
});

test('第一章近道仍短于主路，不因重排落点颠倒路线含义',()=>{
  const def=STORY_CAMPAIGN['sunleaf-01'];
  // 对比同一起终点之间的整条路线，而非单个目标的直线距离。
  function length(route){const keys=['SIGN',...def.routes[route].sites,'MINT'];
    return keys.slice(1).reduce((sum,key,i)=>sum+worldDistance(def.world.sites[keys[i]],def.world.sites[key]),0);}
  assert.ok(length('short')<length('road'));
});
