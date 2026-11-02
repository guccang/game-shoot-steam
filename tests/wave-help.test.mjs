// 波次详情只测试读取当前配额、不同准备阶段与Boss边界，不重复测试战斗算法。
import test from 'node:test';
import assert from 'node:assert/strict';
import {waveHelpState} from '../src/ui/wave-help.js';
import {waveDifficulty} from '../src/config/waves.js';
// 独立战场快照避免界面文本测试启动无关地图模拟。
function state(patch={}){return {wave:2,waveGroupStart:1,bossWave:5,waveKills:3,waveRest:0,waveWarning:0,...patch};}
test('战斗详情准确显示第1轮内第2批的正式配额，重新读取后同步击杀',()=>{
 const g=state(),s=waveHelpState(g);
 assert.equal(s.wave,2);assert.equal(s.round,1);assert.equal(s.kills,3);assert.equal(s.total,waveDifficulty(2).total);assert.equal(s.status,'战斗中');
 assert.equal(s.completed,1);assert.equal(s.count,5);
 g.waveKills=7;assert.equal(waveHelpState(g).kills,7);assert.equal(g.wave,2);
});
test('准备与休整不把下一波数量错配给已完成计数',()=>{
 let s=waveHelpState(state({waveWarning:2}));assert.equal(s.status,'准备中');assert.match(s.note,/本批/);
 const total=waveDifficulty(2).total;s=waveHelpState(state({waveKills:total,waveRest:2}));assert.equal(s.wave,2);assert.equal(s.kills,total);assert.equal(s.total,total);
 assert.equal(s.status,'短暂休整');assert.match(s.note,/第 3 批/);assert.equal(s.completed,2);
});
test('第五波详情采用正式配额，超额击杀显示不得超过总数',()=>{
 const total=waveDifficulty(5).total,s=waveHelpState(state({wave:5,waveKills:total-1}));
 assert.equal(s.kills,total-1);assert.equal(s.total,total);assert.equal(s.status,'战斗中');
 assert.equal(waveHelpState(state({wave:5,waveKills:total+9})).kills,total);
});
test('Boss待挑战说明自动登场，新组休整进度从零开始',()=>{
 let s=waveHelpState(state({waveKills:8,bossWave:2,bossReady:true}));
 assert.equal(s.status,'Boss 已就绪');assert.match(s.note,/Boss 自动登场/);
 s=waveHelpState(state({waveKills:8,waveRest:2,waveGroupStart:3,bossWave:6}));
 assert.equal(s.completed,0);assert.equal(s.count,4);assert.equal(s.wave,2);
});
test('Boss战中详情说明下一组，不再提示重复挑战',()=>{
 const s=waveHelpState(state({boss:{hp:100},bossReady:true}));
 assert.equal(s.status,'Boss 战斗中');assert.match(s.note,/击败 Boss 后/);
});

// 内部批次不决定轮数，旧组长与 Boss 后尚未推进批次的休整均读取正式战绩。
test('第二个Boss前各批次固定显示第2轮，轮间详情不残留上轮击杀',()=>{
 for(const wave of [6,7,8,9,10]){
  const g=state({wave,waveGroupStart:6,bossWave:10,progress:{bosses:1}});
  assert.equal(waveHelpState(g).round,2);
 }
 const s=waveHelpState(state({wave:7,waveKills:24,waveRest:3,waveGroupStart:8,bossWave:11,progress:{bosses:2}}));
 assert.equal(s.round,3);assert.equal(s.kills,0);assert.match(s.note,/第 1 批/);
});
