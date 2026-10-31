// 验证移动热点复用布局但不复用世界位置，缩屏、帧外交互和不同应用保持隔离。
import test from 'node:test';
import assert from 'node:assert/strict';
import {beginSceneLayout,sceneLayout,endSceneLayout} from '../src/ui/scene-layout.js';
import {placeSceneHit} from '../src/ui/scene-hit.js';
import {FARM_PLOT_SHAPE} from '../src/config/farm.js';

// 容器夹具可主动移动，统计真实测量次数而不模拟浏览器排版性能。
function fixture() {
  let reads=0,left=10;
  const frame={getBoundingClientRect(){reads++;return {left,top:20,width:390,height:844};}};
  const renderer={view:{x:0,y:0,w:390,h:844,zoom:1},canvas:{getBoundingClientRect(){reads++;return {left:left+2,top:24};}}};
  return {frame,renderer,reads:()=>reads,move:()=>{left=100;}};
}

test('一帧多个移动命中区只测量一次容器，同时实时投影新坐标',()=>{
  const f=fixture(),node={style:{}};beginSceneLayout(f.renderer);
  placeSceneHit(node,{x:100,y:200},f.renderer,f.frame);
  const first=node.style.left;
  placeSceneHit(node,{x:150,y:200},f.renderer,f.frame);
  assert.equal(f.reads(),2);assert.equal(parseFloat(node.style.left)-parseFloat(first),50);
  assert.equal(node.hidden,false);assert.ok(parseFloat(node.style.width)>=44);
  placeSceneHit(node,{x:1000,y:200},f.renderer,f.frame);assert.equal(node.hidden,true);
  endSceneLayout(f.renderer);
});

test('帧结束后旋转与帧外调用重新测量，不将快照带入下一帧',()=>{
  const f=fixture();beginSceneLayout(f.renderer);
  assert.equal(sceneLayout(f.renderer,f.frame).frame.left,10);endSceneLayout(f.renderer);f.move();
  assert.equal(sceneLayout(f.renderer,f.frame).frame.left,100);
  sceneLayout(f.renderer,f.frame);assert.equal(f.reads(),6);
  beginSceneLayout(f.renderer);sceneLayout(f.renderer,f.frame);sceneLayout(f.renderer,f.frame);
  assert.equal(f.reads(),8);endSceneLayout(f.renderer);
});

test('不同应用和容器不共享几何快照',()=>{
  const a=fixture(),b=fixture();b.move();beginSceneLayout(a.renderer);beginSceneLayout(b.renderer);
  assert.equal(sceneLayout(a.renderer,a.frame).frame.left,10);
  assert.equal(sceneLayout(b.renderer,b.frame).frame.left,100);
  assert.equal(sceneLayout(a.renderer,b.frame).frame.left,100);
  endSceneLayout(a.renderer);endSceneLayout(b.renderer);
});

test('热点离屏隐藏后重新入镜使用最新坐标，缩放仍保留44px触控下限',()=>{
  const f=fixture(),node={style:{}};beginSceneLayout(f.renderer);
  placeSceneHit(node,{x:100,y:200},f.renderer,f.frame);const first=node.style.left;
  placeSceneHit(node,{x:1000,y:200},f.renderer,f.frame);assert.equal(node.hidden,true);
  placeSceneHit(node,{x:200,y:220},f.renderer,f.frame);assert.equal(node.hidden,false);assert.equal(parseFloat(node.style.left)-parseFloat(first),100);
  f.renderer.view.zoom=.1;placeSceneHit(node,{x:200,y:220},f.renderer,f.frame);assert.equal(node.style.width,'44px');assert.equal(node.style.height,'44px');
  f.renderer.view=null;placeSceneHit(node,{x:200,y:220},f.renderer,f.frame);assert.equal(node.hidden,true);endSceneLayout(f.renderer);
});

// 地块按世界中心投影，低缩放下扩大触控区只能向四周扩展，不能产生向上的脚底偏移。
test('田地中心锚点在不同缩放下与正式地块重合，并保留触控下限',()=>{
 const f=fixture(),node={style:{}};
 for(const zoom of [.5,.75,1,1.5,2]){
  f.renderer.view.zoom=zoom;
  placeSceneHit(node,{x:100,y:200},f.renderer,f.frame,{...FARM_PLOT_SHAPE,centered:true});
  assert.equal(parseFloat(node.style.left)+parseFloat(node.style.width)/2,100*zoom+2);
  assert.equal(parseFloat(node.style.top)+parseFloat(node.style.height)/2,200*zoom+4);
  assert.ok(parseFloat(node.style.width)>=44);assert.ok(parseFloat(node.style.height)>=44);
 }
});

// 田块中心略出屏幕但仍有可见面积时，触控与教学框一同保留，完全离屏后再隐藏。
test('中心锚点田块在画面边缘按完整触控矩形裁剪',()=>{
 const f=fixture(),node={style:{}};
 placeSceneHit(node,{x:100,y:-10},f.renderer,f.frame,{...FARM_PLOT_SHAPE,centered:true});assert.equal(node.hidden,false);
 placeSceneHit(node,{x:100,y:-40},f.renderer,f.frame,{...FARM_PLOT_SHAPE,centered:true});assert.equal(node.hidden,true);
});
