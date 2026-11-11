// 周期路面在相机往返跨界时只呈现真实短段；材质和普通土路共用投影。
import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleCampRoads} from '../src/rendering/camp-road-finish.js';
import {WORLD} from '../src/world/coordinates.js';

test('东西与南北接缝往返移动，近处路段连续，远端道路不跨屏',()=>{
 for(const [axis,size] of [['x',WORLD.width],['y',WORLD.height]]){
  const point=n=>({x:0,y:0,[axis]:n});
  const local=Object.assign([point(size-35),point(0),point(35)],{width:24});
  const distant=[point(size/2-35),point(size/2+35)];
  for(const offset of [-20,-1,0,1,20,1,0,-1,-20]){
   for(const turn of [-1,0,1]){
    const origin=turn*size,view={x:-80,y:-80,w:160,h:160,[axis]:origin+offset-80};
    const paths=visibleCampRoads([local,distant],view);
    assert.equal(paths.length,1);assert.equal(paths[0].width,24);
    assert.deepEqual(paths[0].map(p=>p[axis]-origin),[-35,0,35]);
   }
  }
 }
});
