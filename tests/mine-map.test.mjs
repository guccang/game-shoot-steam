// 地下探索图读取真实存档，测试未探索遮蔽、轨道连接和坐标变换。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshMining,openBasement,normalizeMining} from '../src/progression/mining/mining.js';
import {freshMineLayer} from '../src/progression/mining/mine-layers.js';
import {MINING,minePoint,mineKey} from '../src/config/mining.js';
import {mineTerrain} from '../src/config/mine-ecology.js';
import {buildMineMapModel,fitMineMap,zoomMineMap,clampMineMap} from '../src/world/mine-map.js';
// 模拟已保存的探索和建设记录，不依赖渲染器才能计算地图。
function layer(){const l=freshMining();openBasement(l);l.seed=1847;return l;}
test('仅显示已探索与已有设施，不提前揭露远处天然洞厅且读取不改存档',()=>{
 const l=layer();let unseen;
 for(let y=2;y<40&&!unseen;y++)for(let x=2;x<40;x++){const t=mineTerrain({x,y},l);if(t.natural&&!l.dug[mineKey({x,y})]){unseen={x,y};break;}}
 assert.ok(unseen);const before=JSON.stringify(l),model=buildMineMapModel(l,MINING.home);
 assert.equal(model.cells.length,Object.keys(l.dug).length);assert.equal(model.cells.some(c=>c.key===mineKey(unseen)),false);assert.equal(JSON.stringify(l),before);
 l.rails[mineKey(unseen)]=true;assert.ok(buildMineMapModel(l,MINING.home).rails.some(c=>c.key===mineKey(unseen)));
});
test('铁轨只连接真实相邻格，转弯、十字、断开段和远端路线均保留',()=>{
 const l=layer();for(const [x,y] of [[0,0],[1,0],[2,0],[1,-1],[1,1],[20,20]]){l.dug[x+','+y]=true;l.rails[x+','+y]=true;}
 const m=buildMineMapModel(l,minePoint({x:20,y:20}));assert.equal(m.rails.length,6);assert.equal(m.segments.length,4);
 assert.ok(m.bounds.right>=20.5);assert.deepEqual(m.position,{x:20,y:20});assert.equal(m.segments.some(s=>s.a.x===20||s.b.x===20),false);
});
test('洞口和上下行标记来自当前层；深层不伪造地表小屋',()=>{
 const l=layer();l.dug['4,0']=true;l.shafts=['4,0'];l.descent='1,0';
 assert.deepEqual(buildMineMapModel(l,MINING.home).markers.map(m=>m.name),['仓库升井','小屋','下层','洞口1']);
 const deep=freshMineLayer(2,{x:5,y:4},()=>.3),model=buildMineMapModel(deep,minePoint({x:5,y:4}),2);
 assert.equal(model.markers.some(m=>m.kind==='home'),false);assert.ok(model.markers.some(m=>m.name==='上层'&&m.key==='5,4'));
});
test('刷新读档保留探索和铁轨，层外非法记录不出现在地图',()=>{
 const l=layer();l.dug['2,0']=true;l.rails['2,0']=true;const saved=normalizeMining(l);
 assert.ok(buildMineMapModel(saved,MINING.home).rails.some(c=>c.key==='2,0'));
 saved.dug['99999,99999']=true;saved.rails['99999,99999']=true;
 assert.equal(buildMineMapModel(saved,MINING.home).cells.some(c=>c.x===99999),false);
});
test('默认适配、焦点缩放与拖动限制在手机尺寸下保持有限坐标',()=>{
 const l=layer();l.dug['150,90']=true;const model=buildMineMapModel(l,MINING.home);
 for(const [w,h] of [[280,360],[440,670],[280,110]]){
  const v=fitMineMap(model,w,h),px=w*.3,py=h*.7,world={x:v.x+(px-w/2)/v.scale,y:v.y+(py-h/2)/v.scale};
  zoomMineMap(v,1.5,px,py,w,h);assert.ok(Math.abs(v.x+(px-w/2)/v.scale-world.x)<1e-9);assert.ok(Math.abs(v.y+(py-h/2)/v.scale-world.y)<1e-9);
  zoomMineMap(v,1e9,px,py,w,h);assert.equal(v.scale,64);zoomMineMap(v,1e-9,px,py,w,h);assert.equal(v.scale,v.minScale);
  v.x=1e8;v.y=-1e8;clampMineMap(v,model,w,h);assert.ok(Number.isFinite(v.x)&&v.x<1e8&&v.y>-1e8);
 }
});
