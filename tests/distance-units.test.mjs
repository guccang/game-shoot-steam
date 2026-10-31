// 距离显示换算不能改变世界几何、跨边界距离或交互阈值。
import test from 'node:test';
import assert from 'node:assert/strict';
import {displayMeters,WORLD_UNITS_PER_METER} from '../src/world/distance-units.js';
import {WORLD,worldDistance} from '../src/world/coordinates.js';
import {storyBearing} from '../src/ui/story-navigation.js';

test('10坐标单位显示1米，正距离向上取整而不是提前归零',()=>{
 assert.equal(WORLD_UNITS_PER_METER,10);
 for(const [units,meters] of [[0,0],[.1,1],[9,1],[10,1],[10.1,2],[20,2],[300,30],[301,31],[1000,100]])assert.equal(displayMeters(units),meters);
});

test('先计算循环地图最短距离，再换算显示；方向和到达判定仍使用世界单位',()=>{
 const player={x:WORLD.width-150,y:400},target={x:150,y:400};
 const distance=worldDistance(player,target),bearing=storyBearing(player,target,85);
 assert.equal(distance,300);assert.equal(displayMeters(distance),30);
 assert.equal(bearing.distance,300);assert.equal(bearing.angle,90);assert.equal(bearing.near,false);
 assert.equal(storyBearing(player,{x:player.x+85,y:400},85).near,true);
 assert.equal(storyBearing(player,{x:player.x+86,y:400},85).near,false);
});
