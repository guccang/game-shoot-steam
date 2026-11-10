// 伐木累计增量与主档的原子衔接：刷新恢复、失败回滚和旧记录隔离。
import test from 'node:test';
import assert from 'node:assert/strict';
import {createSaveStore,STORAGE_KEYS} from '../src/platform/storage.js';
import {freshProgress} from '../src/progression/progress.js';
// 记录真实序列化字节和写入键，并可注入配额失败。
function fixture(){
 const data=new Map(),writes=[];let denied=false;
 const storage={getItem:key=>data.get(key)??null,removeItem:key=>data.delete(key),setItem(key,value){if(denied)throw Error('配额不足');data.set(key,value);writes.push({key,bytes:value.length});}};
 return {data,writes,storage,store:createSaveStore(()=>storage),deny(value){denied=value;}};
}
test('连续二十笔只建立一次主档，累计记录刷新后精确恢复且不重复奖励',()=>{
 const f=fixture(),p=freshProgress();
 for(let i=1;i<=20;i++){p.logistics.bagWood=i*8;p.statistics.resources.wood=i*8;assert.equal(f.store.saveWoodProgress(p),true);const restored=createSaveStore(()=>f.storage).loadProgress();assert.equal(restored.logistics.bagWood,i*8);assert.equal(restored.statistics.resources.wood,i*8);}
 assert.equal(f.writes.filter(w=>w.key===STORAGE_KEYS.progress).length,1);
 assert.equal(f.writes.filter(w=>w.key===STORAGE_KEYS.woodJournal).length,19);
 assert.ok(f.writes.at(-1).bytes<f.writes.find(w=>w.key===STORAGE_KEYS.progress).bytes/2);
});
test('失败增量不覆盖之前奖励，重试成功后刷新只恢复一次',()=>{
 const f=fixture(),p=freshProgress();p.logistics.bagWood=8;f.store.saveWoodProgress(p);p.logistics.bagWood=16;f.store.saveWoodProgress(p);
 f.deny(true);p.logistics.bagWood=24;assert.equal(f.store.saveWoodProgress(p),false);assert.equal(createSaveStore(()=>f.storage).loadProgress().logistics.bagWood,16);
 f.deny(false);assert.equal(f.store.saveWoodProgress(p),true);assert.equal(createSaveStore(()=>f.storage).loadProgress().logistics.bagWood,24);
});
test('全档提交合并最新奖励，旧增量不能覆盖花费、清档或后续奖励',()=>{
 const f=fixture(),p=freshProgress();p.logistics.bagWood=8;f.store.saveWoodProgress(p);p.logistics.bagWood=16;f.store.saveWoodProgress(p);const old=f.data.get(STORAGE_KEYS.woodJournal);
 p.logistics.bagWood=3;assert.equal(f.store.saveProgress(p),true);f.data.set(STORAGE_KEYS.woodJournal,old);assert.equal(createSaveStore(()=>f.storage).loadProgress().logistics.bagWood,3);
 p.logistics.bagWood=11;f.store.saveWoodProgress(p);assert.equal(createSaveStore(()=>f.storage).loadProgress().logistics.bagWood,11);
 f.store.saveProgress(freshProgress());assert.equal(createSaveStore(()=>f.storage).loadProgress().logistics.bagWood,0);
});
test('主档写失败不废弃已保存增量，恢复后仍可继续提交',()=>{
 const f=fixture(),p=freshProgress();p.logistics.bagWood=8;f.store.saveWoodProgress(p);p.logistics.bagWood=16;f.store.saveWoodProgress(p);
 f.deny(true);assert.equal(f.store.saveProgress(freshProgress()),false);f.deny(false);assert.equal(createSaveStore(()=>f.storage).loadProgress().logistics.bagWood,16);
 p.logistics.bagWood=24;f.store.saveWoodProgress(p);assert.equal(createSaveStore(()=>f.storage).loadProgress().logistics.bagWood,24);
});
test('增量记录保留伐木期间其他字段变化和字段删除，不用显示文案关联',()=>{
 const f=fixture(),p=freshProgress();p.extraTest=true;f.store.saveWoodProgress(p);delete p.extraTest;p.coins+=17;p.statistics.resources.wood+=8;f.store.saveWoodProgress(p);
 const raw=JSON.parse(f.data.get(STORAGE_KEYS.woodJournal));assert.equal(raw.fields.extraTest,null);assert.equal(createSaveStore(()=>f.storage).loadProgress().coins,p.coins);
});

// 手机通过局域网 HTTP 访问时没有安全上下文 UUID，保存仍须有效。
test('不支持安全上下文 UUID 时仍能保存并恢复连续奖励',()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto');
 try{Object.defineProperty(globalThis,'crypto',{value:{},configurable:true});const f=fixture(),p=freshProgress();assert.equal(f.store.saveProgress(p),true);p.logistics.bagWood=8;assert.equal(f.store.saveWoodProgress(p),true);assert.equal(createSaveStore(()=>f.storage).loadProgress().logistics.bagWood,8);}finally{Object.defineProperty(globalThis,'crypto',descriptor);}
});
