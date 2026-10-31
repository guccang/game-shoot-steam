// 打字机只负责文字进度；切句、跳过和任务事务由正式对话入口负责。
import test from 'node:test';
import assert from 'node:assert/strict';
import {createDialogueText} from '../src/ui/dialogue-text.js';
test('逐字显示中文与完整Unicode，点击补齐不会同时进入下一句',()=>{
 const w=createDialogueText(20);w.begin('a','猫🐱回来啦');assert.equal(w.text,'');w.tick(.05);assert.equal(w.text,'猫');w.tick(.05);assert.equal(w.text,'猫🐱');assert.equal(w.complete,false);
 assert.ok(w.reveal());assert.equal(w.text,'猫🐱回来啦');assert.equal(w.complete,true);assert.equal(w.reveal(),false);
 w.tick(300);assert.equal(w.text,'猫🐱回来啦');
});
test('重复渲染与暂停保持进度，换句和关闭后重新打开会重新打字',()=>{
 const w=createDialogueText(20),key={};w.begin(key,'完整的一句话');w.tick(.05);w.begin(key,'完整的一句话');w.tick(0);assert.equal(w.text,'完');
 w.begin({},'完整的一句话');assert.equal(w.text,'');w.reveal();w.reset();w.begin(key,'完整的一句话');assert.equal(w.complete,false);assert.equal(w.text,'');
});
test('后台大间隔不追赶全文，完成后长期等待也不会自行换句',()=>{
 const w=createDialogueText(20);w.begin('a','请认真阅读这里的故事');w.tick(1000);assert.equal(w.text,'请');
 for(let i=0;i<500;i++)w.tick(.05);assert.equal(w.text,'请认真阅读这里的故事');assert.equal(w.complete,true);
});
