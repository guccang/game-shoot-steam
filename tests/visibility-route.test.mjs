// 惰性通行检查必须与完整图最短路一致，并避免验证无关长边。
import test from 'node:test';
import assert from 'node:assert/strict';
import {visibilityRoute} from '../src/physics/visibility-route.js';
import {worldDistance,WORLD} from '../src/world/coordinates.js';

// 用独立的全图松弛计算参照，不复用被测搜索的队列或启发式。
function reference(nodes, edges, distance) {
  const costs=nodes.map(()=>Infinity);costs[0]=0;
  for(let pass=0;pass<nodes.length;pass++)for(let a=0;a<nodes.length;a++)for(let b=0;b<nodes.length;b++)
    if(edges[a][b])costs[b]=Math.min(costs[b],costs[a]+distance(nodes[a],nodes[b]));
  return costs[1];
}

test('随机有向障碍图的最短路与全图参照一致，覆盖失败边、不可达和周期接缝',()=>{
  let seed=49;
  // 固定种子保证每次覆盖同一批非对称通行条件。
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
  for(const distance of [(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),worldDistance])for(let run=0;run<80;run++){
    const nodes=Array.from({length:18},(_,id)=>({id,x:random()*WORLD.width,y:random()*WORLD.height}));
    const edges=nodes.map(()=>nodes.map(()=>random()<.22));
    const path=visibilityRoute(nodes,distance,(a,b)=>edges[a.id][b.id]);
    const expected=reference(nodes,edges,distance);
    if(!Number.isFinite(expected)){assert.deepEqual(path,[]);continue;}
    let cost=0,previous=nodes[0];
    for(const node of path){assert.ok(edges[previous.id][node.id]);cost+=distance(previous,node);previous=node;}
    assert.equal(previous,nodes[1]);assert.ok(Math.abs(cost-expected)<1e-7);
  }
});

test('局部绕角只验证有希望的短边，不扫描远方角点',()=>{
  const nodes=[{x:0,y:0,id:0},{x:100,y:0,id:1},{x:50,y:10,id:2},
    ...Array.from({length:300},(_,id)=>({x:1000+id*20,y:1000,id:id+3}))];
  let checks=0;
  const path=visibilityRoute(nodes,(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),(a,b)=>{checks++;return !(a.id===0&&b.id===1);});
  assert.deepEqual(path,[nodes[2],nodes[1]]);assert.equal(checks,3);
});
