// 帧率按真实渲染间隔计算，验证关闭、后台与重开不计入旧时间。
import test from 'node:test';
import assert from 'node:assert/strict';
import {createFpsDisplay} from '../src/ui/fps-display.js';
import {createSaveStore,STORAGE_KEYS} from '../src/platform/storage.js';

// 最小DOM夹具仅保存读数，使用真实EventTarget验证生命周期解绑。
function fixture(){const root=new EventTarget(),node={textContent:'',hidden:true},preferences={showFps:true};root.getElementById=()=>node;root.hidden=false;return {root,node,preferences,display:createFpsDisplay(root,preferences)};}

test('实际60和30绘制帧正确显示，不受25Hz逻辑影响',()=>{
 for(const hz of [60,30]){const {display,node}=fixture();for(let i=0;i<=hz;i++)display.recordFrame(i*1000/hz);assert.equal(node.textContent,hz+' FPS');display.dispose();}
});

test('关闭、后台与首页丢弃旧采样窗口，卸载后不留下监听',()=>{
 const {root,node,preferences,display}=fixture();display.recordFrame(0);display.recordFrame(500);
 root.hidden=true;root.dispatchEvent(new Event('visibilitychange'));assert.equal(node.textContent,'— FPS');root.hidden=false;
 for(let i=0;i<=30;i++)display.recordFrame(10000+i*1000/30);assert.equal(node.textContent,'30 FPS');
 preferences.showFps=false;display.sync();assert.equal(node.hidden,true);display.recordFrame(20000);
 preferences.showFps=true;display.sync();assert.equal(node.hidden,false);display.recordFrame(25000);assert.equal(node.textContent,'— FPS');
 display.recordFrame(null);display.recordFrame(40000);assert.equal(node.textContent,'— FPS');display.dispose();node.textContent='已卸载';root.dispatchEvent(new Event('visibilitychange'));assert.equal(node.textContent,'已卸载');
});

test('显示FPS偏好默认关闭、严格读取布尔值并与暂停偏好共同保存',()=>{
 const values=new Map(),store=createSaveStore(()=>({getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)}));
 assert.equal(store.loadGameplay().showFps,false);
 store.saveGameplay({showFps:true,pauseOnBlur:false});assert.deepEqual(store.loadGameplay(),{showFps:true,pauseOnBlur:false});
 for(const raw of ['null','{}','{"showFps":"true"}','{"showFps":1}']){values.set(STORAGE_KEYS.gameplay,raw);assert.equal(store.loadGameplay().showFps,false);}
 store.saveGameplay({showFps:false,pauseOnBlur:true});assert.deepEqual(store.loadGameplay(),{showFps:false,pauseOnBlur:true});
});
