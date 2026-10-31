// 真实浏览器触屏验收：默认全屏、设置退出、再次点击不抢回全屏及桌面保持窗口模式。
async page=>{
  const base=new URL(page.url()).origin,results=[],errors=[];
  for(const entry of ['start','title-settings']){
    const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    let stage='打开首页';
    try {
      const phone=await context.newPage();phone.on('pageerror',error=>errors.push(error.message));
      // 记录原生请求结果，区分浏览器能力限制与业务流程错误。
      await phone.addInitScript(()=>{const request=Element.prototype.requestFullscreen;window.fullscreenRequests=[];Element.prototype.requestFullscreen=function(options){const row={active:navigator.userActivation.isActive};window.fullscreenRequests.push(row);return request.call(this,options).then(()=>{row.result='成功';},error=>{row.result=error.message;throw error;});};});
      await phone.goto(base);await phone.locator('#start').waitFor({state:'visible'});
      await phone.waitForFunction(()=>!document.getElementById('start').disabled);
      // 开始按钮覆盖轻量入口；设置分支等待正式处理器完成装配。
      if(entry==='title-settings')await phone.evaluate(async()=>{await import('/src/main.js');});
      if(await phone.evaluate(()=>!!document.fullscreenElement))throw Error('点击前不应申请全屏');
      stage='首次点击进入全屏';await phone.locator(`#${entry}`).tap();
      await phone.waitForFunction(()=>document.fullscreenElement===document.documentElement);
      if(entry==='title-settings'){
        if(!await phone.locator('#settings-dialog').evaluate(el=>el.open))throw Error('全屏时设置未打开');
        if(await phone.locator('#fullscreen').getAttribute('aria-label')!=='退出全屏')throw Error('全屏状态未同步');
        stage='手动退出全屏';await phone.locator('#fullscreen').tap();await phone.waitForFunction(()=>!document.fullscreenElement);
        await phone.locator('#settings-done').tap();await phone.locator('#start').tap();
        if(await phone.evaluate(()=>!!document.fullscreenElement))throw Error('退出后被再次拉回全屏');
      }
      stage='进入游戏';await phone.waitForFunction(()=>document.getElementById('game-frame').dataset.page==='game');
      const layout=await phone.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,fullscreen:!!document.fullscreenElement}));
      if(layout.scrollWidth>layout.width)throw Error('全屏切换产生横向溢出');
      await phone.screenshot({path:`output/playwright/mobile-fullscreen-${entry}.png`});results.push({entry,...layout});
    } catch(error) {const requests=await context.pages()[0]?.evaluate(()=>window.fullscreenRequests);throw Error(`${entry} / ${stage}: ${error.message} ${JSON.stringify(requests)}`);} finally {await context.close();}
  }
  await page.locator('#title-settings').click();
  if(await page.evaluate(()=>!!document.fullscreenElement))throw Error('桌面点击不应自动全屏');
  await page.locator('#fullscreen').click();await page.waitForFunction(()=>!!document.fullscreenElement);
  await page.locator('#fullscreen').click();await page.waitForFunction(()=>!document.fullscreenElement);
  if(errors.length)throw Error(errors.join('\n'));
  return {results,desktopManualToggle:true,errors};
}
