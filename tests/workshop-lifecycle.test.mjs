// 工坊拆分回归：异步试射失效、暂停时钟及旧入口的秘境兼容。
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkshopTrial } from '../src/ui/workshop/trial.js';
import { bindWorkshopEntrypoints } from '../src/ui/workshop/entrypoints.js';

// 可控素材加载与动画时钟，让取消顺序不依赖真实浏览器计时。
function fixture() {
  const frames=new Map(),elements=new Map(),loads=[],created=[],deltas=[];
  let id=0,nested=false;
  const root={hidden:false,defaultView:{requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:n=>frames.delete(n)},
    getElementById:key=>{if(!elements.has(key))elements.set(key,{hidden:true,textContent:'',getContext:()=>({}),scrollIntoView(){}});return elements.get(key);},
    querySelector:()=>nested};
  const dialog={open:true};
  const trial=createWorkshopTrial({root,dialog,reduced:()=>false,load:()=>new Promise((resolve,reject)=>loads.push({resolve,reject})),draw:()=>{},
    createTrial:(progress,kind,index)=>{created.push({progress,kind,index});return {elapsed:0,batch:1,destroyed:0,advance(dt){deltas.push(dt);this.elapsed+=dt;return true;}};}});
  // 运行当前排队帧，新申请的帧留给下一次推进。
  function tick(now){const pending=[...frames.values()];frames.clear();for(const run of pending)run(now);}
  return {root,dialog,trial,frames,loads,created,deltas,tick,nest:value=>{nested=value;},start:index=>trial.start({progress:{weapon:index},kind:'weapons',index,label:'当前配置'})};
}

test('切换后旧素材加载成功或失败都不能启动试射或覆盖新反馈',async()=>{
  for(const success of [true,false]) {
    const f=fixture(),old=f.start(0);f.trial.stop();
    f.root.getElementById('ws-feedback').textContent='新装备';f.loads[0].resolve(success);await old;
    assert.equal(f.created.length,0);assert.equal(f.frames.size,0);assert.equal(f.trial.active(),false);
    assert.equal(f.root.getElementById('ws-feedback').textContent,'新装备');
  }
});

test('连续点击仅最后请求创建独立会话，过期拒绝不覆盖当前试射',async()=>{
  const f=fixture(),old=f.start(0),latest=f.start(9);f.loads[1].resolve(true);await latest;
  f.loads[0].reject(Error('旧请求失败'));await old;
  assert.deepEqual(f.created.map(x=>x.index),[9]);assert.equal(f.frames.size,1);assert.equal(f.trial.active(),true);
  assert.equal(f.root.getElementById('ws-feedback').textContent,'');
});

test('关闭弹窗阻止待定请求创建会话，当前加载失败允许重新开始',async()=>{
  const f=fixture(),old=f.start(0);f.dialog.open=false;f.loads[0].resolve(true);await old;
  assert.equal(f.created.length,0);f.dialog.open=true;
  const failed=f.start(9);f.loads[1].resolve(false);await failed;
  assert.match(f.root.getElementById('ws-feedback').textContent,/图集加载失败/);
  const retry=f.start(9);f.loads[2].resolve(true);await retry;assert.equal(f.trial.active(),true);
});

test('后台和嵌套弹窗冻结试射时钟，释放会话后不再申请动画帧',async()=>{
  const f=fixture(),start=f.start(0);f.loads[0].resolve(true);await start;
  f.tick(1000);f.tick(1100);f.root.hidden=true;f.tick(3100);f.root.hidden=false;
  f.nest(true);f.tick(5100);f.nest(false);f.tick(5200);
  assert.deepEqual(f.deltas,[0,0.1,0,0,0.1]);f.trial.stop();f.trial.stop();f.tick(6000);
  assert.equal(f.frames.size,0);assert.equal(f.deltas.length,5);assert.equal(f.root.getElementById('ws-trial').hidden,true);
});

test('旧入口定位追踪炮塔所属载具，秘境不拦截原有入口',()=>{
  const handlers={},calls=[],game={realm:null,progress:{vehicleIndex:2,equipmentGoal:{kind:'turret',index:9}}};
  bindWorkshopEntrypoints({root:{},scope:{on:(_,type,handler)=>{handlers[type]=handler;}},game,open:(...args)=>calls.push(args)});
  let prevented=0;
  const event={target:{closest:()=>({id:'goal-workshop',dataset:{}})},preventDefault:()=>prevented++,stopImmediatePropagation:()=>{}};
  handlers.click(event);assert.deepEqual(calls,[['vehicle',2,9]]);assert.equal(prevented,1);
  game.realm={};handlers.click(event);handlers.keydown({...event,key:'ArrowRight'});
  assert.equal(calls.length,1);assert.equal(prevented,1);
});
