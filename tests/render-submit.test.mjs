// 验证采样恢复、标签像素预算与 HUD 布局顺序，不依赖墙钟性能阈值。
import test from 'node:test';
import assert from 'node:assert/strict';
import { CanvasCommandSampler } from '../src/platform/canvas-command-sampler.js';
import { layoutTaskCombatHud } from '../src/ui/task-combat-layout.js';

test('指令只在指定战斗帧采样，保持返回值、this、异常和原属性，容量有界', () => {
  let now=0;const sampler=new CanvasCommandSampler(()=>now);
  const prototype={drawImage(value){assert.equal(this,c);now+=2;return value;},stroke(){throw Error('绘制失败');}},c=Object.create(prototype);
  assert.equal(sampler.begin(c,1,'playing',true),false);
  assert.equal(sampler.begin(c,300,'paused',true),false);
  assert.equal(sampler.begin(c,300,'playing',false),false);
  for(let frame=0;frame<6000;frame+=300){
    assert.equal(sampler.begin(c,frame,'playing',true),true);
    try {assert.equal(c.drawImage(42),42);assert.throws(()=>c.stroke(),/绘制失败/);}finally{sampler.end();}
    assert.equal(c.drawImage,prototype.drawImage);assert.deepEqual(Object.keys(c),[]);
  }
  const report=sampler.report();assert.equal(report.samples.length,12);
  assert.deepEqual(report.samples[0].commands.drawImage,{count:1,totalMs:2,maxMs:2});
  sampler.clear();assert.equal(sampler.report().samples.length,0);
});

// 记录几何读写，发现稳定状态重复样式写入和普通排列中读写交替。
function hudFixture(){
  const operations=[],nodes={};let realm=false;
  for(const id of ['game-frame','mainline-hud','quest','boss-hud','equipment-goal','ranger-arrival']){
    let top='';const node=nodes[id]={hidden:false,classList:{contains:()=>false},
      get offsetHeight(){operations.push('read');return id==='mainline-hud'?40:20;},
      get offsetTop(){operations.push('read');return top?parseFloat(top):70;},
      getBoundingClientRect:()=>({top:0}),matches:()=>false};
    node.style={get top(){return top;},set top(value){operations.push('write');top=value;},removeProperty(){operations.push('write');top='';}};
  }
  nodes['game-frame'].classList.contains=()=>realm;
  // 夹具只模拟资源条；生命卡等未提供的真实DOM查询必须返回空值。
  const root={getElementById:id=>nodes[id],querySelector:selector=>selector==='.hud-resources'?{getBoundingClientRect:()=>({top:10,bottom:50,height:40})}:null};
  return {root,nodes,operations,setRealm:value=>realm=value};
}
test('普通 HUD 先测量再写位置，重复排列不写样式，秘境不继承任务偏移',()=>{
  const {root,nodes,operations,setRealm}=hudFixture();layoutTaskCombatHud(root);
  assert.equal(nodes.quest.style.top,'58px');assert.equal(nodes['boss-hud'].style.top,'86px');
  assert.ok(!operations.slice(operations.indexOf('write')).includes('read'));
  operations.length=0;layoutTaskCombatHud(root);assert.ok(!operations.includes('write'));
  nodes['mainline-hud'].hidden=true;setRealm(true);layoutTaskCombatHud(root);
  assert.equal(nodes.quest.style.top,'');assert.equal(nodes['boss-hud'].style.top,'98px');
  operations.length=0;layoutTaskCombatHud(root);assert.ok(!operations.includes('write'));
  nodes.quest.hidden=true;layoutTaskCombatHud(root);assert.equal(nodes['boss-hud'].style.top,'');
});
