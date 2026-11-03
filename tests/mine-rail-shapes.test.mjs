// 接轨几何定向检查：出口一致、恒定轨距、唯一枕木与16种组合上限。
import test from 'node:test';
import assert from 'node:assert/strict';
import {mineRailShape} from '../src/rendering/mine-rail-shapes.js';
import {mineRailMask} from '../src/rendering/mine-rails.js';
const directions=[[0,-1],[1,0],[0,1],[-1,0]];
// 取真实钢轨末端，验证与相邻格在世界坐标中的两根轨完全接上。
function ports(shape,i){const [dx,dy]=directions[i];return shape.paths.flatMap(p=>[p[0],p.at(-1)]).filter(p=>Math.abs(p.x*dx+p.y*dy-32)<1e-7).map(p=>Math.round((-p.x*dy+p.y*dx)*1e7)/1e7).sort((a,b)=>a-b);}
test('全部16种组合只向已连接出口延伸，边界双轨位置严格一致',()=>{for(let mask=0;mask<16;mask++){const shape=mineRailShape(mask);for(let i=0;i<4;i++)assert.deepEqual(ports(shape,i),mask&(1<<i)?[-10,10]:[],`${mask}/${i}`);assert.ok(shape.paths.flat().every(p=>Math.abs(p.x)<=32.00001&&Math.abs(p.y)<=32.00001));assert.equal(new Set(shape.sleepers.map(p=>`${p.x.toFixed(4)},${p.y.toFixed(4)}`)).size,shape.sleepers.length);assert.equal(mineRailShape(mask),shape);}});
test('四向弯轨每个采样点轨距20，枕木沿弧线变化而非直角叠加',()=>{for(const mask of [3,6,12,9]){const s=mineRailShape(mask);assert.equal(s.kind,'bend');assert.equal(s.paths[0].length,s.paths[1].length);s.paths[0].forEach((p,i)=>assert.ok(Math.abs(Math.hypot(p.x-s.paths[1][i].x,p.y-s.paths[1][i].y)-20)<1e-7));assert.ok(new Set(s.sleepers.map(p=>p.angle)).size>=3);assert.ok(s.paths[0].length>10);}});
test('四向三岔和十字使用独立连接，岔心不增加不存在的出口',()=>{for(const mask of [7,11,13,14]){const s=mineRailShape(mask);assert.equal(s.kind,'tee');assert.equal(s.exits.length,3);assert.equal(s.sleepers.length,5);}const cross=mineRailShape(15);assert.equal(cross.kind,'cross');assert.equal(cross.sleepers.length,6);assert.equal(cross.paths.length,8);});
test('邻轨施工或移除立即切换形体，不修改轨道或路口存档',()=>{const cell={x:4,y:5},layer={rails:{'4,5':true,'5,5':true},junctions:{'4,5':1}};assert.equal(mineRailShape(mineRailMask(cell,layer)).kind,'end');layer.rails['4,6']=true;assert.equal(mineRailShape(mineRailMask(cell,layer)).kind,'bend');layer.rails['3,5']=true;assert.equal(mineRailShape(mineRailMask(cell,layer)).kind,'tee');const before=JSON.stringify(layer);mineRailShape(mineRailMask(cell,layer));assert.equal(JSON.stringify(layer),before);delete layer.rails['4,6'];assert.equal(mineRailShape(mineRailMask(cell,layer)).kind,'straight');});
