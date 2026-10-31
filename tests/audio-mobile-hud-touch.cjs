// 手机触摸验证压缩后的资源与环境按钮仍可独立操作。
async page=>{
 if(new URL(page.url()).port!=='4217')throw Error('仅允许隔离端口');
 await page.setViewportSize({width:320,height:844});
 if(await page.locator('#settings-dialog').isVisible())await page.locator('#close-settings').click();
 const session=await page.context().newCDPSession(page);
 await session.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 // 用实际触摸事件检查窄屏命中区，不用 DOM click 代替手指。
 async function tap(selector){const b=await page.locator(selector).boundingBox();await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 for(const key of ['coins','wood']){
   await tap(`.hud-resources [data-resource-info="${key}"]`);
   await page.locator('#resource-help-dialog').waitFor({state:'visible'});
   if(!(await page.locator('#resource-help-title').textContent()).trim())throw Error('资源说明缺失');
   await tap('#close-resource-help');
 }
 for(const key of ['season','time','weather']){
   const selector=`#${key}-picture`,before=await page.locator(selector).getAttribute('aria-label');
   await tap(selector);if(await page.locator(selector).getAttribute('aria-label')===before)throw Error('触摸未切换 '+key);
 }
 await session.detach();return {width:320,resourceTouch:true,environmentTouch:true};
}
