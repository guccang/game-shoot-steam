// 首页读档与写入边界测试：保留当前版本数据，不把损坏存档作为新档自动覆盖。
import test from 'node:test';
import assert from 'node:assert/strict';
import {createSaveStore,STORAGE_KEYS,WORLD_SAVE_REVISION} from '../src/platform/storage.js';
import {createProgressController} from '../src/app/progress-controller.js';
import {freshProgress} from '../src/progression/progress.js';
// 记录每次写入以证明首页检查没有迁移落盘等副作用。
function memory(text=null){let value=text,writes=0;return {getItem:key=>key===STORAGE_KEYS.worldRevision?WORLD_SAVE_REVISION:value,setItem:(_key,next)=>{value=next;writes++;},get value(){return value;},get writes(){return writes;}};}
test('首页区分缺档、有效当前档、损坏和不可访问，检查绝不写入',()=>{
  for(const [text,status] of [[null,'missing'],['{bad','corrupt'],['null','corrupt'],['[]','corrupt'],['{}','corrupt'],['{"version":1,"coins":465,"wood":30,"heroes":[2],"weapons":[1]}','valid']]){
    const storage=memory(text),store=createSaveStore(()=>storage),result=store.inspectProgress();
    assert.equal(result.status,status);assert.equal(storage.value,text);assert.equal(storage.writes,0);
    if(status==='valid'){assert.equal(result.progress.coins,465);assert.equal(result.progress.heroes[0],2);}
  }
  assert.equal(createSaveStore(()=>{throw Error('blocked');}).inspectProgress().status,'unavailable');
});
test('打开首页时保存事件不能覆盖原始损坏存档',()=>{
  const storage=memory('{bad'),store=createSaveStore(()=>storage);
  const controller=createProgressController({game:{syncStory(){throw Error('不应触碰游戏');}},store,canSave:()=>false});
  assert.equal(controller.save(),false);assert.equal(storage.value,'{bad');assert.equal(storage.writes,0);
});
test('清档写入失败时不会重置内存或关闭弹窗',()=>{
  const game={progress:freshProgress(),resetProgress(){throw Error('不得清内存');}};
  game.progress.coins=999;
  const store=createSaveStore(()=>({setItem(){throw Error('quota');}}));
  const controller=createProgressController({game,store,root:{getElementById:()=>({})}});
  assert.equal(controller.resetProgress(),false);assert.equal(game.progress.coins,999);
});
test('显式新档仍使用既有存档键和初始成长',()=>{
  const keys=[],storage={getItem:key=>key===STORAGE_KEYS.worldRevision?WORLD_SAVE_REVISION:null,setItem:(key,value)=>keys.push([key,JSON.parse(value)])};
  const store=createSaveStore(()=>storage);assert.equal(store.saveProgress(freshProgress()),true);
  assert.equal(keys[0][0],STORAGE_KEYS.progress);assert.equal(keys[0][1].coins,60);assert.equal(keys[0][1].wood,30);
});
