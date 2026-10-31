// 过场时钟与真实准备信号的边界检查，避免假完成、重复进入或销毁后回调。
import test from 'node:test';
import assert from 'node:assert/strict';
import {createStartLoading} from '../src/ui/start-loading.js';

// 用受控时钟驱动正式控制器，动画对象只记录取消，不模拟游戏加载。
function fixture(reduced=false){
  let now=0,id=0;const frames=new Map(),nodes=new Map(),animations=[];
  const root={getElementById(key){if(!nodes.has(key))nodes.set(key,{hidden:true,textContent:'',attrs:{},dataset:{},focus(){},setAttribute(k,v){this.attrs[k]=v;},animate(keyframes,options){const a={keyframes,options,cancelled:false,cancel(){this.cancelled=true;}};animations.push(a);return a;}});return nodes.get(key);}};
  const host={performance:{now:()=>now},matchMedia:()=>({matches:reduced}),requestAnimationFrame(fn){frames.set(++id,fn);return id;},cancelAnimationFrame(key){frames.delete(key);}};
  const loader=createStartLoading({root,host});
  // 每次只推进已经排队的一帧，新排队回调留待下一次时钟。
  function step(time,frameTime=time){now=time;const pending=[...frames.values()];frames.clear();for(const fn of pending)fn(frameTime);}
  return {loader,step,frames,animations,panel:root.getElementById('start-loading'),bar:root.getElementById('start-loading-progress'),label:root.getElementById('start-loading-percent')};
}

test('准备很快也展示0、途中、100%，短暂停留后才进入',()=>{
  const f=fixture();let entered=0;f.loader.start();f.loader.complete(()=>entered++);
  assert.equal(f.bar.attrs['aria-valuenow'],'0');assert.equal(f.panel.hidden,false);
  f.step(800);assert.equal(f.bar.attrs['aria-valuenow'],'45');assert.equal(entered,0);
  f.step(1600);f.step(1860);assert.equal(f.bar.attrs['aria-valuenow'],'100');assert.equal(f.panel.hidden,false);assert.equal(entered,0);
  f.step(1980);assert.equal(entered,1);assert.equal(f.panel.hidden,true);assert.equal(f.frames.size,0);assert.ok(f.animations.every(a=>a.cancelled));
});
test('慢加载超过三秒也不会假报100%或提前进入',()=>{
  const f=fixture();let entered=0;f.loader.start();f.step(4000);assert.equal(f.bar.attrs['aria-valuenow'],'90');assert.equal(f.panel.dataset.phase,'waiting');
  f.loader.complete(()=>entered++);f.step(4100);assert.equal(f.panel.dataset.phase,'finishing');f.step(4360);assert.equal(f.bar.attrs['aria-valuenow'],'100');assert.equal(entered,0);
  f.step(4480);assert.equal(entered,1);
});
test('失败停止和销毁均清理动画并取消进入回调',()=>{
  for(const method of ['stop','dispose']){const f=fixture();let entered=0;f.loader.start();f.loader.complete(()=>entered++);f.step(1600);f.loader[method]();f.step(5000);assert.equal(entered,0);assert.equal(f.panel.hidden,true);assert.equal(f.frames.size,0);assert.ok(f.animations.every(a=>a.cancelled));}
});
test('重新开始清掉上一次时序，减少动态仅保留进度填充',()=>{
  const f=fixture(true);let entered=0;f.loader.start();f.loader.complete(()=>entered++);f.step(800);f.loader.start();
  assert.equal(f.bar.attrs['aria-valuenow'],'0');assert.equal(f.animations.length,2);assert.equal(f.animations[0].cancelled,true);
  f.step(3000);assert.equal(entered,0);assert.equal(f.bar.attrs['aria-valuenow'],'90');f.loader.dispose();
});

// 同帧较晚点击时，回调携带的帧时间可能早于点击时读取的高精度时间。
test('首个动画帧早于开始时间时，显示和读屏保持0且不提前完成',()=>{
  for(const reduced of [false,true]){
    const f=fixture(reduced);let entered=0;f.step(1000);f.loader.start();f.loader.complete(()=>entered++);
    f.step(1002,984);assert.equal(f.label.textContent,'0%');assert.equal(f.bar.attrs['aria-valuenow'],'0');assert.equal(f.panel.dataset.phase,'moving');assert.equal(entered,0);
    f.step(1800);assert.equal(f.label.textContent,'45%');
    f.step(2600);f.step(2860);assert.equal(f.label.textContent,'100%');assert.equal(entered,0);
    f.step(2980);assert.equal(entered,1);assert.equal(f.panel.hidden,true);
  }
});
// 重开会重新读取点击时钟，同样不能让略早的帧时间显示负数或继承完成态。
test('重新开始后的较早帧保持0，慢加载仍停在90',()=>{
  const f=fixture();let entered=0;f.loader.start();f.loader.complete(()=>entered++);f.step(1600);f.step(1700);f.loader.start();
  f.step(1702,1699.9);assert.equal(f.label.textContent,'0%');assert.equal(f.bar.attrs['aria-valuenow'],'0');
  f.step(6000);assert.equal(f.label.textContent,'90%');assert.equal(f.panel.dataset.phase,'waiting');assert.equal(entered,0);f.loader.dispose();
});
