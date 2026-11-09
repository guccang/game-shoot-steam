// 验证受光方向、遮挡柔边、周期平移与光照边缘，防止动态移动时跳色或穿光。
import test from 'node:test';
import assert from 'node:assert/strict';
import {treeShadowShape,buildingShadowShape,lightTransmission,sampleSceneLight} from '../src/world/scene-depth.js';
const lamp={x:0,y:0,offset:0,radius:150,power:1};
test('局部受光朝向灯源，离开半径连续归零',()=>{
 const a=sampleSceneLight({x:30,y:0},{night:1},[],[lamp]);assert.equal(a.dx,-1);assert.equal(a.dy,0);assert.ok(a.power>.6);assert.equal(a.sun,0);
 const edge=sampleSceneLight({x:149.9,y:0},{night:1},[],[lamp]);assert.ok(edge.power<.000001);assert.equal(sampleSceneLight({x:151,y:0},{},[],[lamp]).power,0);
});
test('树干遮挡中间光路，近端与背后树不错误挡光，柔边连续',()=>{
 const p={x:100,y:0},tree={x:50,y:0,size:1};assert.ok(lightTransmission(p,lamp,[tree])<.1);
 assert.equal(lightTransmission(p,lamp,[{...tree,x:120}]),1);assert.equal(lightTransmission(p,lamp,[{...tree,x:-20}]),1);
 const values=[5,7,9,11,13].map(y=>lightTransmission(p,lamp,[{...tree,y}]));assert.ok(values.every((v,i)=>!i||v>=values[i-1]));assert.equal(values.at(-1),1);
});
test('日照阴影随树高和种类变化，夜晚不叠加太阳树荫',()=>{
 const t={x:20,y:40,size:1},s=treeShadowShape(t),p={x:s.x,y:s.y};assert.ok(s.x>t.x&&s.y>t.y);assert.equal(treeShadowShape({...t,size:2}).length,s.length*2);assert.ok(treeShadowShape({...t,variant:'pine'}).rx<s.rx);
 assert.equal(sampleSceneLight(p,{},[t]).shade,1);assert.equal(sampleSceneLight(p,{night:1},[t]).shade,0);
});
test('镜头或周期世界整体平移不会改变受光、阴影与方向',()=>{
 const p={x:100,y:30},t={x:70,y:15,size:1},shift=o=>({...o,x:o.x+1800,y:o.y-2400});
 const a=sampleSceneLight(p,{night:.4},[t],[lamp]),b=sampleSceneLight(shift(p),{night:.4},[shift(t)],[shift(lamp)]);
 for(const k of Object.keys(a))assert.ok(Math.abs(a[k]-b[k])<1e-12,k);
});
test('建筑按底座和屋高投影，标牌不投出虚假的整栋屋影',()=>{
 const b=buildingShadowShape({type:'construction-company',x:100,y:200});assert.ok(b.w>100&&b.dx>0&&b.dy>0);assert.equal(buildingShadowShape({type:'camp-land-sign',x:100,y:200}),null);
 const p={x:b.x+b.dx*.5,y:b.y+b.dy*.5};assert.ok(sampleSceneLight(p,{},[],[],[b]).shade>.9);assert.equal(sampleSceneLight({x:100,y:180},{},[],[],[b]).shade,0);
});
test('双灯交界方向连续，避免最强光源切换造成投影翻转',()=>{
 const lamps=[{...lamp,x:-50},{...lamp,x:50}];const a=sampleSceneLight({x:-.01,y:20},{night:1},[],lamps),b=sampleSceneLight({x:.01,y:20},{night:1},[],lamps);assert.ok(Math.abs(a.dx-b.dx)<.01);assert.ok(Math.abs(a.dy-b.dy)<.01);
});
