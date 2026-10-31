// 大地图版本一次性清档：仅游戏进度与回放，设置保留，新档可持续恢复。
import test from 'node:test';
import assert from 'node:assert/strict';
import {createSaveStore,STORAGE_KEYS,WORLD_SAVE_REVISION} from '../src/platform/storage.js';
import {freshProgress} from '../src/progression/progress.js';
// 内存存储遵循浏览器缺键返回空值的行为，便于检查版本重置的边界。
function fixture(){const values=new Map();return {values,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};}
test('首次版本清空旧成长与回放，保留声音环境及操作设置',()=>{
 const memory=fixture(),old=freshProgress();old.coins=9988;
 memory.setItem(STORAGE_KEYS.progress,JSON.stringify(old));memory.setItem(STORAGE_KEYS.chronicle,'{"duration":123}');
 for(const key of ['audio','environment','gameplay'])memory.setItem(STORAGE_KEYS[key],'{"kept":true}');
 const store=createSaveStore(()=>memory);assert.equal(store.inspectProgress().status,'missing');assert.equal(memory.getItem(STORAGE_KEYS.progress),null);assert.equal(memory.getItem(STORAGE_KEYS.chronicle),null);assert.equal(memory.getItem(STORAGE_KEYS.worldRevision),WORLD_SAVE_REVISION);
 for(const key of ['audio','environment','gameplay'])assert.equal(memory.getItem(STORAGE_KEYS[key]),'{"kept":true}');
});
test('新版本保存后刷新不会重复清档，远处位置可恢复',()=>{
 const memory=fixture(),store=createSaveStore(()=>memory),p=freshProgress();p.coins=321;p.living.position={x:9800,y:7600};assert.equal(store.saveProgress(p),true);
 const next=createSaveStore(()=>memory);assert.equal(next.inspectProgress().status,'valid');assert.equal(next.loadProgress().coins,321);assert.deepEqual(next.loadProgress().living.position,p.living.position);
});
test('清档被拒绝时不把旧成长读入新地图，保存明确失败',()=>{
 const memory=fixture();memory.setItem(STORAGE_KEYS.progress,JSON.stringify({...freshProgress(),coins:999}));memory.removeItem=()=>{throw Error('拒绝访问');};
 const store=createSaveStore(()=>memory);assert.equal(store.inspectProgress().status,'unavailable');assert.notEqual(store.loadProgress().coins,999);assert.equal(store.saveProgress(freshProgress()),false);
});
