// 手机默认全屏回归：首次手势、失败降级、手动退出和应用卸载。
import test from 'node:test';
import assert from 'node:assert/strict';
import {bindMobileFullscreen} from '../src/platform/mobile-fullscreen.js';
import {createEventScope} from '../src/platform/events.js';

// 模拟浏览器能力与可信点击，保留正式事件作用域的解绑行为。
function fixture({mobile=true,enabled=true,standalone=false,fullscreen=false,request}={}) {
  let listener,requests=0;
  const button={contains:target=>target===button};
  const root={fullscreenEnabled:enabled,fullscreenElement:fullscreen?{}:null,
    documentElement:{requestFullscreen(options){requests++;assert.equal(options.navigationUI,'hide');return request?.();}},
    addEventListener(type,fn,options){assert.equal(type,'click');assert.equal(options.capture,true);listener=fn;},
    removeEventListener(type,fn){if(listener===fn)listener=null;}};
  const host={matchMedia:query=>({matches:query==='(pointer: coarse)'?mobile:query==='(display-mode: standalone)'?standalone:false}),navigator:{}};
  const scope=createEventScope();bindMobileFullscreen({root,host,scope,button});
  return {root,host,button,scope,requests:()=>requests,click:(target={},isTrusted=true)=>listener?.({target,isTrusted})};
}

test('手机加载不主动申请，首次可信点击同步申请且只申请一次',()=>{
  const f=fixture();assert.equal(f.requests(),0);f.click({},false);assert.equal(f.requests(),0);
  f.click();assert.equal(f.requests(),1);f.root.fullscreenElement={};f.root.fullscreenElement=null;
  f.click();assert.equal(f.requests(),1);
});
test('桌面、独立运行、不支持与已经全屏均不重复申请',()=>{
  for(const options of [{mobile:false},{enabled:false},{standalone:true},{fullscreen:true}]){
    const f=fixture(options);f.click();assert.equal(f.requests(),0);
  }
});
test('手动按钮的首次点击交给原处理器，之后也不自动抢回全屏',()=>{
  const f=fixture();f.click(f.button);f.click();assert.equal(f.requests(),0);
});
test('同步错误和异步拒绝都不阻断游戏，也不在后续点击重试',async()=>{
  for(const request of [()=>{throw Error('不支持');},()=>Promise.reject(Error('被拒绝'))]){
    const f=fixture({request});assert.doesNotThrow(()=>f.click());await new Promise(resolve=>setImmediate(resolve));
    f.click();assert.equal(f.requests(),1);
  }
});
test('应用卸载后移除自动全屏监听',()=>{
  const f=fixture();f.scope.dispose();f.click();assert.equal(f.requests(),0);
});
test('轻量首页先申请后，正式应用接管不会再次自动进入全屏',()=>{
  const f=fixture();f.click();f.scope.dispose();
  bindMobileFullscreen({...f,scope:createEventScope()});f.click();assert.equal(f.requests(),1);
});
