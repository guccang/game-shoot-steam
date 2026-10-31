// 消防站分层回归：建筑完整显示条件必须与前层修复绘制一致。
import test from 'node:test';
import assert from 'node:assert/strict';
import {restorationBuildingVisible,drawRestorationObject} from '../src/rendering/town-restoration.js';
import {RESTORATION_FLIGHT,RESTORATION_SECONDS} from '../src/config/town-restoration.js';
// 最小画布只记录正式修复绘制分支，不模拟游戏渲染结果。
const canvas=new Proxy({}, {get:()=>()=>{},set:()=>true});
const entry={type:'realm-entrance',mode:'fire',x:1420,y:1100,width:256,height:142};
for(const [label,story,realm,repaired,stage,expected] of [
 ['未修复',null,null,[],null,false],
 ['修复前半程',null,null,[],.3,false],
 ['开始显露前的临界值',null,null,[],.48,false],
 ['修复后半程',null,null,[],.6,true],
 ['已修复',null,null,['fire'],null,true],
 ['未修复但处于故事场景',{},null,[],null,true],
 ['秘境场景',null,{},[],null,true],
])test(label+'：前后墙使用相同显露条件',()=>{
 const game={story,realm,progress:{restoration:{repaired,build:stage===null?null:{id:'fire',elapsed:RESTORATION_FLIGHT+(RESTORATION_SECONDS-RESTORATION_FLIGHT)*stage}}}};
 assert.equal(restorationBuildingVisible(game,'fire'),expected);
 assert.equal(drawRestorationObject(canvas,entry,game),!expected);
});
test('其他建筑施工不会显露未修复消防站',()=>{
 const game={progress:{restoration:{repaired:[],build:{id:'garage',elapsed:RESTORATION_SECONDS}}}};
 assert.equal(restorationBuildingVisible(game,'fire'),false);
 assert.equal(drawRestorationObject(canvas,entry,game),true);
});
