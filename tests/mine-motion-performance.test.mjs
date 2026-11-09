// 地下缓存按真实开掘内容失效，移动复用、事务换对象和边界碰撞保持正确。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshMining,openBasement} from '../src/progression/mining/mining.js';
import {minePoint,mineKey} from '../src/config/mining.js';
import {mineTerrain,mineHash} from '../src/config/mine-ecology.js';
import {buildMineSurface,mineSurfaceAt} from '../src/world/mine-surface.js';
import {createMineSurfaceCache,mineSurfaceContours,MINE_SURFACE_CACHE_LIMIT} from '../src/world/mine-surface-cache.js';
import {mineOccupancy} from '../src/physics/mine-motion.js';
// 固定种子便于定位自然水岸和未开掘岩层，不修改正式地图算法。
function layer(){const l=freshMining();openBasement(l);l.seed=1847;return l;}
// 只用于验证正式路径覆盖，不把实现中的采样结果当作期望值。
function contains(points,x,y){let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)hit=!hit;}return hit;}

test('视口跨施工格而未离开世界块时零重建，相邻条带只生成新块',()=>{const l=layer(),cache=createMineSurfaceCache(),rect={x:512,y:512,w:128,h:128},first=cache.sample(l,rect);assert.equal(first.rebuilt,1);for(let x=513;x<=576;x++)assert.equal(cache.sample(l,{...rect,x}).rebuilt,0);const next=cache.sample(l,{...rect,x:700});assert.equal(next.rebuilt,1);assert.equal(next.builds,2);});
test('原子事务替换存档但未改地形时复用所有路径，原地开掘只重建相关块',()=>{const l=layer(),cache=createMineSurfaceCache(),rect={x:800,y:800,w:768,h:768};cache.sample(l,rect);const copied=structuredClone(l);copied.ore+=3;assert.equal(cache.sample(copied,rect).rebuilt,0);const p=minePoint({x:10,y:10});const r={x:p.x-384,y:p.y-384,w:768,h:768};cache.sample(l,r);l.dug[mineKey({x:10,y:10})]=true;const changed=cache.sample(l,r);assert.ok(changed.rebuilt>0&&changed.rebuilt<changed.items.length);assert.equal(cache.sample(l,r).rebuilt,0);});
test('分块和原整块网格在接缝、水岸与未对齐世界边缘保持相同覆盖',()=>{const l=layer();l.bounds={left:0,top:0,right:4599.3,bottom:1149.7};const p=minePoint({x:63,y:8}),rect={x:p.x-180,y:p.y-180,w:360,h:360},whole=buildMineSurface(l,rect),chunks=createMineSurfaceCache().sample(l,rect);for(let i=0;i<300;i++){const x=rect.x+mineHash(i,19)%360+.013,y=rect.y+mineHash(7,i)%360+.017;for(const kind of ['open','water'])assert.equal(chunks.items.some(c=>c.value[kind].some(poly=>contains(poly,x,y))),whole[kind].some(poly=>contains(poly,x,y)),kind+' '+x+','+y);}});
test('种子和原位边界变化重新编译，远行不会无限增加缓存',()=>{const l=layer(),cache=createMineSurfaceCache(),r={x:1024,y:1024,w:300,h:300};cache.sample(l,r);l.seed++;assert.ok(cache.sample(l,r).rebuilt>0);l.bounds.right-=.5;assert.ok(cache.sample(l,r).rebuilt>0);for(let x=0;x<15000;x+=256)assert.ok(cache.sample(l,{...r,x}).cached<=MINE_SURFACE_CACHE_LIMIT);});
test('零半径查询与正式三角采样一致，原位开掘、换种子、边界与桥梁立即生效',()=>{const l=layer(),g={progress:{mining:l},cottage:{depth:1},player:{},vehicle:{active:false}};for(let y=3;y<15;y++)for(let x=3;x<15;x++){const p=minePoint({x,y}),s=mineSurfaceAt(l,p.x,p.y);assert.equal(mineOccupancy(g,p.x,p.y,0,true),s.open);assert.equal(mineOccupancy(g,p.x,p.y,0,false),s.open&&!s.water);if(!mineTerrain({x,y},l).natural){l.dug[mineKey({x,y})]=true;assert.ok(mineOccupancy(g,p.x,p.y,0,true));}l.bridges[mineKey({x,y})]=true;assert.equal(mineOccupancy(g,p.x,p.y,0,false),mineSurfaceAt(l,p.x,p.y).open);}l.bounds.right=100;assert.equal(mineOccupancy(g,101,50,0,true),false);});

test('轮廓合并保留孔洞、边缘和分离地块，路径顶点显著减少',()=>{const l=layer(),p=minePoint({x:63,y:8}),r={x:p.x-180,y:p.y-180,w:360,h:360},mesh=buildMineSurface(l,r);for(const kind of ['open','water']){const contours=mineSurfaceContours(mesh[kind]);assert.ok(contours.flat().length<mesh[kind].flat().length/3);for(let i=0;i<700;i++){const x=r.x+mineHash(i,29)%360+.023,y=r.y+mineHash(33,i)%360+.019;assert.equal(contours.filter(poly=>contains(poly,x,y)).length%2===1,mesh[kind].some(poly=>contains(poly,x,y)),kind+' '+x+','+y);}}const square=(x,y)=>[{x,y},{x:x+1,y},{x:x+1,y:y+1},{x,y:y+1}];const ring=[];for(let y=0;y<3;y++)for(let x=0;x<3;x++)if(x!==1||y!==1)ring.push(square(x,y));const contours=mineSurfaceContours(ring);assert.equal(contours.length,2);assert.equal(contours.filter(poly=>contains(poly,1.5,1.5)).length%2,0);assert.equal(contours.filter(poly=>contains(poly,.5,.5)).length%2,1);});

test('近邻预取每次最多编译一块，跨边界直接复用且不淘汰必需地形',()=>{
 const l=layer(),cache=createMineSurfaceCache(),rect={x:512,y:512,w:512,h:768};cache.sample(l,rect);
 for(let i=0;i<24;i++)assert.ok(cache.warm(l,rect)<=1);
 assert.equal(cache.warm(l,rect),0);assert.equal(cache.sample(l,rect).rebuilt,0);
 assert.equal(cache.sample(l,{...rect,x:rect.x+256}).rebuilt,0);
 assert.equal(cache.sample(l,{...rect,y:rect.y+256}).rebuilt,0);
 assert.ok(cache.sample(l,rect).cached<=MINE_SURFACE_CACHE_LIMIT);
});

test('预取不忽略施工和种子变化，超大广角不争抢固定几何容量',()=>{
 const l=layer(),cache=createMineSurfaceCache(),rect={x:512,y:512,w:256,h:256};cache.sample(l,rect);while(cache.warm(l,rect)){}
 const old=cache.sample(l,rect).builds;l.dug[mineKey({x:1,y:-2})]=true;
 assert.equal(cache.warm(l,rect),1);assert.equal(cache.sample(l,rect).builds,old+1);
 l.seed++;assert.equal(cache.warm(l,rect),1);assert.equal(cache.sample(l,rect).rebuilt,1);
 const before=cache.sample(l,rect).builds;assert.equal(cache.warm(l,{x:0,y:0,w:3000,h:3000}),0);assert.equal(cache.sample(l,rect).builds,before);
});
