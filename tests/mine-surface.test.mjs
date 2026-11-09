// 连续地形同源验证：格心存档身份、画面轮廓、碰撞、桥梁和跨镜头接缝。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshMining,openBasement,normalizeMining} from '../src/progression/mining/mining.js';
import {mineTerrain,mineCellOpen,mineHash} from '../src/config/mine-ecology.js';
import {minePoint,mineCell,mineKey} from '../src/config/mining.js';
import {mineSurfaceAt,buildMineSurface,mineLandscapeAnchor} from '../src/world/mine-surface.js';
import {mineOccupancy} from '../src/physics/mine-motion.js';
// 只生成正式第一层，保持天然水域和未开掘岩壁，不预填矿道。
function layer(){const m=freshMining();openBasement(m);m.seed=1847;return m;}
// 射线穿越判断检查正式网格输出的填充区域，不复制地形生成算法。
function contains(polygon,x,y){let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)hit=!hit;}return hit;}
// 区域内随机采样使用固定散列，避免测试结果因随机点改变。
function samples(rect,n){return Array.from({length:n},(_,i)=>({x:rect.x+(mineHash(i,9)%10000)/10000*rect.w+.013,y:rect.y+(mineHash(13,i)%10000)/10000*rect.h+.017}));}

test('平滑地貌保留所有抽样格心的岩层、水域和开放身份，读档不重排',()=>{const m=layer(),restored=normalizeMining(m);for(let y=3;y<30;y++)for(let x=3;x<36;x++){const cell={x,y},p=minePoint(cell),t=mineTerrain(cell,m),s=mineSurfaceAt(m,p.x,p.y);assert.equal(s.open,mineCellOpen(cell,m),mineKey(cell));assert.equal(s.water,t.water,mineKey(cell));assert.deepEqual(mineSurfaceAt(restored,p.x+13,p.y-9),mineSurfaceAt(m,p.x+13,p.y-9));}});
test('三角轮廓与正式步行碰撞一致，水岸不出现可踏水或空气墙',()=>{const m=layer(),p=minePoint({x:63,y:8}),rect={x:p.x-170,y:p.y-170,w:340,h:340},mesh=buildMineSurface(m,rect),game={progress:{mining:m},cottage:{depth:1},vehicle:{active:false},player:{}};let wet=0,dry=0,wall=0;for(const point of samples(rect,250)){const open=mesh.open.some(poly=>contains(poly,point.x,point.y)),water=mesh.water.some(poly=>contains(poly,point.x,point.y));assert.deepEqual(mineSurfaceAt(m,point.x,point.y),{open,water});assert.equal(mineOccupancy(game,point.x,point.y,0,false),open&&!water);if(!open)wall++;else if(water)wet++;else dry++;}assert.ok(wet&&dry&&wall,JSON.stringify({wet,dry,wall}));});
test('镜头移动重建不会改变同一位置的水岸轮廓',()=>{const m=layer(),p=minePoint({x:63,y:8}),a={x:p.x-180,y:p.y-180,w:360,h:360},b={x:a.x+64,y:a.y-64,w:360,h:360},first=buildMineSurface(m,a),second=buildMineSurface(m,b);for(const point of samples({x:b.x+10,y:a.y+10,w:270,h:270},100))for(const key of ['open','water'])assert.equal(first[key].some(poly=>contains(poly,point.x,point.y)),second[key].some(poly=>contains(poly,point.x,point.y)));assert.ok(first.nodes<8000);});
test('原位开格与建桥立即改变碰撞，植株脚底始终落在干地',()=>{const m=layer(),game={progress:{mining:m},cottage:{depth:1},vehicle:{active:false},player:{}};let rock=null,water=null;for(let y=3;y<30;y++)for(let x=3;x<36;x++){const cell={x,y},t=mineTerrain(cell,m);if(!rock&&!t.natural)rock=cell;if(!water&&t.water)water=cell;if(t.prop){const a=mineLandscapeAnchor(cell,t.hash,m),s=mineSurfaceAt(m,a.x,a.y);assert.ok(s.open&&!s.water);}}const r=minePoint(rock);assert.equal(mineOccupancy(game,r.x,r.y,0),false);m.dug[mineKey(rock)]=true;assert.ok(mineOccupancy(game,r.x,r.y,0));const w=minePoint(water);assert.equal(mineOccupancy(game,w.x,w.y,0,false),false);m.bridges[mineKey(water)]=true;assert.ok(mineOccupancy(game,w.x,w.y,0,false));});
