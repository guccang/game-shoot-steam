// 分组裁剪只能减少候选，不能遗漏原小地图可见线段，特别是周期边界两侧。
import test from 'node:test';
import assert from 'node:assert/strict';
import {pathChunks,pathChunkVisible} from '../src/world/path-chunks.js';
import {PATHS} from '../src/world/paths.js';
import {nearest,WORLD} from '../src/world/coordinates.js';

test('道路分组保留每条可见线段及原顺序，覆盖移动、缩放和循环镜像',()=>{
 let visited=0,total=0;
 for(const player of [{x:3320,y:3000},{x:900,y:700},{x:WORLD.width-5,y:WORLD.height-5},{x:-5,y:-5},{x:24000,y:18000}])for(const span of [500,2000,50000]){
  const bounds={x:player.x-span/2,y:player.y-span/2,w:span,h:span};
  for(const path of PATHS){const candidates=new Set();for(const chunk of pathChunks(path))if(pathChunkVisible(chunk,player,bounds))for(let i=chunk.start;i<chunk.end;i++)candidates.add(i);
   for(let i=1;i<path.length;i++){total++;const a=nearest(path[i-1],player),b=nearest(path[i],player);
    if(Math.max(a.x,b.x)<bounds.x||Math.min(a.x,b.x)>bounds.x+span||Math.max(a.y,b.y)<bounds.y||Math.min(a.y,b.y)>bounds.y+span)continue;
    assert.ok(candidates.has(i));visited++;
   }
  }
 }
 assert.ok(visited>0&&visited<total);
 const p={x:3320,y:3000},b={x:2800,y:2000,w:1040,h:2000};
 const selected=PATHS.reduce((sum,path)=>sum+pathChunks(path).filter(c=>pathChunkVisible(c,p,b)).reduce((n,c)=>n+c.end-c.start,0),0);
 assert.ok(selected<500,'局部视野只精查附近道路');
});
